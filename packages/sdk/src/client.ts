import {
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  erc20Abi,
  getContract,
  type Account,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from 'viem'
import { tollboothAbi } from './abi.js'
import { TOLLBOOTH_ADDRESSES, explorerTxUrl } from './chains.js'
import {
  EscrowType,
  MilestoneStatus,
  ZERO_ADDRESS,
  type CreateEscrowParams,
  type Distribution,
  type Escrow,
  type HireParams,
  type Milestone,
  type Roles,
  type TxReceiptSummary,
} from './types.js'
import { hashContent, toDeadline } from './utils.js'

export interface TollboothClientOptions {
  publicClient: PublicClient
  /** Required for write operations. */
  walletClient?: WalletClient<Transport, Chain, Account>
  /** Override the contract address. Defaults to the known deployment for the chain. */
  address?: Address
}

export class TollboothError extends Error {
  constructor(
    message: string,
    public readonly errorName?: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'TollboothError'
  }
}

/** Human explanations for the contract's custom errors. */
export const ERROR_MESSAGES: Record<string, string> = {
  NotAuthorized: 'Your address does not hold the role required for this action.',
  EscrowAlreadyFunded: 'The escrow has already received deposits, so it can no longer be updated.',
  OverFundingNotAllowed: 'Deposit exceeds what the escrow still needs.',
  EscrowNotFunded: 'The escrow balance is not enough to cover this release.',
  EscrowAlreadyReleased: 'This escrow has already been released or resolved.',
  EscrowAlreadyDisputed: 'This escrow is already under dispute.',
  EscrowNotDisputed: 'There is no open dispute on this escrow.',
  DisputesNotEnabled: 'No dispute resolver was set for this escrow, so disputes cannot be raised.',
  MilestoneAlreadyReleased: 'This milestone has already been paid out or resolved.',
  MilestoneAlreadyDisputed: 'This milestone is already under dispute.',
  MilestoneNotDisputed: 'There is no open dispute on this milestone.',
  MilestoneNotApproved: 'The approver has not approved this milestone yet.',
  MilestonesNotAllApproved: 'Every milestone must be approved before a single-release payout.',
  NotSingleRelease: 'This action only applies to single-release escrows.',
  NotMultiRelease: 'This action only applies to multi-release escrows.',
  DeadlineNotReached: 'The deadline has not passed yet.',
  NoDeadline: 'This escrow has no deadline, so it cannot be refunded this way.',
  EscrowIsDisputed: 'Resolve the open dispute first.',
  MilestoneIsDisputed: 'Resolve the milestone dispute first.',
  DistributionSumMismatch: 'Distribution amounts must sum exactly to the net amount after fees.',
  TooManyDistributions: 'At most 10 distribution entries are allowed.',
  TooManyDepositors: 'This escrow already has the maximum number of depositors.',
  NothingToWithdraw: 'You have no pending balance to withdraw.',
  BalanceInsufficient: 'The escrow balance is too low for this action.',
  DeadlineInPast: 'The deadline must be in the future.',
  PlatformFeeWithoutAddress: 'A platform fee requires a platform address.',
  EscrowNotReleased: 'Remaining funds can only be withdrawn after the escrow is fully released.',
  InvalidFee: 'Fee is above the allowed maximum.',
  MilestoneAmountMismatch: 'Milestone amounts do not match the escrow amount.',
  ZeroAddress: 'A required address is the zero address.',
}

/**
 * Typed client for the Tollbooth v2 escrow contract.
 * Reads need only a publicClient. Writes need a walletClient whose account holds the relevant role.
 */
export class TollboothClient {
  readonly address: Address
  readonly chainId: number
  private readonly publicClient: PublicClient
  private readonly walletClient?: WalletClient<Transport, Chain, Account>
  private usdcAddress?: Address

  constructor(opts: TollboothClientOptions) {
    this.publicClient = opts.publicClient
    this.walletClient = opts.walletClient
    const chainId = opts.publicClient.chain?.id ?? opts.walletClient?.chain.id
    if (!chainId) throw new TollboothError('publicClient must be created with a chain')
    this.chainId = chainId
    const address = opts.address ?? TOLLBOOTH_ADDRESSES[chainId]
    if (!address) throw new TollboothError(`No Tollbooth deployment known for chain ${chainId}; pass address explicitly`)
    this.address = address
  }

  // ---------- reads ----------

  private get contract() {
    return getContract({ address: this.address, abi: tollboothAbi, client: this.publicClient })
  }

  async usdc(): Promise<Address> {
    if (!this.usdcAddress) this.usdcAddress = await this.contract.read.usdc()
    return this.usdcAddress
  }

  /** Protocol fee in bps charged on every payout, snapshotted into each escrow at creation. */
  async feeBps(): Promise<number> {
    return this.contract.read.feeBps()
  }

  async escrowCount(): Promise<bigint> {
    return this.contract.read.escrowCount()
  }

  async getEscrow(escrowId: bigint): Promise<Escrow> {
    const e = await this.contract.read.getEscrow([escrowId])
    return {
      id: escrowId,
      escrowType: e.escrowType as EscrowType,
      roles: { ...e.roles },
      amount: e.amount,
      balance: e.balance,
      platformFeeBps: e.platformFeeBps,
      snapshotFeeBps: e.snapshotFeeBps,
      snapshotFeeRecipient: e.snapshotFeeRecipient,
      deadline: e.deadline,
      engagementId: e.engagementId,
      disputed: e.disputed,
      released: e.released,
      resolved: e.resolved,
    }
  }

  async getMilestones(escrowId: bigint): Promise<Milestone[]> {
    const ms = await this.contract.read.getMilestones([escrowId])
    return ms.map((m, index) => ({
      index,
      amount: m.amount,
      receiver: m.receiver,
      evidenceHash: m.evidenceHash,
      status: m.status as MilestoneStatus,
      approved: m.approved,
      released: m.released,
      disputed: m.disputed,
      resolved: m.resolved,
    }))
  }

  async getRoles(escrowId: bigint): Promise<Roles> {
    return { ...(await this.contract.read.getRoles([escrowId])) }
  }

  /** Escrow ids where the address holds any role or has deposited. */
  async escrowsByAddress(addr: Address): Promise<bigint[]> {
    return [...(await this.contract.read.escrowsByAddress([addr]))]
  }

  async fundedTotal(escrowId: bigint): Promise<bigint> {
    return this.contract.read.fundedTotal([escrowId])
  }

  async depositOf(escrowId: bigint, depositor: Address): Promise<bigint> {
    return this.contract.read.depositOf([escrowId, depositor])
  }

  async pendingWithdrawal(addr: Address): Promise<bigint> {
    return this.contract.read.pendingWithdrawals([addr])
  }

  async usdcBalance(addr: Address): Promise<bigint> {
    return this.publicClient.readContract({ address: await this.usdc(), abi: erc20Abi, functionName: 'balanceOf', args: [addr] })
  }

  async usdcAllowance(owner: Address): Promise<bigint> {
    return this.publicClient.readContract({ address: await this.usdc(), abi: erc20Abi, functionName: 'allowance', args: [owner, this.address] })
  }

  // ---------- writes: create & fund ----------

  private get wallet(): WalletClient<Transport, Chain, Account> {
    if (!this.walletClient) throw new TollboothError('walletClient is required for write operations')
    return this.walletClient
  }

  /** The connected wallet address. */
  get account(): Address {
    return this.wallet.account.address
  }

  /** Create an escrow. Does not fund it. */
  async createEscrow(p: CreateEscrowParams): Promise<{ escrowId: bigint; receipt: TxReceiptSummary }> {
    const roles = fullRoles(p.roles)
    const milestones = p.milestones.map((m) => ({ amount: m.amount, receiver: m.receiver ?? roles.serviceProvider }))
    const amount = p.escrowType === EscrowType.MultiRelease ? milestones.reduce((a, m) => a + m.amount, 0n) : (p.amount ?? 0n)
    const receipt = await this.write('createEscrow', [
      p.escrowType,
      roles,
      amount,
      BigInt(p.platformFeeBps ?? 0),
      toDeadline(p.deadline),
      hashContent(p.engagementId),
      milestones,
    ])
    return { escrowId: await this.escrowIdFromReceipt(receipt.hash), receipt }
  }

  /**
   * One-call agent flow: a multi-release escrow where you are approver and release signer,
   * the worker is service provider and receiver, funded immediately unless fund=false.
   */
  async hire(p: HireParams): Promise<{ escrowId: bigint; receipts: TxReceiptSummary[] }> {
    const me = this.account
    const { escrowId, receipt } = await this.createEscrow({
      escrowType: EscrowType.MultiRelease,
      roles: {
        approver: me,
        releaseSigner: me,
        serviceProvider: p.worker,
        receiver: ZERO_ADDRESS,
        disputeResolver: p.disputeResolver ?? ZERO_ADDRESS,
        platformAddress: p.platformAddress ?? ZERO_ADDRESS,
      },
      platformFeeBps: p.platformFeeBps,
      deadline: p.deadline,
      engagementId: p.spec,
      milestones: p.milestoneAmounts.map((amount) => ({ amount, receiver: p.worker })),
    })
    const receipts = [receipt]
    if (p.fund !== false) {
      const total = p.milestoneAmounts.reduce((a, b) => a + b, 0n)
      receipts.push(await this.fundEscrow(escrowId, total))
    }
    return { escrowId, receipts }
  }

  /** Deposit USDC into an escrow (approves first if needed). Caller must hold a role on the escrow. */
  async fundEscrow(escrowId: bigint, amount: bigint): Promise<TxReceiptSummary> {
    await this.approveUsdc(amount)
    return this.write('fundEscrow', [escrowId, amount])
  }

  /** Change roles, fees, deadline, engagement id or milestones before any deposit. Platform address (or approver) only. */
  async updateEscrow(escrowId: bigint, p: Omit<CreateEscrowParams, 'escrowType' | 'amount'>): Promise<TxReceiptSummary> {
    const roles = fullRoles(p.roles)
    const milestones = p.milestones.map((m) => ({ amount: m.amount, receiver: m.receiver ?? roles.serviceProvider }))
    return this.write('updateEscrow', [escrowId, roles, BigInt(p.platformFeeBps ?? 0), toDeadline(p.deadline), hashContent(p.engagementId), milestones])
  }

  /** Approve the escrow to pull `amount` USDC. Skips if allowance already suffices. */
  async approveUsdc(amount: bigint): Promise<TxReceiptSummary | null> {
    const current = await this.usdcAllowance(this.account)
    if (current >= amount) return null
    const hash = await this.wallet.writeContract({ address: await this.usdc(), abi: erc20Abi, functionName: 'approve', args: [this.address, amount] })
    return this.wait(hash)
  }

  // ---------- writes: milestones ----------

  /** Service provider marks progress and attaches evidence (text is hashed, a bytes32 passes through). */
  async changeMilestoneStatus(escrowId: bigint, idx: number, status: MilestoneStatus, evidence?: Hex | string): Promise<TxReceiptSummary> {
    return this.write('changeMilestoneStatus', [escrowId, BigInt(idx), status, hashContent(evidence)])
  }

  /** Approver signs off a milestone. Cannot be undone. Optional evidence overrides the stored hash. */
  async approveMilestone(escrowId: bigint, idx: number, evidence?: Hex | string): Promise<TxReceiptSummary> {
    return this.write('approveMilestone', [escrowId, BigInt(idx), hashContent(evidence)])
  }

  // ---------- writes: release ----------

  /** Single-release: release signer pays the receiver once every milestone is approved. */
  async releaseFunds(escrowId: bigint): Promise<TxReceiptSummary> {
    return this.write('releaseFunds', [escrowId])
  }

  /** Multi-release: release signer pays one approved milestone to its receiver. */
  async releaseMilestoneFunds(escrowId: bigint, idx: number): Promise<TxReceiptSummary> {
    return this.write('releaseMilestoneFunds', [escrowId, BigInt(idx)])
  }

  // ---------- writes: disputes ----------

  /** Approver, service provider or release signer freezes a single-release escrow. */
  async disputeEscrow(escrowId: bigint): Promise<TxReceiptSummary> {
    return this.write('disputeEscrow', [escrowId])
  }

  /** Same, for one milestone of a multi-release escrow. */
  async disputeMilestone(escrowId: bigint, idx: number): Promise<TxReceiptSummary> {
    return this.write('disputeMilestone', [escrowId, BigInt(idx)])
  }

  /** Dispute resolver settles a single-release escrow. Distributions must sum to the net balance after fees. */
  async resolveDispute(escrowId: bigint, distributions: Distribution[]): Promise<TxReceiptSummary> {
    return this.write('resolveDispute', [escrowId, distributions])
  }

  /** Dispute resolver settles one milestone. Distributions must sum to the milestone's net amount after fees. */
  async resolveMilestoneDispute(escrowId: bigint, idx: number, distributions: Distribution[]): Promise<TxReceiptSummary> {
    return this.write('resolveMilestoneDispute', [escrowId, BigInt(idx), distributions])
  }

  // ---------- writes: recovery ----------

  /** After full release, distribute any surplus balance. Dispute resolver, approver or release signer. */
  async withdrawRemainingFunds(escrowId: bigint, distributions: Distribution[]): Promise<TxReceiptSummary> {
    return this.write('withdrawRemainingFunds', [escrowId, distributions])
  }

  /** After the deadline, with no open dispute, return the remaining balance to depositors pro rata. Anyone may call. */
  async refundAfterDeadline(escrowId: bigint): Promise<TxReceiptSummary> {
    return this.write('refundAfterDeadline', [escrowId])
  }

  /** Pull the caller's accumulated USDC out of the contract. */
  async withdraw(): Promise<TxReceiptSummary> {
    return this.write('withdraw', [])
  }

  // ---------- internals ----------

  private async wait(hash: Hex): Promise<TxReceiptSummary> {
    const r = await this.publicClient.waitForTransactionReceipt({ hash })
    return { hash, blockNumber: r.blockNumber, status: r.status, explorerUrl: explorerTxUrl(this.chainId, hash) }
  }

  private async write(functionName: string, args: readonly unknown[]): Promise<TxReceiptSummary> {
    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.address,
        abi: tollboothAbi,
        functionName,
        args,
        account: this.wallet.account,
      } as never)
      const hash = await this.wallet.writeContract(request as never)
      const receipt = await this.wait(hash)
      if (receipt.status === 'reverted') throw new TollboothError(`${functionName} reverted: ${hash}`)
      return receipt
    } catch (e) {
      if (e instanceof TollboothError) throw e
      const { name, message } = describeError(e)
      throw new TollboothError(`${functionName} failed: ${message}`, name, e)
    }
  }

  private async escrowIdFromReceipt(hash: Hex): Promise<bigint> {
    const r = await this.publicClient.getTransactionReceipt({ hash })
    for (const log of r.logs) {
      if (log.address.toLowerCase() !== this.address.toLowerCase()) continue
      try {
        const ev = decodeEventLog({ abi: tollboothAbi, data: log.data, topics: log.topics })
        if (ev.eventName === 'EscrowCreated') return ev.args.escrowId
      } catch {
        /* not ours */
      }
    }
    throw new TollboothError('EscrowCreated event not found in receipt')
  }
}

function fullRoles(r: CreateEscrowParams['roles']): Roles {
  return {
    approver: r.approver,
    serviceProvider: r.serviceProvider,
    releaseSigner: r.releaseSigner,
    disputeResolver: r.disputeResolver ?? ZERO_ADDRESS,
    platformAddress: r.platformAddress ?? ZERO_ADDRESS,
    receiver: r.receiver ?? ZERO_ADDRESS,
  }
}

function describeError(e: unknown): { name?: string; message: string } {
  if (e instanceof BaseError) {
    const revert = e.walk((err) => err instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName
      if (name) return { name, message: ERROR_MESSAGES[name] ?? name }
    }
    return { message: e.shortMessage }
  }
  return { message: e instanceof Error ? e.message : String(e) }
}

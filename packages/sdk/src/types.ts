import type { Address, Hex } from 'viem'

export enum EscrowType {
  SingleRelease = 0,
  MultiRelease = 1,
}

export enum MilestoneStatus {
  Pending = 0,
  InProgress = 1,
  Completed = 2,
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

/** The six escrow roles. Zero address disables disputeResolver / platformAddress / receiver (multi). */
export interface Roles {
  approver: Address
  serviceProvider: Address
  releaseSigner: Address
  disputeResolver: Address
  platformAddress: Address
  receiver: Address
}

export interface Milestone {
  index: number
  amount: bigint
  receiver: Address
  evidenceHash: Hex
  status: MilestoneStatus
  approved: boolean
  released: boolean
  disputed: boolean
  resolved: boolean
}

export interface Escrow {
  id: bigint
  escrowType: EscrowType
  roles: Roles
  amount: bigint
  balance: bigint
  platformFeeBps: bigint
  snapshotFeeBps: number
  snapshotFeeRecipient: Address
  deadline: bigint
  engagementId: Hex
  disputed: boolean
  released: boolean
  resolved: boolean
}

export interface MilestoneInput {
  /** USDC base units. Must be 0 for SingleRelease, > 0 for MultiRelease. */
  amount: bigint
  /** MultiRelease only. Defaults to roles.serviceProvider. */
  receiver?: Address
}

export interface CreateEscrowParams {
  escrowType: EscrowType
  roles: Partial<Roles> & Pick<Roles, 'approver' | 'serviceProvider' | 'releaseSigner'>
  /** SingleRelease: total to release. MultiRelease: ignored, computed from milestones. */
  amount?: bigint
  /** Per-escrow platform fee in bps, max 5000. Requires roles.platformAddress. */
  platformFeeBps?: number
  /** Unix seconds, Date, or 0/undefined for no deadline. */
  deadline?: bigint | number | Date
  /** Free text (hashed with keccak256) or a bytes32. */
  engagementId?: Hex | string
  milestones: MilestoneInput[]
}

/** Convenience for the common agent flow: I hire a worker, I approve and release, worker receives. */
export interface HireParams {
  worker: Address
  /** One milestone per entry, in USDC base units. Use usdc('1.00'). */
  milestoneAmounts: bigint[]
  /** Optional third party allowed to settle disputes. */
  disputeResolver?: Address
  platformAddress?: Address
  platformFeeBps?: number
  deadline?: bigint | number | Date
  /** Plain-text job spec; stored onchain as a keccak256 hash in engagementId. */
  spec: string
  /** Fund immediately after creating. Default true. */
  fund?: boolean
}

export interface Distribution {
  to: Address
  amount: bigint
}

export interface TxReceiptSummary {
  hash: Hex
  blockNumber: bigint
  status: 'success' | 'reverted'
  explorerUrl: string
}

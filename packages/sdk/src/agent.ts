import type { Address } from 'viem'
import type { TollboothClient } from './client.js'
import { EscrowType, MilestoneStatus, type Escrow, type Milestone } from './types.js'
import { formatUsdc, secondsFromNow, splitFees, usdc } from './utils.js'

/**
 * Provider-agnostic tool definitions so an LLM agent can drive Tollbooth.
 * JSON Schema inputs map directly onto Claude tool_use, OpenAI functions and the Vercel AI SDK.
 */
export interface AgentTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

const escrowId = { type: 'string', description: 'Escrow id' }
const milestoneIndex = { type: 'integer', description: 'Zero-based milestone index' }

export const TOLLBOOTH_AGENT_TOOLS: AgentTool[] = [
  {
    name: 'tollbooth_hire',
    description:
      'Hire another agent or service. Creates and funds a multi-release USDC escrow where you approve and release each milestone and the worker receives. Returns the escrowId.',
    input_schema: {
      type: 'object',
      properties: {
        worker: { type: 'string', description: 'Address of the agent/service being hired' },
        milestoneAmountsUsdc: { type: 'array', items: { type: 'string' }, description: 'One payout per milestone in USDC, e.g. ["0.50","1.00"]' },
        spec: { type: 'string', description: 'Plain-text job spec. Hashed onchain as the engagement id.' },
        deadlineSeconds: { type: 'integer', description: 'Optional. Seconds from now after which unreleased funds can be refunded.' },
        disputeResolver: { type: 'string', description: 'Optional address that can settle disputes.' },
      },
      required: ['worker', 'milestoneAmountsUsdc', 'spec'],
    },
  },
  {
    name: 'tollbooth_fund',
    description: 'Deposit USDC into an escrow you hold a role on.',
    input_schema: { type: 'object', properties: { escrowId, amountUsdc: { type: 'string' } }, required: ['escrowId', 'amountUsdc'] },
  },
  {
    name: 'tollbooth_update_status',
    description: 'As the service provider, mark a milestone InProgress or Completed and attach evidence (text, hashed onchain).',
    input_schema: {
      type: 'object',
      properties: { escrowId, milestoneIndex, status: { type: 'string', enum: ['InProgress', 'Completed'] }, evidence: { type: 'string' } },
      required: ['escrowId', 'milestoneIndex', 'status'],
    },
  },
  {
    name: 'tollbooth_approve',
    description: 'As the approver, approve a milestone. This cannot be undone.',
    input_schema: { type: 'object', properties: { escrowId, milestoneIndex, evidence: { type: 'string' } }, required: ['escrowId', 'milestoneIndex'] },
  },
  {
    name: 'tollbooth_release',
    description: 'As the release signer, pay out. Multi-release: give milestoneIndex. Single-release: omit it to release everything once all milestones are approved.',
    input_schema: { type: 'object', properties: { escrowId, milestoneIndex }, required: ['escrowId'] },
  },
  {
    name: 'tollbooth_dispute',
    description: 'Freeze an escrow (single-release, omit milestoneIndex) or one milestone (multi-release). Approver, service provider or release signer only.',
    input_schema: { type: 'object', properties: { escrowId, milestoneIndex }, required: ['escrowId'] },
  },
  {
    name: 'tollbooth_resolve',
    description:
      'As the dispute resolver, settle a dispute by distributing the net amount. Amounts must sum exactly to the net after fees; call tollbooth_get_escrow first to read netDisputedUsdc.',
    input_schema: {
      type: 'object',
      properties: {
        escrowId,
        milestoneIndex,
        distributions: { type: 'array', items: { type: 'object', properties: { to: { type: 'string' }, amountUsdc: { type: 'string' } }, required: ['to', 'amountUsdc'] } },
      },
      required: ['escrowId', 'distributions'],
    },
  },
  {
    name: 'tollbooth_withdraw',
    description: 'Pull your released, resolved or refunded USDC out of the escrow contract into your wallet.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'tollbooth_refund',
    description: 'After the deadline and with no open dispute, return the remaining balance to depositors.',
    input_schema: { type: 'object', properties: { escrowId }, required: ['escrowId'] },
  },
  {
    name: 'tollbooth_get_escrow',
    description: 'Read an escrow: roles, funding, milestones, flags, and the net amount a resolver must distribute for any open dispute.',
    input_schema: { type: 'object', properties: { escrowId }, required: ['escrowId'] },
  },
  {
    name: 'tollbooth_my_escrows',
    description: 'List escrows where the connected wallet holds a role, plus its pending withdrawable balance.',
    input_schema: { type: 'object', properties: {} },
  },
]

/** Execute a tool call by name. Returns a JSON-serialisable result for the model. */
export async function runTollboothTool(client: TollboothClient, name: string, input: Record<string, unknown>): Promise<unknown> {
  const id = () => BigInt(String(input.escrowId))
  const idx = () => (input.milestoneIndex === undefined || input.milestoneIndex === null ? undefined : Number(input.milestoneIndex))
  const tx = (r: { hash: string; explorerUrl: string }) => ({ txHash: r.hash, explorerUrl: r.explorerUrl })

  switch (name) {
    case 'tollbooth_hire': {
      const amounts = (input.milestoneAmountsUsdc as string[]).map(usdc)
      const { escrowId, receipts } = await client.hire({
        worker: input.worker as Address,
        milestoneAmounts: amounts,
        spec: String(input.spec),
        deadline: input.deadlineSeconds ? secondsFromNow(Number(input.deadlineSeconds)) : undefined,
        disputeResolver: input.disputeResolver as Address | undefined,
      })
      return { escrowId: escrowId.toString(), totalUsdc: formatUsdc(amounts.reduce((a, b) => a + b, 0n)), txs: receipts.map(tx) }
    }
    case 'tollbooth_fund':
      return tx(await client.fundEscrow(id(), usdc(String(input.amountUsdc))))
    case 'tollbooth_update_status': {
      const status = input.status === 'Completed' ? MilestoneStatus.Completed : MilestoneStatus.InProgress
      return tx(await client.changeMilestoneStatus(id(), Number(input.milestoneIndex), status, input.evidence as string | undefined))
    }
    case 'tollbooth_approve':
      return tx(await client.approveMilestone(id(), Number(input.milestoneIndex), input.evidence as string | undefined))
    case 'tollbooth_release': {
      const i = idx()
      return tx(i === undefined ? await client.releaseFunds(id()) : await client.releaseMilestoneFunds(id(), i))
    }
    case 'tollbooth_dispute': {
      const i = idx()
      return tx(i === undefined ? await client.disputeEscrow(id()) : await client.disputeMilestone(id(), i))
    }
    case 'tollbooth_resolve': {
      const dist = (input.distributions as { to: string; amountUsdc: string }[]).map((d) => ({ to: d.to as Address, amount: usdc(d.amountUsdc) }))
      const i = idx()
      return tx(i === undefined ? await client.resolveDispute(id(), dist) : await client.resolveMilestoneDispute(id(), i, dist))
    }
    case 'tollbooth_withdraw':
      return tx(await client.withdraw())
    case 'tollbooth_refund':
      return tx(await client.refundAfterDeadline(id()))
    case 'tollbooth_get_escrow': {
      const [e, ms, funded] = await Promise.all([client.getEscrow(id()), client.getMilestones(id()), client.fundedTotal(id())])
      return serializeEscrow(e, ms, funded)
    }
    case 'tollbooth_my_escrows': {
      const me = client.account
      const ids = await client.escrowsByAddress(me)
      const escrows = await Promise.all(ids.map(async (i) => serializeEscrow(await client.getEscrow(i), await client.getMilestones(i), await client.fundedTotal(i))))
      return { address: me, pendingWithdrawalUsdc: formatUsdc(await client.pendingWithdrawal(me)), escrows }
    }
    default:
      throw new Error(`Unknown Tollbooth tool: ${name}`)
  }
}

function serializeEscrow(e: Escrow, ms: Milestone[], funded: bigint) {
  const fees = (gross: bigint) => splitFees(gross, e.platformFeeBps, e.snapshotFeeBps)
  return {
    escrowId: e.id.toString(),
    type: EscrowType[e.escrowType],
    roles: e.roles,
    amountUsdc: formatUsdc(e.amount),
    fundedUsdc: formatUsdc(funded),
    balanceUsdc: formatUsdc(e.balance),
    platformFeeBps: Number(e.platformFeeBps),
    protocolFeeBps: e.snapshotFeeBps,
    deadline: e.deadline === 0n ? null : new Date(Number(e.deadline) * 1000).toISOString(),
    engagementId: e.engagementId,
    disputed: e.disputed,
    released: e.released,
    resolved: e.resolved,
    netDisputedUsdc: e.disputed ? formatUsdc(fees(e.balance).net) : null,
    milestones: ms.map((m) => ({
      index: m.index,
      amountUsdc: formatUsdc(m.amount),
      netUsdc: formatUsdc(fees(m.amount).net),
      receiver: m.receiver,
      status: MilestoneStatus[m.status],
      evidenceHash: m.evidenceHash,
      approved: m.approved,
      released: m.released,
      disputed: m.disputed,
      resolved: m.resolved,
    })),
  }
}

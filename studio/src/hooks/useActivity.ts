import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { decodeEventLog, parseEventLogs, type Abi, type Hex } from 'viem'
import { getTollboothAddress, getExplorerBase, isTollboothDeployed, TOLLBOOTH_ABI } from '@/config'

export interface LogEvent {
  eventName:   string
  escrowId:    string
  blockNumber: bigint
  txHash:      Hex
  timestamp:   number
  args:        Record<string, unknown>
}

const LOOKBACK = 20_000n

/**
 * Contract events, newest first. Uses the explorer index (Blockscout) because Arc blocks are
 * sub-second and an RPC block-range scan misses nearly everything; falls back to RPC logs.
 */
export function useActivity(chainId: number, limit = 100) {
  const client = usePublicClient({ chainId })
  const deployed = isTollboothDeployed(chainId)
  const contractAddr = getTollboothAddress(chainId)
  const explorerBase = getExplorerBase(chainId)

  return useQuery<LogEvent[]>({
    queryKey: ['tollbooth-activity', chainId, contractAddr, limit],
    enabled: deployed && !!contractAddr,
    refetchInterval: 20_000,
    queryFn: async () => {
      try {
        const res = await fetch(`${explorerBase}/api/v2/addresses/${contractAddr}/logs`)
        if (res.ok) {
          const json = (await res.json()) as { items: { topics: (Hex | null)[]; data: Hex; block_number: number; block_timestamp: string; transaction_hash: Hex }[] }
          const out: LogEvent[] = []
          for (const it of json.items) {
            try {
              const topics = it.topics.filter((t): t is Hex => !!t)
              const ev = decodeEventLog({ abi: TOLLBOOTH_ABI as Abi, data: it.data, topics: topics as [Hex, ...Hex[]] })
              const args = (ev.args ?? {}) as Record<string, unknown>
              out.push({
                eventName:   ev.eventName ?? 'Unknown',
                escrowId:    typeof args.escrowId === 'bigint' ? String(args.escrowId) : '',
                blockNumber: BigInt(it.block_number),
                txHash:      it.transaction_hash,
                timestamp:   Math.floor(new Date(it.block_timestamp).getTime() / 1000),
                args,
              })
            } catch { /* not a Tollbooth event */ }
          }
          return out.slice(0, limit)
        }
      } catch { /* fall through */ }
      if (!client) return []
      const head = await client.getBlockNumber()
      const logs = await client.getLogs({ address: contractAddr, fromBlock: head > LOOKBACK ? head - LOOKBACK : 0n, toBlock: 'latest' })
      type Decoded = { eventName: string; args: Record<string, unknown>; blockNumber: bigint; transactionHash: Hex }
      const decoded = parseEventLogs({ abi: TOLLBOOTH_ABI as Abi, logs }) as unknown as Decoded[]
      const stamps = new Map<bigint, number>()
      await Promise.all([...new Set(decoded.map(l => l.blockNumber))].map(async bn => {
        const b = await client.getBlock({ blockNumber: bn })
        stamps.set(bn, Number(b.timestamp))
      }))
      return decoded.slice(-limit).reverse().map(l => ({
        eventName:   l.eventName,
        escrowId:    typeof l.args.escrowId === 'bigint' ? String(l.args.escrowId) : '',
        blockNumber: l.blockNumber,
        txHash:      l.transactionHash,
        timestamp:   stamps.get(l.blockNumber) ?? 0,
        args:        l.args,
      }))
    },
  })
}

/** One-line human summary of an event. */
export function summarizeEvent(ev: LogEvent): string {
  const a = ev.args
  const usd = (v: unknown) => (typeof v === 'bigint' ? `${(Number(v) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC` : '')
  const short = (v: unknown) => (typeof v === 'string' ? `${v.slice(0, 6)}…${v.slice(-4)}` : '')
  switch (ev.eventName) {
    case 'EscrowCreated':            return `${a.escrowType === 0 ? 'Single' : 'Multi'}-release · ${usd(a.amount)}`
    case 'Deposited':                return `${usd(a.amount)} from ${short(a.depositor)} · funded ${usd(a.fundedTotal)}`
    case 'FundsReleased':            return `${usd(a.netAmount)} to ${short(a.receiver)}`
    case 'MilestoneReleased':        return `m${String(a.milestoneIndex)} · ${usd(a.netAmount)} to ${short(a.receiver)}`
    case 'MilestoneApproved':        return `m${String(a.milestoneIndex)} approved by ${short(a.approver)}`
    case 'MilestoneStatusChanged':   return `m${String(a.milestoneIndex)} → ${['Pending', 'In progress', 'Completed'][Number(a.status)] ?? String(a.status)}`
    case 'EscrowDisputed':           return `raised by ${short(a.by)}`
    case 'MilestoneDisputed':        return `m${String(a.milestoneIndex)} raised by ${short(a.by)}`
    case 'DisputeResolved':          return `settled by ${short(a.resolver)}`
    case 'MilestoneDisputeResolved': return `m${String(a.milestoneIndex)} settled by ${short(a.resolver)}`
    case 'RefundedAfterDeadline':    return usd(a.amount)
    case 'Withdrawn':                return `${usd(a.amount)} to ${short(a.recipient)}`
    case 'OwnershipTransferred':     return `to ${short(a.newOwner)}`
    default: return ''
  }
}

export const EVENT_LABELS: Record<string, string> = {
  EscrowCreated: 'Escrow created', Deposited: 'Deposit', FundsReleased: 'Funds released', MilestoneReleased: 'Milestone released',
  MilestoneApproved: 'Milestone approved', MilestoneStatusChanged: 'Status changed', EscrowDisputed: 'Escrow disputed',
  MilestoneDisputed: 'Milestone disputed', DisputeResolved: 'Dispute resolved', MilestoneDisputeResolved: 'Milestone resolved',
  RefundedAfterDeadline: 'Refunded', Withdrawn: 'Withdrawal', OwnershipTransferred: 'Ownership transferred', EscrowUpdated: 'Escrow updated',
  FeeUpdated: 'Fee updated', RemainingFundsWithdrawn: 'Surplus withdrawn',
}

export const EVENT_TONE: Record<string, string> = {
  EscrowCreated: 'text-info', Deposited: 'text-fg', FundsReleased: 'text-accent', MilestoneReleased: 'text-accent',
  MilestoneApproved: 'text-accent', MilestoneStatusChanged: 'text-fg', EscrowDisputed: 'text-warning', MilestoneDisputed: 'text-warning',
  DisputeResolved: 'text-violet-300', MilestoneDisputeResolved: 'text-violet-300', RefundedAfterDeadline: 'text-muted', Withdrawn: 'text-fg',
}

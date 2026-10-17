import { useAccount } from 'wagmi'
import { Link } from 'react-router-dom'
import { useReadContract } from 'wagmi'
import { ExternalLink } from 'lucide-react'
import { EscrowTable } from '@/components/EscrowTable'
import { useMyEscrows, useEscrow, useMilestones, usePendingWithdrawal, useFeeBps, useEscrowCount, useReadChainId } from '@/hooks/useTollbooth'
import { useActivity, summarizeEvent, EVENT_LABELS, EVENT_TONE } from '@/hooks/useActivity'
import { fmtUsdc, fmtRelative, cx } from '@/lib/utils'
import { EscrowType, MilestoneStatus } from '@/lib/types'
import { getTollboothAddress, getExplorerBase, TOLLBOOTH_ABI } from '@/config'
import { arcTestnet } from 'viem/chains'

function ActionRow({ escrowId, wallet }: { escrowId: bigint; wallet: `0x${string}` }) {
  const { escrow } = useEscrow(escrowId)
  const { milestones } = useMilestones(escrowId)
  if (!escrow) return null
  const w = wallet.toLowerCase()
  const r = escrow.roles
  const items: string[] = []
  if (r.approver.toLowerCase() === w) {
    const n = milestones.filter(m => !m.approved && !m.released && !m.resolved && !m.disputed).length
    if (n) items.push(`${n} milestone${n > 1 ? 's' : ''} awaiting your approval`)
  }
  if (r.releaseSigner.toLowerCase() === w) {
    if (escrow.escrowType === EscrowType.MultiRelease) {
      const n = milestones.filter(m => m.approved && !m.released && !m.disputed).length
      if (n) items.push(`${n} approved milestone${n > 1 ? 's' : ''} ready to release`)
    } else if (milestones.length && milestones.every(m => m.approved) && !escrow.released && !escrow.disputed) {
      items.push('All milestones approved, ready to release')
    }
  }
  if (r.disputeResolver.toLowerCase() === w && (escrow.disputed || milestones.some(m => m.disputed))) items.push('Dispute awaiting your decision')
  if (r.serviceProvider.toLowerCase() === w) {
    const n = milestones.filter(m => m.status === MilestoneStatus.Pending && !m.released).length
    if (n && escrow.balance > 0n) items.push(`${n} milestone${n > 1 ? 's' : ''} not started`)
  }
  if (!items.length) return null
  return (
    <li>
      <Link to={`/escrows/${escrowId}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface2/60 transition-colors duration-100">
        <span className="font-mono text-[12px] text-muted w-10 shrink-0">#{String(escrowId)}</span>
        <span className="text-[13px] text-fg">{items[0]}</span>
        {items.length > 1 && <span className="text-[12px] text-muted">+{items.length - 1}</span>}
        <span className="ml-auto text-[12px] text-muted">Open →</span>
      </Link>
    </li>
  )
}

export function OverviewPage() {
  const { address: wallet, isConnected } = useAccount()
  const chainId = useReadChainId()
  const contract = getTollboothAddress(chainId)
  const explorer = getExplorerBase(chainId)
  const { count, isLoading: countLoading } = useEscrowCount()
  const feeBps = useFeeBps()
  const { pending } = usePendingWithdrawal()
  const { escrowIds: mine } = useMyEscrows()
  const obligations = useReadContract({ address: contract, abi: TOLLBOOTH_ABI, functionName: 'totalObligations', chainId, query: { refetchInterval: 15_000 } })
  const locked = (obligations.data as bigint | undefined) ?? 0n
  const activity = useActivity(chainId, 8)

  const recentIds: bigint[] = []
  for (let i = count; i > 0n && recentIds.length < 8; i--) recentIds.push(i)

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-fg tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-muted mt-0.5">
            {chainId === arcTestnet.id ? 'Arc Testnet' : 'Arc'} · contract{' '}
            <a href={`${explorer}/address/${contract}`} target="_blank" rel="noreferrer" className="font-mono hover:text-fg transition-colors">{contract.slice(0, 10)}…</a>
          </p>
        </div>
        <Link to="/create" className="h-8 px-3 inline-flex items-center rounded-md bg-fg text-bg text-[13px] font-medium hover:bg-white transition-colors duration-150">New escrow</Link>
      </div>

      <div className="kpi">
        <div><div className="label">Escrows</div><div className="value font-mono">{countLoading ? '—' : String(count)}</div><div className="sub">created on this network</div></div>
        <div><div className="label">USDC held</div><div className="value font-mono">{fmtUsdc(locked)}</div><div className="sub">owed to participants</div></div>
        <div><div className="label">Protocol fee</div><div className="value font-mono">{(feeBps / 100).toFixed(2)}%</div><div className="sub">per release, snapshotted at creation</div></div>
        {isConnected ? (
          <div><div className="label">Your balance to withdraw</div><div className={cx('value font-mono', pending > 0n && 'text-accent')}>{fmtUsdc(pending)}</div><div className="sub">{mine.length} escrow{mine.length === 1 ? '' : 's'} involve you</div></div>
        ) : (
          <div><div className="label">Wallet</div><div className="value text-muted text-base">Not connected</div><div className="sub">Connect from the sidebar to act on escrows</div></div>
        )}
      </div>

      {isConnected && wallet && mine.length > 0 && (
        <section>
          <h2 className="text-[13px] font-medium text-fg mb-2">Needs your action</h2>
          <ul className="border border-border rounded-card bg-surface divide-y divide-borderSubtle">
            {[...mine].reverse().slice(0, 12).map(id => <ActionRow key={String(id)} escrowId={id} wallet={wallet} />)}
          </ul>
        </section>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[13px] font-medium text-fg">Recent escrows</h2>
            <Link to="/escrows" className="text-[12px] text-muted hover:text-fg transition-colors">View all</Link>
          </div>
          <EscrowTable ids={recentIds} wallet={wallet} loading={countLoading} compact emptyText="No escrows on this network yet." />
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[13px] font-medium text-fg">Activity</h2>
            <Link to="/activity" className="text-[12px] text-muted hover:text-fg transition-colors">All events</Link>
          </div>
          <ul className="border border-border rounded-card bg-surface divide-y divide-borderSubtle">
            {activity.isLoading && <li className="px-3 py-6 text-[12px] text-muted">Loading…</li>}
            {!activity.isLoading && (activity.data?.length ?? 0) === 0 && <li className="px-3 py-6 text-[12px] text-muted">No events yet.</li>}
            {activity.data?.map((ev, i) => (
              <li key={i} className="px-3 py-2">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className={cx('font-medium', EVENT_TONE[ev.eventName] ?? 'text-fg')}>{EVENT_LABELS[ev.eventName] ?? ev.eventName}</span>
                  {ev.escrowId && <Link to={`/escrows/${ev.escrowId}`} className="font-mono text-muted hover:text-fg">#{ev.escrowId}</Link>}
                  <a href={`${explorer}/tx/${ev.txHash}`} target="_blank" rel="noreferrer" className="ml-auto text-muted hover:text-fg" aria-label="View transaction"><ExternalLink size={11} /></a>
                </div>
                <div className="text-[12px] text-muted truncate">{summarizeEvent(ev)}<span className="mx-1.5">·</span>{fmtRelative(ev.timestamp)}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EscrowStatusPill } from '@/components/ui/Pill'
import { useEscrow, useMilestones, useFundedTotal } from '@/hooks/useTollbooth'
import { fmtUsdc, fundedPct, shortAddr, fmtDeadline } from '@/lib/utils'
import { deriveEscrowStatus, ESCROW_TYPE_LABELS, EscrowType } from '@/lib/types'

export function rolesFor(roles: { approver: string; serviceProvider: string; releaseSigner: string; disputeResolver: string; platformAddress: string; receiver: string }, wallet?: string): string[] {
  if (!wallet) return []
  const w = wallet.toLowerCase()
  const out: string[] = []
  if (roles.approver.toLowerCase() === w) out.push('Approver')
  if (roles.serviceProvider.toLowerCase() === w) out.push('Provider')
  if (roles.releaseSigner.toLowerCase() === w) out.push('Signer')
  if (roles.disputeResolver.toLowerCase() === w) out.push('Resolver')
  if (roles.platformAddress.toLowerCase() === w) out.push('Platform')
  if (roles.receiver.toLowerCase() === w) out.push('Receiver')
  return out
}

function Row({ escrowId, wallet, compact }: { escrowId: bigint; wallet?: string; compact?: boolean }) {
  const { escrow, isLoading } = useEscrow(escrowId)
  const { milestones } = useMilestones(escrowId)
  const { fundedTotal } = useFundedTotal(escrowId)
  if (isLoading) {
    return (
      <tr>
        <td><Skeleton className="h-3 w-8" /></td>
        <td colSpan={6}><Skeleton className="h-3 w-48" /></td>
      </tr>
    )
  }
  if (!escrow) return null
  const status = deriveEscrowStatus(escrow)
  const mine = rolesFor(escrow.roles, wallet)
  const done = milestones.filter(m => m.released || m.resolved).length
  return (
    <tr>
      <td>
        <Link to={`/escrows/${escrowId}`} className="font-mono text-fg hover:underline underline-offset-2">#{String(escrowId)}</Link>
      </td>
      <td className="text-muted">{escrow.escrowType === EscrowType.MultiRelease ? 'Multi' : 'Single'}<span className="sr-only"> {ESCROW_TYPE_LABELS[escrow.escrowType]}</span></td>
      <td>
        <span className="font-mono text-muted">{shortAddr(escrow.roles.approver)}</span>
        <span className="text-muted mx-1.5">→</span>
        <span className="font-mono text-muted">{shortAddr(escrow.roles.serviceProvider)}</span>
        {mine.length > 0 && <span className="ml-2 text-[10px] uppercase tracking-wide text-accent">{mine.join(' · ')}</span>}
      </td>
      <td className="num text-fg">{fmtUsdc(escrow.amount)}</td>
      <td className="num text-muted">{fundedPct(fundedTotal, escrow.amount)}%</td>
      <td className="num text-muted">{done}/{milestones.length}</td>
      {!compact && <td className="text-muted">{escrow.deadline === 0n ? '—' : fmtDeadline(escrow.deadline)}</td>}
      <td><EscrowStatusPill status={status} /></td>
    </tr>
  )
}

export function EscrowTable({ ids, wallet, loading, emptyText, compact }: { ids: bigint[]; wallet?: string; loading?: boolean; emptyText: string; compact?: boolean }) {
  return (
    <div className="border border-border rounded-card bg-surface overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Parties</th>
            <th className="num">Amount</th>
            <th className="num">Funded</th>
            <th className="num">Milestones</th>
            {!compact && <th>Deadline</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading && [1, 2, 3].map(i => (
            <tr key={i}><td><Skeleton className="h-3 w-8" /></td><td colSpan={7}><Skeleton className="h-3 w-56" /></td></tr>
          ))}
          {!loading && ids.length === 0 && (
            <tr><td colSpan={8} className="text-muted py-8 text-center">{emptyText}</td></tr>
          )}
          {!loading && ids.map(id => <Row key={String(id)} escrowId={id} wallet={wallet} compact={compact} />)}
        </tbody>
      </table>
    </div>
  )
}

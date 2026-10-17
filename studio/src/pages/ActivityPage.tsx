import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getExplorerBase } from '@/config'
import { useReadChainId } from '@/hooks/useTollbooth'
import { useActivity, summarizeEvent, EVENT_LABELS, EVENT_TONE, type LogEvent } from '@/hooks/useActivity'
import { fmtRelative, cx } from '@/lib/utils'

function EventRow({ ev, explorerBase }: { ev: LogEvent; explorerBase: string }) {
  return (
    <tr>
      <td className={cx('font-medium', EVENT_TONE[ev.eventName] ?? 'text-fg')}>{EVENT_LABELS[ev.eventName] ?? ev.eventName}</td>
      <td>{ev.escrowId ? <Link to={`/escrows/${ev.escrowId}`} className="font-mono text-fg hover:underline underline-offset-2">#{ev.escrowId}</Link> : <span className="text-muted">—</span>}</td>
      <td className="text-muted !whitespace-normal">{summarizeEvent(ev)}</td>
      <td className="text-muted">{fmtRelative(ev.timestamp)}</td>
      <td className="num">
        <a href={`${explorerBase}/tx/${ev.txHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-fg transition-colors">
          {ev.txHash.slice(0, 10)}… <ExternalLink size={11} />
        </a>
      </td>
    </tr>
  )
}

export function ActivityPage() {
  const chainId = useReadChainId()
  const explorerBase = getExplorerBase(chainId)
  const [filter, setFilter] = useState<string>('All')
  const { data: events = [], isLoading: loading, refetch, isFetching } = useActivity(chainId, 200)

  const eventTypes = ['All', ...Array.from(new Set(events.map(e => e.eventName)))]
  const visible = filter === 'All' ? events : events.filter(e => e.eventName === filter)

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-fg tracking-tight">Activity</h1>
          <p className="text-[13px] text-muted mt-0.5">Every Tollbooth event on this network, newest first.</p>
        </div>
        <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} loading={isFetching} onClick={() => { void refetch() }}>Refresh</Button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {eventTypes.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cx('px-2.5 h-7 rounded-md text-[12px] border transition-colors duration-100', filter === t ? 'bg-surface2 border-border text-fg' : 'border-transparent text-muted hover:text-fg')}
          >
            {t === 'All' ? 'All' : (EVENT_LABELS[t] ?? t)}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-card bg-surface overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Event</th><th>Escrow</th><th>Details</th><th>When</th><th className="num">Tx</th></tr></thead>
          <tbody>
            {loading && [1, 2, 3, 4, 5].map(i => <tr key={i}><td><Skeleton className="h-3 w-28" /></td><td colSpan={4}><Skeleton className="h-3 w-64" /></td></tr>)}
            {!loading && visible.length === 0 && <tr><td colSpan={5} className="text-muted py-8 text-center">No events yet on this network.</td></tr>}
            {!loading && visible.map((ev, i) => <EventRow key={i} ev={ev} explorerBase={explorerBase} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

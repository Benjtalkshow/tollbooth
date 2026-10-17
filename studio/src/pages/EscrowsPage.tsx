import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { EscrowTable } from '@/components/EscrowTable'
import { useMyEscrows, useEscrowCount } from '@/hooks/useTollbooth'
import { cx } from '@/lib/utils'

export function EscrowsPage() {
  const { address: wallet, isConnected } = useAccount()
  const { escrowIds: mine, isLoading: mineLoading } = useMyEscrows()
  const { count, isLoading: countLoading } = useEscrowCount()
  const [scope, setScope] = useState<'mine' | 'all'>(isConnected ? 'mine' : 'all')
  const [search, setSearch] = useState('')

  const all: bigint[] = []
  for (let i = count; i > 0n; i--) all.push(i)
  const source = scope === 'mine' && isConnected ? [...mine].reverse() : all
  const ids = search.trim() ? source.filter(id => String(id).includes(search.trim().replace(/^#/, ''))) : source
  const loading = scope === 'mine' ? mineLoading : countLoading

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-fg tracking-tight">Escrows</h1>
          <p className="text-[13px] text-muted mt-0.5">{String(count)} on this network{isConnected ? ` · ${mine.length} involve you` : ''}</p>
        </div>
        <Link to="/create" className="h-8 px-3 inline-flex items-center rounded-md bg-fg text-bg text-[13px] font-medium hover:bg-white transition-colors duration-150">New escrow</Link>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-md border border-border overflow-hidden text-[12px]">
          {(['mine', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              disabled={s === 'mine' && !isConnected}
              className={cx('px-3 h-8 transition-colors duration-100 disabled:opacity-40', scope === s ? 'bg-surface2 text-fg' : 'text-muted hover:text-fg')}
            >
              {s === 'mine' ? 'Mine' : 'All'}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by id"
          aria-label="Filter by id"
          className="h-8 w-40 px-2.5 rounded-md bg-bg border border-border text-[12px] text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/60"
        />
      </div>

      <EscrowTable
        ids={ids}
        wallet={wallet}
        loading={loading}
        emptyText={scope === 'mine' ? 'No escrows involve this wallet yet.' : 'No escrows on this network yet.'}
      />
    </div>
  )
}

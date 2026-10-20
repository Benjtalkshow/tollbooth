import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAccount, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { arc, arcTestnet } from 'viem/chains'
import { ChevronDown, ArrowDownToLine, Search } from 'lucide-react'
import { usePendingWithdrawal, useTollboothWrite, useUsdcBalance } from '@/hooks/useTollbooth'
import { isTollboothDeployed } from '@/config'
import { fmtUsdc, cx } from '@/lib/utils'

const CHAINS = [
  { chain: arcTestnet, label: 'Arc Testnet' },
  { chain: arc,        label: 'Arc Mainnet' },
]

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Dashboard'],
  [/^\/escrows\/\d+/, 'Escrow'],
  [/^\/escrows/, 'Escrows'],
  [/^\/create/, 'New escrow'],
  [/^\/activity/, 'Activity'],
  [/^\/docs/, 'Documentation'],
]

function NetworkSwitcher() {
  const { chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const [open, setOpen] = useState(false)
  const current = CHAINS.find(c => c.chain.id === chainId) ?? CHAINS[0]
  const bad = isConnected && !isTollboothDeployed(chainId)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cx(
          'flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-[12px] font-medium transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          bad ? 'bg-amber-900/20 border-amber-700/40 text-amber-300' : 'bg-surface border-border text-fg hover:border-muted',
        )}
        aria-label="Switch network" aria-haspopup="listbox" aria-expanded={open}
      >
        <span className={cx('w-1.5 h-1.5 rounded-full', bad ? 'bg-warning' : 'bg-accent')} />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown size={12} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-44 bg-surface border border-border rounded-md overflow-hidden">
          {CHAINS.map(({ chain, label }) => {
            const deployed = isTollboothDeployed(chain.id)
            return (
              <button
                key={chain.id} role="option" aria-selected={chain.id === chainId}
                onClick={() => { switchChain({ chainId: chain.id }); setOpen(false) }}
                className={cx('w-full flex items-center justify-between px-3 py-2 text-[12px] hover:bg-surface2 transition-colors duration-100', chain.id === chainId ? 'text-fg font-medium' : 'text-muted')}
              >
                <span>{label}</span>
                {!deployed && <span className="text-[10px] text-amber-300">soon</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function WithdrawChip() {
  const { pending } = usePendingWithdrawal()
  const { execute, status } = useTollboothWrite('withdraw', { successMsg: 'Withdrawal successful.' })
  if (pending === 0n) return null
  return (
    <button
      onClick={() => { void execute([]) }}
      disabled={status === 'signing' || status === 'confirming'}
      className="flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-accent/40 bg-accent/10 text-accent text-[12px] font-medium hover:bg-accent/20 transition-colors duration-150 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={`Withdraw ${fmtUsdc(pending)} pending`}
    >
      <ArrowDownToLine size={13} strokeWidth={2} />
      <span className="hidden sm:inline">Withdraw</span>
      <span className="font-mono tabular">{fmtUsdc(pending)}</span>
    </button>
  )
}

function UsdcBalanceChip() {
  const { balance } = useUsdcBalance()
  const { isConnected } = useAccount()
  if (!isConnected) return null
  return (
    <div className="hidden md:flex items-center gap-1.5 px-2.5 h-8 rounded-md border border-borderSubtle text-[12px]">
      <span className="text-muted">Balance</span>
      <span className="font-mono tabular text-fg">{fmtUsdc(balance)}</span>
    </div>
  )
}

function EscrowSearch() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  return (
    <form
      onSubmit={e => { e.preventDefault(); const id = q.trim().replace(/^#/, ''); if (/^\d+$/.test(id)) { void navigate(`/escrows/${id}`); setQ('') } }}
      className="relative hidden md:block"
    >
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      <input
        value={q} onChange={e => setQ(e.target.value)} placeholder="Go to escrow #" aria-label="Go to escrow by id"
        className="h-8 w-44 pl-8 pr-2 rounded-md bg-bg border border-borderSubtle text-[12px] text-fg placeholder:text-muted focus:outline-none focus:border-border focus:ring-1 focus:ring-accent/60 transition-colors"
      />
    </form>
  )
}

export function TopBar() {
  const { pathname } = useLocation()
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Tollbooth'
  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-sm border-b border-borderSubtle">
      <div className="flex items-center gap-2 px-4 lg:px-6 h-14">
        <div className="lg:hidden text-fg font-semibold text-[15px] mr-auto">Tollbooth</div>
        <div className="hidden lg:block text-[13px] text-muted mr-auto">
          <span className="text-fg font-medium">{title}</span>
        </div>
        <EscrowSearch />
        <UsdcBalanceChip />
        <WithdrawChip />
        <NetworkSwitcher />
        <div className="lg:hidden"><ConnectKitButton /></div>
      </div>
    </header>
  )
}

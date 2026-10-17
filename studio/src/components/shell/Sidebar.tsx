import { NavLink } from 'react-router-dom'
import { useAccount, useBlockNumber, useDisconnect } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { LayoutDashboard, Layers, PlusCircle, Activity, BookOpen, LogOut } from 'lucide-react'
import { CopyButton } from '@/components/ui/CopyButton'
import { useReadChainId } from '@/hooks/useTollbooth'
import { getTollboothAddress, getExplorerBase } from '@/config'
import { cx, shortAddr } from '@/lib/utils'
import { arcTestnet } from 'viem/chains'

const NAV = [
  { to: '/',         label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/escrows',  label: 'Escrows',   Icon: Layers },
  { to: '/create',   label: 'New escrow', Icon: PlusCircle },
  { to: '/activity', label: 'Activity',  Icon: Activity },
  { to: '/docs',     label: 'Docs',      Icon: BookOpen },
]

function WalletBlock() {
  const { disconnect } = useDisconnect()
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, address, ensName, truncatedAddress }) => {
        if (!isConnected || !address) {
          return (
            <button
              onClick={show}
              className="w-full h-9 rounded-md bg-fg text-bg text-[13px] font-medium hover:bg-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Connect wallet
            </button>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <button onClick={show} className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-md px-2 py-1.5 hover:bg-surface2 transition-colors duration-150">
              <span className="w-6 h-6 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, #${address.slice(2, 8)}, #${address.slice(-6)})` }} aria-hidden />
              <span className="min-w-0">
                <span className="block text-[13px] text-fg truncate">{ensName ?? truncatedAddress}</span>
                <span className="block text-[11px] text-muted">Connected</span>
              </span>
            </button>
            <CopyButton text={address} size={13} />
            <button onClick={() => disconnect()} aria-label="Disconnect" className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-surface2 transition-colors duration-150">
              <LogOut size={14} />
            </button>
          </div>
        )
      }}
    </ConnectKitButton.Custom>
  )
}

function NetworkStatus() {
  const chainId = useReadChainId()
  const { chainId: walletChain } = useAccount()
  const { data: block } = useBlockNumber({ chainId, watch: true })
  const contract = getTollboothAddress(chainId)
  const mismatch = walletChain !== undefined && walletChain !== chainId
  return (
    <div className="space-y-1.5 text-[11px] text-muted">
      <div className="flex items-center gap-2">
        <span className={cx('w-1.5 h-1.5 rounded-full', mismatch ? 'bg-warning' : 'bg-accent')} />
        <span className="text-fg">{chainId === arcTestnet.id ? 'Arc Testnet' : 'Arc'}</span>
        <span className="ml-auto font-mono tabular">{block ? `#${block.toLocaleString()}` : '—'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>Contract</span>
        <a href={`${getExplorerBase(chainId)}/address/${contract}`} target="_blank" rel="noreferrer" className="ml-auto font-mono hover:text-fg transition-colors">{shortAddr(contract)}</a>
      </div>
      {mismatch && <div className="text-warning">Wallet is on an unsupported network.</div>}
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-borderSubtle bg-surface h-dvh sticky top-0">
      <div className="px-5 h-14 flex items-center border-b border-borderSubtle">
        <img src="/favicon.svg" alt="" width={24} height={24} className="mr-2.5 rounded-[5px]" />
        <span className="text-fg font-semibold text-[15px] tracking-tight">Tollbooth</span>
        <span className="ml-auto text-[10px] font-mono text-muted border border-borderSubtle rounded px-1">v2</span>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-px" role="navigation" aria-label="Main navigation">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cx(
              'flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] transition-colors duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive ? 'bg-surface2 text-fg font-medium' : 'text-muted hover:text-fg hover:bg-surface2/60',
            )}
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3 space-y-3">
        <div className="border-t border-borderSubtle pt-3">
          <WalletBlock />
        </div>
        <div className="border-t border-borderSubtle pt-3 px-1">
          <NetworkStatus />
        </div>
      </div>
    </aside>
  )
}

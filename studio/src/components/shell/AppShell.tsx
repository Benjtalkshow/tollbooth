import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { useAccount } from 'wagmi'
import { isTollboothDeployed } from '@/config'

function NotDeployedBanner() {
  const { chainId } = useAccount()
  if (!chainId || isTollboothDeployed(chainId)) return null
  return (
    <div className="bg-amber-900/30 border-b border-amber-700/40 px-4 py-2 text-center text-sm text-amber-300">
      Tollbooth is not yet deployed on this network. Switch to Arc Testnet to use the app.
    </div>
  )
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <NotDeployedBanner />
        <main className="flex-1 px-4 lg:px-6 py-5 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

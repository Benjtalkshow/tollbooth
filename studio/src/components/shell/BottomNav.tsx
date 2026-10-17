import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Layers, PlusCircle, Activity, BookOpen } from 'lucide-react'
import { cx } from '@/lib/utils'

const NAV = [
  { to: '/',         label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/escrows',  label: 'Escrows',  Icon: Layers },
  { to: '/create',   label: 'Create',   Icon: PlusCircle },
  { to: '/activity', label: 'Activity', Icon: Activity },
  { to: '/docs',     label: 'Docs',     Icon: BookOpen },
]

export function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-border flex"
      role="navigation"
      aria-label="Bottom navigation"
    >
      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => cx(
            'flex-1 flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-medium transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-accent',
            'min-h-[44px]',
            isActive ? 'text-accent' : 'text-muted',
          )}
        >
          <Icon size={18} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

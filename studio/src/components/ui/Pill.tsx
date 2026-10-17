import { cx } from '@/lib/utils'
import { EscrowStatus, MilestoneStatus } from '@/lib/types'

interface PillProps {
  label: string
  variant: 'slate' | 'sky' | 'green' | 'green-solid' | 'amber' | 'violet' | 'red'
  size?: 'sm' | 'xs'
}

const VARIANTS: Record<PillProps['variant'], string> = {
  'slate':       'bg-slate-800 text-slate-300 border border-slate-700',
  'sky':         'bg-sky-900/50 text-sky-300 border border-sky-700/60',
  'green':       'bg-green-900/40 text-green-400 border border-green-700/50',
  'green-solid': 'bg-green-900/60 text-green-300 border border-green-600/60',
  'amber':       'bg-amber-900/40 text-amber-400 border border-amber-700/50',
  'violet':      'bg-violet-900/40 text-violet-400 border border-violet-700/50',
  'red':         'bg-red-900/40 text-red-400 border border-red-700/50',
}

export function Pill({ label, variant, size = 'sm' }: PillProps) {
  return (
    <span className={cx(
      'inline-flex items-center font-medium rounded tabular whitespace-nowrap',
      size === 'sm' ? 'px-1.5 py-px text-[11px]' : 'px-1.5 py-px text-[10px]',
      VARIANTS[variant],
    )}>
      {label}
    </span>
  )
}

export function EscrowStatusPill({ status }: { status: EscrowStatus }) {
  const MAP: Record<EscrowStatus, { label: string; variant: PillProps['variant'] }> = {
    [EscrowStatus.Active]:   { label: 'Active',   variant: 'sky' },
    [EscrowStatus.Disputed]: { label: 'Disputed', variant: 'amber' },
    [EscrowStatus.Released]: { label: 'Released', variant: 'green-solid' },
    [EscrowStatus.Resolved]: { label: 'Resolved', variant: 'violet' },
  }
  const { label, variant } = MAP[status]
  return <Pill label={label} variant={variant} />
}

export function MilestoneStatusPill({ milestone }: { milestone: { status: MilestoneStatus; approved: boolean; released: boolean; disputed: boolean; resolved: boolean } }) {
  if (milestone.resolved) return <Pill label="Resolved" variant="violet" />
  if (milestone.released) return <Pill label="Released" variant="green-solid" />
  if (milestone.disputed) return <Pill label="Disputed" variant="amber" />
  if (milestone.approved) return <Pill label="Approved" variant="green" />
  if (milestone.status === MilestoneStatus.Completed)  return <Pill label="Completed" variant="green" />
  if (milestone.status === MilestoneStatus.InProgress) return <Pill label="In Progress" variant="sky" />
  return <Pill label="Pending" variant="slate" />
}

import { cx } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  padding?: 'sm' | 'md' | 'lg' | 'none'
  hover?: boolean
}

const PADDING = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

export function Card({ children, padding = 'md', hover = false, className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cx(
        'bg-surface border border-border rounded-card shadow-card',
        PADDING[padding],
        hover && 'hover:border-border hover:shadow-card-hover transition-shadow duration-200 cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-widest">{title}</h2>
      {action}
    </div>
  )
}

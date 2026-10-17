import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { copyText, cx } from '@/lib/utils'

interface CopyButtonProps {
  text: string
  className?: string
  size?: number
}

export function CopyButton({ text, className, size = 14 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const ok = await copyText(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={() => { void handleCopy() }}
      className={cx(
        'inline-flex items-center justify-center w-7 h-7 rounded text-muted',
        'hover:text-fg hover:bg-surface2 transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      )}
      aria-label="Copy to clipboard"
    >
      {copied
        ? <Check size={size} className="text-accent" />
        : <Copy size={size} />
      }
    </button>
  )
}

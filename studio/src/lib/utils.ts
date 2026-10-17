import { keccak256, toHex } from 'viem'

/** Shorten an address for display: 0x1234...5678 */
export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/** Format a bigint USDC amount (6 decimals) as "$1,234.56" */
export function fmtUsdc(raw: bigint): string {
  const dollars = Number(raw) / 1_000_000
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars)
}

/** Format a bigint USDC amount as a plain number string: "1234.56" */
export function fmtUsdcPlain(raw: bigint): string {
  const dollars = Number(raw) / 1_000_000
  return dollars.toFixed(2)
}

/** Parse a human USDC string "12.50" -> bigint 12_500_000n */
export function parseUsdcInput(value: string): bigint {
  const n = parseFloat(value)
  if (isNaN(n) || n < 0) return 0n
  return BigInt(Math.round(n * 1_000_000))
}

/** Hash arbitrary text content (spec, evidence) client-side via keccak256 */
export function hashContent(text: string): `0x${string}` {
  return keccak256(toHex(text))
}

/** Hash an engagement ID string into bytes32 */
export function hashEngagementId(text: string): `0x${string}` {
  if (!text) return `0x${'0'.repeat(64)}`
  return keccak256(toHex(text))
}

/** Format a Unix timestamp as a relative string "2h 15m" or "3d 4h" */
export function fmtRelative(ts: bigint | number): string {
  const now = Math.floor(Date.now() / 1000)
  const t   = Number(ts)
  const diff = t - now
  const abs  = Math.abs(diff)

  if (abs < 60)   return diff < 0 ? 'just passed' : 'in <1m'
  if (abs < 3600) {
    const m = Math.floor(abs / 60)
    return diff < 0 ? `${m}m ago` : `in ${m}m`
  }
  if (abs < 86400) {
    const h = Math.floor(abs / 3600)
    const m = Math.floor((abs % 3600) / 60)
    return diff < 0 ? `${h}h ${m}m ago` : `in ${h}h ${m}m`
  }
  const d = Math.floor(abs / 86400)
  const h = Math.floor((abs % 86400) / 3600)
  return diff < 0 ? `${d}d ${h}h ago` : `in ${d}d ${h}h`
}

/** Format a bigint unix timestamp as a date string */
export function fmtDeadline(deadline: bigint): string {
  if (deadline === 0n) return 'No deadline'
  return new Date(Number(deadline) * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Check if a deadline is overdue */
export function isOverdue(deadline: bigint): boolean {
  if (deadline === 0n) return false
  return Date.now() / 1000 > Number(deadline)
}

/** Copy text to clipboard, return true on success */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Format percentage from bps: 500 -> "5.00%" */
export function fmtBps(bps: number | bigint): string {
  return `${(Number(bps) / 100).toFixed(2)}%`
}

/** Compute fees from a gross amount */
export function splitFees(gross: bigint, platformFeeBps: bigint, protocolFeeBps: number | bigint) {
  const platformFee = gross * platformFeeBps / 10_000n
  const protocolFee = gross * BigInt(protocolFeeBps) / 10_000n
  const net = gross - platformFee - protocolFee
  return { platformFee, protocolFee, net }
}

/** Derive funded percentage 0-100 */
export function fundedPct(balance: bigint, amount: bigint): number {
  if (amount === 0n) return 0
  return Math.min(100, Math.round(Number(balance * 100n / amount)))
}

/** clsx-like class combiner */
export function cx(...args: (string | undefined | null | false)[]): string {
  return args.filter(Boolean).join(' ')
}

/** Human-readable role name from role key */
export const ROLE_LABELS: Record<string, string> = {
  approver:        'Approver',
  serviceProvider: 'Service Provider',
  releaseSigner:   'Release Signer',
  disputeResolver: 'Dispute Resolver',
  platformAddress: 'Platform',
  receiver:        'Receiver',
}

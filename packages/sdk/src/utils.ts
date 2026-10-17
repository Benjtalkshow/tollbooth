import { formatUnits, isHex, keccak256, parseUnits, toHex, type Hex } from 'viem'
import { USDC_DECIMALS } from './chains.js'

/** Convert a human USDC amount ("1.25") to base units (1250000n). */
export function usdc(amount: string | number): bigint {
  return parseUnits(String(amount), USDC_DECIMALS)
}

/** Format base units as a human USDC string. */
export function formatUsdc(amount: bigint): string {
  return formatUnits(amount, USDC_DECIMALS)
}

/** keccak256 of text. A 32-byte hex value is returned unchanged. Empty/undefined becomes bytes32(0). */
export function hashContent(content?: Hex | string): Hex {
  if (!content) return `0x${'0'.repeat(64)}` as Hex
  if (isHex(content) && content.length === 66) return content
  return keccak256(toHex(content))
}

export function toDeadline(d?: bigint | number | Date): bigint {
  if (d === undefined) return 0n
  if (d instanceof Date) return BigInt(Math.floor(d.getTime() / 1000))
  return BigInt(d)
}

/** Deadline helper: now + N seconds. */
export function secondsFromNow(seconds: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds)
}

/** Fee split for a gross amount. Mirrors the contract math exactly. */
export function splitFees(gross: bigint, platformFeeBps: bigint | number, protocolFeeBps: bigint | number) {
  const platformFee = (gross * BigInt(platformFeeBps)) / 10_000n
  const protocolFee = (gross * BigInt(protocolFeeBps)) / 10_000n
  return { platformFee, protocolFee, net: gross - platformFee - protocolFee }
}

import { describe, expect, it } from 'vitest'
import { formatUsdc, hashContent, splitFees, toDeadline, usdc, TOLLBOOTH_AGENT_TOOLS, ERROR_MESSAGES } from '../src/index.js'

describe('usdc helpers', () => {
  it('round-trips amounts at 6 decimals', () => {
    expect(usdc('1.25')).toBe(1_250_000n)
    expect(formatUsdc(1_250_000n)).toBe('1.25')
  })
  it('splits platform and protocol fees like the contract', () => {
    expect(splitFees(1_000_000n, 100, 50)).toEqual({ platformFee: 10_000n, protocolFee: 5_000n, net: 985_000n })
    expect(splitFees(1n, 0, 50)).toEqual({ platformFee: 0n, protocolFee: 0n, net: 1n })
  })
})

describe('hashContent', () => {
  it('hashes text, passes bytes32 through, and maps empty to zero', () => {
    const h = hashContent('write a haiku')
    expect(h).toMatch(/^0x[0-9a-f]{64}$/)
    expect(hashContent(h)).toBe(h)
    expect(hashContent(undefined)).toBe(`0x${'0'.repeat(64)}`)
  })
})

describe('toDeadline', () => {
  it('accepts Date, number, bigint and undefined', () => {
    expect(toDeadline(new Date(1_700_000_000_000))).toBe(1_700_000_000n)
    expect(toDeadline(5)).toBe(5n)
    expect(toDeadline(undefined)).toBe(0n)
  })
})

describe('agent tools', () => {
  it('exposes 11 tools with JSON-schema object inputs', () => {
    expect(TOLLBOOTH_AGENT_TOOLS).toHaveLength(11)
    for (const t of TOLLBOOTH_AGENT_TOOLS) {
      expect(t.name.startsWith('tollbooth_')).toBe(true)
      expect(t.input_schema).toMatchObject({ type: 'object' })
    }
  })
  it('has a human message for the common custom errors', () => {
    for (const n of ['NotAuthorized', 'DistributionSumMismatch', 'MilestonesNotAllApproved']) expect(ERROR_MESSAGES[n]).toBeTruthy()
  })
})

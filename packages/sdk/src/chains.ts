import { arc, arcTestnet } from 'viem/chains'
import type { Address, Chain } from 'viem'

/** Deployed Tollbooth contract addresses by chain id. */
export const TOLLBOOTH_ADDRESSES: Record<number, Address | undefined> = {
  [arcTestnet.id]: '0x92e2758e11883865db2cebbfe16abf1cd5231c0d',
  [arc.id]: '0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532',
}

export const SUPPORTED_CHAINS: Record<number, Chain> = {
  [arcTestnet.id]: arcTestnet,
  [arc.id]: arc,
}

export { arc, arcTestnet }

/** USDC on Arc uses 6 decimals at the ERC-20 interface. */
export const USDC_DECIMALS = 6

/** Explorer link for a tx. On an unknown chain (e.g. local anvil) returns the bare hash. */
export function explorerTxUrl(chainId: number, hash: string): string {
  const base = SUPPORTED_CHAINS[chainId]?.blockExplorers?.default.url
  return base ? `${base}/tx/${hash}` : hash
}

export function explorerAddressUrl(chainId: number, address: string): string {
  const base = SUPPORTED_CHAINS[chainId]?.blockExplorers?.default.url
  return base ? `${base}/address/${address}` : address
}

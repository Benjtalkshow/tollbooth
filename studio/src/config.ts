/**
 * wagmi configuration + contract addresses
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arc, arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'
import tollboothArtifact from '../contracts/out/Tollbooth.sol/Tollbooth.json'

// RPC URLs — override via .env for local anvil forks; falls back to chain defaults.
const envTestnetRpc: string | undefined = import.meta.env.VITE_ARC_TESTNET_RPC_URL as string | undefined
const envMainnetRpc: string | undefined = import.meta.env.VITE_ARC_MAINNET_RPC_URL as string | undefined
const rpcTestnet: string = envTestnetRpc || arcTestnet.rpcUrls.default.http[0]
const rpcMainnet: string = envMainnetRpc || arc.rpcUrls.default.http[0]

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, rpcTestnet)
registerChain(arc.id, rpcMainnet)

export const config = createConfig({
  chains: [arcTestnet, arc, mainnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(rpcTestnet),
    [arc.id]: http(rpcMainnet),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})

// ---- Tollbooth contract ----
export const TOLLBOOTH_ABI = tollboothArtifact.abi

/**
 * Deployed addresses keyed by chain ID.
 * Set arc.id to the mainnet address once deployed.
 */
export const TOLLBOOTH_ADDRESSES: Record<number, `0x${string}`> = {
  [arcTestnet.id]: '0x92e2758e11883865db2cebbfe16abf1cd5231c0d', // v2
  [arc.id]: '0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532',
}

/** Supported Tollbooth chain IDs (Arc Testnet and Arc mainnet). */
export const TOLLBOOTH_CHAIN_IDS = [arcTestnet.id, arc.id] as const
export type TollboothChainId = (typeof TOLLBOOTH_CHAIN_IDS)[number]

/**
 * Returns the Tollbooth address for a given chain ID, or '' if not deployed.
 * Use isTollboothDeployed() to guard UI before calling contract functions.
 */
export function getTollboothAddress(chainId: number | undefined): `0x${string}` {
  if (chainId === undefined) return '' as `0x${string}`
  return TOLLBOOTH_ADDRESSES[chainId] ?? ('' as `0x${string}`)
}

/** True when Tollbooth is deployed and address is non-empty on this chain. */
export function isTollboothDeployed(chainId: number | undefined): boolean {
  return getTollboothAddress(chainId).length > 0
}

/** True when the connected chain is one of the Tollbooth-supported chains. */
export function isTollboothChain(chainId: number | undefined): boolean {
  return chainId !== undefined && (TOLLBOOTH_CHAIN_IDS as readonly number[]).includes(chainId)
}

/** Explorer base URL for a given chain ID. */
export function getExplorerBase(chainId: number | undefined): string {
  if (chainId === arc.id) return 'https://explorer.arc.io'
  return 'https://explorer.testnet.arc.io'
}

export function buildTollboothExplorerUrl(chainId: number | undefined): string {
  const addr = getTollboothAddress(chainId)
  if (!addr) return ''
  return `${getExplorerBase(chainId)}/address/${addr}`
}

// Legacy single-chain exports kept for backwards compatibility during migration.
// Prefer getTollboothAddress(chainId) in new code.
export const TOLLBOOTH_ADDRESS = TOLLBOOTH_ADDRESSES[arcTestnet.id]
export const TOLLBOOTH_CHAIN_ID = arcTestnet.id

export const TOLLBOOTH = {
  address: TOLLBOOTH_ADDRESS,
  abi: TOLLBOOTH_ABI,
  chainId: TOLLBOOTH_CHAIN_ID,
} as const

export { arc, arcTestnet }

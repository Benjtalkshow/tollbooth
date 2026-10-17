/**
 * Typed hooks for the Tollbooth v2 contract.
 * All reads are chain-aware via useAccount().chainId.
 */
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getTollboothAddress, TOLLBOOTH_ABI, isTollboothDeployed, getExplorerBase } from '@/config'
import { getUsdc } from '@/onchain-facts'
import type { Escrow, Milestone, Roles, Distribution } from '@/lib/types'
import { parseContractError } from '@/lib/errors'

// ────────────────────────────────────────────────────────────────
// Shared contract ref builder
// ────────────────────────────────────────────────────────────────
/** Resolve the chain to read from: the wallet's chain when it is one we support, otherwise Arc Testnet. */
export function useReadChainId(): number {
  const { chainId } = useAccount()
  return chainId && isTollboothDeployed(chainId) ? chainId : arcTestnet.id
}

function useTollboothContract() {
  const chainId = useReadChainId()
  const address = getTollboothAddress(chainId)
  const deployed = isTollboothDeployed(chainId)
  return { address: address, abi: TOLLBOOTH_ABI, chainId, deployed }
}

// ────────────────────────────────────────────────────────────────
// Read hooks
// ────────────────────────────────────────────────────────────────

export function useEscrow(escrowId: bigint | undefined) {
  const { address, abi, chainId, deployed } = useTollboothContract()
  const { data, isLoading, refetch } = useReadContract({
    address,
    abi,
    functionName: 'getEscrow',
    args:         [escrowId ?? 0n],
    chainId,
    query:        { enabled: deployed && escrowId !== undefined && escrowId > 0n },
  })
  return { escrow: data as Escrow | undefined, isLoading, refetch }
}

export function useMilestones(escrowId: bigint | undefined) {
  const { address, abi, chainId, deployed } = useTollboothContract()
  const { data, isLoading, refetch } = useReadContract({
    address,
    abi,
    functionName: 'getMilestones',
    args:         [escrowId ?? 0n],
    chainId,
    query:        { enabled: deployed && escrowId !== undefined && escrowId > 0n },
  })
  return { milestones: (data as Milestone[] | undefined) ?? [], isLoading, refetch }
}

export function useRoles(escrowId: bigint | undefined) {
  const { address, abi, chainId, deployed } = useTollboothContract()
  const { data, isLoading } = useReadContract({
    address,
    abi,
    functionName: 'getRoles',
    args:         [escrowId ?? 0n],
    chainId,
    query:        { enabled: deployed && escrowId !== undefined && escrowId > 0n },
  })
  return { roles: data as Roles | undefined, isLoading }
}

export function useEscrowCount() {
  const { address, abi, chainId, deployed } = useTollboothContract()
  const { data, isLoading, refetch } = useReadContract({
    address,
    abi,
    functionName: 'escrowCount',
    chainId,
    query:        { enabled: deployed, refetchInterval: 10_000 },
  })
  return { count: (data as bigint | undefined) ?? 0n, isLoading, refetch }
}

export function useMyEscrows() {
  const { address: wallet, chainId } = useAccount()
  const { address, abi, deployed } = useTollboothContract()
  const { data, isLoading, refetch } = useReadContract({
    address,
    abi,
    functionName: 'escrowsByAddress',
    args:         [wallet ?? '0x0000000000000000000000000000000000000000'],
    chainId,
    query:        { enabled: deployed && !!wallet, refetchInterval: 15_000 },
  })
  return { escrowIds: (data as bigint[] | undefined) ?? [], isLoading, refetch }
}

export function usePendingWithdrawal() {
  const { address: wallet, chainId } = useAccount()
  const { address, abi, deployed } = useTollboothContract()
  const { data, isLoading, refetch } = useReadContract({
    address,
    abi,
    functionName: 'pendingWithdrawals',
    args:         [wallet ?? '0x0000000000000000000000000000000000000000'],
    chainId,
    query:        { enabled: deployed && !!wallet, refetchInterval: 10_000 },
  })
  return { pending: (data as bigint | undefined) ?? 0n, isLoading, refetch }
}

export function useFeeBps() {
  const { address, abi, chainId, deployed } = useTollboothContract()
  const { data } = useReadContract({
    address,
    abi,
    functionName: 'feeBps',
    chainId,
    query:        { enabled: deployed },
  })
  return (data as number | undefined) ?? 0
}

export function useFundedTotal(escrowId: bigint | undefined) {
  const { address, abi, chainId, deployed } = useTollboothContract()
  const { data, isLoading, refetch } = useReadContract({
    address,
    abi,
    functionName: 'fundedTotal',
    args:         [escrowId ?? 0n],
    chainId,
    query:        { enabled: deployed && escrowId !== undefined && escrowId > 0n },
  })
  return { fundedTotal: (data as bigint | undefined) ?? 0n, isLoading, refetch }
}

export function useDepositOf(escrowId: bigint | undefined, depositor: `0x${string}` | undefined) {
  const { address, abi, chainId, deployed } = useTollboothContract()
  const { data } = useReadContract({
    address,
    abi,
    functionName: 'depositOf',
    args:         [escrowId ?? 0n, depositor ?? '0x0000000000000000000000000000000000000000'],
    chainId,
    query:        { enabled: deployed && !!escrowId && !!depositor },
  })
  return (data as bigint | undefined) ?? 0n
}

export function useUsdcBalance() {
  const { address: wallet, chainId } = useAccount()
  const usdc = chainId ? getUsdc(chainId) : undefined
  const { data, isLoading, refetch } = useReadContract({
    address:      usdc?.address as `0x${string}`,
    abi:          erc20Abi,
    functionName: 'balanceOf',
    args:         [wallet ?? '0x0000000000000000000000000000000000000000'],
    chainId,
    query:        { enabled: !!wallet && !!usdc, refetchInterval: 15_000 },
  })
  return { balance: (data) ?? 0n, isLoading, refetch, decimals: usdc?.decimals ?? 6 }
}

export function useUsdcAllowance(spender: `0x${string}` | undefined) {
  const { address: wallet, chainId } = useAccount()
  const usdc = chainId ? getUsdc(chainId) : undefined
  const { data, refetch } = useReadContract({
    address:      usdc?.address as `0x${string}`,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         [
      wallet ?? '0x0000000000000000000000000000000000000000',
      spender ?? '0x0000000000000000000000000000000000000000',
    ],
    chainId,
    query:   { enabled: !!wallet && !!usdc && !!spender },
  })
  return { allowance: (data) ?? 0n, refetch }
}

// ────────────────────────────────────────────────────────────────
// Generic write hook — simulates, writes, waits, toasts
// ────────────────────────────────────────────────────────────────

export type WriteStatus = 'idle' | 'signing' | 'confirming' | 'success' | 'error'

interface WriteTollboothOptions {
  onSuccess?: (hash: `0x${string}`) => void
  successMsg?: string
  invalidateKeys?: readonly string[]
}

export function useTollboothWrite(fnName: string, opts: WriteTollboothOptions = {}) {
  const { chainId } = useAccount()
  const { address, abi, deployed } = useTollboothContract()
  const queryClient = useQueryClient()
  const explorerBase = getExplorerBase(chainId)

  const {
    writeContractAsync,
    isPending,
    data: hash,
    error: writeError,
    reset,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  async function execute(args: readonly unknown[]) {
    if (!deployed) {
      toast.error('Tollbooth is not deployed on this network.')
      return
    }
    try {
      const txHash = await writeContractAsync({
        address,
        abi,
        functionName: fnName,
        args,
        chainId,
      })
      toast.loading('Confirming transaction…', { id: txHash })
      opts.onSuccess?.(txHash)
      // Invalidate react-query caches
      void queryClient.invalidateQueries()
    } catch (err) {
      const msg = parseContractError(err)
      if (!msg.includes('cancelled')) {
        toast.error(msg)
      }
    }
  }

  // Show success toast when tx confirms
  if (isSuccess && hash) {
    toast.success(opts.successMsg ?? 'Transaction confirmed.', {
      id: hash,
      action: {
        label: 'View',
        onClick: () => window.open(`${explorerBase}/tx/${hash}`, '_blank'),
      },
    })
  }

  const status: WriteStatus = isPending
    ? 'signing'
    : isConfirming
    ? 'confirming'
    : isSuccess
    ? 'success'
    : writeError
    ? 'error'
    : 'idle'

  return { execute, status, hash, isPending, isConfirming, isSuccess, reset }
}

// ────────────────────────────────────────────────────────────────
// USDC approve hook
// ────────────────────────────────────────────────────────────────

export function useUsdcApprove() {
  const { chainId } = useAccount()
  const usdc = chainId ? getUsdc(chainId) : undefined
  const { writeContractAsync, isPending } = useWriteContract()

  async function approve(spender: `0x${string}`, amount: bigint) {
    if (!usdc) throw new Error('USDC not found for this chain')
    return writeContractAsync({
      address:      usdc.address as `0x${string}`,
      abi:          erc20Abi,
      functionName: 'approve',
      args:         [spender, amount],
      chainId,
    })
  }

  return { approve, isPending }
}

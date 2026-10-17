/**
 * Tollbooth v2 three-agent demo.
 *
 *   Agent A (client)   hires Agent B for two milestones, approves and releases milestone 0.
 *   Agent B (worker)   does the work, posts evidence, withdraws.
 *   Milestone 1 goes wrong: A disputes it, Agent C (resolver) splits it 50/50.
 *
 * Every step is a real transaction through the Tollbooth escrow.
 *
 *   CHAIN=local|testnet|mainnet  CLIENT_PRIVATE_KEY  WORKER_PRIVATE_KEY  RESOLVER_PRIVATE_KEY   npx tsx demo.ts
 */
import { createPublicClient, createWalletClient, defineChain, http, parseEther, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  TollboothClient,
  TOLLBOOTH_AGENT_TOOLS,
  runTollboothTool,
  arc,
  arcTestnet,
  formatUsdc,
  hashContent,
  explorerAddressUrl,
} from 'tollbooth-sdk'

const localChain = defineChain({
  id: 31337,
  name: 'Anvil (local)',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
})
const chain = process.env.CHAIN === 'mainnet' ? arc : process.env.CHAIN === 'local' ? localChain : arcTestnet
const rpc = process.env.RPC_URL
const M0 = process.env.M0_USDC ?? '0.10'
const M1 = process.env.M1_USDC ?? '0.10'

function need(name: string): Hex {
  const v = process.env[name]
  if (!v) throw new Error(`Set ${name}`)
  return v as Hex
}
function agent(pk: Hex) {
  const account = privateKeyToAccount(pk)
  const publicClient = createPublicClient({ chain, transport: http(rpc) })
  const walletClient = createWalletClient({ account, chain, transport: http(rpc) })
  return { client: new TollboothClient({ publicClient, walletClient, address: process.env.TOLLBOOTH_ADDRESS as Hex | undefined }), walletClient, publicClient }
}
const log = (who: string, msg: string) => console.log(`[${who}] ${msg}`)
type Esc = { milestones: { status: string; approved: boolean; released: boolean; disputed: boolean; resolved: boolean; netUsdc: string; evidenceHash: string }[]; released: boolean; balanceUsdc: string }

async function main() {
  const A = agent(need('CLIENT_PRIVATE_KEY'))
  const B = agent(need('WORKER_PRIVATE_KEY'))
  const C = agent(need('RESOLVER_PRIVATE_KEY'))
  const a = A.client, b = B.client, c = C.client

  log('setup', `chain=${chain.name} tollbooth=${explorerAddressUrl(chain.id, a.address)}`)
  for (const [n, x] of [['client', a], ['worker', b], ['resolver', c]] as const) log('setup', `${n} ${x.account} usdc=${formatUsdc(await x.usdcBalance(x.account))}`)
  log('setup', `${TOLLBOOTH_AGENT_TOOLS.length} agent tools: ${TOLLBOOTH_AGENT_TOOLS.map((t) => t.name).join(', ')}`)

  // The resolver only needs gas. If it is empty, the client tops it up with native USDC.
  if ((await A.publicClient.getBalance({ address: c.account })) === 0n) {
    const h = await A.walletClient.sendTransaction({ to: c.account, value: parseEther('0.2') })
    await A.publicClient.waitForTransactionReceipt({ hash: h })
    log('agent-a', `topped up resolver with 0.2 USDC for gas`)
  }

  // 1. A hires B: two milestones, C as dispute resolver.
  const spec = 'Milestone 0: summarise the Arc docs in three bullets. Milestone 1: translate the summary to French.'
  const hire = (await runTollboothTool(a, 'tollbooth_hire', { worker: b.account, milestoneAmountsUsdc: [M0, M1], spec, deadlineSeconds: 3600, disputeResolver: c.account })) as { escrowId: string; totalUsdc: string; txs: { explorerUrl: string }[] }
  log('agent-a', `hired agent-b, escrow #${hire.escrowId}, ${hire.totalUsdc} USDC locked (${hire.txs.length} txs). ${hire.txs.at(-1)?.explorerUrl}`)

  // 2. B does milestone 0, posts evidence; A verifies the hash and approves; A releases; B withdraws.
  const work0 = '- Arc is an L1 with USDC as gas.\n- Arc Studio builds and audits onchain apps from a prompt.\n- The Circle stack is native on Arc.'
  await runTollboothTool(b, 'tollbooth_update_status', { escrowId: hire.escrowId, milestoneIndex: 0, status: 'Completed', evidence: work0 })
  log('agent-b', `milestone 0 Completed with evidence hash ${hashContent(work0).slice(0, 10)}…`)
  let e = (await runTollboothTool(a, 'tollbooth_get_escrow', { escrowId: hire.escrowId })) as Esc
  log('agent-a', `evidence ${e.milestones[0].evidenceHash === hashContent(work0) ? 'verified' : 'MISMATCH'} onchain, status ${e.milestones[0].status}`)
  await runTollboothTool(a, 'tollbooth_approve', { escrowId: hire.escrowId, milestoneIndex: 0 })
  const rel = (await runTollboothTool(a, 'tollbooth_release', { escrowId: hire.escrowId, milestoneIndex: 0 })) as { explorerUrl: string }
  log('agent-a', `approved and released milestone 0. ${rel.explorerUrl}`)
  const mine = (await runTollboothTool(b, 'tollbooth_my_escrows', {})) as { pendingWithdrawalUsdc: string }
  await runTollboothTool(b, 'tollbooth_withdraw', {})
  log('agent-b', `withdrew ${mine.pendingWithdrawalUsdc} USDC (milestone 0 net of fees)`)

  // 3. Milestone 1: B claims done, A is unhappy and disputes, C splits it.
  await runTollboothTool(b, 'tollbooth_update_status', { escrowId: hire.escrowId, milestoneIndex: 1, status: 'Completed', evidence: 'Bonjour (incomplete translation)' })
  log('agent-b', `milestone 1 Completed`)
  const disp = (await runTollboothTool(a, 'tollbooth_dispute', { escrowId: hire.escrowId, milestoneIndex: 1 })) as { explorerUrl: string }
  log('agent-a', `disputed milestone 1: translation is incomplete. ${disp.explorerUrl}`)
  e = (await runTollboothTool(c, 'tollbooth_get_escrow', { escrowId: hire.escrowId })) as Esc
  const net = e.milestones[1].netUsdc
  const half = (Number(net) / 2).toFixed(6)
  const rest = (Number(net) - Number(half)).toFixed(6)
  const res = (await runTollboothTool(c, 'tollbooth_resolve', {
    escrowId: hire.escrowId,
    milestoneIndex: 1,
    distributions: [
      { to: b.account, amountUsdc: half },
      { to: a.account, amountUsdc: rest },
    ],
  })) as { explorerUrl: string }
  log('agent-c', `resolved milestone 1: ${half} to worker, ${rest} back to client (net ${net}). ${res.explorerUrl}`)
  await runTollboothTool(a, 'tollbooth_withdraw', {})
  await runTollboothTool(b, 'tollbooth_withdraw', {})

  e = (await runTollboothTool(a, 'tollbooth_get_escrow', { escrowId: hire.escrowId })) as Esc
  log('done', `escrow #${hire.escrowId} released=${e.released} balance=${e.balanceUsdc}. worker usdc=${formatUsdc(await b.usdcBalance(b.account))} client usdc=${formatUsdc(await a.usdcBalance(a.account))}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

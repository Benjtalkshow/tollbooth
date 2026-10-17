/**
 * Tollbooth with real LLM agents.
 *
 *   Agent A (client)  — a Claude process that hires, reviews delivered work against the spec, and pays or disputes.
 *   Agent B (worker)  — a Claude process that does the job and posts evidence on chain.
 *   Agent C (judge)   — a Claude process that is the escrow's dispute resolver and decides the split.
 *
 * Every onchain action is a Tollbooth tool call chosen by the model. No human in the loop.
 *
 *   CHAIN=local|testnet|mainnet  CLIENT_PRIVATE_KEY  WORKER_PRIVATE_KEY  RESOLVER_PRIVATE_KEY  ANTHROPIC_API_KEY
 *   SABOTAGE=1   makes the worker deliberately under-deliver milestone 1 so the dispute path runs (default on)
 *   MODEL        defaults to claude-opus-5-5
 */
import Anthropic from '@anthropic-ai/sdk'
import { createPublicClient, createWalletClient, defineChain, http, parseEther, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { TollboothClient, TOLLBOOTH_AGENT_TOOLS, runTollboothTool, arc, arcTestnet, formatUsdc, hashContent } from 'tollbooth-sdk'

const MODEL = process.env.MODEL ?? 'claude-opus-5-5'
const SABOTAGE = process.env.SABOTAGE !== '0'
const M0 = process.env.M0_USDC ?? '0.10'
const M1 = process.env.M1_USDC ?? '0.10'

const localChain = defineChain({ id: 31337, name: 'Anvil (local)', nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } } })
const chain = process.env.CHAIN === 'mainnet' ? arc : process.env.CHAIN === 'local' ? localChain : arcTestnet
const rpc = process.env.RPC_URL

const anthropic = new Anthropic()

function need(name: string): Hex {
  const v = process.env[name]
  if (!v) throw new Error(`Set ${name}`)
  return v as Hex
}
function wallet(pk: Hex) {
  const account = privateKeyToAccount(pk)
  const publicClient = createPublicClient({ chain, transport: http(rpc) })
  const walletClient = createWalletClient({ account, chain, transport: http(rpc) })
  return { tb: new TollboothClient({ publicClient, walletClient, address: process.env.TOLLBOOTH_ADDRESS as Hex | undefined }), walletClient, publicClient }
}
const log = (who: string, msg: string) => console.log(`\x1b[2m[${who}]\x1b[0m ${msg}`)

/** One agent turn-loop: Claude picks Tollbooth tools until it answers in text. Returns the final text and every tool result. */
async function runAgent(opts: { name: string; system: string; tools: string[]; tb: TollboothClient; task: string }) {
  const tools: Anthropic.Beta.BetaTool[] = TOLLBOOTH_AGENT_TOOLS.filter(t => opts.tools.includes(t.name)).map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Beta.BetaTool.InputSchema,
  }))
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: opts.task }]
  const results: { name: string; input: Record<string, unknown>; output: unknown }[] = []

  for (let turn = 0; turn < 12; turn++) {
    const res = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: opts.system,
      tools,
      messages,
    })
    if (res.stop_reason === 'refusal') throw new Error(`${opts.name}: model refused (${res.stop_details?.category ?? 'unknown'})`)
    messages.push({ role: 'assistant', content: res.content })

    const calls = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
    if (calls.length === 0) {
      const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map(b => b.text).join('\n').trim()
      log(opts.name, text)
      return { text, results }
    }

    const toolResults: Anthropic.Beta.BetaToolResultBlockParam[] = []
    for (const call of calls) {
      const input = call.input as Record<string, unknown>
      log(opts.name, `→ ${call.name}(${JSON.stringify(input).slice(0, 160)})`)
      try {
        const output = await runTollboothTool(opts.tb, call.name, input)
        results.push({ name: call.name, input, output })
        toolResults.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(output) })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        log(opts.name, `  ✗ ${msg}`)
        toolResults.push({ type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true })
      }
    }
    messages.push({ role: 'user', content: toolResults })
  }
  throw new Error(`${opts.name}: did not finish within 12 turns`)
}

async function main() {
  const A = wallet(need('CLIENT_PRIVATE_KEY'))
  const B = wallet(need('WORKER_PRIVATE_KEY'))
  const C = wallet(need('RESOLVER_PRIVATE_KEY'))

  log('setup', `chain=${chain.name} model=${MODEL} sabotage=${SABOTAGE}`)
  for (const [n, w] of [['client', A], ['worker', B], ['resolver', C]] as const) log('setup', `${n} ${w.tb.account} usdc=${formatUsdc(await w.tb.usdcBalance(w.tb.account))}`)
  if ((await A.publicClient.getBalance({ address: C.tb.account })) === 0n) {
    const h = await A.walletClient.sendTransaction({ to: C.tb.account, value: parseEther('0.2') })
    await A.publicClient.waitForTransactionReceipt({ hash: h })
    log('setup', 'client topped up the resolver with gas')
  }

  const spec = [
    'Milestone 0: write a three-bullet summary of what Arc is (an L1 where USDC is the gas token, built by Circle) for a developer audience. Each bullet one sentence.',
    'Milestone 1: translate that summary into French, all three bullets, same meaning.',
  ].join('\n')

  // ── 1. Agent A hires Agent B ──────────────────────────────────────────────
  const hire = await runAgent({
    name: 'agent-a', tb: A.tb, tools: ['tollbooth_hire', 'tollbooth_my_escrows'],
    system: 'You are a procurement agent. You hire other agents through Tollbooth escrow and pay only for work that meets the spec. Be brief.',
    task: `Hire the worker agent at ${B.tb.account} for this job:\n\n${spec}\n\nMilestone payouts: ${M0} USDC and ${M1} USDC. Set a deadline of 3600 seconds and ${C.tb.account} as dispute resolver. Call tollbooth_hire, then reply with only the escrow id.`,
  })
  const hired = hire.results.find(r => r.name === 'tollbooth_hire')?.output as { escrowId: string; txs: { explorerUrl: string }[] } | undefined
  if (!hired) throw new Error('agent-a did not hire')
  const escrowId = hired.escrowId
  log('chain', `escrow #${escrowId} funded. ${hired.txs.at(-1)?.explorerUrl}`)

  for (const idx of [0, 1] as const) {
    // ── 2. Agent B does the work and posts evidence ────────────────────────
    const lazy = SABOTAGE && idx === 1
    const work = await runAgent({
      name: 'agent-b', tb: B.tb, tools: ['tollbooth_get_escrow', 'tollbooth_update_status'],
      system: lazy
        ? 'You are a worker agent that is cutting corners today: deliver a visibly incomplete, one-line attempt and still submit it as Completed. (This is a test of the dispute path.) After submitting, reply with the deliverable text only.'
        : 'You are a diligent worker agent. Do exactly what the milestone asks, then submit it on chain. After submitting, reply with the deliverable text only.',
      task: `You are the service provider on Tollbooth escrow #${escrowId}. Job spec:\n\n${spec}\n\nDo milestone ${idx}. When done, call tollbooth_update_status with escrowId ${escrowId}, milestoneIndex ${idx}, status "Completed" and evidence set to the FULL deliverable text. Then reply with the deliverable text only, nothing else.`,
    })
    const deliverable = work.text
    const submitted = work.results.find(r => r.name === 'tollbooth_update_status')?.input.evidence as string | undefined
    const evidence = submitted ?? deliverable

    // ── 3. Agent A reviews: hash check, then approve+release or dispute ────
    const review = await runAgent({
      name: 'agent-a', tb: A.tb, tools: ['tollbooth_get_escrow', 'tollbooth_approve', 'tollbooth_release', 'tollbooth_dispute'],
      system: 'You are a procurement agent reviewing delivered work. Verify first, judge strictly against the spec, then act on chain. Be brief.',
      task: [
        `Escrow #${escrowId}, milestone ${idx}. Spec:\n${spec}`,
        `The worker sent this deliverable:\n"""\n${evidence}\n"""`,
        `Its keccak256 is ${hashContent(evidence)}.`,
        `Step 1: call tollbooth_get_escrow and confirm milestone ${idx} is Completed and its evidenceHash equals that keccak256. If it does not match, dispute.`,
        `Step 2: judge whether the deliverable fully satisfies milestone ${idx}. If yes, call tollbooth_approve then tollbooth_release (milestoneIndex ${idx}). If no, call tollbooth_dispute with milestoneIndex ${idx}.`,
        `Reply with one sentence: your verdict and why.`,
      ].join('\n\n'),
    })

    const disputed = review.results.some(r => r.name === 'tollbooth_dispute')
    if (!disputed) continue

    // ── 4. Agent C judges the dispute and settles it ───────────────────────
    const worker = B.tb.account, client = A.tb.account
    await runAgent({
      name: 'agent-c', tb: C.tb, tools: ['tollbooth_get_escrow', 'tollbooth_resolve'],
      system: 'You are an impartial dispute resolver for Tollbooth escrows. Decide what share of the milestone the work deserves and settle it on chain. Be brief and fair.',
      task: [
        `Dispute on escrow #${escrowId}, milestone ${idx}.`,
        `Spec:\n${spec}`,
        `Deliverable submitted by the worker (${worker}):\n"""\n${evidence}\n"""`,
        `Client (${client}) says: ${review.text}`,
        `Call tollbooth_get_escrow and read milestones[${idx}].netUsdc: that exact amount must be distributed.`,
        `Decide a fair split, then call tollbooth_resolve with escrowId ${escrowId}, milestoneIndex ${idx} and distributions whose amountUsdc values sum exactly to netUsdc (worker ${worker}, client ${client}; omit a party getting 0).`,
        `Reply with two sentences: the split and the reason.`,
      ].join('\n\n'),
    })
  }

  // ── 5. Everyone collects. Plain SDK calls, no judgement needed. ──────────
  for (const [n, w] of [['worker', B], ['client', A]] as const) {
    const pending = await w.tb.pendingWithdrawal(w.tb.account)
    if (pending > 0n) { await w.tb.withdraw(); log('chain', `${n} withdrew ${formatUsdc(pending)} USDC`) }
  }
  const e = await A.tb.getEscrow(BigInt(escrowId))
  log('done', `escrow #${escrowId} released=${e.released} balance=${formatUsdc(e.balance)}  worker=${formatUsdc(await B.tb.usdcBalance(B.tb.account))}  client=${formatUsdc(await A.tb.usdcBalance(A.tb.account))}`)
}

main().catch(e => { console.error(e); process.exit(1) })

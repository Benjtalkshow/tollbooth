import { useState } from 'react'
import { Copy, Check, ExternalLink, Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { cx } from '@/lib/utils'
import { getTollboothAddress, getExplorerBase, TOLLBOOTH_ABI } from '@/config'
import { arcTestnet } from 'viem/chains'

function LifecycleDiagram() {
  type Tone = 'neutral' | 'accent' | 'warn' | 'violet'
  const box = (x: number, y: number, w: number, label: string, tone: Tone = 'neutral') => {
    const stroke = tone === 'accent' ? '#22C55E' : tone === 'warn' ? '#F59E0B' : tone === 'violet' ? '#A78BFA' : '#475569'
    const fill = tone === 'accent' ? 'rgba(34,197,94,0.10)' : tone === 'warn' ? 'rgba(245,158,11,0.10)' : tone === 'violet' ? 'rgba(167,139,250,0.10)' : '#1E293B'
    return (
      <g key={label}>
        <rect x={x} y={y} width={w} height={40} rx={8} fill={fill} stroke={stroke} strokeWidth={1.25} />
        <text x={x + w / 2} y={y + 25} textAnchor="middle" fontSize={13} fontWeight={600} fill="#F8FAFC" fontFamily="Inter, system-ui, sans-serif">{label}</text>
      </g>
    )
  }
  const edge = (d: string, label: string, lx: number, ly: number, dashed = false) => (
    <g key={d}>
      <path d={d} fill="none" stroke={dashed ? '#F59E0B' : '#64748B'} strokeWidth={1.25} markerEnd="url(#arrow)" strokeDasharray={dashed ? '4 3' : undefined} />
      <text x={lx} y={ly} textAnchor="middle" fontSize={11} fill="#94A3B8" fontFamily="JetBrains Mono, ui-monospace, monospace">{label}</text>
    </g>
  )
  return (
    <div className="rounded-card border border-border bg-surface overflow-x-auto p-2">
      <svg viewBox="0 0 760 305" role="img" aria-label="Escrow lifecycle: open, funded, in review, released; dispute path to resolved; deadline path to refunded" className="w-full min-w-[640px] h-auto">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#64748B" />
          </marker>
        </defs>
        <text x={20} y={22} fontSize={11} fill="#94A3B8" fontFamily="JetBrains Mono, ui-monospace, monospace">createEscrow()</text>
        {box(20, 50, 100, 'Open')}
        {box(200, 50, 100, 'Funded')}
        {box(380, 50, 120, 'In review')}
        {box(600, 50, 120, 'Released', 'accent')}
        {box(380, 170, 120, 'Disputed', 'warn')}
        {box(600, 170, 120, 'Resolved', 'violet')}
        {box(200, 240, 120, 'Refunded')}
        {edge('M120,70 L198,70', 'fundEscrow', 160, 42)}
        {edge('M300,70 L378,70', 'changeMilestoneStatus', 340, 42)}
        {edge('M500,70 L598,70', 'approve + release', 550, 42)}
        {edge('M440,90 L440,168', 'dispute', 478, 134, true)}
        {edge('M500,190 L598,190', 'resolveDispute', 550, 162)}
        {edge('M250,90 L250,238', 'refundAfterDeadline', 310, 170)}
        <text x={20} y={292} fontSize={11} fill="#94A3B8" fontFamily="Inter, system-ui, sans-serif">Every payout lands in a pending balance; recipients call withdraw(). Multi-release repeats review and release per milestone.</text>
      </svg>
    </div>
  )
}

const SECTIONS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'contract',   label: 'Contract Ref' },
  { id: 'sdk',        label: 'SDK' },
  { id: 'agents',     label: 'Agents' },
  { id: 'deployments',label: 'Deployments' },
]

function CodeBlock({ code, language = 'typescript' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-surface2 border-b border-border">
        <span className="text-xs text-muted font-mono">{language}</span>
        <button
          onClick={() => { void navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }}
          className="flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono text-fg/90 text-xs">{code}</code>
      </pre>
    </div>
  )
}

function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-6">
      {children}
    </section>
  )
}

const SINGLE_RELEASE_EXAMPLE = `
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { TollboothClient, EscrowType, MilestoneStatus, arcTestnet, usdc, secondsFromNow } from 'tollbooth-sdk'

const account      = privateKeyToAccount(process.env.PRIVATE_KEY as \`0x\${string}\`)
const publicClient = createPublicClient({ chain: arcTestnet, transport: http() })
const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() })
const tb = new TollboothClient({ publicClient, walletClient })

// 1. Create a single-release escrow: one amount, two checkpoint milestones
const { escrowId } = await tb.createEscrow({
  escrowType: EscrowType.SingleRelease,
  roles: {
    approver:        '0xApprover',
    serviceProvider: '0xProvider',
    releaseSigner:   '0xSigner',
    receiver:        '0xReceiver',
    disputeResolver: '0xResolver',   // optional
  },
  amount:       usdc('100'),
  milestones:   [{ amount: 0n }, { amount: 0n }],
  deadline:     secondsFromNow(7 * 24 * 3600),
  engagementId: 'Deliver the MVP',  // hashed with keccak256
})

// 2. Fund it (approves USDC first if needed). Any role holder may deposit, in parts.
await tb.fundEscrow(escrowId, usdc('100'))

// 3. Provider marks work done and attaches evidence (text is hashed onchain)
await tb.changeMilestoneStatus(escrowId, 0, MilestoneStatus.Completed, 'https://… or the deliverable text')
await tb.changeMilestoneStatus(escrowId, 1, MilestoneStatus.Completed, 'second deliverable')

// 4. Approver signs off each milestone (no undo)
await tb.approveMilestone(escrowId, 0)
await tb.approveMilestone(escrowId, 1)

// 5. Release signer pays the receiver in one go, then the receiver withdraws
await tb.releaseFunds(escrowId)
await tb.withdraw()
`.trim()

const MULTI_RELEASE_EXAMPLE = `
// Multi-release: each milestone has its own amount and receiver and releases on its own.
const { escrowId } = await tb.createEscrow({
  escrowType: EscrowType.MultiRelease,
  roles: { approver: '0xApprover', serviceProvider: '0xProvider', releaseSigner: '0xSigner', disputeResolver: '0xResolver' },
  platformAddress: '0xPlatform', platformFeeBps: 100,   // optional 1% to the platform
  milestones: [
    { amount: usdc('30'), receiver: '0xDesigner' },
    { amount: usdc('40'), receiver: '0xBackend' },
    { amount: usdc('30') },                          // receiver defaults to serviceProvider
  ],
})
await tb.fundEscrow(escrowId, usdc('100'))

await tb.changeMilestoneStatus(escrowId, 0, MilestoneStatus.Completed, 'design.fig')
await tb.approveMilestone(escrowId, 0)
await tb.releaseMilestoneFunds(escrowId, 0)          // pays 0xDesigner net of fees

// Something is contested on milestone 1: freeze it, then the resolver splits the net amount.
await tb.disputeMilestone(escrowId, 1)
const { net } = splitFees(usdc('40'), 100, await tb.feeBps())
await tb.resolveMilestoneDispute(escrowId, 1, [
  { to: '0xBackend',  amount: net / 2n },
  { to: '0xApprover', amount: net - net / 2n },
])

// The simplest agent flow collapses all of this into one call:
const hired = await tb.hire({ worker: '0xWorker', milestoneAmounts: [usdc('0.5'), usdc('1')], spec: 'Summarise the Arc docs' })
`.trim()

const AGENT_TOOLS = `
import { TOLLBOOTH_AGENT_TOOLS, runTollboothTool } from 'tollbooth-sdk'

// Eleven JSON-Schema tools. Hand the array to your model; execute what it calls.
TOLLBOOTH_AGENT_TOOLS.map(t => t.name)
// [ 'tollbooth_hire', 'tollbooth_fund', 'tollbooth_update_status', 'tollbooth_approve',
//   'tollbooth_release', 'tollbooth_dispute', 'tollbooth_resolve', 'tollbooth_withdraw',
//   'tollbooth_refund', 'tollbooth_get_escrow', 'tollbooth_my_escrows' ]

// Example tool definition (tollbooth_hire)
{
  name: 'tollbooth_hire',
  description: 'Hire another agent or service. Creates and funds a multi-release USDC escrow …',
  input_schema: {
    type: 'object',
    properties: {
      worker:               { type: 'string'  },
      milestoneAmountsUsdc: { type: 'array', items: { type: 'string' } },   // e.g. ["0.50","1.00"]
      spec:                 { type: 'string'  },
      deadlineSeconds:      { type: 'integer' },
      disputeResolver:      { type: 'string'  },
    },
    required: ['worker', 'milestoneAmountsUsdc', 'spec'],
  },
}

// Results are plain JSON the model can read back, e.g. tollbooth_get_escrow returns
// { escrowId, type, roles, amountUsdc, fundedUsdc, balanceUsdc, milestones: [{ status, approved, netUsdc, … }], netDisputedUsdc }
`.trim()

const CLAUDE_TOOL_USE = `
import Anthropic from '@anthropic-ai/sdk'
import { TOLLBOOTH_AGENT_TOOLS, runTollboothTool } from 'tollbooth-sdk'

const anthropic = new Anthropic()
const messages = [{ role: 'user', content: 'Hire 0xWorker for 1.5 USDC to summarise the Arc docs, then verify and pay.' }]

// Standard tool-use loop: the model decides, Tollbooth executes, the result goes back to the model.
for (;;) {
  const res = await anthropic.messages.create({ model: 'claude-fable-5-1', max_tokens: 1024, tools: TOLLBOOTH_AGENT_TOOLS, messages })
  messages.push({ role: 'assistant', content: res.content })
  const calls = res.content.filter(b => b.type === 'tool_use')
  if (calls.length === 0) break
  const results = []
  for (const call of calls) {
    const output = await runTollboothTool(tollbooth, call.name, call.input as Record<string, unknown>)
    results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(output) })
  }
  messages.push({ role: 'user', content: results })
}
`.trim()

export function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview')
  const contractAddr = getTollboothAddress(arcTestnet.id)
  const explorerBase = getExplorerBase(arcTestnet.id)

  function downloadAbi() {
    const blob = new Blob([JSON.stringify(TOLLBOOTH_ABI, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'Tollbooth.abi.json'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl flex gap-8">
      {/* Sub-nav */}
      <nav className="hidden lg:block w-40 shrink-0 sticky top-20 self-start space-y-0.5">
        {SECTIONS.map(s => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={() => setActiveSection(s.id)}
            className={cx(
              'block px-3 py-2 rounded-lg text-sm transition-colors duration-100',
              activeSection === s.id ? 'bg-accent/10 text-accent' : 'text-muted hover:text-fg',
            )}
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="flex-1 min-w-0 space-y-16">

        {/* ── 1. Overview ── */}
        <SectionAnchor id="overview">
          <h1 className="text-lg font-semibold text-fg tracking-tight">Tollbooth Protocol</h1>
          <p className="text-muted text-sm leading-relaxed max-w-prose">
            Tollbooth is a role-based USDC escrow on Arc, designed for software-to-software and agent-to-agent payments.
            It supports both lump-sum (Single Release) and milestone-by-milestone (Multi Release) payment flows,
            with optional disputes, multi-party funding, and deadline refunds.
          </p>

          {/* Roles table */}
          <Card padding="none" className="overflow-hidden">
            <div className="px-4 py-2 bg-surface2 border-b border-border text-xs font-semibold text-muted uppercase tracking-widest">Roles</div>
            {[
              ['Approver',         'Reviews and approves milestone deliverables.'],
              ['Service Provider', 'Performs work; submits status updates with evidence.'],
              ['Release Signer',   'Authorises fund release after approvals.'],
              ['Dispute Resolver', 'Resolves disputes with a custom distribution (optional).'],
              ['Platform Address', 'Receives a per-escrow platform fee (optional).'],
              ['Receiver',         'Single Release only: receives the net payment on release.'],
            ].map(([role, desc]) => (
              <div key={role} className="flex gap-4 px-4 py-2.5 border-b border-borderSubtle last:border-0 text-sm">
                <span className="w-36 shrink-0 text-fg font-medium">{role}</span>
                <span className="text-muted">{desc}</span>
              </div>
            ))}
          </Card>

          {/* Lifecycle */}
          <div>
            <h2 className="text-base font-semibold text-fg mb-3">Lifecycle</h2>
            <LifecycleDiagram />
          </div>

          {/* Fee model */}
          <div>
            <h2 className="text-base font-semibold text-fg mb-3">Fee Model</h2>
            <p className="text-sm text-muted mb-3">
              Two fees are deducted on every release: a per-escrow <strong className="text-fg">platform fee</strong> (up to 50%) and a global <strong className="text-fg">protocol fee</strong> (up to 5%). Both are snapshotted at escrow creation so terms cannot change after funding.
            </p>
            <div className="bg-surface2 rounded-lg p-4 font-mono text-xs text-muted space-y-1">
              <div>platformFee  = gross × platformFeeBps / 10000</div>
              <div>protocolFee  = gross × protocolFeeBps / 10000</div>
              <div className="text-fg">net          = gross − platformFee − protocolFee</div>
            </div>
          </div>
        </SectionAnchor>

        {/* ── 2. Contract Reference ── */}
        <SectionAnchor id="contract">
          <h2 className="text-xl font-semibold text-fg">Contract Reference</h2>

          {[
            {
              group: 'Create & Fund',
              fns: [
                { sig: 'createEscrow(EscrowType, Roles, uint256, uint256, uint64, bytes32, MilestoneInput[])', who: 'Anyone', events: 'EscrowCreated' },
                { sig: 'fundEscrow(uint256 escrowId, uint256 amount)', who: 'Approver / ServiceProvider / ReleaseSigner / PlatformAddress', events: 'Deposited' },
                { sig: 'updateEscrow(uint256, Roles, uint256, uint64, bytes32, MilestoneInput[])', who: 'PlatformAddress or Approver (before funding)', events: 'EscrowUpdated' },
              ],
            },
            {
              group: 'Milestones',
              fns: [
                { sig: 'changeMilestoneStatus(uint256, uint256, MilestoneStatus, bytes32)', who: 'ServiceProvider', events: 'MilestoneStatusChanged' },
                { sig: 'approveMilestone(uint256, uint256, bytes32)', who: 'Approver', events: 'MilestoneApproved' },
              ],
            },
            {
              group: 'Release',
              fns: [
                { sig: 'releaseFunds(uint256)', who: 'ReleaseSigner (SingleRelease, all approved)', events: 'FundsReleased' },
                { sig: 'releaseMilestoneFunds(uint256, uint256)', who: 'ReleaseSigner (MultiRelease, milestone approved)', events: 'MilestoneReleased' },
              ],
            },
            {
              group: 'Disputes',
              fns: [
                { sig: 'disputeEscrow(uint256)', who: 'Approver / ServiceProvider / ReleaseSigner', events: 'EscrowDisputed' },
                { sig: 'disputeMilestone(uint256, uint256)', who: 'Approver / ServiceProvider / ReleaseSigner', events: 'MilestoneDisputed' },
                { sig: 'resolveDispute(uint256, Distribution[])', who: 'DisputeResolver', events: 'DisputeResolved' },
                { sig: 'resolveMilestoneDispute(uint256, uint256, Distribution[])', who: 'DisputeResolver', events: 'MilestoneDisputeResolved' },
              ],
            },
            {
              group: 'Views',
              fns: [
                { sig: 'getEscrow(uint256) / getMilestones(uint256) / getRoles(uint256)', who: 'Anyone (view)', events: '—' },
                { sig: 'escrowsByAddress(address) / escrowCount()', who: 'Anyone (view)', events: '—' },
                { sig: 'fundedTotal(uint256) / depositOf(uint256, address) / pendingWithdrawals(address) / totalObligations()', who: 'Anyone (view)', events: '—' },
              ],
            },
            {
              group: 'Recovery',
              fns: [
                { sig: 'refundAfterDeadline(uint256)', who: 'Anyone (after deadline)', events: 'RefundedAfterDeadline' },
                { sig: 'withdrawRemainingFunds(uint256, Distribution[])', who: 'DisputeResolver / Approver / ReleaseSigner', events: 'RemainingFundsWithdrawn' },
                { sig: 'withdraw()', who: 'Anyone (pulls their pendingWithdrawals)', events: 'Withdrawn' },
              ],
            },
          ].map(({ group, fns }) => (
            <div key={group}>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-widest mb-2">{group}</h3>
              <Card padding="none" className="overflow-hidden mb-4">
                {fns.map((fn, i) => (
                  <div key={i} className="px-4 py-3 border-b border-borderSubtle last:border-0 space-y-1">
                    <div className="font-mono text-xs text-info break-all">{fn.sig}</div>
                    <div className="flex gap-4 text-xs text-muted flex-wrap">
                      <span><span className="text-fg">Caller:</span> {fn.who}</span>
                      <span><span className="text-fg">Events:</span> {fn.events}</span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </SectionAnchor>

        {/* ── 3. SDK ── */}
        <SectionAnchor id="sdk">
          <h2 className="text-xl font-semibold text-fg">SDK (tollbooth-sdk)</h2>

          <CodeBlock code="npm install tollbooth-sdk viem" language="bash" />

          <h3 className="text-base font-semibold text-fg">Single Release Example</h3>
          <CodeBlock code={SINGLE_RELEASE_EXAMPLE} />

          <h3 className="text-base font-semibold text-fg">Multi Release Example</h3>
          <CodeBlock code={MULTI_RELEASE_EXAMPLE} />

          {/* Method table */}
          <h3 className="text-base font-semibold text-fg">Method Reference</h3>
          <Card padding="none" className="overflow-hidden">
            {[
              ['createEscrow(params)',                          'Create a new escrow (not funded); returns escrowId'],
              ['hire({worker, milestoneAmounts, spec, …})',  'Agent shortcut: multi-release, you approve and release, worker receives; funds by default'],
              ['fundEscrow(id, amount)',                        'Deposit USDC into an escrow'],
              ['updateEscrow(...)',                             'Update escrow before funding'],
              ['changeMilestoneStatus(id, idx, status, evidence?)', 'Provider: mark InProgress / Completed with evidence (text is hashed)'],
              ['approveMilestone(id, idx, evidence?)',          'Approver: approve a milestone'],
              ['releaseFunds(id)',                              'Signer: release single-release escrow'],
              ['releaseMilestoneFunds(id, idx)',                'Signer: release one milestone'],
              ['disputeEscrow(id)',                             'Raise a dispute on an escrow'],
              ['disputeMilestone(id, idx)',                     'Raise a dispute on a milestone'],
              ['resolveDispute(id, distributions)',             'Resolver: distribute a disputed escrow'],
              ['resolveMilestoneDispute(id, idx, dists)',       'Resolver: distribute a disputed milestone'],
              ['withdrawRemainingFunds(id, distributions)',     'Withdraw overfunded surplus'],
              ['refundAfterDeadline(id)',                       'Refund after deadline passes'],
              ['withdraw()',                                    'Pull pending USDC to wallet'],
              ['getEscrow / getMilestones / getRoles(id)',      'Read escrow state'],
              ['escrowsByAddress(addr)',                        'Ids where the address holds a role or deposited'],
              ['fundedTotal(id) / depositOf(id, addr)',         'Funding progress and per-depositor contribution'],
              ['pendingWithdrawal(addr) / usdcBalance(addr)',   'Pull balance owed by the contract, wallet USDC balance'],
            ].map(([method, desc]) => (
              <div key={method} className="flex gap-4 px-4 py-2.5 border-b border-borderSubtle last:border-0 text-xs">
                <span className="font-mono text-info w-64 shrink-0 break-all">{method}</span>
                <span className="text-muted">{desc}</span>
              </div>
            ))}
          </Card>

          <h3 className="text-base font-semibold text-fg">Helpers</h3>
          <Card padding="none" className="overflow-hidden">
            {[
              ['usdc(amount)',        'Parse a USDC string to bigint (e.g. usdc("10.50"))'],
              ['formatUsdc(raw)',     'Format a bigint USDC amount to string'],
              ['hashContent(text)',   'keccak256 of text; a bytes32 passes through; empty becomes zero'],
              ['secondsFromNow(n)',   'Unix timestamp n seconds from now'],
              ['splitFees(gross, platformBps, protocolBps)', '{ platformFee, protocolFee, net } exactly as the contract computes'],
              ['ERROR_MESSAGES',      'Plain-English text for every contract custom error; TollboothError.errorName carries the name'],
            ].map(([fn, desc]) => (
              <div key={fn} className="flex gap-4 px-4 py-2.5 border-b border-borderSubtle last:border-0 text-xs">
                <span className="font-mono text-info w-48 shrink-0">{fn}</span>
                <span className="text-muted">{desc}</span>
              </div>
            ))}
          </Card>
        </SectionAnchor>

        {/* ── 4. Agents ── */}
        <SectionAnchor id="agents">
          <h2 className="text-xl font-semibold text-fg">Agents</h2>
          <p className="text-sm text-muted leading-relaxed max-w-prose">
            Tollbooth exposes a JSON-Schema tool set that any LLM agent runtime can use directly.
            Import <code className="font-mono text-info text-xs bg-surface2 px-1.5 py-0.5 rounded">TOLLBOOTH_AGENT_TOOLS</code> and
            pass it to Claude's <code className="font-mono text-info text-xs bg-surface2 px-1.5 py-0.5 rounded">tools</code> array,
            then call <code className="font-mono text-info text-xs bg-surface2 px-1.5 py-0.5 rounded">runTollboothTool(client, name, input)</code> to execute any tool use block.
          </p>

          <h3 className="text-base font-semibold text-fg">Tool Schema</h3>
          <CodeBlock code={AGENT_TOOLS} />

          <h3 className="text-base font-semibold text-fg">Two-Agent Flow (Claude)</h3>
          <CodeBlock code={CLAUDE_TOOL_USE} />

          <Card className="bg-surface2">
            <p className="text-sm text-muted leading-relaxed">
              <span className="text-fg font-medium">Narrative flow:</span> An orchestrator agent receives a job spec and calls{' '}
              <code className="font-mono text-xs text-info">tollbooth_hire</code> to create and fund an escrow.
              The worker agent (a separate Claude process) monitors <code className="font-mono text-xs text-info">tollbooth_my_escrows</code>,
              completes work, calls <code className="font-mono text-xs text-info">tollbooth_update_status</code> with evidence,
              and calls <code className="font-mono text-xs text-info">tollbooth_withdraw</code> after the orchestrator approves and releases.
              No human required.
            </p>
          </Card>
        </SectionAnchor>

        {/* ── 5. Deployments ── */}
        <SectionAnchor id="deployments">
          <h2 className="text-xl font-semibold text-fg">Deployments</h2>

          <Card padding="none" className="overflow-hidden">
            <div className="flex gap-4 px-4 py-2 bg-surface2 border-b border-border text-xs font-semibold text-muted uppercase tracking-widest">
              <span className="w-28 shrink-0">Network</span>
              <span className="flex-1">Contract Address</span>
              <span className="shrink-0">Status</span>
            </div>
            {[
              { label: 'Arc Testnet', addr: contractAddr, deployed: !!contractAddr },
              { label: 'Arc Mainnet', addr: '',           deployed: false },
            ].map(({ label, addr, deployed }) => (
              <div key={label} className="flex gap-4 items-center px-4 py-3 border-b border-borderSubtle last:border-0 text-sm">
                <span className="w-28 shrink-0 text-fg">{label}</span>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {addr ? (
                    <>
                      <span className="font-mono text-xs text-muted tabular truncate">{addr}</span>
                      <CopyButton text={addr} size={12} />
                      <a
                        href={`${explorerBase}/address/${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted hover:text-fg"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </>
                  ) : (
                    <span className="text-muted italic text-xs">— not deployed</span>
                  )}
                </div>
                <span className={cx('text-xs', deployed ? 'text-accent' : 'text-muted')}>
                  {deployed ? 'Live' : 'Coming soon'}
                </span>
              </div>
            ))}
          </Card>

          {/* USDC */}
          <Card>
            <h3 className="text-sm font-semibold text-fg mb-3">USDC (Arc Testnet)</h3>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted tabular">0x3600000000000000000000000000000000000000</span>
              <CopyButton text="0x3600000000000000000000000000000000000000" size={12} />
            </div>
            <p className="text-xs text-muted mt-2">
              On Arc, USDC is the native gas token. The same pool is exposed as ERC-20 at the address above (6 decimals).
            </p>
          </Card>

          {/* ABI download */}
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" icon={<Download size={13} />} onClick={downloadAbi}>
              Download ABI
            </Button>
            <span className="text-xs text-muted">Tollbooth.abi.json</span>
          </div>

          {/* Chain settings */}
          <Card>
            <h3 className="text-sm font-semibold text-fg mb-3">Arc Testnet — Wallet Settings</h3>
            <div className="space-y-2 text-xs">
              {[
                ['Chain ID',        '5042002'],
                ['RPC URL',         'https://rpc.testnet.arc.io'],
                ['Explorer',        'https://explorer.testnet.arc.io'],
                ['Currency Symbol', 'USDC'],
                ['Currency Decimals','18 (native) / 6 (ERC-20)'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <span className="text-muted w-36 shrink-0">{k}</span>
                  <span className="font-mono text-fg">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </SectionAnchor>

      </div>
    </div>
  )
}

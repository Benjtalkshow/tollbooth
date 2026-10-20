import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  ArrowLeft, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, SectionHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill, EscrowStatusPill, MilestoneStatusPill } from '@/components/ui/Pill'
import { Skeleton } from '@/components/ui/Skeleton'
import { CopyButton } from '@/components/ui/CopyButton'
import {
  useEscrow, useMilestones, useFundedTotal, useDepositOf,
  useTollboothWrite, useUsdcAllowance, useUsdcApprove, useReadChainId,
} from '@/hooks/useTollbooth'
import {
  fmtUsdc, parseUsdcInput, fmtDeadline, isOverdue,
  fundedPct, shortAddr, cx, splitFees, hashContent, ROLE_LABELS,
} from '@/lib/utils'
import {
  EscrowType, MilestoneStatus, deriveEscrowStatus,
  type Milestone, type Distribution,
} from '@/lib/types'
import { getTollboothAddress, getExplorerBase, isTollboothDeployed } from '@/config'

// ── Address row ───────────────────────────────────────────────────────────────
function AddressRow({ label, addr, wallet }: { label: string; addr: string; wallet?: string }) {
  const isYou = wallet && addr.toLowerCase() === wallet.toLowerCase()
  const isEmpty = !addr || addr === '0x0000000000000000000000000000000000000000'
  return (
    <div className="flex items-center justify-between py-2 border-b border-borderSubtle last:border-0">
      <span className="text-xs text-muted w-32 shrink-0">{label}</span>
      {isEmpty ? (
        <span className="text-xs text-muted italic">— not set</span>
      ) : (
        <div className="flex items-center gap-2">
          {isYou && <span className="text-[10px] text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-full">you</span>}
          <span className="font-mono text-xs text-fg tabular">{shortAddr(addr)}</span>
          <CopyButton text={addr} size={12} />
        </div>
      )}
    </div>
  )
}

// ── Distribution row in resolve modal ────────────────────────────────────────
function DistributionRow({
  to, amount, onRemove, onChange,
}: {
  to: string; amount: string;
  onRemove: () => void; onChange: (to: string, amount: string) => void
}) {
  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        placeholder="0x… address"
        value={to}
        onChange={e => onChange(e.target.value, amount)}
        className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-fg font-mono focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        type="number"
        placeholder="USDC"
        value={amount}
        min="0"
        onChange={e => onChange(to, e.target.value)}
        className="w-28 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-fg tabular focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button onClick={onRemove} className="text-muted hover:text-danger transition-colors p-1">
        <XCircle size={14} />
      </button>
    </div>
  )
}

// ── Milestone card ────────────────────────────────────────────────────────────
function MilestoneCard({
  milestone, idx, escrowId, escrowType, roles, escrow, wallet,
}: {
  milestone: Milestone
  idx: number
  escrowId: bigint
  escrowType: EscrowType
  roles: { approver: string; serviceProvider: string; releaseSigner: string; disputeResolver: string }
  escrow: { disputed: boolean; released: boolean; balance: bigint; amount: bigint; platformFeeBps: bigint; snapshotFeeBps: number }
  wallet?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [evidence, setEvidence] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<MilestoneStatus>(MilestoneStatus.InProgress)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [distributions, setDistributions] = useState<{ to: string; amount: string }[]>([
    { to: '', amount: '' },
  ])

  const walletLc = wallet?.toLowerCase() ?? ''
  const isApprover      = roles.approver.toLowerCase() === walletLc
  const isProvider      = roles.serviceProvider.toLowerCase() === walletLc
  const isReleaseSigner = roles.releaseSigner.toLowerCase() === walletLc
  const isResolver      = roles.disputeResolver.toLowerCase() === walletLc

  const { execute: changeStatus,  status: cs } = useTollboothWrite('changeMilestoneStatus', { successMsg: 'Status updated.' })
  const { execute: approve,       status: as } = useTollboothWrite('approveMilestone', { successMsg: 'Milestone approved.' })
  const { execute: release,       status: rs } = useTollboothWrite('releaseMilestoneFunds', { successMsg: 'Milestone released.' })
  const { execute: dispute,       status: ds } = useTollboothWrite('disputeMilestone', { successMsg: 'Milestone disputed.' })
  const { execute: resolveMs,     status: rms } = useTollboothWrite('resolveMilestoneDispute', { successMsg: 'Dispute resolved.' })

  const { platformFee, protocolFee, net } = escrowType === EscrowType.MultiRelease
    ? splitFees(milestone.amount, escrow.platformFeeBps, escrow.snapshotFeeBps)
    : { platformFee: 0n, protocolFee: 0n, net: 0n }

  function submitChangeStatus() {
    const hash = evidence ? hashContent(evidence) : `0x${'0'.repeat(64)}`
    void changeStatus([escrowId, BigInt(idx), selectedStatus, hash])
  }

  function submitResolve() {
    const parsed: Distribution[] = distributions
      .filter(d => d.to && d.amount)
      .map(d => ({ to: d.to as `0x${string}`, amount: parseUsdcInput(d.amount) }))
    void resolveMs([escrowId, BigInt(idx), parsed])
    setResolveOpen(false)
  }

  return (
    <div className="border border-border rounded-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface2 transition-colors duration-100 text-left"
      >
        <span className="font-mono text-xs text-muted tabular w-6 shrink-0">M{idx + 1}</span>
        {escrowType === EscrowType.MultiRelease && (
          <span className="font-mono tabular text-sm text-fg">{fmtUsdc(milestone.amount)}</span>
        )}
        <div className="flex-1 flex gap-1.5 flex-wrap">
          <MilestoneStatusPill milestone={milestone} />
        </div>
        {escrowType === EscrowType.MultiRelease && (
          <span className="text-xs text-muted font-mono hidden sm:block">{shortAddr(milestone.receiver)}</span>
        )}
        {expanded ? <ChevronUp size={13} className="text-muted shrink-0" /> : <ChevronDown size={13} className="text-muted shrink-0" />}
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 bg-surface">
          {/* Flags */}
          <div className="flex gap-3 flex-wrap text-xs text-muted">
            {milestone.approved && <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> Approved</span>}
            {milestone.released && <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> Released</span>}
            {milestone.disputed && <span className="text-warning flex items-center gap-1"><AlertTriangle size={12} /> Disputed</span>}
            {milestone.resolved && <span className="text-violet-400 flex items-center gap-1"><CheckCircle2 size={12} /> Resolved</span>}
          </div>

          {/* Evidence hash */}
          {milestone.evidenceHash !== `0x${'0'.repeat(64)}` && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Evidence:</span>
              <span className="font-mono text-xs text-muted tabular">{shortAddr(milestone.evidenceHash)}</span>
              <CopyButton text={milestone.evidenceHash} size={12} />
            </div>
          )}

          {/* Fee preview (MultiRelease) */}
          {escrowType === EscrowType.MultiRelease && !milestone.released && !milestone.resolved && (
            <div className="bg-surface2 rounded-lg px-3 py-2 space-y-1 text-xs">
              <div className="flex justify-between text-muted">
                <span>Platform fee</span>
                <span className="font-mono tabular">{fmtUsdc(platformFee)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Protocol fee</span>
                <span className="font-mono tabular">{fmtUsdc(protocolFee)}</span>
              </div>
              <div className="flex justify-between text-fg font-medium border-t border-border pt-1 mt-1">
                <span>Net to receiver</span>
                <span className="font-mono tabular">{fmtUsdc(net)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {/* Service provider: update status */}
            {isProvider && !milestone.released && !milestone.resolved && !milestone.disputed && (
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(Number(e.target.value))}
                    className="h-9 px-2 rounded-lg bg-surface2 border border-border text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value={MilestoneStatus.InProgress}>In Progress</option>
                    <option value={MilestoneStatus.Completed}>Completed</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-32">
                  <label className="text-xs text-muted">Evidence (optional)</label>
                  <input
                    type="text"
                    placeholder="Delivery note, URL, etc."
                    value={evidence}
                    onChange={e => setEvidence(e.target.value)}
                    className="h-9 px-3 rounded-lg bg-surface2 border border-border text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <Button size="sm" variant="secondary" loading={cs === 'signing' || cs === 'confirming'} onClick={submitChangeStatus}>
                  Update Status
                </Button>
              </div>
            )}

            {/* Approver: approve */}
            {isApprover && !milestone.approved && !milestone.released && !milestone.resolved && (
              <Button
                size="sm"
                variant="secondary"
                loading={as === 'signing' || as === 'confirming'}
                onClick={() => void approve([escrowId, BigInt(idx), `0x${'0'.repeat(64)}`])}
              >
                Approve
              </Button>
            )}

            {/* ReleaseSigner: release (MultiRelease) */}
            {isReleaseSigner && escrowType === EscrowType.MultiRelease
              && milestone.approved && !milestone.released && !milestone.disputed && !escrow.disputed && (
              <Button
                size="sm"
                loading={rs === 'signing' || rs === 'confirming'}
                onClick={() => void release([escrowId, BigInt(idx)])}
              >
                Release
              </Button>
            )}

            {/* Dispute */}
            {(isApprover || isProvider || isReleaseSigner)
              && !milestone.released && !milestone.resolved && !milestone.disputed
              && roles.disputeResolver !== '0x0000000000000000000000000000000000000000' && (
              <Button
                size="sm"
                variant="danger"
                loading={ds === 'signing' || ds === 'confirming'}
                onClick={() => void dispute([escrowId, BigInt(idx)])}
              >
                Dispute
              </Button>
            )}

            {/* Resolve dispute */}
            {isResolver && milestone.disputed && (
              <Button size="sm" variant="outline" onClick={() => setResolveOpen(true)}>
                Resolve Dispute
              </Button>
            )}
          </div>

          {/* Resolve modal */}
          {resolveOpen && (
            <div className="border border-border rounded-lg p-4 bg-surface2 space-y-3">
              <h4 className="text-sm font-medium text-fg">Resolve Milestone Dispute</h4>
              <p className="text-xs text-muted">
                Net available: <span className="font-mono text-fg">{fmtUsdc(net)}</span> (after fees).
                Distributions must sum exactly to this.
              </p>
              <div className="space-y-2">
                {distributions.map((d, i) => (
                  <DistributionRow
                    key={i}
                    to={d.to}
                    amount={d.amount}
                    onRemove={() => setDistributions(ds => ds.filter((_, j) => j !== i))}
                    onChange={(to, amount) => setDistributions(ds => ds.map((x, j) => j === i ? { to, amount } : x))}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setDistributions(d => [...d, { to: '', amount: '' }])}>
                  Add Row
                </Button>
                <Button size="sm" loading={rms === 'signing' || rms === 'confirming'} onClick={submitResolve}>
                  Submit Resolution
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setResolveOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Funding panel ─────────────────────────────────────────────────────────────
function FundingPanel({ escrowId, escrow, wallet }: {
  escrowId: bigint
  escrow: { amount: bigint; balance: bigint; roles: { approver: string; serviceProvider: string; releaseSigner: string; platformAddress: string } }
  wallet?: string
}) {
  const [amount, setAmount] = useState('')
  const { fundedTotal } = useFundedTotal(escrowId)
  const myDeposit = useDepositOf(escrowId, wallet as `0x${string}` | undefined)
  const { approve: approveUsdc, isPending: isApproving } = useUsdcApprove()
  const { execute: fund, status: fundStatus } = useTollboothWrite('fundEscrow', { successMsg: 'Escrow funded.' })
  const chainId = useReadChainId()
  const tollboothAddr = getTollboothAddress(chainId)

  const { allowance: currentAllowance, refetch: refetchAllow } = useUsdcAllowance(tollboothAddr)
  const amtRaw = parseUsdcInput(amount)
  const funded = fundedPct(fundedTotal, escrow.amount)

  const walletLc = wallet?.toLowerCase() ?? ''
  const roles = escrow.roles
  const isEligible =
    roles.approver.toLowerCase()       === walletLc ||
    roles.serviceProvider.toLowerCase() === walletLc ||
    roles.releaseSigner.toLowerCase()  === walletLc ||
    (roles.platformAddress !== '0x0000000000000000000000000000000000000000' &&
     roles.platformAddress.toLowerCase() === walletLc)

  async function handleFund() {
    if (amtRaw === 0n) return
    if (currentAllowance < amtRaw) {
      try {
        await approveUsdc(tollboothAddr, amtRaw)
        await refetchAllow()
      } catch {
        toast.error('Approval failed.')
        return
      }
    }
    void fund([escrowId, amtRaw])
  }

  return (
    <Card>
      <SectionHeader title="Funding" />
      {/* Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Funded</span>
          <span className="font-mono tabular text-fg">{fmtUsdc(fundedTotal)} / {fmtUsdc(escrow.amount)}</span>
        </div>
        <div className="h-2 bg-surface2 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${funded}%` }} />
        </div>
        <div className="text-xs text-muted">{funded}% funded</div>
      </div>

      {myDeposit > 0n && (
        <div className="text-xs text-muted mb-3">
          Your deposit: <span className="font-mono tabular text-fg">{fmtUsdc(myDeposit)}</span>
        </div>
      )}

      {isEligible && !escrow.balance && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted block mb-1">Amount (USDC)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-surface2 border border-border text-sm text-fg tabular focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button
            size="sm"
            loading={isApproving || fundStatus === 'signing' || fundStatus === 'confirming'}
            onClick={() => { void handleFund() }}
            disabled={amtRaw === 0n}
          >
            {currentAllowance < amtRaw ? 'Approve & Fund' : 'Fund'}
          </Button>
        </div>
      )}
    </Card>
  )
}

// ── Main detail page ──────────────────────────────────────────────────────────
export function EscrowDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { address: wallet } = useAccount()
  const chainId = useReadChainId()
  const escrowId = id ? BigInt(id) : undefined
  const deployed = isTollboothDeployed(chainId)
  const explorerBase = getExplorerBase(chainId)
  const tollboothAddr = getTollboothAddress(chainId)

  const { escrow, isLoading } = useEscrow(escrowId)
  const { milestones } = useMilestones(escrowId)

  const [resolveOpen, setResolveOpen] = useState(false)
  const [distributions, setDistributions] = useState<{ to: string; amount: string }[]>([{ to: '', amount: '' }])

  const { execute: releaseFunds,     status: rfs } = useTollboothWrite('releaseFunds', { successMsg: 'Funds released.' })
  const { execute: disputeEscrow,    status: des } = useTollboothWrite('disputeEscrow', { successMsg: 'Escrow disputed.' })
  const { execute: resolveDispute,   status: res } = useTollboothWrite('resolveDispute', { successMsg: 'Dispute resolved.' })
  const { execute: refundDeadline,   status: rds } = useTollboothWrite('refundAfterDeadline', { successMsg: 'Refund issued.' })
  const { execute: withdrawRemain,   status: wrs } = useTollboothWrite('withdrawRemainingFunds', { successMsg: 'Remaining funds withdrawn.' })

  if (!deployed) {
    return <div className="py-24 text-center text-muted">Tollbooth is not deployed on this network.</div>
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    )
  }

  if (!escrow || !escrowId) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted">Escrow not found.</p>
        <Link to="/escrows" className="text-accent text-sm mt-2 inline-block hover:underline">
          Back to Escrows
        </Link>
      </div>
    )
  }

  const status = deriveEscrowStatus(escrow)
  const roles  = escrow.roles
  const walletLc = wallet?.toLowerCase() ?? ''
  const isApprover      = roles.approver.toLowerCase() === walletLc
  const isProvider      = roles.serviceProvider.toLowerCase() === walletLc
  const isReleaseSigner = roles.releaseSigner.toLowerCase() === walletLc
  const isResolver      = roles.disputeResolver.toLowerCase() === walletLc
  const canDispute = (isApprover || isProvider || isReleaseSigner)
    && !escrow.disputed && !escrow.released && !escrow.resolved
    && roles.disputeResolver !== '0x0000000000000000000000000000000000000000'
  const allApproved = milestones.length > 0 && milestones.every(m => m.approved)
  const canReleaseSingle = isReleaseSigner && escrow.escrowType === EscrowType.SingleRelease
    && allApproved && !escrow.released && !escrow.disputed
  const canRefund = (isOverdue(escrow.deadline) && !escrow.released && !escrow.resolved) && !escrow.disputed && escrow.balance > 0n
  const canWithdrawRemaining = (isResolver || isReleaseSigner || isApprover) && escrow.released && escrow.balance > 0n

  const { platformFee, protocolFee, net } = splitFees(escrow.amount, escrow.platformFeeBps, escrow.snapshotFeeBps)

  function submitResolve() {
    const parsed: Distribution[] = distributions
      .filter(d => d.to && d.amount)
      .map(d => ({ to: d.to as `0x${string}`, amount: parseUsdcInput(d.amount) }))
    void resolveDispute([escrowId!, parsed])
    setResolveOpen(false)
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Back */}
      <Link to="/escrows" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors">
        <ArrowLeft size={14} />
        All Escrows
      </Link>

      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-fg font-mono tabular">Escrow #{String(escrowId)}</h1>
              <EscrowStatusPill status={status} />
              <Pill
                label={escrow.escrowType === EscrowType.SingleRelease ? 'Single Release' : 'Multi Release'}
                variant="slate"
              />
            </div>
            {escrow.engagementId !== `0x${'0'.repeat(64)}` && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-muted">Engagement:</span>
                <span className="font-mono text-xs text-muted tabular">{shortAddr(escrow.engagementId)}</span>
                <CopyButton text={escrow.engagementId} size={11} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${explorerBase}/address/${tollboothAddr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted hover:text-fg transition-colors"
            >
              Explorer <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-borderSubtle">
          <div>
            <div className="text-xs text-muted">Total Amount</div>
            <div className="font-mono tabular text-lg font-semibold text-fg">{fmtUsdc(escrow.amount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Balance</div>
            <div className="font-mono tabular text-lg font-semibold text-fg">{fmtUsdc(escrow.balance)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Deadline</div>
            <div className={cx('text-sm font-medium', escrow.deadline > 0n && (isOverdue(escrow.deadline) && !escrow.released && !escrow.resolved) ? 'text-danger' : 'text-fg')}>
              {fmtDeadline(escrow.deadline)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Platform Fee</div>
            <div className="text-sm text-fg">{(Number(escrow.platformFeeBps) / 100).toFixed(2)}%</div>
          </div>
        </div>

        {/* Dispute banner */}
        {escrow.disputed && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-900/20 border border-amber-700/40 text-amber-400 text-sm">
            <AlertTriangle size={16} />
            <span>This escrow is disputed. Waiting for dispute resolver.</span>
            {isResolver && (
              <Button size="sm" variant="outline" className="ml-auto text-amber-400 border-amber-600" onClick={() => setResolveOpen(true)}>
                Resolve
              </Button>
            )}
          </div>
        )}

        {/* Resolve modal */}
        {resolveOpen && (
          <div className="mt-4 border border-border rounded-lg p-4 bg-surface2 space-y-3">
            <h4 className="text-sm font-medium text-fg">Resolve Dispute</h4>
            <p className="text-xs text-muted">
              Net available after fees: <span className="font-mono text-fg">{fmtUsdc(net)}</span>.
              Distributions must sum exactly to this amount.
            </p>
            <div className="space-y-2">
              {distributions.map((d, i) => (
                <DistributionRow
                  key={i}
                  to={d.to}
                  amount={d.amount}
                  onRemove={() => setDistributions(ds => ds.filter((_, j) => j !== i))}
                  onChange={(to, amount) => setDistributions(ds => ds.map((x, j) => j === i ? { to, amount } : x))}
                />
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="secondary" onClick={() => setDistributions(d => [...d, { to: '', amount: '' }])}>
                Add Row
              </Button>
              <Button size="sm" loading={res === 'signing' || res === 'confirming'} onClick={submitResolve}>
                Submit Resolution
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResolveOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Primary actions */}
        <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-borderSubtle">
          {canReleaseSingle && (
            <Button loading={rfs === 'signing' || rfs === 'confirming'} onClick={() => void releaseFunds([escrowId])}>
              Release Funds
            </Button>
          )}
          {canDispute && (
            <Button variant="danger" loading={des === 'signing' || des === 'confirming'} onClick={() => void disputeEscrow([escrowId])}>
              Dispute Escrow
            </Button>
          )}
          {canRefund && (
            <Button variant="secondary" loading={rds === 'signing' || rds === 'confirming'} onClick={() => void refundDeadline([escrowId])}>
              Refund (Deadline)
            </Button>
          )}
          {canWithdrawRemaining && (
            <Button variant="secondary" loading={wrs === 'signing' || wrs === 'confirming'}
              onClick={() => void withdrawRemain([escrowId, []])}>
              Withdraw Remaining
            </Button>
          )}
        </div>
      </Card>

      {/* Roles */}
      <Card>
        <SectionHeader title="Roles" />
        <div>
          {(Object.entries(ROLE_LABELS)).map(([key, label]) => (
            <AddressRow
              key={key}
              label={label}
              addr={(roles as unknown as Record<string, string>)[key] ?? ''}
              wallet={wallet}
            />
          ))}
        </div>
      </Card>

      {/* Fee breakdown */}
      <Card>
        <SectionHeader title="Fee Breakdown" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted">
            <span>Platform fee ({(Number(escrow.platformFeeBps) / 100).toFixed(2)}%)</span>
            <span className="font-mono tabular">{fmtUsdc(platformFee)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Protocol fee ({(escrow.snapshotFeeBps / 100).toFixed(2)}%)</span>
            <span className="font-mono tabular">{fmtUsdc(protocolFee)}</span>
          </div>
          <div className="flex justify-between text-fg font-semibold border-t border-border pt-2 mt-2">
            <span>Net to receiver(s)</span>
            <span className="font-mono tabular">{fmtUsdc(net)}</span>
          </div>
        </div>
      </Card>

      {/* Funding */}
      <FundingPanel escrowId={escrowId} escrow={escrow} wallet={wallet} />

      {/* Milestones */}
      <div>
        <SectionHeader title={`Milestones (${milestones.length})`} />
        <div className="space-y-2">
          {milestones.map((m, i) => (
            <MilestoneCard
              key={i}
              milestone={m}
              idx={i}
              escrowId={escrowId}
              escrowType={escrow.escrowType}
              roles={{
                approver:        roles.approver,
                serviceProvider: roles.serviceProvider,
                releaseSigner:   roles.releaseSigner,
                disputeResolver: roles.disputeResolver,
              }}
              escrow={{
                disputed:        escrow.disputed,
                released:        escrow.released,
                balance:         escrow.balance,
                amount:          escrow.amount,
                platformFeeBps:  escrow.platformFeeBps,
                snapshotFeeBps:  escrow.snapshotFeeBps,
              }}
              wallet={wallet}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

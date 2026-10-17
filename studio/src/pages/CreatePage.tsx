import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { Plus, Trash2, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTollboothWrite, useUsdcBalance } from '@/hooks/useTollbooth'
import { hashEngagementId, parseUsdcInput, fmtUsdc, splitFees, cx } from '@/lib/utils'
import { EscrowType } from '@/lib/types'
import { isTollboothDeployed } from '@/config'

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ['Type & Parties', 'Milestones & Fees', 'Review & Submit']
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={cx(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-200',
              i < step ? 'bg-accent text-bg' : i === step ? 'bg-accent/20 text-accent border-2 border-accent' : 'bg-surface2 text-muted border border-border',
            )}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={cx('text-[10px] mt-1 font-medium hidden sm:block', i === step ? 'text-accent' : 'text-muted')}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cx('w-12 sm:w-24 h-px mx-2 mb-4 sm:mb-0 transition-colors', i < step ? 'bg-accent' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Address input ─────────────────────────────────────────────────────────────
function AddressInput({
  label, value, onChange, required, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  required?: boolean; placeholder?: string; hint?: string
}) {
  const isValid = !value || /^0x[0-9a-fA-F]{40}$/.test(value)
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted font-medium">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        type="text"
        placeholder={placeholder ?? '0x…'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cx(
          'h-10 px-3 rounded-lg bg-surface2 border text-sm text-fg font-mono focus:outline-none focus:ring-2 focus:ring-accent',
          !isValid ? 'border-danger' : 'border-border',
        )}
      />
      {!isValid && <span className="text-xs text-danger">Invalid address</span>}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  )
}

interface MilestoneRow {
  description: string
  amount: string
  receiver: string
}

interface FormState {
  escrowType:      EscrowType
  approver:        string
  serviceProvider: string
  releaseSigner:   string
  disputeResolver: string
  platformAddress: string
  receiver:        string
  milestones:      MilestoneRow[]
  platformFeeBps:  string
  deadline:        string
  engagementId:    string
}

function defaultForm(wallet: string): FormState {
  return {
    escrowType:      EscrowType.SingleRelease,
    approver:        wallet,
    serviceProvider: '',
    releaseSigner:   wallet,
    disputeResolver: '',
    platformAddress: '',
    receiver:        '',
    milestones:      [{ description: 'Milestone 1', amount: '', receiver: '' }],
    platformFeeBps:  '0',
    deadline:        '',
    engagementId:    '',
  }
}

export function CreatePage() {
  const { address: wallet, chainId, isConnected } = useAccount()
  const navigate = useNavigate()
  const deployed = isTollboothDeployed(chainId)

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(() => defaultForm(wallet ?? ''))
  const { balance: usdcBal } = useUsdcBalance()

  const { execute: createEscrow, status: createStatus } = useTollboothWrite('createEscrow', {
    successMsg: 'Escrow created.',
    onSuccess: (_hash) => { void navigate('/escrows') },
  })

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function updateMilestone(i: number, key: keyof MilestoneRow, val: string) {
    setForm(f => {
      const ms = [...f.milestones]
      ms[i] = { ...ms[i], [key]: val }
      return { ...f, milestones: ms }
    })
  }

  function addMilestone() {
    if (form.milestones.length >= 10) return
    setForm(f => ({
      ...f,
      milestones: [...f.milestones, { description: `Milestone ${f.milestones.length + 1}`, amount: '', receiver: form.serviceProvider }],
    }))
  }

  function removeMilestone(i: number) {
    setForm(f => ({ ...f, milestones: f.milestones.filter((_, j) => j !== i) }))
  }

  const totalAmount = form.escrowType === EscrowType.MultiRelease
    ? form.milestones.reduce((s, m) => s + parseUsdcInput(m.amount), 0n)
    : parseUsdcInput(form.milestones[0]?.amount ?? '')

  const platformFeeBps = BigInt(Math.round(parseFloat(form.platformFeeBps || '0') * 100))
  const { platformFee, protocolFee, net } = splitFees(totalAmount, platformFeeBps, 50) // 50 = 0.5%

  const deadlineTs: bigint = form.deadline
    ? BigInt(Math.floor(new Date(form.deadline).getTime() / 1000))
    : 0n

  function buildArgs() {
    const milestoneInputs = form.escrowType === EscrowType.SingleRelease
      ? form.milestones.map(() => ({ amount: 0n, receiver: `0x${'0'.repeat(40)}` }))
      : form.milestones.map(m => ({ amount: parseUsdcInput(m.amount), receiver: m.receiver as `0x${string}` }))

    return [
      form.escrowType,
      {
        approver:        form.approver        as `0x${string}`,
        serviceProvider: form.serviceProvider  as `0x${string}`,
        releaseSigner:   form.releaseSigner    as `0x${string}`,
        disputeResolver: (form.disputeResolver || `0x${'0'.repeat(40)}`) as `0x${string}`,
        platformAddress: (form.platformAddress || `0x${'0'.repeat(40)}`) as `0x${string}`,
        receiver:        (form.receiver        || `0x${'0'.repeat(40)}`) as `0x${string}`,
      },
      totalAmount,
      platformFeeBps,
      deadlineTs,
      hashEngagementId(form.engagementId),
      milestoneInputs,
    ] as const
  }

  function handleSubmit() {
    void createEscrow(buildArgs())
  }

  function validateStep0(): string | null {
    if (!form.approver || !/^0x[0-9a-fA-F]{40}$/.test(form.approver))       return 'Valid approver address required.'
    if (!form.serviceProvider || !/^0x[0-9a-fA-F]{40}$/.test(form.serviceProvider)) return 'Valid service provider required.'
    if (!form.releaseSigner || !/^0x[0-9a-fA-F]{40}$/.test(form.releaseSigner)) return 'Valid release signer required.'
    if (form.escrowType === EscrowType.SingleRelease) {
      if (!form.receiver || !/^0x[0-9a-fA-F]{40}$/.test(form.receiver)) return 'Valid receiver required for Single Release.'
    }
    return null
  }

  function validateStep1(): string | null {
    if (form.escrowType === EscrowType.SingleRelease) {
      if (!form.milestones[0]?.amount) return 'Enter the total amount.'
    } else {
      for (const m of form.milestones) {
        if (!m.amount) return 'All milestones need an amount.'
        if (!m.receiver || !/^0x[0-9a-fA-F]{40}$/.test(m.receiver)) return 'All milestones need a valid receiver.'
      }
    }
    return null
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <p className="text-muted">Connect your wallet to create an escrow.</p>
        <ConnectKitButton />
      </div>
    )
  }

  if (!deployed) {
    return <div className="py-24 text-center text-muted">Tollbooth is not deployed on this network.</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-fg tracking-tight">Create Escrow</h1>
        <p className="text-muted text-sm mt-1">Set up a new USDC escrow between parties.</p>
      </div>

      <StepBar step={step} />

      {/* ── Step 0: Type & Parties ── */}
      {step === 0 && (
        <Card>
          <h2 className="text-base font-semibold text-fg mb-4">Type &amp; Parties</h2>

          {/* Escrow type */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[EscrowType.SingleRelease, EscrowType.MultiRelease].map(t => (
              <button
                key={t}
                onClick={() => update('escrowType', t)}
                className={cx(
                  'flex flex-col gap-1 p-4 rounded-lg border text-left transition-colors duration-150',
                  form.escrowType === t ? 'border-accent bg-accent/5' : 'border-border bg-surface2 hover:border-muted',
                )}
              >
                <span className="text-sm font-medium text-fg">
                  {t === EscrowType.SingleRelease ? 'Single Release' : 'Multi Release'}
                </span>
                <span className="text-xs text-muted">
                  {t === EscrowType.SingleRelease
                    ? 'One lump-sum payment to a single receiver after all milestones are approved.'
                    : 'Separate payments per milestone, each with its own receiver.'}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <AddressInput label="Approver" value={form.approver} onChange={v => update('approver', v)} required hint="Reviews and approves milestones." />
            <AddressInput label="Service Provider" value={form.serviceProvider} onChange={v => update('serviceProvider', v)} required hint="Submits work and updates milestone status." />
            <AddressInput label="Release Signer" value={form.releaseSigner} onChange={v => update('releaseSigner', v)} required hint="Signs off on final payment release." />
            {form.escrowType === EscrowType.SingleRelease && (
              <AddressInput label="Receiver" value={form.receiver} onChange={v => update('receiver', v)} required hint="Receives the net payment on release." />
            )}
            <AddressInput label="Dispute Resolver" value={form.disputeResolver} onChange={v => update('disputeResolver', v)} hint="Optional. Resolves disputes if raised." />
            <AddressInput label="Platform Address" value={form.platformAddress} onChange={v => update('platformAddress', v)} hint="Optional. Receives the platform fee." />
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => {
                const err = validateStep0()
                if (err) { toast.error(err); return }
                setStep(1)
              }}
              icon={<ChevronRight size={14} />}
            >
              Next
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 1: Milestones & Fees ── */}
      {step === 1 && (
        <Card>
          <h2 className="text-base font-semibold text-fg mb-4">Milestones &amp; Fees</h2>

          {/* Single release: just amount + milestone descriptions */}
          {form.escrowType === EscrowType.SingleRelease && (
            <div className="space-y-4 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted font-medium">Total Amount (USDC) <span className="text-danger">*</span></label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.milestones[0]?.amount ?? ''}
                  onChange={e => updateMilestone(0, 'amount', e.target.value)}
                  className="h-10 px-3 rounded-lg bg-surface2 border border-border text-sm text-fg tabular focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <p className="text-xs text-muted">
                Add milestone descriptions (hashed off-chain) to define deliverables. Amounts are ignored for Single Release.
              </p>
              {form.milestones.map((m, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder={`Milestone ${i + 1} description`}
                    value={m.description}
                    onChange={e => updateMilestone(i, 'description', e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg bg-surface2 border border-border text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  {form.milestones.length > 1 && (
                    <button onClick={() => removeMilestone(i)} className="text-muted hover:text-danger p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Multi release: amount + receiver per milestone */}
          {form.escrowType === EscrowType.MultiRelease && (
            <div className="space-y-3 mb-6">
              {form.milestones.map((m, i) => (
                <div key={i} className="border border-borderSubtle rounded-lg p-3 space-y-2 bg-surface2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">Milestone {i + 1}</span>
                    {form.milestones.length > 1 && (
                      <button onClick={() => removeMilestone(i)} className="text-muted hover:text-danger p-0.5">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Description (off-chain)"
                    value={m.description}
                    onChange={e => updateMilestone(i, 'description', e.target.value)}
                    className="w-full h-9 px-3 rounded bg-surface border border-border text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount USDC"
                      value={m.amount}
                      onChange={e => updateMilestone(i, 'amount', e.target.value)}
                      className="w-32 h-9 px-3 rounded bg-surface border border-border text-sm text-fg tabular focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <input
                      type="text"
                      placeholder="Receiver 0x…"
                      value={m.receiver || form.serviceProvider}
                      onChange={e => updateMilestone(i, 'receiver', e.target.value)}
                      className="flex-1 h-9 px-3 rounded bg-surface border border-border text-sm text-fg font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
              ))}
              {form.milestones.length < 10 && (
                <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addMilestone}>
                  Add Milestone
                </Button>
              )}
            </div>
          )}

          {/* Fees & deadline */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted font-medium">Platform Fee %</label>
              <input
                type="number"
                placeholder="0.00"
                min="0"
                max="50"
                step="0.01"
                value={form.platformFeeBps}
                onChange={e => update('platformFeeBps', e.target.value)}
                className="w-32 h-9 px-3 rounded-lg bg-surface2 border border-border text-sm text-fg tabular focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted font-medium">Deadline (optional)</label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={e => update('deadline', e.target.value)}
                className="h-9 px-3 rounded-lg bg-surface2 border border-border text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted font-medium">Engagement ID (optional)</label>
              <input
                type="text"
                placeholder="Free-form reference, e.g. job-42"
                value={form.engagementId}
                onChange={e => update('engagementId', e.target.value)}
                className="h-10 px-3 rounded-lg bg-surface2 border border-border text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="text-xs text-muted">Hashed on-chain via keccak256.</span>
            </div>
          </div>

          {/* Live fee preview */}
          {totalAmount > 0n && (
            <div className="mt-4 bg-surface2 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-muted">
                <span>Gross amount</span>
                <span className="font-mono tabular">{fmtUsdc(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Platform fee ({form.platformFeeBps}%)</span>
                <span className="font-mono tabular">− {fmtUsdc(platformFee)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Protocol fee (0.50%)</span>
                <span className="font-mono tabular">− {fmtUsdc(protocolFee)}</span>
              </div>
              <div className="flex justify-between text-fg font-semibold border-t border-border pt-2 mt-2">
                <span>Net to receiver(s)</span>
                <span className="font-mono tabular">{fmtUsdc(net)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="secondary" icon={<ChevronLeft size={14} />} onClick={() => setStep(0)}>Back</Button>
            <Button
              onClick={() => {
                const err = validateStep1()
                if (err) { toast.error(err); return }
                setStep(2)
              }}
              icon={<ChevronRight size={14} />}
            >
              Review
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Review & Submit ── */}
      {step === 2 && (
        <Card>
          <h2 className="text-base font-semibold text-fg mb-4">Review &amp; Submit</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-borderSubtle">
              <span className="text-muted">Type</span>
              <span className="text-fg">{form.escrowType === EscrowType.SingleRelease ? 'Single Release' : 'Multi Release'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-borderSubtle">
              <span className="text-muted">Total Amount</span>
              <span className="font-mono tabular text-fg">{fmtUsdc(totalAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-borderSubtle">
              <span className="text-muted">Net to receiver(s)</span>
              <span className="font-mono tabular text-accent">{fmtUsdc(net)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-borderSubtle">
              <span className="text-muted">Milestones</span>
              <span className="text-fg">{form.milestones.length}</span>
            </div>
            {form.deadline && (
              <div className="flex justify-between py-2 border-b border-borderSubtle">
                <span className="text-muted">Deadline</span>
                <span className="text-fg">{new Date(form.deadline).toLocaleDateString()}</span>
              </div>
            )}
            {form.engagementId && (
              <div className="flex justify-between py-2 border-b border-borderSubtle">
                <span className="text-muted">Engagement ID</span>
                <span className="font-mono text-xs text-muted tabular">{hashEngagementId(form.engagementId).slice(0, 14)}…</span>
              </div>
            )}
          </div>

          {usdcBal < totalAmount && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/40 text-amber-400 text-xs">
              <AlertCircle size={13} />
              Your USDC balance ({fmtUsdc(usdcBal)}) is lower than the escrow amount. You can still create the escrow and fund it later.
            </div>
          )}

          {/* Submit status */}
          {createStatus !== 'idle' && (
            <div className="mt-4 text-sm text-muted">
              {createStatus === 'signing'    && 'Waiting for wallet signature…'}
              {createStatus === 'confirming' && 'Confirming transaction…'}
              {createStatus === 'success'    && 'Escrow created! Redirecting…'}
              {createStatus === 'error'      && 'Transaction failed. Please try again.'}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="secondary" icon={<ChevronLeft size={14} />} onClick={() => setStep(1)}>Back</Button>
            <Button
              loading={createStatus === 'signing' || createStatus === 'confirming'}
              onClick={() => { void handleSubmit() }}
            >
              Create Escrow
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

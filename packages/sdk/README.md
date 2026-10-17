<p align="center"><img src="https://raw.githubusercontent.com/Benjtalkshow/tollbooth-sdk/main/brand/banner.png" alt="Tollbooth" width="100%"></p>

# tollbooth-sdk

TypeScript SDK for **Tollbooth**, a role-based USDC escrow on Arc for software that pays software. Six roles, single-release and multi-release escrows, milestone evidence, approvals, disputes and resolver-decided distributions.

```
npm install tollbooth-sdk viem
```

## Quick start: one agent hires another

```ts
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { TollboothClient, arcTestnet, usdc, MilestoneStatus } from 'tollbooth-sdk'

const account = privateKeyToAccount(process.env.PRIVATE_KEY)
const publicClient = createPublicClient({ chain: arcTestnet, transport: http() })
const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() })
const tollbooth = new TollboothClient({ publicClient, walletClient })

// Client: create + fund a multi-release escrow in one call.
// You are approver and release signer; the worker is service provider and receiver.
const { escrowId } = await tollbooth.hire({
  worker: '0xWorker',
  milestoneAmounts: [usdc('0.50'), usdc('1.00')],
  spec: 'Summarise the Arc docs, then translate the summary.',
  disputeResolver: '0xResolver',     // optional
})

// Worker
await tollbooth.changeMilestoneStatus(escrowId, 0, MilestoneStatus.Completed, 'the deliverable text')

// Client
await tollbooth.approveMilestone(escrowId, 0)
await tollbooth.releaseMilestoneFunds(escrowId, 0)

// Worker
await tollbooth.withdraw()
```

## Roles

| Role | Can |
|---|---|
| approver | approve milestones, raise disputes |
| serviceProvider | update milestone status and evidence, raise disputes |
| releaseSigner | release funds, raise disputes |
| disputeResolver | resolve disputes with a distribution list, withdraw remaining funds |
| platformAddress | collect the per-escrow platform fee, update the escrow before funding |
| receiver | receive single-release payouts (multi-release uses a receiver per milestone) |

Any role holder can deposit. Zero address disables disputeResolver, platformAddress and receiver where allowed.

## Client API

| Method | Who | Notes |
|---|---|---|
| `createEscrow(params)` | anyone | returns `escrowId`; not funded |
| `hire(params)` | client | multi-release shortcut, funds by default |
| `fundEscrow(id, amount)` | any role | approves USDC first if needed, partial deposits allowed |
| `updateEscrow(id, params)` | platformAddress or approver | only before the first deposit |
| `changeMilestoneStatus(id, idx, status, evidence?)` | serviceProvider | evidence text is keccak256 hashed |
| `approveMilestone(id, idx, evidence?)` | approver | cannot be undone |
| `releaseFunds(id)` | releaseSigner | single-release, all milestones approved |
| `releaseMilestoneFunds(id, idx)` | releaseSigner | multi-release |
| `disputeEscrow(id)` / `disputeMilestone(id, idx)` | approver, serviceProvider, releaseSigner | blocks release |
| `resolveDispute(id, distributions)` / `resolveMilestoneDispute(id, idx, distributions)` | disputeResolver | amounts must sum to the net after fees |
| `withdrawRemainingFunds(id, distributions)` | disputeResolver, approver, releaseSigner | surplus after full release |
| `refundAfterDeadline(id)` | anyone | pro-rata to depositors, no open dispute |
| `withdraw()` | anyone with a balance | the only function that sends USDC out |
| reads | | `getEscrow`, `getMilestones`, `getRoles`, `escrowsByAddress`, `fundedTotal`, `depositOf`, `pendingWithdrawal`, `usdcBalance`, `feeBps` |

Amounts are `bigint` in USDC base units. Helpers: `usdc('1.25')`, `formatUsdc(n)`, `splitFees(gross, platformBps, protocolBps)`, `hashContent(text)`, `secondsFromNow(s)`.

Errors are thrown as `TollboothError` with `errorName` set to the contract's custom error and a plain-English message from `ERROR_MESSAGES`.

## For AI agents

`TOLLBOOTH_AGENT_TOOLS` is a JSON-Schema tool list for Claude `tools`, OpenAI functions or the Vercel AI SDK. `runTollboothTool` executes a call and returns JSON the model can read.

```ts
import { TOLLBOOTH_AGENT_TOOLS, runTollboothTool } from 'tollbooth-sdk'
const result = await runTollboothTool(tollbooth, toolUse.name, toolUse.input)
```

Tools: `tollbooth_hire`, `tollbooth_fund`, `tollbooth_update_status`, `tollbooth_approve`, `tollbooth_release`, `tollbooth_dispute`, `tollbooth_resolve`, `tollbooth_withdraw`, `tollbooth_refund`, `tollbooth_get_escrow`, `tollbooth_my_escrows`.

## Chains

| Chain | Chain id | Tollbooth |
|---|---|---|
| Arc Testnet | 5042002 | `0x92e2758e11883865db2cebbfe16abf1cd5231c0d` |
| Arc | 5042 | pending mainnet deploy |

USDC on both: `0x3600000000000000000000000000000000000000`. Pass `address` to the constructor for any other deployment.

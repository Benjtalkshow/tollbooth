# Tollbooth v2

> **Tollbooth — escrow for software that pays software.**
> Built with Arc Studio — money-powered apps in minutes.

Tollbooth v2 is a role-based USDC escrow protocol for agent-to-agent and software-to-software payments on Arc. Role-separated escrow for EVM with milestone evidence, disputes, multi-depositor funding, and a pull-payment model.

---

## Deployed Contracts

| Version | Network      | Address                                       | Explorer |
|---------|-------------|-----------------------------------------------|---------|
| v2      | Arc Testnet | `0x92e2758e11883865db2cebbfe16abf1cd5231c0d`  | [ArcScan](https://explorer.testnet.arc.io/address/0x92e2758e11883865db2cebbfe16abf1cd5231c0d) |
| v1 (retired) | Arc Testnet | `0xebe9bf545b0e459ca98bb211180e18bc3584dd20` | [ArcScan](https://explorer.testnet.arc.io/address/0xebe9bf545b0e459ca98bb211180e18bc3584dd20) |

**Constructor args (v2):**
- `_usdc`: `0x3600000000000000000000000000000000000000` (Arc Testnet USDC)
- `_initialOwner`: `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`
- `_feeBps`: `50` (0.5% protocol fee)
- `_feeRecipient`: `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`

**For mainnet:** set `TOLLBOOTH_ADDRESSES[arc.id]` in `src/config.ts` after deploying from your own wallet.

---

## Roles

Every escrow has six role addresses:

| Role | Description |
|------|-------------|
| `approver` | Reviews and approves milestones. Can also raise disputes. Required non-zero. |
| `serviceProvider` | Does the work, submits deliverables, sets milestone status. Can raise disputes. Required non-zero. |
| `releaseSigner` | Authorises payment release (SingleRelease) or per-milestone release (MultiRelease). Can raise disputes. Required non-zero. |
| `disputeResolver` | Resolves disputes with an arbitrary fund split. Zero = disputes disabled. Also authorised to call `withdrawRemainingFunds`. |
| `platformAddress` | Receives the per-escrow platform fee. Zero = no platform fee (platformFeeBps must be 0). |
| `receiver` | SingleRelease only: receives the net payout. Ignored for MultiRelease (each milestone has its own receiver). |

---

## Escrow Types

### SingleRelease
One lump-sum payout to a single `receiver` once ALL milestones are approved and `releaseSigner` calls `releaseFunds`.

Lifecycle:
```
createEscrow → fundEscrow (partial, multi-depositor) → changeMilestoneStatus (serviceProvider)
→ approveMilestone (approver, all milestones) → releaseFunds (releaseSigner) → withdraw (receiver)
```

### MultiRelease
Each milestone has its own `amount` and `receiver`. `releaseSigner` calls `releaseMilestoneFunds(idx)` per milestone. The escrow is marked `released` only when all milestones are released or resolved.

Lifecycle:
```
createEscrow → fundEscrow → for each milestone:
  changeMilestoneStatus → approveMilestone → releaseMilestoneFunds → withdraw
```

---

## Disputes

Any of `approver`, `serviceProvider`, or `releaseSigner` may raise a dispute, provided `disputeResolver != address(0)`.

- **SingleRelease:** `disputeEscrow(id)` blocks `releaseFunds`. Resolver calls `resolveDispute(id, distributions[])` — fees are deducted from the full balance, and distributions (summing to the net) are credited to arbitrary recipients via `pendingWithdrawals`.
- **MultiRelease:** `disputeMilestone(id, idx)` blocks `releaseMilestoneFunds` for that milestone. Resolver calls `resolveMilestoneDispute(id, idx, distributions[])`.

---

## Overfunding and Remaining Funds

Deposits may exceed `escrow.amount` (there is no cap). Once the escrow is fully released, any surplus in `balance` can be distributed by the `disputeResolver` (or `approver`/`releaseSigner`) via `withdrawRemainingFunds(id, distributions[])`.

---

## Deadline Refunds

If `deadline != 0` and `block.timestamp >= deadline`, anyone may call `refundAfterDeadline(id)`. The remaining `balance` is returned to depositors **pro-rata** by their deposit share. Dust rounds to the first depositor. All unreleased milestones are marked resolved to prevent further action.

---

## Fee Model

Two independent fee layers, both deducted at release time:

| Fee | Parameter | Cap | Recipient |
|-----|-----------|-----|-----------|
| Protocol fee | `feeBps` (global, set by owner) | 500 bps (5%) | `feeRecipient` (global) |
| Platform fee | `platformFeeBps` (per-escrow) | 5000 bps (50%) | `roles.platformAddress` |

Both are **snapshotted at `createEscrow` time** into `snapshotFeeBps` / `snapshotFeeRecipient` and `platformFeeBps`. Later owner changes to the global fee do not affect already-created escrows.

Fee math per release:
```
platformFee = gross × platformFeeBps / 10000
protocolFee = gross × snapshotFeeBps / 10000
net         = gross − platformFee − protocolFee
```

Fees are credited to `pendingWithdrawals` (pull pattern). Uncredited fees (zero address recipients) become contract surplus available via `rescueFunds`.

---

## Pull-Payment Model

No funds are pushed to recipients on release. Instead:
1. `releaseFunds` / `releaseMilestoneFunds` / `resolveDispute` credit `pendingWithdrawals[recipient]`.
2. Each recipient calls `withdraw()` to claim their USDC.

This prevents USDC blocklisting of any one recipient from bricking the entire escrow.

---

## Security Properties

- Pull-payment: blocklisted recipients cannot lock other parties' funds.
- Fee snapshot: economic terms locked at creation, not mutable post-fund.
- `Ownable2Step`: two-step ownership transfer prevents accidental key loss.
- `_totalObligations` accounting: `rescueFunds` limited to provable surplus above all user obligations.
- `fundEscrow` role-gated: only named roles (approver, serviceProvider, releaseSigner, platformAddress) can deposit, preventing griefing of `updateEscrow`.
- Max 20 depositors per escrow; max 10 milestones; max 10 distribution entries per resolve.
- Full `ReentrancyGuard` on all state-mutating paths.
- `max` preset security review ran at deploy time (two audit rounds + Slither).

---

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Arc Light design
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity ^0.8.20 + Foundry (OpenZeppelin 5.1.0)
- Chain: Arc Testnet (Chain ID 5042002) / Arc Mainnet (Chain ID 5042)
- Token: USDC (6 decimals, `0x3600000000000000000000000000000000000000` on Arc Testnet)
- Tests: **44 Foundry tests** (43 unit + 1 invariant with 256 × 500 calls) — all passing

---

## Key Files

- `src/config.ts` — wagmi config, chain addresses, RPC overrides via env vars
- `src/hooks/useTollbooth.ts` — chain-aware contract read/write hooks
- `src/components/` — CreateJobForm, JobCard, JobList, ActivityFeed, DevelopersPage, Header
- `contracts/Tollbooth.sol` — v2 contract
- `contracts/test/Tollbooth.t.sol` — 44 Foundry tests
- `.env.example` — RPC override env vars
- `LOCAL_DEVELOPMENT.md` — local anvil fork setup guide

---

## To Run

```bash
bun install
bun run dev
```

```bash
# Contracts
bun run contracts:build   # forge build
bun run contracts:test    # forge test
```

See `LOCAL_DEVELOPMENT.md` for running against a local anvil fork.

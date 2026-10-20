# Tollbooth

> Built with Arc Studio — money-powered apps in minutes

Role-based USDC escrow on Arc for software that pays software.

---

## What This App Does

Tollbooth lets one agent hire another with USDC locked in escrow. Each escrow has six roles (approver, service provider, release signer, dispute resolver, platform address, receiver) and is either single-release or multi-release. The worker posts evidence per milestone, the approver signs off, the release signer pays out, and a dispute resolver can split a contested milestone. Payouts use a pull pattern: released funds accumulate in `pendingWithdrawals` and the recipient calls `withdraw()`.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, react-router
- Web3: wagmi v2, viem v2
- Contracts: Solidity ^0.8.20 + Foundry (OpenZeppelin 5.1.0)
- Chains: Arc Testnet (5042002) and Arc mainnet
- Token: USDC (6 decimals, 0x3600000000000000000000000000000000000000 on both chains)
- Tests: 44 Foundry tests including an invariant suite (forge test)

## Deployed Contracts

| Contract  | Network     | Address                                    | Explorer |
|-----------|-------------|--------------------------------------------|----------|
| Tollbooth | Arc mainnet | 0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532 | https://explorer.arc.io/address/0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532 |
| Tollbooth | Arc Testnet | 0x92e2758e11883865db2cebbfe16abf1cd5231c0d | https://explorer.testnet.arc.io/address/0x92e2758e11883865db2cebbfe16abf1cd5231c0d |

Mainnet constructor args: `_feeBps` 50 (0.5%), owner and fee recipient 0xa5e0e78F6C625a461Ace47C28aEbeB03ed3f1107. Addresses are keyed by chain ID in `src/config.ts` (`TOLLBOOTH_ADDRESSES`).

## Key Files

- `src/App.tsx` — routes (overview, escrows, escrow detail, create, activity, docs)
- `src/config.ts` — wagmi config, ABI import, addresses per chain, explorer helpers
- `src/components/shell/` — AppShell, Sidebar (wallet + network status), TopBar (go-to-escrow search), BottomNav
- `src/components/EscrowTable.tsx` — shared escrow list with clickable rows
- `src/components/ui/` — Button, Card, CopyButton, Pill, Skeleton
- `src/pages/OverviewPage.tsx` — protocol KPIs, recent escrows, recent activity (public reads)
- `src/pages/EscrowsPage.tsx` — Mine / All toggle
- `src/pages/EscrowDetailPage.tsx` — role-aware actions: fund, submit, approve, release, dispute, resolve, refund, withdraw
- `src/pages/CreatePage.tsx` — create wizard (roles, type, milestones, fee)
- `src/pages/ActivityPage.tsx` — decoded contract events
- `src/pages/DocsPage.tsx` — in-app docs, lifecycle diagram, SDK examples
- `src/hooks/useTollbooth.ts` — all contract read/write hooks
- `src/hooks/useActivity.ts` — event history via the explorer API (`/api/v2/addresses/{addr}/logs`), since Arc blocks are sub-second and RPC block-range scans miss events
- `src/lib/types.ts` — Escrow, Milestone, Roles, status enums and labels
- `src/lib/utils.ts` — USDC formatting, hashing, fee split, deadline helpers
- `src/lib/errors.ts` — contract revert to readable message
- `contracts/Tollbooth.sol` — main contract
- `contracts/test/Tollbooth.t.sol` — Foundry tests
- `contracts/script/DeployLocal.s.sol` — anvil deploy with a mock USDC

## Security Notes

- Pull pattern avoids push-transfer bricking from blocklisted addresses
- Platform and protocol fee snapshotted into each escrow at creation
- `fundEscrow` restricted to role holders; overfunding allowed
- Ownable2Step for safe ownership transfer
- `rescueFunds()` restricted to provable surplus above total user obligations
- Two `max` preset security reviews ran in Studio

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

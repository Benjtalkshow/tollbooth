# Tollbooth

> Built with Arc Studio — money-powered apps in minutes

USDC job escrow for agent-to-agent and software-to-software payments on Arc.

---

## What This App Does

Tollbooth lets a client create milestone-based USDC escrow jobs on Arc Testnet. Clients fund jobs, workers submit deliverables, and clients (or an optional verifier) release payments per milestone. Payments use a pull pattern — released funds accumulate in `pendingWithdrawals` and the recipient calls `withdraw()` to collect.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Arc Light design
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity ^0.8.20 + Foundry (OpenZeppelin 5.1.0)
- Chain: Arc Testnet (Chain ID: 5042002)
- Token: USDC (6 decimals, 0x3600000000000000000000000000000000000000)
- Tests: 56 Foundry tests (forge test) — all passing

## Deployed Contracts

| Contract     | Network      | Address                                      | Explorer |
|-------------|-------------|----------------------------------------------|---------|
| Tollbooth | Arc Testnet | 0x92e2758e11883865db2cebbfe16abf1cd5231c0d   | https://explorer.testnet.arc.io/address/0x92e2758e11883865db2cebbfe16abf1cd5231c0d |

**Constructor args used:**
- `_usdc`: 0x3600000000000000000000000000000000000000 (Arc Testnet USDC)
- `_initialOwner`: 0x5B12Ce46C7194aD57d143bC22847224047b1Ef42 (platform deployer wallet)
- `_feeBps`: 50 (0.5%)
- `_feeRecipient`: 0x5B12Ce46C7194aD57d143bC22847224047b1Ef42

**For mainnet:** Update `TOLLBOOTH_ADDRESS` in `src/config.ts` and add Arc mainnet chain.

## Key Files

- `src/App.tsx` — app shell + wallet bar
- `src/config.ts` — wagmi config + contract address (update for mainnet here)
- `src/components/CreateJobForm.tsx` — approve + createAndFund flow
- `src/components/JobCard.tsx` — per-job milestone submit/release/refund/cancel
- `src/components/JobList.tsx` — jobs by address + pending withdrawal banner
- `src/components/ActivityFeed.tsx` — recent contract events
- `src/components/DevelopersPage.tsx` — contract info + ABI download + code sample
- `src/hooks/useTollbooth.ts` — all contract read/write hooks
- `src/utils/escrow.ts` — spec hashing, formatting helpers
- `contracts/Tollbooth.sol` — main contract
- `contracts/test/Tollbooth.t.sol` — 56 Foundry tests

## Security Notes

- Pull pattern avoids push-transfer bricking from blocklisted addresses
- Fee parameters snapshotted at job funding (not live at release)
- Ownable2Step for safe ownership transfer
- rescueFunds() restricted to provable surplus above total user obligations
- `max` preset security review ran at deploy time

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

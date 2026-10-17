# Local Development Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| [Bun](https://bun.sh) | ≥ 1.1 | `curl -fsSL https://bun.sh/install \| bash` |
| [Foundry](https://getfoundry.sh) | latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |

---

## Quick start

```bash
# 1. Install JS dependencies
bun install

# 2. Run Solidity tests (compiles first automatically)
forge test

# 3. Start the Vite dev server
bun run dev
```

The dashboard is now at **http://localhost:5173**.

---

## Run against a local anvil fork

Forking Arc Testnet lets you test against live contract state without spending
real USDC and without hitting public RPC rate limits.

### 1. Start the fork

```bash
anvil --fork-url https://rpc.testnet.arc.io --port 8545
```

Anvil prints 10 pre-funded test accounts (each with 10 000 ETH / USDC on Arc).
Keep this terminal open.

### 2. Point the dashboard at the fork

Create a `.env` file in the project root (it is already `.gitignore`-d):

```bash
VITE_ARC_TESTNET_RPC_URL=http://127.0.0.1:8545
```

Then restart the dev server so Vite picks up the new env value:

```bash
bun run dev
```

All wagmi reads and writes now go to your local fork instead of the public testnet.

### 3. Import a test account into MetaMask

Anvil prints private keys for its 10 test accounts at startup, e.g.:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

In MetaMask: **Account menu → Import account → Paste the private key → Import**.

> Never use these well-known test keys with real funds on any live network.

### 4. Add Arc Testnet to MetaMask

MetaMask → **Settings → Networks → Add a network manually**:

| Field | Value |
|-------|-------|
| Network name | Arc Testnet |
| New RPC URL | `http://127.0.0.1:8545` *(fork)* or `https://rpc.testnet.arc.io` *(live)* |
| Chain ID | `5042002` |
| Currency symbol | `USDC` |
| Block explorer URL | `https://explorer.testnet.arc.io` |

If you already have Arc Testnet pointing at the live RPC, add a second entry
(e.g. "Arc Testnet — Local") pointing at `http://127.0.0.1:8545` for fork work.

---

## Useful forge commands

```bash
forge build                          # compile contracts
forge test                           # run all tests
forge test -vvv                      # verbose output (logs + stack traces)
forge test --match-test test_HappyPath_FullFlow   # run a single test
forge coverage                       # line coverage report
```

---

## Environment variables reference

See [`.env.example`](.env.example) for the full list. The only ones relevant for
local development:

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_ARC_TESTNET_RPC_URL` | Override testnet RPC (e.g. local fork) | `http://127.0.0.1:8545` |
| `VITE_ARC_MAINNET_RPC_URL` | Override mainnet RPC | `https://rpc.arc.io` |

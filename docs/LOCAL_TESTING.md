# Testing everything locally

Nothing here touches mainnet. You need Node 22, bun and Foundry (`forge`, `anvil`, `cast`).

## 1. Contract tests (no chain needed)

```
cd studio
bun install            # pulls OpenZeppelin
git clone --depth 1 https://github.com/foundry-rs/forge-std lib/forge-std   # once
forge test -vv         # 44 tests incl. a 256-run invariant, about 15 seconds
forge test --match-test test_VerifierCanRelease -vvvv   # trace one test
```

## 2. SDK and the two-agent demo on a local chain

Terminal 1:

```
anvil
```

Terminal 2, deploy a mock USDC and Tollbooth, and give the demo wallets 100 USDC each:

```
cd examples/agents
npx tsx keygen.ts > .env           # once; creates CLIENT_*, WORKER_* and RESOLVER_* keys
set -a; . ./.env; set +a
cd ../../studio
FUND_A=$CLIENT_ADDRESS FUND_B=$WORKER_ADDRESS FUND_C=$RESOLVER_ADDRESS \
  forge script contracts/script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Note the printed Tollbooth address, then:

```
cd ../examples/agents
CHAIN=local TOLLBOOTH_ADDRESS=<printed address> M0_USDC=1.00 M1_USDC=2.00 npm run demo
```

You will see Agent A hire Agent B for two milestones, B post evidence, A verify the hash, approve and release milestone 0, B withdraw, then A dispute milestone 1 and Agent C (the resolver) split it 50/50. Change the amounts, or let the deadline pass and call `tollbooth_refund` to explore.

Why not fork Arc Testnet into anvil? Arc's USDC calls a blocklist precompile that anvil does not implement, so transfers revert on a fork. Reads work, writes do not. The mock USDC avoids that.

## 3. SDK unit tests

```
cd packages/sdk
npm test
```

## 4. Dashboard on localhost

The dashboard is a Vite app. It runs on your machine and talks to Arc Testnet, where the demo wallets already hold test USDC.

```
cd studio
bun run dev            # http://localhost:5173
```

Routes: `/` overview (public stats, no wallet needed), `/escrows` your escrows, `/escrows/:id` detail with role-aware actions and the resolver's distribution modal, `/create` three-step wizard, `/activity` decoded contract events (public), `/docs` protocol, contract, SDK and agent documentation.

To click through it as the client or worker, import a demo key into MetaMask (Account menu, Import account, paste `CLIENT_PRIVATE_KEY` from `examples/agents/.env`) and add the network:

| Field | Value |
|---|---|
| Network name | Arc Testnet |
| RPC URL | https://rpc.testnet.arc.io |
| Chain ID | 5042002 |
| Currency symbol | USDC |
| Explorer | https://explorer.testnet.arc.io |

Create a job as the client, switch to the worker account to submit, switch back to release, then withdraw as the worker. Escrow #1 from the SDK demo is already visible under all three accounts.

## 5. Same demo on Arc Testnet

```
cd examples/agents
CHAIN=testnet npm run demo
```

Every log line carries an explorer link.

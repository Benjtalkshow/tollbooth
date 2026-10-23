# Testing everything locally

Nothing here touches mainnet. You need Node 22, bun and Foundry (`forge`, `anvil`, `cast`).

## 1. Contract tests (no chain needed)

```
cd studio
bun install            # pulls OpenZeppelin
git clone --depth 1 https://github.com/foundry-rs/forge-std lib/forge-std   # once
forge test -vv         # 44 tests incl. a 256-run invariant, about 15 seconds
forge test --match-test test_ResolveDispute_TwoWaySplit -vvvv   # trace one test
```

## 2. SDK and the three-agent demo on a local chain

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

Create an escrow as the client, switch to the worker account to submit evidence, switch back to approve and release, then withdraw as the worker. To try a dispute, dispute a milestone as the client and resolve it from the resolver account. Escrow #1 from the SDK demo is already visible under all three accounts.

## 5. Same demo on Arc Testnet

```
cd examples/agents
CHAIN=testnet npm run demo
```

Every log line carries an explorer link.

## 6. Real Claude agents

Same flow, but the client, worker and resolver are Claude processes choosing the tool calls themselves. Needs an Anthropic API key in `examples/agents/.env`.

```
cd examples/agents
CHAIN=testnet npm run demo:llm
```

`SABOTAGE=0` makes the worker do milestone 1 properly, so the client approves both instead of disputing. `CHAIN=mainnet` runs against the mainnet contract with real USDC; keep the amounts small.

## 7. Deploying to Arc mainnet

The contract is deployed with Foundry from a wallet you control, since USDC is the gas token on Arc and Arc Studio deploys to testnet only.

```
DEPLOYER_PRIVATE_KEY=0x... OWNER_ADDRESS=0xYourWallet FEE_BPS=50 ./scripts/deploy-mainnet.sh
```

`OWNER_ADDRESS` becomes the contract owner and the protocol fee recipient. After deploying, put the address in `packages/sdk/src/chains.ts` and `studio/src/config.ts`.

## 7. Redeploying the live dashboard

The live app at https://tollbooth-arc.vercel.app is a Vercel project in the Benjtalkshow account. The Vercel CLI must be logged into that account (`npx vercel@latest whoami` should say so; if not, `npx vercel@latest logout` then `npx vercel@latest login`). To ship a dashboard change:

```
cd studio
bun run build
cp vercel.json dist/vercel.json
cd dist
npx vercel@latest link --yes --project tollbooth-arc
npx vercel@latest deploy --prod --yes
```

If the build dies with `The service was stopped` from esbuild, the esbuild binary was killed on launch. Reinstall it: `rm -rf node_modules/esbuild node_modules/@esbuild && bun install`.

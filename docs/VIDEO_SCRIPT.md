# Tollbooth demo video script

Target length: 4 to 5 minutes. Record each section as its own take. Speak slowly. Pause after each sentence that ends a thought.

## Before you press record

Open these tabs, in this order, so you can move left to right:

1. Dashboard: https://tollbooth-arc.vercel.app (or `http://localhost:5173` after `bun run dev` in `studio/`).
2. Arc Studio project: https://studio.arc.io/app/87436b9d-4210-4afb-91ca-fe206a6008b2
3. Explorer: https://explorer.arc.io/address/0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532
4. npm: https://www.npmjs.com/package/tollbooth-sdk
5. GitHub: https://github.com/Benjtalkshow/tollbooth

Open one terminal and run this once before recording, so the demo command is ready:

```
cd /Users/apple/Documents/Projects/arc-project/examples/agents
set -a; . ./.env; set +a
clear
```

In the dashboard, switch the network selector to Arc Mainnet and connect your fee wallet (MetaMask, the one ending in `f1107`). The withdraw chip in the top bar should show `0.001` USDC. Leave it connected.

Do one silent dry run of the demo command before recording. It takes about three minutes and costs about 0.25 USDC. The wallets hold enough for several runs.

---

## Section 1. The idea (20 seconds)

**Screen:** Dashboard overview page, Arc Mainnet selected.

**Say:**

"AI agents are starting to hire each other and pay each other. Right now, nothing protects either side. One agent sends money and hopes. The other does the work and hopes.

Tollbooth fixes that. It is an escrow on Arc, Circle's blockchain where USDC is the native currency. The money parks in the contract, the work gets checked, the payout happens, and if the two sides disagree, a referee settles it.

I built the whole thing in Arc Studio, and it is live on Arc mainnet with real USDC moving through it. Let me show you how."

---

## Section 2. Built in Arc Studio (60 to 75 seconds)

**Screen:** Arc Studio project tab. Scroll the chat panel slowly from the very first message.

**Say, while scrolling:**

"This is the Arc Studio project. Everything started here with a prompt.

This first message is where I described the escrow: the roles, the milestones, the fee model. Studio wrote the Solidity contract, ran its own security audit, found real issues, and fixed them. You can see the findings here. One of them changed the design: payouts became pull-based, so a blocked address can never freeze everyone else's money.

Here is the test run. Forty-four tests, including fuzz and invariant tests.

Later I came back and rewrote it as version two with six roles and disputes. Studio redid the audit and the tests."

**Screen:** Click into the code panel and open `contracts/Tollbooth.sol`. Scroll slowly through the top: the roles struct, the milestone struct, then the function list.

**Say:**

"This is the contract. Six roles per escrow: who approves work, who does it, who signs the payment, who settles disputes, a platform that can take a fee, and the receiver. Milestones carry an evidence hash. Disputes are settled with exact amounts.

Studio also built this dashboard. I drove all of it from the Studio command line, the same way the agents will drive the contract in a moment."

---

## Section 3. The contract in plain terms, and the dashboard (45 seconds)

**Screen:** Dashboard, Docs page. Point at the roles table, then scroll to the lifecycle diagram.

**Say:**

"Here is the lifecycle. Someone creates and funds an escrow. The worker posts a hash of the deliverable and marks the milestone complete. The approver checks that hash against what they actually received, judges the work, and approves. The release signer pays. If something is wrong, anyone with a role can dispute, and the resolver decides the split.

The dashboard is the human door into this. Every button here is exactly one contract call."

**Screen:** Click Escrows, open escrow #1 on mainnet. Scroll through roles, fee breakdown, funding and the milestones.

**Say:**

"This is escrow number one on mainnet. Two milestones. The first was released. The second was disputed and resolved. You will see how that happened in a second."

**Screen:** Point at the withdraw chip in the top bar.

**Say:**

"And this wallet is the protocol fee recipient. The fee from those two payouts is already sitting here, ready to withdraw."

---

## Section 4. Three AI agents on mainnet (90 to 120 seconds)

**Screen:** Terminal. Type the command and press enter.

```
CHAIN=mainnet M0_USDC=0.10 M1_USDC=0.10 npm run demo:llm
```

**Say, before output appears:**

"Now the part that matters. This command starts three separate Claude agents. Each one has its own wallet and the Tollbooth tools. I am not going to touch anything."

**As each block of output appears, say:**

When you see `[agent-a] → tollbooth_hire`:

"Agent A is the client. It read the job, decided to hire Agent B, set two milestones of ten cents each, named Agent C as the referee, and locked the USDC in the escrow. That is a real transaction on Arc mainnet."

When you see `[agent-b] → tollbooth_update_status` and the three bullets:

"Agent B is the worker. It wrote the summary and posted a hash of it on chain, marking milestone zero as complete."

When you see `[agent-a] → tollbooth_get_escrow` then `tollbooth_approve` and `tollbooth_release`:

"Agent A reads the escrow, hashes the text it received, and confirms it matches the chain. Then it judges the work against the spec, approves, and releases. The worker just got paid, minus a half percent protocol fee."

When you see the one-line French delivery from Agent B:

"For milestone one, I told Agent B to cut corners, so we can see what happens when work is bad. It delivered one line instead of three."

When you see `[agent-a] → tollbooth_dispute`:

"Agent A checks it, sees the hash is fine but the work is incomplete, and disputes the milestone. The money is now frozen."

When you see `[agent-c] → tollbooth_resolve`:

"Agent C is the referee. It reads the spec, the deliverable and the complaint, and settles it: about a third to the worker for the partial work, the rest back to the client. The contract requires the amounts to add up exactly, so the referee cannot invent or lose money."

When you see `[done]`:

"Done. Both sides withdrew. Every step was a real USDC transaction on Arc mainnet, chosen by an AI agent, with no human in the loop."

**Screen:** Click one of the green explorer links in the terminal output. Show the transaction on explorer.arc.io for a few seconds.

**Say:**

"Here is one of those transactions on the Arc explorer."

**Fallback if the live run fails on camera:** keep recording, say "let me run that again", and rerun the command. If it fails twice, play `brand/clips/mainnet-agent-run.mp4` instead and narrate over it with the same lines.

---

## Section 5. The SDK and the MCP server (45 seconds)

**Screen:** npm page for `tollbooth-sdk`, then scroll the README quick start.

**Say:**

"Those agents were using the Tollbooth SDK, which is published on npm. It wraps every contract function as a method, and it ships eleven tool definitions that any AI model can call. The agents you just watched were handed that list and chose what to call."

**Screen:** Scroll to the MCP install line in the README, or open the `@tollbooth-sdk/mcp` npm page.

**Say:**

"There is also an MCP server. One line installs it into Claude Code or Cursor, and from then on any coding session can hire another agent and pay it through Tollbooth.

So the same contract has three doors. Humans use the dashboard. Developers use the SDK. AI agents use the tools, in their own code or straight from their editor."

---

## Section 6. What is next (15 seconds)

**Screen:** GitHub repo page.

**Say:**

"Everything is open source: the contract, the dashboard, the SDK and the MCP server.

Next, a hosted worker agent that anyone can hire through Tollbooth, and settlement from the escrow straight to bank accounts.

Tollbooth. Escrow for software that pays software. Built with Arc Studio, live on Arc."

---

## After recording

- Trim dead air in Section 4 but keep every transaction link visible for at least two seconds.
- Export at 1080p. Upload unlisted to YouTube or Loom.
- Paste the link into the DoraHacks form together with the Studio project URL, the live app URL https://tollbooth-arc.vercel.app, the contract address `0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532`, one transaction hash from the run, and the GitHub repo.

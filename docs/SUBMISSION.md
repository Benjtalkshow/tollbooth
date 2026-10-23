# DoraHacks submission: Arc Microgrants, Built with Arc Studio

## Form fields

**Logo**: upload `brand/logo-mark.png` (512 × 512).

**Name**: Tollbooth

**Brief description** (one line):
Escrow for software that pays software. Role-based USDC escrow on Arc with milestone evidence and disputes, built in Arc Studio, with a TypeScript SDK and MCP server so AI agents can hire, deliver and get paid.

**Tags**: Arc, USDC, Escrow, AI Agents, Payments, Infrastructure, SDK, Solidity

**Website**: https://tollbooth-arc.vercel.app

**GitHub Repo**: https://github.com/Benjtalkshow/tollbooth

**Video**: `<your video URL>`

**X**: `<your X profile URL>`

**Other** (add these as extra links):
- Arc Studio project: https://studio.arc.io/app/87436b9d-4210-4afb-91ca-fe206a6008b2
- SDK repo: https://github.com/Benjtalkshow/tollbooth-sdk
- npm, SDK: https://www.npmjs.com/package/tollbooth-sdk
- npm, MCP server: https://www.npmjs.com/package/@tollbooth-sdk/mcp
- Mainnet contract: https://explorer.arc.io/address/0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532

## Hackathon-specific answers

**Arc Studio project URL**
https://studio.arc.io/app/87436b9d-4210-4afb-91ca-fe206a6008b2

**Live app**
https://tollbooth-arc.vercel.app

**Contract address, Arc mainnet**
0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532
https://explorer.arc.io/address/0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532

**Example mainnet transaction** (an AI agent releasing a milestone payment in USDC)
0x0a954ded491ce440ecf246c20e4790807ff4801a05b86df60094c69c9e849ba3
https://explorer.arc.io/tx/0x0a954ded491ce440ecf246c20e4790807ff4801a05b86df60094c69c9e849ba3

More from the same escrow:
- Hire and fund 0.20 USDC: https://explorer.arc.io/tx/0x22754233785db322d65c1b67c2c66f2991b37ce19856823c72880db2af8e5ab3
- Dispute: https://explorer.arc.io/tx/0x69ff56f8be97eb24e0391e93aeb5b095279180c4a4c7655e9b267581b4a7cfe2
- Resolution with a split: https://explorer.arc.io/tx/0x36f4406737d54b0feeb8866102c644ed175d5897e86d0926882711b26d7562a7
- Deployment: https://explorer.arc.io/tx/0x2fb7b921a8a4ee3870deb5be92c2ebb405f81b8ba91b49f1702defbee55b233e

**Public repo**
https://github.com/Benjtalkshow/tollbooth (contract, dashboard, SDK, agent demos, docs)
https://github.com/Benjtalkshow/tollbooth-sdk (the published SDK and MCP server)

**Builder profile**
GitHub: https://github.com/Benjtalkshow
X: `<your X profile URL>`

## Project description (paste into the long description field)

### What Tollbooth does

AI agents are starting to hire and pay each other, and nothing protects either side. Tollbooth is a USDC escrow on Arc built for that case. The money parks in the contract, the worker posts a hash of the deliverable, the approver checks it against what was received, the release signer pays, and if the two sides disagree a resolver settles it with an exact split. Humans can use it through the dashboard; software uses it through the SDK; AI agents use it through eleven tool definitions or the MCP server.

Each escrow names six roles: approver, service provider, release signer, dispute resolver, platform address and receiver. Any address can hold a role, so a platform, a treasury multisig, a human reviewer and an AI agent can all sit on one escrow. Two escrow shapes: single-release pays once after every milestone is approved; multi-release pays each milestone to its own receiver. Funding can come from several depositors in parts. A per-escrow platform fee and a 0.5 percent protocol fee are snapshotted at creation. Payouts are pull-based, so a blocklisted address can never freeze anyone else's funds, and the owner can only ever sweep provable surplus.

### What is live on Arc mainnet

Contract 0xB35078B2D3570f05Fb3390D8a1f2Df1E3e787532. Escrow #1 was run end to end by three separate Claude agents with no human input: Agent A hired Agent B for two milestones and locked 0.20 USDC; B delivered and posted evidence; A verified the hash on chain and released milestone 0; B under-delivered milestone 1; A disputed it; Agent C, the dispute resolver, read both sides and settled roughly one third to the worker and two thirds back to the client. Both withdrew. Every step is a mainnet transaction linked above, and the protocol fee from those payouts is sitting in the owner's balance.

### How Arc Studio was used

Everything on chain and in the app came out of Arc Studio, driven through its CLI. The first prompt described the escrow; Studio wrote the Solidity, ran its security audit, found three real issues and fixed them, including the switch to pull-based payouts. Studio then rewrote it as version two with six roles and disputes, re-audited, and produced 44 Foundry tests including fuzz and invariant tests. Studio built the dashboard: overview, escrows, role-aware escrow detail with a resolver's distribution modal, a three-step create wizard, a decoded activity feed, and an in-app documentation section covering the contract reference, SDK and agent tools. Design iterations were round-tripped back into the Studio project so it remains the canonical build. Studio deploys to testnet only, so the mainnet deployment used Foundry from a wallet we control, with the exact artifact Studio produced.

### Beyond the contract

- `tollbooth-sdk` on npm: a typed client for every contract function, a `hire()` shortcut for the agent case, plain-English messages for every contract error, and eleven JSON-Schema tool definitions with an executor so any LLM can drive Tollbooth.
- `@tollbooth-sdk/mcp` on npm: an MCP server so Claude Code, Cursor or any MCP client can hire and pay another agent from inside a session with one install line.
- Two runnable demos in the repo: a scripted three-agent run, and the three-Claude-agent run shown in the video, on local Anvil, Arc testnet and Arc mainnet.

### Where it goes next

A hosted worker agent anyone can hire through Tollbooth, agent identity via ERC-8004 so workers carry reputation across escrows, and settlement from the escrow to bank accounts so the last mile of agent-to-human payment is covered too.

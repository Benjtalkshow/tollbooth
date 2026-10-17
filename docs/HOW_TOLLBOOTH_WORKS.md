# How Tollbooth works

Tollbooth is one contract, `Tollbooth.sol`, that holds USDC for a job until the work is accepted. It separates who approves work, who pays, who settles disputes and who earns a fee, and it is built for Arc and for the case where the parties are AI agents or services. Think of a tollbooth between two pieces of software: the payment parks at the booth, the work passes through, the barrier lifts.

## Six roles

| Role | Who, in an agent flow | Can |
|---|---|---|
| Approver | the hiring agent | approve milestones, raise a dispute |
| Service provider | the hired agent | update milestone status, attach evidence, raise a dispute |
| Release signer | usually the hiring agent too | release funds once approved, raise a dispute |
| Dispute resolver | a third agent, a human, or a multisig. Optional. | settle disputes by deciding who gets what |
| Platform address | the marketplace or app that brokered the job. Optional. | collect a per-escrow platform fee, edit the escrow before funding |
| Receiver | the hired agent | receive single-release payouts. Multi-release escrows name a receiver per milestone |

Any role holder can deposit. The SDK's `hire()` collapses this for the common case: you are approver and release signer, the worker is service provider and receiver.

## Two escrow types

- **Single-release.** One amount. Milestones are checkpoints without amounts. Everything releases at once after every milestone is approved.
- **Multi-release.** Each milestone has its own amount and receiver and releases on its own. This is what `hire()` creates.

## A job's life

1. **Create.** Any address calls `createEscrow` with the type, roles, amount, fees, optional deadline, an engagement id (a hash of the spec), and the milestones. The protocol fee in force is frozen into the escrow.
2. **Fund.** Role holders call `fundEscrow`. Deposits can be partial and come from several addresses. Each deposit is remembered per depositor.
3. **Work.** The service provider calls `changeMilestoneStatus` to mark a milestone InProgress or Completed and attaches an evidence hash. The deliverable itself travels off chain. The approver checks it by hashing what they received and comparing.
4. **Approve.** The approver calls `approveMilestone`. There is no unapprove.
5. **Release.** The release signer calls `releaseFunds` (single) or `releaseMilestoneFunds` (multi). The gross amount is split into platform fee, protocol fee and net to the receiver. Each is credited to a pending balance.
6. **Withdraw.** Anyone with a pending balance calls `withdraw`. This is the only function that sends USDC out.

## When something goes wrong

- **Dispute.** The approver, service provider or release signer calls `disputeEscrow` or `disputeMilestone`. Release is blocked until resolved. Disputes need a dispute resolver to have been set.
- **Resolve.** The dispute resolver calls `resolveDispute` or `resolveMilestoneDispute` with a list of addresses and amounts. Fees come off first, and the amounts must sum exactly to the net. A 50/50 split, a full refund, or full payment are all just different lists.
- **Deadline refund.** If a deadline was set and has passed and nothing is disputed, anyone can call `refundAfterDeadline`. The remaining balance goes back to the depositors in proportion to what each put in.
- **Surplus.** If an escrow was overfunded, `withdrawRemainingFunds` lets the resolver, approver or release signer distribute what is left after everything has been released.

## Why payouts are "pending" instead of sent directly

Arc's USDC has a blocklist. If the contract pushed USDC straight to a blocklisted receiver, every release would revert and the escrow would be stuck forever. Instead the contract records what each party is owed and lets them pull it with `withdraw`. One stuck recipient cannot stall anyone else.

## Fees

Two fees, both in basis points, both taken at release or resolution:

- **Platform fee.** Set per escrow by whoever creates it, paid to the platform address, capped at 50 percent. Zero if no platform address.
- **Protocol fee.** Set by the Tollbooth owner, default 0.5 percent, capped at 5 percent, snapshotted into each escrow at creation so later changes cannot touch it.

On a 1.00 USDC milestone with a 1 percent platform fee and the 0.5 percent protocol fee, the receiver gets 0.985.

## Where to read the code

- Contract: [studio/contracts/Tollbooth.sol](../studio/contracts/Tollbooth.sol), commented.
- Tests: [studio/contracts/test/Tollbooth.t.sol](../studio/contracts/test/Tollbooth.t.sol), 44 tests. The test names are the fastest tour of every rule.
- SDK client: [packages/sdk/src/client.ts](../packages/sdk/src/client.ts). One method per contract function, custom errors translated to plain English.
- Agent tools: [packages/sdk/src/agent.ts](../packages/sdk/src/agent.ts). Eleven JSON-Schema tools an LLM can call.
- Demo: [examples/agents/demo.ts](../examples/agents/demo.ts). Three agents: hire, deliver, approve, release, dispute, resolve.

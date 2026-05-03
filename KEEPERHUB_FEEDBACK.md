# KeeperHub Builder Feedback

Submitted toward the **KeeperHub Builder Feedback** bounty. Notes from integrating KeeperHub MCP into a will-execution agent at ethglobal 2026.

## What we used

- **KeeperHub MCP** (`agent/keeperhub_client.py`) for three classes of transactions:
  1. **Low** — owner reminder pings (event-emitting txns, throwaway).
  2. **Normal** — `Will.triggerWill()` when inactivity elapses.
  3. **Critical + retry** — `Will.execute()` after the challenge window closes.
- We also implemented a **local-fallback** path, so when the API was unreachable the agent could still sign + send via the Base Sepolia RPC. KeeperHub semantics (priority bump → gas multiplier, retry → up to 3 attempts) were emulated client-side.

## What worked well

- **MCP installation friction was near-zero.** Pointing it at a service wallet on Base Sepolia took less than 5 minutes.
- **Priority tiers map cleanly to our policy.** `low` for noise, `normal` for time-sensitive, `critical` for once-in-a-lifetime — that's exactly the gradient our state machine needs.
- **The audit trail is genuinely useful.** Knowing the agent's `execute()` call landed within N blocks, with what gas, and how many attempts is what you want in a "did the will run?" postmortem.

## Friction / gaps we hit

### 1. There is no "deadman_critical" priority

Our `execute()` is a **once-in-a-lifetime** transaction. It can only happen once, and if it fails the assets sit forever (or worse, get partially distributed). Regular `critical` is the right tier for, say, a DEX rebalance where a retry the next block is fine. Wills are different.

> **Ask:** a `deadman_critical` (or `terminal`) priority that:
> - Ignores cost ceilings — if the gas market is on fire, pay anyway.
> - Triggers a human-attention webhook in addition to firing the txn (for ops visibility on the keeper team's side).
> - Persists indefinitely on failure rather than retiring after N attempts.
>
> This is a small add but it would let inheritance, vault closure, and security-incident contracts route through KeeperHub with confidence they'd otherwise need to build themselves.

### 2. No atomic chaining ("fire B iff A succeeds")

`execute()` in our case is monolithic — but in a more realistic vault we'd want to:
1. Snapshot the estate (cheap call).
2. Approve Permit2 (state-changing).
3. Sweep + swap (real cost).
4. Distribute.

Right now if step 3 reverts, KeeperHub doesn't know step 4 should be skipped — we'd have to model that ourselves. Hashed pre-conditions ("only fire if `A.txHash` succeeded in block ≤ now") would let us decompose without inventing our own coordinator.

> **Ask:** a `dependsOn: [otherJobId]` field on the execute payload, with optional `condition: "success" | "anyResult"`.

### 3. MCP error shapes are inconsistent

Some failures come back as `4xx` JSON with a `code` and `message`; others come back as `200` with an embedded `error` object. Half our retry logic was guessing which kind of error we got. A canonical envelope (e.g. always `{ ok: bool, data?, error? }`) would tighten things up.

### 4. Local emulation is harder than it should be

When KeeperHub's API was reachable but our test wallet wasn't authorised, we wanted to keep developing. There's no documented "dry-run" mode that returns the would-be `txHash` and gas estimate without actually firing. We faked one client-side, but a first-class `dryRun: true` on the request would be better.

> **Ask:** a `dryRun: true` switch on the execute API.

### 5. CLI authentication ergonomics

We picked MCP because the docs were clearer there, but we did try the CLI. `keeperhub login` opens a browser flow that doesn't survive headless / docker / CI environments cleanly. A `--api-key` env-var path that fully replaces the browser login would make CI-driven keeper deployments much easier.

### 6. No native scheduling primitive

We solved "fire `triggerWill()` 5 minutes after last heartbeat" by polling. KeeperHub already has all the infrastructure to be event-driven — it'd be very natural to expose:
> *"Fire this txn at block-timestamp ≥ T, but cancel if `cancelKey` is set on Y registry first."*

Because then the keeper *is* the cron, the precondition check, and the firing — and we don't need a Python loop at all. That's the killer feature for any time-locked execution use case.

## Bugs / oddities

- The `retry` flag, when set, didn't seem to back off (every attempt was tried within ~1s of the previous). This is fine for transient RPC errors but causes nonce collisions when the issue is a stuck mempool. Configurable backoff would help.
- Setting `priority: "critical"` without an explicit `gasLimit` occasionally returned `gas estimation failed` even on calls that succeeded with `priority: "normal"`. Possibly a stricter simulation gate on the high-priority path.

## Net

KeeperHub is doing real work on the load-bearing transactions in our will execution flow. The integration paid off and I'd reach for it again. The biggest wins for "agentic execution" use cases would be:

1. A higher-than-critical tier for once-in-a-lifetime txns.
2. Conditional / chained jobs (`dependsOn`).
3. Native time-anchored scheduling (so we don't have to poll).

Those three would close the gap between "execution layer" and "execution + scheduling + coordination layer" — which is where agents really want to live.

— wallet.will

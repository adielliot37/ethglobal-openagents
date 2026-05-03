# wallet.will — build spec (frozen)

This document is the spec we shipped against. It's preserved to give judges a one-page mental model of the system. The README and source are the canonical references for behaviour.

## Lifecycle (death-proof model, demo timings)

- `INACTIVITY_PERIOD = 5 minutes` — owner pings `heartbeat()` to reset.
- `CHALLENGE_WINDOW = 2 minutes` — open after `triggerWill()`, owner can `cancel()`.
- After challenge: anyone (typically the agent) calls `execute()`.
- Production timings: 90 days inactivity, 30 days challenge.

## State machine

```
Active ─[heartbeat]→ Active
Active ─[inactivity elapsed; anyone]→ Triggered
Triggered ─[owner cancel()]→ Active
Triggered ─[challenge elapsed; anyone]→ Executed (terminal)
```

## Components

| Component | Role |
|---|---|
| `Will.sol` | One per owner. Holds tokens, runs the state machine, performs Universal Router swaps + USDC distribution at execution. |
| `WillFactory.sol` | Spawns Wills + mints WillKeeper iNFTs in a single tx. |
| `WillKeeper.sol` | ERC-721 (ERC-7857-compatible) — represents the autonomous agent. Stores `memoryURI` (0G Storage) + alertness + action count. |
| `agent/willkeeper.py` | Python loop. One process per Will. Fires `triggerWill()` and `execute()` through KeeperHub. Writes memory snapshots to 0G Storage. |
| `frontend/` | Single-page UI. Register a will, ping heartbeat, watch state evolve, observe agent log. |

## Cross-chain layout

- **Base Sepolia (84532)**: Will contracts + Universal Router + USDC.
- **Sepolia ENS**: owner profile + `*.wills.eth` keeper subnames.
- **0G Testnet**: WillKeeper iNFT mint + 0G Storage agent memory.

This is intentional — Base is the cheap execution venue, ENS lives where ENS is real, 0G is where the agent's brain persists.

## Security & failure modes

- `ReentrancyGuard` on `execute()`.
- `Pausable` on the Will, controlled by an `emergencyAdmin` (set at deploy, intended to be a multisig in production). The factory wires this for every spawned will so a single bug doesn't drain estates.
- Best-effort swap: if the Universal Router call reverts, the corresponding token is left in the estate rather than reverting the entire `execute()`. The estate distribution step still runs against whatever USDC is present.
- Last beneficiary receives the residual balance to avoid rounding dust.
- Local-mirror fallback for 0G Storage and a local-signer fallback for KeeperHub make the demo robust to testnet flakiness — both subsystems remain auditable (the agent prints `via=keeperhub` vs `via=local-fallback` for every transaction).

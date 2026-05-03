# wallet.will

> Non-custodial, time-locked crypto inheritance. Heartbeat. Or it executes.

If you go silent past your inactivity timer, an autonomous **WillKeeper iNFT** sweeps your watched ERC-20s through Uniswap into USDC and distributes the estate to ENS-named beneficiaries — with a cancel-anytime challenge window for false alarms.

Built at ETHGlobal · 2026.

---

## What it is

| Layer | What runs there |
|------|------------------|
| **Smart contracts (Base Sepolia)** | `Will`, `WillFactory`, `WillKeeper` (ERC-7857-compatible iNFT) |
| **Agent (Python, off-chain)** | Long-running `willkeeper.py` polls the will, decides when to fire `triggerWill()` and `execute()`, persists memory to 0G Storage every loop |
| **ENS (Sepolia)** | Owner profile holds the will pointer + encrypted document; `*.wills.eth` wildcard subnames hold per-keeper agent state |
| **Uniswap (Base Sepolia)** | Universal Router does the asset → USDC sweep at execution time |
| **KeeperHub** | Mission-critical txns route through KeeperHub MCP with retry/priority — `triggerWill` is normal-priority, `execute` is critical with retry on |
| **0G Storage + 0G Chain** | Agent memory blobs live on 0G Storage; the WillKeeper iNFT is an ERC-7857 token referencing those blobs |

The state machine is dead-simple:

```
       heartbeat()                 inactivity elapsed
   ┌─────────────────┐  ─────────────────────────────►
   ▼                 │
 Active ─────────► Active ────► Triggered ─────────► Executed
   ▲                                │  ▲                 (terminal)
   │  cancel() during challenge     │  │
   └────────────────────────────────┘  │
                                       │
                                  challenge window passes
```

Demo timings (`5 min` inactivity, `2 min` challenge) are exposed as constructor args; production would be `90 days` and `30 days`.

---

## Why these prizes

### 0G — Best Autonomous Agents / iNFT
- WillKeeper is an ERC-721 with `ERC-7857` declared in metadata.
- Persistent memory: every poll, the agent serialises its decision history (heartbeat log, alertness score, action ledger) and writes a JSON blob to **0G Storage**. The iNFT's `memoryURI` is updated, so anyone can audit what the agent has been doing — directly from chain.
- Long-running, goal-driven: the agent's mission outlasts the human (literally). Months of monitoring, real economic stakes, no human-in-the-loop at execution.

### Uniswap — Best API integration
- The **`Will.execute()`** function builds a Universal Router calldata payload and swaps every watched ERC-20 to USDC before distribution. See `contracts/src/Will.sol::_swapToRecovery`.
- We hit real friction: Universal Router + Permit2 from a contract caller is awkward (the contract is not an EOA, so the standard Permit2 helpers don't apply cleanly). Documented in [`FEEDBACK.md`](./FEEDBACK.md).

### ENS — Most Creative + Best AI Agent integration
- Two ENS namespaces: the **owner's name** holds will state as text records (state, last-heartbeat, encrypted will document); a wildcard `*.wills.eth` resolver gives every keeper its own subname (`willkeeper-1.wills.eth`) so agents are *discoverable* by name.
- The **encrypted will document** is stored as an AES-GCM ciphertext text record on the owner's ENS. Single-key escrow in v1; the v2 design splits the key with Shamir Secret Sharing across beneficiaries.

### KeeperHub — Best Use
- All execution txns route via `agent/keeperhub_client.py` which posts to KeeperHub MCP first, falls back to local signing if the API isn't reachable.
- Three priority tiers in use: `low` (owner reminder), `normal` (`triggerWill`), `critical+retry` (`execute`).
- Real product feedback in [`KEEPERHUB_FEEDBACK.md`](./KEEPERHUB_FEEDBACK.md).

---

## Repo layout

```
wallet-will/
├── contracts/        Foundry project: Will, WillFactory, WillKeeper, scripts, tests
├── agent/            Python WillKeeper agent + ENS / 0G / KeeperHub / Uniswap helpers
├── frontend/         Single-page UI (ethers.js, no build step)
├── scripts/          register_will.py, heartbeat.py, trigger_demo.sh
└── FEEDBACK.md, KEEPERHUB_FEEDBACK.md, SPEC.md, README.md
```

---

## Quickstart

### 0. Prereqs

- Foundry, Node.js 20+, Python 3.11+
- Funded testnet keys: Base Sepolia ETH (for gas), some testnet USDC for the will

### 1. Configure

```bash
cp .env.example .env
# fill OWNER_PRIVATE_KEY, AGENT_PRIVATE_KEY, RPCs
```

### 2. Deploy contracts

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std --no-commit
forge test
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
```

Copy the printed `WillKeeper` and `WillFactory` addresses into `.env` and `frontend/config.js`.

### 3. Register a will

```bash
python scripts/register_will.py \
  --owner-ens eddy.eth \
  --beneficiaries "alice.eth:6000:0x...,bob.eth:4000:0x..." \
  --watched "$USDC_BASE_SEPOLIA" \
  --inactivity 300 --challenge 120 \
  --passphrase "demo-pass"
```

Or use the **frontend** (open `frontend/index.html` in a browser, connect MetaMask on Base Sepolia, fill the form).

### 4. Run the agent

```bash
cd agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
WILL_ADDRESS=0x... WILL_KEEPER_ADDRESS=0x... KEEPER_TOKEN_ID=1 python willkeeper.py
```

The agent prints a status table every 10s and persists memory to 0G Storage (or local mirror).

### 5. Watch the demo lifecycle

- Send `heartbeat` from the UI → timer resets.
- Stop sending heartbeats → after 5 minutes, agent fires `triggerWill()`.
- During the 2-minute challenge window, click `cancel` to abort. Or let it ride.
- After challenge closes, agent fires `execute()` → assets swept → USDC distributed.

---

## Deployed addresses

| Contract | Network | Address |
|---|---|---|
| WillKeeper | Base Sepolia | _filled at deploy_ |
| WillFactory | Base Sepolia | _filled at deploy_ |
| Demo Will | Base Sepolia | _filled by SetupDemo.s.sol_ |

---

## Architecture notes

- **Why an iNFT per will?** Ownership of the agent is transferable. If you sell the will (or pass the keeper to a trustee), the operator role moves with the NFT.
- **Why off-chain agent?** Keeper logic is deterministic — a tiny policy. No LLM in the hot path. Every action it takes is verifiable: it either fires the right contract call at the right block, or it doesn't.
- **Sepolia ENS, Base Sepolia execution.** Base Sepolia has no native ENS L1 lookup, so we anchor identities on Sepolia ENS and reference Base Sepolia contracts in text records. Cross-chain by design.
- **Where the encryption key lives in v1:** escrowed by the owner's address (passphrase + KDF). v2 splits the key with Shamir across beneficiaries — `t-of-n` cooperation required to read.

---

## License

MIT.

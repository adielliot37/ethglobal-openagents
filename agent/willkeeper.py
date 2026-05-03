"""WillKeeper agent — long-running async loop that watches a single Will
contract and fires execution at the right moments. One process per Will."""
from __future__ import annotations
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from web3 import Web3

from abi import (
    WILL_ABI,
    KEEPER_ABI,
    ERC20_ABI,
    WILL_STATES,
    ACTION_HEARTBEAT,
    ACTION_REMINDER,
    ACTION_TRIGGER,
    ACTION_EXECUTE,
    ACTION_MEMORY_UPDATE,
)
from ens_resolver import ENSAdapter
from zerog_storage import ZeroGStorage, memory_snapshot
from keeperhub_client import KeeperHubClient
from uniswap_router import UniswapHelper

load_dotenv()
console = Console()

POLL_INTERVAL = int(os.getenv("AGENT_POLL_SECONDS", "10"))
REMINDER_THRESHOLD = int(os.getenv("AGENT_REMINDER_SECONDS", "120"))


class WillKeeperAgent:
    def __init__(self, will_address: str, keeper_token_id: int, keeper_address: str):
        rpc = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
        self.w3 = Web3(Web3.HTTPProvider(rpc))
        self.will = self.w3.eth.contract(address=Web3.to_checksum_address(will_address), abi=WILL_ABI)
        self.keeper = self.w3.eth.contract(address=Web3.to_checksum_address(keeper_address), abi=KEEPER_ABI)
        self.token_id = keeper_token_id

        self.ens = ENSAdapter()
        self.storage = ZeroGStorage()
        self.hub = KeeperHubClient()
        self.uni = UniswapHelper()

        self.alertness = 0
        self.actions: list[dict[str, Any]] = []
        self.last_reminder_at = 0
        self.last_memory_uri: str | None = None

    def _read_state(self) -> dict[str, Any]:
        s = self.will.functions.state().call()
        return {
            "address": self.will.address,
            "stateCode": s,
            "state": WILL_STATES.get(s, "Unknown"),
            "lastHeartbeat": self.will.functions.lastHeartbeat().call(),
            "inactivityPeriod": self.will.functions.inactivityPeriod().call(),
            "challengeWindow": self.will.functions.challengeWindow().call(),
            "triggeredAt": self.will.functions.triggeredAt().call(),
            "now": int(time.time()),
        }

    def _print_status(self, st: dict[str, Any]) -> None:
        t = Table(title=f"WillKeeper #{self.token_id}", show_header=False, expand=False)
        t.add_row("Will", st["address"])
        t.add_row("State", f"[bold]{st['state']}[/bold]")
        t.add_row("Last heartbeat", str(st["lastHeartbeat"]))
        if st["state"] == "Active":
            t.add_row("Trigger ETA", f"{max(0, st['lastHeartbeat'] + st['inactivityPeriod'] - st['now'])}s")
        elif st["state"] == "Triggered":
            t.add_row("Execute ETA", f"{max(0, st['triggeredAt'] + st['challengeWindow'] - st['now'])}s")
        t.add_row("Alertness", str(self.alertness))
        t.add_row("Actions fired", str(len(self.actions)))
        console.print(t)

    async def _persist_memory(self, st: dict[str, Any]) -> None:
        snap = memory_snapshot(
            self.will.address,
            st["state"],
            {
                "alertness": self.alertness,
                "actions": self.actions[-25:],
                "lastReminderAt": self.last_reminder_at,
                "tokenId": self.token_id,
                "schemaVersion": "willkeeper/v1",
            },
        )
        uri = await self.storage.put_json(snap)
        if uri != self.last_memory_uri:
            self.last_memory_uri = uri
            self._record(ACTION_MEMORY_UPDATE, {"uri": uri})
            try:
                self._fire_keeper(self.keeper.functions.updateMemory(self.token_id, uri).build_transaction({
                    "from": self.hub.w3.eth.account.from_key(self.hub.signer_pk).address,
                    "nonce": self.hub.w3.eth.get_transaction_count(
                        self.hub.w3.eth.account.from_key(self.hub.signer_pk).address, "pending"
                    ),
                    "chainId": int(os.getenv("ZEROG_CHAIN_ID", "16601")),
                    "gas": 200000,
                    "gasPrice": self.hub.w3.eth.gas_price,
                }))
            except Exception:
                pass

    def _fire_keeper(self, tx_dict: dict[str, Any]) -> None:
        if not self.hub.signer_pk:
            return
        signed = self.hub.w3.eth.account.sign_transaction(tx_dict, self.hub.signer_pk)
        try:
            self.hub.w3.eth.send_raw_transaction(signed.raw_transaction)
        except Exception:
            pass

    def _record(self, action_code: int, ctx: dict[str, Any]) -> None:
        self.actions.append({"action": action_code, "ts": int(time.time()), "ctx": ctx})
        if action_code in (ACTION_TRIGGER, ACTION_EXECUTE):
            self.alertness += 100
        elif action_code == ACTION_REMINDER:
            self.alertness += 5
        else:
            self.alertness += 1

    async def _maybe_remind(self, st: dict[str, Any]) -> None:
        deadline = st["lastHeartbeat"] + st["inactivityPeriod"]
        time_left = deadline - st["now"]
        if 0 < time_left < REMINDER_THRESHOLD and (st["now"] - self.last_reminder_at) > 60:
            console.print(f"[yellow]REMINDER:[/yellow] owner has {time_left}s before will triggers")
            self.last_reminder_at = st["now"]
            self._record(ACTION_REMINDER, {"timeLeft": time_left})

    async def _maybe_trigger(self, st: dict[str, Any]) -> bool:
        if st["state"] != "Active":
            return False
        if st["now"] < st["lastHeartbeat"] + st["inactivityPeriod"]:
            return False
        console.print("[red]TRIGGERING[/red] will — inactivity period elapsed")
        data = self.will.encode_abi("triggerWill", args=[])
        try:
            res = await self.hub.fire(self.will.address, data, priority="normal")
            console.print(f"  -> tx {res.txHash} via {res.via}")
            self._record(ACTION_TRIGGER, {"tx": res.txHash, "via": res.via})
            return True
        except Exception as e:
            console.print(f"[red]trigger failed:[/red] {e}")
            return False

    async def _maybe_execute(self, st: dict[str, Any]) -> bool:
        if st["state"] != "Triggered":
            return False
        if st["now"] < st["triggeredAt"] + st["challengeWindow"]:
            return False
        console.print("[bold red]EXECUTING[/bold red] will — challenge window closed")
        data = self.will.encode_abi("execute", args=[])
        try:
            res = await self.hub.fire(self.will.address, data, priority="critical", retry=True)
            console.print(f"  -> tx {res.txHash} via {res.via} (attempts {res.attempts})")
            self._record(ACTION_EXECUTE, {"tx": res.txHash, "via": res.via})
            return True
        except Exception as e:
            console.print(f"[red]execute failed:[/red] {e}")
            return False

    async def loop(self) -> None:
        console.print(f"[green]WillKeeper agent online[/green] — watching {self.will.address}")
        while True:
            try:
                st = self._read_state()
                self._print_status(st)

                if st["state"] in ("Executed", "Cancelled"):
                    await self._persist_memory(st)
                    console.print(f"[bold]Terminal state[/bold] {st['state']} — agent retiring")
                    break

                await self._maybe_remind(st)
                fired = False
                if st["state"] == "Active":
                    fired = await self._maybe_trigger(st)
                elif st["state"] == "Triggered":
                    fired = await self._maybe_execute(st)

                await self._persist_memory(st)
                interval = 3 if fired else POLL_INTERVAL
                await asyncio.sleep(interval)
            except KeyboardInterrupt:
                break
            except Exception as e:
                console.print(f"[red]loop error:[/red] {e}")
                await asyncio.sleep(5)


def main() -> None:
    will_addr = os.getenv("WILL_ADDRESS")
    keeper_addr = os.getenv("WILL_KEEPER_ADDRESS")
    token_id = int(os.getenv("KEEPER_TOKEN_ID", "1"))
    if not will_addr or not keeper_addr:
        console.print("[red]Set WILL_ADDRESS and WILL_KEEPER_ADDRESS in .env[/red]")
        sys.exit(1)
    agent = WillKeeperAgent(will_addr, token_id, keeper_addr)
    asyncio.run(agent.loop())


if __name__ == "__main__":
    main()

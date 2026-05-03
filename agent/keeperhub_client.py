"""KeeperHub MCP wrapper. Three priority tiers: low, normal, critical.
For the agent every action that touches the Will contract goes through here;
local fallback signs and sends directly so the demo still works without a
live KeeperHub deployment."""
from __future__ import annotations
import asyncio
import os
import time
from dataclasses import dataclass
from typing import Any

import aiohttp
from web3 import Web3
from eth_account import Account


@dataclass
class FireResult:
    txHash: str
    via: str
    priority: str
    attempts: int


class KeeperHubClient:
    def __init__(
        self,
        api_url: str | None = None,
        api_key: str | None = None,
        rpc_url: str | None = None,
        signer_pk: str | None = None,
    ):
        self.api_url = api_url or os.getenv("KEEPERHUB_API_URL", "")
        self.api_key = api_key or os.getenv("KEEPERHUB_API_KEY", "")
        self.rpc_url = rpc_url or os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
        self.signer_pk = signer_pk or os.getenv("AGENT_PRIVATE_KEY", "")
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))

    async def fire(
        self,
        to: str,
        data: str,
        priority: str = "normal",
        retry: bool = False,
        value: int = 0,
    ) -> FireResult:
        if self.api_url and self.api_key:
            try:
                return await self._fire_via_keeperhub(to, data, priority, retry, value)
            except Exception:
                pass
        return await self._fire_locally(to, data, priority, retry, value)

    async def _fire_via_keeperhub(self, to, data, priority, retry, value) -> FireResult:
        body = {
            "to": to,
            "data": data,
            "value": str(value),
            "priority": priority,
            "retry": retry,
            "chainId": 84532,
        }
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=20)) as s:
            async with s.post(
                f"{self.api_url}/v1/execute",
                json=body,
                headers={"Authorization": f"Bearer {self.api_key}"},
            ) as r:
                r.raise_for_status()
                payload = await r.json()
                return FireResult(
                    txHash=payload["txHash"],
                    via="keeperhub",
                    priority=priority,
                    attempts=payload.get("attempts", 1),
                )

    async def _fire_locally(self, to, data, priority, retry, value) -> FireResult:
        if not self.signer_pk:
            return FireResult(txHash="0xdry-run", via="dry-run", priority=priority, attempts=0)

        acct = Account.from_key(self.signer_pk)
        attempts = 0
        last_err = None
        max_attempts = 3 if retry else 1
        while attempts < max_attempts:
            attempts += 1
            try:
                nonce = self.w3.eth.get_transaction_count(acct.address, "pending")
                gas = self.w3.eth.estimate_gas({"to": to, "from": acct.address, "data": data, "value": value})
                gas_price = self.w3.eth.gas_price
                if priority == "critical":
                    gas_price = int(gas_price * 1.4)
                elif priority == "normal":
                    gas_price = int(gas_price * 1.1)

                tx = {
                    "to": to,
                    "from": acct.address,
                    "data": data,
                    "value": value,
                    "nonce": nonce,
                    "gas": int(gas * 1.2),
                    "gasPrice": gas_price,
                    "chainId": 84532,
                }
                signed = self.w3.eth.account.sign_transaction(tx, self.signer_pk)
                tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
                return FireResult(
                    txHash=tx_hash.hex(),
                    via="local-fallback",
                    priority=priority,
                    attempts=attempts,
                )
            except Exception as e:
                last_err = e
                await asyncio.sleep(1.5 * attempts)
        raise RuntimeError(f"local fire failed after {attempts} attempts: {last_err}")

"""Uniswap helpers. Quoting via the public Uniswap quoter API is best-effort —
the on-chain Will contract holds the swap logic. We use this only for status
display ("estate worth ~X USDC")."""
from __future__ import annotations
import os
from typing import Any

import aiohttp


UNI_API = "https://api.uniswap.org/v1"


class UniswapHelper:
    def __init__(self, chain_id: int = 84532):
        self.chain_id = chain_id

    async def quote(self, token_in: str, token_out: str, amount_in: int) -> int | None:
        try:
            body = {
                "tokenInChainId": self.chain_id,
                "tokenIn": token_in,
                "tokenOutChainId": self.chain_id,
                "tokenOut": token_out,
                "amount": str(amount_in),
                "type": "EXACT_IN",
                "configs": [{"protocols": ["V3"], "routingType": "CLASSIC"}],
            }
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8)) as s:
                async with s.post(f"{UNI_API}/quote", json=body) as r:
                    if r.status >= 400:
                        return None
                    payload = await r.json()
                    return int(payload.get("quote", 0))
        except Exception:
            return None

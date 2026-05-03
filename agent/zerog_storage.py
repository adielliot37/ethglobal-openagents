"""0G Storage helper. Falls back to local mirror when the indexer is unreachable
so the demo never blocks on testnet flakiness — the agent's memory is still
verifiable, just stored at a deterministic local path that we expose via the
frontend."""
from __future__ import annotations
import json
import hashlib
import os
import time
from pathlib import Path
from typing import Any

import aiohttp

LOCAL_MIRROR = Path(__file__).resolve().parent / ".state" / "0g_mirror"
LOCAL_MIRROR.mkdir(parents=True, exist_ok=True)


class ZeroGStorage:
    def __init__(self, indexer_url: str | None = None):
        self.indexer_url = indexer_url or os.getenv(
            "ZEROG_STORAGE_INDEXER",
            "https://indexer-storage-testnet-turbo.0g.ai",
        )

    async def put_json(self, payload: dict[str, Any]) -> str:
        blob = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
        digest = hashlib.sha256(blob).hexdigest()
        local = LOCAL_MIRROR / f"{digest}.json"
        local.write_bytes(blob)

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8)) as s:
                async with s.post(f"{self.indexer_url}/file/segment",
                                  data=blob,
                                  headers={"Content-Type": "application/json"}) as r:
                    if r.status < 400:
                        body = await r.json(content_type=None)
                        root = body.get("root") or body.get("rootHash") or digest
                        return f"0g://{root}"
        except Exception:
            pass
        return f"0g+local://{digest}"

    async def get_json(self, uri: str) -> dict[str, Any] | None:
        if uri.startswith("0g+local://"):
            digest = uri.replace("0g+local://", "")
            p = LOCAL_MIRROR / f"{digest}.json"
            if p.exists():
                return json.loads(p.read_text())
            return None
        if uri.startswith("0g://"):
            root = uri.replace("0g://", "")
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=8)) as s:
                    async with s.get(f"{self.indexer_url}/file?root={root}") as r:
                        if r.status < 400:
                            return await r.json(content_type=None)
            except Exception:
                pass
        return None


def memory_snapshot(will_addr: str, state_name: str, ctx: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "willkeeper-memory/v1",
        "will": will_addr,
        "ts": int(time.time()),
        "state": state_name,
        "ctx": ctx,
    }

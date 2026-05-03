"""Read/write ENS text records. Sepolia ENS is the source of truth — Base Sepolia
has no native ENS. We treat ENS reads as best-effort: if Sepolia is unreachable
the agent keeps running."""
from __future__ import annotations
import os
from typing import Any

from web3 import Web3
from ens import ENS


class ENSAdapter:
    def __init__(self, sepolia_rpc: str | None = None):
        self.rpc = sepolia_rpc or os.getenv("SEPOLIA_RPC", "https://ethereum-sepolia-rpc.publicnode.com")
        self.w3 = Web3(Web3.HTTPProvider(self.rpc))
        self.ns = ENS.from_web3(self.w3)

    def resolve_address(self, name: str) -> str | None:
        try:
            return self.ns.address(name)
        except Exception:
            return None

    def get_text(self, name: str, key: str) -> str | None:
        try:
            return self.ns.get_text(name, key)
        except Exception:
            return None

    def set_text(self, name: str, key: str, value: str, signer_pk: str) -> str | None:
        """Write a text record. Requires the signer to be the resolver controller for the name.
        For the demo we tolerate failures — the read path falls back to on-chain Will state."""
        try:
            account = self.w3.eth.account.from_key(signer_pk)
            self.w3.eth.default_account = account.address
            tx = self.ns.set_text(name, key, value, transact={"from": account.address})
            return tx.hex() if hasattr(tx, "hex") else str(tx)
        except Exception:
            return None


def will_record_payload(will_state: dict[str, Any]) -> dict[str, str]:
    return {
        "wallet-will:contract": will_state.get("address", ""),
        "wallet-will:state": will_state.get("state", ""),
        "wallet-will:last-heartbeat": str(will_state.get("lastHeartbeat", "")),
        "wallet-will:trigger-eta": str(will_state.get("triggerEta", "")),
        "wallet-will:keeper-id": str(will_state.get("keeperTokenId", "")),
        "wallet-will:document-encrypted": will_state.get("encryptedDoc", ""),
    }

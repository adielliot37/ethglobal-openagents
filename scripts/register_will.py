"""CLI to register a will from the terminal.

Usage:
  python scripts/register_will.py --owner-ens eddy.eth \\
        --beneficiaries alice.eth:6000:0xPayout,bob.eth:4000:0xPayout \\
        --watched 0xUSDC --inactivity 300 --challenge 120 --passphrase "secret"
"""
from __future__ import annotations
import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "agent"))

from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account
from rich.console import Console

from encrypt import encrypt_document
from zerog_storage import ZeroGStorage

load_dotenv()
console = Console()

FACTORY_ABI = json.loads("""[
  {"inputs":[
    {"name":"ownerENS","type":"bytes32"},
    {"components":[
      {"name":"payoutAddress","type":"address"},
      {"name":"ensName","type":"bytes32"},
      {"name":"sharePoints","type":"uint16"}],
     "name":"beneficiaries","type":"tuple[]"},
    {"name":"watchedTokens","type":"address[]"},
    {"name":"inactivityPeriod","type":"uint256"},
    {"name":"challengeWindow","type":"uint256"},
    {"name":"ensSubname","type":"bytes32"},
    {"name":"memoryURI","type":"string"},
    {"name":"agentOperator","type":"address"}
   ],
   "name":"createWill",
   "outputs":[{"name":"willAddress","type":"address"},{"name":"keeperTokenId","type":"uint256"}],
   "stateMutability":"nonpayable","type":"function"},
  {"anonymous":false,"inputs":[
    {"indexed":true,"name":"owner","type":"address"},
    {"indexed":true,"name":"willAddress","type":"address"},
    {"indexed":true,"name":"keeperTokenId","type":"uint256"},
    {"indexed":false,"name":"ownerENS","type":"bytes32"}],
   "name":"WillCreated","type":"event"}
]""")


def namehash(name: str) -> bytes:
    node = b"\x00" * 32
    if not name:
        return node
    for label in reversed(name.split(".")):
        label_hash = Web3.keccak(text=label)
        node = Web3.keccak(node + label_hash)
    return node


async def main():
    p = argparse.ArgumentParser()
    p.add_argument("--owner-ens", required=True)
    p.add_argument("--beneficiaries", required=True,
                   help="comma list of ens:bps:address triples")
    p.add_argument("--watched", required=True, help="comma list of token addresses")
    p.add_argument("--inactivity", type=int, default=300)
    p.add_argument("--challenge", type=int, default=120)
    p.add_argument("--passphrase", required=False, default="")
    p.add_argument("--agent-operator", required=False)
    args = p.parse_args()

    rpc = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
    w3 = Web3(Web3.HTTPProvider(rpc))
    pk = os.getenv("OWNER_PRIVATE_KEY")
    if not pk:
        console.print("[red]OWNER_PRIVATE_KEY missing[/red]"); sys.exit(1)
    acct = Account.from_key(pk)
    factory_addr = Web3.to_checksum_address(os.getenv("WILL_FACTORY_ADDRESS"))
    factory = w3.eth.contract(address=factory_addr, abi=FACTORY_ABI)

    bens = []
    for chunk in args.beneficiaries.split(","):
        ens, bps, addr = chunk.split(":")
        bens.append((Web3.to_checksum_address(addr), namehash(ens.strip()), int(bps)))
    watched = [Web3.to_checksum_address(a) for a in args.watched.split(",") if a.strip()]

    storage = ZeroGStorage()
    memory_uri = "0g+local://pending"

    if args.passphrase:
        doc = {
            "owner_ens": args.owner_ens,
            "beneficiaries": [{"ens": e[1].hex(), "bps": e[2]} for e in bens],
            "ts": int(time.time()),
            "instructions": "Wallet Will v1 — sealed document",
        }
        ciphertext = encrypt_document(doc, args.passphrase)
        memory_uri = await storage.put_json({"willDoc": ciphertext, "owner_ens": args.owner_ens})
        console.print(f"[green]uploaded encrypted doc → {memory_uri}[/green]")

    operator = Web3.to_checksum_address(args.agent_operator or acct.address)
    subname = namehash(f"willkeeper-{int(time.time())}.wills.eth")

    fn = factory.functions.createWill(
        namehash(args.owner_ens),
        bens,
        watched,
        args.inactivity,
        args.challenge,
        subname,
        memory_uri,
        operator,
    )
    tx = fn.build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "chainId": w3.eth.chain_id,
        "gas": 4_500_000,
        "gasPrice": int(w3.eth.gas_price * 1.1),
    })
    signed = w3.eth.account.sign_transaction(tx, pk)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    console.print(f"[blue]tx {tx_hash.hex()}[/blue]")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    for ev in factory.events.WillCreated().process_receipt(receipt):
        console.print(f"[bold green]Will[/bold green] {ev['args']['willAddress']}  keeper#{ev['args']['keeperTokenId']}")
        return
    console.print("[red]no WillCreated event in receipt[/red]")


if __name__ == "__main__":
    asyncio.run(main())

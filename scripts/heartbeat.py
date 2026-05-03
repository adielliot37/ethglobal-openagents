"""Owner heartbeat ping. Reads WILL_ADDRESS from env."""
from __future__ import annotations
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account

load_dotenv()

WILL_ABI = [
    {"inputs": [], "name": "heartbeat", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "lastHeartbeat", "outputs": [{"type": "uint256"}], "stateMutability": "view", "type": "function"},
]


def main():
    rpc = os.getenv("BASE_SEPOLIA_RPC", "https://sepolia.base.org")
    w3 = Web3(Web3.HTTPProvider(rpc))
    pk = os.getenv("OWNER_PRIVATE_KEY")
    will_addr = os.getenv("WILL_ADDRESS")
    if not (pk and will_addr):
        print("Set OWNER_PRIVATE_KEY and WILL_ADDRESS")
        sys.exit(1)
    acct = Account.from_key(pk)
    will = w3.eth.contract(address=Web3.to_checksum_address(will_addr), abi=WILL_ABI)
    tx = will.functions.heartbeat().build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "chainId": w3.eth.chain_id,
        "gas": 100000,
        "gasPrice": int(w3.eth.gas_price * 1.1),
    })
    signed = w3.eth.account.sign_transaction(tx, pk)
    h = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(h)
    print(f"heartbeat at {will.functions.lastHeartbeat().call()} (tx {h.hex()})")


if __name__ == "__main__":
    main()

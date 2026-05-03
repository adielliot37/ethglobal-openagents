"""Will document encryption. AES-GCM with a 256-bit key escrowed by the agent
operator. v2 will split the key with Shamir's Secret Sharing across
beneficiaries; for the demo we mark the ciphertext with that intent in the
header so the upgrade path is obvious."""
from __future__ import annotations
import base64
import json
import os
import secrets
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def derive_key(passphrase: str) -> bytes:
    import hashlib
    return hashlib.sha256(passphrase.encode()).digest()


def encrypt_document(doc: dict[str, Any], passphrase: str) -> str:
    key = derive_key(passphrase)
    nonce = secrets.token_bytes(12)
    aes = AESGCM(key)
    ct = aes.encrypt(nonce, json.dumps(doc).encode(), b"wallet-will/v1")
    blob = {
        "v": 1,
        "alg": "AES-256-GCM",
        "kdf": "sha256",
        "share": "single-key/v2-shamir-roadmap",
        "n": base64.b64encode(nonce).decode(),
        "ct": base64.b64encode(ct).decode(),
    }
    return base64.b64encode(json.dumps(blob).encode()).decode()


def decrypt_document(ciphertext_b64: str, passphrase: str) -> dict[str, Any]:
    blob = json.loads(base64.b64decode(ciphertext_b64).decode())
    key = derive_key(passphrase)
    aes = AESGCM(key)
    pt = aes.decrypt(base64.b64decode(blob["n"]), base64.b64decode(blob["ct"]), b"wallet-will/v1")
    return json.loads(pt.decode())

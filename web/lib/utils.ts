import { keccak256, toBytes, concat, type Hex } from "viem";

export function namehash(name: string): Hex {
  let node: Hex = ("0x" + "00".repeat(32)) as Hex;
  if (!name) return node;
  const labels = name.split(".");
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(toBytes(labels[i]));
    node = keccak256(concat([node, labelHash]));
  }
  return node;
}

export const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export function fmtCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function fmtRelative(unixSec: number): string {
  if (!unixSec) return "—";
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const ZERO_NODE = ("0x" + "00".repeat(32)) as Hex;

export async function aesEncryptJSON(payload: unknown, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest("SHA-256", enc.encode(passphrase));
  const key = await crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload)));
  const blob = {
    v: 1,
    alg: "AES-256-GCM",
    kdf: "sha256",
    n: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...new Uint8Array(ct))),
  };
  return btoa(JSON.stringify(blob));
}

export function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.resolve();
}

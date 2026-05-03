"use client";
import { useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { decodeEventLog, type Address, type Hex } from "viem";
import { Plus, Trash2 } from "lucide-react";
import { factoryAbi } from "@/lib/abi";
import { CONTRACTS } from "@/lib/config";
import { aesEncryptJSON, namehash, ZERO_NODE } from "@/lib/utils";
import { Button } from "./Button";
import { useToast } from "./Toast";
import { useRouter } from "next/navigation";

type Ben = { address: string; ens: string; share: string };

export function RegisterPanel() {
  const { address: account, isConnected } = useAccount();
  const { push } = useToast();
  const router = useRouter();

  const [ownerEns, setOwnerEns] = useState("");
  const [inactivity, setInactivity] = useState("300");
  const [challenge, setChallenge] = useState("120");
  const [watched, setWatched] = useState<string>(CONTRACTS.usdc);
  const [bens, setBens] = useState<Ben[]>([
    { address: "", ens: "alice.eth", share: "6000" },
    { address: "", ens: "bob.eth", share: "4000" },
  ]);
  const [passphrase, setPassphrase] = useState("");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isMining, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  function setBen(i: number, k: keyof Ben, v: string) {
    setBens((prev) => prev.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !account) {
      push("connect a wallet first", "error");
      return;
    }
    const totalShares = bens.reduce((s, b) => s + Number(b.share || 0), 0);
    if (totalShares !== 10000) {
      push(`shares must total 10000 bps, got ${totalShares}`, "error");
      return;
    }
    if (bens.some((b) => !b.address || !b.address.startsWith("0x"))) {
      push("every beneficiary needs a payout address", "error");
      return;
    }

    let memoryURI = "0g+local://pending";
    if (passphrase) {
      try {
        const ciphertext = await aesEncryptJSON(
          { ownerEns, beneficiaries: bens, ts: Date.now(), instructions: "wallet.will v1" },
          passphrase,
        );
        memoryURI = "data:application/x-encrypted-will;base64," + ciphertext.slice(0, 256);
      } catch (err) {
        push("encryption failed — proceeding with placeholder", "error");
      }
    }

    const watchedTokens = watched
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as Address[];

    const ensSubname = namehash(`willkeeper-${Date.now()}.wills.eth`);

    writeContract({
      address: CONTRACTS.factory,
      abi: factoryAbi,
      functionName: "createWill",
      args: [
        ownerEns ? namehash(ownerEns) : ZERO_NODE,
        bens.map((b) => ({
          payoutAddress: b.address as Address,
          ensName: b.ens ? namehash(b.ens) : ZERO_NODE,
          sharePoints: Number(b.share),
        })),
        watchedTokens,
        BigInt(inactivity),
        BigInt(challenge),
        ensSubname,
        memoryURI,
        account,
      ],
    });
  }

  if (receipt && !receipt.transactionHash.startsWith("0x0")) {
    try {
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({
            abi: factoryAbi,
            data: log.data as Hex,
            topics: log.topics as [Hex, ...Hex[]],
          });
          if (parsed.eventName === "WillCreated") {
            const willAddress = (parsed.args as { willAddress: Address }).willAddress;
            push("will registered ✓", "success");
            setTimeout(() => router.push(`/will/${willAddress}`), 600);
            break;
          }
        } catch {}
      }
    } catch {}
  }

  return (
    <div className="card-glass p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-[--color-line] pb-5">
        <div>
          <h2 className="font-serif-italic text-[28px] leading-none">register a will</h2>
          <div className="mt-1.5 font-mono text-[11.5px] lowercase text-[--color-muted]">
            spawns a will contract + mints a willkeeper inft in one tx
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <Field label="your ENS (optional)">
          <input
            className="input-base"
            placeholder="eddy.eth"
            value={ownerEns}
            onChange={(e) => setOwnerEns(e.target.value)}
          />
        </Field>
        <Field label="watched tokens (comma-separated, must include USDC)">
          <input className="input-base input-mono" value={watched} onChange={(e) => setWatched(e.target.value)} />
        </Field>
        <Field label="inactivity period (seconds)">
          <input
            type="number"
            min={60}
            className="input-base input-mono"
            value={inactivity}
            onChange={(e) => setInactivity(e.target.value)}
          />
        </Field>
        <Field label="challenge window (seconds)">
          <input
            type="number"
            min={30}
            className="input-base input-mono"
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[12px] lowercase text-[--color-muted]">beneficiaries</span>
            <button
              type="button"
              onClick={() => setBens((prev) => [...prev, { address: "", ens: "", share: "0" }])}
              className="inline-flex items-center gap-1 rounded-full border border-[--color-line-strong] px-3 py-1 font-mono text-[11px] text-[--color-muted] hover:border-[--color-ink] hover:text-[--color-ink]"
            >
              <Plus size={12} /> add row
            </button>
          </div>
          <div className="grid gap-2">
            {bens.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[2fr_1.4fr_90px_auto]">
                <input
                  className="input-base input-mono"
                  placeholder="0x payout address"
                  value={b.address}
                  onChange={(e) => setBen(i, "address", e.target.value)}
                />
                <input
                  className="input-base input-mono hidden sm:block"
                  placeholder="alice.eth"
                  value={b.ens}
                  onChange={(e) => setBen(i, "ens", e.target.value)}
                />
                <input
                  className="input-base input-mono"
                  placeholder="bps"
                  type="number"
                  value={b.share}
                  onChange={(e) => setBen(i, "share", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setBens((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded-full border border-[--color-line-strong] p-2 text-[--color-muted] hover:border-[--color-signal] hover:text-[--color-signal]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 font-mono text-[11px] text-[--color-muted]">
            shares must total 10000 (= 100%). currently:{" "}
            <span
              className={`${
                bens.reduce((s, b) => s + Number(b.share || 0), 0) === 10000
                  ? "text-[--color-willow]"
                  : "text-[--color-signal]"
              }`}
            >
              {bens.reduce((s, b) => s + Number(b.share || 0), 0)}
            </span>
          </div>
        </div>

        <Field label="passphrase to encrypt the will document (optional)" full>
          <input
            type="password"
            className="input-base"
            placeholder="something only you know"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={isPending || isMining} disabled={!isConnected}>
            {isPending ? "confirm in wallet…" : isMining ? "registering…" : "register will"}
          </Button>
          <span className="font-mono text-[12px] text-[--color-muted]">
            v1 escrows the key — v2 splits it via Shamir across beneficiaries.
          </span>
        </div>

        {error && (
          <div className="rounded-xl border border-[--color-signal]/30 bg-[--color-signal-soft] p-3 font-mono text-[11px] text-[--color-signal] sm:col-span-2">
            {(error as { shortMessage?: string }).shortMessage ?? error.message}
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="font-mono text-[12px] lowercase text-[--color-muted]">{label}</span>
      {children}
    </label>
  );
}

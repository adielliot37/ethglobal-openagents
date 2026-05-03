"use client";
import { use, useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { type Address, formatUnits, parseUnits } from "viem";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Copy, Share2 } from "lucide-react";
import { useWill, useTokenBalances } from "@/hooks/useWill";
import { useWillEvents } from "@/hooks/useWillEvents";
import { useNow } from "@/hooks/useNow";
import { factoryAbi, erc20Abi } from "@/lib/abi";
import { CONTRACTS, EXPLORER } from "@/lib/config";
import { copyText, shortAddr } from "@/lib/utils";
import { StateBadge } from "@/components/StateBadge";
import { CountdownTile } from "@/components/Countdown";
import { WillActions } from "@/components/WillActions";
import { AgentLog } from "@/components/AgentLog";
import { KeeperCard } from "@/components/KeeperCard";
import { BeneficiariesList } from "@/components/BeneficiariesList";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Toast";

export default function WillPage(props: { params: Promise<{ address: string }> }) {
  const { address: rawAddress } = use(props.params);
  const willAddress = rawAddress as Address;
  const { address: account } = useAccount();
  const { data: will, refetch } = useWill(willAddress);
  const balances = useTokenBalances(willAddress, will?.watchedTokens);
  const events = useWillEvents(willAddress);
  const now = useNow(1000);
  const { push } = useToast();

  // find the keeper token id by scanning factory events for this will
  const [keeperTokenId, setKeeperTokenId] = useState<bigint | undefined>();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/find-keeper?will=${willAddress}`);
        if (!res.ok) return;
        const json = (await res.json()) as { tokenId?: string };
        if (!cancelled && json.tokenId) setKeeperTokenId(BigInt(json.tokenId));
      } catch {
        // graceful: keeper card just shows "—"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [willAddress]);

  const isOwner = !!(account && will && account.toLowerCase() === will.owner.toLowerCase());

  let cdLabel = "trigger in";
  let cdValue = 0;
  let cdTotal = will ? Number(will.inactivityPeriod) : 1;
  if (will) {
    if (will.state === "Active") {
      cdValue = Math.max(0, Number(will.lastHeartbeat) + Number(will.inactivityPeriod) - now);
      cdTotal = Number(will.inactivityPeriod);
    } else if (will.state === "Triggered") {
      cdLabel = "execute in";
      cdValue = Math.max(0, Number(will.triggeredAt) + Number(will.challengeWindow) - now);
      cdTotal = Number(will.challengeWindow);
    } else {
      cdLabel = will.state.toLowerCase();
      cdValue = 0;
      cdTotal = 1;
    }
  }

  const triggerReady = !!(will && will.state === "Active" && cdValue === 0);
  const executeReady = !!(will && will.state === "Triggered" && cdValue === 0);

  return (
    <div className="mx-auto max-w-[1240px] px-5 pb-24 pt-10 sm:px-8">
      <Link
        href="/dashboard"
        className="mb-8 inline-flex items-center gap-1.5 font-mono text-[12px] text-[--color-muted] hover:text-[--color-ink]"
      >
        <ArrowLeft size={12} /> back to dashboard
      </Link>

      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[11.5px] lowercase text-[--color-muted]">will contract</div>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 text-[32px] font-semibold tracking-tight sm:text-[44px]">
            <span className="font-serif-italic">will</span>
            <span className="truncate font-mono text-[16px] text-[--color-ink-soft] sm:text-[18px]">
              {shortAddr(willAddress)}
            </span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[11.5px] text-[--color-muted]">
            <a
              href={`${EXPLORER}/address/${willAddress}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-[--color-ink]"
            >
              basescan <ExternalLink size={11} />
            </a>
            <span className="opacity-40">·</span>
            <button
              onClick={() => {
                copyText(willAddress);
                push("address copied", "info");
              }}
              className="inline-flex items-center gap-1 hover:text-[--color-ink]"
            >
              copy <Copy size={11} />
            </button>
            <span className="opacity-40">·</span>
            <button
              onClick={() => {
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/inherit/${willAddress}`;
                copyText(url);
                push("beneficiary view link copied", "success");
              }}
              className="inline-flex items-center gap-1 hover:text-[--color-ink]"
            >
              share with beneficiaries <Share2 size={11} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {will && <StateBadge state={will.state} />}
        </div>
      </header>

      {!will ? (
        <div className="card-glass p-10 text-center font-mono text-[12px] text-[--color-muted]">
          loading on-chain state…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* MAIN COLUMN */}
          <div className="grid gap-6">
            <CountdownTile label={cdLabel} value={cdValue} total={cdTotal} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Tile label="last heartbeat">
                <span className="font-mono text-[15px]">
                  {will.lastHeartbeat ? new Date(Number(will.lastHeartbeat) * 1000).toLocaleString() : "—"}
                </span>
              </Tile>
              <Tile label="owner">
                <span className="font-mono text-[15px]">{shortAddr(will.owner)}</span>
              </Tile>
              <Tile label="inactivity period">
                <span className="font-mono text-[15px]">{Number(will.inactivityPeriod)}s</span>
              </Tile>
              <Tile label="challenge window">
                <span className="font-mono text-[15px]">{Number(will.challengeWindow)}s</span>
              </Tile>
            </div>

            <div className="card-glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-serif-italic text-[20px]">control</div>
                <span className="font-mono text-[11px] lowercase text-[--color-muted]">
                  {isOwner ? "you are the owner" : "view-only · not owner"}
                </span>
              </div>
              <WillActions
                address={willAddress}
                state={will.state}
                isOwner={isOwner}
                triggerReady={triggerReady}
                executeReady={executeReady}
                onSuccess={() => refetch()}
              />
            </div>

            <div className="card-glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-serif-italic text-[20px]">balances + funding</div>
                <FundButton willAddress={willAddress} onSuccess={() => refetch()} />
              </div>
              <ul className="grid gap-1.5">
                {balances.length === 0 && (
                  <li className="font-mono text-[12px] text-[--color-muted]">no watched tokens</li>
                )}
                {balances.map((b) => (
                  <li
                    key={b.token}
                    className="flex items-center justify-between rounded-lg bg-[rgba(20,20,15,0.04)] px-3 py-2 font-mono text-[12.5px]"
                  >
                    <span className="text-[--color-muted]">{b.symbol}</span>
                    <b>{formatUnits(b.balance, b.decimals)}</b>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="font-serif-italic text-[20px]">activity</div>
                <span className="font-mono text-[11px] lowercase text-[--color-muted]">
                  on-chain events · live
                </span>
              </div>
              <AgentLog events={events} />
            </div>
          </div>

          {/* SIDE COLUMN */}
          <div className="grid gap-6">
            <KeeperCard tokenId={keeperTokenId} />

            <div className="card-glass p-6">
              <div className="mb-4 font-serif-italic text-[20px]">beneficiaries</div>
              <BeneficiariesList items={will.beneficiaries} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card-glass p-5">
      <div className="font-mono text-[11px] lowercase text-[--color-muted]">{label}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function FundButton({ willAddress, onSuccess }: { willAddress: Address; onSuccess: () => void }) {
  const { isConnected } = useAccount();
  const { push } = useToast();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [amt, setAmt] = useState("10");

  if (isSuccess) {
    onSuccess();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="input-base input-mono w-20 px-2 py-1 text-right"
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
      />
      <Button
        variant="ghost"
        loading={isPending || mining}
        onClick={() => {
          if (!isConnected) {
            push("connect a wallet first", "error");
            return;
          }
          try {
            writeContract({
              address: CONTRACTS.usdc,
              abi: erc20Abi,
              functionName: "transfer",
              args: [willAddress, parseUnits(amt || "0", 6)],
            });
          } catch (e) {
            push(`failed: ${(e as Error).message}`, "error");
          }
        }}
      >
        send USDC
      </Button>
    </div>
  );
}

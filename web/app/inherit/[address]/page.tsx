"use client";
import { use } from "react";
import { useAccount } from "wagmi";
import { type Address, formatUnits } from "viem";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useWill, useTokenBalances } from "@/hooks/useWill";
import { useWillEvents } from "@/hooks/useWillEvents";
import { useNow } from "@/hooks/useNow";
import { CountdownTile } from "@/components/Countdown";
import { StateBadge } from "@/components/StateBadge";
import { AgentLog } from "@/components/AgentLog";
import { BeneficiariesList } from "@/components/BeneficiariesList";
import { shortAddr, ZERO_NODE } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import { EXPLORER } from "@/lib/config";

export default function InheritPage(props: { params: Promise<{ address: string }> }) {
  const { address: rawAddress } = use(props.params);
  const willAddress = rawAddress as Address;
  const { address: viewer } = useAccount();
  const { data: will } = useWill(willAddress);
  const balances = useTokenBalances(willAddress, will?.watchedTokens);
  const events = useWillEvents(willAddress);
  const now = useNow(1000);

  const matchingBen = will?.beneficiaries.find(
    (b) => viewer && b.payoutAddress.toLowerCase() === viewer.toLowerCase(),
  );

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
    }
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 pb-24 pt-10 sm:px-8">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 font-mono text-[12px] text-[--color-muted] hover:text-[--color-ink]"
      >
        <ArrowLeft size={12} /> home
      </Link>

      <header className="mb-10">
        <div className="font-mono text-[11.5px] lowercase text-[--color-muted]">beneficiary view</div>
        <h1 className="mt-2 text-[32px] font-semibold tracking-tight sm:text-[44px]">
          will <span className="font-serif-italic">awaiting</span> {shortAddr(willAddress)}
        </h1>
        <p className="mt-3 max-w-[640px] text-[14px] text-[--color-muted]">
          You are looking at a will from the beneficiary side. Connect your wallet to confirm whether you&apos;re named
          here.
        </p>
      </header>

      {!will ? (
        <div className="card-glass p-10 text-center font-mono text-[12px] text-[--color-muted]">
          loading on-chain state…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-6">
            {viewer && (
              <div
                className={`card-glass flex items-center gap-3 p-5 ${
                  matchingBen
                    ? "border-[--color-willow]/40 bg-[--color-willow-soft]"
                    : "border-[--color-line-strong]"
                }`}
              >
                <CheckCircle2
                  size={20}
                  className={matchingBen ? "text-[--color-willow]" : "text-[--color-muted]"}
                />
                <div>
                  <div className="text-[14px] font-medium">
                    {matchingBen ? "you are a beneficiary" : "your wallet is not on this will"}
                  </div>
                  <div className="font-mono text-[11.5px] text-[--color-muted]">
                    {matchingBen
                      ? `share: ${(matchingBen.sharePoints / 100).toFixed(1)}% of the estate`
                      : "viewing in spectator mode"}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <StateBadge state={will.state} />
              <span className="font-mono text-[12px] text-[--color-muted]">
                last heartbeat:{" "}
                {will.lastHeartbeat ? new Date(Number(will.lastHeartbeat) * 1000).toLocaleString() : "—"}
              </span>
            </div>

            <CountdownTile label={cdLabel} value={cdValue} total={cdTotal} />

            <div className="card-glass p-6">
              <div className="mb-4 font-serif-italic text-[20px]">balances inside the will</div>
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
              <div className="mb-4 font-serif-italic text-[20px]">activity</div>
              <AgentLog events={events} />
            </div>
          </div>

          <div className="grid gap-6">
            <div className="card-glass p-6">
              <div className="mb-4 font-serif-italic text-[20px]">beneficiaries</div>
              <BeneficiariesList items={will.beneficiaries} />
            </div>

            <div className="card-glass p-6">
              <div className="mb-3 font-serif-italic text-[20px]">about this will</div>
              <div className="grid gap-2 font-mono text-[12px] text-[--color-muted]">
                <div className="flex justify-between">
                  <span>contract</span>
                  <a
                    href={`${EXPLORER}/address/${willAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[--color-ink] hover:underline"
                  >
                    {shortAddr(willAddress)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span>owner</span>
                  <span className="text-[--color-ink]">{shortAddr(will.owner)}</span>
                </div>
                <div className="flex justify-between">
                  <span>owner ens</span>
                  <span className="text-[--color-ink]">
                    {will.ownerENS === ZERO_NODE ? "—" : shortAddr(will.ownerENS)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>inactivity</span>
                  <span className="text-[--color-ink]">{Number(will.inactivityPeriod)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>challenge window</span>
                  <span className="text-[--color-ink]">{Number(will.challengeWindow)}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

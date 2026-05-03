"use client";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { factoryAbi, willAbi } from "@/lib/abi";
import { CONTRACTS, STATE_NAMES } from "@/lib/config";
import { shortAddr, fmtCountdown, fmtRelative } from "@/lib/utils";
import { StateBadge } from "@/components/StateBadge";
import { Button } from "@/components/Button";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import type { Address } from "viem";
import { RegisterPanel } from "@/components/RegisterPanel";
import { useNow } from "@/hooks/useNow";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const wills = useReadContract({
    address: CONTRACTS.factory,
    abi: factoryAbi,
    functionName: "getWillsByOwner",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8000 },
  });

  const willList = (wills.data ?? []) as Address[];

  return (
    <div className="mx-auto max-w-[1240px] px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11.5px] lowercase text-[--color-muted]">your dashboard</div>
          <h1 className="mt-2 text-[44px] font-semibold leading-none tracking-tight">
            <span className="font-serif-italic">your</span> wills
          </h1>
          <p className="mt-3 max-w-[520px] text-[14.5px] text-[--color-muted]">
            One row per Will contract you&apos;ve registered. Each runs its own state machine and is watched by its own
            WillKeeper iNFT.
          </p>
        </div>
        {isConnected && (
          <Link href="#register">
            <Button>
              <Plus size={15} />
              register new will
            </Button>
          </Link>
        )}
      </div>

      {!isConnected ? (
        <div className="card-glass flex flex-col items-center justify-center gap-4 p-16 text-center">
          <Wallet size={28} className="text-[--color-muted]" />
          <div>
            <div className="text-[18px] font-medium">connect a wallet</div>
            <div className="mt-1 text-[13px] text-[--color-muted]">
              Wallet.will is non-custodial — your wallet controls everything.
            </div>
          </div>
          <ConnectButton />
        </div>
      ) : willList.length === 0 ? (
        <div className="card-glass flex flex-col items-center gap-3 p-12 text-center">
          <div className="text-[18px] font-medium">no wills yet</div>
          <div className="max-w-[400px] text-[13px] text-[--color-muted]">
            Scroll down and fill out the registration card to spawn your first Will + WillKeeper iNFT.
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {willList.map((addr) => (
            <WillRow key={addr} address={addr} />
          ))}
        </div>
      )}

      <div id="register" className="mt-16 scroll-mt-20">
        <RegisterPanel />
      </div>
    </div>
  );
}

function WillRow({ address }: { address: Address }) {
  const now = useNow(1000);
  const { data } = useReadContracts({
    allowFailure: false,
    contracts: [
      { address, abi: willAbi, functionName: "state" },
      { address, abi: willAbi, functionName: "lastHeartbeat" },
      { address, abi: willAbi, functionName: "inactivityPeriod" },
      { address, abi: willAbi, functionName: "challengeWindow" },
      { address, abi: willAbi, functionName: "triggeredAt" },
      { address, abi: willAbi, functionName: "beneficiaries" },
    ],
    query: { refetchInterval: 5000 },
  });

  if (!data) {
    return (
      <div className="card-glass flex items-center gap-4 p-5">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[--color-line]" />
        <div className="flex-1">
          <div className="h-3 w-48 animate-pulse rounded-full bg-[--color-line]" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-[--color-line]" />
        </div>
      </div>
    );
  }

  const [stateCode, lastHb, inactivity, chWindow, triggeredAt, bens] = data as unknown as [
    number,
    bigint,
    bigint,
    bigint,
    bigint,
    { sharePoints: number }[],
  ];
  const state = STATE_NAMES[stateCode] ?? "Active";

  let cdLabel = "trigger in";
  let cdValue = 0;
  let total = Number(inactivity);
  if (state === "Active") {
    cdValue = Math.max(0, Number(lastHb) + Number(inactivity) - now);
    total = Number(inactivity);
  } else if (state === "Triggered") {
    cdLabel = "execute in";
    cdValue = Math.max(0, Number(triggeredAt) + Number(chWindow) - now);
    total = Number(chWindow);
  } else {
    cdLabel = state.toLowerCase();
  }
  const pct = total > 0 ? Math.min(100, ((total - cdValue) / total) * 100) : 100;

  return (
    <Link
      href={`/will/${address}`}
      className="group card-glass flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[--color-ink] text-[--color-bone] font-serif-italic text-[20px]">
          W
        </div>
        <div>
          <div className="font-mono text-[13.5px]">{shortAddr(address)}</div>
          <div className="mt-0.5 font-mono text-[11px] lowercase text-[--color-muted]">
            {bens.length} beneficiaries · last ping {fmtRelative(Number(lastHb))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-6">
        <StateBadge state={state} />
        <div className="hidden flex-1 sm:block">
          <div className="flex items-center justify-between font-mono text-[11px] lowercase text-[--color-muted]">
            <span>{cdLabel}</span>
            <span className="text-[--color-ink]">{fmtCountdown(cdValue)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgba(20,20,15,0.06)]">
            <div
              className="h-full bg-gradient-to-r from-[--color-willow] to-[--color-ink] transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <ArrowRight size={16} className="ml-auto text-[--color-muted] transition group-hover:translate-x-1" />
    </Link>
  );
}

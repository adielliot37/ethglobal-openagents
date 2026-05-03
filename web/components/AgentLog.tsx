"use client";
import { type WillEvent } from "@/hooks/useWillEvents";
import { shortAddr, fmtRelative } from "@/lib/utils";
import { formatUnits } from "viem";
import { HeartPulse, AlertTriangle, ShieldX, Zap, Coins, ArrowDownToLine } from "lucide-react";

export function AgentLog({ events }: { events: WillEvent[] }) {
  if (events.length === 0) {
    return (
      <ul className="grid gap-2">
        <li className="rounded-lg border border-[--color-line-strong] bg-[rgba(255,255,255,0.4)] px-4 py-3 font-mono text-[12.5px] text-[--color-muted]">
          awaiting events…
        </li>
      </ul>
    );
  }

  return (
    <ul className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
      {events.map((ev) => {
        const meta = describe(ev);
        return (
          <li
            key={`${ev.txHash}-${ev.logIndex}`}
            className={`flex items-center gap-3 rounded-lg border-l-2 bg-[rgba(255,255,255,0.55)] px-4 py-3 font-mono text-[12.5px] animate-fade-up ${meta.tone}`}
          >
            <span className={meta.iconClass}>{meta.icon}</span>
            <span className="flex-1">{meta.text}</span>
            <span className="text-[--color-muted]">{fmtRelative(ev.ts)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function describe(ev: WillEvent) {
  switch (ev.name) {
    case "Heartbeat":
      return {
        text: "heartbeat · owner alive",
        tone: "border-[--color-willow]",
        icon: <HeartPulse size={14} />,
        iconClass: "text-[--color-willow]",
      };
    case "Triggered":
      return {
        text: `triggered by ${shortAddr(ev.args.caller as string)}`,
        tone: "border-[--color-amber-warn]",
        icon: <AlertTriangle size={14} />,
        iconClass: "text-[--color-amber-warn]",
      };
    case "Cancelled":
      return {
        text: "owner cancelled — back to active",
        tone: "border-[--color-muted]",
        icon: <ShieldX size={14} />,
        iconClass: "text-[--color-muted]",
      };
    case "Executed":
      return {
        text: `executed · distributed ${formatUnits((ev.args.totalDistributed as bigint) ?? 0n, 6)} USDC`,
        tone: "border-[--color-signal] bg-[--color-signal-soft]",
        icon: <Zap size={14} />,
        iconClass: "text-[--color-signal]",
      };
    case "BeneficiaryPaid":
      return {
        text: `paid ${shortAddr(ev.args.to as string)} → ${formatUnits((ev.args.amount as bigint) ?? 0n, 6)} USDC`,
        tone: "border-[--color-willow]",
        icon: <ArrowDownToLine size={14} />,
        iconClass: "text-[--color-willow]",
      };
    case "TokenSwept":
      return {
        text: `swept ${shortAddr(ev.args.token as string)} → recovery asset`,
        tone: "border-[--color-line-strong]",
        icon: <Coins size={14} />,
        iconClass: "text-[--color-muted]",
      };
    default:
      return {
        text: ev.name,
        tone: "border-[--color-line-strong]",
        icon: <HeartPulse size={14} />,
        iconClass: "text-[--color-muted]",
      };
  }
}

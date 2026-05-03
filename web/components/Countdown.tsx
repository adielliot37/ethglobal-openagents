"use client";
import { fmtCountdown } from "@/lib/utils";

export function CountdownTile({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, ((total - value) / total) * 100) : 100;
  const ratio = total > 0 ? value / total : 1;
  const tone =
    ratio <= 0.15 ? "crit" : ratio <= 0.4 ? "warn" : "ok";

  const valueColor =
    tone === "crit" ? "text-[--color-signal]" : tone === "warn" ? "text-[--color-amber-warn]" : "text-[--color-ink]";
  const barClass =
    tone === "crit"
      ? "bg-[--color-signal]"
      : tone === "warn"
      ? "bg-gradient-to-r from-[--color-amber-warn] to-[--color-signal]"
      : "bg-gradient-to-r from-[--color-willow] to-[--color-ink]";

  return (
    <div className="card-glass relative overflow-hidden p-5">
      <div className="font-mono text-[11px] lowercase text-[--color-muted]">{label}</div>
      <div className={`mt-2 font-mono text-[44px] leading-none tracking-tight transition-colors ${valueColor} ${tone === "crit" ? "animate-pulse-soft" : ""}`}>
        {fmtCountdown(value)}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[rgba(20,20,15,0.06)]">
        <div className={`h-full transition-[width] duration-700 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

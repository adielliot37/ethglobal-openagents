import type { WillStateName } from "@/lib/config";

const styles: Record<WillStateName, string> = {
  Active: "bg-[--color-willow-soft] text-[--color-willow] border-[--color-willow]/40",
  Triggered: "bg-[--color-amber-soft] text-[--color-amber-warn] border-[--color-amber-warn]/40",
  Cancelled: "bg-[rgba(20,20,15,0.06)] text-[--color-muted] border-[--color-line-strong]",
  Executed: "bg-[--color-signal-soft] text-[--color-signal] border-[--color-signal]/40",
};

export function StateBadge({ state }: { state: WillStateName }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] lowercase ${styles[state]}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current" />
      {state.toLowerCase()}
    </span>
  );
}

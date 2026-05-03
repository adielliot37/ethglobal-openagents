"use client";
import { useKeeper } from "@/hooks/useKeeper";
import { shortAddr } from "@/lib/utils";

export function KeeperCard({ tokenId }: { tokenId?: bigint }) {
  const { data } = useKeeper(tokenId);
  const id = tokenId !== undefined ? `#${tokenId.toString()}` : "#—";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[--color-ink] bg-[--color-ink] p-7 text-[--color-bone] shadow-[0_24px_60px_rgba(20,20,15,0.18)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at 80% -10%, rgba(214,218,187,0.18), transparent 50%)",
        }}
      />
      <div className="relative">
        <div className="flex items-baseline justify-between">
          <div className="font-serif-italic text-[56px] leading-none tracking-tight">{id}</div>
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-[rgba(244,241,234,0.5)]">erc-7857</div>
        </div>

        <div className="mt-6 grid gap-2 font-mono text-[12px]">
          {[
            ["ens subname", data?.ensSubname ? shortAddr(data.ensSubname) : "—"],
            ["memory uri", data?.memoryURI || "—"],
            ["alertness", data?.alertnessScore?.toString() ?? "—"],
            ["actions fired", data?.actionsFired?.toString() ?? "—"],
            ["operator", data?.operator ? shortAddr(data.operator) : "—"],
          ].map(([k, v]) => (
            <div
              key={k as string}
              className="flex items-center justify-between gap-3 border-t border-[rgba(244,241,234,0.12)] pt-2"
            >
              <span className="lowercase text-[rgba(244,241,234,0.55)]">{k}</span>
              <span className="max-w-[180px] truncate font-medium">{v as string}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import type { Address } from "viem";
import { shortAddr, ZERO_NODE } from "@/lib/utils";

export function BeneficiariesList({
  items,
}: {
  items: { payoutAddress: Address; ensName: `0x${string}`; sharePoints: number }[];
}) {
  if (!items.length) {
    return <div className="font-mono text-[12px] text-[--color-muted]">none</div>;
  }
  return (
    <ul className="grid gap-1.5">
      {items.map((b, i) => {
        const showEns = b.ensName !== ZERO_NODE;
        return (
          <li
            key={i}
            className="flex items-center justify-between gap-2 rounded-lg bg-[rgba(20,20,15,0.04)] px-3 py-2 font-mono text-[12.5px]"
          >
            <span className="truncate">
              {shortAddr(b.payoutAddress)}{" "}
              <span className="text-[--color-muted]">{showEns ? `· ${shortAddr(b.ensName)}` : ""}</span>
            </span>
            <b>{(b.sharePoints / 100).toFixed(1)}%</b>
          </li>
        );
      })}
    </ul>
  );
}

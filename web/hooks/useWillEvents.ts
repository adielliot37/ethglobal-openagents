"use client";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { decodeEventLog, type Address, type Log } from "viem";
import { willAbi } from "@/lib/abi";

export type WillEvent = {
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  name: string;
  args: Record<string, unknown>;
  ts: number;
};

export function useWillEvents(willAddress?: Address) {
  const client = usePublicClient();
  const [events, setEvents] = useState<WillEvent[]>([]);

  useEffect(() => {
    if (!client || !willAddress) return;
    let cancelled = false;
    let unwatch: (() => void) | null = null;

    (async () => {
      try {
        const latest = await client.getBlockNumber();
        const fromBlock = latest > 5000n ? latest - 5000n : 0n;
        const logs = await client.getLogs({
          address: willAddress,
          fromBlock,
          toBlock: "latest",
        });
        if (cancelled) return;
        const parsed = parseAll(logs);
        setEvents(parsed.reverse());

        unwatch = client.watchContractEvent({
          address: willAddress,
          abi: willAbi,
          onLogs: (newLogs) => {
            const fresh = parseAll(newLogs as Log[]);
            setEvents((prev) => {
              const seen = new Set(prev.map((e) => `${e.txHash}-${e.logIndex}`));
              const merged = [...fresh.filter((e) => !seen.has(`${e.txHash}-${e.logIndex}`)), ...prev];
              return merged.slice(0, 200);
            });
          },
        });
      } catch (e) {
        console.warn("event watch error", e);
      }
    })();

    return () => {
      cancelled = true;
      if (unwatch) unwatch();
    };
  }, [client, willAddress]);

  return events;
}

function parseAll(logs: Log[]): WillEvent[] {
  const out: WillEvent[] = [];
  for (const l of logs) {
    try {
      const parsed = decodeEventLog({ abi: willAbi, data: l.data, topics: l.topics });
      out.push({
        blockNumber: l.blockNumber ?? 0n,
        txHash: l.transactionHash ?? "0x",
        logIndex: l.logIndex ?? 0,
        name: parsed.eventName,
        args: parsed.args as Record<string, unknown>,
        ts: Math.floor(Date.now() / 1000),
      });
    } catch {
      // not one of our events
    }
  }
  return out;
}

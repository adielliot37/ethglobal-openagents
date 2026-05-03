"use client";
import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { keeperAbi } from "@/lib/abi";
import { CONTRACTS } from "@/lib/config";

export type KeeperData = {
  willAddress: Address;
  ensSubname: `0x${string}`;
  memoryURI: string;
  alertnessScore: bigint;
  actionsFired: bigint;
  lastActionAt: bigint;
  operator: Address;
};

export function useKeeper(tokenId?: bigint) {
  const enabled = Boolean(tokenId !== undefined && tokenId !== null);
  const r = useReadContract({
    address: CONTRACTS.keeper,
    abi: keeperAbi,
    functionName: "keepers",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled, refetchInterval: 5000 },
  });

  if (!r.data) return { data: undefined, isLoading: r.isLoading };
  const [willAddress, ensSubname, memoryURI, alertnessScore, actionsFired, lastActionAt, operator] =
    r.data as unknown as [Address, `0x${string}`, string, bigint, bigint, bigint, Address];
  return {
    data: { willAddress, ensSubname, memoryURI, alertnessScore, actionsFired, lastActionAt, operator } as KeeperData,
    isLoading: false,
  };
}

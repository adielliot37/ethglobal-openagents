"use client";
import { useReadContracts, useBlockNumber, useReadContract } from "wagmi";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { willAbi, erc20Abi } from "@/lib/abi";
import { STATE_NAMES, type WillStateName } from "@/lib/config";

export type WillData = {
  address: Address;
  state: WillStateName;
  stateCode: number;
  owner: Address;
  ownerENS: `0x${string}`;
  lastHeartbeat: bigint;
  inactivityPeriod: bigint;
  challengeWindow: bigint;
  triggeredAt: bigint;
  beneficiaries: { payoutAddress: Address; ensName: `0x${string}`; sharePoints: number }[];
  watchedTokens: Address[];
};

export function useWill(address?: Address) {
  const enabled = Boolean(address && address !== "0x0000000000000000000000000000000000000000");
  const { data: block } = useBlockNumber({ watch: true });
  const queryClient = useQueryClient();

  const result = useReadContracts({
    allowFailure: false,
    contracts: enabled
      ? [
          { address, abi: willAbi, functionName: "state" },
          { address, abi: willAbi, functionName: "owner" },
          { address, abi: willAbi, functionName: "ownerENS" },
          { address, abi: willAbi, functionName: "lastHeartbeat" },
          { address, abi: willAbi, functionName: "inactivityPeriod" },
          { address, abi: willAbi, functionName: "challengeWindow" },
          { address, abi: willAbi, functionName: "triggeredAt" },
          { address, abi: willAbi, functionName: "beneficiaries" },
          { address, abi: willAbi, functionName: "getWatchedTokens" },
        ]
      : [],
    query: { enabled, refetchInterval: 4000 },
  });

  useEffect(() => {
    if (block) queryClient.invalidateQueries({ queryKey: ["readContracts"] });
  }, [block, queryClient]);

  if (!result.data || !address) {
    return { data: undefined, isLoading: result.isLoading, error: result.error, refetch: result.refetch };
  }

  const [stateCode, owner, ownerENS, lastHeartbeat, inactivityPeriod, challengeWindow, triggeredAt, bens, watched] =
    result.data as unknown as [
      number,
      Address,
      `0x${string}`,
      bigint,
      bigint,
      bigint,
      bigint,
      { payoutAddress: Address; ensName: `0x${string}`; sharePoints: number }[],
      Address[],
    ];

  const data: WillData = {
    address,
    state: STATE_NAMES[stateCode] ?? "Active",
    stateCode,
    owner,
    ownerENS,
    lastHeartbeat,
    inactivityPeriod,
    challengeWindow,
    triggeredAt,
    beneficiaries: bens,
    watchedTokens: watched,
  };
  return { data, isLoading: false, error: null, refetch: result.refetch };
}

export function useTokenBalances(willAddr?: Address, tokens: Address[] = []) {
  const enabled = Boolean(willAddr) && tokens.length > 0;
  const result = useReadContracts({
    allowFailure: true,
    contracts: enabled
      ? tokens.flatMap((t) => [
          { address: t, abi: erc20Abi, functionName: "balanceOf", args: [willAddr!] } as const,
          { address: t, abi: erc20Abi, functionName: "symbol" } as const,
          { address: t, abi: erc20Abi, functionName: "decimals" } as const,
        ])
      : [],
    query: { enabled, refetchInterval: 6000 },
  });

  if (!result.data) return [];
  const out: { token: Address; balance: bigint; symbol: string; decimals: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const baseIdx = i * 3;
    out.push({
      token: tokens[i],
      balance: (result.data[baseIdx]?.result as bigint | undefined) ?? 0n,
      symbol: (result.data[baseIdx + 1]?.result as string | undefined) ?? "?",
      decimals: (result.data[baseIdx + 2]?.result as number | undefined) ?? 18,
    });
  }
  return out;
}

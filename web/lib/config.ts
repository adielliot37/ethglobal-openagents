import { baseSepolia } from "wagmi/chains";
import type { Address } from "viem";

export const APP_CHAIN = baseSepolia;

const env = (key: string, fallback = ""): string => {
  if (typeof process !== "undefined" && process.env[key]) return process.env[key]!;
  return fallback;
};

export const CONTRACTS = {
  factory: env("NEXT_PUBLIC_FACTORY_ADDRESS", "0x0000000000000000000000000000000000000000") as Address,
  keeper: env("NEXT_PUBLIC_KEEPER_ADDRESS", "0x0000000000000000000000000000000000000000") as Address,
  usdc: env("NEXT_PUBLIC_USDC_ADDRESS", "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address,
  universalRouter: env(
    "NEXT_PUBLIC_UNIVERSAL_ROUTER",
    "0x492E6456D9528771018DeB9E87ef7750EF184104"
  ) as Address,
  permit2: env("NEXT_PUBLIC_PERMIT2", "0x000000000022D473030F116dDEE9F6B43aC78BA3") as Address,
};

export const RPC_URL = env("NEXT_PUBLIC_BASE_SEPOLIA_RPC", "https://sepolia.base.org");
export const WC_PROJECT_ID = env("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "demo");
export const EXPLORER = "https://sepolia.basescan.org";

export const STATE_NAMES = ["Active", "Triggered", "Cancelled", "Executed"] as const;
export type WillStateName = (typeof STATE_NAMES)[number];

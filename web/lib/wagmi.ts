"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { RPC_URL, WC_PROJECT_ID } from "./config";

export const wagmiConfig = getDefaultConfig({
  appName: "wallet.will",
  projectId: WC_PROJECT_ID || "wallet-will-demo",
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(RPC_URL),
  },
  ssr: true,
});

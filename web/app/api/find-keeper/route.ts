import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { factoryAbi } from "@/lib/abi";
import { CONTRACTS, RPC_URL } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const will = url.searchParams.get("will");
  if (!will) return NextResponse.json({ error: "missing will" }, { status: 400 });

  try {
    const client = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
    const latest = await client.getBlockNumber();
    const fromBlock = latest > 50_000n ? latest - 50_000n : 0n;
    const logs = await client.getContractEvents({
      address: CONTRACTS.factory,
      abi: factoryAbi,
      eventName: "WillCreated",
      args: { willAddress: will as `0x${string}` },
      fromBlock,
      toBlock: "latest",
    });
    if (!logs.length) return NextResponse.json({ tokenId: null });
    const tokenId = (logs[0].args as { keeperTokenId: bigint }).keeperTokenId;
    return NextResponse.json({ tokenId: tokenId.toString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

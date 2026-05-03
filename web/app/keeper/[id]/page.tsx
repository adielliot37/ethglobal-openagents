"use client";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useReadContract } from "wagmi";
import { keeperAbi } from "@/lib/abi";
import { CONTRACTS, EXPLORER } from "@/lib/config";
import { useKeeper } from "@/hooks/useKeeper";
import { KeeperCard } from "@/components/KeeperCard";
import { shortAddr } from "@/lib/utils";

export default function KeeperPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const tokenId = BigInt(id);
  const { data } = useKeeper(tokenId);

  const { data: nftOwner } = useReadContract({
    address: CONTRACTS.keeper,
    abi: keeperAbi,
    functionName: "ownerOf",
    args: [tokenId],
    query: { enabled: !!tokenId },
  });

  return (
    <div className="mx-auto max-w-[1240px] px-5 pb-24 pt-10 sm:px-8">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 font-mono text-[12px] text-[--color-muted] hover:text-[--color-ink]"
      >
        <ArrowLeft size={12} /> home
      </Link>

      <header className="mb-10">
        <div className="font-mono text-[11.5px] lowercase text-[--color-muted]">willkeeper inft</div>
        <h1 className="mt-2 text-[32px] font-semibold tracking-tight sm:text-[44px]">
          <span className="font-serif-italic">keeper</span> #{id}
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <KeeperCard tokenId={tokenId} />

        <div className="grid gap-6">
          <div className="card-glass p-6">
            <div className="mb-4 font-serif-italic text-[20px]">on-chain references</div>
            <div className="grid gap-2 font-mono text-[12px] text-[--color-muted]">
              <Row k="erc-721 contract">
                <a
                  className="inline-flex items-center gap-1 text-[--color-ink] hover:underline"
                  href={`${EXPLORER}/address/${CONTRACTS.keeper}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddr(CONTRACTS.keeper)} <ExternalLink size={11} />
                </a>
              </Row>
              <Row k="watched will">
                {data?.willAddress ? (
                  <Link href={`/will/${data.willAddress}`} className="text-[--color-ink] hover:underline">
                    {shortAddr(data.willAddress)}
                  </Link>
                ) : (
                  "—"
                )}
              </Row>
              <Row k="nft owner">{nftOwner ? shortAddr(nftOwner as string) : "—"}</Row>
              <Row k="agent operator">{data?.operator ? shortAddr(data.operator) : "—"}</Row>
              <Row k="ens subname">{data?.ensSubname ? shortAddr(data.ensSubname) : "—"}</Row>
              <Row k="memory uri" mono>
                <span className="break-all text-[--color-ink]">{data?.memoryURI || "—"}</span>
              </Row>
            </div>
          </div>

          <div className="card-glass p-6">
            <div className="mb-3 font-serif-italic text-[20px]">what this iNFT does</div>
            <p className="text-[14px] leading-[1.55] text-[--color-muted]">
              The WillKeeper is an ERC-7857-compatible iNFT. Its owner controls who operates the agent. The agent runs a
              long-running Python loop that watches the linked Will, fires <code className="font-mono">triggerWill()</code>{" "}
              and <code className="font-mono">execute()</code> through KeeperHub at the right moments, and persists every
              decision to <span className="text-[--color-ink]">0G Storage</span>. The token's URI points to the most recent
              memory blob, so anyone can audit what the agent has been doing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, children, mono }: { k: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${mono ? "items-start" : ""}`}>
      <span className="lowercase">{k}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

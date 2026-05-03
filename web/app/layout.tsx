import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { TopBar } from "@/components/TopBar";
import { AmbientOrbs } from "@/components/AmbientOrbs";

export const metadata: Metadata = {
  title: "wallet.will — onchain inheritance",
  description:
    "Non-custodial, time-locked crypto inheritance. Heartbeat, or your WillKeeper iNFT will execute.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Instrument+Serif&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen overflow-x-hidden">
        <Providers>
          <AmbientOrbs />
          <TopBar />
          <main className="relative z-[1]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

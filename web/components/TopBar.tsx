"use client";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function TopBar() {
  const [open, setOpen] = useState(false);
  const navItems = [
    { href: "/", label: "home" },
    { href: "/dashboard", label: "dashboard" },
    { href: "/#how", label: "how it works" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[--color-line] bg-[rgba(244,241,234,0.72)] backdrop-blur">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative inline-block h-3.5 w-3.5 rounded animate-pulse-soft bg-[--color-ink] ring-[3px] ring-[--color-bone] ring-offset-1 ring-offset-[--color-ink]" />
          <span className="text-[17px] font-semibold tracking-tight">wallet.will</span>
          <span className="hidden font-mono text-[11px] uppercase tracking-wide text-[--color-muted] sm:inline-block">
            <span className="rounded-full border border-[--color-line-strong] px-2 py-[3px] lowercase">
              v0.1 · base sepolia
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative text-sm font-medium text-[--color-ink-soft] transition-colors hover:text-[--color-ink]"
            >
              {item.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[--color-ink] transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <ConnectButton chainStatus="icon" accountStatus="address" showBalance={false} />
        </div>

        <button
          aria-label="menu"
          onClick={() => setOpen(!open)}
          className="rounded-full border border-[--color-line-strong] p-2 md:hidden"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[--color-line] bg-[rgba(244,241,234,0.95)] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-[--color-ink-soft]"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2">
              <ConnectButton chainStatus="icon" accountStatus="address" showBalance={false} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

import Link from "next/link";
import { ArrowRight, HeartPulse, Hourglass, ShieldCheck, Wallet } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative">
      {/* HERO */}
      <section className="mx-auto max-w-[1240px] px-5 pb-16 pt-20 sm:px-8 sm:pt-28">
        <div className="max-w-[920px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[--color-line-strong] px-3.5 py-1.5 font-mono text-[11.5px] lowercase text-[--color-muted]">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[--color-signal]" />
            non-custodial · time-locked · agent-watched
          </div>
          <h1 className="mt-6 text-[clamp(40px,7vw,76px)] font-semibold leading-[1.02] tracking-[-0.035em]">
            Your wallet, <span className="font-serif-italic">when you can&apos;t speak for it</span>.
          </h1>
          <p className="mt-5 max-w-[640px] text-[17px] leading-[1.55] text-[--color-muted]">
            A heartbeat-driven inheritance vault. Stop pinging, and a{" "}
            <span className="font-medium text-[--color-ink]">WillKeeper iNFT</span> auto-sweeps your assets through
            Uniswap into USDC and distributes them to ENS-named beneficiaries — with a challenge window so false alarms
            don&apos;t cost you a thing.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full bg-[--color-ink] px-5 py-3 text-[14px] font-medium text-[--color-bone] transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              open dashboard
              <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-[--color-ink] px-5 py-3 text-[14px] font-medium text-[--color-ink] transition hover:bg-[--color-ink] hover:text-[--color-bone]"
            >
              how it works
            </Link>
          </div>
        </div>

        {/* hero stat strip */}
        <div className="mt-14 grid grid-cols-2 gap-4 border-t border-[--color-line-strong] pt-7 sm:grid-cols-4 sm:gap-6">
          {[
            { num: "24/7", label: "agent uptime" },
            { num: "ERC-7857", label: "inft standard" },
            { num: "Uniswap", label: "swap rails" },
            { num: "0.0%", label: "platform fees" },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-mono text-[26px] font-medium tracking-tight text-[--color-ink]">{s.num}</div>
              <div className="mt-1.5 text-[12px] lowercase text-[--color-muted]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-[1240px] px-5 pb-16 sm:px-8">
        <div className="mb-10 flex items-baseline gap-3">
          <h2 className="font-serif-italic text-[34px] leading-none">how it works</h2>
          <span className="font-mono text-[12px] lowercase text-[--color-muted]">four states. no surprises.</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: "01",
              icon: <HeartPulse size={18} />,
              title: "register",
              body: "Spawn a Will contract + mint a WillKeeper iNFT in one tx. Set your inactivity timer, challenge window, and beneficiaries.",
            },
            {
              n: "02",
              icon: <Wallet size={18} />,
              title: "fund",
              body: "Send any ERC-20 you want to bequeath into the will. The contract holds it; nobody else can move it.",
            },
            {
              n: "03",
              icon: <Hourglass size={18} />,
              title: "heartbeat",
              body: "Tap heartbeat once per period. The keeper sees you alive and goes back to sleep. Skip pings — the timer runs out.",
            },
            {
              n: "04",
              icon: <ShieldCheck size={18} />,
              title: "execute",
              body: "After the challenge window, anyone can call execute(). Tokens get swapped to USDC and distributed by share.",
            },
          ].map((step, i) => (
            <div
              key={step.n}
              className="card-glass relative animate-fade-up p-6"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] lowercase text-[--color-muted]">{step.n}</span>
                <span className="text-[--color-muted]">{step.icon}</span>
              </div>
              <h3 className="mt-4 font-serif-italic text-[22px] leading-none">{step.title}</h3>
              <p className="mt-3 text-[13.5px] leading-[1.55] text-[--color-muted]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRIZE TRACKS / INTEGRATIONS */}
      <section className="mx-auto max-w-[1240px] px-5 pb-24 sm:px-8">
        <div className="mb-10 flex items-baseline gap-3">
          <h2 className="font-serif-italic text-[34px] leading-none">stack</h2>
          <span className="font-mono text-[12px] lowercase text-[--color-muted]">four protocols. one estate.</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              h: "uniswap",
              s: "universal router · v3",
              p: "Will.execute() iterates watched ERC-20s, builds an EXACT_IN swap path through the Universal Router, and converts everything to USDC before distribution.",
            },
            {
              h: "ens",
              s: "sepolia · text records · subnames",
              p: "Owner ENS holds the will pointer, encrypted document, and live state. *.wills.eth wildcard subnames give every keeper a discoverable name.",
            },
            {
              h: "0g",
              s: "storage · chain · inft",
              p: "WillKeeper is an ERC-7857-compatible iNFT. The agent's memory — every decision, every alertness tick — is persisted to 0G Storage and linked from the token URI.",
            },
            {
              h: "keeperhub",
              s: "execution · priority · retry",
              p: "Critical txns route through KeeperHub MCP with priority + retry guarantees. Owner reminders are low; triggerWill is normal; execute is critical with retry on.",
            },
          ].map((it) => (
            <div key={it.h} className="card-glass p-7">
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif-italic text-[28px] leading-none">{it.h}</h3>
                <span className="font-mono text-[11px] lowercase text-[--color-muted]">{it.s}</span>
              </div>
              <p className="mt-3.5 text-[14px] leading-[1.55] text-[--color-muted]">{it.p}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto mb-20 flex max-w-[1240px] flex-wrap items-center justify-center gap-3 px-5 font-mono text-[12px] text-[--color-muted] sm:px-8">
        <span>built at ethglobal · 2026</span>
        <span className="opacity-40">·</span>
        <a
          href="https://github.com/adielliot37/ethglobal-openagents"
          target="_blank"
          rel="noreferrer"
          className="text-[--color-ink] hover:underline"
        >
          github
        </a>
        <span className="opacity-40">·</span>
        <span>uniswap · ens · 0g · keeperhub</span>
      </footer>
    </div>
  );
}

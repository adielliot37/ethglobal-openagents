"use client";
import { createContext, useCallback, useContext, useState } from "react";

type Tone = "info" | "success" | "error";
type Toast = { id: number; tone: Tone; message: string };

const ToastCtx = createContext<{ push: (m: string, tone?: Tone) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-fade-up rounded-xl border px-4 py-3 font-mono text-[12.5px] shadow-lg backdrop-blur ${
              t.tone === "success"
                ? "border-[--color-willow]/40 bg-[--color-willow-soft] text-[--color-willow]"
                : t.tone === "error"
                ? "border-[--color-signal]/40 bg-[--color-signal-soft] text-[--color-signal]"
                : "border-[--color-line-strong] bg-[rgba(255,255,255,0.85)] text-[--color-ink]"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("ToastProvider missing");
  return ctx;
}

"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-[--color-ink] text-[--color-bone] border border-[--color-ink] hover:-translate-y-0.5 hover:shadow-lg",
  secondary:
    "bg-transparent text-[--color-ink] border border-[--color-ink] hover:bg-[--color-ink] hover:text-[--color-bone]",
  ghost:
    "bg-transparent text-[--color-muted] border border-[--color-line-strong] hover:text-[--color-ink] hover:border-[--color-ink]",
  danger:
    "bg-[--color-signal] text-[--color-bone] border border-[--color-signal] hover:bg-[#91241a] hover:border-[#91241a]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", loading, className = "", children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-medium tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
});

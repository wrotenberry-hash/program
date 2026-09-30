import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* Placeholder components. Deliberately plain; the designer replaces these. */

export function Button({ className = "", variant = "primary", ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" }) {
  const base = "inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-base font-semibold transition active:scale-[0.99] disabled:opacity-50";
  const look = variant === "primary" ? "bg-accent text-accent-ink" : "border border-line bg-surface text-ink";
  return <button className={`${base} ${look} ${className}`} {...props} />;
}

export function LinkButton({ className = "", variant = "primary", ...props }: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  const base = "inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-base font-semibold transition active:scale-[0.99]";
  const look = variant === "primary" ? "bg-accent text-accent-ink" : "border border-line bg-surface text-ink";
  return <Link className={`${base} ${look} ${className}`} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-accent" {...props} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-accent" {...props} />;
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      {title ? <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  const look = tone === "error" ? "border-red-500/40 bg-red-500/10 text-ink" : "border-line bg-surface text-ink";
  return <p className={`rounded-xl border px-3 py-2 text-sm ${look}`} role={tone === "error" ? "alert" : undefined}>{children}</p>;
}

export function Wordmark() {
  return (
    <Link href="/" className="text-lg font-black tracking-tight text-ink">
      Program
    </Link>
  );
}

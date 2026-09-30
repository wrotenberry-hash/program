import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* Game-skinned primitives. docs/design.md is the spec. */

type Variant = "primary" | "gold" | "go" | "secondary" | "faction";

const face: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink [--btn-edge:#1f4bc4] [--glow:rgba(62,123,255,0.55)]",
  gold: "bg-gold text-gold-ink [--btn-edge:#b47a00] [--glow:rgba(255,201,74,0.6)]",
  go: "bg-go text-go-ink [--btn-edge:#158a48] [--glow:rgba(61,220,132,0.6)]",
  faction: "bg-faction text-white [--btn-edge:#5a3fc0] [--glow:rgba(167,139,250,0.55)]",
  secondary: "bg-surface-2 text-ink border border-line [--btn-edge:var(--line)] [--glow:transparent]",
};

const btnBase =
  "btn-3d inline-flex h-[52px] w-full select-none items-center justify-center gap-2 rounded-2xl px-4 text-base font-extrabold tracking-tight";

export function Button({ className = "", variant = "primary", pulse = false, ...props }: ComponentProps<"button"> & { variant?: Variant; pulse?: boolean }) {
  return <button className={`${btnBase} ${face[variant]} ${pulse ? "pulse" : ""} ${className}`} {...props} />;
}

export function LinkButton({ className = "", variant = "primary", pulse = false, ...props }: ComponentProps<typeof Link> & { variant?: Variant; pulse?: boolean }) {
  return <Link className={`${btnBase} ${face[variant]} ${pulse ? "pulse" : ""} ${className}`} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

const control = "h-[52px] w-full rounded-2xl border-2 border-line bg-surface px-4 text-base font-semibold text-ink outline-none focus:border-primary";
export function Input(props: ComponentProps<"input">) {
  return <input className={control} {...props} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select className={control} {...props} />;
}

type Accent = "primary" | "gold" | "go" | "power" | "faction";
const stripe: Record<Accent, string> = {
  primary: "from-primary to-[#7aa7ff]",
  gold: "from-gold to-[#ffe08a]",
  go: "from-go to-[#8ff0bb]",
  power: "from-power to-[#ffb067]",
  faction: "from-faction to-[#d2c4ff]",
};
const pill: Record<Accent, string> = {
  primary: "bg-primary text-primary-ink",
  gold: "bg-gold text-gold-ink",
  go: "bg-go text-go-ink",
  power: "bg-power text-white",
  faction: "bg-faction text-white",
};

export function Card({ title, accent = "primary", icon, action, children }: { title?: string; accent?: Accent; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel overflow-hidden rounded-3xl border border-line bg-surface">
      <div className={`h-1.5 bg-gradient-to-r ${stripe[accent]}`} />
      <div className="p-4">
        {title ? (
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider ${pill[accent]}`}>
              {icon}
              {title}
            </span>
            {action}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  const look = tone === "error" ? "border-danger/50 bg-danger/10 text-ink" : "border-line bg-surface-2 text-ink";
  return (
    <p className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${look}`} role={tone === "error" ? "alert" : undefined}>
      {children}
    </p>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="text-xl font-black tracking-tight text-ink">
      Program
    </Link>
  );
}

/** Top strip of resources, like a game HUD. */
export function Hud({ items }: { items: { icon: ReactNode; label: string; value: string; tone: Accent }[] }) {
  const tones: Record<Accent, string> = {
    primary: "text-primary",
    gold: "text-gold",
    go: "text-go",
    power: "text-power",
    faction: "text-faction",
  };
  return (
    <div className="flex gap-2">
      {items.map((it) => (
        <div key={it.label} className="panel flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2">
          <span className={tones[it.tone]}>{it.icon}</span>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">{it.label}</div>
            <div className="truncate text-base font-black leading-tight">{it.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Level pips for a facility. */
export function Pips({ level, max = 5, tone = "primary" }: { level: number; max?: number; tone?: Accent }) {
  const on: Record<Accent, string> = { primary: "bg-primary", gold: "bg-gold", go: "bg-go", power: "bg-power", faction: "bg-faction" };
  return (
    <span className="inline-flex gap-1" aria-label={`level ${level} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`h-2 w-3 rounded-full ${i < level ? on[tone] : "bg-line"}`} />
      ))}
    </span>
  );
}

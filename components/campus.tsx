"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button, Pips } from "@/components/ui";
import { Coin, Hammer } from "@/components/icons";
import { Countdown } from "@/components/countdown";
import { buildingArt, buildingTier } from "@/lib/art";
import { formatCash, formatDuration } from "@/lib/format";
import type { FacilityRow, LevelRow } from "@/components/program-view";

type Action = (formData: FormData) => void | Promise<void>;

/**
 * Where each building stands on the lawn, as percentages of the campus box.
 * Later entries draw on top, so the order runs back to front.
 */
const SPOTS: Record<string, { left: number; top: number; width: number }> = {
  stadium: { left: 19, top: 0, width: 62 },
  "booster-club": { left: 0, top: 26, width: 46 },
  "weight-room": { left: 54, top: 26, width: 46 },
  "practice-facility": { left: 27, top: 44, width: 46 },
  "film-room": { left: 0, top: 62, width: 46 },
  "academic-center": { left: 54, top: 62, width: 46 },
};

/** Bigger looks sit bigger: an upgrade should be visible from across the lawn. */
const TIER_SCALE = { 1: 0.82, 2: 0.91, 3: 1 } as const;

type State = "ready" | "building" | "unbuilt" | "built";

export function Campus({
  rows,
  levels,
  cash,
  busy,
  startUpgrade,
  claimUpgrade,
}: {
  rows: FacilityRow[];
  levels: LevelRow[];
  cash: number;
  busy: boolean;
  startUpgrade: Action;
  claimUpgrade: Action;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const levelOf = (id: string, level: number) => levels.find((l) => l.facility_id === id && l.level === level);
  const stateOf = (r: FacilityRow): State =>
    r.upgrade_to !== null && r.upgrade_completes_at
      ? new Date(r.upgrade_completes_at).getTime() <= now
        ? "ready"
        : "building"
      : r.level === 0
        ? "unbuilt"
        : "built";
  const placed = rows.filter((r) => SPOTS[r.facility_id]).sort((a, b) => SPOTS[a.facility_id].top - SPOTS[b.facility_id].top);
  const sel = rows.find((r) => r.facility_id === open) ?? null;

  return (
    <>
      <div className="relative w-full overflow-hidden rounded-3xl" style={{ aspectRatio: "1 / 1.3" }}>
        {/* The lawn: two greens and a path, drawn so the buildings have ground to stand on. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#b9eb8f_0%,#8fd46a_55%,#6fbf55_100%)]" />
        <div className="absolute left-1/2 top-[8%] h-[92%] w-[14%] -translate-x-1/2 rounded-full bg-[#f3e9cf]/70 blur-[1px]" />
        <div className="absolute left-0 top-[57%] h-[7%] w-full bg-[#f3e9cf]/60 blur-[1px]" />

        {placed.map((r) => {
          const spot = SPOTS[r.facility_id];
          const art = buildingArt(r.facility_id, Math.max(1, r.level));
          const st = stateOf(r);
          const next = levelOf(r.facility_id, r.level + 1);
          const canUpgrade = st !== "building" && st !== "ready" && !!next && cash >= next.cost && !busy;
          const scale = TIER_SCALE[buildingTier(Math.max(1, r.level))];
          return (
            <button
              key={r.facility_id}
              type="button"
              onClick={() => setOpen(r.facility_id)}
              aria-label={`${r.facility.name}, ${r.level === 0 ? "not built" : `level ${r.level}`}${st === "ready" ? ", ready to claim" : ""}`}
              className="campus-bldg absolute flex flex-col items-center"
              style={{ left: `${spot.left}%`, top: `${spot.top}%`, width: `${spot.width}%` }}
            >
              {art ? (
                <Image
                  src={art}
                  alt=""
                  width={480}
                  height={480}
                  unoptimized
                  priority={r.facility_id === "stadium"}
                  className={`h-auto w-full drop-shadow-[0_6px_6px_rgba(18,26,58,0.25)] transition-transform ${st === "unbuilt" ? "opacity-45 grayscale" : ""} ${st === "ready" ? "bob" : ""}`}
                  style={{ transform: `scale(${scale})` }}
                />
              ) : null}
              <span className="-mt-[14%] flex items-center gap-1">
                {st === "ready" ? (
                  <span className="pulse rounded-full bg-go px-2.5 py-1 text-[11px] font-black text-go-ink [--btn-edge:#158a48] [--glow:rgba(61,220,132,0.6)]">
                    Ready!
                  </span>
                ) : st === "building" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[11px] font-black shadow">
                    <Hammer size={12} className="text-primary" />
                    <Countdown until={r.upgrade_completes_at!} onDoneLabel="Ready!" />
                  </span>
                ) : st === "unbuilt" ? (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black shadow ${canUpgrade ? "bg-primary text-primary-ink" : "bg-surface text-ink-muted"}`}>
                    Build
                  </span>
                ) : (
                  <span className="rounded-full bg-surface px-2 py-1 text-[11px] font-black tabular-nums shadow">
                    Lv {r.level}
                    {canUpgrade ? <span className="ml-1 text-gold">▲</span> : null}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {sel ? (
        <BuildingSheet
          r={sel}
          state={stateOf(sel)}
          cur={levelOf(sel.facility_id, sel.level)}
          next={levelOf(sel.facility_id, sel.level + 1)}
          cash={cash}
          busy={busy}
          waiting={rows.find((x) => x.facility_id !== sel.facility_id && stateOf(x) === "ready")?.facility.name ?? null}
          onClose={() => setOpen(null)}
          startUpgrade={startUpgrade}
          claimUpgrade={claimUpgrade}
        />
      ) : null}
    </>
  );
}

function BuildingSheet({
  r,
  state,
  cur,
  next,
  cash,
  busy,
  waiting,
  onClose,
  startUpgrade,
  claimUpgrade,
}: {
  r: FacilityRow;
  state: State;
  cur?: LevelRow;
  next?: LevelRow;
  cash: number;
  busy: boolean;
  /** A finished building still waiting to be claimed; the crew stays there until it is. */
  waiting: string | null;
  onClose: () => void;
  startUpgrade: Action;
  claimUpgrade: Action;
}) {
  const art = buildingArt(r.facility_id, Math.max(1, state === "ready" || state === "building" ? (r.upgrade_to ?? r.level) : r.level || 1));
  const gain = next ? (next.power ?? 0) - (cur?.power ?? 0) : 0;
  const canAfford = next ? cash >= next.cost : false;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={r.facility.name}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#121a3a]/40" />
      <div className="panel relative w-full max-w-md rounded-t-3xl border border-line bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center gap-3">
          {art ? <Image src={art} alt="" width={480} height={480} unoptimized className="size-28 shrink-0 object-contain" /> : null}
          <div className="min-w-0">
            <h2 className="text-2xl font-black leading-tight">{r.facility.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs font-bold text-ink-muted">
              <Pips level={r.level} tone={r.facility_id === "booster-club" ? "gold" : "primary"} />
              {r.level === 0 ? "Not built" : `Lv ${r.level}`}
            </div>
            <p className="mt-1 text-sm font-semibold text-ink-muted">{r.facility.description}</p>
          </div>
        </div>

        {next && state !== "ready" ? (
          <div className="mt-3 flex gap-2 text-sm font-black tabular-nums">
            <span className="rounded-full bg-surface-2 px-3 py-1 text-power">+{gain} power</span>
            {next.income_per_hour ? <span className="rounded-full bg-surface-2 px-3 py-1 text-gold">{formatCash(next.income_per_hour)}/hr</span> : null}
          </div>
        ) : null}

        <div className="mt-4">
          {state === "ready" ? (
            <form action={claimUpgrade} onSubmit={() => setTimeout(onClose, 0)}>
              <input type="hidden" name="facility_id" value={r.facility_id} />
              <Button type="submit" variant="go" pulse>
                Claim level {r.upgrade_to}
              </Button>
            </form>
          ) : state === "building" ? (
            <Button type="button" variant="secondary" disabled>
              <Hammer size={18} /> Under construction · <Countdown until={r.upgrade_completes_at!} onDoneLabel="Ready!" />
            </Button>
          ) : next ? (
            <form action={startUpgrade} onSubmit={() => setTimeout(onClose, 0)}>
              <input type="hidden" name="facility_id" value={r.facility_id} />
              <Button type="submit" variant={canAfford && !busy ? "primary" : "secondary"} disabled={busy || !canAfford}>
                <Hammer size={18} />
                {r.level === 0 ? "Build" : `Upgrade to Lv ${r.level + 1}`} · <Coin size={16} /> {formatCash(next.cost)} · {formatDuration(next.duration_seconds)}
              </Button>
              {busy ? (
                <p className="mt-2 text-center text-xs font-semibold text-ink-muted">
                  {waiting ? `The crew is waiting at the ${waiting}. Claim it first.` : "One crew, one job at a time. They're on another building."}
                </p>
              ) : !canAfford ? (
                <p className="mt-2 text-center text-xs font-semibold text-ink-muted">
                  Need {formatCash(next.cost - cash)} more. Collect from your boosters.
                </p>
              ) : null}
            </form>
          ) : (
            <p className="text-center text-sm font-black text-ink-muted">Maxed out. This one&apos;s finished.</p>
          )}
        </div>
      </div>
    </div>
  );
}

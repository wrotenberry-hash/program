"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button, Pips } from "@/components/ui";
import { Coin, Hammer } from "@/components/icons";
import { Countdown } from "@/components/countdown";
import { buildingArt, buildingTier } from "@/lib/art";
import { formatCash, formatDuration } from "@/lib/format";
import type { FacilityRow, LevelRow } from "@/components/program-view";

type Action = (formData: FormData) => void | Promise<void>;
export type BuildingState = "ready" | "building" | "unbuilt" | "built";

/*
 * The campus is one isometric map: a grid of ground tiles (2:1, matching the
 * building art), walkways between blocks, and the six buildings on their
 * lots. gx runs down-right on screen, gy runs down-left.
 */
const TW = 96; // tile width on screen, px
const TH = TW / 2;
const COLS = 10;
const ROWS = 10;
const TOP = 230; // room above the grid for the tallest buildings
const BOTTOM = 190; // room below for the bottom bar
const MAP_W = (COLS + ROWS) * (TW / 2);
const MAP_H = TOP + (COLS + ROWS) * (TH / 2) + BOTTOM;
const OX = ROWS * (TW / 2);

/** Screen position of grid corner (gx, gy). */
const at = (gx: number, gy: number) => ({ x: OX + (gx - gy) * (TW / 2), y: TOP + (gx + gy) * (TH / 2) });

/*
 * Walkways at 3 and 7 on both axes cut the grid into nine blocks. The stadium
 * is the headquarters in the middle block; the others ring it; the corner
 * blocks hold a parking lot and trees.
 */
const ROAD_GX = new Set([3, 7]);
const ROAD_GY = new Set([3, 7]);
const LOTS: Record<string, { gx: number; gy: number; n: number }> = {
  stadium: { gx: 4, gy: 4, n: 3 },
  "academic-center": { gx: 0.5, gy: 0.5, n: 2 },
  "booster-club": { gx: 4.5, gy: 0.5, n: 2 },
  "weight-room": { gx: 0.5, gy: 4.5, n: 2 },
  "practice-facility": { gx: 8, gy: 4.5, n: 2 },
  "film-room": { gx: 4.5, gy: 8, n: 2 },
};
const PARKING = { gx: 8, gy: 8, n: 2 };
/** Trees on the spare tiles. */
const TREES: [number, number][] = [
  [0, 0], [2, 0], [0, 2], [2, 2.2],
  [4, 0], [6.2, 0], [6.2, 2.2], [4, 2.4],
  [0, 4], [2.4, 4], [0, 6.2], [2.2, 6.2],
  [8, 0], [9, 0], [8.2, 1.2], [9, 2], [8, 2.4],
  [0, 8], [0, 9], [1.2, 8.2], [2, 9], [2.4, 8],
  [9, 4], [9, 6.2], [8, 6.6], [4, 9], [6.2, 9], [6.6, 8],
];
const TIER_SCALE = { 1: 0.9, 2: 0.95, 3: 1 } as const;

export function buildingState(r: FacilityRow, now: number): BuildingState {
  if (r.upgrade_to !== null && r.upgrade_completes_at) return new Date(r.upgrade_completes_at).getTime() <= now ? "ready" : "building";
  return r.level === 0 ? "unbuilt" : "built";
}

function diamond(gx: number, gy: number, w = 1, h = 1): string {
  const a = at(gx, gy), b = at(gx + w, gy), c = at(gx + w, gy + h), d = at(gx, gy + h);
  return `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`;
}

/** The ground: grass, walkways, and a paved lot under every building. */
function Ground() {
  const tiles: React.ReactNode[] = [];
  for (let gx = 0; gx < COLS; gx++)
    for (let gy = 0; gy < ROWS; gy++) {
      const road = ROAD_GX.has(gx) || ROAD_GY.has(gy);
      const fill = road ? "#efe3c6" : (gx + gy) % 2 ? "#9ed672" : "#97cf6b";
      tiles.push(<polygon key={`${gx}-${gy}`} points={diamond(gx, gy)} fill={fill} stroke={road ? "#e2d2ae" : "none"} strokeWidth={1} />);
    }
  const lots = Object.entries(LOTS).map(([id, l]) => (
    <polygon key={id} points={diamond(l.gx - 0.05, l.gy - 0.05, l.n + 0.1, l.n + 0.1)} fill="#e6d8b8" stroke="#d6c39b" strokeWidth={2} />
  ));
  // A parking lot in the far corner: asphalt and white stall lines.
  const pk = PARKING;
  const stalls = Array.from({ length: 5 }, (_, i) => {
    const a = at(pk.gx + 0.2 + i * 0.4, pk.gy + 0.15), b = at(pk.gx + 0.2 + i * 0.4, pk.gy + 0.8);
    const c = at(pk.gx + 0.2 + i * 0.4, pk.gy + pk.n - 0.8), d = at(pk.gx + 0.2 + i * 0.4, pk.gy + pk.n - 0.15);
    return (
      <g key={i} stroke="#ffffff" strokeWidth={2} strokeOpacity={0.85}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <line x1={c.x} y1={c.y} x2={d.x} y2={d.y} />
      </g>
    );
  });
  // The grid's outer edge, drawn as a raised curb so the campus reads as one place.
  const edge = [at(0, 0), at(COLS, 0), at(COLS, ROWS), at(0, ROWS)];
  const lip = 14;
  return (
    <svg className="absolute left-0 top-0" width={MAP_W} height={MAP_H} aria-hidden="true">
      <polygon
        points={`${edge[1].x},${edge[1].y} ${edge[2].x},${edge[2].y} ${edge[3].x},${edge[3].y} ${edge[3].x},${edge[3].y + lip} ${edge[2].x},${edge[2].y + lip} ${edge[1].x},${edge[1].y + lip}`}
        fill="#6aa84a"
      />
      {tiles}
      {lots}
      <polygon points={diamond(pk.gx, pk.gy, pk.n, pk.n)} fill="#7d8aa8" stroke="#6a7694" strokeWidth={2} />
      {stalls}
      {/* Center-line dashes on the walkways. */}
      {[...ROAD_GY].map((gy) => {
        const a = at(0, gy + 0.5), b = at(COLS, gy + 0.5);
        return <line key={`ry${gy}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeOpacity={0.7} strokeWidth={3} strokeDasharray="10 12" />;
      })}
      {[...ROAD_GX].map((gx) => {
        const a = at(gx + 0.5, 0), b = at(gx + 0.5, ROWS);
        return <line key={`rx${gx}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeOpacity={0.7} strokeWidth={3} strokeDasharray="10 12" />;
      })}
    </svg>
  );
}

function Tree({ gx, gy }: { gx: number; gy: number }) {
  const p = at(gx + 0.5, gy + 0.5);
  return (
    <svg
      className="pointer-events-none absolute"
      style={{ left: p.x - 22, top: p.y - 50, zIndex: Math.round((gx + gy + 1) * 10) }}
      width={44}
      height={60}
      viewBox="0 0 44 60"
      aria-hidden="true"
    >
      <ellipse cx="22" cy="52" rx="15" ry="6" fill="#000" opacity="0.15" />
      <rect x="19" y="36" width="6" height="14" rx="2" fill="#8a5a33" />
      <circle cx="22" cy="24" r="16" fill="#3f9a3a" />
      <circle cx="15" cy="20" r="9" fill="#58b44a" />
      <circle cx="27" cy="16" r="8" fill="#6cc455" />
    </svg>
  );
}

/** Centers the scrollable map on a point the first time it renders. */
function useCenterOn(ref: React.RefObject<HTMLDivElement | null>, x: number, y: number) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = x - el.clientWidth / 2;
    el.scrollTop = Math.max(0, y - el.clientHeight * 0.5);
  }, [ref, x, y]);
}

export function CampusMap({
  rows,
  levels,
  cash,
  busy,
  accrued,
  capped,
  startUpgrade,
  claimUpgrade,
  collectIncome,
}: {
  rows: FacilityRow[];
  levels: LevelRow[];
  cash: number;
  busy: boolean;
  accrued: number;
  capped: boolean;
  startUpgrade: Action;
  claimUpgrade: Action;
  collectIncome: Action;
}) {
  const scroller = useRef<HTMLDivElement>(null);
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
  const center = at(6, 5.1); // the stadium, nudged toward the booster club so its coins are in view
  useCenterOn(scroller, center.x, center.y);

  const levelOf = (id: string, level: number) => levels.find((l) => l.facility_id === id && l.level === level);
  const sel = rows.find((r) => r.facility_id === open) ?? null;
  const placed = rows
    .filter((r) => LOTS[r.facility_id])
    .map((r) => {
      const lot = LOTS[r.facility_id];
      const st = buildingState(r, now);
      const next = levelOf(r.facility_id, r.level + 1);
      const w = lot.n * TW * 1.04;
      return {
        r,
        st,
        art: buildingArt(r.facility_id, Math.max(1, r.level)),
        canUpgrade: (st === "built" || st === "unbuilt") && !!next && cash >= next.cost && !busy,
        scale: TIER_SCALE[buildingTier(Math.max(1, r.level))],
        w,
        foot: at(lot.gx + lot.n, lot.gy + lot.n), // bottom corner of the lot
        z: Math.round((lot.gx + lot.gy + lot.n) * 10) + 5,
        // Where a bubble floats, as a share of the sprite's height above its front corner: over the field for the stadium, over the roof elsewhere.
        bubble: r.facility_id === "stadium" ? 0.55 : 0.85,
      };
    });
  const booster = LOTS["booster-club"];
  const coinAt = at(booster.gx + booster.n / 2, booster.gy + booster.n / 2);

  return (
    <>
      <div ref={scroller} className="no-scrollbar absolute inset-0 overflow-auto overscroll-none">
        <div className="relative" style={{ width: MAP_W, height: MAP_H }}>
          <Ground />
          {TREES.map(([gx, gy]) => (
            <Tree key={`${gx}-${gy}`} gx={gx} gy={gy} />
          ))}
          {placed.map(({ r, st, art, scale, w, foot, z }) => (
            <button
              key={r.facility_id}
              type="button"
              onClick={() => setOpen(r.facility_id)}
              aria-label={`${r.facility.name}, ${r.level === 0 ? "not built" : `level ${r.level}`}${st === "ready" ? ", ready to claim" : ""}`}
              className="campus-bldg absolute"
              style={{ left: foot.x - w / 2, top: foot.y - w * 0.97, width: w, height: w, zIndex: z }}
            >
              {art ? (
                <Image
                  src={art}
                  alt=""
                  width={480}
                  height={480}
                  unoptimized
                  priority={r.facility_id === "stadium"}
                  className={`h-full w-full origin-bottom object-contain drop-shadow-[0_8px_6px_rgba(18,26,58,0.22)] ${st === "unbuilt" ? "opacity-50 grayscale" : ""}`}
                  style={{ transform: `scale(${scale})` }}
                />
              ) : null}
            </button>
          ))}
          {/* Labels and bubbles ride above every building so none hides behind another. Taps pass through. */}
          {placed.map(({ r, st, canUpgrade, w, foot, bubble }) => (
            <div key={`o-${r.facility_id}`} className="pointer-events-none absolute" style={{ left: foot.x, top: foot.y, zIndex: 900 }}>
              <span className="absolute -top-[30px] left-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-black text-ink shadow">
                {r.facility.name.replace("Practice Facility", "Practice").replace("Academic Center", "Academics")}
                {r.level > 0 ? <span className="ml-1 tabular-nums text-ink-muted">{r.level}</span> : null}
                {canUpgrade ? <span className="ml-0.5 text-gold">▲</span> : null}
              </span>
              {st === "ready" ? (
                <span className="bob absolute left-0 -translate-x-1/2 rounded-full bg-go px-3 py-1 text-xs font-black text-go-ink shadow-lg ring-2 ring-white" style={{ top: -w * bubble }}>
                  Ready!
                </span>
              ) : st === "building" ? (
                <span className="absolute left-0 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-black shadow-lg" style={{ top: -w * bubble }}>
                  <Hammer size={12} className="text-primary" />
                  <Countdown until={r.upgrade_completes_at!} onDoneLabel="Ready!" />
                </span>
              ) : st === "unbuilt" ? (
                <span
                  className={`absolute left-0 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-black shadow-lg ring-2 ring-white ${canUpgrade ? "bg-primary text-primary-ink" : "bg-white text-ink-muted"}`}
                  style={{ top: -w * 0.75 }}
                >
                  Build
                </span>
              ) : null}
            </div>
          ))}
          {/* The coin bubble over the booster club collects in one tap. */}
          {accrued > 0 ? (
            <form action={collectIncome} className="absolute" style={{ left: coinAt.x - 46, top: coinAt.y - TW * 2.3, zIndex: 950 }}>
              <button
                type="submit"
                className="bob flex w-[92px] flex-col items-center rounded-2xl bg-white/95 px-2 py-1.5 shadow-lg ring-2 ring-gold"
                aria-label={`Collect ${formatCash(accrued)} from the boosters`}
              >
                <Coin size={26} className="text-gold" />
                <span className="text-sm font-black tabular-nums">{formatCash(accrued)}</span>
                {capped ? <span className="text-[10px] font-black uppercase text-power">Full!</span> : null}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {sel ? (
        <BuildingSheet
          r={sel}
          state={buildingState(sel, now)}
          cur={levelOf(sel.facility_id, sel.level)}
          next={levelOf(sel.facility_id, sel.level + 1)}
          cash={cash}
          busy={busy}
          waiting={rows.find((x) => x.facility_id !== sel.facility_id && buildingState(x, now) === "ready")?.facility.name ?? null}
          onClose={() => setOpen(null)}
          startUpgrade={startUpgrade}
          claimUpgrade={claimUpgrade}
        />
      ) : null}
    </>
  );
}

export function BuildingSheet({
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
  state: BuildingState;
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
                <p className="mt-2 text-center text-xs font-semibold text-ink-muted">Need {formatCash(next.cost - cash)} more. Collect from your boosters.</p>
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

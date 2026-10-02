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

/** Deterministic 0–1 noise so the ground looks hand-placed but never changes between renders. */
function rand(a: number, b: number, c = 0): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const isRoad = (gx: number, gy: number) => ROAD_GX.has(gx) || ROAD_GY.has(gy);
const onLot = (gx: number, gy: number) =>
  Object.values(LOTS).some((l) => gx + 0.5 > l.gx && gx + 0.5 < l.gx + l.n && gy + 0.5 > l.gy && gy + 0.5 < l.gy + l.n) ||
  (gx >= PARKING.gx && gx < PARKING.gx + PARKING.n && gy >= PARKING.gy && gy < PARKING.gy + PARKING.n);

/** An isometric box (benches, cars) from a grid footprint and a height in px. */
function IsoBox({ gx, gy, w, d, h, top, left, right }: { gx: number; gy: number; w: number; d: number; h: number; top: string; left: string; right: string }) {
  const a = at(gx, gy), b = at(gx + w, gy), c = at(gx + w, gy + d), e = at(gx, gy + d);
  const up = (p: { x: number; y: number }) => `${p.x},${p.y - h}`;
  const pt = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  return (
    <g>
      <polygon points={`${pt(e)} ${pt(c)} ${up(c)} ${up(e)}`} fill={left} />
      <polygon points={`${pt(c)} ${pt(b)} ${up(b)} ${up(c)}`} fill={right} />
      <polygon points={`${up(a)} ${up(b)} ${up(c)} ${up(e)}`} fill={top} />
    </g>
  );
}

const CAR_COLORS = [
  ["#e94b4b", "#b83434", "#cf3e3e"],
  ["#3e7bff", "#2a57c2", "#3368e0"],
  ["#ffc94a", "#d49a18", "#e8b030"],
  ["#ffffff", "#c9d1e6", "#e3e8f4"],
  ["#3ddc84", "#22a85f", "#2fc272"],
];

/** The ground: grass with tufts and flowers, curbed walkways, paved lots, a parking lot, and an earthen edge. */
function Ground() {
  const grass: React.ReactNode[] = [];
  const roads: React.ReactNode[] = [];
  const details: React.ReactNode[] = [];
  for (let gx = 0; gx < COLS; gx++)
    for (let gy = 0; gy < ROWS; gy++) {
      if (isRoad(gx, gy)) {
        roads.push(<polygon key={`r${gx}-${gy}`} points={diamond(gx, gy)} fill={rand(gx, gy) > 0.5 ? "#f2e7cd" : "#efe2c4"} />);
        continue;
      }
      const shade = rand(gx, gy);
      grass.push(<polygon key={`g${gx}-${gy}`} points={diamond(gx, gy)} fill={shade > 0.66 ? "#a3da74" : shade > 0.33 ? "#9cd46d" : "#95ce66"} />);
      if (onLot(gx, gy)) continue;
      // Tufts: little darker strokes.
      for (let i = 0; i < 4; i++) {
        const p = at(gx + 0.15 + rand(gx, gy, i) * 0.7, gy + 0.15 + rand(gy, gx, i + 9) * 0.7);
        details.push(<path key={`t${gx}-${gy}-${i}`} d={`M${p.x - 3},${p.y} l2,-5 l1,5 l2,-6 l1,6`} stroke="#6fb04a" strokeWidth={1.4} fill="none" strokeLinecap="round" />);
      }
      // A few flowers.
      if (rand(gx, gy, 3) > 0.62) {
        const color = ["#ff8fb1", "#ffd84a", "#ffffff", "#b39cff"][Math.floor(rand(gx, gy, 4) * 4)];
        for (let i = 0; i < 3; i++) {
          const p = at(gx + 0.25 + rand(gx, gy, i + 20) * 0.5, gy + 0.25 + rand(gy, gx, i + 30) * 0.5);
          details.push(<circle key={`f${gx}-${gy}-${i}`} cx={p.x} cy={p.y} r={2.6} fill={color} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={0.8} />);
        }
      }
    }

  // Walkway curbs: a light top edge and a shaded lower edge along every run.
  const curbs: React.ReactNode[] = [];
  for (const gy of ROAD_GY) {
    const a = at(0, gy), b = at(COLS, gy), c = at(0, gy + 1), d = at(COLS, gy + 1);
    curbs.push(<line key={`cy1${gy}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={3} />);
    curbs.push(<line key={`cy2${gy}`} x1={c.x} y1={c.y + 1} x2={d.x} y2={d.y + 1} stroke="#cdb98d" strokeWidth={3} />);
  }
  for (const gx of ROAD_GX) {
    const a = at(gx, 0), b = at(gx, ROWS), c = at(gx + 1, 0), d = at(gx + 1, ROWS);
    curbs.push(<line key={`cx1${gx}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={3} />);
    curbs.push(<line key={`cx2${gx}`} x1={c.x} y1={c.y + 1} x2={d.x} y2={d.y + 1} stroke="#cdb98d" strokeWidth={3} />);
  }

  // Lots: paving stones with a border, so each building stands on a plaza.
  const lots = Object.entries(LOTS).map(([id, l]) => {
    const seams: React.ReactNode[] = [];
    for (let i = 1; i < l.n * 2; i++) {
      const a = at(l.gx + i / 2, l.gy), b = at(l.gx + i / 2, l.gy + l.n);
      const c = at(l.gx, l.gy + i / 2), d = at(l.gx + l.n, l.gy + i / 2);
      seams.push(<line key={`a${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#d9c9a4" strokeWidth={1} />);
      seams.push(<line key={`b${i}`} x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#d9c9a4" strokeWidth={1} />);
    }
    return (
      <g key={id}>
        <polygon points={diamond(l.gx - 0.12, l.gy - 0.12, l.n + 0.24, l.n + 0.24)} fill="#d8c59c" />
        <polygon points={diamond(l.gx - 0.06, l.gy - 0.06, l.n + 0.12, l.n + 0.12)} fill="#ece0c2" />
        {seams}
      </g>
    );
  });

  // Parking lot: asphalt, stall lines, and a few parked cars.
  const pk = PARKING;
  const stalls: React.ReactNode[] = [];
  for (let i = 0; i <= 5; i++) {
    const x = pk.gx + 0.15 + i * 0.34;
    const a = at(x, pk.gy + 0.12), b = at(x, pk.gy + 0.75), c = at(x, pk.gy + pk.n - 0.75), d = at(x, pk.gy + pk.n - 0.12);
    stalls.push(<line key={`s${i}a`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeWidth={2} strokeOpacity={0.85} />);
    stalls.push(<line key={`s${i}b`} x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#ffffff" strokeWidth={2} strokeOpacity={0.85} />);
  }
  const cars = [0, 2, 3, 6, 8].map((k, i) => {
    const row = k < 5 ? 0 : 1;
    const slot = k % 5;
    const [top, left, right] = CAR_COLORS[i % CAR_COLORS.length];
    const gx = pk.gx + 0.2 + slot * 0.34;
    const gy = row === 0 ? pk.gy + 0.18 : pk.gy + pk.n - 0.72;
    return (
      <g key={`car${k}`}>
        <IsoBox gx={gx} gy={gy} w={0.24} d={0.52} h={8} top={top} left={left} right={right} />
        <IsoBox gx={gx + 0.03} gy={gy + 0.14} w={0.18} d={0.24} h={14} top="#cfe6ff" left={left} right={right} />
      </g>
    );
  });

  // The edge: a green lip over brown earth, so the campus sits like an island.
  const L = at(0, ROWS), B = at(COLS, ROWS), R = at(COLS, 0);
  const lip = 10, dirt = 26;
  const band = (y0: number, y1: number) => `${R.x},${R.y + y0} ${B.x},${B.y + y0} ${L.x},${L.y + y0} ${L.x},${L.y + y1} ${B.x},${B.y + y1} ${R.x},${R.y + y1}`;

  return (
    <svg className="absolute left-0 top-0" width={MAP_W} height={MAP_H} aria-hidden="true">
      <polygon points={band(0, lip + dirt)} fill="#9a6b43" />
      <polygon points={band(lip + dirt - 8, lip + dirt)} fill="#7d5434" />
      <polygon points={band(0, lip)} fill="#6aa84a" />
      {grass}
      {details}
      {roads}
      {curbs}
      {lots}
      <polygon points={diamond(pk.gx, pk.gy, pk.n, pk.n)} fill="#7a86a3" />
      <polygon points={diamond(pk.gx + 0.04, pk.gy + 0.04, pk.n - 0.08, pk.n - 0.08)} fill="#848fab" />
      {stalls}
      {cars}
      {/* Center-line dashes on the walkways. */}
      {[...ROAD_GY].map((gy) => {
        const a = at(0, gy + 0.5), b = at(COLS, gy + 0.5);
        return <line key={`ry${gy}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeOpacity={0.75} strokeWidth={3} strokeDasharray="10 12" />;
      })}
      {[...ROAD_GX].map((gx) => {
        const a = at(gx + 0.5, 0), b = at(gx + 0.5, ROWS);
        return <line key={`rx${gx}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeOpacity={0.75} strokeWidth={3} strokeDasharray="10 12" />;
      })}
    </svg>
  );
}

/** Two kinds of tree, sized and toned by position so the rows don't look stamped. */
function Tree({ gx, gy }: { gx: number; gy: number }) {
  const p = at(gx + 0.5, gy + 0.5);
  const s = 0.85 + rand(gx, gy, 7) * 0.35;
  const pine = rand(gx, gy, 8) > 0.6;
  return (
    <svg
      className="pointer-events-none absolute"
      style={{ left: p.x - 24 * s, top: p.y - 58 * s, zIndex: Math.round((gx + gy + 1) * 10) }}
      width={48 * s}
      height={66 * s}
      viewBox="0 0 48 66"
      aria-hidden="true"
    >
      <ellipse cx="24" cy="58" rx="16" ry="6" fill="#1d4d1a" opacity="0.22" />
      <rect x="21" y="40" width="6" height="18" rx="2" fill="#8a5a33" />
      {pine ? (
        <>
          <path d="M24 2 L42 44 L6 44 Z" fill="#2f8a3c" />
          <path d="M24 2 L42 44 L24 44 Z" fill="#267532" />
          <path d="M24 10 L33 30 L17 30 Z" fill="#45a84f" opacity="0.6" />
        </>
      ) : (
        <>
          <circle cx="24" cy="28" r="18" fill="#3a9437" />
          <circle cx="31" cy="32" r="12" fill="#2f7f2d" />
          <circle cx="17" cy="22" r="10" fill="#57b44a" />
          <circle cx="27" cy="16" r="8" fill="#72c95a" />
          <circle cx="15" cy="19" r="3" fill="#a4e38a" opacity="0.8" />
        </>
      )}
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
  pointAt,
  focusKey,
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
  /** Where the guide arrow points: a facility id or "coin". */
  pointAt?: string | null;
  /** Changing this scrolls the map to whatever pointAt names. */
  focusKey?: number;
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

  // The guide arrow: over the coin bubble, or over a building's roof.
  const target = pointAt === "coin" ? { x: coinAt.x, y: coinAt.y - TW * 2.3 - 8 } : (() => {
    const pl = placed.find((x) => x.r.facility_id === pointAt);
    return pl ? { x: pl.foot.x, y: pl.foot.y - pl.w * (pl.bubble + 0.12) } : null;
  })();
  useEffect(() => {
    const el = scroller.current;
    if (!el || !target || !focusKey) return;
    el.scrollTo({ left: target.x - el.clientWidth / 2, top: Math.max(0, target.y - el.clientHeight * 0.45), behavior: "smooth" });
    // Only when asked: focusKey changes on a tap of the mission strip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

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
              <span className="absolute -top-[30px] left-0 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-[#0b1430]/85 py-0.5 pl-0.5 pr-2.5 text-[11px] font-bold text-white ring-1 ring-[#d6b15c]/50">
                {r.level > 0 ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-gradient-to-b from-[#ffe08a] to-[#ffb300] px-1 text-[10px] leading-5 text-[#3a2600] tabular-nums">
                    {r.level}
                  </span>
                ) : (
                  <span className="w-1" />
                )}
                {r.facility.name.replace("Practice Facility", "Practice").replace("Academic Center", "Academics")}
                {canUpgrade ? <span className="text-[#5fe39b]">▲</span> : null}
              </span>
              {st === "ready" ? (
                <span
                  className="bubble-tail bob absolute left-0 -translate-x-1/2 rounded-xl border-[1.5px] border-white bg-gradient-to-b from-[#2fbf6f] to-[#0e7a3f] px-3.5 py-1 shadow-[0_4px_12px_rgba(5,10,25,0.5)]"
                  style={{ top: -w * bubble }}
                >
                  <span className="game-text relative z-10 text-sm font-black">Ready!</span>
                </span>
              ) : st === "building" ? (
                <span className="absolute left-0 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-black shadow-lg" style={{ top: -w * bubble }}>
                  <Hammer size={12} className="text-primary" />
                  <Countdown until={r.upgrade_completes_at!} onDoneLabel="Ready!" />
                </span>
              ) : st === "unbuilt" ? (
                <span
                  className={`bubble-tail absolute left-0 -translate-x-1/2 rounded-xl border-[1.5px] px-3 py-1 shadow-[0_4px_12px_rgba(5,10,25,0.5)] bg-gradient-to-b from-[#2c3f6e] to-[#0f1b3a] ${canUpgrade ? "bob border-[#f6dd94]" : "border-white/70 opacity-90"}`}
                  style={{ top: -w * 0.75 }}
                >
                  <span className="game-text relative z-10 inline-flex items-center gap-1 text-sm font-black">
                    <Hammer size={14} /> Build
                  </span>
                </span>
              ) : null}
            </div>
          ))}
          {/* The coin bubble over the booster club collects in one tap. */}
          {accrued > 0 ? (
            <form action={collectIncome} className="absolute" style={{ left: coinAt.x - 46, top: coinAt.y - TW * 2.3, zIndex: 950 }}>
              <button
                type="submit"
                className="bubble-tail bob relative flex w-[92px] flex-col items-center rounded-2xl border-[1.5px] border-[#fff1c2] bg-gradient-to-b from-[#f2cf6b] to-[#b8862a] px-2 py-1.5 shadow-[0_0_22px_rgba(255,206,90,0.65),0_6px_14px_rgba(5,10,25,0.45)]"
                aria-label={`Collect ${formatCash(accrued)} from the boosters`}
              >
                <span className="grid size-9 place-items-center rounded-full bg-gradient-to-b from-[#ffe39a] to-[#c9922a] text-white ring-1 ring-[#fff1c2] shadow-inner">
                  <Coin size={24} />
                </span>
                <span className="game-text relative z-10 mt-0.5 text-[15px] font-black tabular-nums">{formatCash(accrued)}</span>
                {capped ? <span className="relative z-10 text-[10px] font-black uppercase text-power">Full!</span> : null}
              </button>
            </form>
          ) : null}
          {target ? <GuideArrow x={target.x} y={target.y} /> : null}
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

/** A big bouncing gold arrow pointing down at the next thing to tap. */
export function GuideArrow({ x, y }: { x: number; y: number }) {
  return (
    <svg
      className="guide-arrow pointer-events-none absolute"
      style={{ left: x - 22, top: y - 54, zIndex: 980 }}
      width={44}
      height={54}
      viewBox="0 0 44 54"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="guide-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#ff9f1a" />
        </linearGradient>
      </defs>
      <path d="M14 2 H30 V26 H41 L22 51 L3 26 H14 Z" fill="url(#guide-gold)" stroke="#121a3a" strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 6 H23 V28" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
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

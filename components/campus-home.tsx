"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampusMap } from "@/components/campus";
import { DailyCard } from "@/components/daily-card";
import { SeasonRewardsCard } from "@/components/season-rewards-card";
import { Bolt, Coin } from "@/components/icons";
import { HudClipboard, HudFlag, HudGift, HudHammer, HudHelmet, HudShield, HudTrophy } from "@/components/hud-icons";
import { formatCash } from "@/lib/format";
import type { ProgramViewProps } from "@/components/program-view";

/** Shape of first_missions_status() (supabase/migrations/0024_first_missions.sql). */
export type MissionStatus = {
  enabled: boolean;
  total: number;
  claimed: number;
  current: { id: string; label: string; target: string; reward: number; done: boolean } | null;
};

/** A small gold arrow beside a HUD button the current mission needs. */
function PointerArrow({ from }: { from: "above" | "right" }) {
  return (
    <svg
      className={`guide-arrow pointer-events-none absolute z-30 ${from === "above" ? "-top-12 left-1/2 -ml-[15px]" : "-right-9 top-2.5 rotate-90"}`}
      width={30}
      height={38}
      viewBox="0 0 44 54"
      aria-hidden="true"
    >
      <path d="M14 2 H30 V26 H41 L22 51 L3 26 H14 Z" fill="#ffb300" stroke="#121a3a" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

/** A round HUD button floating over the map, Last War style: dark slate face, light rim, pale glyph. */
function HudButton({
  label,
  icon,
  href,
  onClick,
  badge,
  pulse,
  pointed,
}: {
  label: string;
  icon: ReactNode;
  /** The current mission wants this button: gold ring and an arrow. */
  pointed?: "above" | "right";
  href?: string;
  onClick?: () => void;
  badge?: string | boolean;
  pulse?: boolean;
}) {
  const body = (
    <>
      <span
        className={`relative grid size-[54px] place-items-center rounded-full bg-[radial-gradient(circle_at_50%_35%,#4a5878_0%,#2a3452_70%,#222a44_100%)] shadow-[0_4px_10px_rgba(18,26,58,0.45)] ring-[3px] ${pointed ? "bob ring-[#ffb300]" : "ring-[#dfe7f6]/90"} ${pulse ? "bob" : ""}`}
      >
        {pointed ? <PointerArrow from={pointed} /> : null}
        <span className="drop-shadow-[0_2px_1px_rgba(0,0,0,0.35)]">{icon}</span>
        {badge ? (
          <span
            className={`absolute -right-0.5 -top-0.5 grid place-items-center rounded-full bg-gradient-to-b from-[#ff6b6b] to-[#e0343a] text-[10px] font-black leading-none text-white ring-2 ring-white ${badge === true ? "size-4" : "h-5 min-w-5 px-1"}`}
          >
            {badge === true ? "" : badge}
          </span>
        ) : null}
      </span>
      <span className="game-text mt-1 whitespace-nowrap text-[11px] font-black leading-none">{label}</span>
    </>
  );
  const cls = "campus-bldg pointer-events-auto flex w-16 flex-col items-center";
  if (!href && !onClick) return <div className={cls}>{body}</div>;
  return href ? (
    <Link href={href} className={cls} aria-label={label}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      {body}
    </button>
  );
}

/** One resource in the top bar: an icon coin and a game-type number. */
function Resource({ icon, value, face }: { icon: ReactNode; value: string; face: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-[#121a3a]/55 py-0.5 pl-0.5 pr-3 ring-1 ring-white/25 backdrop-blur-sm">
      <span className={`grid size-7 place-items-center rounded-full text-white ring-2 ring-white ${face}`}>{icon}</span>
      <span className="game-text text-[15px] font-black tabular-nums">{value}</span>
    </span>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#121a3a]/40" />
      <div className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        {children}
      </div>
    </div>
  );
}

/**
 * The home screen when the campus is on: the map fills the screen and
 * everything else floats over it, the way Last War's base does.
 */
export function CampusHome(p: ProgramViewProps) {
  const [sheet, setSheet] = useState<null | "menu" | "daily" | "rewards">(null);
  const [focusKey, setFocusKey] = useState(0);
  const router = useRouter();
  const mission = p.missions?.current ?? null;
  // Map targets get the big arrow on the campus; screen targets light up their HUD button.
  const mapTarget = mission && !mission.done && !mission.target.startsWith("/") ? mission.target : null;
  const hudTarget = mission && !mission.done && mission.target.startsWith("/") ? mission.target : null;
  // Lets global chrome (the feedback button) make room for the bottom bar.
  useEffect(() => {
    document.documentElement.dataset.campus = "1";
    return () => {
      delete document.documentElement.dataset.campus;
    };
  }, []);
  const now = p.now ?? Date.now();
  const rows = p.facilities;
  const levelPower = (id: string, level: number) => p.levels.find((l) => l.facility_id === id && l.level === level)?.power ?? 0;
  const power = rows.reduce((n, r) => n + levelPower(r.facility_id, r.level), 0) + p.staffPower;
  const building = rows.filter((r) => r.upgrade_to !== null).length;
  const ready = rows.filter((r) => r.upgrade_to !== null && r.upgrade_completes_at && new Date(r.upgrade_completes_at).getTime() <= now).length;
  const dailyLeft = p.daily ? (p.daily.checkin.claimed ? 0 : 1) + p.daily.tasks.filter((t) => t.done && !t.claimed).length : 0;

  return (
    <div className="fixed inset-y-0 left-0 right-0 mx-auto w-full max-w-md overflow-hidden bg-[#86c95f]">
      <CampusMap
        rows={rows}
        levels={p.levels}
        cash={p.cash}
        busy={p.busy}
        accrued={p.accrued}
        capped={p.capped}
        startUpgrade={p.actions.startUpgrade}
        claimUpgrade={p.actions.claimUpgrade}
        collectIncome={p.actions.collectIncome}
        pointAt={mapTarget}
        focusKey={focusKey}
      />

      {/* Top: who you are, then resources. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] bg-gradient-to-b from-[#121a3a]/55 via-[#121a3a]/20 to-transparent px-3 pb-8 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setSheet("menu")} className="campus-bldg pointer-events-auto flex min-w-0 items-center gap-2" aria-label="Your program">
            {/* Program crest: a shield in power orange carrying the conference. */}
            <span className="relative grid size-12 shrink-0 place-items-center">
              <svg viewBox="0 0 48 52" className="absolute inset-0 size-12 drop-shadow-[0_3px_0_#121a3a]" aria-hidden="true">
                <defs>
                  <linearGradient id="crest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffb067" />
                    <stop offset="1" stopColor="#f26a00" />
                  </linearGradient>
                </defs>
                <path d="M24 2 L44 9 V26 C44 39 34 47 24 50 C14 47 4 39 4 26 V9 Z" fill="url(#crest)" stroke="#ffffff" strokeWidth="3" />
              </svg>
              <span className="game-text relative text-[11px] font-black">{p.conferenceShort}</span>
            </span>
            <span className="min-w-0 text-left">
              <span className="game-text block truncate text-[17px] font-black leading-tight">{p.programName}</span>
              <span className="mt-0.5 inline-block rounded-full bg-[#121a3a]/55 px-2 text-[10px] font-black uppercase tracking-wider text-gold">{p.seasonLabel}</span>
            </span>
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Resource icon={<Bolt size={16} />} value={power.toLocaleString("en-US")} face="bg-gradient-to-b from-[#ffaa5c] to-[#f26a00]" />
          <Resource icon={<Coin size={16} />} value={formatCash(p.cash)} face="bg-gradient-to-b from-[#ffe08a] to-[#ffb300]" />
          <span className="game-text self-center text-xs font-black tabular-nums">+{formatCash(p.incomeRate)}/hr</span>
        </div>
        {p.notice ? (
          <p className="pointer-events-auto mt-2 rounded-2xl bg-white/95 px-3 py-2 text-sm font-bold shadow-lg" role="status">
            {p.notice}
          </p>
        ) : null}
      </div>

      {/* Left: your crew and your staff. */}
      <div className="pointer-events-none absolute left-2 top-[24%] z-[1000] flex flex-col gap-4">
        <HudButton label={`Crew ${building}/1`} icon={<HudHammer />} badge={ready > 0 ? String(ready) : false} />
        <HudButton label="Staff" icon={<HudClipboard />} href="/staff" badge={p.canScout} pointed={hudTarget === "/staff" ? "right" : undefined} />
        {p.daily ? <HudButton label="Daily" icon={<HudGift />} onClick={() => setSheet("daily")} badge={dailyLeft > 0 ? String(dailyLeft) : false} pulse={dailyLeft > 0} /> : null}
        {p.seasonRewards ? <HudButton label="Prizes" icon={<HudTrophy />} onClick={() => setSheet("rewards")} badge pulse /> : null}
      </div>

      {/* The current mission, Last War style: one line, a reward, and Claim when it's done. */}
      {mission ? (
        <div className="pointer-events-none absolute inset-x-2 bottom-[calc(max(0.6rem,env(safe-area-inset-bottom))+92px)] z-[1001] flex items-center">
          <span className="pointer-events-auto relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border-2 border-white bg-gradient-to-b from-[#ffe08a] to-[#ffb300] shadow-[0_4px_0_#b47a00,0_6px_12px_rgba(18,26,58,0.35)]">
            <HudClipboard size={30} />
            <span className="game-text absolute -bottom-2 text-[11px] font-black">
              {p.missions!.claimed + 1}/{p.missions!.total}
            </span>
          </span>
          <button
            type="button"
            onClick={() => (mission.target.startsWith("/") ? router.push(mission.target) : setFocusKey((k) => k + 1))}
            disabled={mission.done}
            className="pointer-events-auto -ml-3 flex h-11 min-w-0 flex-1 items-center gap-2 rounded-r-xl bg-[#121a3a]/70 pl-5 pr-2 text-left backdrop-blur-sm"
            aria-label={`Mission: ${mission.label}`}
          >
            <span className="game-text line-clamp-2 min-w-0 flex-1 text-[13px] font-black leading-[1.15]">{mission.label}</span>
            <span className={`game-text shrink-0 text-[13px] font-black ${mission.done ? "!text-[#5fe39b]" : ""}`}>({mission.done ? 1 : 0}/1)</span>
            {!mission.done ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-black text-[#ffe08a]">
                <Coin size={14} /> +{formatCash(mission.reward)}
              </span>
            ) : null}
          </button>
          {mission.done && p.actions.claimMission ? (
            <form action={p.actions.claimMission} className="pointer-events-auto -ml-1 shrink-0">
              <input type="hidden" name="mission_id" value={mission.id} />
              <button
                type="submit"
                className="game-tile bob flex h-11 items-center gap-1 rounded-xl bg-gradient-to-b from-[#5fe39b] to-[#1fb864] px-3"
                style={{ ["--edge" as string]: "#158a48" }}
              >
                <span className="game-text relative z-10 text-[15px] font-black">Claim +{formatCash(mission.reward)}</span>
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {/* Bottom: game day, then your people. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-end gap-1.5 bg-gradient-to-t from-[#121a3a]/55 via-[#121a3a]/20 to-transparent px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-12">
        <Link
          href="/matchups"
          className={`game-tile campus-bldg pointer-events-auto mb-[18px] flex h-[62px] min-w-0 flex-1 items-center gap-2 rounded-2xl bg-gradient-to-b from-[#5fe39b] to-[#1fb864] px-3 text-white ${p.dueGames > 0 || hudTarget === "/matchups" ? "bob" : ""} ${hudTarget === "/matchups" ? "!border-[#ffb300]" : ""}`}
          style={{ ["--edge" as string]: "#158a48" }}
        >
          {hudTarget === "/matchups" ? <PointerArrow from="above" /> : null}
          <span className="relative z-10 shrink-0 drop-shadow-[0_2px_0_rgba(18,26,58,0.35)]">
            <HudHelmet size={32} />
          </span>
          <span className="relative z-10 min-w-0">
            <span className="game-text block truncate text-base font-black leading-tight">{p.dueGames > 0 ? "See result" : "Matchups"}</span>
            <span className="block truncate text-[11px] font-black text-[#04260f]/80">
              {p.record.wins}–{p.record.losses} · {p.emphasisName}
            </span>
          </span>
        </Link>
        {p.seat ? (
          <>
            <HudButton label="Faction" icon={<HudShield />} href="/faction" pointed={hudTarget === "/faction" ? "above" : undefined} />
            <HudButton label="League" icon={<HudTrophy />} href="/league" badge={p.factionRank ? `#${p.factionRank}` : false} />
          </>
        ) : (
          <form action={p.actions.joinFaction} className="pointer-events-auto">
            <button type="submit" className="campus-bldg flex w-16 flex-col items-center" aria-label="Join your faction">
              <span className="bob grid size-[54px] place-items-center rounded-full bg-gradient-to-b from-[#b9a3ff] to-[#7c5ce6] shadow-[0_4px_10px_rgba(18,26,58,0.45)] ring-[3px] ring-white">
                <HudShield />
              </span>
              <span className="game-text mt-1.5 text-[12px] font-black leading-none">Join</span>
            </button>
          </form>
        )}
        <HudButton label="Nation" icon={<HudFlag />} href="/nation" />
      </div>

      {sheet === "menu" ? (
        <Sheet title="Your program" onClose={() => setSheet(null)}>
          <p className="text-2xl font-black">{p.programName}</p>
          <p className="text-sm font-semibold text-ink-muted">
            {p.school.full_name} · {p.displayName}
          </p>
          <p className="mt-2 text-sm font-semibold">
            Your code: <span className="font-black tracking-[0.15em]">{p.shareCode}</span>
          </p>
          <form action={p.actions.signOut} className="mt-4">
            <button type="submit" className="w-full py-2 text-center text-sm font-bold text-ink-muted underline">
              Log out
            </button>
          </form>
        </Sheet>
      ) : null}
      {sheet === "daily" && p.daily && p.actions.claimCheckin && p.actions.claimDailyTask ? (
        <Sheet title="Daily" onClose={() => setSheet(null)}>
          <DailyCard daily={p.daily} claimCheckin={p.actions.claimCheckin} claimTask={p.actions.claimDailyTask} />
        </Sheet>
      ) : null}
      {sheet === "rewards" && p.seasonRewards && p.actions.claimSeasonRewards ? (
        <Sheet title="Season rewards" onClose={() => setSheet(null)}>
          <SeasonRewardsCard status={p.seasonRewards} claim={p.actions.claimSeasonRewards} />
        </Sheet>
      ) : null}
    </div>
  );
}

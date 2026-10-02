"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { CampusMap } from "@/components/campus";
import { DailyCard } from "@/components/daily-card";
import { SeasonRewardsCard } from "@/components/season-rewards-card";
import { Bolt, Coin, Hammer, Shield, Trophy } from "@/components/icons";
import { formatCash } from "@/lib/format";
import type { ProgramViewProps } from "@/components/program-view";

/** A round HUD button floating over the map, Last War style. */
function HudButton({
  label,
  icon,
  tone,
  href,
  onClick,
  badge,
  pulse,
}: {
  label: string;
  icon: ReactNode;
  tone: string;
  href?: string;
  onClick?: () => void;
  badge?: string | boolean;
  pulse?: boolean;
}) {
  const body = (
    <>
      <span className={`relative grid size-12 place-items-center rounded-2xl bg-white shadow-lg ring-2 ring-white/80 ${tone} ${pulse ? "bob" : ""}`}>
        {icon}
        {badge ? (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-power px-1 text-[10px] font-black leading-5 text-white ring-2 ring-white">
            {badge === true ? "!" : badge}
          </span>
        ) : null}
      </span>
      <span className="mt-0.5 whitespace-nowrap rounded-full bg-[#121a3a]/70 px-1.5 text-[10px] font-black leading-4 text-white">{label}</span>
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
      />

      {/* Top: who you are, then resources. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] bg-gradient-to-b from-[#121a3a]/45 to-transparent px-3 pb-6 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSheet("menu")}
            className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-2xl bg-white/95 py-1 pl-1 pr-3 shadow-lg"
            aria-label="Your program"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-power text-white">
              <Bolt size={20} />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-black leading-tight">{p.programName}</span>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">{p.conferenceShort}</span>
            </span>
          </button>
          <span className="shrink-0 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black shadow-lg">{p.seasonLabel}</span>
        </div>
        <div className="mt-2 flex gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/95 py-1 pl-1.5 pr-3 shadow-lg">
            <Bolt size={18} className="text-power" />
            <span className="text-sm font-black tabular-nums">{power.toLocaleString("en-US")}</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/95 py-1 pl-1.5 pr-3 shadow-lg">
            <Coin size={18} className="text-gold" />
            <span className="text-sm font-black tabular-nums">{formatCash(p.cash)}</span>
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-black tabular-nums text-ink-muted shadow-lg">
            +{formatCash(p.incomeRate)}/hr
          </span>
        </div>
        {p.notice ? (
          <p className="pointer-events-auto mt-2 rounded-2xl bg-white/95 px-3 py-2 text-sm font-bold shadow-lg" role="status">
            {p.notice}
          </p>
        ) : null}
      </div>

      {/* Left: your crew and your staff. */}
      <div className="pointer-events-none absolute left-2 top-[26%] z-[1000] flex flex-col gap-3">
        <HudButton label={`Crew ${building}/1`} icon={<Hammer size={24} />} tone="text-primary" badge={ready > 0 ? String(ready) : false} />
        <HudButton label="Staff" icon={<Shield size={24} />} tone="text-primary" href="/staff" badge={p.canScout} />
        {p.daily ? <HudButton label="Daily" icon={<Coin size={24} />} tone="text-gold" onClick={() => setSheet("daily")} badge={dailyLeft > 0 ? String(dailyLeft) : false} pulse={dailyLeft > 0} /> : null}
        {p.seasonRewards ? <HudButton label="Prizes" icon={<Trophy size={24} />} tone="text-gold" onClick={() => setSheet("rewards")} badge pulse /> : null}
      </div>

      {/* Bottom: game day, then your people. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-end gap-1.5 bg-gradient-to-t from-[#121a3a]/50 to-transparent px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10">
        <Link
          href="/matchups"
          className={`btn-3d pointer-events-auto flex h-[68px] min-w-0 flex-1 items-center gap-2 rounded-2xl bg-go px-3 text-go-ink [--btn-edge:#158a48] [--glow:rgba(61,220,132,0.6)] ${p.dueGames > 0 ? "pulse" : ""}`}
        >
          <Trophy size={26} />
          <span className="min-w-0">
            <span className="block truncate text-base font-black leading-tight">{p.dueGames > 0 ? "See result" : "Matchups"}</span>
            <span className="block truncate text-[11px] font-extrabold opacity-90">
              {p.record.wins}–{p.record.losses} · {p.emphasisName}
            </span>
          </span>
        </Link>
        {p.seat ? (
          <>
            <HudButton label="Faction" icon={<Shield size={24} />} tone="text-faction" href="/faction" />
            <HudButton label="League" icon={<Trophy size={24} />} tone="text-go" href="/league" badge={p.factionRank ? `#${p.factionRank}` : false} />
          </>
        ) : (
          <form action={p.actions.joinFaction} className="pointer-events-auto">
            <button type="submit" className="campus-bldg flex w-16 flex-col items-center" aria-label="Join your faction">
              <span className="bob grid size-12 place-items-center rounded-2xl bg-faction text-white shadow-lg ring-2 ring-white">
                <Shield size={24} />
              </span>
              <span className="mt-0.5 rounded-full bg-[#121a3a]/70 px-1.5 text-[10px] font-black leading-4 text-white">Join</span>
            </button>
          </form>
        )}
        <HudButton label="Nation" icon={<Bolt size={24} />} tone="text-power" href="/nation" />
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

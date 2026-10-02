import Link from "next/link";
import { Button, Card, Hud, Notice, Pips, Wordmark } from "@/components/ui";
import { Bolt, Coin, Hammer, Shield, Trophy } from "@/components/icons";
import { Countdown } from "@/components/countdown";
import { formatCash, formatDuration } from "@/lib/format";
import Image from "next/image";
import { DailyCard, type DailyStatus } from "@/components/daily-card";
import { buildingArt } from "@/lib/art";
import { SeasonRewardsCard, type SeasonRewardsStatus } from "@/components/season-rewards-card";

export type FacilityRow = {
  facility_id: string;
  level: number;
  upgrade_to: number | null;
  upgrade_completes_at: string | null;
  facility: { name: string; description: string; sort_order: number };
};
export type LevelRow = { facility_id: string; level: number; cost: number; duration_seconds: number; income_per_hour: number | null; power: number | null };

export type ProgramViewProps = {
  displayName: string;
  programName: string;
  school: { name: string; full_name: string; city: string | null; state: string | null };
  conferenceShort: string;
  seasonLabel: string;
  seat: { factionName: string; leagueLabel: string; role: string } | null;
  factionRank: number | null;
  cash: number;
  incomeRate: number;
  accrued: number;
  capped: boolean;
  capHours: number;
  facilities: FacilityRow[];
  levels: LevelRow[];
  busy: boolean;
  notice?: string;
  staffHired: number;
  staffTotal: number;
  staffPower: number;
  canScout: boolean;
  record: { wins: number; losses: number };
  emphasisName: string;
  shareCode: string;
  dueGames: number;
  /** Daily check-in and tasks. Null unless the dailyRewards flag and the database feature are both on. */
  daily?: DailyStatus | null;
  /** Unclaimed season-end rewards. Null unless the seasonRewards flag and the database feature are both on and something is waiting. */
  seasonRewards?: SeasonRewardsStatus | null;
  /** Show building illustrations in the facilities list (flags.campusArt). */
  art?: boolean;
  actions: {
    joinFaction: (formData: FormData) => void | Promise<void>;
    collectIncome: (formData: FormData) => void | Promise<void>;
    startUpgrade: (formData: FormData) => void | Promise<void>;
    claimUpgrade: (formData: FormData) => void | Promise<void>;
    signOut: (formData: FormData) => void | Promise<void>;
    claimCheckin?: (formData: FormData) => void | Promise<void>;
    claimDailyTask?: (formData: FormData) => void | Promise<void>;
    claimSeasonRewards?: (formData: FormData) => void | Promise<void>;
  };
  now?: number;
};

export function ProgramView(p: ProgramViewProps) {
  const now = p.now ?? Date.now();
  const levelOf = (facilityId: string, level: number) => p.levels.find((l) => l.facility_id === facilityId && l.level === level);
  const rows = p.facilities.slice().sort((a, b) => a.facility.sort_order - b.facility.sort_order);
  const power = rows.reduce((sum, r) => sum + (levelOf(r.facility_id, r.level)?.power ?? 0), 0) + p.staffPower;
  const readyCount = rows.filter((r) => r.upgrade_to !== null && r.upgrade_completes_at && new Date(r.upgrade_completes_at).getTime() <= now).length;
  const collectIsBest = p.accrued > 0;

  return (
    <main className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between py-1">
        <Wordmark />
        <span className="text-xs font-bold text-ink-muted">{p.displayName}</span>
      </header>

      <Hud
        items={[
          { icon: <Bolt size={22} />, label: "Power", value: power.toLocaleString("en-US"), tone: "power" },
          { icon: <Coin size={22} />, label: "Budget", value: formatCash(p.cash), tone: "gold" },
        ]}
      />

      <section className="panel relative overflow-hidden rounded-3xl border border-line bg-surface p-5">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-power/25 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">{p.conferenceShort}</p>
          <h1 className="mt-0.5 text-[2.3rem] font-black leading-[1.05] tracking-tight">{p.programName}</h1>
          <p className="mt-1 text-sm font-semibold text-ink-muted">
            {p.school.full_name}
            {p.school.city ? ` · ${p.school.city}, ${p.school.state}` : ""}
          </p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-power">Power</p>
              <p className="power-glow text-6xl font-black leading-none text-power">{power.toLocaleString("en-US")}</p>
            </div>
            <span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold">{p.seasonLabel}</span>
          </div>
        </div>
      </section>

      {p.notice ? <Notice>{p.notice}</Notice> : null}

      {p.seasonRewards && p.actions.claimSeasonRewards ? <SeasonRewardsCard status={p.seasonRewards} claim={p.actions.claimSeasonRewards} /> : null}

      {p.daily && p.actions.claimCheckin && p.actions.claimDailyTask ? (
        <DailyCard daily={p.daily} claimCheckin={p.actions.claimCheckin} claimTask={p.actions.claimDailyTask} />
      ) : null}

      <Card title="Boosters" accent="gold" icon={<Coin size={14} />} action={<span className="text-xs font-extrabold text-ink-muted">{formatCash(p.incomeRate)}/hr</span>}>
        <form action={p.actions.collectIncome}>
          <Button type="submit" variant={collectIsBest ? "gold" : "secondary"} pulse={collectIsBest}>
            <Coin size={20} />
            {collectIsBest ? `Collect ${formatCash(p.accrued)}${p.capped ? " · Full!" : ""}` : "Boosters are working…"}
          </Button>
        </form>
        <p className="mt-2 text-xs font-semibold text-ink-muted">Donations pile up for {p.capHours} hours, then stop. Come back and collect.</p>
      </Card>

      <Card
        title="Facilities"
        accent="primary"
        icon={<Hammer size={14} />}
        action={readyCount > 0 ? <span className="rounded-full bg-go px-2 py-0.5 text-[11px] font-extrabold text-go-ink">{readyCount} ready</span> : null}
      >
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const cur = levelOf(r.facility_id, r.level);
            const next = levelOf(r.facility_id, r.level + 1);
            const upgrading = r.upgrade_to !== null && r.upgrade_completes_at !== null;
            const ready = upgrading && new Date(r.upgrade_completes_at!).getTime() <= now;
            const gain = next ? (next.power ?? 0) - (cur?.power ?? 0) : 0;
            const canAfford = next ? p.cash >= next.cost : false;
            const art = p.art ? buildingArt(r.facility_id, r.level) : null;
            return (
              <li key={r.facility_id} className="rounded-2xl border border-line bg-surface-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  {art ? (
                    <Image
                      src={art}
                      alt=""
                      width={84}
                      height={84}
                      unoptimized
                      className={`-my-1 -ml-1 size-[84px] shrink-0 object-contain drop-shadow-md ${r.level === 0 ? "opacity-40 grayscale" : ""}`}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black">{r.facility.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs font-bold text-ink-muted">
                      <Pips level={r.level} tone={r.facility_id === "booster-club" ? "gold" : "primary"} />
                      Lv {r.level}
                    </div>
                  </div>
                  {upgrading ? (
                    <div className="text-right text-xs font-bold">
                      <div className="text-ink-muted">→ Lv {r.upgrade_to}</div>
                      <Countdown until={r.upgrade_completes_at!} onDoneLabel="Ready!" />
                    </div>
                  ) : next ? (
                    <div className="text-right text-xs font-bold text-ink-muted">
                      <div className="text-power">+{gain} power</div>
                      {next.income_per_hour ? <div className="text-gold">{formatCash(next.income_per_hour)}/hr</div> : null}
                    </div>
                  ) : null}
                </div>
                <div className="mt-3">
                  {upgrading ? (
                    <form action={p.actions.claimUpgrade}>
                      <input type="hidden" name="facility_id" value={r.facility_id} />
                      <Button type="submit" variant={ready ? "go" : "secondary"} pulse={ready && !collectIsBest} disabled={!ready} className="h-11 text-sm">
                        {ready ? `Claim level ${r.upgrade_to}` : "Under construction"}
                      </Button>
                    </form>
                  ) : next ? (
                    <form action={p.actions.startUpgrade}>
                      <input type="hidden" name="facility_id" value={r.facility_id} />
                      <Button type="submit" variant={canAfford && !p.busy ? "primary" : "secondary"} disabled={p.busy || !canAfford} className="h-11 text-sm">
                        <Hammer size={16} />
                        {r.level === 0 ? "Build" : `Upgrade`} · <Coin size={14} /> {formatCash(next.cost)} · {formatDuration(next.duration_seconds)}
                      </Button>
                    </form>
                  ) : (
                    <p className="text-xs font-bold text-ink-muted">Maxed out.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {p.busy ? <p className="mt-3 text-xs font-semibold text-ink-muted">One crew, one job at a time. They&apos;re on it.</p> : null}
      </Card>

      <Card title="Faction" accent="faction" icon={<Shield size={14} />}>
        {p.seat ? (
          <>
            <p className="text-lg font-black">{p.seat.factionName}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink-muted">
              {p.seat.leagueLabel}
              {p.seat.role === "leader" ? " · Founder" : p.seat.role === "officer" ? " · Officer" : " · Member"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/faction" className="btn-3d inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-faction text-sm font-extrabold text-white [--btn-edge:#5a3fc0]">
                <Shield size={16} /> Faction
              </Link>
              <Link href="/league" className="btn-3d inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-extrabold text-ink [--btn-edge:var(--line)]">
                <Trophy size={16} /> League{p.factionRank ? ` · #${p.factionRank}` : ""}
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">Every {p.school.name} fan in your League, on your side.</p>
            <form action={p.actions.joinFaction} className="mt-3">
              <Button type="submit" variant="faction" pulse={!collectIsBest}>
                <Shield size={18} /> Join your faction
              </Button>
            </form>
          </>
        )}
      </Card>

      <Card title="Staff" accent="primary" icon={<Shield size={14} />}>
        <p className="text-sm font-semibold">
          {p.staffHired} of {p.staffTotal} coaches hired · <span className="text-power">{p.staffPower} power</span>
        </p>
        <Link href="/staff" className="btn-3d mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-extrabold text-primary-ink [--btn-edge:#1f4bc4]">
          {p.canScout ? "Send scouts" : "Manage staff"}
        </Link>
      </Card>

      <Card title="Matchups" accent="go" icon={<Trophy size={14} />}>
        <p className="text-sm font-semibold">
          {p.record.wins}–{p.record.losses} this season · emphasis: {p.emphasisName}
        </p>
        {p.dueGames > 0 ? <p className="mt-1 text-xs font-extrabold text-go">{p.dueGames} result waiting</p> : <p className="mt-1 text-xs font-semibold text-ink-muted">Your code: <span className="font-black tracking-[0.15em] text-ink">{p.shareCode}</span></p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href="/matchups" className={`btn-3d inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-go text-sm font-extrabold text-go-ink [--btn-edge:#158a48] ${p.dueGames > 0 && !collectIsBest ? "pulse [--glow:rgba(61,220,132,0.6)]" : ""}`}>
            <Trophy size={16} /> {p.dueGames > 0 ? "See result" : "Matchups"}
          </Link>
          <Link href="/nation" className="btn-3d inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-extrabold text-ink [--btn-edge:var(--line)]">
            <Bolt size={16} /> Nation
          </Link>
        </div>
      </Card>

      <form action={p.actions.signOut} className="mt-2">
        <button type="submit" className="w-full py-2 text-center text-xs font-bold text-ink-muted underline">
          Log out
        </button>
      </form>
    </main>
  );
}

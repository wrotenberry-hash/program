import Link from "next/link";
import { Card, Wordmark } from "@/components/ui";
import { Shield, Trophy } from "@/components/icons";
import { Countdown } from "@/components/countdown";

export type StandingRow = { faction_id: string; name: string; school_id: string; wins: number; losses: number; points: number; members: number; is_mine: boolean };
export type WeekGame = {
  id: string; kind: string; status: string; locks_at: string;
  home_name: string; home_is_house: boolean; home_faction_id: string | null;
  away_name: string; away_is_house: boolean; away_faction_id: string | null;
  home_score: number | null; away_score: number | null; narrative: string | null;
  mine: boolean;
};
export type BracketPair = { a: string; b: string; a_points: number; b_points: number; games: number; resolved: number; a_mine: boolean; b_mine: boolean };
export type TrophyRow = { week_number: number; faction: string; opponent: string; faction_points: number; opponent_points: number; mine: boolean };

export type LeagueViewProps = {
  leagueLabel: string;
  seasonLabel: string;
  weekKind: string;
  myFactionId: string;
  standings: StandingRow[];
  houseCount: number;
  games: WeekGame[];
  bracket: BracketPair[];
  trophies: TrophyRow[];
  now?: number;
};

export function LeagueView(p: LeagueViewProps) {
  const now = p.now ?? Date.now();
  const myRank = p.standings.findIndex((s) => s.is_mine) + 1;
  const myGames = p.games.filter((g) => g.mine);
  const others = p.games.filter((g) => !g.mine);
  const isRivalry = p.weekKind === "rivalry";

  return (
    <main className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between py-1">
        <Wordmark />
        <Link href="/program" className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold">
          ← Program
        </Link>
      </header>

      <section className="panel relative overflow-hidden rounded-3xl border border-line bg-surface p-5">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-go/25 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-go">{p.seasonLabel}</p>
          <h1 className="mt-0.5 text-[2rem] font-black leading-[1.05] tracking-tight">{p.leagueLabel}</h1>
          <p className="mt-1 text-sm font-semibold text-ink-muted">
            {myRank > 0 ? `Your faction is #${myRank} of ${p.standings.length}` : "Your faction is unranked"} · {p.houseCount} house-run schools
          </p>
          {isRivalry ? (
            <p className="float mt-3 inline-flex items-center gap-2 rounded-full bg-power px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
              <Trophy size={14} /> Rivalry Week
            </p>
          ) : null}
        </div>
      </section>

      {isRivalry && p.bracket.length > 0 ? (
        <Card title="Rivalry Week" accent="power" icon={<Trophy size={14} />}>
          <ul className="flex flex-col gap-2">
            {p.bracket.map((b, i) => {
              const done = b.resolved === b.games;
              const aLead = b.a_points > b.b_points;
              return (
                <li key={i} className={`rounded-2xl border-2 p-3 ${b.a_mine || b.b_mine ? "border-power bg-power/10" : "border-line bg-surface-2"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`min-w-0 flex-1 truncate text-sm font-black ${done && aLead ? "text-go" : ""}`}>{b.a}</span>
                    <span className="shrink-0 text-2xl font-black tabular-nums">
                      {b.a_points}<span className="mx-1 text-ink-muted">–</span>{b.b_points}
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-right text-sm font-black ${done && !aLead && b.b_points > b.a_points ? "text-go" : ""}`}>{b.b}</span>
                  </div>
                  <p className="mt-1 text-center text-[11px] font-bold text-ink-muted">
                    {b.resolved} of {b.games} games in · {done ? (aLead ? `${b.a} take the trophy` : b.b_points > b.a_points ? `${b.b} take the trophy` : "Dead heat") : "Faction points"}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card title="Standings" accent="go" icon={<Shield size={14} />}>
        <ol className="flex flex-col gap-1.5">
          {p.standings.map((s, i) => (
            <li key={s.faction_id} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${s.is_mine ? "bg-faction/20 ring-2 ring-faction" : "bg-surface-2"}`}>
              <span className="w-6 text-center text-sm font-black text-ink-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{s.name}</p>
                <p className="text-[11px] font-bold text-ink-muted">{s.members} fans</p>
              </div>
              <span className="text-xs font-bold tabular-nums text-ink-muted">{s.wins}–{s.losses}</span>
              <span className="w-12 text-right text-base font-black tabular-nums">{s.points}</span>
            </li>
          ))}
          {p.standings.length === 0 ? <li className="text-sm font-semibold text-ink-muted">No factions yet. Standings fill in as fans arrive.</li> : null}
        </ol>
        <p className="mt-2 text-[11px] font-semibold text-ink-muted">Points: a faction&apos;s best results each week, added up. House-run schools don&apos;t score.</p>
      </Card>

      <Card title="This week" accent="primary">
        {p.games.length === 0 ? <p className="text-sm font-semibold text-ink-muted">Games appear when the week is scheduled.</p> : null}
        <ul className="flex flex-col gap-2">
          {[...myGames, ...others].slice(0, 40).map((g) => {
            const due = new Date(g.locks_at).getTime() <= now;
            return (
              <li key={g.id} className={`rounded-2xl px-3 py-2 ${g.mine ? "bg-faction/15 ring-2 ring-faction" : "bg-surface-2"}`}>
                <div className="flex items-center justify-between gap-2 text-sm font-black">
                  <span className="min-w-0 flex-1 truncate">{g.home_name}{g.home_is_house ? <span className="ml-1 text-[10px] font-extrabold uppercase text-ink-muted">house</span> : null}</span>
                  {g.status === "resolved" ? (
                    <span className="shrink-0 tabular-nums">{g.home_score}–{g.away_score}</span>
                  ) : (
                    <span className="shrink-0 text-[11px] font-bold text-ink-muted">{due ? "resolving" : <Countdown until={g.locks_at} onDoneLabel="now" />}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-right">{g.away_name}{g.away_is_house ? <span className="ml-1 text-[10px] font-extrabold uppercase text-ink-muted">house</span> : null}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {p.trophies.length > 0 ? (
        <Card title="Trophy case" accent="gold" icon={<Trophy size={14} />}>
          <ul className="flex flex-col gap-1.5">
            {p.trophies.map((t, i) => (
              <li key={i} className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold ${t.mine ? "bg-gold/20" : "bg-surface-2"}`}>
                <Trophy size={16} className="text-gold" />
                <span className="min-w-0 flex-1 truncate">{t.faction} over {t.opponent}</span>
                <span className="tabular-nums text-ink-muted">{t.faction_points}–{t.opponent_points}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </main>
  );
}

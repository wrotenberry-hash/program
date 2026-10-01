import Link from "next/link";
import { Card, Wordmark } from "@/components/ui";
import { Bolt, Trophy } from "@/components/icons";

export type NationRow = { school_id: string; name: string; conference: string; wins: number; losses: number; points: number; mine: boolean };
export type NationViewProps = {
  seasonLabel: string;
  mySchool: string;
  rival: { name: string; myPoints: number; rivalPoints: number; myWins: number; rivalWins: number } | null;
  rows: NationRow[];
};

export function NationView(p: NationViewProps) {
  const myRank = p.rows.findIndex((r) => r.mine) + 1;
  const top = p.rows.slice(0, 25);
  const mine = p.rows.find((r) => r.mine);
  return (
    <main className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between py-1">
        <Wordmark />
        <Link href="/program" className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold">
          ← Program
        </Link>
      </header>

      <section className="panel relative overflow-hidden rounded-3xl border border-line bg-surface p-5">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/25 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">{p.seasonLabel}</p>
          <h1 className="mt-0.5 text-[2rem] font-black leading-[1.05] tracking-tight">{p.mySchool} Nation</h1>
          <p className="mt-1 text-sm font-semibold text-ink-muted">
            Every {p.mySchool} fan, every League, one total. {myRank > 0 ? `Ranked #${myRank} of ${p.rows.length} nations.` : "Play a League game to get on the board."}
          </p>
        </div>
      </section>

      {p.rival ? (
        <Card title="Nation rivalry" accent="power" icon={<Bolt size={14} />}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{p.mySchool} Nation</p>
              <p className="text-[11px] font-bold text-ink-muted">{p.rival.myWins} wins</p>
            </div>
            <p className="shrink-0 text-3xl font-black tabular-nums">
              {p.rival.myPoints}<span className="mx-1 text-ink-muted">–</span>{p.rival.rivalPoints}
            </p>
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate text-sm font-black">{p.rival.name} Nation</p>
              <p className="text-[11px] font-bold text-ink-muted">{p.rival.rivalWins} wins</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-ink-muted">Season points across every League. Same-school fans are never on opposite sides.</p>
        </Card>
      ) : null}

      <Card title="Nation leaderboard" accent="primary" icon={<Trophy size={14} />}>
        <ol className="flex flex-col gap-1.5">
          {top.map((r, i) => (
            <li key={r.school_id} className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${r.mine ? "bg-faction/20 ring-2 ring-faction" : "bg-surface-2"}`}>
              <span className="w-6 text-center text-sm font-black text-ink-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{r.name}</p>
                <p className="text-[11px] font-bold text-ink-muted">{r.conference}</p>
              </div>
              <span className="text-xs font-bold tabular-nums text-ink-muted">{r.wins}–{r.losses}</span>
              <span className="w-12 text-right text-base font-black tabular-nums">{r.points}</span>
            </li>
          ))}
          {mine && myRank > 25 ? (
            <li className="flex items-center gap-3 rounded-2xl bg-faction/20 px-3 py-2 ring-2 ring-faction">
              <span className="w-6 text-center text-sm font-black text-ink-muted">{myRank}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{mine.name}</p>
                <p className="text-[11px] font-bold text-ink-muted">{mine.conference}</p>
              </div>
              <span className="text-xs font-bold tabular-nums text-ink-muted">{mine.wins}–{mine.losses}</span>
              <span className="w-12 text-right text-base font-black tabular-nums">{mine.points}</span>
            </li>
          ) : null}
          {p.rows.length === 0 ? <li className="text-sm font-semibold text-ink-muted">No League games resolved yet this season.</li> : null}
        </ol>
      </Card>
    </main>
  );
}

import Link from "next/link";
import { Button, Card, Input, Notice, Wordmark } from "@/components/ui";
import { Bolt, Check, Trophy } from "@/components/icons";
import { Countdown } from "@/components/countdown";
import { FACETS, type FacetSet, type GameInputs, type GameResult } from "@/lib/facets";

export type Emphasis = { id: string; name: string; blurb: string; rushing: number; passing: number; run_defense: number; pass_defense: number };
export type GameRow = {
  id: string;
  status: string;
  locks_at: string;
  week_number: number;
  home_program_id: string;
  away_program_id: string;
  inputs: GameInputs | null;
  result: GameResult | null;
  home_name: string;
  away_name: string;
};

export type MatchupsViewProps = {
  myProgramId: string;
  myName: string;
  shareCode: string;
  seasonLabel: string;
  facets: FacetSet & { total: number };
  emphasisId: string;
  emphases: Emphasis[];
  games: GameRow[];
  notice?: string;
  error?: string;
  actions: {
    setEmphasis: (fd: FormData) => void | Promise<void>;
    challenge: (fd: FormData) => void | Promise<void>;
    resolveNow: (fd: FormData) => void | Promise<void>;
  };
  now?: number;
};

function FacetBars({ f, max }: { f: FacetSet; max: number }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {FACETS.map((x) => (
        <li key={x.key} className="flex items-center gap-2 text-xs font-bold">
          <span className="w-14 text-ink-muted">{x.short}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-power" style={{ width: `${max ? Math.max(4, (100 * f[x.key]) / max) : 0}%` }} />
          </span>
          <span className="w-12 text-right tabular-nums">{Math.round(f[x.key])}</span>
        </li>
      ))}
    </ul>
  );
}

export function MatchupsView(p: MatchupsViewProps) {
  const now = p.now ?? Date.now();
  const upcoming = p.games.filter((g) => g.status === "scheduled");
  const done = p.games.filter((g) => g.status === "resolved");
  const dueCount = upcoming.filter((g) => new Date(g.locks_at).getTime() <= now).length;
  const maxFacet = Math.max(1, ...FACETS.map((x) => p.facets[x.key]));

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
          <h1 className="mt-0.5 flex items-center gap-2 text-[2rem] font-black leading-[1.05] tracking-tight">
            <Trophy size={30} className="text-go" /> Matchups
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-muted">Your power against theirs. Pick an emphasis, then find a game.</p>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-power">Your power, after emphasis</span>
              <span className="power-glow text-2xl font-black text-power">{Math.round(p.facets.total).toLocaleString("en-US")}</span>
            </div>
            <div className="mt-2">
              <FacetBars f={p.facets} max={maxFacet} />
            </div>
          </div>
        </div>
      </section>

      {p.error ? <Notice tone="error">{p.error}</Notice> : null}
      {p.notice ? <Notice>{p.notice}</Notice> : null}

      <Card title="Emphasis" accent="power" icon={<Bolt size={14} />}>
        <p className="mb-3 text-xs font-semibold text-ink-muted">Shifts power between facets. Never creates it. Carries over week to week.</p>
        <form action={p.actions.setEmphasis} className="grid grid-cols-2 gap-2">
          {p.emphases.map((e) => {
            const active = e.id === p.emphasisId;
            return (
              <button
                key={e.id}
                type="submit"
                name="emphasis_id"
                value={e.id}
                className={`btn-3d rounded-2xl border-2 p-3 text-left ${active ? "border-power bg-power/15 [--btn-edge:#b34d00]" : "border-line bg-surface-2 [--btn-edge:var(--line)]"}`}
              >
                <span className="flex items-center justify-between text-sm font-black">
                  {e.name}
                  {active ? <Check size={16} className="text-power" /> : null}
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold text-ink-muted">{e.blurb}</span>
              </button>
            );
          })}
        </form>
      </Card>

      <Card title="Challenge a friend" accent="go" icon={<Trophy size={14} />}>
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-surface-2 px-3 py-2">
          <span className="text-xs font-bold text-ink-muted">Your code</span>
          <span className="text-xl font-black tracking-[0.2em]">{p.shareCode}</span>
        </div>
        <form action={p.actions.challenge} className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input name="code" placeholder="Friend's code" autoCapitalize="characters" autoComplete="off" maxLength={6} />
          </div>
          <button type="submit" className="btn-3d h-[52px] w-20 shrink-0 rounded-2xl bg-go text-base font-extrabold text-go-ink [--btn-edge:#158a48]">
            Go
          </button>
        </form>
        <p className="mt-2 text-xs font-semibold text-ink-muted">Any school, any League. The game locks a few minutes after you send it, then resolves.</p>
      </Card>

      {upcoming.length > 0 ? (
        <Card title="Upcoming" accent="primary" action={dueCount > 0 ? <span className="rounded-full bg-go px-2 py-0.5 text-[11px] font-extrabold text-go-ink">{dueCount} due</span> : null}>
          <ul className="flex flex-col gap-2">
            {upcoming.map((g) => {
              const due = new Date(g.locks_at).getTime() <= now;
              return (
                <li key={g.id} className="rounded-2xl bg-surface-2 p-3">
                  <p className="text-sm font-black">
                    {g.home_name} <span className="text-ink-muted">vs</span> {g.away_name}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-ink-muted">
                    Week {g.week_number} · {due ? "Locked. Resolving…" : <>Locks in <Countdown until={g.locks_at} onDoneLabel="now" /></>}
                  </p>
                </li>
              );
            })}
          </ul>
          {dueCount > 0 ? (
            <form action={p.actions.resolveNow} className="mt-3">
              <Button type="submit" variant="go" pulse>
                See the result
              </Button>
            </form>
          ) : null}
        </Card>
      ) : null}

      <Card title="Results" accent="faction">
        {done.length === 0 ? <p className="text-sm font-semibold text-ink-muted">No results yet. Challenge a friend above.</p> : null}
        <ul className="flex flex-col gap-3">
          {done.map((g) => {
            const r = g.result!;
            const i = g.inputs!;
            const iWon = r.winner_program_id === p.myProgramId;
            const mineHome = g.home_program_id === p.myProgramId;
            const myEdges = mineHome ? [r.edges.home_rush, r.edges.home_pass, -r.edges.away_rush, -r.edges.away_pass] : [r.edges.away_rush, r.edges.away_pass, -r.edges.home_rush, -r.edges.home_pass];
            return (
              <li key={g.id} className={`overflow-hidden rounded-2xl border-2 ${iWon ? "border-go" : "border-line"} bg-surface-2`}>
                <div className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider ${iWon ? "bg-go text-go-ink" : "bg-line text-ink-muted"}`}>
                  <span>{iWon ? "Win" : "Loss"}</span>
                  <span>Week {g.week_number}</span>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{g.home_name}</p>
                      <p className="text-[11px] font-bold text-ink-muted">{i.home.emphasis.replace(/-/g, " ")} · {Math.round(i.home.total)} power</p>
                    </div>
                    <p className="shrink-0 text-3xl font-black tabular-nums">
                      {r.home_score}<span className="mx-1 text-ink-muted">–</span>{r.away_score}
                    </p>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="truncate text-sm font-black">{g.away_name}</p>
                      <p className="text-[11px] font-bold text-ink-muted">{i.away.emphasis.replace(/-/g, " ")} · {Math.round(i.away.total)} power</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{r.narrative}</p>
                  <ul className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] font-extrabold uppercase tracking-wider">
                    {FACETS.map((x, k) => {
                      const e = myEdges[k];
                      return (
                        <li key={x.key} className={`rounded-xl px-1 py-1.5 ${e > 0.02 ? "bg-go/20 text-go" : e < -0.02 ? "bg-danger/15 text-danger" : "bg-line text-ink-muted"}`}>
                          {x.short}
                          <div className="text-xs">{e > 0.02 ? "edge" : e < -0.02 ? "out-matched" : "even"}</div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </main>
  );
}

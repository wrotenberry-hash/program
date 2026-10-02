import { Card, Notice, Wordmark } from "@/components/ui";

/** Shape of retention_report() (supabase/migrations/0022_player_activity.sql). */
export type Report = {
  today: string;
  players: number;
  active_today: number;
  active_7_days: number;
  cohorts: {
    week_of: string;
    players: number;
    next_day: number;
    next_day_of: number;
    first_week: number;
    first_week_of: number;
    after_week: number;
    after_week_of: number;
    avg_days_played: number;
  }[];
  events: Record<string, number>;
};

/** "3 of 8 (38%)", or "—" until anyone has had the chance. Percent only once there are 5 or more. */
function share(n: number, of: number): string {
  if (of === 0) return "—";
  return of >= 5 ? `${n} of ${of} (${Math.round((n / of) * 100)}%)` : `${n} of ${of}`;
}

function weekLabel(d: string): string {
  return `Week of ${new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

export function FounderView({ r, token }: { r: Report | null; token: string }) {
  return (
    <main className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between py-1">
        <Wordmark />
        <span className="text-xs font-bold text-ink-muted">Founder</span>
      </header>

      {!r ? (
        <Notice tone="error">This link isn&apos;t valid. Use the private link you were given.</Notice>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-2">
            {[
              { label: "Players", value: r.players },
              { label: "Today", value: r.active_today },
              { label: "Last 7 days", value: r.active_7_days },
            ].map((t) => (
              <div key={t.label} className="panel rounded-2xl border border-line bg-surface px-3 py-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">{t.label}</div>
                <div className="text-2xl font-black tabular-nums">{t.value}</div>
              </div>
            ))}
          </section>

          <Card title="Do they come back?" accent="go">
            <p className="mb-3 text-xs font-semibold text-ink-muted">
              Players grouped by the week they first played. &ldquo;3 of 8&rdquo; counts only players who have had time to come back.
            </p>
            {r.cohorts.length === 0 ? (
              <p className="text-sm font-semibold">No players yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {r.cohorts
                  .slice()
                  .reverse()
                  .map((c) => (
                    <li key={c.week_of} className="rounded-2xl bg-surface-2 px-3 py-2">
                      <p className="text-sm font-black">
                        {weekLabel(c.week_of)} · <span className="tabular-nums">{c.players}</span> new
                      </p>
                      <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 text-sm font-semibold tabular-nums">
                        <dt>Came back the next day</dt>
                        <dd className="text-right font-black">{share(c.next_day, c.next_day_of)}</dd>
                        <dt>Came back in their first week</dt>
                        <dd className="text-right font-black">{share(c.first_week, c.first_week_of)}</dd>
                        <dt>Still playing after a week</dt>
                        <dd className="text-right font-black">{share(c.after_week, c.after_week_of)}</dd>
                        <dt>Days played, on average</dt>
                        <dd className="text-right font-black">{c.avg_days_played}</dd>
                      </dl>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          {Object.keys(r.events).length > 0 ? (
            <Card title="Steps reached" accent="primary">
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 text-sm font-semibold tabular-nums">
                {Object.entries(r.events)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt>{k.replace(/_/g, " ")}</dt>
                      <dd className="text-right font-black">{v} players</dd>
                    </div>
                  ))}
              </dl>
            </Card>
          ) : null}

          <Card title="Feedback" accent="gold">
            <a href={`/api/feedback/export?token=${encodeURIComponent(token)}`} className="text-sm font-extrabold text-primary underline">
              Download all &ldquo;Confused?&rdquo; notes (spreadsheet)
            </a>
          </Card>

          <p className="text-center text-xs font-semibold text-ink-muted">
            As of {new Date(`${r.today}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}. Days before Oct 2 are estimated from sign-up and last activity.
          </p>
        </>
      )}
    </main>
  );
}

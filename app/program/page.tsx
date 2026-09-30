import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { claimUpgrade, collectIncome, joinFaction, startUpgrade } from "@/app/program/actions";
import { Button, Card, Notice, Wordmark } from "@/components/ui";
import { Countdown } from "@/components/countdown";
import { formatCash, formatDuration } from "@/lib/format";

export const metadata: Metadata = { title: "Your program" };

export default async function ProgramPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/program");

  const { data: program } = await supabase
    .from("programs")
    .select("id, name, school:schools(id, name, full_name, nickname, city, state, conference:conferences(id, name, short_name))")
    .eq("account_id", user.id)
    .maybeSingle();
  if (!program) redirect("/onboarding/school");

  const [{ data: profile }, { data: season }, { data: seat }, { data: treasury }, { data: facilities }, { data: levels }, { data: config }] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.from("seasons").select("id, year").eq("status", "active").maybeSingle(),
      supabase
        .from("league_seats")
        .select("role, faction:factions(id, name), league:leagues(id, number, conference:conferences(short_name))")
        .eq("program_id", program.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase.from("program_treasury").select("cash, last_collected_at").eq("program_id", program.id).maybeSingle(),
      supabase
        .from("program_facilities")
        .select("facility_id, level, upgrade_to, upgrade_completes_at, facility:facilities(name, description, sort_order)")
        .eq("program_id", program.id),
      supabase.from("facility_levels").select("facility_id, level, cost, duration_seconds, income_per_hour, power"),
      supabase.from("game_config").select("key, value").in("key", ["COLLECT_CAP_HOURS", "MAX_CONCURRENT_UPGRADES"]),
    ]);

  const today = new Date().toISOString().slice(0, 10);
  const { data: week } = season
    ? await supabase
        .from("season_weeks")
        .select("week_number, kind")
        .eq("season_id", season.id)
        .lte("starts_on", today)
        .order("week_number", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const school = program.school;
  const conference = school.conference;
  const weekLabel =
    week?.kind === "rivalry" ? "Rivalry Week" : week?.kind === "championship" ? "Championship Week" : week ? `Week ${week.week_number}` : "Offseason";

  const cfg = Object.fromEntries((config ?? []).map((c) => [c.key, Number(c.value)]));
  const capHours = cfg.COLLECT_CAP_HOURS || 8;
  const maxConcurrent = cfg.MAX_CONCURRENT_UPGRADES || 1;

  const levelOf = (facilityId: string, level: number) => (levels ?? []).find((l) => l.facility_id === facilityId && l.level === level);
  const rows = (facilities ?? []).slice().sort((a, b) => a.facility.sort_order - b.facility.sort_order);
  const boosters = rows.find((r) => r.facility_id === "booster-club");
  const incomeRate = boosters ? (levelOf("booster-club", boosters.level)?.income_per_hour ?? 0) : 0;
  const hoursSince = treasury ? (Date.now() - new Date(treasury.last_collected_at).getTime()) / 3600000 : 0;
  const accrued = Math.floor(Math.min(hoursSince, capHours) * incomeRate);
  const capped = hoursSince >= capHours;
  const busy = rows.filter((r) => r.upgrade_to !== null).length >= maxConcurrent;
  const now = Date.now();
  const power = rows.reduce((sum, r) => sum + (levelOf(r.facility_id, r.level)?.power ?? 0), 0);

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between py-2">
        <Wordmark />
        <span className="text-xs text-ink-muted">{profile?.display_name ?? user.email}</span>
      </header>

      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{conference.short_name}</p>
        <h1 className="mt-1 text-4xl font-black leading-tight tracking-tight">{program.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {school.full_name}
          {school.city ? ` · ${school.city}, ${school.state}` : ""}
        </p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Power</p>
            <p className="text-5xl font-black leading-none tabular-nums">{power.toLocaleString("en-US")}</p>
          </div>
          <p className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium">
            {season ? `${season.year} season · ${weekLabel}` : "No active season"}
          </p>
        </div>
      </section>

      {notice ? (
        <div className="mt-4">
          <Notice>{notice}</Notice>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <Card title="Faction">
          {seat ? (
            <>
              <p className="text-base font-semibold">{seat.faction.name}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {seat.league.conference.short_name} League {seat.league.number}
                {seat.role === "leader" ? " · You founded this faction" : seat.role === "officer" ? " · Officer" : ""}
              </p>
              <div className="mt-3">
                <Link href="/faction" className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-line bg-bg px-4 text-sm font-semibold">
                  Open faction
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm">Every {school.name} fan in your League, on your side.</p>
              <form action={joinFaction} className="mt-3">
                <Button type="submit">Join your faction</Button>
              </form>
            </>
          )}
        </Card>

        <Card title="Budget">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-muted">Budget</span>
            <span className="text-2xl font-black tabular-nums">{formatCash(treasury?.cash ?? 0)}</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm text-ink-muted">Boosters</span>
            <span className="text-sm tabular-nums">{formatCash(incomeRate)}/hr</span>
          </div>
          <form action={collectIncome} className="mt-3">
            <Button type="submit" variant={accrued > 0 ? "primary" : "secondary"}>
              {accrued > 0 ? `Collect ${formatCash(accrued)}${capped ? " (full)" : ""}` : "Nothing to collect yet"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-ink-muted">Income stops piling up after {capHours} hours. Come back and collect.</p>
        </Card>

        <Card title="Facilities">
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const next = levelOf(r.facility_id, r.level + 1);
              const upgrading = r.upgrade_to !== null && r.upgrade_completes_at !== null;
              const ready = upgrading && new Date(r.upgrade_completes_at!).getTime() <= now;
              return (
                <li key={r.facility_id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {r.facility.name} <span className="ml-1 text-xs font-medium text-ink-muted">Lv {r.level}</span>
                      </p>
                      <p className="text-xs text-ink-muted">{r.facility.description}</p>
                    </div>
                    {upgrading ? (
                      <div className="text-right text-xs">
                        <div>Lv {r.upgrade_to}</div>
                        <Countdown until={r.upgrade_completes_at!} />
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2">
                    {upgrading ? (
                      <form action={claimUpgrade}>
                        <input type="hidden" name="facility_id" value={r.facility_id} />
                        <Button type="submit" variant={ready ? "primary" : "secondary"} disabled={!ready} className="h-10 text-sm">
                          {ready ? `Claim level ${r.upgrade_to}` : "Under construction"}
                        </Button>
                      </form>
                    ) : next ? (
                      <form action={startUpgrade}>
                        <input type="hidden" name="facility_id" value={r.facility_id} />
                        <Button type="submit" variant="secondary" disabled={busy || (treasury?.cash ?? 0) < next.cost} className="h-10 text-sm">
                          {r.level === 0 ? "Build" : `Upgrade to Lv ${next.level}`} · {formatCash(next.cost)} · {formatDuration(next.duration_seconds)}
                          {next.power ? ` · +${next.power - (levelOf(r.facility_id, r.level)?.power ?? 0)} power` : ""}
                          {next.income_per_hour ? ` · ${formatCash(next.income_per_hour)}/hr` : ""}
                        </Button>
                      </form>
                    ) : (
                      <p className="text-xs text-ink-muted">Top level.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {busy ? <p className="mt-3 text-xs text-ink-muted">One upgrade at a time. Your crew is on it.</p> : null}
        </Card>

        <Card title="Matchups">
          <p className="text-sm">Your power against theirs, with the emphasis you choose each week.</p>
          <p className="mt-1 text-sm text-ink-muted">Opens in the next build.</p>
        </Card>
      </div>

      <div className="mt-auto pt-8">
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Log out
          </Button>
        </form>
      </div>
    </main>
  );
}

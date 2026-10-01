import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LeagueView, type BracketPair, type StandingRow, type TrophyRow, type WeekGame } from "@/components/league-view";
import { loadSchools, teamName } from "@/lib/schools";

export const metadata: Metadata = { title: "League" };

export default async function LeaguePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/league");

  const { data: program } = await supabase.from("programs").select("id").eq("account_id", user.id).maybeSingle();
  if (!program) redirect("/onboarding/school");
  const { data: seat } = await supabase
    .from("league_seats")
    .select("faction_id, league:leagues(id, number, conference_id, conference:conferences(short_name))")
    .eq("program_id", program.id)
    .eq("status", "active")
    .maybeSingle();
  if (!seat) redirect("/program");

  await supabase.rpc("run_maintenance");
  const { data: weekRows } = await supabase.rpc("current_week");
  const week = weekRows?.[0];
  if (!week) {
    return <LeagueView leagueLabel={`${seat.league.conference.short_name} League ${seat.league.number}`} seasonLabel="Offseason" weekKind="offseason" myFactionId={seat.faction_id} standings={[]} houseCount={0} games={[]} bracket={[]} trophies={[]} />;
  }

  const [{ data: standings }, { data: factions }, { data: seats }, { data: games }, { data: trophies }, { count: schoolsInConf }] = await Promise.all([
    supabase.from("faction_standings").select("faction_id, wins, losses, points").eq("season_id", week.season_id).eq("league_id", seat.league.id),
    supabase.from("factions").select("id, name, school_id").eq("league_id", seat.league.id),
    supabase.from("league_seats").select("faction_id").eq("league_id", seat.league.id).eq("status", "active"),
    supabase.rpc("league_week_games", { p_league_id: seat.league.id, p_season: week.season_id, p_week: week.week_number }),
    supabase.from("faction_trophies").select("week_number, faction_id, opponent_faction_id, faction_points, opponent_points").eq("season_id", week.season_id),
    supabase.from("schools").select("id", { count: "exact", head: true }).eq("conference_id", seat.league.conference_id),
  ]);

  const schools = await loadSchools(supabase);
  const nameOf = (schoolId: string | null | undefined) => {
    const sc = schoolId ? schools.get(schoolId) : undefined;
    return sc ? teamName(sc) : "Rival faction";
  };
  const factionById = new Map((factions ?? []).map((f) => [f.id, { ...f, name: nameOf(f.school_id) }]));
  const memberCount = new Map<string, number>();
  for (const s of seats ?? []) memberCount.set(s.faction_id, (memberCount.get(s.faction_id) ?? 0) + 1);
  const standingRows: StandingRow[] = (factions ?? [])
    .map((f) => {
      const st = (standings ?? []).find((s) => s.faction_id === f.id);
      return { faction_id: f.id, name: nameOf(f.school_id), school_id: f.school_id, wins: st?.wins ?? 0, losses: st?.losses ?? 0, points: st?.points ?? 0, members: memberCount.get(f.id) ?? 0, is_mine: f.id === seat.faction_id };
    })
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));

  const weekGames: WeekGame[] = (games ?? []).map((g) => ({
    ...g,
    home_name: nameOf(g.home_school),
    away_name: nameOf(g.away_school),
    mine: g.home_faction_id === seat.faction_id || g.away_faction_id === seat.faction_id,
  }));

  // Rivalry bracket: group rivalry games by faction pair; points = 3 per win, 1 per loss for human programs.
  const bracketMap = new Map<string, BracketPair>();
  if (week.kind === "rivalry") {
    for (const g of weekGames.filter((x) => x.kind === "rivalry" && x.home_faction_id && x.away_faction_id)) {
      const key = [g.home_faction_id, g.away_faction_id].sort().join("|");
      const [fa, fb] = key.split("|");
      const cur = bracketMap.get(key) ?? { a: factionById.get(fa)?.name ?? "Rival faction", b: factionById.get(fb)?.name ?? "Rival faction", a_points: 0, b_points: 0, games: 0, resolved: 0, a_mine: fa === seat.faction_id, b_mine: fb === seat.faction_id };
      cur.games += 1;
      if (g.status === "resolved" && g.home_score !== null && g.away_score !== null) {
        cur.resolved += 1;
        const homeWon = g.home_score > g.away_score;
        const homeIsA = g.home_faction_id === fa;
        cur.a_points += homeIsA ? (homeWon ? 3 : 1) : homeWon ? 1 : 3;
        cur.b_points += homeIsA ? (homeWon ? 1 : 3) : homeWon ? 3 : 1;
      }
      bracketMap.set(key, cur);
    }
  }
  const trophyRows: TrophyRow[] = (trophies ?? [])
    .filter((t) => factionById.has(t.faction_id) || (t.opponent_faction_id && factionById.has(t.opponent_faction_id)))
    .map((t) => ({
      week_number: t.week_number,
      faction: factionById.get(t.faction_id)?.name ?? "Rival faction",
      opponent: (t.opponent_faction_id && factionById.get(t.opponent_faction_id)?.name) ?? "Rival faction",
      faction_points: t.faction_points,
      opponent_points: t.opponent_points,
      mine: t.faction_id === seat.faction_id,
    }));

  return (
    <LeagueView
      leagueLabel={`${seat.league.conference.short_name} League ${seat.league.number}`}
      seasonLabel={`2026 · Week ${week.week_number}`}
      weekKind={week.kind}
      myFactionId={seat.faction_id}
      standings={standingRows}
      houseCount={Math.max(0, (schoolsInConf ?? 0) - (factions ?? []).length)}
      games={weekGames}
      bracket={[...bracketMap.values()].sort((a, b) => Number(b.a_mine || b.b_mine) - Number(a.a_mine || a.b_mine))}
      trophies={trophyRows}
    />
  );
}

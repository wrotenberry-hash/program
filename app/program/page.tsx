import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { claimUpgrade, collectIncome, joinFaction, startUpgrade } from "@/app/program/actions";
import { ProgramView } from "@/components/program-view";

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
    .select("id, name, share_code, emphasis_id, school:schools(id, name, full_name, nickname, city, state, conference:conferences(id, name, short_name))")
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
      supabase.from("game_config").select("key, value").in("key", ["COLLECT_CAP_HOURS", "MAX_CONCURRENT_UPGRADES", "SCOUT_COOLDOWN_HOURS"]),
    ]);
  const [{ data: staffRows }, { data: catalog }, { data: games }, { data: emphasis }, { data: treasury2 }] = await Promise.all([
    supabase.from("program_staff").select("staff_id, stars, level").eq("program_id", program.id),
    supabase.from("staff").select("id, base_power, power_per_level"),
    supabase.from("games").select("status, locks_at, result").or(`home_program_id.eq.${program.id},away_program_id.eq.${program.id}`).is("voided_at", null),
    supabase.from("emphases").select("name").eq("id", program.emphasis_id ?? "balanced").maybeSingle(),
    supabase.from("program_treasury").select("last_scouted_at").eq("program_id", program.id).maybeSingle(),
  ]);
  let factionRank: number | null = null;
  if (seat) {
    const { data: st } = await supabase.from("faction_standings").select("faction_id, points, wins").eq("league_id", seat.league.id).order("points", { ascending: false }).order("wins", { ascending: false });
    const idx = (st ?? []).findIndex((r) => r.faction_id === seat.faction.id);
    factionRank = idx >= 0 ? idx + 1 : null;
  }

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

  const weekLabel =
    week?.kind === "rivalry" ? "Rivalry Week" : week?.kind === "championship" ? "Championship Week" : week ? `Week ${week.week_number}` : "Offseason";
  const cfg = Object.fromEntries((config ?? []).map((c) => [c.key, Number(c.value)]));
  const capHours = cfg.COLLECT_CAP_HOURS || 8;
  const maxConcurrent = cfg.MAX_CONCURRENT_UPGRADES || 1;
  const rows = facilities ?? [];
  const boosters = rows.find((r) => r.facility_id === "booster-club");
  const incomeRate = boosters ? ((levels ?? []).find((l) => l.facility_id === "booster-club" && l.level === boosters.level)?.income_per_hour ?? 0) : 0;
  const hoursSince = treasury ? (Date.now() - new Date(treasury.last_collected_at).getTime()) / 3600000 : 0;
  const accrued = Math.floor(Math.min(hoursSince, capHours) * incomeRate);
  const catalogById = new Map((catalog ?? []).map((c) => [c.id, c]));
  const hired = (staffRows ?? []).filter((s) => s.stars > 0);
  const staffPower = hired.reduce((n, s) => {
    const c = catalogById.get(s.staff_id);
    return c ? n + Math.round((c.base_power + c.power_per_level * (s.level - 1)) * (1 + 0.25 * (s.stars - 1))) : n;
  }, 0);
  const nowMs = Date.now();
  const wins = (games ?? []).filter((g) => g.status === "resolved" && (g.result as { winner_program_id?: string } | null)?.winner_program_id === program.id).length;
  const losses = (games ?? []).filter((g) => g.status === "resolved").length - wins;
  const dueGames = (games ?? []).filter((g) => g.status === "scheduled" && new Date(g.locks_at).getTime() <= nowMs).length;
  const scoutCooldownH = cfg.SCOUT_COOLDOWN_HOURS || 4;
  const canScout = !treasury2?.last_scouted_at || new Date(treasury2.last_scouted_at).getTime() + scoutCooldownH * 3600e3 <= nowMs;

  return (
    <ProgramView
      displayName={profile?.display_name ?? user.email ?? ""}
      programName={program.name}
      school={program.school}
      conferenceShort={program.school.conference.short_name}
      seasonLabel={season ? `${season.year} · ${weekLabel}` : "Offseason"}
      seat={seat ? { factionName: seat.faction.name, leagueLabel: `${seat.league.conference.short_name} League ${seat.league.number}`, role: seat.role } : null}
      factionRank={factionRank}
      cash={treasury?.cash ?? 0}
      incomeRate={incomeRate}
      accrued={accrued}
      capped={hoursSince >= capHours}
      capHours={capHours}
      facilities={rows}
      levels={levels ?? []}
      busy={rows.filter((r) => r.upgrade_to !== null).length >= maxConcurrent}
      notice={notice}
      staffHired={hired.length}
      staffTotal={(catalog ?? []).length}
      staffPower={staffPower}
      canScout={canScout}
      record={{ wins, losses }}
      emphasisName={emphasis?.name ?? "Balanced"}
      shareCode={program.share_code ?? "——————"}
      dueGames={dueGames}
      actions={{ joinFaction, collectIncome, startUpgrade, claimUpgrade, signOut }}
    />
  );
}

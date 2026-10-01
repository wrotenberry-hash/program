import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NationView, type NationRow } from "@/components/nation-view";

export const metadata: Metadata = { title: "Nation" };

export default async function NationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/nation");
  const { data: program } = await supabase.from("programs").select("id, school:schools(id, name)").eq("account_id", user.id).maybeSingle();
  if (!program) redirect("/onboarding/school");

  const { data: weekRows } = await supabase.rpc("current_week");
  const week = weekRows?.[0];
  const seasonId = week?.season_id ?? "2026";

  const [{ data: ledger }, { data: schools }, { data: rival }] = await Promise.all([
    supabase.from("nation_ledger").select("school_id, wins, losses, points").eq("season_id", seasonId),
    supabase.from("schools").select("id, name, conference:conferences(short_name)"),
    supabase.from("rivalry_pairings").select("rival_school_id, rival:schools!rivalry_pairings_rival_school_id_fkey(name)").eq("school_id", program.school.id).eq("rank", 1).maybeSingle(),
  ]);

  const totals = new Map<string, { wins: number; losses: number; points: number }>();
  for (const r of ledger ?? []) {
    const t = totals.get(r.school_id) ?? { wins: 0, losses: 0, points: 0 };
    t.wins += r.wins; t.losses += r.losses; t.points += r.points;
    totals.set(r.school_id, t);
  }
  const rows: NationRow[] = (schools ?? [])
    .map((s) => ({ school_id: s.id, name: s.name, conference: s.conference.short_name, ...(totals.get(s.id) ?? { wins: 0, losses: 0, points: 0 }), mine: s.id === program.school.id }))
    .filter((r) => r.points > 0 || r.mine)
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));

  const mineT = totals.get(program.school.id) ?? { wins: 0, losses: 0, points: 0 };
  const rivalT = rival ? totals.get(rival.rival_school_id) ?? { wins: 0, losses: 0, points: 0 } : null;

  return (
    <NationView
      seasonLabel={week ? `2026 · Week ${week.week_number}` : "2026 season"}
      mySchool={program.school.name}
      rival={rival && rivalT ? { name: rival.rival.name, myPoints: mineT.points, rivalPoints: rivalT.points, myWins: mineT.wins, rivalWins: rivalT.wins } : null}
      rows={rows}
    />
  );
}

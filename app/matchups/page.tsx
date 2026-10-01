import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchupsView, type GameRow } from "@/components/matchups-view";
import { challenge, resolveNow, setEmphasis } from "@/app/matchups/actions";
import type { GameInputs, GameResult } from "@/lib/facets";
import { loadSchools, renderNarrative, teamName } from "@/lib/schools";

export const metadata: Metadata = { title: "Matchups" };

export default async function MatchupsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/matchups");

  const { data: program } = await supabase.from("programs").select("id, name, school_id, share_code, emphasis_id").eq("account_id", user.id).maybeSingle();
  if (!program) redirect("/onboarding/school");

  // Resolve anything due before reading, so a late cron never leaves a stale screen.
  await supabase.rpc("run_maintenance");

  const [{ data: facets }, { data: emphases }, { data: games }, { data: week }] = await Promise.all([
    supabase.rpc("effective_facets", { p_program_id: program.id }),
    supabase.from("emphases").select("id, name, blurb, rushing, passing, run_defense, pass_defense").order("sort_order"),
    supabase
      .from("games")
      .select("id, kind, status, locks_at, week_number, home_program_id, away_program_id, inputs, result, home:programs!games_home_program_id_fkey(school_id), away:programs!games_away_program_id_fkey(school_id)")
      .or(`home_program_id.eq.${program.id},away_program_id.eq.${program.id}`)
      .is("voided_at", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.rpc("current_week"),
  ]);

  const schools = await loadSchools(supabase);
  const nameOf = (schoolId: string | undefined) => {
    const sc = schoolId ? schools.get(schoolId) : undefined;
    return sc ? teamName(sc) : "Unknown";
  };
  const f = facets?.[0];
  const w = week?.[0];
  const rows: GameRow[] = (games ?? []).map((g) => ({
    id: g.id,
    kind: g.kind,
    status: g.status,
    locks_at: g.locks_at,
    week_number: g.week_number,
    home_program_id: g.home_program_id,
    away_program_id: g.away_program_id,
    inputs: g.inputs as GameInputs | null,
    result: g.result
      ? { ...(g.result as GameResult), narrative: renderNarrative(g.result as GameResult & { narrative_template?: string }, nameOf(g.home?.school_id), nameOf(g.away?.school_id)) }
      : null,
    home_name: nameOf(g.home?.school_id),
    away_name: nameOf(g.away?.school_id),
  }));

  return (
    <MatchupsView
      myProgramId={program.id}
      myName={nameOf(program.school_id)}
      shareCode={program.share_code ?? "——————"}
      seasonLabel={w ? `2026 · Week ${w.week_number}${w.kind === "rivalry" ? " · Rivalry Week" : ""}` : "Offseason"}
      facets={{ rushing: Number(f?.rushing ?? 0), passing: Number(f?.passing ?? 0), run_defense: Number(f?.run_defense ?? 0), pass_defense: Number(f?.pass_defense ?? 0), total: f?.total ?? 0 }}
      emphasisId={program.emphasis_id ?? "balanced"}
      emphases={emphases ?? []}
      games={rows}
      notice={notice}
      error={error}
      actions={{ setEmphasis, challenge, resolveNow }}
    />
  );
}

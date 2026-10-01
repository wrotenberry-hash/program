import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FactionView } from "@/components/faction-view";
import type { ChatMessage } from "@/components/faction-chat";
import { shortName, teamName } from "@/lib/schools";

export const metadata: Metadata = { title: "Your faction" };

export default async function FactionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/faction");

  const { data: program } = await supabase.from("programs").select("id, school:schools(id, name, nickname, full_name, city, state, conference_id, generic_name, generic_nickname)").eq("account_id", user.id).maybeSingle();
  if (!program) redirect("/onboarding/school");

  const { data: seat } = await supabase
    .from("league_seats")
    .select("role, faction:factions(id, name), league:leagues(id, number, conference:conferences(short_name))")
    .eq("program_id", program.id)
    .eq("status", "active")
    .maybeSingle();
  if (!seat) redirect("/program");

  const [{ data: roster }, { data: messages }, { data: cap }, { data: factions }, { count: conferenceSize }] = await Promise.all([
    supabase.rpc("faction_roster", { p_faction_id: seat.faction.id }),
    supabase.from("faction_messages").select("id, program_id, body, created_at").eq("faction_id", seat.faction.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("game_config").select("value").eq("key", "FACTION_CAP").maybeSingle(),
    supabase.from("factions").select("school_id, school:schools(id, name, nickname, full_name, city, state, generic_name, generic_nickname)").eq("league_id", seat.league.id),
    supabase.from("schools").select("id", { count: "exact", head: true }).eq("conference_id", program.school.conference_id),
  ]);

  const history: ChatMessage[] = (messages ?? []).slice().reverse();

  return (
    <FactionView
      leagueLabel={`${seat.league.conference.short_name} League ${seat.league.number}`}
      factionName={teamName(program.school)}
      role={seat.role}
      cap={Number(cap?.value ?? 100)}
      members={roster ?? []}
      messages={history}
      myProgramId={program.id}
      factionId={seat.faction.id}
      leagueSchools={(factions ?? []).map((f) => ({ school_id: f.school_id, name: shortName(f.school) }))}
      conferenceSize={conferenceSize ?? 0}
      error={error}
    />
  );
}

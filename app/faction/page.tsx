import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Notice, Wordmark } from "@/components/ui";
import { FactionChat, type ChatMessage } from "@/components/faction-chat";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Your faction" };

export default async function FactionPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/faction");

  const { data: program } = await supabase.from("programs").select("id, school:schools(name)").eq("account_id", user.id).maybeSingle();
  if (!program) redirect("/onboarding/school");

  const { data: seat } = await supabase
    .from("league_seats")
    .select("role, faction:factions(id, name), league:leagues(id, number, conference:conferences(short_name))")
    .eq("program_id", program.id)
    .eq("status", "active")
    .maybeSingle();
  if (!seat) redirect("/program");

  const [{ data: roster }, { data: messages }, { data: cap }, { data: rivals }] = await Promise.all([
    supabase.rpc("faction_roster", { p_faction_id: seat.faction.id }),
    supabase
      .from("faction_messages")
      .select("id, program_id, body, created_at")
      .eq("faction_id", seat.faction.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("game_config").select("value").eq("key", "FACTION_CAP").maybeSingle(),
    supabase
      .from("factions")
      .select("school_id, name, school:schools(name)")
      .eq("league_id", seat.league.id),
  ]);

  const members = roster ?? [];
  const names: Record<string, string> = Object.fromEntries(members.map((m) => [m.program_id, m.display_name]));
  const history: ChatMessage[] = (messages ?? []).slice().reverse();
  const humanFactions = rivals ?? [];

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between py-2">
        <Wordmark />
        <Link href="/program" className="text-sm font-semibold text-ink underline">
          Program
        </Link>
      </header>

      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {seat.league.conference.short_name} League {seat.league.number}
        </p>
        <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight">{seat.faction.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {members.length} of {Number(cap?.value ?? 100)} · {seat.role === "leader" ? "You founded this faction" : "Member"}
        </p>
      </section>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">Chat</h2>
          <FactionChat factionId={seat.faction.id} initial={history} names={names} myProgramId={program.id} />
        </div>

        <Card title="Roster">
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.program_id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold">
                    {m.display_name}
                    {m.is_me ? <span className="ml-1 text-xs font-normal text-ink-muted">(you)</span> : null}
                  </p>
                  <p className="text-xs text-ink-muted">{m.role === "leader" ? "Founder" : m.role === "officer" ? "Officer" : "Member"}</p>
                </div>
                <span className="text-xs text-ink-muted">{timeAgo(m.last_active_at)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="This League">
          <p className="text-sm">
            {humanFactions.length} of the conference&apos;s schools have a faction here. The rest are run by the house until their fans arrive.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {(rivals ?? []).map((f) => (
              <li key={f.school_id} className="rounded-full border border-line bg-bg px-2.5 py-1 text-xs">
                {f.school.name}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}

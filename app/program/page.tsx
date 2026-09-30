import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { Button, Card, Wordmark } from "@/components/ui";

export const metadata: Metadata = { title: "Your program" };

export default async function ProgramPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/program");

  const [{ data: program }, { data: profile }, { data: season }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, created_at, school:schools(id, name, full_name, nickname, city, state, conference:conferences(id, name, short_name))")
      .eq("account_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("seasons").select("id, year").eq("status", "active").maybeSingle(),
  ]);
  if (!program) redirect("/onboarding/school");

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
        <p className="mt-3 inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium">
          {season ? `${season.year} season · ${weekLabel}` : "No active season"}
        </p>
      </section>

      <div className="mt-6 flex flex-col gap-3">
        <Card title="Athletic Director">
          <p className="text-sm">Facilities, budget, and boosters.</p>
          <p className="mt-1 text-sm text-ink-muted">Opens in the next build.</p>
        </Card>
        <Card title="Head Coach">
          <p className="text-sm">Roster, scheme, and depth chart.</p>
          <p className="mt-1 text-sm text-ink-muted">Opens after the front office.</p>
        </Card>
        <Card title="Faction">
          <p className="text-sm">Every {school.name} fan in your League, on your side.</p>
          <p className="mt-1 text-sm text-ink-muted">You&apos;ll be placed when factions open.</p>
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

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProgram } from "@/app/onboarding/actions";
import { Button, Field, Input, Notice, Select, Wordmark } from "@/components/ui";
import { teamName, type SchoolNames } from "@/lib/schools";

export const metadata: Metadata = { title: "Pick your school" };

export default async function SchoolPickerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding/school");

  const [{ data: existing }, { data: profile }, { data: conferences }, { data: schools }] = await Promise.all([
    supabase.from("programs").select("id").eq("account_id", user.id).maybeSingle(),
    supabase.from("profiles").select("date_of_birth").eq("id", user.id).maybeSingle(),
    supabase.from("conferences").select("id, short_name, name, sort_order").order("sort_order"),
    supabase.from("schools").select("id, name, nickname, full_name, city, state, conference_id, generic_name, generic_nickname"),
  ]);
  if (existing) redirect("/program");

  const needsDob = !profile?.date_of_birth;
  const byConference = new Map<string, SchoolNames[]>();
  for (const s of (schools ?? []).slice().sort((a, b) => teamName(a).localeCompare(teamName(b)))) {
    const list = byConference.get(s.conference_id) ?? [];
    list.push(s);
    byConference.set(s.conference_id, list);
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="py-2">
        <Wordmark />
      </header>
      <h1 className="mt-4 text-[2.2rem] font-black leading-tight tracking-tight">Pick your school</h1>
      <p className="mt-2 text-sm font-semibold text-ink-muted">
        This is for keeps. Your program is your school&apos;s program, this season and every season after.
      </p>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <form action={createProgram} className="mt-6 flex flex-col gap-4">
        <Field label="School">
          <Select name="school_id" required defaultValue="">
            <option value="" disabled>
              Choose a school
            </option>
            {(conferences ?? []).map((c) => (
              <optgroup key={c.id} label={c.short_name}>
                {(byConference.get(c.id) ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {teamName(s)}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        {needsDob ? (
          <Field label="Date of birth" hint="Used for age-appropriate features. Never shown to anyone.">
            <Input name="date_of_birth" type="date" autoComplete="bday" required />
          </Field>
        ) : null}

        <Button type="submit" variant="gold" pulse>Start my program</Button>
      </form>
    </main>
  );
}

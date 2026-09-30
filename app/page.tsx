import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LinkButton, Wordmark } from "@/components/ui";
import { Bolt, Coin, Shield, Trophy } from "@/components/icons";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/program");

  return (
    <main className="flex flex-1 flex-col">
      <header className="py-2">
        <Wordmark />
      </header>

      <div className="flex flex-1 flex-col justify-center gap-5 py-6">
        <div className="panel relative overflow-hidden rounded-3xl border border-line bg-surface p-5">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-power/25 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-primary/25 blur-2xl" />
          <div className="relative">
            <div className="float mb-4 inline-flex items-center gap-2 rounded-full bg-power px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
              <Bolt size={14} /> Season 2026 is live
            </div>
            <h1 className="text-[2.6rem] font-black leading-[1.02] tracking-tight">
              Your school.
              <br />
              Your program.
              <br />
              <span className="text-power power-glow">Your power.</span>
            </h1>
            <p className="mt-3 text-base font-semibold text-ink-muted">
              Build the program. Rally your faction. Put your power up against your rival&apos;s every week.
            </p>
          </div>
        </div>

        <ul className="grid grid-cols-3 gap-2 text-center text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
          <li className="panel rounded-2xl border border-line bg-surface p-3">
            <Coin size={26} className="mx-auto mb-1 text-gold" />
            Build
          </li>
          <li className="panel rounded-2xl border border-line bg-surface p-3">
            <Shield size={26} className="mx-auto mb-1 text-faction" />
            Rally
          </li>
          <li className="panel rounded-2xl border border-line bg-surface p-3">
            <Trophy size={26} className="mx-auto mb-1 text-go" />
            Win
          </li>
        </ul>

        <div className="flex flex-col gap-3">
          <LinkButton href="/signup" variant="gold" pulse>
            Start my program
          </LinkButton>
          <LinkButton href="/login" variant="secondary">
            Log in
          </LinkButton>
        </div>
      </div>
      <p className="text-center text-[11px] font-semibold text-ink-muted">Early build. Placeholder art. Not affiliated with any school.</p>
    </main>
  );
}

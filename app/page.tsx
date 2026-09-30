import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LinkButton, Wordmark } from "@/components/ui";

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
      <div className="flex flex-1 flex-col justify-center gap-6 py-10">
        <div>
          <h1 className="text-4xl font-black leading-tight tracking-tight">Your school. Your program. Your people.</h1>
          <p className="mt-3 text-base text-ink-muted">
            Build your school&apos;s program and its power. Join your school&apos;s faction. Put your power up against your rival&apos;s every week.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <LinkButton href="/signup">Create your program</LinkButton>
          <LinkButton href="/login" variant="secondary">
            Log in
          </LinkButton>
        </div>
      </div>
      <p className="text-xs text-ink-muted">Early build. Placeholder art. Not affiliated with any school.</p>
    </main>
  );
}

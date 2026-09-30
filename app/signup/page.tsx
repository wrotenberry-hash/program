import type { Metadata } from "next";
import Link from "next/link";
import { signUp, signInWithGoogle } from "@/app/auth/actions";
import { Button, Field, Input, Notice, Wordmark } from "@/components/ui";

export const metadata: Metadata = { title: "Create your program" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex flex-1 flex-col">
      <header className="py-2">
        <Wordmark />
      </header>
      <h1 className="mt-4 text-[2.2rem] font-black leading-tight tracking-tight">Create your program</h1>
      <p className="mt-2 text-sm font-semibold text-ink-muted">One account, one school, one program. You pick the school next.</p>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <form action={signUp} className="mt-6 flex flex-col gap-4">
        <Field label="Your name">
          <Input name="display_name" type="text" autoComplete="name" required maxLength={60} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" inputMode="email" required />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Date of birth" hint="Used for age-appropriate features. Never shown to anyone.">
          <Input name="date_of_birth" type="date" autoComplete="bday" required />
        </Field>
        <Button type="submit" variant="gold">Create account</Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="secondary">
          Continue with Google
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-semibold text-ink-muted">
        Already have a program?{" "}
        <Link href="/login" className="font-extrabold text-primary underline">
          Log in
        </Link>
      </p>
    </main>
  );
}

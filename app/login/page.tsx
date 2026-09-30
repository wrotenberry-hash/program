import type { Metadata } from "next";
import Link from "next/link";
import { signIn, signInWithGoogle } from "@/app/auth/actions";
import { Button, Field, Input, Notice, Wordmark } from "@/components/ui";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <main className="flex flex-1 flex-col">
      <header className="py-2">
        <Wordmark />
      </header>
      <h1 className="mt-6 text-3xl font-black tracking-tight">Log in</h1>

      {error ? (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}

      <form action={signIn} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" inputMode="email" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit">Log in</Button>
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

      <p className="mt-6 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-ink underline">
          Create your program
        </Link>
      </p>
    </main>
  );
}

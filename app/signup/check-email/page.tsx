import type { Metadata } from "next";
import { Card, LinkButton, Wordmark } from "@/components/ui";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="py-2">
        <Wordmark />
      </header>
      <div className="mt-10 flex flex-col gap-4">
        <h1 className="text-[2.2rem] font-black leading-tight tracking-tight">Check your email</h1>
        <Card>
          <p className="text-sm">
            We sent a confirmation link. Open it on this phone and you&apos;ll land on the school picker.
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-muted">No email after a minute? Check spam, then try signing up again.</p>
        </Card>
        <LinkButton href="/login" variant="secondary">
          Back to log in
        </LinkButton>
      </div>
    </main>
  );
}

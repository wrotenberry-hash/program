"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { submitFeedback, type FeedbackState } from "@/app/feedback/actions";

/** Floating "This confused me" button on every screen. */
export function FeedbackButton() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitFeedback, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      const t = setTimeout(() => setOpen(false), 1200);
      return () => clearTimeout(t);
    }
  }, [state]);

  // Screen = path, plus which sub-view if a query says so; never the full query (tokens, notices).
  const screen = pathname + (search.get("tab") ? `?tab=${search.get("tab")}` : "");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-3d fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-xs font-extrabold text-ink ring-2 ring-line [--btn-edge:var(--line)]"
        aria-label="This confused me"
      >
        <span className="text-base leading-none">?</span> This confused me
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="panel w-full max-w-md rounded-t-3xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Tell us what confused you"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
            <h2 className="text-lg font-black">What confused you here?</h2>
            <p className="mt-0.5 text-xs font-semibold text-ink-muted">We save the screen you were on with your note. Anything helps, even one word.</p>
            <form ref={formRef} action={action} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="screen" value={screen} />
              <textarea
                name="note"
                required
                maxLength={2000}
                rows={4}
                autoFocus
                placeholder="I expected… / I didn't get why… / I couldn't find…"
                className="w-full rounded-2xl border-2 border-line bg-surface-2 p-3 text-base font-semibold text-ink outline-none focus:border-primary"
              />
              {state ? <p className={`text-sm font-bold ${state.ok ? "text-go" : "text-danger"}`}>{state.message}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-3d h-12 rounded-2xl bg-surface-2 text-sm font-extrabold [--btn-edge:var(--line)]">
                  Cancel
                </button>
                <button type="submit" disabled={pending} className="btn-3d h-12 rounded-2xl bg-primary text-sm font-extrabold text-primary-ink [--btn-edge:#1f4bc4]">
                  {pending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

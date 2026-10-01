"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type FeedbackState = { ok: boolean; message: string } | null;

/** Saves a "this confused me" note with the screen it came from. Works signed in or out. */
export async function submitFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const note = String(formData.get("note") ?? "").trim();
  const screen = String(formData.get("screen") ?? "").slice(0, 200);
  if (!note) return { ok: false, message: "Tell us what confused you." };
  const ua = (await headers()).get("user-agent");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_feedback", { p_screen: screen, p_note: note.slice(0, 2000), p_user_agent: ua ?? undefined });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Got it. Thank you." };
}

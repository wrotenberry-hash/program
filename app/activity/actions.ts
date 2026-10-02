"use server";

import { createClient } from "@/lib/supabase/server";

/** Marks today as a day this player opened the game. No-op when signed out. */
export async function recordVisit(): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("record_visit");
}

/** Records a named step (tutorial, invites) for funnels. Names: lowercase, digits, underscores. */
export async function recordEvent(event: string, detail?: Record<string, string | number | boolean>): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("record_event", { p_event: event, p_detail: detail ?? {} });
}

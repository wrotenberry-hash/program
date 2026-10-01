"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function postMessage(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim().slice(0, 500);
  const factionId = String(formData.get("faction_id") ?? "");
  if (!body) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/faction");
  const { data: program } = await supabase.from("programs").select("id").eq("account_id", user.id).maybeSingle();
  if (!program) redirect("/onboarding/school");
  const { error } = await supabase.from("faction_messages").insert({ faction_id: factionId, program_id: program.id, body });
  if (error) redirect(`/faction?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/faction");
}

function back(notice?: string, error?: string): never {
  const q = error ? `?error=${encodeURIComponent(error)}` : notice ? `?notice=${encodeURIComponent(notice)}` : "";
  redirect(`/faction${q}`);
}

export async function setFactionGoal(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_faction_goal", { p_goal_type_id: String(formData.get("goal_type_id") ?? "") });
  if (error) back(undefined, error.message);
  revalidatePath("/faction");
  back("Goal set. Rally the faction.");
}

export async function claimFactionGoal() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_faction_goal");
  if (error) back(undefined, error.message);
  const row = data?.[0];
  revalidatePath("/faction");
  back(row ? `Goal reward: +$${Number(row.reward).toLocaleString("en-US")}.` : undefined);
}

export async function setFactionRole(formData: FormData) {
  const supabase = await createClient();
  const role = String(formData.get("role") ?? "");
  const { error } = await supabase.rpc("set_faction_role", { p_program_id: String(formData.get("program_id") ?? ""), p_role: role });
  if (error) back(undefined, error.message);
  revalidatePath("/faction");
  back(role === "officer" ? "Promoted to officer." : "Back to member.");
}

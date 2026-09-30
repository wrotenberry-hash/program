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

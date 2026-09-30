"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function back(message?: string, tone: "notice" | "error" = "notice"): never {
  redirect(message ? `/matchups?${tone}=${encodeURIComponent(message)}` : "/matchups");
}

export async function setEmphasis(formData: FormData) {
  const id = String(formData.get("emphasis_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_emphasis", { p_emphasis_id: id });
  if (error) back(error.message, "error");
  revalidatePath("/matchups");
  back();
}

export async function challenge(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) back("Enter a friend's code.", "error");
  const supabase = await createClient();
  const { error } = await supabase.rpc("challenge_by_code", { p_code: code });
  if (error) back(error.message, "error");
  revalidatePath("/matchups");
  back("Challenge sent. It locks in a few minutes, then resolves.");
}

export async function resolveNow() {
  const supabase = await createClient();
  await supabase.rpc("resolve_due_games");
  revalidatePath("/matchups");
  back();
}

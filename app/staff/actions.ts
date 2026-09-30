"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function back(message?: string, tone: "notice" | "error" = "notice"): never {
  redirect(message ? `/staff?${tone}=${encodeURIComponent(message)}` : "/staff");
}

export async function scout() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("scout");
  if (error) back(error.message, "error");
  const row = data?.[0];
  revalidatePath("/staff");
  back(row ? `Scouts came back with ${row.shards_granted} shards.` : undefined);
}

export async function starUp(formData: FormData) {
  const id = String(formData.get("staff_id") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("star_up_staff", { p_staff_id: id });
  if (error) back(error.message, "error");
  const row = data?.[0];
  revalidatePath("/staff");
  revalidatePath("/program");
  back(row ? (row.stars === 1 ? "Coach hired. Power up." : `Now ${row.stars} stars.`) : undefined);
}

export async function levelUp(formData: FormData) {
  const id = String(formData.get("staff_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("level_up_staff", { p_staff_id: id });
  if (error) back(error.message, "error");
  revalidatePath("/staff");
  revalidatePath("/program");
  back();
}

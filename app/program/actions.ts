"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function back(message?: string): never {
  redirect(message ? `/program?notice=${encodeURIComponent(message)}` : "/program");
}

export async function joinFaction() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("place_my_program");
  if (error) back(error.message);
  revalidatePath("/program");
  back();
}

export async function collectIncome() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("collect_income");
  if (error) back(error.message);
  const row = data?.[0];
  revalidatePath("/program");
  back(row && row.collected > 0 ? `Collected $${Number(row.collected).toLocaleString("en-US")} from the boosters.` : "Nothing to collect yet. The boosters pay by the hour.");
}

export async function startUpgrade(formData: FormData) {
  const facilityId = String(formData.get("facility_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_upgrade", { p_facility_id: facilityId });
  if (error) back(error.message);
  revalidatePath("/program");
  back();
}

export async function claimUpgrade(formData: FormData) {
  const facilityId = String(formData.get("facility_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_upgrade", { p_facility_id: facilityId });
  if (error) back(error.message);
  revalidatePath("/program");
  back();
}

export async function claimCheckin() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_daily_checkin");
  if (error) back(error.message);
  const row = data?.[0];
  revalidatePath("/program");
  back(row ? `Day ${row.streak} check-in: +$${Number(row.reward).toLocaleString("en-US")}.` : undefined);
}

export async function claimDailyTask(formData: FormData) {
  const taskId = String(formData.get("task_id") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_daily_task", { p_task_id: taskId });
  if (error) back(error.message);
  const row = data?.[0];
  revalidatePath("/program");
  back(row ? `Task done: +$${Number(row.reward).toLocaleString("en-US")}.` : undefined);
}

export async function claimSeasonRewards() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_season_rewards");
  if (error) back(error.message);
  const row = data?.[0];
  revalidatePath("/program");
  back(row ? `Season rewards: +$${Number(row.reward).toLocaleString("en-US")}.` : undefined);
}

export async function claimMission(formData: FormData) {
  const missionId = String(formData.get("mission_id") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_mission", { p_mission_id: missionId });
  if (error) back(error.message);
  const row = data?.[0];
  revalidatePath("/program");
  back(row ? `Mission complete: +$${Number(row.reward).toLocaleString("en-US")}.` : undefined);
}

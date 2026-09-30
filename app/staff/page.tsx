import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StaffView, type StaffRow } from "@/components/staff-view";
import { levelUp, scout, starUp } from "@/app/staff/actions";
import { FACETS } from "@/lib/facets";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/staff");

  const { data: program } = await supabase.from("programs").select("id").eq("account_id", user.id).maybeSingle();
  if (!program) redirect("/onboarding/school");

  const [{ data: catalog }, { data: mine }, { data: treasury }, { data: config }] = await Promise.all([
    supabase.from("staff").select("*").order("sort_order"),
    supabase.from("program_staff").select("staff_id, shards, stars, level").eq("program_id", program.id),
    supabase.from("program_treasury").select("cash, last_scouted_at").eq("program_id", program.id).maybeSingle(),
    supabase.from("game_config").select("key, value").in("key", ["SCOUT_COOLDOWN_HOURS", "SCOUT_SHARDS", "STAFF_LEVEL_COST_BASE"]),
  ]);
  const cfg = Object.fromEntries((config ?? []).map((c) => [c.key, Number(c.value)]));
  const cooldownH = cfg.SCOUT_COOLDOWN_HOURS ?? 4;
  const byId = new Map((mine ?? []).map((m) => [m.staff_id, m]));

  const rows: StaffRow[] = (catalog ?? []).map((s) => {
    const m = byId.get(s.id);
    const weights = { rushing: s.rushing, passing: s.passing, run_defense: s.run_defense, pass_defense: s.pass_defense };
    const top = FACETS.slice().sort((a, b) => weights[b.key] - weights[a.key])[0];
    const lean = Math.max(...Object.values(weights)) <= 0.3 ? "everything" : top.label.toLowerCase();
    return {
      id: s.id, name: s.name, role: s.role, rarity: s.rarity, base_power: s.base_power, power_per_level: s.power_per_level,
      unlock_shards: s.unlock_shards, star_shards: s.star_shards, max_stars: s.max_stars, max_level: s.max_level, lean,
      shards: m?.shards ?? 0, stars: m?.stars ?? 0, level: m?.level ?? 1,
    };
  });

  const nextScoutAt = treasury?.last_scouted_at ? new Date(new Date(treasury.last_scouted_at).getTime() + cooldownH * 3600e3).toISOString() : null;

  return (
    <StaffView
      cash={treasury?.cash ?? 0}
      nextScoutAt={nextScoutAt}
      scoutShards={cfg.SCOUT_SHARDS ?? 5}
      levelCostBase={cfg.STAFF_LEVEL_COST_BASE ?? 200}
      staff={rows}
      notice={notice}
      error={error}
      actions={{ scout, starUp, levelUp }}
    />
  );
}

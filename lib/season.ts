import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * What season the game is showing, including the offseason between seasons.
 * Reads season_display() so no screen hardcodes a year (docs/phase-5/season-rollover.md).
 */
export type SeasonDisplay = {
  seasonId: string | null;
  year: number | null;
  /** "active" during a season, "complete" in the offseason after one, "none" before the first. */
  status: "active" | "complete" | "none";
  weekNumber: number | null;
  weekKind: string | null;
  nextYear: number | null;
  nextStartsOn: string | null;
};

export async function loadSeason(supabase: SupabaseClient<Database>): Promise<SeasonDisplay> {
  const { data } = await supabase.rpc("season_display");
  const r = data?.[0];
  const status = r?.status === "active" || r?.status === "complete" ? r.status : "none";
  return {
    seasonId: r?.season_id ?? null,
    year: r?.year ?? null,
    status,
    weekNumber: r?.week_number ?? null,
    weekKind: r?.week_kind ?? null,
    nextYear: r?.next_season_id ? Number(r.next_season_id) : null,
    nextStartsOn: r?.next_starts_on ?? null,
  };
}

export function weekLabel(kind: string | null, n: number | null): string {
  if (kind === "rivalry") return "Rivalry Week";
  if (kind === "championship") return "Championship Week";
  return n === null ? "" : `Week ${n}`;
}

function kickoff(s: SeasonDisplay): string {
  if (!s.nextYear || !s.nextStartsOn) return "";
  const d = new Date(`${s.nextStartsOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${s.nextYear} kicks off ${d}`;
}

/** "2026 · Week 4", "Offseason · 2027 kicks off Aug 28", or "Offseason". */
export function seasonLabel(s: SeasonDisplay): string {
  if (s.status === "active" && s.year) return `${s.year} · ${weekLabel(s.weekKind, s.weekNumber)}`;
  const k = kickoff(s);
  return k ? `Offseason · ${k}` : "Offseason";
}

/** Label for a season's standings: live during the season, final after it. */
export function standingsLabel(s: SeasonDisplay): string {
  if (s.status === "active" && s.year) return `${s.year} · ${weekLabel(s.weekKind, s.weekNumber)}`;
  if (s.status === "complete" && s.year) return `${s.year} final`;
  return seasonLabel(s);
}

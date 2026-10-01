import { flags } from "@/lib/flags";

/**
 * Every place a school appears goes through these helpers, so the
 * FLAG_SCHOOL_NAMES switch covers the whole app. Stored program and faction
 * names in the database are never displayed directly.
 */
export const SCHOOL_COLUMNS = "id, name, nickname, full_name, city, state, conference_id, generic_name, generic_nickname";

export type SchoolNames = {
  id: string;
  name: string;
  nickname: string;
  full_name: string;
  city: string | null;
  state: string | null;
  generic_name: string | null;
  generic_nickname: string | null;
};

/** Short name: "Texas" or "Austin". */
export function shortName(s: SchoolNames): string {
  return flags.schoolNames ? s.name : (s.generic_name ?? s.city ?? "Team");
}

/** Team name: "Texas Longhorns" or "Austin Guardians". Used for programs and factions. */
export function teamName(s: SchoolNames): string {
  return flags.schoolNames ? `${s.name} ${s.nickname}` : `${s.generic_name ?? s.city ?? "Team"} ${s.generic_nickname ?? ""}`.trim();
}

/** Subtitle under a team name. Generic mode shows only the location. */
export function schoolSubtitle(s: SchoolNames): string {
  const place = s.city ? `${s.city}, ${s.state}` : "";
  if (!flags.schoolNames) return place;
  return place ? `${s.full_name} · ${place}` : s.full_name;
}

/** A result narrative with the right names. Falls back to "Final." for old results without a template. */
export function renderNarrative(result: { narrative?: string | null; narrative_template?: string | null } | null, home: string, away: string): string {
  if (!result) return "";
  if (flags.schoolNames && result.narrative) return result.narrative;
  if (result.narrative_template) return result.narrative_template.replaceAll("{home}", home).replaceAll("{away}", away);
  return flags.schoolNames ? (result.narrative ?? "") : "Final.";
}

/** Map of all schools by id, for screens that show many. */
export async function loadSchools(supabase: { from: (t: "schools") => { select: (c: string) => PromiseLike<{ data: unknown }> } }): Promise<Map<string, SchoolNames>> {
  const { data } = await supabase.from("schools").select(SCHOOL_COLUMNS);
  return new Map(((data as SchoolNames[] | null) ?? []).map((s) => [s.id, s]));
}

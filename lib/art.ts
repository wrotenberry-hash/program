/**
 * Building art (docs/art-brief.md). Three looks per building: levels 1–2,
 * 3–4, and 5. Level 0 (not built) shows the first look, dimmed by the view.
 * Buildings without art yet return null and the view falls back to text.
 */
const AVAILABLE = new Set(["stadium", "booster-club", "weight-room", "practice-facility", "film-room", "academic-center"]);

export function buildingTier(level: number): 1 | 2 | 3 {
  return level >= 5 ? 3 : level >= 3 ? 2 : 1;
}

/** Buildings already redrawn in the sleek evening style (docs/mockups/home-target-2026-10-02.png). */
const V2 = new Set(["stadium"]);

export function buildingArt(facilityId: string, level: number): string | null {
  if (!AVAILABLE.has(facilityId)) return null;
  return `/art/${V2.has(facilityId) ? "buildings-v2" : "buildings"}/${facilityId}-${buildingTier(level)}.webp`;
}

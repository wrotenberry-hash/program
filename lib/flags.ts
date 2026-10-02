/**
 * Feature flags. Later-phase features land here, default off (CLAUDE.md §6).
 *
 * Flags read server-side environment variables so production, previews, and
 * staging can differ without a code change. Set "1" to turn a flag on. The
 * database enforces the gameplay flags too (game_config FEATURE_* keys), so a
 * client cannot reach a feature the server has off.
 */
function on(name: string): boolean {
  const v = process.env[name];
  return v === "1" || v === "true";
}

export const flags = {
  /** The monetization layer. Never on until the founder decides the payment rail. */
  monetizationEnabled: false,
  /** Real school names and nicknames. Off shows generic city-based names. ON for the private test. */
  schoolNames: on("FLAG_SCHOOL_NAMES"),
  /** Daily check-in reward and the three-item daily task strip. */
  dailyRewards: on("FLAG_DAILY_REWARDS"),
  /** Weekly faction goal, shared reward, and the officer role. */
  factionGoals: on("FLAG_FACTION_GOALS"),
  /** Season-end rewards: claim the prize for your faction's final place and games played. */
  seasonRewards: on("FLAG_SEASON_REWARDS"),
  /** Adults only: signups under 18 are turned away. On for the beta (database: FEATURE_ADULTS_ONLY). */
  adultsOnly: on("FLAG_ADULTS_ONLY"),
  /** The illustrated campus: tap a building to upgrade it. Replaces the facilities list. */
  campusArt: on("FLAG_CAMPUS_ART"),
} as const;

export type FlagName = keyof typeof flags;

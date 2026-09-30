/**
 * Feature flags. Later-phase features land here, default off (CLAUDE.md §6).
 * Flip a flag by editing this file and deploying; there is no runtime toggle.
 */
export const flags = {
  /**
   * The monetization layer. While off, nothing is purchasable and no store
   * surface renders. Config tables exist regardless (CLAUDE.md §3.5).
   */
  monetizationEnabled: false,
} as const;

export type FlagName = keyof typeof flags;

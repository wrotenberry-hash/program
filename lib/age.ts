/**
 * Age-gate helpers. Mirrors public.is_minor(date) in the database so the
 * client and server agree. The beta is adults only (CONTEXT.md 2026-10-02),
 * enforced behind flags.adultsOnly and FEATURE_ADULTS_ONLY.
 */
export const ADULT_AGE = 18;

export function isMinor(dateOfBirth: string | null | undefined, today = new Date()): boolean {
  if (!dateOfBirth) return false;
  const dob = new Date(dateOfBirth + "T00:00:00Z");
  const cutoff = new Date(Date.UTC(today.getUTCFullYear() - ADULT_AGE, today.getUTCMonth(), today.getUTCDate()));
  return dob > cutoff;
}

/** A date of birth is plausible if it is in the past and under 120 years ago. */
export function isPlausibleDateOfBirth(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const dob = new Date(value + "T00:00:00Z");
  if (Number.isNaN(dob.getTime())) return false;
  const now = new Date();
  const oldest = new Date(Date.UTC(now.getUTCFullYear() - 120, 0, 1));
  return dob < now && dob > oldest;
}

// Match scoring algorithm — PRD Section 4: Matching Logic
// Returns a score in [0, 1]. Higher is a better match.
// Category match and women_only are hard filters enforced upstream; they are not re-checked here.

export interface MatchScoreInput {
  /** Requester's profile data */
  requesterAge: number;
  requesterTrustScore: number;
  requesterCity: string;
  /** Requester's stored preference for the activity's category (may be null if not set) */
  requesterPreference: {
    preferredAgeRangeMin: number;
    preferredAgeRangeMax: number;
  } | null;

  /** Poster's profile data */
  posterAge: number;
  posterTrustScore: number;
  /** Poster's stored preference for the activity's category (may be null if not set) */
  posterPreference: {
    preferredAgeRangeMin: number;
    preferredAgeRangeMax: number;
  } | null;

  /** Activity data */
  activityCity: string;
  /** Null for recurring activities with no fixed date */
  activityDateTime: string | null;

  /** True if the pair has a previous review with rating ≤ 2 */
  hasBadPriorHistory: boolean;
}

export function calculateMatchScore(input: MatchScoreInput): number {
  // Prior match history modifier — suppress the match entirely
  if (input.hasBadPriorHistory) return 0;

  // ── Neighborhood proximity (30%) ──────────────────────────────────────────
  // User profiles store city, not neighborhood.
  // Same city is treated as the maximum proximity score achievable with current data.
  const locationScore =
    input.requesterCity.toLowerCase().trim() === input.activityCity.toLowerCase().trim()
      ? 1.0
      : 0.3;

  // ── Timing compatibility (25%) ────────────────────────────────────────────
  // A fixed date_time means the requester is committing to a known slot (best fit).
  // Recurring activities without a specific date carry more uncertainty.
  const timingScore = input.activityDateTime ? 1.0 : 0.5;

  // ── Trust score delta (20%) ───────────────────────────────────────────────
  // Penalise large gaps so highly-rated veterans are not mismatched with new users.
  const trustDelta = Math.abs(input.requesterTrustScore - input.posterTrustScore);
  const trustScore = trustDelta < 1.0 ? 1.0 : trustDelta < 2.0 ? 0.7 : 0.3;

  // ── Gender preference compatibility (15%) ─────────────────────────────────
  // Women-only hard filter has already been applied before this function is called,
  // so any request that reaches here is gender-compatible.
  const genderScore = 1.0;

  // ── Age range compatibility (10%) ─────────────────────────────────────────
  // Check bidirectional: is the requester within the poster's preferred range,
  // and is the poster within the requester's preferred range?
  const posterPrefMin = input.posterPreference?.preferredAgeRangeMin ?? 18;
  const posterPrefMax = input.posterPreference?.preferredAgeRangeMax ?? 65;
  const requesterPrefMin = input.requesterPreference?.preferredAgeRangeMin ?? 18;
  const requesterPrefMax = input.requesterPreference?.preferredAgeRangeMax ?? 65;

  const requesterInPosterRange =
    input.requesterAge >= posterPrefMin && input.requesterAge <= posterPrefMax;
  const posterInRequesterRange =
    input.posterAge >= requesterPrefMin && input.posterAge <= requesterPrefMax;

  const ageScore =
    requesterInPosterRange && posterInRequesterRange
      ? 1.0
      : requesterInPosterRange || posterInRequesterRange
        ? 0.5
        : 0.0;

  return (
    locationScore * 0.3 +
    timingScore   * 0.25 +
    trustScore    * 0.2 +
    genderScore   * 0.15 +
    ageScore      * 0.1
  );
}

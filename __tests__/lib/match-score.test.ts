import { calculateMatchScore, type MatchScoreInput } from '@/lib/match-score';

function baseInput(overrides: Partial<MatchScoreInput> = {}): MatchScoreInput {
  return {
    requesterAge: 30,
    requesterTrustScore: 4.0,
    requesterCity: 'Cape Town',
    requesterPreference: { preferredAgeRangeMin: 25, preferredAgeRangeMax: 40 },
    posterAge: 32,
    posterTrustScore: 4.2,
    posterCity: 'Cape Town',
    posterPreference: { preferredAgeRangeMin: 25, preferredAgeRangeMax: 40 },
    activityCity: 'Cape Town',
    activityDateTime: '2026-05-01T17:00:00Z',
    hasBadPriorHistory: false,
    ...overrides,
  } as MatchScoreInput;
}

describe('calculateMatchScore', () => {
  it('returns 0 when hasBadPriorHistory is true', () => {
    expect(calculateMatchScore(baseInput({ hasBadPriorHistory: true }))).toBe(0);
  });

  describe('location weight (30%)', () => {
    it('scores 1.0 for same city (case-insensitive)', () => {
      const score = calculateMatchScore(baseInput({
        requesterCity: 'cape town',
        activityCity: 'Cape Town',
      }));
      expect(score).toBeGreaterThan(0.9);
    });

    it('scores 0.3 for different city', () => {
      const sameCity = calculateMatchScore(baseInput());
      const diffCity = calculateMatchScore(baseInput({
        requesterCity: 'Johannesburg',
        activityCity: 'Cape Town',
      }));
      expect(diffCity).toBeLessThan(sameCity);
      expect(sameCity - diffCity).toBeCloseTo(0.3 * (1.0 - 0.3), 5);
    });
  });

  describe('timing weight (25%)', () => {
    it('scores 1.0 for fixed date_time', () => {
      const withDate = calculateMatchScore(baseInput({
        activityDateTime: '2026-05-01T17:00:00Z',
      }));
      const withoutDate = calculateMatchScore(baseInput({
        activityDateTime: null,
      }));
      expect(withDate).toBeGreaterThan(withoutDate);
      expect(withDate - withoutDate).toBeCloseTo(0.25 * (1.0 - 0.5), 5);
    });

    it('scores 0.5 for recurring (null date_time)', () => {
      const score = calculateMatchScore(baseInput({ activityDateTime: null }));
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('trust score delta weight (20%)', () => {
    it('scores 1.0 when delta < 1.0', () => {
      const close = calculateMatchScore(baseInput({
        requesterTrustScore: 4.0,
        posterTrustScore: 4.5,
      }));
      const far = calculateMatchScore(baseInput({
        requesterTrustScore: 4.0,
        posterTrustScore: 1.5,
      }));
      expect(close).toBeGreaterThan(far);
    });

    it('scores 0.7 when 1.0 <= delta < 2.0', () => {
      const midDelta = calculateMatchScore(baseInput({
        requesterTrustScore: 4.0,
        posterTrustScore: 2.5,
      }));
      const closeDelta = calculateMatchScore(baseInput({
        requesterTrustScore: 4.0,
        posterTrustScore: 4.2,
      }));
      expect(closeDelta).toBeGreaterThan(midDelta);
    });

    it('scores 0.3 when delta >= 2.0', () => {
      const hugeDelta = calculateMatchScore(baseInput({
        requesterTrustScore: 5.0,
        posterTrustScore: 1.0,
      }));
      const closeDelta = calculateMatchScore(baseInput({
        requesterTrustScore: 5.0,
        posterTrustScore: 4.5,
      }));
      expect(closeDelta).toBeGreaterThan(hugeDelta);
    });
  });

  describe('age range compatibility weight (10%)', () => {
    it('scores 1.0 when both ages are within each others preferred range', () => {
      const score = calculateMatchScore(baseInput({
        requesterAge: 30,
        posterAge: 32,
        requesterPreference: { preferredAgeRangeMin: 25, preferredAgeRangeMax: 40 },
        posterPreference: { preferredAgeRangeMin: 25, preferredAgeRangeMax: 40 },
      }));
      expect(score).toBeCloseTo(1.0, 5);
    });

    it('scores 0.5 when only one age is in range', () => {
      const bothInRange = calculateMatchScore(baseInput());
      const oneInRange = calculateMatchScore(baseInput({
        requesterAge: 50,
        posterAge: 55,
        requesterPreference: { preferredAgeRangeMin: 45, preferredAgeRangeMax: 60 },
        posterPreference: { preferredAgeRangeMin: 25, preferredAgeRangeMax: 40 },
      }));
      expect(bothInRange).toBeGreaterThan(oneInRange);
      expect(bothInRange - oneInRange).toBeCloseTo(0.1 * 0.5, 5);
    });

    it('scores 0.0 when neither age is in range', () => {
      const neitherInRange = calculateMatchScore(baseInput({
        requesterAge: 50,
        posterAge: 50,
        requesterPreference: { preferredAgeRangeMin: 20, preferredAgeRangeMax: 25 },
        posterPreference: { preferredAgeRangeMin: 20, preferredAgeRangeMax: 25 },
      }));
      const bothInRange = calculateMatchScore(baseInput());
      expect(bothInRange).toBeGreaterThan(neitherInRange);
      expect(bothInRange - neitherInRange).toBeCloseTo(0.1 * 1.0, 5);
    });

    it('uses defaults 18-65 when preferences are null', () => {
      const score = calculateMatchScore(baseInput({
        requesterPreference: null,
        posterPreference: null,
      }));
      expect(score).toBeCloseTo(1.0, 5);
    });
  });

  it('computes the correct weighted sum for a perfect match', () => {
    const score = calculateMatchScore(baseInput());
    const expected =
      1.0 * 0.30 + // location: same city
      1.0 * 0.25 + // timing: fixed date
      1.0 * 0.20 + // trust: delta < 1.0
      1.0 * 0.15 + // gender: always 1.0
      1.0 * 0.10;  // age: both in range
    expect(score).toBeCloseTo(expected, 5);
    expect(score).toBeCloseTo(1.0, 5);
  });
});

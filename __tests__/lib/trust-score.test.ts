import { formatTrustScore } from '@/lib/trust-score';

describe('formatTrustScore', () => {
  it('returns "New" for score 0', () => {
    expect(formatTrustScore(0)).toBe('New');
  });

  it('formats integer scores with one decimal', () => {
    expect(formatTrustScore(4)).toBe('4.0');
  });

  it('formats decimal scores with one decimal', () => {
    expect(formatTrustScore(3.75)).toBe('3.8');
  });

  it('formats a perfect score', () => {
    expect(formatTrustScore(5)).toBe('5.0');
  });

  it('formats low non-zero scores', () => {
    expect(formatTrustScore(0.1)).toBe('0.1');
  });
});

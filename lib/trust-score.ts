export function formatTrustScore(score: number): string {
  return score === 0 ? 'New' : score.toFixed(1);
}

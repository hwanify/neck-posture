/**
 * Coarse buckets for anonymous usage stats: exact durations and counts never leave the phone.
 */

export function durationBucket(seconds: number): string {
  const min = seconds / 60;
  if (min < 5) return '<5m';
  if (min < 15) return '5-15m';
  if (min < 30) return '15-30m';
  if (min < 60) return '30-60m';
  return '60m+';
}

export function countBucket(n: number): string {
  if (n <= 0) return '0';
  if (n <= 2) return '1-2';
  if (n <= 5) return '3-5';
  if (n <= 10) return '6-10';
  return '11+';
}

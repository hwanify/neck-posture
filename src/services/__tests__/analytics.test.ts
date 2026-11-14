import { describe, expect, it } from '@jest/globals';

import { analytics, minutesBucket, percentBucket } from '../analytics';

describe('analytics buckets', () => {
  it('buckets session length in minutes', () => {
    expect(minutesBucket(0)).toBe('0-5m');
    expect(minutesBucket(299)).toBe('0-5m');
    expect(minutesBucket(300)).toBe('5-15m');
    expect(minutesBucket(45 * 60)).toBe('30-60m');
    expect(minutesBucket(3 * 3600)).toBe('60m+');
  });

  it('buckets ratios in steps of 20 and keeps 100% in the top bucket', () => {
    expect(percentBucket(0)).toBe('0-20');
    expect(percentBucket(0.79)).toBe('60-80');
    expect(percentBucket(1)).toBe('80-100');
  });

  it('does nothing when Firebase is not in the build', () => {
    expect(() => analytics.sessionStart('airpods')).not.toThrow();
  });
});

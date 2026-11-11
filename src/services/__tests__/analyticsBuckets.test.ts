import { describe, expect, it } from '@jest/globals';

import { countBucket, durationBucket } from '../analyticsBuckets';

describe('analytics buckets', () => {
  it('buckets durations', () => {
    expect(durationBucket(0)).toBe('<5m');
    expect(durationBucket(4 * 60 + 59)).toBe('<5m');
    expect(durationBucket(5 * 60)).toBe('5-15m');
    expect(durationBucket(20 * 60)).toBe('15-30m');
    expect(durationBucket(45 * 60)).toBe('30-60m');
    expect(durationBucket(3 * 3600)).toBe('60m+');
  });

  it('buckets counts', () => {
    expect(countBucket(0)).toBe('0');
    expect(countBucket(2)).toBe('1-2');
    expect(countBucket(5)).toBe('3-5');
    expect(countBucket(10)).toBe('6-10');
    expect(countBucket(40)).toBe('11+');
  });
});

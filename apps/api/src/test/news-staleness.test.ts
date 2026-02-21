import { describe, expect, it } from 'vitest';
import type { NewsItem } from '@anylical/shared-types';
import { isNewsFeedStale } from '../routes/stocks.js';

function makeNewsItem(publishedAt: string): NewsItem {
  return {
    id: 'n1',
    symbol: 'RELIANCE.NS',
    source: 'moneycontrol.com',
    title: 'Reliance quarterly update',
    url: 'https://example.com/article',
    publishedAt,
    sentiment: 0.2,
    confidence: 71,
    credibilityWeight: 0.85,
    isDuplicate: false,
  };
}

describe('news feed staleness', () => {
  const now = Date.parse('2026-02-20T12:00:00.000Z');

  it('marks empty feeds as stale', () => {
    expect(isNewsFeedStale([], now)).toBe(true);
  });

  it('marks recent feeds as fresh', () => {
    const feed = [makeNewsItem('2026-02-20T09:00:00.000Z')];
    expect(isNewsFeedStale(feed, now)).toBe(false);
  });

  it('marks old feeds as stale', () => {
    const feed = [makeNewsItem('2026-02-20T02:00:00.000Z')];
    expect(isNewsFeedStale(feed, now)).toBe(true);
  });

  it('marks invalid publishedAt values as stale', () => {
    const feed = [makeNewsItem('not-a-date')];
    expect(isNewsFeedStale(feed, now)).toBe(true);
  });
});

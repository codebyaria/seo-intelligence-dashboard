import { describe, expect, it, beforeEach } from 'vitest';
import { _resetDatasetCache, buildDataset } from '../src/data/build-dataset';
import type { AnalyticsQuery } from '../src/data/types';
import {
  buildDailyTrend,
  filterAnalytics,
  filterClarity,
  filterSearchConsole,
  summarizeOverview,
  topKeywords,
  topPages,
} from '../src/lib/processing';

function emptyQuery(): AnalyticsQuery {
  return {};
}

describe('buildDataset', () => {
  beforeEach(() => _resetDatasetCache());

  it('produces a deterministic dataset for the same seed', () => {
    _resetDatasetCache();
    const a = buildDataset({ seed: 42, days: 7, endDate: new Date('2026-01-08T00:00:00Z') });
    _resetDatasetCache();
    const b = buildDataset({ seed: 42, days: 7, endDate: new Date('2026-01-08T00:00:00Z') });
    expect(a.searchConsole.length).toBe(b.searchConsole.length);
    expect(a.searchConsole[0]).toEqual(b.searchConsole[0]);
    expect(a.dateRange.startDate).toBe('2026-01-02');
    expect(a.dateRange.endDate).toBe('2026-01-08');
  });

  it('caches the dataset across calls within the same module scope', () => {
    const a = buildDataset({ seed: 1, days: 3 });
    const b = buildDataset({ seed: 999, days: 99 }); // ignored — cached
    expect(a.generatedAt).toBe(b.generatedAt);
  });
});

describe('filters', () => {
  beforeEach(() => _resetDatasetCache());

  it('filters search console rows by date and device', () => {
    const ds = buildDataset({ seed: 7, days: 10 });
    const q: AnalyticsQuery = { device: 'mobile', startDate: ds.dateRange.startDate };
    const out = filterSearchConsole(ds.searchConsole, q);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.device === 'mobile')).toBe(true);
    expect(out.every((r) => r.date >= ds.dateRange.startDate)).toBe(true);
  });

  it('filters analytics rows by country', () => {
    const ds = buildDataset({ seed: 7, days: 10 });
    const out = filterAnalytics(ds.analytics, { country: 'ID' });
    expect(out.every((r) => r.country === 'ID')).toBe(true);
  });

  it('filters clarity rows by device only (no country)', () => {
    const ds = buildDataset({ seed: 7, days: 5 });
    const out = filterClarity(ds.clarity, { device: 'desktop' });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.device === 'desktop')).toBe(true);
  });
});

describe('summarizeOverview', () => {
  beforeEach(() => _resetDatasetCache());

  it('returns zeros for empty inputs', () => {
    const out = summarizeOverview([], [], []);
    expect(out).toEqual({
      organicClicks: 0,
      organicImpressions: 0,
      averageCtr: 0,
      averagePosition: 0,
      sessions: 0,
      engagedSessions: 0,
      conversionRate: 0,
      conversions: 0,
      avgEngagementRate: 0,
      avgScrollDepth: 0,
      deadClicks: 0,
      rageClicks: 0,
      quickBacks: 0,
    });
  });

  it('aggregates deterministic metrics for the seeded dataset', () => {
    _resetDatasetCache();
    const ds = buildDataset({ seed: 11, days: 14 });
    const out = summarizeOverview(ds.searchConsole, ds.analytics, ds.clarity);
    expect(out.organicImpressions).toBeGreaterThan(0);
    expect(out.organicClicks).toBeGreaterThan(0);
    expect(out.organicClicks).toBeLessThanOrEqual(out.organicImpressions);
    expect(out.averageCtr).toBeGreaterThan(0);
    expect(out.averageCtr).toBeLessThan(1);
    expect(out.averagePosition).toBeGreaterThan(0);
    expect(out.sessions).toBeGreaterThan(0);
    expect(out.engagedSessions).toBeLessThanOrEqual(out.sessions);
    expect(out.conversions).toBeLessThanOrEqual(out.engagedSessions);
    expect(out.conversionRate).toBeGreaterThan(0);
  });
});

describe('buildDailyTrend', () => {
  beforeEach(() => _resetDatasetCache());

  it('returns one point per date present across inputs', () => {
    const ds = buildDataset({ seed: 3, days: 5 });
    const trend = buildDailyTrend(ds.searchConsole, ds.analytics);
    const dates = new Set(trend.map((t) => t.date));
    expect(dates.size).toBe(trend.length);
    expect(trend[0]!.date <= trend[trend.length - 1]!.date).toBe(true);
  });
});

describe('topKeywords', () => {
  beforeEach(() => _resetDatasetCache());

  it('returns at most `limit` rows and is sorted by clicks desc', () => {
    const ds = buildDataset({ seed: 5, days: 10 });
    const rows = topKeywords(ds.searchConsole, 5);
    expect(rows.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.clicks).toBeGreaterThanOrEqual(rows[i]!.clicks);
    }
  });
});

describe('topPages', () => {
  beforeEach(() => _resetDatasetCache());

  it('merges GSC and analytics data by page and is sorted by sessions desc', () => {
    const ds = buildDataset({ seed: 9, days: 10 });
    const rows = topPages(ds.searchConsole, ds.analytics, 3);
    expect(rows.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.sessions).toBeGreaterThanOrEqual(rows[i]!.sessions);
    }
    // Every row should have both GSC and analytics fields populated.
    expect(rows.every((r) => r.impressions >= 0 && r.sessions >= 0)).toBe(true);
  });
});

describe('emptyQuery helper', () => {
  it('returns an empty object', () => {
    expect(emptyQuery()).toEqual({});
  });
});

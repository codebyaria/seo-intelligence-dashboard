/**
 * Pure data-processing functions for the simulated dataset.
 *
 * Everything here is side-effect free so Vitest can drive the API boundary
 * deterministically.
 */
import type { AnalyticsRow, ClarityRow, Device, SearchConsoleRow } from '../data/types';
import type { AnalyticsQuery } from '../data/types';

export function isDevice(value: string | undefined | null): value is Device {
  return value === 'desktop' || value === 'mobile' || value === 'tablet';
}

/** Filter GSC rows by an analytics query. */
export function filterSearchConsole(
  rows: readonly SearchConsoleRow[],
  q: AnalyticsQuery,
): SearchConsoleRow[] {
  return rows.filter((r) => {
    if (q.startDate && r.date < q.startDate) return false;
    if (q.endDate && r.date > q.endDate) return false;
    if (q.device && r.device !== q.device) return false;
    if (q.country && r.country !== q.country) return false;
    if (q.searchType && r.searchType !== q.searchType) return false;
    return true;
  });
}

export function filterAnalytics(rows: readonly AnalyticsRow[], q: AnalyticsQuery): AnalyticsRow[] {
  return rows.filter((r) => {
    if (q.startDate && r.date < q.startDate) return false;
    if (q.endDate && r.date > q.endDate) return false;
    if (q.device && r.device !== q.device) return false;
    if (q.country && r.country !== q.country) return false;
    return true;
  });
}

export function filterClarity(rows: readonly ClarityRow[], q: AnalyticsQuery): ClarityRow[] {
  return rows.filter((r) => {
    if (q.startDate && r.date < q.startDate) return false;
    if (q.endDate && r.date > q.endDate) return false;
    if (q.device && r.device !== q.device) return false;
    return true;
  });
}

export interface OverviewKpis {
  organicClicks: number;
  organicImpressions: number;
  averageCtr: number;
  averagePosition: number;
  sessions: number;
  engagedSessions: number;
  conversionRate: number;
  conversions: number;
  avgEngagementRate: number;
  avgScrollDepth: number;
  deadClicks: number;
  rageClicks: number;
  quickBacks: number;
}

export function summarizeOverview(
  gsc: readonly SearchConsoleRow[],
  analytics: readonly AnalyticsRow[],
  clarity: readonly ClarityRow[],
): OverviewKpis {
  const totalImpressions = gsc.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = gsc.reduce((s, r) => s + r.clicks, 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  // Position is impression-weighted (mirrors GSC's "weighted average position").
  const weightedPosNum = gsc.reduce((s, r) => s + r.position * r.impressions, 0);
  const avgPosition = totalImpressions > 0 ? weightedPosNum / totalImpressions : 0;

  const totalSessions = analytics.reduce((s, r) => s + r.sessions, 0);
  const totalEngaged = analytics.reduce((s, r) => s + r.engagedSessions, 0);
  const totalConversions = analytics.reduce((s, r) => s + r.conversions, 0);
  const avgEngagement = totalSessions > 0 ? totalEngaged / totalSessions : 0;
  const conversionRate = totalSessions > 0 ? totalConversions / totalSessions : 0;

  const totalSessionsClarity = clarity.reduce((s, r) => s + r.sessions, 0);
  const totalDead = clarity.reduce((s, r) => s + r.deadClicks, 0);
  const totalRage = clarity.reduce((s, r) => s + r.rageClicks, 0);
  const totalQuick = clarity.reduce((s, r) => s + r.quickBacks, 0);
  const avgScroll =
    clarity.length > 0
      ? clarity.reduce((s, r) => s + r.avgScrollDepth * r.sessions, 0) /
        Math.max(1, totalSessionsClarity)
      : 0;

  return {
    organicClicks: totalClicks,
    organicImpressions: totalImpressions,
    averageCtr: round(avgCtr, 4),
    averagePosition: round(avgPosition, 1),
    sessions: totalSessions,
    engagedSessions: totalEngaged,
    conversionRate: round(conversionRate, 4),
    conversions: totalConversions,
    avgEngagementRate: round(avgEngagement, 4),
    avgScrollDepth: round(avgScroll, 3),
    deadClicks: totalDead,
    rageClicks: totalRage,
    quickBacks: totalQuick,
  };
}

export interface DailyTrendPoint {
  date: string;
  clicks: number;
  impressions: number;
  sessions: number;
  conversions: number;
}

/** Daily trend combining GSC clicks/impressions with GA4 sessions/conversions. */
export function buildDailyTrend(
  gsc: readonly SearchConsoleRow[],
  analytics: readonly AnalyticsRow[],
): DailyTrendPoint[] {
  const byDate = new Map<string, DailyTrendPoint>();
  for (const r of gsc) {
    const cur =
      byDate.get(r.date) ??
      ({ date: r.date, clicks: 0, impressions: 0, sessions: 0, conversions: 0 } as DailyTrendPoint);
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    byDate.set(r.date, cur);
  }
  for (const r of analytics) {
    const cur =
      byDate.get(r.date) ??
      ({ date: r.date, clicks: 0, impressions: 0, sessions: 0, conversions: 0 } as DailyTrendPoint);
    cur.sessions += r.sessions;
    cur.conversions += r.conversions;
    byDate.set(r.date, cur);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface KeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  trend: number; // % change in clicks, last 7 vs previous 7
}

export function topKeywords(gsc: readonly SearchConsoleRow[], limit = 20): KeywordRow[] {
  const agg = new Map<string, { clicks: number; impressions: number; posNum: number }>();
  for (const r of gsc) {
    const cur = agg.get(r.query) ?? { clicks: 0, impressions: 0, posNum: 0 };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    cur.posNum += r.position * r.impressions;
    agg.set(r.query, cur);
  }

  // Compute trend: last 7 days vs previous 7 days clicks per query.
  const sorted = [...gsc].sort((a, b) => (a.date < b.date ? -1 : 1));
  const lastDate = sorted.at(-1)?.date ?? '';
  const last7Start = shiftDate(lastDate, -6);
  const prev7Start = shiftDate(lastDate, -13);
  const last7Clicks = new Map<string, number>();
  const prev7Clicks = new Map<string, number>();
  for (const r of gsc) {
    if (r.date >= last7Start && r.date <= lastDate) {
      last7Clicks.set(r.query, (last7Clicks.get(r.query) ?? 0) + r.clicks);
    } else if (r.date >= prev7Start && r.date < last7Start) {
      prev7Clicks.set(r.query, (prev7Clicks.get(r.query) ?? 0) + r.clicks);
    }
  }

  const rows: KeywordRow[] = [...agg.entries()].map(([query, v]) => {
    const ctr = v.impressions > 0 ? v.clicks / v.impressions : 0;
    const position = v.impressions > 0 ? v.posNum / v.impressions : 0;
    const last = last7Clicks.get(query) ?? 0;
    const prev = prev7Clicks.get(query) ?? 0;
    const trend = prev > 0 ? (last - prev) / prev : last > 0 ? 1 : 0;
    return {
      query,
      clicks: v.clicks,
      impressions: v.impressions,
      ctr: round(ctr, 4),
      position: round(position, 1),
      trend: round(trend, 3),
    };
  });

  rows.sort((a, b) => b.clicks - a.clicks);
  return rows.slice(0, limit);
}

export interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  sessions: number;
  conversions: number;
}

export function topPages(
  gsc: readonly SearchConsoleRow[],
  analytics: readonly AnalyticsRow[],
  limit = 15,
): PageRow[] {
  const agg = new Map<string, PageRow>();
  for (const r of gsc) {
    const cur =
      agg.get(r.page) ??
      ({
        page: r.page,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        sessions: 0,
        conversions: 0,
      } as PageRow);
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    agg.set(r.page, cur);
  }
  // Second pass: compute position as impression-weighted.
  for (const r of gsc) {
    const cur = agg.get(r.page);
    if (!cur) continue;
    cur.position = 0; // reset, recompute below
  }
  const posNum = new Map<string, number>();
  for (const r of gsc) {
    posNum.set(r.page, (posNum.get(r.page) ?? 0) + r.position * r.impressions);
  }
  for (const [page, num] of posNum) {
    const cur = agg.get(page);
    if (!cur) continue;
    cur.position = cur.impressions > 0 ? num / cur.impressions : 0;
    cur.ctr = cur.impressions > 0 ? cur.clicks / cur.impressions : 0;
  }
  for (const r of analytics) {
    const cur =
      agg.get(r.page) ??
      ({
        page: r.page,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        position: 0,
        sessions: 0,
        conversions: 0,
      } as PageRow);
    cur.sessions += r.sessions;
    cur.conversions += r.conversions;
    agg.set(r.page, cur);
  }

  const out = [...agg.values()].map((r) => ({
    ...r,
    ctr: round(r.ctr, 4),
    position: round(r.position, 1),
  }));
  out.sort((a, b) => b.sessions - a.sessions);
  return out.slice(0, limit);
}

function round(n: number, digits: number): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

/** ISO date arithmetic: shift by N days (negative = earlier). */
export function shiftDate(iso: string, days: number): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

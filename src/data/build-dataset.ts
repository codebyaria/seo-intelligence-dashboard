import type { AnalyticsRow, ClarityRow, SearchConsoleRow, SimulatedDataset } from './types';
import {
  COUNTRIES,
  COUNTRY_WEIGHTS,
  DEVICES,
  DEVICE_WEIGHTS,
  PAGES,
  QUERIES,
  SEARCH_TYPES,
  SEARCH_TYPE_WEIGHTS,
} from './catalog';
import { createRng, intBetween, pickOne } from './rng';

const DEFAULT_DAYS = 60;
const DEFAULT_SEED = 20260101;

/** Format a Date as ISO date string (YYYY-MM-DD) in UTC. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build a list of ISO date strings for the last `days` days, oldest first. */
export function buildDateRange(days: number, endDate: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(isoDate(d));
  }
  return out;
}

/** Sample a value from {item: weight} map deterministically. */
function weightedPick<K extends string>(
  rng: () => number,
  weights: Readonly<Record<K, number>>,
  items: readonly K[],
): K {
  const r = rng();
  let acc = 0;
  for (const item of items) {
    acc += weights[item];
    if (r < acc) return item;
  }
  return items[items.length - 1] as K;
}

function generateSearchConsole(rng: () => number, dates: readonly string[]): SearchConsoleRow[] {
  const rows: SearchConsoleRow[] = [];
  for (const date of dates) {
    // A handful of (query × page × device × country) tuples per day.
    const tuples = intBetween(rng, 40, 70);
    for (let i = 0; i < tuples; i++) {
      const query = pickOne(rng, QUERIES);
      const page = pickOne(rng, PAGES);
      const device = weightedPick(rng, DEVICE_WEIGHTS, DEVICES);
      const country = weightedPick(rng, COUNTRY_WEIGHTS, COUNTRIES);
      const searchType = weightedPick(rng, SEARCH_TYPE_WEIGHTS, SEARCH_TYPES);

      const impressions = intBetween(rng, 5, 800);
      // CTR bands: 2-8% typical, position-dependent.
      const position = Math.round((1 + rng() * 60) * 10) / 10;
      const ctrBase = Math.max(0.005, 0.32 / Math.sqrt(position));
      const ctr = Math.min(0.6, Math.max(0.001, ctrBase + (rng() - 0.5) * 0.02));
      const clicks = Math.min(impressions, Math.round(impressions * ctr));

      rows.push({
        date,
        query,
        page,
        device,
        country,
        searchType,
        impressions,
        clicks,
        position,
        ctr,
      });
    }
  }
  return rows;
}

function generateAnalytics(rng: () => number, dates: readonly string[]): AnalyticsRow[] {
  const rows: AnalyticsRow[] = [];
  for (const date of dates) {
    for (const page of PAGES) {
      for (const device of DEVICES) {
        const country = weightedPick(rng, COUNTRY_WEIGHTS, COUNTRIES);
        const sessions = intBetween(rng, 5, 220);
        const engagementRate = Math.min(0.95, Math.max(0.25, 0.55 + (rng() - 0.5) * 0.3));
        const engagedSessions = Math.round(sessions * engagementRate);
        const conversions = Math.max(0, Math.round(engagedSessions * (0.01 + rng() * 0.04)));

        rows.push({
          date,
          page,
          device,
          country,
          sessions,
          engagedSessions,
          conversions,
          engagementRate: Math.round(engagementRate * 1000) / 1000,
        });
      }
    }
  }
  return rows;
}

function generateClarity(rng: () => number, dates: readonly string[]): ClarityRow[] {
  const rows: ClarityRow[] = [];
  for (const date of dates) {
    for (const page of PAGES) {
      for (const device of DEVICES) {
        const sessions = intBetween(rng, 5, 220);
        // Friction metrics scale roughly with sessions; mobile tends to be worse.
        const mobileMultiplier = device === 'mobile' ? 1.4 : 1;
        const deadClicks = Math.round(intBetween(rng, 0, 6) * mobileMultiplier);
        const rageClicks = Math.round(intBetween(rng, 0, 3) * mobileMultiplier);
        const quickBacks = Math.round(intBetween(rng, 0, 8) * mobileMultiplier);
        const avgScrollDepth = Math.min(1, Math.max(0.1, 0.5 + (rng() - 0.5) * 0.4));

        rows.push({
          date,
          page,
          device,
          sessions,
          deadClicks,
          rageClicks,
          quickBacks,
          avgScrollDepth: Math.round(avgScrollDepth * 1000) / 1000,
        });
      }
    }
  }
  return rows;
}

/**
 * Build the entire simulated dataset deterministically.
 *
 * - `seed` controls the RNG (default 20260101).
 * - `days` controls the historical window (default 60).
 * - `endDate` anchors the window; defaults to "today".
 *
 * Result is cached at module scope so repeated API calls during a single
 * dev/build pass reuse the same data without regeneration.
 */
let cached: SimulatedDataset | undefined;

export function buildDataset(opts?: {
  seed?: number;
  days?: number;
  endDate?: Date;
}): SimulatedDataset {
  if (cached) return cached;

  const seed = opts?.seed ?? DEFAULT_SEED;
  const days = opts?.days ?? DEFAULT_DAYS;
  const endDate = opts?.endDate ?? new Date();
  const rng = createRng(seed);
  const dates = buildDateRange(days, endDate);

  const dataset: SimulatedDataset = {
    generatedAt: new Date().toISOString(),
    seed,
    dateRange: { startDate: dates[0]!, endDate: dates[dates.length - 1]! },
    searchConsole: generateSearchConsole(rng, dates),
    analytics: generateAnalytics(rng, dates),
    clarity: generateClarity(rng, dates),
  };

  cached = dataset;
  return dataset;
}

/** Test helper: clear the module cache between unit tests. */
export function _resetDatasetCache(): void {
  cached = undefined;
}

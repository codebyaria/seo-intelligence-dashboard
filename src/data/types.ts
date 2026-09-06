/**
 * Simulated SEO dataset types.
 *
 * Shapes mirror real Google Search Console, Google Analytics 4, and
 * Microsoft Clarity response fields so that swapping a simulated adapter
 * for a real one later is a localized change in `src/data/`.
 *
 * Everything here is synthetic and deterministic (seeded RNG below).
 * NO real client or production data is referenced or implied.
 */

export type Device = 'desktop' | 'mobile' | 'tablet';
export type SearchType = 'web' | 'image' | 'video' | 'news';
export type Country = 'US' | 'ID' | 'SG' | 'AU' | 'GB';

/** GSC-style daily row: one query × page × device × country × date. */
export interface SearchConsoleRow {
  date: string; // ISO YYYY-MM-DD
  query: string;
  page: string; // path
  device: Device;
  country: Country;
  searchType: SearchType;
  impressions: number;
  clicks: number;
  /** Average position 1-100. */
  position: number;
  /** Click-through rate as a 0-1 fraction. */
  ctr: number;
}

/** GA4-style daily traffic row: one page × date × device. */
export interface AnalyticsRow {
  date: string;
  page: string;
  device: Device;
  country: Country;
  sessions: number;
  engagedSessions: number;
  conversions: number;
  /** Engagement rate 0-1. */
  engagementRate: number;
}

/** Microsoft Clarity-style daily aggregate row. */
export interface ClarityRow {
  date: string;
  page: string;
  device: Device;
  sessions: number;
  /** Dead-click count. */
  deadClicks: number;
  /** rage-click count. */
  rageClicks: number;
  /** Quick-back count (back within 5s). */
  quickBacks: number;
  /** Average scroll depth 0-1. */
  avgScrollDepth: number;
}

/** Top-level container loaded once at module init. */
export interface SimulatedDataset {
  generatedAt: string;
  seed: number;
  dateRange: { startDate: string; endDate: string };
  searchConsole: SearchConsoleRow[];
  analytics: AnalyticsRow[];
  clarity: ClarityRow[];
}

/** API query string for the REST boundary. All optional; absent = no filter. */
export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  device?: Device;
  country?: Country;
  searchType?: SearchType;
  limit?: number;
}

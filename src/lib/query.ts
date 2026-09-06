/**
 * Parse an Astro API URLSearchParams into a normalized AnalyticsQuery.
 * Invalid values are dropped silently so the API is permissive; the
 * data layer still produces a correct (unfiltered-by-that-axis) result.
 */
import type { AnalyticsQuery, Country, Device, SearchType } from '../data/types';
import { isDevice } from './processing';

const COUNTRIES: readonly Country[] = ['US', 'ID', 'SG', 'AU', 'GB'];
const SEARCH_TYPES: readonly SearchType[] = ['web', 'image', 'video', 'news'];

function isoDateRe(): RegExp {
  return /^\d{4}-\d{2}-\d{2}$/;
}

export function parseQuery(url: URL): AnalyticsQuery {
  const sp = url.searchParams;
  const q: AnalyticsQuery = {};

  const startDate = sp.get('startDate') ?? undefined;
  const endDate = sp.get('endDate') ?? undefined;
  if (startDate && isoDateRe().test(startDate)) q.startDate = startDate;
  if (endDate && isoDateRe().test(endDate)) q.endDate = endDate;

  const device = sp.get('device') ?? undefined;
  if (device && isDevice(device)) q.device = device as Device;

  const country = sp.get('country') ?? undefined;
  if (country && (COUNTRIES as readonly string[]).includes(country)) {
    q.country = country as Country;
  }

  const searchType = sp.get('searchType') ?? undefined;
  if (searchType && (SEARCH_TYPES as readonly string[]).includes(searchType)) {
    q.searchType = searchType as SearchType;
  }

  const limitStr = sp.get('limit') ?? undefined;
  if (limitStr) {
    const limit = Number.parseInt(limitStr, 10);
    if (Number.isFinite(limit) && limit > 0 && limit <= 200) {
      q.limit = limit;
    }
  }

  return q;
}

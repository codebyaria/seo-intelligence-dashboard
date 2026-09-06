import type { APIRoute } from 'astro';
import { buildDataset } from '../../data/build-dataset';
import {
  buildDailyTrend,
  filterAnalytics,
  filterClarity,
  filterSearchConsole,
  summarizeOverview,
} from '../../lib/processing';
import { parseQuery } from '../../lib/query';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const q = parseQuery(url);
  const ds = buildDataset();

  const gsc = filterSearchConsole(ds.searchConsole, q);
  const analytics = filterAnalytics(ds.analytics, q);
  const clarity = filterClarity(ds.clarity, q);

  const overview = summarizeOverview(gsc, analytics, clarity);
  const trend = buildDailyTrend(gsc, analytics);

  const body = {
    meta: {
      generatedAt: ds.generatedAt,
      seed: ds.seed,
      window: ds.dateRange,
      filters: q,
      rowCounts: {
        searchConsole: gsc.length,
        analytics: analytics.length,
        clarity: clarity.length,
      },
      simulated: true,
    },
    overview,
    trend,
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};

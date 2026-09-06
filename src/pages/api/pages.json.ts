import type { APIRoute } from 'astro';
import { buildDataset } from '../../data/build-dataset';
import { filterAnalytics, filterSearchConsole, topPages } from '../../lib/processing';
import { parseQuery } from '../../lib/query';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const q = parseQuery(url);
  const ds = buildDataset();
  const gsc = filterSearchConsole(ds.searchConsole, q);
  const analytics = filterAnalytics(ds.analytics, q);
  const pages = topPages(gsc, analytics, q.limit ?? 15);

  const body = {
    meta: {
      generatedAt: ds.generatedAt,
      seed: ds.seed,
      window: ds.dateRange,
      filters: q,
      rowCount: pages.length,
      simulated: true,
    },
    pages,
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};

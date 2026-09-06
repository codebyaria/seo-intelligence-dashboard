import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site?.toString() ?? url.origin).replace(/\/$/, '');
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = ['/', '/about/'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${origin}${u}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};

import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ site, url }) => {
  const origin = (site?.toString() ?? url.origin).replace(/\/$/, '');
  const body = `User-agent: *
Allow: /
Disallow: /dashboard/

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};

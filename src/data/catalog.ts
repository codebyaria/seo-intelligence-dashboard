import type { Country, Device, SearchType } from './types';

/**
 * Hand-picked demo content. Names are plausible but fictional; no real
 * brand, person, or client is referenced.
 */
export const QUERIES: readonly string[] = [
  'web development agency',
  'astro tutorial',
  'seo audit service',
  'local seo checklist',
  'react dashboard template',
  'cms for small business',
  'typescript best practices',
  'core web vitals',
  'site speed optimization',
  'structured data validator',
  'ai content workflow',
  'webhook authentication',
  'keyword research tool',
  'landing page conversion',
  'google search console api',
] as const;

export const PAGES: readonly string[] = [
  '/',
  '/services/',
  '/services/seo/',
  '/services/web-development/',
  '/services/ai-automation/',
  '/blog/',
  '/blog/astro-vs-next/',
  '/blog/seo-checklist/',
  '/blog/structured-data/',
  '/blog/ai-content-pipeline/',
  '/blog/core-web-vitals/',
  '/about/',
  '/contact/',
  '/locations/jakarta/',
  '/locations/singapore/',
] as const;

export const DEVICES: readonly Device[] = ['desktop', 'mobile', 'tablet'] as const;

export const COUNTRIES: readonly Country[] = ['US', 'ID', 'SG', 'AU', 'GB'] as const;

export const SEARCH_TYPES: readonly SearchType[] = ['web', 'image', 'video', 'news'] as const;

/** Weights control the shape of the simulated distribution (skew toward web + mobile). */
export const DEVICE_WEIGHTS: Readonly<Record<Device, number>> = {
  desktop: 0.32,
  mobile: 0.58,
  tablet: 0.1,
};

export const SEARCH_TYPE_WEIGHTS: Readonly<Record<SearchType, number>> = {
  web: 0.86,
  image: 0.08,
  video: 0.04,
  news: 0.02,
};

export const COUNTRY_WEIGHTS: Readonly<Record<Country, number>> = {
  US: 0.34,
  ID: 0.28,
  SG: 0.16,
  AU: 0.12,
  GB: 0.1,
};

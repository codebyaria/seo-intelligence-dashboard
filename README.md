# SEO Intelligence Dashboard

Phase 4 of the DigiAgency application portfolio. A React-based SEO analytics
dashboard built with **Astro + TypeScript + React**, backed by a deterministic
**simulated** dataset shaped after Google Search Console, Google Analytics 4,
and Microsoft Clarity response fields.

> **Demo project using simulated SEO data.**
> No real Search Console, GA4, or Clarity account is connected. The adapters
> in `src/data/` produce deterministic numbers from a seeded RNG so every
> build shows the same metrics.

## What it demonstrates

- **Astro 5 + React islands** — minimal client JS, the dashboard runs as a
  single `<Dashboard client:load />` island.
- **Strict TypeScript** end-to-end (data shapes, API contracts, React props).
- **REST API boundary** via Astro endpoints (`/api/overview.json`,
  `/api/keywords.json`, `/api/pages.json`) with a typed query parser.
- **Pure data-processing layer** with full unit-test coverage.
- **Filters** (date range, device, country), **KPI cards**, **trend chart**,
  **keyword and page tables**, and **loading / empty / error states**.
- **Honesty labels** on every surface that shows numbers.

## Architecture

```
src/data/         Simulated dataset (seeded, deterministic)
        ↓
src/lib/          Pure processing (filter, aggregate, trend)
        ↓
src/pages/api/    Astro REST endpoints (JSON boundary)
        ↓
src/components/   React island: <Dashboard client:load />
```

PRD section 9.5 (data source → processing → REST API → React dashboard) maps
directly to these layers. Swapping the simulated adapters for real GSC/GA4/
Clarity ingestion later is a localized change in `src/data/`; the processing
and UI layers stay the same.

## API

All endpoints return JSON, accept the same query string, and are CORS-friendly
only within the same origin.

| Endpoint             | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `/api/overview.json` | KPIs + daily trend                        |
| `/api/keywords.json` | Top keywords with CTR, position, 7d trend |
| `/api/pages.json`    | Top pages with GSC + GA4 metrics          |

### Query parameters

| Name         | Format        | Example      |
| ------------ | ------------- | ------------ |
| `startDate`  | `YYYY-MM-DD`  | `2026-01-01` |
| `endDate`    | `YYYY-MM-DD`  | `2026-01-31` |
| `device`     | `desktop      | mobile       | tablet` | `mobile` |
| `country`    | `US           | ID           | SG      | AU       | GB`   | `ID` |
| `searchType` | `web          | image        | video   | news`    | `web` |
| `limit`      | integer ≤ 200 | `15`         |

Invalid values are dropped silently — the API is permissive and the data layer
still produces a correct (unfiltered-by-that-axis) result.

## Tech Stack

- Astro 5 with `@astrojs/react`
- React 18 (island architecture)
- TypeScript (strict)
- ESLint (`--max-warnings=0`)
- Prettier + `prettier-plugin-astro`
- Vitest (jsdom environment)

## Local Development

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm test         # Vitest
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
pnpm build        # Astro production build
```

## Quality Gates

- `pnpm test` — Vitest unit tests for the data + processing + query layers.
- `pnpm typecheck` — TypeScript strict mode, zero errors.
- `pnpm lint` — ESLint with `--max-warnings=0`.
- `pnpm format:check` — Prettier.
- `pnpm build` — Astro production build.

## Honesty and Claims

This project is classified as **"Demo Using Simulated Data"** per
`../docs/honesty-and-claims.md`. UI and processing are real; source data is
synthetic. Any future migration to real GSC/GA4/Clarity ingestion must update
this README and add a separate ADR before claiming production behavior.

## Limitations

- Data is in-memory only; restart resets to seed.
- Trend chart is a small inline SVG — fine for portfolio review, not a
  production charting library.
- No persistence layer; the architecture intentionally mirrors the
  PRD 9.5 diagram but stops short of a real ingestion pipeline.

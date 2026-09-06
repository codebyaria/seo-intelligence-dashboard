import { useEffect, useMemo, useState } from 'react';

interface OverviewKpis {
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

interface DailyTrendPoint {
  date: string;
  clicks: number;
  impressions: number;
  sessions: number;
  conversions: number;
}

interface KeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  trend: number;
}

interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  sessions: number;
  conversions: number;
}

interface Filters {
  startDate: string;
  endDate: string;
  device: '' | 'desktop' | 'mobile' | 'tablet';
  country: '' | 'US' | 'ID' | 'SG' | 'AU' | 'GB';
}

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready';
      overview: OverviewKpis;
      trend: DailyTrendPoint[];
      keywords: KeywordRow[];
      pages: PageRow[];
    };

function buildQuery(filters: Filters, limit?: number): string {
  const sp = new URLSearchParams();
  if (filters.startDate) sp.set('startDate', filters.startDate);
  if (filters.endDate) sp.set('endDate', filters.endDate);
  if (filters.device) sp.set('device', filters.device);
  if (filters.country) sp.set('country', filters.country);
  if (limit !== undefined) sp.set('limit', String(limit));
  return sp.toString();
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

function fmtPct(n: number, digits = 2): string {
  return `${(n * 100).toFixed(digits)}%`;
}

function fmtSignedPct(n: number, digits = 1): string {
  const v = n * 100;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
}

function trendColor(n: number): string {
  if (n > 0.005) return 'var(--color-positive)';
  if (n < -0.005) return 'var(--color-negative)';
  return 'var(--color-text-muted)';
}

function TrendChart({ data }: { data: DailyTrendPoint[] }): JSX.Element {
  if (data.length === 0) {
    return <p className="muted">No trend data for current filters.</p>;
  }
  const width = 720;
  const height = 180;
  const padding = { top: 12, right: 12, bottom: 24, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((d) => Math.max(d.clicks, d.sessions)));
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const yClicks = padding.top + innerH - (d.clicks / max) * innerH;
    const ySessions = padding.top + innerH - (d.sessions / max) * innerH;
    return { x, yClicks, ySessions, d };
  });
  const lineFor = (key: 'yClicks' | 'ySessions'): string =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p[key].toFixed(1)}`).join(' ');
  const tickEvery = Math.max(1, Math.floor(data.length / 6));
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label="Daily clicks and sessions trend"
      style={{ background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)' }}
    >
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={height - padding.bottom}
        y2={height - padding.bottom}
        stroke="var(--color-border-strong)"
      />
      <path d={lineFor('yClicks')} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
      <path
        d={lineFor('ySessions')}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      {points.map((p, i) =>
        i % tickEvery === 0 ? (
          <text
            key={p.d.date}
            x={p.x}
            y={height - padding.bottom + 14}
            fontSize="10"
            textAnchor="middle"
            fill="var(--color-text-faint)"
          >
            {p.d.date.slice(5)}
          </text>
        ) : null,
      )}
      <g transform={`translate(8 ${padding.top})`}>
        <rect width="10" height="2" fill="var(--color-accent)" />
        <text x="16" y="6" fontSize="10" fill="var(--color-text-muted)">
          clicks
        </text>
        <rect y="14" width="10" height="2" fill="var(--color-text-muted)" />
        <text x="16" y="20" fontSize="10" fill="var(--color-text-muted)">
          sessions
        </text>
      </g>
    </svg>
  );
}

export default function Dashboard(): JSX.Element {
  const [filters, setFilters] = useState<Filters>({
    startDate: '',
    endDate: '',
    device: '',
    country: '',
  });
  const [state, setState] = useState<FetchState>({ kind: 'idle' });

  const query = useMemo(() => buildQuery(filters), [filters]);
  const url = `/api/overview.json?${query}`;

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    const fetchAll = async (): Promise<void> => {
      try {
        const [overviewRes, keywordsRes, pagesRes] = await Promise.all([
          fetchJson<{
            overview: OverviewKpis;
            trend: DailyTrendPoint[];
          }>(`/api/overview.json?${query}`),
          fetchJson<{ keywords: KeywordRow[] }>(`/api/keywords.json?${query}`),
          fetchJson<{ pages: PageRow[] }>(`/api/pages.json?${query}`),
        ]);
        if (cancelled) return;
        setState({
          kind: 'ready',
          overview: overviewRes.overview,
          trend: overviewRes.trend,
          keywords: keywordsRes.keywords,
          pages: pagesRes.pages,
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setState({ kind: 'error', message: msg });
      }
    };
    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const isEmpty =
    state.kind === 'ready' &&
    state.trend.length === 0 &&
    state.keywords.length === 0 &&
    state.pages.length === 0;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section
        className="surface"
        style={{
          padding: 16,
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        }}
        aria-label="Filters"
      >
        <label style={{ display: 'grid', gap: 4, fontSize: '0.85rem' }}>
          <span className="muted">Start date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.85rem' }}>
          <span className="muted">End date</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.85rem' }}>
          <span className="muted">Device</span>
          <select
            value={filters.device}
            onChange={(e) =>
              setFilters((f) => ({ ...f, device: e.target.value as Filters['device'] }))
            }
            style={inputStyle}
          >
            <option value="">All</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.85rem' }}>
          <span className="muted">Country</span>
          <select
            value={filters.country}
            onChange={(e) =>
              setFilters((f) => ({ ...f, country: e.target.value as Filters['country'] }))
            }
            style={inputStyle}
          >
            <option value="">All</option>
            <option value="US">US</option>
            <option value="ID">ID</option>
            <option value="SG">SG</option>
            <option value="AU">AU</option>
            <option value="GB">GB</option>
          </select>
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setFilters({ startDate: '', endDate: '', device: '', country: '' })}
            style={buttonStyle}
          >
            Reset
          </button>
        </div>
      </section>

      <p className="faint" style={{ fontSize: '0.8rem', marginTop: -8 }}>
        Request: <code>{url}</code>
      </p>

      {state.kind === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="surface"
          style={{ padding: 24, textAlign: 'center' }}
        >
          <p className="muted">Loading simulated SEO data…</p>
        </div>
      )}

      {state.kind === 'error' && (
        <div
          role="alert"
          className="surface"
          style={{ padding: 16, borderLeft: '3px solid var(--color-negative)' }}
        >
          <p style={{ fontWeight: 600 }}>Could not load data</p>
          <p className="muted" style={{ marginTop: 4, fontSize: '0.9rem' }}>
            {state.message}
          </p>
        </div>
      )}

      {state.kind === 'ready' && isEmpty && (
        <div className="surface" style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ fontWeight: 600 }}>No data for the current filters.</p>
          <p className="muted" style={{ marginTop: 4, fontSize: '0.9rem' }}>
            Try widening the date range or clearing device and country filters.
          </p>
        </div>
      )}

      {state.kind === 'ready' && !isEmpty && (
        <>
          <section
            aria-label="KPIs"
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            <Kpi
              label="Organic clicks"
              value={fmtNumber(state.overview.organicClicks)}
              source="GSC"
            />
            <Kpi
              label="Impressions"
              value={fmtNumber(state.overview.organicImpressions)}
              source="GSC"
            />
            <Kpi label="Average CTR" value={fmtPct(state.overview.averageCtr)} source="GSC" />
            <Kpi
              label="Average position"
              value={state.overview.averagePosition.toFixed(1)}
              source="GSC"
            />
            <Kpi label="Sessions" value={fmtNumber(state.overview.sessions)} source="GA4" />
            <Kpi
              label="Engagement rate"
              value={fmtPct(state.overview.avgEngagementRate)}
              source="GA4"
            />
            <Kpi
              label="Conversion rate"
              value={fmtPct(state.overview.conversionRate)}
              source="GA4"
            />
            <Kpi label="Conversions" value={fmtNumber(state.overview.conversions)} source="GA4" />
            <Kpi
              label="Avg scroll depth"
              value={fmtPct(state.overview.avgScrollDepth, 1)}
              source="Clarity"
            />
            <Kpi
              label="Dead clicks"
              value={fmtNumber(state.overview.deadClicks)}
              source="Clarity"
            />
          </section>

          <section className="surface" style={{ padding: 16 }} aria-label="Daily trend">
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: '1rem' }}>Daily trend</h2>
              <span className="eyebrow">Simulated GSC + GA4</span>
            </header>
            <TrendChart data={state.trend} />
          </section>

          <section className="surface" style={{ padding: 16 }} aria-label="Top keywords">
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: '1rem' }}>Top keywords</h2>
              <span className="eyebrow">Simulated GSC</span>
            </header>
            <Table
              columns={[
                { key: 'query', label: 'Query' },
                {
                  key: 'clicks',
                  label: 'Clicks',
                  align: 'right' as const,
                  render: cell<KeywordRow, 'clicks'>((v) => fmtNumber(v)),
                },
                {
                  key: 'impressions',
                  label: 'Impr.',
                  align: 'right' as const,
                  render: cell<KeywordRow, 'impressions'>((v) => fmtNumber(v)),
                },
                {
                  key: 'ctr',
                  label: 'CTR',
                  align: 'right' as const,
                  render: cell<KeywordRow, 'ctr'>((v) => fmtPct(v)),
                },
                {
                  key: 'position',
                  label: 'Pos.',
                  align: 'right' as const,
                  render: cell<KeywordRow, 'position'>((v) => v.toFixed(1)),
                },
                {
                  key: 'trend',
                  label: '7d vs prev',
                  align: 'right' as const,
                  render: cell<KeywordRow, 'trend'>((n) => (
                    <span style={{ color: trendColor(n) }}>{fmtSignedPct(n)}</span>
                  )),
                },
              ]}
              rows={state.keywords}
              rowKey={(r) => r.query}
            />
          </section>

          <section className="surface" style={{ padding: 16 }} aria-label="Top pages">
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: '1rem' }}>Top pages</h2>
              <span className="eyebrow">Simulated GSC + GA4</span>
            </header>
            <Table
              columns={[
                { key: 'page', label: 'Page' },
                {
                  key: 'sessions',
                  label: 'Sessions',
                  align: 'right' as const,
                  render: cell<PageRow, 'sessions'>((v) => fmtNumber(v)),
                },
                {
                  key: 'conversions',
                  label: 'Conv.',
                  align: 'right' as const,
                  render: cell<PageRow, 'conversions'>((v) => fmtNumber(v)),
                },
                {
                  key: 'clicks',
                  label: 'Clicks',
                  align: 'right' as const,
                  render: cell<PageRow, 'clicks'>((v) => fmtNumber(v)),
                },
                {
                  key: 'ctr',
                  label: 'CTR',
                  align: 'right' as const,
                  render: cell<PageRow, 'ctr'>((v) => fmtPct(v)),
                },
                {
                  key: 'position',
                  label: 'Pos.',
                  align: 'right' as const,
                  render: cell<PageRow, 'position'>((v) => v.toFixed(1)),
                },
              ]}
              rows={state.pages}
              rowKey={(r) => r.page}
            />
          </section>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9rem',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 14px',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9rem',
};

interface Column<T> {
  key: keyof T & string;
  label: string;
  align?: 'left' | 'right';
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

/** Type-safe cell renderer for a specific key. */
function cell<T, K extends keyof T & string>(
  fn: (value: T[K], row: T) => React.ReactNode,
): (value: T[keyof T], row: T) => React.ReactNode {
  return (v, r) => fn(v as T[K], r);
}

function Table<T>({
  columns,
  rows,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}): JSX.Element {
  if (rows.length === 0) {
    return <p className="muted">No rows.</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align ?? 'left',
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--color-border-strong)',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    textAlign: c.align ?? 'left',
                    padding: '8px 10px',
                    borderBottom: '1px solid var(--color-border)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {c.render ? c.render(r[c.key], r) : String(r[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source: string;
}): JSX.Element {
  return (
    <div className="surface" style={{ padding: 14 }}>
      <p className="eyebrow" style={{ fontSize: '0.7rem' }}>
        {label} · <span style={{ color: 'var(--color-text-faint)' }}>{source}</span>
      </p>
      <p
        style={{
          fontSize: '1.4rem',
          fontWeight: 600,
          marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
    </div>
  );
}

import { describe, expect, it } from 'vitest';
import { parseQuery } from '../src/lib/query';

function url(qs: string): URL {
  return new URL(`https://example.test/api/overview.json?${qs}`);
}

describe('parseQuery', () => {
  it('returns an empty object when no params are present', () => {
    expect(parseQuery(url(''))).toEqual({});
  });

  it('parses valid dates, device, country, searchType, and limit', () => {
    const q = parseQuery(
      url(
        'startDate=2026-01-01&endDate=2026-01-31&device=mobile&country=ID&searchType=web&limit=15',
      ),
    );
    expect(q).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      device: 'mobile',
      country: 'ID',
      searchType: 'web',
      limit: 15,
    });
  });

  it('drops invalid dates', () => {
    const q = parseQuery(url('startDate=not-a-date&endDate=2026-01-31'));
    expect(q.startDate).toBeUndefined();
    expect(q.endDate).toBe('2026-01-31');
  });

  it('drops invalid device, country, and searchType', () => {
    const q = parseQuery(url('device=watch&country=ZZ&searchType=podcast'));
    expect(q.device).toBeUndefined();
    expect(q.country).toBeUndefined();
    expect(q.searchType).toBeUndefined();
  });

  it('caps limit to 200 and ignores non-positive', () => {
    expect(parseQuery(url('limit=15')).limit).toBe(15);
    expect(parseQuery(url('limit=500')).limit).toBeUndefined();
    expect(parseQuery(url('limit=0')).limit).toBeUndefined();
    expect(parseQuery(url('limit=-5')).limit).toBeUndefined();
  });
});

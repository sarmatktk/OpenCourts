import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet } from '../functions/api/courts';
import { findBundledInternationalCourts } from '../functions/lib/international-court-catalog';

afterEach(() => vi.unstubAllGlobals());

describe('imported international court catalog', () => {
  it('serves Tokyo search coordinates with every live provider offline', async () => {
    const fetchMock = vi.fn(() => { throw new Error('Offline'); });
    vi.stubGlobal('fetch', fetchMock);
    const response = await onRequestGet({ request: new Request('https://opencourts.us/api/courts?lat=35.6768601&lon=139.7638947&country=jp'), env: {} } as any);
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.elements.length).toBeGreaterThan(10);
    expect(body.catalog).toMatchObject({ region: 'Tokyo', license: 'ODbL-1.0' });
    expect(body.elements.every((court: any) => Number.isSafeInteger(court.id) && court.lat >= 35.5418 && court.lat <= 35.8119 && /(^|;)tennis(;|$)/.test(court.tags.sport))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not return Tokyo data for another country or an uncovered region', () => {
    expect(findBundledInternationalCourts('us', { south: 35.5, north: 35.8, west: 139.5, east: 139.9 })).toBeUndefined();
    expect(findBundledInternationalCourts('jp', { south: 34.5, north: 34.8, west: 135.3, east: 135.6 })).toBeUndefined();
  });

  it('uses imported international D1 regions before live providers outside the bundle', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const row = { osm_type: 'way', osm_id: 42, lat: 40.4168, lon: -3.7038, tags_json: '{"leisure":"pitch","sport":"tennis"}' };
    const db = { prepare: () => ({ bind: () => ({ all: async () => ({ success: true, results: [row] }) }) }) };
    const response = await onRequestGet({ request: new Request('https://opencourts.us/api/courts?lat=40.4168&lon=-3.7038&country=es'), env: { COURTS_DB: db } } as any);
    expect(response.status).toBe(200);
    expect((await response.json() as any).elements[0].id).toBe(42);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serves the actual Paris geocode location with live providers offline', async () => {
    const fetchMock = vi.fn(() => { throw new Error('Offline'); });
    vi.stubGlobal('fetch', fetchMock);
    const response = await onRequestGet({ request: new Request('https://opencourts.us/api/courts?lat=48.8588897&lon=2.3200410&country=fr'), env: {} } as any);
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.catalog.region).toBe('Paris');
    expect(body.elements.length).toBeGreaterThan(10);
    expect(body.elements.every((court: any) => court.lat > 48 && court.lat < 50 && court.lon > 1 && court.lon < 4)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

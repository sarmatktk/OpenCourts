import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyAccess, classifyLighting, enrichNearbyCourtDetails, getRainAssessments, normalizeCourt, playScore } from '../src/services';
import type { Forecast } from '../src/types';
import { estimatedSunset } from '../src/sun';

afterEach(() => vi.unstubAllGlobals());

describe('court normalization', () => {
  it('classifies explicit lighting values and keeps unknowns explicit', () => {
    expect(classifyLighting({ lit: 'yes' })).toBe('yes'); expect(classifyLighting({ lighting: 'no' })).toBe('no'); expect(classifyLighting({})).toBe('unknown');
  });
  it('excludes private access and recognizes public parks', () => {
    expect(classifyAccess({ access: 'private' })).toBe('restricted'); expect(classifyAccess({ leisure: 'park' })).toBe('public');
  });
  it('creates stable OSM identifiers and uses center coordinates for ways', () => {
    const c = normalizeCourt({ type: 'way', id: 123, center: { lat: 38.8, lon: -77.3 }, tags: { name: 'Neighborhood Courts', lit: 'yes' } });
    expect(c.id).toBe('osm-way-123'); expect(c.name).toBe('Neighborhood Courts'); expect(c.lat).toBe(38.8); expect(c.lighting).toBe('yes');
  });
  it('adds nearby OSM road and place names without using distant features', () => {
    const court = normalizeCourt({ type: 'way', id: 7, center: { lat: 38.8462, lon: -77.3064 }, tags: {} });
    const enriched = enrichNearbyCourtDetails([court], [
      { type: 'way', id: 8, center: { lat: 38.847, lon: -77.3064 }, tags: { highway: 'residential', name: 'Oak Road' } },
      { type: 'node', id: 9, lat: 38.8464, lon: -77.3062, tags: { leisure: 'park', name: 'Green Park' } },
      { type: 'node', id: 10, lat: 38.9, lon: -77.3, tags: { leisure: 'park', name: 'Distant Park' } },
    ], 'Fairfax');
    expect(enriched[0].name).toBe('Tennis courts at Green Park');
    expect(enriched[0].address).toBe('Near Oak Road, Fairfax');
    expect(enriched[0].addressApprox).toBe(true);
  });
});
describe('PlayScore', () => {
  const forecast = (temp: number, wind: number, precip: number): Forecast => ({ time: '', temp, wind, precip, short: '', icon: '' });
  it('favors mild, dry, calm conditions and penalizes rain and wind', () => {
    expect(playScore(forecast(70, 4, 0))).toBeGreaterThan(playScore(forecast(70, 20, 80)));
    expect(playScore(forecast(70, 4, 0))).toBe(100);
  });
});
describe('rain API errors', () => {
  it('shows a plain visitor message when the endpoint returns HTML instead of JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<html>Bad gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }))));
    await expect(getRainAssessments([{ id: 'court-1', lat: 38.8, lon: -77.3 } as any])).rejects.toThrow('Recent rain data is temporarily unavailable. Please try again.');
  });
});
describe('daylight estimate', () => {
  it('returns a local sunset instant for a U.S. location', () => {
    const sunset = estimatedSunset(38.8462, -77.3064, 'America/New_York', new Date('2026-06-21T12:00:00Z'));
    expect(sunset).not.toBeNull();
    expect(sunset!.toISOString()).toContain('2026-06-22');
  });
});

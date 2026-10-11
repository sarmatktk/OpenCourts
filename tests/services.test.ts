import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyAccess, classifyLighting, distinguishCourtNames, enrichNearbyCourtDetails, getRainAssessments, groupCourtsByVenue, normalizeCourt, playScore } from '../src/services';
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
  it('uses cataloged nationwide context without a live context lookup', () => {
    const court = normalizeCourt({ type: 'way', id: 500, lat: 38.8, lon: -77.3, tags: {
      name: 'Tennis courts', 'opencourts:context_version': '1', 'opencourts:nearby_place': 'Greenbriar Park',
      'opencourts:nearby_place_miles': '0.020', 'opencourts:nearby_street': 'Cedar Lane',
    } }, [], 'Fairfax');
    expect(court.name).toBe('Tennis courts');
    expect(court.contextName).toBe('At Greenbriar Park');
    expect(court.address).toBe('Near Cedar Lane, Fairfax');
    expect(court.addressApprox).toBe(true);
    expect(court.contextCached).toBe(true);
  });
  it('does not append the generic current-location label to a street address', () => {
    const court = normalizeCourt({ type: 'node', id: 501, lat: 38.8, lon: -77.3, tags: {
      name: 'Tennis courts', 'opencourts:context_version': '1', 'opencourts:nearby_street': 'Four Ponds Trail',
    } }, [], 'Your location');
    expect(court.address).toBe('Near Four Ponds Trail');
  });
  it('adds nearby OSM road and place names without using distant features', () => {
    const court = normalizeCourt({ type: 'way', id: 7, center: { lat: 38.8462, lon: -77.3064 }, tags: {} });
    const enriched = enrichNearbyCourtDetails([court], [
      { type: 'way', id: 8, center: { lat: 38.847, lon: -77.3064 }, tags: { highway: 'residential', name: 'Oak Road' } },
      { type: 'node', id: 9, lat: 38.8464, lon: -77.3062, tags: { leisure: 'park', name: 'Green Park' } },
      { type: 'node', id: 10, lat: 38.9, lon: -77.3, tags: { leisure: 'park', name: 'Distant Park' } },
    ], 'Fairfax');
    expect(enriched[0].name).toBe('Tennis courts');
    expect(enriched[0].contextName).toBe('At Green Park');
    expect(enriched[0].address).toBe('Near Oak Road, Fairfax');
    expect(enriched[0].addressApprox).toBe(true);
  });
  it('uses road geometry instead of a distant way center', () => {
    const court = { id: 'osm-way-71', name: 'Court 1', lat: 38.8462, lon: -77.3064 } as any;
    const enriched = enrichNearbyCourtDetails([court], [
      { type: 'way', id: 72, center: { lat: 38.9, lon: -77.3 }, geometry: [{ lat: 38.8461, lon: -77.31 }, { lat: 38.8461, lon: -77.30 }], tags: { highway: 'residential', name: 'Cedar Lane' } },
    ], 'Fairfax');
    expect(enriched[0].name).toBe('Court 1');
    expect(enriched[0].address).toBe('Near Cedar Lane, Fairfax');
  });
  it('uses the name of a park containing the court even when its center is far away', () => {
    const court = { id: 'osm-way-73', name: 'Tennis courts', lat: 38.8462, lon: -77.3064 } as any;
    const enriched = enrichNearbyCourtDetails([court], [
      { type: 'way', id: 74, center: { lat: 38.85, lon: -77.30 }, geometry: [
        { lat: 38.84, lon: -77.32 }, { lat: 38.84, lon: -77.29 }, { lat: 38.86, lon: -77.29 }, { lat: 38.86, lon: -77.32 }, { lat: 38.84, lon: -77.32 },
      ], tags: { leisure: 'park', name: 'Greenbriar Park' } },
    ], 'Fairfax');
    expect(enriched[0].name).toBe('Tennis courts');
    expect(enriched[0].contextName).toBe('At Greenbriar Park');
    expect(enriched[0].address).toBe('Near Greenbriar Park, Fairfax');
  });
  it('does not assign fake numbers to generic court labels', () => {
    const courts = [1, 2, 3].map(id => ({ id: `osm-node-${id}`, name: 'Tennis courts', lat: 38.8, lon: -77.3 } as any));
    expect(distinguishCourtNames(courts).map(court => court.name)).toEqual(['Tennis courts', 'Tennis courts', 'Tennis courts']);
  });
  it('replaces a cached generic number with a nearby named park', () => {
    const court = { id: 'osm-way-11', name: 'Tennis courts · 384', lat: 38.8462, lon: -77.3064 } as any;
    const enriched = enrichNearbyCourtDetails([court], [
      { type: 'node', id: 12, lat: 38.8464, lon: -77.3062, tags: { leisure: 'park', name: 'Green Park' } },
    ], 'Fairfax');
    expect(enriched[0].name).toBe('Tennis courts');
    expect(enriched[0].contextName).toBe('At Green Park');
    expect(enriched[0].address).toBe('Near Green Park, Fairfax');
    expect(enriched[0].addressApprox).toBe(true);
  });
  it('keeps numbered court names and adds nearby street context plus an approximate address', () => {
    const court = { id: 'osm-way-13', name: 'Court 1', lat: 38.8462, lon: -77.3064 } as any;
    const enriched = enrichNearbyCourtDetails([court], [
      { type: 'way', id: 14, center: { lat: 38.847, lon: -77.3064 }, tags: { highway: 'residential', name: 'Oak Road' } },
    ], 'Fairfax');
    expect(enriched[0].name).toBe('Court 1');
    expect(enriched[0].address).toBe('Near Oak Road, Fairfax');
    expect(enriched[0].addressApprox).toBe(true);
  });
  it('keeps a numbered court name and shows its landmark separately', () => {
    const court = { id: 'osm-way-17', name: 'Court 2', lat: 38.8462, lon: -77.3064 } as any;
    const enriched = enrichNearbyCourtDetails([court], [
      { type: 'node', id: 18, lat: 38.8464, lon: -77.3062, tags: { leisure: 'park', name: 'Greenbriar Park' } },
      { type: 'way', id: 19, center: { lat: 38.847, lon: -77.3064 }, tags: { highway: 'residential', name: 'Oak Road' } },
    ], 'Fairfax');
    expect(enriched[0].name).toBe('Court 2');
    expect(enriched[0].contextName).toBe('At Greenbriar Park');
    expect(enriched[0].address).toBe('Near Oak Road, Fairfax');
  });
  it('finds a named street when its mapped way center is farther than 0.12 miles', () => {
    const court = { id: 'osm-way-15', name: 'Court 1', lat: 38.8462, lon: -77.3064 } as any;
    const enriched = enrichNearbyCourtDetails([court], [
      { type: 'way', id: 16, center: { lat: 38.85, lon: -77.3064 }, tags: { highway: 'residential', name: 'Cedar Lane' } },
    ], 'Fairfax');
    expect(enriched[0].name).toBe('Court 1');
    expect(enriched[0].address).toBe('Near Cedar Lane, Fairfax');
    expect(enriched[0].addressApprox).toBe(true);
  });
});
describe('venue court grouping', () => {
  const court = (id: number, surface?: string) => ({
    id: `osm-node-${id}`, name: `Court ${id}`, lat: 38.97 + id * 0.0001, lon: -77.38,
    contextName: 'At Herndon High School', lighting: 'unknown', access: 'unknown', sheltered: false,
    surface, sourceUrl: `https://www.openstreetmap.org/node/${id}`,
  } as any);
  it('combines nearby courts at one named venue and reports their count', () => {
    const grouped = groupCourtsByVenue([court(1), court(2), court(3), court(4)]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].name).toBe('Herndon High School');
    expect(grouped[0].courts).toBe(4);
  });
  it('keeps courts with different surfaces in separate groups', () => {
    const grouped = groupCourtsByVenue([court(1, 'hard'), court(2, 'clay')]);
    expect(grouped).toHaveLength(2);
    expect(grouped.map(item => item.surface)).toEqual(['hard', 'clay']);
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

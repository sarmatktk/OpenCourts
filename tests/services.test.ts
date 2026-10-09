import { describe, expect, it } from 'vitest';
import { classifyAccess, classifyLighting, normalizeCourt, playScore } from '../src/services';
import type { Forecast } from '../src/types';
import { estimatedSunset } from '../src/sun';

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
});
describe('PlayScore', () => {
  const forecast = (temp: number, wind: number, precip: number): Forecast => ({ time: '', temp, wind, precip, short: '', icon: '' });
  it('favors mild, dry, calm conditions and penalizes rain and wind', () => {
    expect(playScore(forecast(70, 4, 0))).toBeGreaterThan(playScore(forecast(70, 20, 80)));
    expect(playScore(forecast(70, 4, 0))).toBe(100);
  });
});
describe('daylight estimate', () => {
  it('returns a local sunset instant for a U.S. location', () => {
    const sunset = estimatedSunset(38.8462, -77.3064, 'America/New_York', new Date('2026-06-21T12:00:00Z'));
    expect(sunset).not.toBeNull();
    expect(sunset!.toISOString()).toContain('2026-06-22');
  });
});

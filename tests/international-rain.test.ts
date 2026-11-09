import { describe, expect, it } from 'vitest';
import { internationalRainAssessments } from '../src/international-rain';
import { courtCondition } from '../src/court-condition';
import type { Court, Forecast } from '../src/types';
import { weeklyPlayWindows } from '../src/services';
import { estimatedSunrise, estimatedSunset } from '../src/sun';

const now = Date.parse('2026-11-08T10:30:00Z');
const courts = [{ id: 'tokyo' }, { id: 'tokyo-2' }] as Court[];
const periods: Forecast[] = Array.from({ length: 24 }, (_, i) => ({
  time: new Date(now - 10.5 * 3600_000 + i * 3600_000).toISOString(),
  precip: i < 10 ? 100 : 20, temp: 70, wind: 5, short: 'Forecast', icon: '',
}));

describe('international forecast guidance', () => {
  it.each([
    ['Tokyo', 35.6762, 139.6503, 'Asia/Tokyo'],
    ['London', 51.5074, -0.1278, 'Europe/London'],
    ['Sydney', -33.8688, 151.2093, 'Australia/Sydney'],
    ['Auckland', -36.8485, 174.7633, 'Pacific/Auckland'],
  ])('keeps sunrise, sunset, and forecast windows on the local day in %s', (_city, lat, lon, zone) => {
    const date = new Date('2026-11-09T02:00:00Z');
    const sunrise = estimatedSunrise(lat, lon, zone, date, true)!;
    const sunset = estimatedSunset(lat, lon, zone, date, true)!;
    const localDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: zone });
    expect(localDay(sunrise)).toBe(localDay(date));
    expect(localDay(sunset)).toBe(localDay(date));
    expect(sunset.getTime()).toBeGreaterThan(sunrise.getTime());
    const hours = Array.from({ length: 72 }, (_, i) => ({ ...periods[0], time: new Date(date.getTime() + i * 3600_000).toISOString() }));
    expect(weeklyPlayWindows(hours, zone, lat, lon, true).length).toBeGreaterThan(0);
  });

  it('uses the upcoming six hours rather than midnight or elapsed hours', () => {
    const results = internationalRainAssessments(courts, periods, now);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ source: 'forecast', forecastRainChance: 20, score: 80,
      rain1h: null, rain3h: null, rain6h: null, confidence: 'Moderate' });
    expect(results[1].score).toBe(results[0].score);
    expect(courtCondition({ rain: results[0], rainLoading: false }).label).toContain('forecast estimate');
  });

  it('does not imply dry conditions when forecast coverage is missing or stale', () => {
    expect(internationalRainAssessments(courts, [], now)).toEqual([]);
    expect(internationalRainAssessments(courts, periods.slice(0, 12), now)).toEqual([]);
    expect(internationalRainAssessments(courts, periods.map(p => ({ ...p, precipKnown: false })), now)).toEqual([]);
    expect(internationalRainAssessments(courts, periods.filter((_, i) => i !== 13), now)).toEqual([]);
  });

  it('keeps forecast estimates distinct from US radar condition labels', () => {
    expect(courtCondition({ international: true, rainLoading: false }).label).toBe('Area forecast unavailable');
    expect(courtCondition({ rainLoading: false }).label).toBe('Radar data unavailable');
  });
});

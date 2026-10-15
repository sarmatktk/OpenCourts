import { afterEach, describe, expect, it, vi } from 'vitest';
import { assessRainfall, classifyAccess, classifyLighting, currentHeatCaution, distinguishCourtNames, enrichNearbyCourtDetails, getRainAssessments, groupCourtsByVenue, hasWidespreadRecentRain, HEAT_INDEX_DISPLAY_THRESHOLD_F, heatIndexFahrenheit, normalizeCourt, playScore, playScoreFactors, weeklyPlayWindows, withWinterSurfaceCaution } from '../src/services';
import type { Forecast } from '../src/types';
import { estimatedSunrise, estimatedSunset } from '../src/sun';

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
      name: 'Tennis courts', 'opencourts:context_version': '2', 'opencourts:nearby_place': 'Greenbriar Park',
      'opencourts:nearby_place_miles': '0.020', 'opencourts:nearby_street': 'Cedar Lane',
    } }, [], 'Fairfax');
    expect(court.name).toBe('Tennis courts');
    expect(court.contextName).toBe('At Greenbriar Park');
    expect(court.address).toBe('At Greenbriar Park, Fairfax');
    expect(court.addressApprox).toBe(true);
    expect(court.contextCached).toBe(true);
  });
  it('refreshes older catalog context so a newly available park can replace a road label', () => {
    const court = normalizeCourt({ type: 'way', id: 502, lat: 38.8, lon: -77.3, tags: {
      name: 'Tennis courts', 'opencourts:context_version': '1', 'opencourts:nearby_street': 'Woodland Park Road',
    } });
    expect(court.contextCached).toBe(false);
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
    expect(enriched[0].address).toBe('At Green Park, Fairfax');
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
    expect(enriched[0].address).toBe('At Greenbriar Park, Fairfax');
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
    expect(enriched[0].address).toBe('At Green Park, Fairfax');
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
    expect(enriched[0].address).toBe('At Greenbriar Park, Fairfax');
  });
  it('keeps a mapped street address even when the court is inside a park', () => {
    const court = normalizeCourt({ type: 'way', id: 20, lat: 38.8462, lon: -77.3064, tags: {
      name: 'Tennis courts', 'addr:housenumber': '123', 'addr:street': 'Oak Road',
    } });
    const enriched = enrichNearbyCourtDetails([court], [
      { type: 'node', id: 21, lat: 38.8462, lon: -77.3064, tags: { leisure: 'park', name: 'Greenbriar Park' } },
    ], 'Fairfax');
    expect(enriched[0].contextName).toBe('At Greenbriar Park');
    expect(enriched[0].address).toBe('123 Oak Road');
    expect(enriched[0].addressApprox).toBe(false);
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
  it('penalizes low rain chances gently and high chances much more strongly', () => {
    expect(playScore(forecast(70, 4, 15))).toBe(96);
    expect(playScore(forecast(70, 4, 33))).toBe(87);
    expect(playScore(forecast(70, 4, 90))).toBe(40);
    expect(playScore(forecast(63, 4, 33))).toBe(87);
    expect(playScore(forecast(63, 4, 80))).toBeLessThan(55);
  });
  it('ranks score explanations by the actual penalty and prioritizes winter risk', () => {
    expect(playScoreFactors(forecast(50, 12, 30)).map(factor => factor.type)).toEqual(['cold', 'rain', 'wind']);
    expect(playScoreFactors(forecast(70, 4, 15))).toEqual([]);
    expect(playScoreFactors({ ...forecast(50, 12, 30), winterRisk: 'snow' })).toMatchObject([{ type: 'snow' }]);
  });
  it('treats mild temperatures as comfortable rather than heat or cold', () => {
    expect(playScore(forecast(73, 4, 0))).toBe(100);
    expect(playScoreFactors(forecast(73, 4, 0))).toEqual([]);
    expect(playScore(forecast(63, 4, 0))).toBe(100);
    expect(playScoreFactors(forecast(63, 4, 0))).toEqual([]);
    expect(playScoreFactors({ ...forecast(73, 4, 0), humidity: 70 }).some(factor => factor.type === 'heat')).toBe(false);
    expect(playScoreFactors(forecast(85, 4, 0)).map(factor => factor.type)).toContain('heat');
    expect(playScoreFactors(forecast(55, 4, 0)).map(factor => factor.type)).toContain('cold');
  });
  it('keeps humidity optional and lowers scores when humidity raises heat index', () => {
    const dryForecast = forecast(90, 4, 0);
    expect(HEAT_INDEX_DISPLAY_THRESHOLD_F).toBe(90);
    expect(heatIndexFahrenheit(90, 70)).toBeGreaterThanOrEqual(105);
    expect(playScore({ ...dryForecast, humidity: 70 })).toBeLessThan(playScore(dryForecast));
    expect(playScore({ ...dryForecast, humidity: undefined })).toBe(playScore(dryForecast));
  });
  it('uses apparent temperature once above the comfort range and keeps cold based on air temperature', () => {
    const hot = forecast(90, 4, 0);
    expect(playScore(hot)).toBe(56);
    expect(playScore({ ...hot, humidity: 70 })).toBe(
      playScore(forecast(heatIndexFahrenheit(90, 70), 4, 0)),
    );
    expect(playScore({ ...forecast(50, 4, 0), humidity: 90 })).toBe(playScore(forecast(50, 4, 0)));
  });
  it('uses the NWS simple heat-index step before the full regression', () => {
    expect(heatIndexFahrenheit(80, 10)).toBe(79);
    expect(heatIndexFahrenheit(96, 65)).toBe(121);
    expect(heatIndexFahrenheit(90, 70)).toBeGreaterThan(100);
  });
  it('shows a current heat caution with humidity, without humidity, or from an official alert', () => {
    const mild = forecast(75, 4, 0);
    expect(currentHeatCaution(mild)).toBeNull();
    expect(currentHeatCaution({ ...forecast(90, 4, 0), humidity: 70 })).toMatchObject({ high: true });
    expect(currentHeatCaution(forecast(92, 4, 0))?.label).toContain('92°F air temperature');
    expect(currentHeatCaution(mild, 'Heat Advisory')?.label).toContain('Heat Advisory');
    expect(currentHeatCaution(undefined, 'Excessive Heat Warning')).toMatchObject({ high: true });
  });
  it('caps snow and ice forecast windows at a poor playing score', () => {
    const periods = [
      { ...forecast(40, 3, 20), time: '2026-01-02T15:00:00Z', endTime: '2026-01-02T16:00:00Z', short: 'Cloudy' },
      { ...forecast(38, 3, 60), time: '2026-01-02T16:00:00Z', endTime: '2026-01-02T17:00:00Z', short: 'Snow showers', winterRisk: 'snow' as const },
    ];
    const window = weeklyPlayWindows(periods, 'UTC')[0]?.windows.find(item => item.winterRisk === 'snow');
    expect(window?.winterRisk).toBe('snow');
    expect(window?.score).toBeLessThanOrEqual(20);
  });
  it('carries snow and ice cautions after precipitation ends, then clears after sustained warmth', () => {
    const hourly = (risk: 'snow' | 'ice', temp: number) => Array.from({ length: 9 }, (_, index) => ({
      ...forecast(index === 0 ? 30 : temp, 3, index === 0 ? 80 : 0),
      time: new Date(Date.UTC(2026, 0, 2, 10 + index)).toISOString(),
      endTime: new Date(Date.UTC(2026, 0, 2, 11 + index)).toISOString(),
      short: index === 0 ? risk : 'Clear', ...(index === 0 ? { winterRisk: risk } : {}),
    }));
    const snow = withWinterSurfaceCaution(hourly('snow', 47));
    expect(snow[1].winterCaution).toEqual({ type: 'snow', lingering: true });
    expect(snow[5].winterCaution).toEqual({ type: 'snow', lingering: true });
    expect(snow[6].winterCaution).toBeUndefined();
    const ice = withWinterSurfaceCaution(hourly('ice', 47));
    expect(ice[6].winterCaution).toEqual({ type: 'ice', lingering: true });
    expect(playScore(ice[1])).toBeLessThanOrEqual(20);
    const windows = weeklyPlayWindows(hourly('ice', 47), 'UTC').flatMap(day => day.windows);
    expect(windows.some(window => window.winterCaution?.lingering && window.score <= 20)).toBe(true);
  });
  it('expires lingering cautions and leaves unrelated dry forecasts alone', () => {
    const hourly = (risk: 'snow' | 'ice') => Array.from({ length: 42 }, (_, index) => ({
      ...forecast(28, 3, index === 0 ? 80 : 0),
      time: new Date(Date.UTC(2026, 0, 2, index)).toISOString(),
      endTime: new Date(Date.UTC(2026, 0, 2, index + 1)).toISOString(),
      short: index === 0 ? risk : 'Clear', ...(index === 0 ? { winterRisk: risk } : {}),
    }));
    const snow = withWinterSurfaceCaution(hourly('snow'));
    const ice = withWinterSurfaceCaution(hourly('ice'));
    expect(snow[24].winterCaution?.lingering).toBe(true);
    expect(snow[25].winterCaution).toBeUndefined();
    expect(ice[35].winterCaution?.lingering).toBe(true);
    expect(ice[37].winterCaution).toBeUndefined();
    expect(withWinterSurfaceCaution(hourly('snow').slice(1)).every(item => !item.winterCaution)).toBe(true);
  });
  it('retains a bounded caution when a refreshed forecast starts after the event', () => {
    const start = Date.UTC(2026, 0, 2, 12);
    const periods = Array.from({ length: 8 }, (_, index) => ({
      ...forecast(30, 3, 0), time: new Date(start + index * 60 * 60_000).toISOString(),
      endTime: new Date(start + (index + 1) * 60 * 60_000).toISOString(), short: 'Clear',
    }));
    const seeded = withWinterSurfaceCaution(periods, { type: 'ice', until: start + 36 * 60 * 60_000 });
    expect(seeded[0].winterCaution).toEqual({ type: 'ice', lingering: true });
    expect(weeklyPlayWindows(seeded, 'UTC').flatMap(day => day.windows).some(window => window.winterCaution?.lingering)).toBe(true);
    expect(withWinterSurfaceCaution(periods, { type: 'ice', until: start - 1 })[0].winterCaution).toBeUndefined();
  });
  it('keeps high heat-index windows visible with their low score and heat value', () => {
    const periods = [
      { ...forecast(94, 4, 0), time: '2026-01-02T15:00:00Z', endTime: '2026-01-02T16:00:00Z', short: 'Hot', humidity: 70 },
      { ...forecast(94, 4, 0), time: '2026-01-02T16:00:00Z', endTime: '2026-01-02T17:00:00Z', short: 'Hot', humidity: 70 },
    ];
    const window = weeklyPlayWindows(periods, 'UTC')[0]?.windows[0];
    expect(window?.heatIndex).toBeGreaterThanOrEqual(HEAT_INDEX_DISPLAY_THRESHOLD_F);
    expect(window?.score).toBeLessThan(55);
  });
  it('shows every available hour from 8 AM through 7 PM on a rainy day', () => {
    const periods = Array.from({ length: 11 }, (_, hour) => ({
      ...forecast(70, 4, 90),
      time: new Date(Date.UTC(2026, 9, 15, 8 + hour)).toISOString(),
      endTime: new Date(Date.UTC(2026, 9, 15, 9 + hour)).toISOString(),
      short: 'Rain showers',
    }));
    const windows = weeklyPlayWindows(periods, 'UTC')[0]?.windows ?? [];
    expect(windows).toHaveLength(1);
    expect(windows[0].time).toBe(periods[0].time);
    expect(windows.at(-1)?.endTime).toBe(periods.at(-1)?.endTime);
    expect(windows.every(window => window.score < 55)).toBe(true);
    expect(windows[0].short).toBe('Rain throughout the day');
    expect(weeklyPlayWindows(periods.map((period, index) => index === 5 ? { ...period, short: 'Sunny', precip: 0 } : period), 'UTC')[0].windows).toHaveLength(3);
    expect(weeklyPlayWindows(periods.map(period => ({ ...period, short: 'Snow', winterRisk: 'snow' as const })), 'UTC')[0].windows[0].short).toBe('Snow throughout the day');
    const fiveRainHours = weeklyPlayWindows(periods.map((period, index) => index >= 2 && index < 7 ? period : { ...period, short: 'Sunny', precip: 0 }), 'UTC')[0].windows;
    expect(fiveRainHours.map(window => window.short)).toEqual(['Sunny', 'Rain during this period', 'Sunny', 'Sunny']);
    expect(fiveRainHours[1].time).toBe(periods[2].time);
    expect(fiveRainHours[1].endTime).toBe(periods[7].time);
  });
  it('combines adjacent hours without repeating the same shower forecast', () => {
    const periods = [
      { ...forecast(70, 4, 20), time: '2026-10-15T15:00:00Z', endTime: '2026-10-15T16:00:00Z', short: 'Slight Chance Showers And Thunderstorms' },
      { ...forecast(70, 4, 36), time: '2026-10-15T16:00:00Z', endTime: '2026-10-15T17:00:00Z', short: 'Chance Showers And Thunderstorms' },
    ];
    expect(weeklyPlayWindows(periods, 'UTC')[0].windows[0].short).toBe('Chance Showers And Thunderstorms');
  });
  it('groups low-scoring wind and heat hours while keeping later playable hours', () => {
    const periods = Array.from({ length: 11 }, (_, hour) => ({
      ...forecast(hour < 3 ? 80 : hour < 5 ? 96 : 70, hour < 3 ? 35 : 4, 0),
      time: new Date(Date.UTC(2026, 9, 15, 8 + hour)).toISOString(),
      endTime: new Date(Date.UTC(2026, 9, 15, 9 + hour)).toISOString(),
      short: hour < 3 ? 'Windy' : hour < 5 ? 'Hot' : 'Sunny',
    }));
    const windows = weeklyPlayWindows(periods, 'UTC')[0].windows;
    expect(windows.map(window => window.short)).toEqual(['Windy during this period', 'Hot during this period', 'Sunny', 'Sunny', 'Sunny']);
    expect(windows[0].endTime).toBe(periods[3].time);
    expect(windows.at(-1)?.endTime).toBe(periods.at(-1)?.endTime);
  });
  it('uses local sunrise and sunset for summer and winter forecast hours', () => {
    const hourly = (month: number, day: number) => Array.from({ length: 48 }, (_, hour) => ({
      ...forecast(70, 4, 0), short: 'Clear',
      time: new Date(Date.UTC(2026, month, day, hour)).toISOString(),
      endTime: new Date(Date.UTC(2026, month, day, hour + 1)).toISOString(),
    }));
    const lat = 38.8462; const lon = -77.3064; const zone = 'America/New_York';
    const summer = weeklyPlayWindows(hourly(5, 21), zone, lat, lon).find(day => day.date === '2026-06-21')?.windows ?? [];
    const winter = weeklyPlayWindows(hourly(0, 21), zone, lat, lon).find(day => day.date === '2026-01-21')?.windows ?? [];
    expect(summer[0].time).toBe(estimatedSunrise(lat, lon, zone, new Date('2026-06-21T12:00:00Z'))?.toISOString());
    expect(summer.at(-1)?.endTime).toBe(estimatedSunset(lat, lon, zone, new Date('2026-06-21T12:00:00Z'))?.toISOString());
    expect(new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hour12: false }).format(new Date(summer.at(-1)!.endTime!))).toBe('20');
    expect(winter.at(-1)?.endTime).toBe(estimatedSunset(lat, lon, zone, new Date('2026-01-21T12:00:00Z'))?.toISOString());
    expect(summer.length).toBeGreaterThan(winter.length);
  });
});
describe('rain API errors', () => {
  it('shows a plain visitor message when the endpoint returns HTML instead of JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<html>Bad gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }))));
    await expect(getRainAssessments([{ id: 'court-1', lat: 38.8, lon: -77.3 } as any])).rejects.toThrow('Recent rain data is temporarily unavailable. Please try again.');
  });
});
describe('hourly radar score', () => {
  it('scores the actual court readings and describes the latest radar window', () => {
    expect(assessRainfall(0, 0, 0)).toMatchObject({ score: 100, confidence: 'High', summary: 'No precipitation in the latest 6-hour radar estimate' });
    expect(assessRainfall(0.1, 0.3, 0.5).score).toBe(39);
  });
  it('lets rainfall from 3–6 hours ago fade more than recent rain', () => {
    const olderRain = assessRainfall(0, 0, 7.6);
    const currentRain = assessRainfall(0.1, 0.1, 0.1);
    expect(olderRain.score).toBe(57);
    expect(olderRain.score).toBeGreaterThan(currentRain.score);
    expect(olderRain.summary).toBe('Precipitation likely stopped 3–6 hours ago');
  });
  it('grades complete, consistent radar readings independently of whether rain has stopped', () => {
    expect(assessRainfall(0, 0.4, 8.5).confidence).toBe('High');
    expect(assessRainfall(0, 0, 7.6).confidence).toBe('High');
    expect(assessRainfall(0, 0.4, null).confidence).toBe('Moderate');
    expect(assessRainfall(0, null, null).confidence).toBe('Low');
    expect(assessRainfall(0.5, 0.2, 0.6).confidence).toBe('Low');
  });
  it('omits an extreme raster value from the score and recommendations', () => {
    const result = assessRainfall(0, 1.7, 66.8);
    expect(result).toMatchObject({ rain1h: 0, rain3h: 1.7, rain6h: null, confidence: 'Low' });
    expect(result.score).toBe(14);
    expect(result.summary).toContain('unusually high radar value was omitted');
    expect(assessRainfall(null, null, 66.8)).toMatchObject({ rain6h: null, confidence: 'Low' });
  });
});
describe('nearby rain warning', () => {
  const reading = (id: number, hour: number | null, threeHours: number | null) => ({
    courtId: `court-${id}`, ...assessRainfall(hour, threeHours, null),
  });
  const ids = new Set([1, 2, 3, 4, 5].map(id => `court-${id}`));

  it('warns for widespread light rain even when individual radar scores are high', () => {
    const readings = [reading(1, 0.01, 0.01), reading(2, 0.02, 0.02), reading(3, 0, 0.01), reading(4, 0, 0), reading(5, 0, 0)];
    expect(readings[0].score).toBeGreaterThan(80);
    expect(hasWidespreadRecentRain(readings, ids)).toBe(true);
    expect(hasWidespreadRecentRain([1, 2, 3, 4, 5].map(id => reading(id, 0.2, 0.3)), ids)).toBe(true);
  });
  it('does not warn for dry, scattered, stale, or too few readable courts', () => {
    expect(hasWidespreadRecentRain([reading(1, 0, 0), reading(2, 0, 0), reading(3, 0, 0)], ids)).toBe(false);
    expect(hasWidespreadRecentRain([reading(1, 0.02, 0.02), reading(2, 0.02, 0.02), reading(3, 0, 0), reading(4, 0, 0), reading(5, 0, 0)], ids)).toBe(false);
    expect(hasWidespreadRecentRain([reading(1, 0, 0), reading(2, 0, 0), reading(3, null, null)], ids)).toBe(false);
    expect(hasWidespreadRecentRain([reading(1, 0.02, 0.02), reading(2, 0.02, 0.02), reading(6, 0.02, 0.02)], ids)).toBe(false);
    expect(hasWidespreadRecentRain([reading(1, 0, 0), reading(2, 0, 0), reading(3, 0, 0.01)], ids)).toBe(false);
    expect(hasWidespreadRecentRain([1, 2, 3].map(id => ({ ...reading(id, 0, 0), rain6h: 0.2 })), ids)).toBe(false);
    expect(hasWidespreadRecentRain([1, 2, 3].map(id => ({ ...reading(id, 13, null), rain3h: null })), ids)).toBe(false);
    expect(hasWidespreadRecentRain([1, 2, 3].map(id => reading(id, 0.5, 0.1)), ids)).toBe(false);
  });
});
describe('daylight estimate', () => {
  it('returns a local sunset instant for a U.S. location', () => {
    const sunset = estimatedSunset(38.8462, -77.3064, 'America/New_York', new Date('2026-06-21T12:00:00Z'));
    expect(sunset).not.toBeNull();
    expect(sunset!.toISOString()).toContain('2026-06-22');
  });
});

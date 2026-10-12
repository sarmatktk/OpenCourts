import { readEdgeCache, writeEdgeCache } from '../lib/edge-cache';

interface Env {}

function durationMs(value: string): number | null {
  const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(value);
  if (!match) return null;
  const [, days = '0', hours = '0', minutes = '0', seconds = '0'] = match;
  return ((Number(days) * 24 + Number(hours)) * 60 + Number(minutes)) * 60_000 + Number(seconds) * 1000;
}

function forecastWinterRisk(text: unknown): 'snow' | 'ice' | undefined {
  if (typeof text !== 'string') return undefined;
  if (/\b(?:freezing rain|freezing drizzle|freezing fog|sleet|ice pellets|wintry mix|glaze)\b/i.test(text)) return 'ice';
  if (/\bsnow(?:fall|ing|y|s)?\b/i.test(text)) return 'snow';
  return undefined;
}

export function humidityForTime(values: any[], time: string): number | undefined {
  const timestamp = Date.parse(time);
  if (!Number.isFinite(timestamp)) return undefined;
  const sample = values.find(item => {
    if (typeof item?.validTime !== 'string' || !Number.isFinite(item.value)) return false;
    const [startText, durationText] = item.validTime.split('/');
    if (!startText || !durationText) return false;
    const start = Date.parse(startText);
    const duration = durationMs(durationText);
    return Number.isFinite(start) && duration !== null && timestamp >= start && timestamp < start + duration;
  });
  return sample && sample.value >= 0 && sample.value <= 100 ? sample.value : undefined;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil }) => {
  const u = new URL(request.url); const rawLat = u.searchParams.get('lat'); const rawLon = u.searchParams.get('lon');
  if (rawLat === null || rawLon === null || !rawLat.trim() || !rawLon.trim()) return Response.json({ error: 'Valid coordinates are required.' }, { status: 400 });
  const lat = Number(rawLat); const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({ error: 'Valid coordinates are required.' }, { status: 400 });
  const cache = typeof caches === 'undefined' ? undefined : caches.default; const key = new Request(`${u.origin}/api/weather?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`); const cached = await readEdgeCache(cache, key); if (cached) return cached;
  try {
    const headers = { 'User-Agent': 'OpenCourts.us (https://opencourts.us; hello@opencourts.us)', 'Accept': 'application/geo+json' };
    const point = await fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers, signal: AbortSignal.timeout(12000) }); if (!point.ok) return Response.json({ error: 'Forecast unavailable for this location.' }, { status: 502 });
    const pointData: any = await point.json(); const properties = pointData.properties ?? {}; const forecastUrl = properties.forecastHourly;
    if (!forecastUrl) return Response.json({ periods: [], outlook: [], timeZone: properties.timeZone || 'America/New_York' });
    const [hourlyResponse, dailyResponse, gridDataResponse] = await Promise.all([
      fetch(forecastUrl, { headers, signal: AbortSignal.timeout(12000) }),
      properties.forecast ? fetch(properties.forecast, { headers, signal: AbortSignal.timeout(12000) }) : Promise.resolve(null),
      properties.forecastGridData ? fetch(properties.forecastGridData, { headers, signal: AbortSignal.timeout(5000) }).catch(() => null) : Promise.resolve(null),
    ]);
    if (!hourlyResponse.ok) return Response.json({ error: 'Forecast temporarily unavailable.' }, { status: 502 });
    const [hourly, daily, gridData] = await Promise.all([hourlyResponse.json() as Promise<any>, dailyResponse?.ok ? dailyResponse.json() as Promise<any> : Promise.resolve(null), gridDataResponse?.ok ? gridDataResponse.json().catch(() => null) : Promise.resolve(null)]);
    const humidityValues = gridData?.properties?.relativeHumidity?.values ?? [];
    const mapPeriod = (p: any) => {
      const humidity = humidityForTime(humidityValues, p.startTime);
      const winterRisk = forecastWinterRisk(p.shortForecast);
      return { time: p.startTime, endTime: p.endTime, temp: p.temperature, wind: parseInt(p.windSpeed, 10) || 0, precip: p.probabilityOfPrecipitation?.value ?? 0, ...(humidity === undefined ? {} : { humidity }), ...(winterRisk ? { winterRisk } : {}), short: p.shortForecast, icon: p.icon };
    };
    const periods = (hourly.properties?.periods ?? []).slice(0, 168).map(mapPeriod);
    const outlook = (daily?.properties?.periods ?? []).map(mapPeriod);
    const response = Response.json({ periods, outlook, timeZone: properties.timeZone || 'America/New_York' }, { headers: { 'Cache-Control': 'public, max-age=1800' } }); writeEdgeCache(cache, key, response, waitUntil); return response;
  } catch { return Response.json({ error: 'Weather forecast is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
};

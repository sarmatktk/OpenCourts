import { readEdgeCache, writeEdgeCache } from '../lib/edge-cache';

interface Env {}
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
    const [hourlyResponse, dailyResponse] = await Promise.all([
      fetch(forecastUrl, { headers, signal: AbortSignal.timeout(12000) }),
      properties.forecast ? fetch(properties.forecast, { headers, signal: AbortSignal.timeout(12000) }) : Promise.resolve(null),
    ]);
    if (!hourlyResponse.ok) return Response.json({ error: 'Forecast temporarily unavailable.' }, { status: 502 });
    const [hourly, daily] = await Promise.all([hourlyResponse.json() as Promise<any>, dailyResponse?.ok ? dailyResponse.json() as Promise<any> : Promise.resolve(null)]);
    const mapPeriod = (p: any) => ({ time: p.startTime, endTime: p.endTime, temp: p.temperature, wind: parseInt(p.windSpeed, 10) || 0, precip: p.probabilityOfPrecipitation?.value ?? 0, short: p.shortForecast, icon: p.icon });
    const periods = (hourly.properties?.periods ?? []).slice(0, 168).map(mapPeriod);
    const outlook = (daily?.properties?.periods ?? []).map(mapPeriod);
    const response = Response.json({ periods, outlook, timeZone: properties.timeZone || 'America/New_York' }, { headers: { 'Cache-Control': 'public, max-age=1800' } }); writeEdgeCache(cache, key, response, waitUntil); return response;
  } catch { return Response.json({ error: 'Weather forecast is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
};

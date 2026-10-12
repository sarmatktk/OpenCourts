import { readEdgeCache, writeEdgeCache } from '../lib/edge-cache';

interface Env {}

const service = 'https://api.weather.gov/alerts/active';
const heatEvent = /\bheat (?:advisory|watch|warning)\b|\b(?:excessive|extreme) heat (?:watch|warning)\b/i;
const winterEvent = /\b(?:winter storm|winter weather|ice storm|blizzard|snow|sleet|freezing rain|freezing drizzle|freezing fog|snow squall|wind chill|freeze warning|freeze watch|frost advisory)\b/i;
const severityRank: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };

export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil }) => {
  const url = new URL(request.url);
  const rawLat = url.searchParams.get('lat');
  const rawLon = url.searchParams.get('lon');
  if (rawLat === null || rawLon === null || !rawLat.trim() || !rawLon.trim()) {
    return Response.json({ error: 'Valid coordinates are required.' }, { status: 400 });
  }
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: 'Valid coordinates are required.' }, { status: 400 });
  }

  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cacheKey = new Request(`${url.origin}/api/weather-alerts?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`);
  const cached = await readEdgeCache(cache, cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${service}?point=${encodeURIComponent(`${lat},${lon}`)}`, {
      headers: {
        'User-Agent': 'OpenCourts.us (https://opencourts.us; hello@opencourts.us)',
        Accept: 'application/geo+json',
      },
      signal: AbortSignal.timeout(8000),
    });
    // NWS alert coverage is limited to U.S. service areas. Treat unsupported
    // locations as such, rather than turning an international forecast into an error.
    if ([400, 404, 422].includes(response.status)) {
      return Response.json({ supported: false, alerts: [] }, { headers: { 'Cache-Control': 'public, max-age=1800' } });
    }
    if (!response.ok) throw new Error(`NWS alerts returned ${response.status}`);

    const data: any = await response.json();
    const alerts = (Array.isArray(data.features) ? data.features : [])
      .map((feature: any) => {
        const properties = feature?.properties ?? {};
        const event = typeof properties.event === 'string' ? properties.event.trim() : '';
        if (!heatEvent.test(event) && !winterEvent.test(event)) return null;
        const originalUrl = typeof feature.id === 'string' ? feature.id : '';
        return {
          id: originalUrl || `${event}-${properties.effective || properties.onset || ''}`,
          event,
          severity: typeof properties.severity === 'string' ? properties.severity : 'Unknown',
          headline: typeof properties.headline === 'string' ? properties.headline : event,
          area: typeof properties.areaDesc === 'string' ? properties.areaDesc : '',
          effective: typeof properties.effective === 'string' ? properties.effective : typeof properties.onset === 'string' ? properties.onset : null,
          ends: typeof properties.ends === 'string' ? properties.ends : typeof properties.expires === 'string' ? properties.expires : null,
          url: originalUrl.startsWith('https://') ? originalUrl : '',
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (severityRank[a.severity] ?? 4) - (severityRank[b.severity] ?? 4));

    const result = Response.json({ supported: true, alerts }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    writeEdgeCache(cache, cacheKey, result, waitUntil);
    return result;
  } catch (error) {
    console.warn('[OpenCourts] NWS heat-alert lookup failed', error instanceof Error ? error.message : 'request failed');
    return Response.json({ error: 'Heat alert information is temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};

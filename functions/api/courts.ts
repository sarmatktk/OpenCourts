
import { queryOverpass } from '../lib/overpass';
import { readEdgeCache, writeEdgeCache } from '../lib/edge-cache';
import { findCourtsInCatalog, type D1Database } from '../lib/court-catalog';

interface Env { COURTS_DB?: D1Database }
const globalEndpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil, env }) => {
  const url = new URL(request.url);
  const rawLat = url.searchParams.get('lat'); const rawLon = url.searchParams.get('lon');
  if (rawLat === null || rawLon === null || !rawLat.trim() || !rawLon.trim()) return Response.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  const lat = Number(rawLat); const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  // Keep regional requests bounded. This is a discovery radius, not a completeness guarantee.
  const dLat = 0.135; const dLon = dLat / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  const south = Math.max(-90, lat - dLat); const north = Math.min(90, lat + dLat);
  const west = Math.max(-180, lon - dLon); const east = Math.min(180, lon + dLon);
  const bbox = `${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}`;
  const cacheKey = new Request(`${url.origin}/api/courts?v=4&bbox=${bbox}`); const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = await readEdgeCache(cache, cacheKey); if (cached) return cached;
  // Keep the blocking query focused on tennis features. Nearby roads and parks
  // are fetched separately after this response so they can't delay the results.
  const query = `[out:json][timeout:16];(nwr["leisure"="pitch"]["sport"~"(^|;)tennis(;|$)"](${bbox});nwr["leisure"="sports_centre"]["sport"~"(^|;)tennis(;|$)"](${bbox}););out center tags;`;
  const isVirginia = lat >= 36.5 && lat <= 39.5 && lon >= -83.7 && lon <= -75.2;
  const endpoints = isVirginia ? ['https://overpass.maprva.org/api/interpreter', ...globalEndpoints] : globalEndpoints;
  try {
    if (env.COURTS_DB) {
      try {
        const data = await findCourtsInCatalog(env.COURTS_DB, { south, west, north, east });
        if (data.length > 0) {
          const response = Response.json({ elements: data }, { headers: { 'Cache-Control': 'public, max-age=21600', 'Access-Control-Allow-Origin': '*' } });
          writeEdgeCache(cache, cacheKey, response, waitUntil);
          return response;
        }
        // An empty catalog result can mean the location is outside the imported
        // regions (for example, a search in the UK). Try live OpenStreetMap.
      } catch (error) {
        console.warn('[OpenCourts] D1 court catalog unavailable; trying Overpass', error);
      }
    }

    // Cache court listings for six hours; the source data changes slowly and
    // this avoids sending repeat queries to public Overpass instances.
    const data = await queryOverpass(endpoints, query, 20000);
    const response = Response.json(data, { headers: { 'Cache-Control': 'public, max-age=21600', 'Access-Control-Allow-Origin': '*' } });
    writeEdgeCache(cache, cacheKey, response, waitUntil); return response;
  } catch (error) {
    const failures = error instanceof Error && 'failures' in error && Array.isArray(error.failures) ? error.failures.join(' · ') : '';
    const upstreamStatus = error instanceof Error && 'status' in error ? error.status : undefined;
    console.warn('[OpenCourts] Court data providers failed', failures || error);
    return Response.json({ error: 'Court data is temporarily unavailable.', ...(upstreamStatus ? { upstreamStatus } : {}), ...(failures ? { diagnostic: failures } : {}) }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } });
  }
};

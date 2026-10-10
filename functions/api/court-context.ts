import { queryOverpass } from '../lib/overpass';
import { readEdgeCache, writeEdgeCache } from '../lib/edge-cache';

interface Env {}

const globalProviders = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

type CourtPoint = { lat: number; lon: number };
// Keep context lookups small enough for public Overpass servers. The browser
// sends the closest results first, so the visible courts get useful labels.
const MAX_CONTEXT_COURTS = 24;

function contextHash(points: CourtPoint[]) {
  const input = points.map(point => `${point.lat.toFixed(4)},${point.lon.toFixed(4)}`).sort().join(';');
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

export const onRequestGet: PagesFunction<Env> = async () => Response.json({ error: 'Send nearby court coordinates with POST.' }, { status: 405 });

export const onRequestPost: PagesFunction<Env> = async ({ request, waitUntil }) => {
  let body: { courts?: unknown };
  try { body = await request.json() as { courts?: unknown }; }
  catch { return Response.json({ error: 'A valid list of court coordinates is required.' }, { status: 400 }); }
  if (!Array.isArray(body.courts) || body.courts.length === 0 || body.courts.length > MAX_CONTEXT_COURTS) {
    return Response.json({ error: `Provide 1 to ${MAX_CONTEXT_COURTS} court coordinates.` }, { status: 400 });
  }
  const courts: CourtPoint[] = [];
  for (const item of body.courts) {
    const point = item as Partial<CourtPoint> | null;
    if (!point || typeof point.lat !== 'number' || typeof point.lon !== 'number' || !Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) {
      return Response.json({ error: 'Every court must have valid latitude and longitude.' }, { status: 400 });
    }
    courts.push({ lat: point.lat, lon: point.lon });
  }

  const url = new URL(request.url);
  const cacheKey = new Request(`${url.origin}/api/court-context?v=6&courts=${contextHash(courts)}`);
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = await readEdgeCache(cache, cacheKey);
  if (cached) return cached;

  // Query context only for the closest courts currently shown. This avoids
  // re-enumerating hundreds of courts across the whole search area.
  const nearbyQueries = courts.map(({ lat, lon }) => {
    const point = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    // One named-feature selector per court avoids issuing four overlapping
    // selectors (roads, parks, schools, and community places) for every point.
    return `nwr(around:500,${point})["name"];`;
  }).join('');
  const query = `[out:json][timeout:10];(${nearbyQueries});out geom;`;
  // Virginia already has a regional Overpass endpoint in the main court
  // lookup. Use it here too; the global instances were timing out for context.
  const isVirginia = courts.every(({ lat, lon }) => lat >= 36.5 && lat <= 39.5 && lon >= -83.7 && lon <= -75.2);
  const providers = isVirginia
    ? ['https://overpass.maprva.org/api/interpreter', ...globalProviders]
    : globalProviders;
  try {
    const data = await queryOverpass(providers, query, 12000);
    // Empty context responses are usually transient upstream omissions. Avoid
    // caching them so a later page refresh can recover useful place names.
    const response = Response.json(data, { headers: { 'Cache-Control': Array.isArray(data.elements) && data.elements.length ? 'public, max-age=21600' : 'no-store' } });
    if (Array.isArray(data.elements) && data.elements.length > 0) writeEdgeCache(cache, cacheKey, response, waitUntil);
    return response;
  } catch (error) {
    console.warn('[OpenCourts] Nearby court details are unavailable', error);
    const failures = error instanceof Error && 'failures' in error && Array.isArray(error.failures) ? error.failures.join(' · ') : '';
    return Response.json({ error: 'Nearby court names and addresses are not available right now.', ...(failures ? { diagnostic: failures } : {}) }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};

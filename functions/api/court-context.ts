import { queryOverpass } from '../lib/overpass';
import { readEdgeCache, writeEdgeCache } from '../lib/edge-cache';

interface Env {}

const providers = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil }) => {
  const url = new URL(request.url);
  const rawLat = url.searchParams.get('lat');
  const rawLon = url.searchParams.get('lon');
  if (rawLat === null || rawLon === null || !rawLat.trim() || !rawLon.trim()) {
    return Response.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }

  const dLat = 0.135;
  const dLon = 0.18 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  const south = Math.max(-90, lat - dLat); const north = Math.min(90, lat + dLat);
  const west = Math.max(-180, lon - dLon); const east = Math.min(180, lon + dLon);
  const bbox = `${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}`;
  const cacheKey = new Request(`${url.origin}/api/court-context?v=2&bbox=${bbox}`);
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = await readEdgeCache(cache, cacheKey);
  if (cached) return cached;

  // This enrichment query is intentionally separate from the court search.
  // The list and map can show court results even if roads or nearby-place data is slow.
  const query = `[out:json][timeout:18];(nwr["leisure"="pitch"]["sport"~"(^|;)tennis(;|$)"](${bbox});nwr["leisure"="sports_centre"]["sport"~"(^|;)tennis(;|$)"](${bbox});)->.courts;.courts out center tags;nwr(around.courts:200)["highway"]["name"];out center tags;(nwr(around.courts:250)["leisure"~"^(park|recreation_ground)$"]["name"];nwr(around.courts:250)["amenity"~"^(school|college|university|community_centre|community_hall)$"]["name"];nwr(around.courts:250)["landuse"="school"]["name"];);out center tags;`;
  try {
    const data = await queryOverpass(providers, query, 22000);
    const response = Response.json(data, { headers: { 'Cache-Control': 'public, max-age=21600' } });
    writeEdgeCache(cache, cacheKey, response, waitUntil);
    return response;
  } catch (error) {
    console.warn('[OpenCourts] Nearby court details are unavailable', error);
    return Response.json({ error: 'Nearby court names and addresses are not available right now.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};

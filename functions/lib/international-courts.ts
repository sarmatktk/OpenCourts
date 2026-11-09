import { findBundledInternationalCourts } from './international-court-catalog';
import { findCourtsInCatalog, type D1Database } from './court-catalog';
import { queryGeoapifyCourts } from './geoapify-courts';
import { queryOverpass } from './overpass';
import { readEdgeCache, writeEdgeCache } from './edge-cache';

export interface InternationalCourtsEnv {
  GEOAPIFY_API_KEY?: string;
  COURTS_DB?: D1Database;
  INTERNATIONAL_COURTS_CACHE?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options: { expirationTtl: number }): Promise<unknown>;
  };
}
type Data = { elements: unknown[]; source?: string; catalog?: unknown };
type RecordData = { savedAt: number; data: Data };
const FRESH_MS = 6 * 60 * 60_000;
const RETAIN_MS = 30 * 24 * 60 * 60_000;
const flights = new Map<string, Promise<RecordData>>();
const retryAfter = new Map<string, number>();
const endpoints = ['https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter'];

function validRecord(value: unknown): value is RecordData {
  const record = value as RecordData | null;
  return !!record && Number.isFinite(record.savedAt) && record.savedAt <= Date.now()
    && Date.now() - record.savedAt <= RETAIN_MS && Array.isArray(record.data?.elements) && record.data.elements.length > 0;
}
function responseFor(record: RecordData, stale = false) {
  return Response.json({ ...record.data, dataUpdatedAt: new Date(record.savedAt).toISOString(), stale }, {
    headers: { 'Cache-Control': stale ? 'no-store' : 'public, max-age=21600', 'Access-Control-Allow-Origin': '*', 'X-OpenCourts-Data': stale ? 'stale' : 'fresh' },
  });
}

/** International only: durable optional KV, outage fallback, and coalesced requests. */
export async function internationalCourts({ lat: requestedLat, lon: requestedLon, country, origin, env, waitUntil }: {
  lat: number; lon: number; country: string; origin: string; env: InternationalCourtsEnv;
  waitUntil?: (promise: Promise<unknown>) => void;
}) {
  // Nearby searches share a provider query rather than spending credits for
  // every geocoder decimal. Query bounds/providers use this same rounded center.
  const lat = Number(requestedLat.toFixed(2)); const lon = Number(requestedLon.toFixed(2));
  const id = `v1:${country}:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const key = new Request(`${origin}/api/international-court-cache?key=${encodeURIComponent(id)}`);
  const staleKey = new Request(`${key.url}&retained=1`);
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const fresh = await readEdgeCache(cache, key);
  if (fresh) return fresh;
  let saved: RecordData | undefined;
  if (env.INTERNATIONAL_COURTS_CACHE) {
    try {
      const raw = await env.INTERNATIONAL_COURTS_CACHE.get(id);
      const record: unknown = raw ? JSON.parse(raw) : null;
      if (validRecord(record)) saved = record;
    } catch { console.warn('[OpenCourts] International persistent cache unavailable'); }
  }
  if (!saved) {
    const retained = await readEdgeCache(cache, staleKey);
    if (retained) try { const record: unknown = await retained.json(); if (validRecord(record)) saved = record; } catch { /* ignore damaged cached data */ }
  }
  if (saved && Date.now() - saved.savedAt <= FRESH_MS) {
    const response = responseFor(saved); writeEdgeCache(cache, key, response, waitUntil); return response;
  }
  const delta = 0.135; const lonDelta = delta / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  const bounds = { south: Math.max(-90, lat - delta), north: Math.min(90, lat + delta), west: Math.max(-180, lon - lonDelta), east: Math.min(180, lon + lonDelta) };
  const bbox = `${bounds.south.toFixed(4)},${bounds.west.toFixed(4)},${bounds.north.toFixed(4)},${bounds.east.toFixed(4)}`;
  const store = async (data: Data): Promise<RecordData> => {
    const record = { data, savedAt: Date.now() };
    // A provider's empty response is not a usable outage fallback.
    if (data.elements.length) {
      const response = responseFor(record);
      writeEdgeCache(cache, key, response, waitUntil);
      writeEdgeCache(cache, staleKey, Response.json(record, { headers: { 'Cache-Control': 'public, max-age=2592000' } }), waitUntil);
      if (env.INTERNATIONAL_COURTS_CACHE) {
        const write = env.INTERNATIONAL_COURTS_CACHE.put(id, JSON.stringify(record), { expirationTtl: RETAIN_MS / 1000 })
          .catch(() => console.warn('[OpenCourts] International persistent cache write failed'));
        if (waitUntil) waitUntil(write); else await write;
      }
    }
    retryAfter.delete(key.url);
    return record;
  };
  const load = async (): Promise<RecordData> => {
    const imported = findBundledInternationalCourts(country, bounds);
    if (imported) return store({ ...imported, source: 'Imported OpenStreetMap catalog' });
    if (env.COURTS_DB) try {
      const elements = await findCourtsInCatalog(env.COURTS_DB, bounds);
      if (elements.length) return store({ elements, source: 'Imported court catalog' });
    } catch { console.warn('[OpenCourts] International catalog unavailable'); }
    // Use the configured commercial service before spending public-provider
    // capacity. Do not expose API keys or raw upstream URLs in diagnostics.
    if (env.GEOAPIFY_API_KEY) try {
      return store({ ...await queryGeoapifyCourts(lat, lon, env.GEOAPIFY_API_KEY, country), source: 'Geoapify' });
    } catch (error) { console.warn('[OpenCourts] International Geoapify lookup unavailable', error instanceof Error ? error.message : 'Request failed'); }
    const query = `[out:json][timeout:7];(nwr["leisure"="pitch"]["sport"~"(^|;)tennis(;|$)"](${bbox});nwr["leisure"="sports_centre"]["sport"~"(^|;)tennis(;|$)"](${bbox}););out center tags;`;
    const data = await queryOverpass(endpoints, query, 7500, endpoints.length);
    return store({ elements: data.elements ?? [], source: 'OpenStreetMap live providers' });
  };
  const refresh = () => {
    const pending = flights.get(key.url); if (pending) return pending;
    if ((retryAfter.get(key.url) ?? 0) > Date.now()) return Promise.reject(new Error('Provider retry cooldown'));
    const promise = load().catch(error => {
      if (retryAfter.size >= 256) retryAfter.delete(retryAfter.keys().next().value!);
      retryAfter.set(key.url, Date.now() + 30_000); throw error;
    }).finally(() => flights.delete(key.url));
    flights.set(key.url, promise); return promise;
  };
  if (saved && waitUntil) {
    waitUntil(refresh().catch(() => undefined));
    return responseFor(saved, true);
  }
  try { return responseFor(await refresh()); }
  catch {
    if (saved) return responseFor(saved, true);
    return Response.json({ error: 'Court providers are temporarily unavailable for this area. Please try again shortly.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' },
    });
  }
}

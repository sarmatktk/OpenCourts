import { readEdgeCache, writeEdgeCache } from '../lib/edge-cache';
import { normalizeLocationQuery } from '../../src/zip-query';
import { cityStateQuery } from './geocode';

interface Env {}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | number | undefined>;
};

function toSuggestion(feature: PhotonFeature) {
  const properties = feature.properties ?? {};
  const coordinates = feature.geometry?.coordinates;
  const lon = Number(coordinates?.[0]);
  const lat = Number(coordinates?.[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const street = [properties.housenumber, properties.street].filter(Boolean).join(' ');
  const title = String(street || properties.name || properties.city || properties.locality || properties.state || '');
  if (!title) return null;
  const detail = [properties.name && street ? properties.name : '', properties.city || properties.locality || properties.district, properties.state, properties.postcode]
    .map(value => String(value || '').trim())
    .filter((value, index, values) => value && value !== title && values.indexOf(value) === index)
    .join(', ');

  return { title, detail, label: [title, detail].filter(Boolean).join(', '), lat, lon };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil }) => {
  const url = new URL(request.url);
  const { query, zip, error } = normalizeLocationQuery(url.searchParams.get('q') ?? '');
  if (query.length < 3 || query.length > 120) return Response.json({ suggestions: [] }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  if (error) return Response.json({ suggestions: [], error }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  const houseNumber = /^(\d{1,6}[A-Za-z]?)\s+\S/.exec(query)?.[1];
  const cityState = !zip && !houseNumber ? cityStateQuery(query) : null;
  const key = new Request(`${url.origin}/api/suggest?v=5&q=${encodeURIComponent(query.toLowerCase())}`);
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = await readEdgeCache(cache, key);
  if (cached) return cached;

  try {
    const upstream = new URL('https://photon.komoot.io/api/');
    upstream.search = new URLSearchParams({ q: query, countrycode: 'us', lang: 'en', limit: '5' }).toString();
    const response = await fetch(upstream, {
      headers: { Accept: 'application/geo+json, application/json', 'User-Agent': 'OpenCourts.us/1.0 (https://opencourts.us; hello@opencourts.us)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return Response.json({ error: 'Place suggestions are temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    const data = await response.json() as { features?: PhotonFeature[] };
    const suggestions = (data.features ?? []).filter(feature => (!zip || String(feature.properties?.postcode ?? '') === zip)
      && (!houseNumber || String(feature.properties?.housenumber ?? '').toLowerCase() === houseNumber.toLowerCase())
      && (!cityState || (String(feature.properties?.state ?? '').toLowerCase() === cityState.state
        && [feature.properties?.city, feature.properties?.locality].some(name => String(name ?? '').toLowerCase() === cityState.city))))
      .map(toSuggestion).filter((item): item is NonNullable<typeof item> => item !== null);
    const result = Response.json({ suggestions }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    writeEdgeCache(cache, key, result, waitUntil);
    return result;
  } catch {
    return Response.json({ error: 'Place suggestions are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};

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
  const detail = [properties.name && street ? properties.name : '', properties.city || properties.locality || properties.district, properties.state, properties.country, properties.postcode]
    .map(value => String(value || '').trim())
    .filter((value, index, values) => value && value !== title && values.indexOf(value) === index)
    .join(', ');

  const area=String(properties.city||properties.locality||properties.district||properties.county||(properties.osm_key==='place'?properties.name:'')||'').trim();const generalLabel=[area,properties.state].filter(Boolean).join(', ');
  return { generalLabel:area?generalLabel:undefined,title, detail, label: [title, detail].filter(Boolean).join(', '), lat, lon, countryCode: String(properties.countrycode || '').toLowerCase() || undefined };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil }) => {
  const url = new URL(request.url);
  const requestedCountry = (url.searchParams.get('country') || 'any').toLowerCase();
  const requestedPreference = (url.searchParams.get('preferred_country') || '').toLowerCase();
  const { query, zip, error } = normalizeLocationQuery(url.searchParams.get('q') ?? '');
  if (requestedCountry !== 'any' && !/^[a-z]{2}$/.test(requestedCountry)) return Response.json({ error: 'Valid country code required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  if (requestedPreference && !/^[a-z]{2}$/.test(requestedPreference)) return Response.json({ error: 'Valid preferred country code required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  if (query.length < 3 || query.length > 120) return Response.json({ suggestions: [] }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  if (error) return Response.json({ suggestions: [], error }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  const houseNumber = /^(\d{1,6}[A-Za-z]?)\s+\S/.exec(query)?.[1];
  const cityState = !zip && !houseNumber ? cityStateQuery(query) : null;
  const preferredCountry = requestedCountry === 'any' ? requestedPreference || (/^\d{5}$/.test(zip ?? '') ? 'us' : '') : '';
  const key = new Request(`${url.origin}/api/suggest?v=10&country=${requestedCountry || 'any'}&preferred=${preferredCountry || 'any'}&q=${encodeURIComponent(query.toLowerCase())}`);
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = await readEdgeCache(cache, key);
  if (cached) return cached;

  try {
    const fetchFeatures = async (country?: string) => {
      const upstream = new URL('https://photon.komoot.io/api/');
      upstream.search = new URLSearchParams({ q: query, ...(country ? { countrycode: country } : {}), lang: 'en', limit: '5' }).toString();
      const response = await fetch(upstream, {
        headers: { Accept: 'application/geo+json, application/json', 'User-Agent': 'OpenCourts.us/1.0 (https://opencourts.us; hello@opencourts.us)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Place suggestions are temporarily unavailable.');
      return (await response.json() as { features?: PhotonFeature[] }).features ?? [];
    };
    const [preferredResult, generalResult] = await Promise.allSettled([
      preferredCountry ? fetchFeatures(preferredCountry) : Promise.resolve([] as PhotonFeature[]),
      fetchFeatures(requestedCountry === 'any' ? undefined : requestedCountry),
    ]);
    if (generalResult.status === 'rejected' && preferredResult.status === 'rejected') throw generalResult.reason;
    const preferredFeatures = preferredResult.status === 'fulfilled' ? preferredResult.value : [];
    const generalFeatures = generalResult.status === 'fulfilled' ? generalResult.value : [];
    const features = [...preferredFeatures, ...generalFeatures];
    const seen = new Set<string>();
    const suggestions = features.filter(feature => (requestedCountry === 'any' || (requestedCountry === 'us' ? (!feature.properties?.countrycode || String(feature.properties.countrycode).toLowerCase() === 'us') : String(feature.properties?.countrycode || '').toLowerCase() === requestedCountry))
      && (!zip || (requestedCountry !== 'us' && preferredCountry !== 'us') || String(feature.properties?.postcode ?? (feature.properties?.osm_value === 'postcode' ? feature.properties?.name : '') ?? '') === zip)
      && (!houseNumber || String(feature.properties?.housenumber ?? '').toLowerCase() === houseNumber.toLowerCase())
      && (!cityState || (String(feature.properties?.state ?? '').toLowerCase() === cityState.state
        && [feature.properties?.city, feature.properties?.locality].some(name => String(name ?? '').toLowerCase() === cityState.city))))
      .map(toSuggestion).filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        const key = `${item.lat.toFixed(5)},${item.lon.toFixed(5)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const result = Response.json({ suggestions }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    writeEdgeCache(cache, key, result, waitUntil);
    return result;
  } catch {
    return Response.json({ error: 'Place suggestions are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};

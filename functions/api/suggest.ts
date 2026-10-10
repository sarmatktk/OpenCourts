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

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  if (query.length < 3 || query.length > 120) return Response.json({ suggestions: [] }, { headers: { 'Cache-Control': 'public, max-age=60' } });

  const key = new Request(`${url.origin}/api/suggest?q=${encodeURIComponent(query.toLowerCase())}`);
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = cache ? await cache.match(key) : undefined;
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
    const suggestions = (data.features ?? []).map(toSuggestion).filter((item): item is NonNullable<typeof item> => item !== null);
    const result = Response.json({ suggestions }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    if (cache) await cache.put(key, result.clone());
    return result;
  } catch {
    return Response.json({ error: 'Place suggestions are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};

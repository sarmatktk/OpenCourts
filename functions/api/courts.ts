interface Env {}
const globalEndpoints = [
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];
export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url); const lat = Number(url.searchParams.get('lat')); const lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  // Keep regional requests bounded. This is a discovery radius, not a completeness guarantee.
  const dLat = 0.135; const dLon = 0.18 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  const bbox = `${(lat-dLat).toFixed(4)},${(lon-dLon).toFixed(4)},${(lat+dLat).toFixed(4)},${(lon+dLon).toFixed(4)}`;
  const cacheKey = new Request(`${url.origin}/api/courts?bbox=${bbox}`); const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = cache ? await cache.match(cacheKey) : undefined; if (cached) return cached;
  const query = `[out:json][timeout:22];(nwr["leisure"="pitch"]["sport"~"(^|;)tennis(;|$)"](${bbox});nwr["leisure"="sports_centre"]["sport"~"(^|;)tennis(;|$)"](${bbox});)->.courts;.courts out center tags;nwr(around.courts:200)["highway"]["name"];out center tags;(nwr(around.courts:250)["leisure"~"^(park|recreation_ground)$"]["name"];nwr(around.courts:250)["amenity"~"^(school|college|university|community_centre|community_hall)$"]["name"];nwr(around.courts:250)["landuse"="school"]["name"];);out center tags;`;
  const isVirginia = lat >= 36.5 && lat <= 39.5 && lon >= -83.7 && lon <= -75.2;
  const endpoints = isVirginia ? ['https://overpass.maprva.org/api/interpreter', ...globalEndpoints] : globalEndpoints;
  let lastStatus: number | undefined;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'OpenCourts.us/1.0 (public tennis court discovery)' }, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(25000) });
      if (!res.ok) { lastStatus = res.status; console.warn(`[OpenCourts] Court provider ${new URL(endpoint).host} returned ${res.status}`); continue; }
      const data = await res.json(); const response = Response.json(data, { headers: { 'Cache-Control': 'public, max-age=1800', 'Access-Control-Allow-Origin': '*' } });
      if (cache) await cache.put(cacheKey, response.clone()); return response;
    } catch (error) {
      console.warn(`[OpenCourts] Court provider ${new URL(endpoint).host} failed`, error instanceof Error ? error.message : 'request failed');
    }
  }
  return Response.json({ error: 'Court data is temporarily unavailable.', upstreamStatus: lastStatus }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } });
};

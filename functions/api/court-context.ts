interface Env {}

const providers = [
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }

  const dLat = 0.135;
  const dLon = 0.18 / Math.max(0.2, Math.cos(lat * Math.PI / 180));
  const bbox = `${(lat - dLat).toFixed(4)},${(lon - dLon).toFixed(4)},${(lat + dLat).toFixed(4)},${(lon + dLon).toFixed(4)}`;
  const cacheKey = new Request(`${url.origin}/api/court-context?bbox=${bbox}`);
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = cache ? await cache.match(cacheKey) : undefined;
  if (cached) return cached;

  // This enrichment query is intentionally separate from the court search.
  // The list and map can show court results even if roads or nearby-place data is slow.
  const query = `[out:json][timeout:18];(nwr["leisure"="pitch"]["sport"~"(^|;)tennis(;|$)"](${bbox});nwr["leisure"="sports_centre"]["sport"~"(^|;)tennis(;|$)"](${bbox});)->.courts;.courts out center tags;nwr(around.courts:200)["highway"]["name"];out center tags;(nwr(around.courts:250)["leisure"~"^(park|recreation_ground)$"]["name"];nwr(around.courts:250)["amenity"~"^(school|college|university|community_centre|community_hall)$"]["name"];nwr(around.courts:250)["landuse"="school"]["name"];);out center tags;`;
  const controllers: AbortController[] = [];
  const attempts = providers.map(async provider => {
    const controller = new AbortController();
    controllers.push(controller);
    const timeout = setTimeout(() => controller.abort(), 22000);
    try {
      const response = await fetch(provider, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'OpenCourts.us/1.0 (public tennis court discovery)',
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Provider returned ${response.status}.`);
      const data = await response.json() as { elements?: unknown[] };
      if (!Array.isArray(data.elements)) throw new Error('Provider returned an invalid response.');
      return data;
    } finally {
      clearTimeout(timeout);
    }
  });

  try {
    const data = await Promise.any(attempts);
    controllers.forEach(controller => controller.abort());
    const response = Response.json(data, { headers: { 'Cache-Control': 'public, max-age=1800' } });
    if (cache) await cache.put(cacheKey, response.clone());
    return response;
  } catch {
    controllers.forEach(controller => controller.abort());
    return Response.json({ error: 'Nearby court names and addresses are not available right now.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};

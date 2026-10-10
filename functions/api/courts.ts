
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
  // Keep the blocking query focused on tennis features. Nearby roads and parks
  // are fetched separately after this response so they can't delay the results.
  const query = `[out:json][timeout:16];(nwr["leisure"="pitch"]["sport"~"(^|;)tennis(;|$)"](${bbox});nwr["leisure"="sports_centre"]["sport"~"(^|;)tennis(;|$)"](${bbox}););out center tags;`;
  const isVirginia = lat >= 36.5 && lat <= 39.5 && lon >= -83.7 && lon <= -75.2;
  const endpoints = isVirginia ? ['https://overpass.maprva.org/api/interpreter', ...globalEndpoints] : globalEndpoints;
  let lastStatus: number | undefined;
  const providerFailures: string[] = [];
  const fallbackController = new AbortController();
  const attempts = endpoints.map(async endpoint => {
    const attemptController = new AbortController();
    // Leave a few seconds beyond the 16-second Overpass processing limit for
    // the provider to return its response.
    const timeout = setTimeout(() => attemptController.abort(), 20000);
    fallbackController.signal.addEventListener('abort', () => attemptController.abort(), { once: true });
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'OpenCourts.us/1.0 (public tennis court discovery)' }, body: new URLSearchParams({ data: query }), signal: attemptController.signal });
      if (!res.ok) {
        lastStatus = res.status;
        console.warn(`[OpenCourts] Court provider ${new URL(endpoint).host} returned ${res.status}`);
        providerFailures.push(`${new URL(endpoint).host}: HTTP ${res.status}`);
        throw new Error(`Court provider returned ${res.status}.`);
      }
      const data = await res.json() as { elements?: unknown[]; remark?: string };
      if (!Array.isArray(data.elements)) {
        const message = data.remark || 'invalid response from provider';
        providerFailures.push(`${new URL(endpoint).host}: ${message}`);
        throw new Error(message);
      }
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'request failed';
      if (!fallbackController.signal.aborted) {
        if (!providerFailures.some(failure => failure.startsWith(`${new URL(endpoint).host}:`))) providerFailures.push(`${new URL(endpoint).host}: ${attemptController.signal.aborted ? 'timed out' : message}`);
        console.warn(`[OpenCourts] Court provider ${new URL(endpoint).host} failed`, message);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });
  try {
    // Query all providers at once and use the first complete valid response.
    const data = await Promise.any(attempts);
    fallbackController.abort();
    const response = Response.json(data, { headers: { 'Cache-Control': 'public, max-age=1800', 'Access-Control-Allow-Origin': '*' } });
    if (cache) await cache.put(cacheKey, response.clone()); return response;
  } catch {
    fallbackController.abort();
    return Response.json({ error: 'Court data is temporarily unavailable.', upstreamStatus: lastStatus, diagnostic: providerFailures.join(' · ') }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } });
  }
};

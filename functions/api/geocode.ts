interface Env {}
export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url); const q = (url.searchParams.get('q') ?? '').trim();
  if (!q || q.length > 120) return Response.json({ error: 'Enter a city, state, or ZIP code.' }, { status: 400 });
  const key = new Request(`${url.origin}/api/geocode?q=${encodeURIComponent(q.toLowerCase())}`); const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = cache ? await cache.match(key) : undefined; if (cached) return cached;
  try {
    const upstream = new URL('https://nominatim.openstreetmap.org/search');
    upstream.search = new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'us', limit: '1', addressdetails: '0' }).toString();
    const response = await fetch(upstream, { headers: { 'Accept': 'application/json', 'User-Agent': 'OpenCourts.us/1.0 (https://opencourts.us; hello@opencourts.us)' }, signal: AbortSignal.timeout(12000) });
    if (response.status === 429) return Response.json({ error: 'Location search is busy.' }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
    if (!response.ok) return Response.json({ error: 'Location search is unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    const data: any[] = await response.json(); const result = data[0] ? { display_name: data[0].display_name, lat: data[0].lat, lon: data[0].lon } : null;
    const res = Response.json({ result }, { headers: { 'Cache-Control': result ? 'public, max-age=86400' : 'public, max-age=900' } });
    if (cache) await cache.put(key, res.clone()); return res;
  } catch { return Response.json({ error: 'Location search is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
};

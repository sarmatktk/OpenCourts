import { readEdgeCache, writeEdgeCache } from '../lib/edge-cache';
import { normalizeLocationQuery } from '../../src/zip-query';

interface Env {}
const stateNames: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
export function cityStateQuery(query: string): { city: string; state: string } | null {
  const parts = query.split(',').map(part => part.trim());
  const city = parts.length === 2 ? parts[0] : query.replace(/\s+[A-Za-z]{2}$/, '').trim();
  const state = parts.length === 2 ? parts[1] : query.slice(city.length).trim();
  if (!city || !/^[A-Za-z .'-]+$/.test(city) || !state) return null;
  const expectedState = stateNames[state.toUpperCase()] || state;
  if (!Object.values(stateNames).some(name => name.toLowerCase() === expectedState.toLowerCase())) return null;
  return { city: city.toLowerCase(), state: expectedState.toLowerCase() };
}
export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil }) => {
  const url = new URL(request.url); const input = (url.searchParams.get('q') ?? '').trim();
  const { query: q, zip, zipOnly, error } = normalizeLocationQuery(input);
  if (!q || q.length > 120) return Response.json({ error: 'Enter a city, state, or ZIP code.' }, { status: 400 });
  if (error) return Response.json({ error }, { status: 400 });
  const key = new Request(`${url.origin}/api/geocode?v=5&q=${encodeURIComponent(q.toLowerCase())}`); const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const cached = await readEdgeCache(cache, key); if (cached) return cached;
  try {
    const upstream = new URL('https://nominatim.openstreetmap.org/search');
    upstream.search = new URLSearchParams({ ...(zipOnly ? { postalcode: zip!, country: 'United States' } : { q }), format: 'jsonv2', countrycodes: 'us', limit: '5', addressdetails: '1' }).toString();
    const response = await fetch(upstream, { headers: { 'Accept': 'application/json', 'User-Agent': 'OpenCourts.us/1.0 (https://opencourts.us; hello@opencourts.us)' }, signal: AbortSignal.timeout(12000) });
    if (response.status === 429) return Response.json({ error: 'Location search is busy.' }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
    if (!response.ok) return Response.json({ error: 'Location search is unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    const data: any[] = await response.json();
    const houseNumber = !zipOnly ? /^(\d{1,6}[A-Za-z]?)\s+\S/.exec(q)?.[1] : undefined;
    const cityState = !zip && !houseNumber ? cityStateQuery(q) : null;
    const match = data.find(item => (!zip || item.address?.postcode === zip)
      && (!houseNumber || String(item.address?.house_number ?? '').toLowerCase() === houseNumber.toLowerCase())
      && (!cityState || (String(item.address?.state ?? '').toLowerCase() === cityState.state
        && [item.address?.city, item.address?.town, item.address?.village, item.address?.hamlet, item.address?.municipality]
          .some(name => String(name ?? '').toLowerCase() === cityState.city))));
    const result = match ? { display_name: match.display_name, lat: match.lat, lon: match.lon, postcode: match.address?.postcode } : null;
    const res = Response.json({ result }, { headers: { 'Cache-Control': result ? 'public, max-age=86400' : 'public, max-age=900' } });
    writeEdgeCache(cache, key, res, waitUntil); return res;
  } catch { return Response.json({ error: 'Location search is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
};

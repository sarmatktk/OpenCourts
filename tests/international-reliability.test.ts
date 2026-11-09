import { afterEach, describe, expect, it, vi } from 'vitest';
import { internationalCourts } from '../functions/lib/international-courts';
import { getCourts, internationalCountryCode } from '../src/services';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const element = { type: 'node', id: 42, lat: 40.42, lon: -3.7, tags: { leisure: 'pitch', sport: 'tennis', name: 'Public Tennis', access: 'yes' } };
const options = (origin: string, env: any = {}) => ({ lat: 40.4168, lon: -3.7038, country: 'es', origin, env });
function storage() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value), removeItem: (key: string) => entries.delete(key), clear: () => entries.clear() };
}

describe('international court reliability', () => {
  it('recognizes explicit country names globally while preserving US state searches', () => {
    expect(internationalCountryCode('Dubai, United Arab Emirates')).toBe('ae');
    expect(internationalCountryCode('Cairo, Egypt')).toBe('eg');
    expect(internationalCountryCode('Fairfax, VA')).toBeUndefined();
    expect(internationalCountryCode('Atlanta, Georgia')).toBeUndefined();
    expect(internationalCountryCode('Portland, OR')).toBeUndefined();
  });
  it('uses shared persistent results across edge locations without calling providers', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const cache = { get: vi.fn(async () => JSON.stringify({ savedAt: Date.now(), data: { elements: [element] } })), put: vi.fn() };
    const response = await internationalCourts(options('https://shared-cache.test', { INTERNATIONAL_COURTS_CACHE: cache }));
    expect(response.status).toBe(200);
    expect((await response.json() as any).elements[0].id).toBe(42);
    expect(cache.get).toHaveBeenCalledWith('v1:es:40.42:-3.70');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serves labeled saved results during a full provider outage', async () => {
    const savedAt = Date.now() - 7 * 60 * 60_000;
    const cache = { get: async () => JSON.stringify({ savedAt, data: { elements: [element] } }), put: vi.fn() };
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    const response = await internationalCourts(options('https://stale-cache.test', { INTERNATIONAL_COURTS_CACHE: cache }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ stale: true, dataUpdatedAt: new Date(savedAt).toISOString(), elements: [{ id: 42 }] });
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('does not serve expired or damaged persistent data as valid results', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    const cache = { get: async () => JSON.stringify({ savedAt: Date.now() - 31 * 24 * 60 * 60_000, data: { elements: [element] } }), put: vi.fn() };
    const response = await internationalCourts(options('https://expired-cache.test', { INTERNATIONAL_COURTS_CACHE: cache }));
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
  });

  it('coalesces simultaneous nearby searches and uses Geoapify before public services', async () => {
    let resolveProvider!: (value: Response) => void;
    const provider = new Promise<Response>(resolve => { resolveProvider = resolve; });
    const fetchMock = vi.fn(() => provider); vi.stubGlobal('fetch', fetchMock);
    const cache = { get: async () => null, put: vi.fn(async () => {}) };
    const first = internationalCourts(options('https://coalesced.test', { GEOAPIFY_API_KEY: 'test', INTERNATIONAL_COURTS_CACHE: cache }));
    const second = internationalCourts({ ...options('https://coalesced.test', { GEOAPIFY_API_KEY: 'test', INTERNATIONAL_COURTS_CACHE: cache }), lat: 40.417, lon: -3.704 });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    resolveProvider(Response.json({ features: [{ geometry: { type: 'Point', coordinates: [-3.7, 40.42] }, properties: { name: 'Tennis court' } }] }));
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cache.put).toHaveBeenCalledTimes(1);
  });

  it('keeps browser-saved international courts when refreshing fails, with an explicit stale flag', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://browser-cache.test' } });
    vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('localStorage', storage());
    const fetchMock = vi.fn(async () => Response.json({ elements: [element] })); vi.stubGlobal('fetch', fetchMock);
    const first = await getCourts(40.4168, -3.7038, undefined, 'Madrid, Spain', undefined, 'es');
    expect(first).toHaveLength(1);
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 7 * 60 * 60_000);
    fetchMock.mockImplementation(async () => new Response('', { status: 503 }));
    const fallback = await getCourts(40.4168, -3.7038, undefined, 'Madrid, Spain', undefined, 'es');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fallback[0]).toMatchObject({ id: first[0].id, dataStale: true });
  });

  it('serves stale data immediately while a background refresh updates persistent storage', async () => {
    let saved = JSON.stringify({ savedAt: Date.now() - 7 * 60 * 60_000, data: { elements: [element] } });
    const cache = { get: async () => saved, put: vi.fn(async (_key: string, value: string) => { saved = value; }) };
    let resolveProvider!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { resolveProvider = resolve; })));
    const background: Promise<unknown>[] = [];
    const config = { ...options('https://background-cache.test', { GEOAPIFY_API_KEY: 'test', INTERNATIONAL_COURTS_CACHE: cache }), waitUntil: (promise: Promise<unknown>) => { background.push(promise); } };
    const response = await internationalCourts(config);
    expect((await response.json() as any).stale).toBe(true);
    resolveProvider(Response.json({ features: [{ geometry: { type: 'Point', coordinates: [-3.7, 40.42] }, properties: { name: 'Tennis' } }] }));
    await Promise.all(background);
    expect(cache.put).toHaveBeenCalledOnce();
    expect((await (await internationalCourts(config)).json() as any).stale).toBe(false);
  });

  it('does not let a persistent-cache outage break a bundled region', async () => {
    const cache = { get: async () => { throw new Error('KV unavailable'); }, put: async () => { throw new Error('KV unavailable'); } };
    const response = await internationalCourts({ lat: 35.6768601, lon: 139.7638947, country: 'jp', origin: 'https://kv-outage.test', env: { INTERNATIONAL_COURTS_CACHE: cache } });
    expect(response.status).toBe(200);
    expect((await response.json() as any).catalog.region).toBe('Tokyo');
  });

  it('backs off repeated failed searches instead of hammering public providers', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 503 })); vi.stubGlobal('fetch', fetchMock);
    const config = options('https://cooldown-test.test');
    expect((await internationalCourts(config)).status).toBe(503);
    const attempts = fetchMock.mock.calls.length;
    expect(attempts).toBe(3);
    expect((await internationalCourts(config)).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(attempts);
  });

  it('does not persist an empty provider result as a usable outage fallback', async () => {
    const cache = { get: async () => null, put: vi.fn() };
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ elements: [] })));
    const response = await internationalCourts(options('https://empty-results-test.test', { INTERNATIONAL_COURTS_CACHE: cache }));
    expect(response.status).toBe(200);
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('falls back after a Geoapify quota failure without exposing the provider key', async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => String(url).includes('geoapify') ? new Response('', { status: 429 }) : Response.json({ elements: [element] }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await internationalCourts(options('https://quota-test.test', { GEOAPIFY_API_KEY: 'do-not-expose-this-key' }));
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('OpenStreetMap live providers');
    expect(text).not.toContain('do-not-expose-this-key');
  });

  it('ignores malformed persistent cache contents and still returns working provider data', async () => {
    const cache = { get: async () => '{invalid json', put: vi.fn(async () => {}) };
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ features: [{ geometry: { type: 'Point', coordinates: [-3.7,40.42] }, properties: { name: 'Tennis' } }] })));
    expect((await internationalCourts(options('https://malformed-cache-test.test', { GEOAPIFY_API_KEY: 'test', INTERNATIONAL_COURTS_CACHE: cache }))).status).toBe(200);
  });

  it('does not replace an aborted search with old saved results', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://aborted-browser-test.test' } });
    vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('localStorage', storage());
    const fetchMock = vi.fn(async () => Response.json({ elements: [element] })); vi.stubGlobal('fetch', fetchMock);
    await getCourts(40.4168,-3.7038,undefined,'Madrid, Spain',undefined,'es');
    vi.useFakeTimers(); vi.setSystemTime(Date.now()+7*3600_000);
    const controller = new AbortController(); controller.abort();
    fetchMock.mockRejectedValue(new DOMException('Search aborted','AbortError'));
    await expect(getCourts(40.4168,-3.7038,controller.signal,'Madrid, Spain',undefined,'es')).rejects.toMatchObject({name:'AbortError'});
  });
});

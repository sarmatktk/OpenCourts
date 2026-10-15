import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet as geocode } from '../functions/api/geocode';
import { onRequestGet as suggest } from '../functions/api/suggest';
import { normalizeLocationQuery, ZIP_FORMAT_ERROR } from '../src/zip-query';
import { findPlace } from '../src/services';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const context = (path: string) => ({ request: new Request(`https://opencourts.us${path}`), waitUntil: () => undefined }) as unknown as Parameters<typeof geocode>[0];

describe('ZIP lookup', () => {
  it('does not reuse a browser-cached wrong ZIP result', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://opencourts.us' } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ result: {
      display_name: 'Dallas, Texas 75201', lat: '32.77', lon: '-96.79', postcode: '75201',
    } }));
    await expect(findPlace(' 20127 ')).rejects.toThrow('find that place');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).searchParams.get('v')).toBe('6');
    expect(options).toMatchObject({ cache: 'no-store' });
  });
  it('normalizes surrounding spaces and ZIP+4 but rejects malformed ZIP-only input', () => {
    expect(normalizeLocationQuery('  20127  ')).toMatchObject({ query: '20127', zip: '20127', error: null });
    expect(normalizeLocationQuery(' 20127-1234 ')).toMatchObject({ query: '20127', zip: '20127', error: null });
    expect(normalizeLocationQuery('201271234')).toMatchObject({ query: '20127', zip: '20127', error: null });
    expect(normalizeLocationQuery(' 123 Main St, Fairfax VA 22030-1234 ')).toMatchObject({ query: '123 Main St, Fairfax VA 22030', zip: '22030', zipOnly: false, error: null });
    for (const input of ['2012', '201270', '20127-', '20 127', '20127-12']) {
      expect(normalizeLocationQuery(input).error).toBe(ZIP_FORMAT_ERROR);
    }
    expect(normalizeLocationQuery('123 Main Street')).toMatchObject({ query: '123 Main Street', error: null });
  });

  it('reports malformed ZIPs before calling the geocoder', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const response = await geocode(context('/api/geocode?q=%202012%20'));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(ZIP_FORMAT_ERROR);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an unrelated geocoder result for an unmatched ZIP', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([
      { display_name: 'Dallas, Texas', lat: '32.77', lon: '-96.79', address: { postcode: '75201' } },
    ]));
    const response = await geocode(context('/api/geocode?q=20127'));
    expect((await response.json()).result).toBeNull();
    const upstream = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstream.searchParams.get('postalcode')).toBe('20127');
    expect(upstream.searchParams.has('q')).toBe(false);
  });

  it('normalizes a ZIP+4 search before geocoding', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([
      { display_name: 'Example, Virginia 20127', lat: '38.9', lon: '-77.2', address: { postcode: '20127' } },
    ]));
    const response = await geocode(context('/api/geocode?q=%2020127-1234%20'));
    expect((await response.json()).result.display_name).toContain('20127');
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('postalcode')).toBe('20127');
  });

  it('rejects an address result when its house number or ZIP differs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([
      { display_name: 'Dallas, Texas 75201', lat: '32.77', lon: '-96.79', address: { house_number: '123', postcode: '75201' } },
      { display_name: 'Fairfax, Virginia 22030', lat: '38.85', lon: '-77.3', address: { house_number: '125', postcode: '22030' } },
    ]));
    const response = await geocode(context('/api/geocode?q=123%20Main%20St%2C%20Fairfax%20VA%2022030'));
    expect((await response.json()).result).toBeNull();
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('q')).toContain('22030');
  });

  it('accepts an address only when its house number and ZIP match', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([
      { display_name: '123 Main St, Fairfax, Virginia 22030', lat: '38.85', lon: '-77.3', address: { house_number: '123', postcode: '22030' } },
    ]));
    const response = await geocode(context('/api/geocode?q=123%20Main%20St%2C%20Fairfax%20VA%2022030-1234'));
    expect((await response.json()).result.display_name).toContain('Fairfax');
  });

  it('accepts street plus ZIP only in that ZIP and checks city plus state', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json([
      { display_name: 'Main Street, Dallas 75201', lat: '32.77', lon: '-96.79', address: { road: 'Main Street', postcode: '75201' } },
      { display_name: 'Main Street, Fairfax 22030', lat: '38.85', lon: '-77.3', address: { road: 'Main Street', postcode: '22030' } },
    ])).mockResolvedValueOnce(Response.json([
      { display_name: 'Fairfax, Texas', lat: '31', lon: '-97', address: { city: 'Fairfax', state: 'Texas' } },
      { display_name: 'Fairfax, Virginia', lat: '38.85', lon: '-77.3', address: { city: 'Fairfax', state: 'Virginia' } },
    ]));
    const street = await geocode(context('/api/geocode?q=Main%20Street%2C%2022030'));
    expect((await street.json()).result.display_name).toContain('22030');
    const city = await geocode(context('/api/geocode?q=Fairfax%2C%20VA'));
    expect((await city.json()).result.display_name).toBe('Fairfax, Virginia');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('filters city-state autocomplete suggestions to the requested place', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ features: [
      { geometry: { coordinates: [-96.79, 32.77] }, properties: { name: 'Fairfax', city: 'Fairfax', state: 'Texas' } },
      { geometry: { coordinates: [-77.3, 38.85] }, properties: { name: 'Fairfax', city: 'Fairfax', state: 'Virginia' } },
    ] }));
    const response = await suggest(context('/api/suggest?q=Fairfax%2C%20VA'));
    const suggestions = (await response.json()).suggestions;
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].label).toContain('Virginia');
  });

  it('accepts only an exact ZIP and filters unrelated suggestions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json([
      { display_name: 'Somewhere, Virginia 20128', lat: '38.8', lon: '-77.3', address: { postcode: '20128' } },
      { display_name: 'Somewhere, Virginia 20127', lat: '38.9', lon: '-77.2', address: { postcode: '20127' } },
    ])).mockResolvedValueOnce(Response.json({ features: [
      { geometry: { coordinates: [-96.79, 32.77] }, properties: { name: 'Dallas', postcode: '75201' } },
      { geometry: { coordinates: [-77.2, 38.9] }, properties: { name: 'Somewhere', postcode: '20127' } },
    ] }));
    const response = await geocode(context('/api/geocode?q=20127'));
    expect((await response.json()).result.display_name).toContain('20127');
    const suggestions = await suggest(context('/api/suggest?q=20127'));
    expect((await suggestions.json()).suggestions).toHaveLength(1);
  });
});

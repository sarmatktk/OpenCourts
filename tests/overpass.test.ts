import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet as getCourts } from '../functions/api/courts';
import { onRequestGet as getCourtContext, onRequestPost as postCourtContext } from '../functions/api/court-context';
import { onRequestPost as getRain } from '../functions/api/rain';
import { onRequestGet as getWeather } from '../functions/api/weather';
import { queryOverpass } from '../functions/lib/overpass';

afterEach(() => vi.unstubAllGlobals());

describe('Overpass requests', () => {
  it('returns 400 when the court lookup has no coordinates', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await getCourts({ request: new Request('https://opencourts.us/api/courts') } as any);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates court coordinates before calling the court-context provider', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await postCourtContext({ request: new Request('https://opencourts.us/api/court-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courts: [{ lat: 38.8, lon: -77 }, { lat: 91, lon: -77 }] }) }) } as any);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queries context around only the supplied courts', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(Response.json({ elements: [{ type: 'node', id: 3, lat: 38.8, lon: -77, tags: { leisure: 'park', name: 'Nearby Park' } }] })));
    vi.stubGlobal('fetch', fetchMock);
    const response = await postCourtContext({ request: new Request('https://opencourts.us/api/court-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courts: [{ lat: 38.8, lon: -77 }, { lat: 38.81, lon: -77.01 }] }) }) } as any);
    expect(response.status).toBe(200);
    expect((await response.json() as any).elements[0].tags.name).toBe('Nearby Park');
    expect(String(fetchMock.mock.calls[0][0])).toContain('overpass.maprva.org/api/interpreter');
    const query = new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body)).get('data') || '';
    expect(query).toContain('around:500,38.80000,-77.00000');
    expect(query).toContain('around:500,38.81000,-77.01000');
  });

  it('limits nearby-context requests to 24 courts', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const courts = Array.from({ length: 25 }, (_, index) => ({ lat: 38 + index / 1000, lon: -77 }));
    const response = await postCourtContext({ request: new Request('https://opencourts.us/api/court-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courts }) }) } as any);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queries one set of named features per court and requests geometry', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json({ elements: [{ type: 'way', id: 4, tags: { name: 'Park' } }] })));
    vi.stubGlobal('fetch', fetchMock);
    const response = await postCourtContext({ request: new Request('https://opencourts.us/api/court-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courts: [{ lat: 38.8, lon: -77 }, { lat: 38.81, lon: -77.01 }] }) }) } as any);
    expect(response.status).toBe(200);
    const query = new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body)).get('data') || '';
    expect((query.match(/around:500/g) || [])).toHaveLength(2);
    expect(query).toContain('out geom;');
  });

  it('includes provider diagnostics when every Virginia context provider fails', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('Unavailable', { status: 503 })));
    vi.stubGlobal('fetch', fetchMock);
    const response = await postCourtContext({ request: new Request('https://opencourts.us/api/court-context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courts: [{ lat: 37.54, lon: -77.44 }] }) }) } as any);
    expect(response.status).toBe(503);
    const data = await response.json() as { diagnostic?: string };
    expect(data.diagnostic).toContain('overpass.maprva.org');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('rejects missing weather coordinates instead of treating them as zero', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await getWeather({ request: new Request('https://opencourts.us/api/weather') } as any);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed rain request JSON', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await getRain({ request: new Request('https://opencourts.us/api/rain', { method: 'POST', body: '{', headers: { 'Content-Type': 'application/json' } }) } as any);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses at most two providers at once and stops after a complete result', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/one')) return Promise.resolve(Response.json({ elements: [{ id: 1 }] }));
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve(new Response('Unavailable', { status: 503 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await queryOverpass(['https://test.invalid/one', 'https://test.invalid/two', 'https://test.invalid/three'], 'out body;', 500);
    expect(result.elements).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('tries the next provider pair when both current providers fail', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input).endsWith('/three')) return Promise.resolve(Response.json({ elements: [] }));
      return Promise.resolve(new Response('Unavailable', { status: 503 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await queryOverpass(['https://test.invalid/one', 'https://test.invalid/two', 'https://test.invalid/three'], 'out body;', 500);
    expect(result.elements).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects partial Overpass responses that include a timeout remark', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json({ elements: [], remark: 'runtime error: query timed out' }))));
    await expect(queryOverpass(['https://test.invalid/one'], 'out body;', 500)).rejects.toThrow(/All Overpass providers failed/);
  });
});

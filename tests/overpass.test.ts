import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet as getCourts } from '../functions/api/courts';
import { onRequestGet as getCourtContext } from '../functions/api/court-context';
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

  it('validates coordinates before calling the court-context provider', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await getCourtContext({ request: new Request('https://opencourts.us/api/court-context?lat=&lon=-77') } as any);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
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

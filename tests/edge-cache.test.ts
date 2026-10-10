import { afterEach, describe, expect, it, vi } from 'vitest';
import { readEdgeCache, writeEdgeCache } from '../functions/lib/edge-cache';

afterEach(() => vi.restoreAllMocks());

describe('optional edge cache', () => {
  it('treats cache read failures as misses', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cache = { match: vi.fn().mockRejectedValue(new Error('cache unavailable')) } as unknown as Cache;
    expect(await readEdgeCache(cache, new Request('https://opencourts.us/api/courts'))).toBeUndefined();
  });

  it('schedules writes in the background and contains write failures', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cache = { put: vi.fn().mockRejectedValue(new Error('cache unavailable')) } as unknown as Cache;
    let pending: Promise<unknown> | undefined;
    writeEdgeCache(cache, new Request('https://opencourts.us/api/courts'), Response.json({ elements: [] }), promise => { pending = promise; });
    await pending;
    expect(cache.put).toHaveBeenCalledOnce();
  });
});

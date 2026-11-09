import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapGeoapifyCourts, queryGeoapifyCourts } from '../functions/lib/geoapify-courts';
import { normalizeCourt } from '../src/services';

afterEach(() => vi.unstubAllGlobals());
const feature = (properties: any) => ({ geometry: { type: 'Point', coordinates: [-3.7, 40.4] }, properties });

describe('international Geoapify adapter', () => {
  it.each(['Tennis courts', 'Club de Tenis', 'Quadra de Tênis', 'テニスコート', '테니스장', '网球场', '網球場', 'Теннис', 'ملعب تنس', 'γήπεδο τένις'])('recognizes tennis names in %s', name => {
    expect(mapGeoapifyCourts({ features: [feature({ name })] })).toHaveLength(1);
  });
  it('uses supported sport categories with tennis name and proximity filters', async () => {
    const fetchMock = vi.fn(async () => Response.json({ features: [feature({ name: 'Tennis courts' })] }));
    vi.stubGlobal('fetch', fetchMock);
    const data = await queryGeoapifyCourts(40.4, -3.7, 'test-key');
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('categories')).toBe('sport.pitch,sport.sports_centre,sport.sports_hall');
    expect(url.searchParams.get('name')).toBe('tennis');
    expect(url.searchParams.get('filter')).toBe('circle:-3.7,40.4,15000');
    expect(data.elements).toHaveLength(1);
  });

  it('preserves original OSM identity, access, fees, and lighting when supplied', () => {
    const [element] = mapGeoapifyCourts({ features: [feature({ name: 'Local Tennis', datasource: { raw: { osm_type: 'w', osm_id: 42, sport: 'tennis', access: 'members', fee: 'yes', lit: 'yes' } } })] });
    expect(element).toMatchObject({ type: 'way', id: 42, tags: { access: 'members', fee: 'yes', lit: 'yes' } });
    expect(normalizeCourt(element).access).toBe('restricted');
  });

  it('preserves provider restriction categories and keeps unspecified access unknown', () => {
    const [privateCourt, paidCourt, unknown] = mapGeoapifyCourts({ features: [
      feature({ name: 'Tennis A', categories: ['sport.pitch', 'access_limited.private'] }),
      feature({ name: 'Tennis B', categories: ['sport.pitch', 'fee'] }),
      feature({ name: 'Tennis C', place_id: 'stable-id' }),
    ] });
    expect(normalizeCourt(privateCourt).access).toBe('restricted');
    expect(normalizeCourt(paidCourt).access).toBe('restricted');
    expect(normalizeCourt(unknown).access).toBe('unknown');
    expect(normalizeCourt(unknown).sourceUrl).toContain('openstreetmap.org/?mlat=');
  });

  it('rejects non-tennis facilities, street-name matches, and invalid coordinates', () => {
    expect(mapGeoapifyCourts({ features: [feature({ name: 'Football court', address_line1: 'Tennis Street' }), { geometry: { type: 'Point', coordinates: [999, 40] }, properties: { name: 'Tennis' } }] })).toEqual([]);
  });

  it('reports provider HTTP failures without exposing the key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    await expect(queryGeoapifyCourts(40.4, -3.7, 'secret-key')).rejects.toThrow('Geoapify court lookup failed (HTTP 401)');
  });
});

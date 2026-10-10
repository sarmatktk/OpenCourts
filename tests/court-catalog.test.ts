import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet as getCourts } from '../functions/api/courts';
import { findCourtsInCatalog, type D1Database } from '../functions/lib/court-catalog';
import { normalizeCourtRecords, parseGeoJSONFeature, parseOverpassResponse, writeCatalogFiles } from '../scripts/import-court-catalog.mjs';
import { enrichCourtCatalog } from '../scripts/enrich-court-catalog.mjs';

const temporaryDirectories: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(temporaryDirectories.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

describe('D1 court catalog', () => {
  it('returns normalized Overpass-shaped results from an indexed bounding-box query', async () => {
    const all = vi.fn(async () => ({ success: true, results: [
      { osm_type: 'way', osm_id: 42, lat: 40.72, lon: -73.99, tags_json: '{"leisure":"pitch","sport":"tennis"}' },
    ] }));
    const bind = vi.fn(() => ({ all }));
    const prepare = vi.fn(() => ({ bind }));
    const db = { prepare } as unknown as D1Database;
    const courts = await findCourtsInCatalog(db, { south: 40.7, west: -74.1, north: 40.8, east: -73.9 });

    expect(prepare.mock.calls[0][0]).toContain('lat BETWEEN ?1 AND ?2 AND lon BETWEEN ?3 AND ?4');
    expect(bind).toHaveBeenCalledWith(40.7, 40.8, -74.1, -73.9);
    expect(courts).toEqual([{ type: 'way', id: 42, lat: 40.72, lon: -73.99, tags: { leisure: 'pitch', sport: 'tennis' } }]);
  });

  it('uses D1 for /api/courts when the binding is configured', async () => {
    const all = vi.fn(async () => ({ success: true, results: [
      { osm_type: 'node', osm_id: 8, lat: 40.72, lon: -73.99, tags_json: '{"leisure":"pitch","sport":"tennis"}' },
    ] }));
    const db = { prepare: vi.fn(() => ({ bind: vi.fn(() => ({ all })) })) } as unknown as D1Database;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await getCourts({
      request: new Request('https://opencourts.us/api/courts?lat=40.7292&lon=-73.995'),
      env: { COURTS_DB: db }, waitUntil() {},
    } as any);

    expect(response.status).toBe(200);
    expect((await response.json()).elements).toEqual([{ type: 'node', id: 8, lat: 40.72, lon: -73.99, tags: { leisure: 'pitch', sport: 'tennis' } }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to Overpass when D1 has no courts in the requested area', async () => {
    const all = vi.fn(async () => ({ success: true, results: [] }));
    const db = { prepare: vi.fn(() => ({ bind: vi.fn(() => ({ all })) })) } as unknown as D1Database;
    const fallbackElements = [{ type: 'way', id: 99, lat: 51.5, lon: -0.12, tags: { sport: 'tennis' } }];
    const fetchMock = vi.fn(async () => Response.json({ elements: fallbackElements }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await getCourts({
      request: new Request('https://opencourts.us/api/courts?lat=51.5&lon=-0.12'),
      env: { COURTS_DB: db }, waitUntil() {},
    } as any);

    expect(response.status).toBe(200);
    expect((await response.json()).elements).toEqual(fallbackElements);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('falls back to Overpass when the D1 catalog query fails', async () => {
    const all = vi.fn(async () => { throw new Error('D1 unavailable'); });
    const db = { prepare: vi.fn(() => ({ bind: vi.fn(() => ({ all })) })) } as unknown as D1Database;
    const fallbackElements = [{ type: 'node', id: 101, lat: 51.5, lon: -0.12, tags: { sport: 'tennis' } }];
    const fetchMock = vi.fn(async () => Response.json({ elements: fallbackElements }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await getCourts({
      request: new Request('https://opencourts.us/api/courts?lat=51.5&lon=-0.12'),
      env: { COURTS_DB: db }, waitUntil() {},
    } as any);

    expect(response.status).toBe(200);
    expect((await response.json()).elements).toEqual(fallbackElements);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('builds a replace-safe SQL import from Overpass JSON and excludes non-tennis facilities', async () => {
    const dir = await mkdtemp(path.join(process.cwd(), '.wrangler', 'opencourts-catalog-'));
    temporaryDirectories.push(dir);
    const output = path.join(dir, 'sql');
    const data = { elements: [
      { type: 'way', id: 17, center: { lat: 40.7, lon: -74 }, tags: { leisure: 'pitch', sport: 'tennis;basketball', name: "O'Brien Courts" } },
      { type: 'node', id: 18, lat: 40.7, lon: -74, tags: { leisure: 'pitch', sport: 'basketball' } },
    ] };
    const records = normalizeCourtRecords(parseOverpassResponse(data));
    const files = await writeCatalogFiles(records, output);
    const insert = await readFile(path.join(output, '0001-courts.sql'), 'utf8');
    const finalize = await readFile(path.join(output, '999-publish.sql'), 'utf8');

    expect(records).toHaveLength(1);
    expect(files.chunks).toBe(1);
    expect(insert).toContain("O''Brien Courts");
    expect(insert).not.toContain('18, 40.7');
    expect(finalize).toContain('INSERT OR REPLACE INTO tennis_courts');
    expect(finalize).toContain('DELETE FROM tennis_courts WHERE NOT EXISTS');
  });

  it('reads OSM type and id attributes from GeoJSON and derives a court center', () => {
    const record = parseGeoJSONFeature({
      type: 'Feature', id: 'way/31',
      properties: { '@type': 'way', '@id': 31, leisure: 'pitch', sport: 'tennis' },
      geometry: { type: 'Polygon', coordinates: [[[-74, 40], [-73.998, 40], [-73.998, 40.002], [-74, 40.002], [-74, 40]]] },
    });
    const court = normalizeCourtRecords([record])[0];
    expect(court).toMatchObject({ type: 'way', id: 31, tags: { leisure: 'pitch', sport: 'tennis' } });
    expect(court.lat).toBeCloseTo(40.001, 8);
    expect(court.lon).toBeCloseTo(-73.999, 8);
  });

  it('precomputes nearby park and street names from nationwide OSM extracts', async () => {
    const dir = await mkdtemp(path.join(process.cwd(), '.wrangler', 'opencourts-context-'));
    temporaryDirectories.push(dir);
    const input = path.join(dir, 'region.geojsonseq');
    const output = path.join(dir, 'courts.geojsonseq');
    const features = [
      { type: 'Feature', id: 'way/1', properties: { '@type': 'way', '@id': 1, leisure: 'pitch', sport: 'tennis', name: 'Tennis courts' }, geometry: { type: 'Polygon', coordinates: [[[-77.3065, 38.8461], [-77.3063, 38.8461], [-77.3063, 38.8463], [-77.3065, 38.8463], [-77.3065, 38.8461]]] } },
      { type: 'Feature', id: 'way/2', properties: { '@type': 'way', '@id': 2, highway: 'residential', name: 'Cedar Lane' }, geometry: { type: 'LineString', coordinates: [[-77.31, 38.846], [-77.30, 38.846]] } },
      { type: 'Feature', id: 'way/3', properties: { '@type': 'way', '@id': 3, leisure: 'park', name: 'Greenbriar Park' }, geometry: { type: 'Polygon', coordinates: [[[-77.32, 38.84], [-77.29, 38.84], [-77.29, 38.86], [-77.32, 38.86], [-77.32, 38.84]]] } },
    ];
    await writeFile(input, features.map(feature => `\u001e${JSON.stringify(feature)}\n`).join(''));
    const counts = await enrichCourtCatalog(input, output);
    const result = (await readFile(output, 'utf8')).trim().replace(/^\u001e/, '');
    const enriched = JSON.parse(result);
    expect(counts).toMatchObject({ courts: 1, withPlace: 1, withRoad: 1 });
    expect(enriched.properties['opencourts:nearby_place']).toBe('Greenbriar Park');
    expect(enriched.properties['opencourts:nearby_street']).toBe('Cedar Lane');
    expect(enriched.properties['opencourts:context_version']).toBe('1');
  });
});

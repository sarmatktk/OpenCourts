export interface D1Result<T> {
  results?: T[];
  success?: boolean;
  error?: string;
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
}

interface CatalogRow {
  osm_type: string;
  osm_id: number;
  lat: number;
  lon: number;
  tags_json: string;
}

export interface OverpassElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export async function findCourtsInCatalog(
  db: D1Database,
  bounds: { south: number; west: number; north: number; east: number },
): Promise<OverpassElement[]> {
  const result = await db.prepare(
    `SELECT osm_type, osm_id, lat, lon, tags_json
       FROM tennis_courts
      WHERE lat BETWEEN ?1 AND ?2 AND lon BETWEEN ?3 AND ?4
      ORDER BY lat, lon
      LIMIT 5000`,
  ).bind(bounds.south, bounds.north, bounds.west, bounds.east).all<CatalogRow>();

  if (result.success === false) throw new Error(result.error || 'D1 court catalog query failed.');
  const elements: OverpassElement[] = [];
  for (const row of result.results ?? []) {
    let tags: unknown;
    try { tags = JSON.parse(row.tags_json); } catch { continue; }
    if (typeof tags !== 'object' || tags === null || Array.isArray(tags)) continue;
    elements.push({ type: row.osm_type, id: row.osm_id, lat: row.lat, lon: row.lon, tags: tags as Record<string, string> });
  }
  return elements;
}

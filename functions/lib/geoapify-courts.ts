/** International-only adapter. Do not infer public access from a tennis name. */
type CourtElement = { type: string; id: string | number; lat: number; lon: number; tags: Record<string, string>; sourceUrl?: string };
export function mapGeoapifyCourts(data: any) {
  const features: any[] = Array.isArray(data.features) ? data.features : [];
  return features.flatMap<CourtElement>((feature: any) => {
    const p = feature.properties ?? {};
    const raw = p.datasource?.raw ?? {};
    const [lon, lat] = feature.geometry?.type === 'Point' ? feature.geometry.coordinates ?? [] : [];
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return [];
    const name = p.name || raw.name || '';
    const mappedTennis = String(raw.sport || '').split(';').includes('tennis');
    const normalizedName = String(name).normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFC');
    if (!mappedTennis && (/table[\s_-]*tennis/i.test(normalizedName) || !/tennis|tenis|テニス|网球|網球|테니스|теннис|теніс|تنس|τενις/iu.test(normalizedName))) return [];
    const tags: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) if (['string', 'number', 'boolean'].includes(typeof value)) {
      tags[key] = typeof value === 'boolean' ? value ? 'yes' : 'no' : String(value);
    }
    for (const key of ['access', 'fee', 'membership', 'private', 'lit', 'surface', 'indoor', 'covered']) {
      if (p[key] !== undefined && p[key] !== null) tags[key] = typeof p[key] === 'boolean' ? p[key] ? 'yes' : 'no' : String(p[key]);
    }
    const categories = Array.isArray(p.categories) ? p.categories : [];
    if (categories.some((category: string) => category === 'no_access' || category.startsWith('access_limited'))) tags.access = 'private';
    else if (!tags.access && categories.includes('access.yes')) tags.access = 'public';
    if (categories.includes('fee')) tags.fee = 'yes';
    tags.leisure = tags.leisure === 'sports_centre' ? 'sports_centre' : 'pitch';
    tags.sport = 'tennis';
    tags.name = name || 'Tennis courts';
    if (!tags['addr:full']) tags['addr:full'] = [p.address_line1, p.address_line2].filter(Boolean).join(', ');
    const type = ({ n: 'node', w: 'way', r: 'relation' } as Record<string, string>)[raw.osm_type] || raw.osm_type;
    const id = Number(raw.osm_id);
    if (['node', 'way', 'relation'].includes(type) && Number.isSafeInteger(id) && id > 0) return [{ type, id, lat, lon, tags }];
    return [{ type: 'node', id: `geo-${p.place_id || `${lat},${lon}`}`, lat, lon, tags,
      sourceUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}` }];
  });
}

export async function queryGeoapifyCourts(lat: number, lon: number, key: string, country?: string) {
  const url = new URL('https://api.geoapify.com/v2/places');
  // Geoapify has no sport.tennis category. Restrict supported sports categories
  // by name, then validate the result's tennis evidence in the adapter.
  const localName: Record<string, string> = { es: 'tenis', mx: 'tenis', ar: 'tenis', cl: 'tenis', co: 'tenis', pt: 'ténis', br: 'tênis', jp: 'テニス', kr: '테니스', cn: '网球', tw: '網球', ru: 'теннис', ua: 'теніс', ae: 'تنس', sa: 'تنس', gr: 'τένις' };
  url.search = new URLSearchParams({ categories: 'sport.pitch,sport.sports_centre,sport.sports_hall', name: localName[country || ''] || 'tennis',
    filter: `circle:${lon},${lat},15000`, bias: `proximity:${lon},${lat}`, limit: '100', apiKey: key }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Geoapify court lookup failed (HTTP ${response.status})`);
  }
  const elements = mapGeoapifyCourts(await response.json());
  if (!elements.length) throw new Error('No tennis results from Geoapify');
  return { elements };
}

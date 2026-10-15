import type { Access, Court, DailyPlayWindows, Forecast, Lighting, Place, PlaceSuggestion, PlayWindow, RainAssessment, WeatherAlertData, WeatherData } from './types';
import { estimatedSunrise, estimatedSunset } from './sun';
import { normalizeLocationQuery } from './zip-query';

export function classifyLighting(tags: Record<string, string | undefined>): Lighting {
  if (tags.lit === 'yes' || tags.lighting === 'yes') return 'yes';
  if (tags.lit === 'no' || tags.lighting === 'no') return 'no';
  return 'unknown';
}
export function classifyAccess(tags: Record<string, string | undefined>): Access {
  if (['private', 'members', 'member', 'customers', 'customer', 'permit', 'no', 'fee'].includes(tags.access || '') || tags.fee === 'yes' || (Boolean(tags.membership) && !['no', 'none', 'open'].includes(tags.membership!)) || tags.private === 'yes') return 'restricted';
  if (tags.access === 'yes' || tags.access === 'permissive' || tags.access === 'public' || tags.leisure === 'park') return 'public';
  return 'unknown';
}
function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) { const rad = Math.PI / 180; const dLat = (a.lat-b.lat)*rad; const dLon = (a.lon-b.lon)*rad; const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2; return 3958.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)); }
function usefulLocality(locality: string) { const value = locality.trim(); return /^(?:your|my|current) location$|^near me$/i.test(value) ? '' : value; }
export function normalizeCourt(element: any, roads: any[] = [], locality = '', nearbyPlaces: any[] = []): Court {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat; const lon = element.lon ?? element.center?.lon;
  const addressLine = tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const cityLine = [tags['addr:city'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', ') || usefulLocality(locality);
  let address = addressLine ? [addressLine, cityLine].filter(Boolean).join(', ') : undefined;
  let addressApprox = false;
  const catalogRoad = tags['opencourts:nearby_street'];
  const catalogPlace = tags['opencourts:nearby_place'];
  if (!address && (catalogRoad || catalogPlace)) {
    address = `Near ${catalogRoad || catalogPlace}${cityLine ? `, ${cityLine}` : ''}`;
    addressApprox = true;
  }
  if (!address && Number.isFinite(lat) && Number.isFinite(lon)) {
    const nearby = roads.map(road => ({ road, lat: road.lat ?? road.center?.lat, lon: road.lon ?? road.center?.lon })).filter(r => r.road.tags?.name && Number.isFinite(r.lat) && Number.isFinite(r.lon)).map(r => ({ ...r, distance: milesBetween({ lat, lon }, r) })).sort((a, b) => a.distance - b.distance)[0];
    if (nearby && nearby.distance <= 0.12) { address = `Near ${nearby.road.tags.name}${cityLine ? `, ${cityLine}` : ''}`; addressApprox = true; }
  }
  const mappedName = tags.name || tags['name:en'];
  const genericMappedName = /^tennis courts?(?:\s+·\s+\d+)?$/i.test(mappedName || '');
  const numberedCourtName = /^(?:tennis\s+)?courts?\s*#?\s*\d+$/i.test(mappedName || '');
  const nearbyPlace = nearbyPlaces.map(place => ({ place, lat: place.lat ?? place.center?.lat, lon: place.lon ?? place.center?.lon })).filter(item => (item.place.tags?.name || item.place.tags?.['name:en']) && Number.isFinite(item.lat) && Number.isFinite(item.lon)).map(item => ({ ...item, distance: milesBetween({ lat, lon }, item) })).filter(item => item.distance <= 0.35).sort((a, b) => a.distance - b.distance)[0];
  const placeName = nearbyPlace?.place.tags?.name || nearbyPlace?.place.tags?.['name:en'];
  const placeLabel = nearbyPlace ? `${nearbyPlace.distance <= 0.05 ? 'At' : 'Near'} ${placeName}` : undefined;
  let name = mappedName || 'Tennis courts';
  let contextName: string | undefined;
  if (genericMappedName && catalogPlace) {
    name = 'Tennis courts';
    const distance = Number(tags['opencourts:nearby_place_miles']);
    contextName = `${Number.isFinite(distance) && distance <= 0.05 ? 'At' : 'Near'} ${catalogPlace}`;
  } else if (genericMappedName && catalogRoad) name = 'Tennis courts';
  else if (numberedCourtName && catalogPlace) {
    const distance = Number(tags['opencourts:nearby_place_miles']);
    contextName = `${Number.isFinite(distance) && distance <= 0.05 ? 'At' : 'Near'} ${catalogPlace}`;
  }
  else if (genericMappedName && nearbyPlace) {
    name = 'Tennis courts';
    contextName = placeLabel;
  }
  return { id: `osm-${element.type}-${element.id}`, name, lat, lon, lighting: classifyLighting(tags), access: classifyAccess(tags), surface: tags.surface, courts: Number(tags.count || tags['courts:count'] || tags.courts) || undefined, sheltered: tags.indoor === 'yes' || tags.covered === 'yes', address, addressApprox, contextName, contextCached: tags['opencourts:context_version'] === '1', sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}` };
}
export function distinguishCourtNames(courts: Court[]): Court[] {
  const groups = new Map<string, Court[]>();
  for (const court of courts) {
    const group = groups.get(court.name);
    if (group) group.push(court);
    else groups.set(court.name, [court]);
  }
  const rank = new Map<string, number>();
  for (const group of groups.values()) {
    [...group].sort((a, b) => a.lat - b.lat || a.lon - b.lon).forEach((court, index) => rank.set(court.id, index + 1));
  }
  const used = new Set<string>();
  return courts.map(court => {
    // Generic OSM labels aren't names. Don't make them look like real places by
    // appending an arbitrary result number; nearby context can provide a better label.
    if (/^tennis courts?(?:\s+·\s+\d+)?$/i.test(court.name)) {
      used.add(court.name);
      return court;
    }
    const duplicate = (groups.get(court.name)?.length ?? 0) > 1;
    let name = duplicate ? `${court.name} · ${rank.get(court.id)}` : court.name;
    let suffix = 2;
    while (used.has(name)) name = `${court.name} · Court ${suffix++}`;
    used.add(name);
    return { ...court, name };
  });
}
export function groupCourtsByVenue(courts: Court[]): Court[] {
  const groups: Court[][] = [];
  const venueFor = (court: Court) => court.contextName?.match(/^At\s+(.+)$/i)?.[1].trim().toLocaleLowerCase();
  const canGroup = (court: Court) => /^(?:tennis courts?(?:\s+·\s+\d+)?|court\s*#?\s*\d+(?:\s+·\s+\d+)?)$/i.test(court.name.trim()) && venueFor(court);

  for (const court of courts) {
    const venue = venueFor(court);
    if (!venue || !canGroup(court)) { groups.push([court]); continue; }
    const group = groups.find(members => {
      const first = members[0];
      if (venueFor(first) !== venue || !canGroup(first)) return false;
      if ((first.surface || '').trim().toLowerCase() !== (court.surface || '').trim().toLowerCase()) return false;
      if (first.lighting !== court.lighting || first.access !== court.access || first.sheltered !== court.sheltered) return false;
      const center = members.reduce((point, member) => ({ lat: point.lat + member.lat / members.length, lon: point.lon + member.lon / members.length }), { lat: 0, lon: 0 });
      return milesBetween(center, court) <= 0.15;
    });
    if (group) group.push(court); else groups.push([court]);
  }

  return groups.map(members => {
    if (members.length === 1) return members[0];
    const first = members[0];
    const venue = first.contextName!.replace(/^At\s+/i, '').trim();
    const multiCourtCounts = members.map(member => member.courts ?? 0).filter(count => count > 1);
    const courtsCount = multiCourtCounts.length
      ? Math.max(members.length, ...multiCourtCounts)
      : members.reduce((total, member) => total + (member.courts || 1), 0);
    const addresses = new Map<string, { count: number; approximate: boolean }>();
    for (const member of members) if (member.address) {
      const existing = addresses.get(member.address) || { count: 0, approximate: false };
      addresses.set(member.address, { count: existing.count + 1, approximate: existing.approximate || Boolean(member.addressApprox) });
    }
    const address = [...addresses.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    const center = members.reduce((point, member) => ({ lat: point.lat + member.lat / members.length, lon: point.lon + member.lon / members.length }), { lat: 0, lon: 0 });
    return {
      ...first,
      id: `venue-${first.id}`,
      name: venue,
      contextName: undefined,
      lat: center.lat,
      lon: center.lon,
      courts: courtsCount,
      address: address?.[0],
      addressApprox: address?.[1].approximate,
      contextCached: members.every(member => member.contextCached),
    };
  });
}
export function isLikelyMembersClub(court: Court, tags: Record<string, string | undefined> = {}): boolean {
  return court.access === 'restricted' || /\b(tennis|racquet|country|athletic)\s+clubs?\b|\bclub\s+(tennis|courts?)\b/i.test(court.name) || Boolean(tags.membership) || tags.fee === 'yes';
}
async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(fallbackMessage);
  try { return await response.json() as T; }
  catch { throw new Error(fallbackMessage); }
}
export async function findPlace(query: string, signal?: AbortSignal): Promise<Place> {
  const normalized = normalizeLocationQuery(query);
  if (normalized.error) throw new Error(normalized.error);
  query = normalized.query;
  const key = `opencourts-place-v5-${query.toLowerCase()}`;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const place = JSON.parse(saved) as Place;
      if (place && Number.isFinite(place.lat) && Number.isFinite(place.lon) && Math.abs(place.lat) <= 90 && Math.abs(place.lon) <= 180) return place;
    }
  } catch { /* storage can be disabled or contain stale data */ }
  const url = new URL('/api/geocode', window.location.origin); url.searchParams.set('q', query);
  const res = await fetch(url, { signal }); if (!res.ok) throw new Error(res.status === 429 ? 'Location search is busy. Please wait a moment and try again.' : 'Location search is unavailable. Try a city and state or ZIP code.');
  const data = await readApiJson<{ result?: { display_name?: string; lat?: string | number; lon?: string | number } | null }>(res, 'Location search is unavailable. Try a city and state or ZIP code.');
  const match = data.result;
  if (!match) throw new Error('We couldn’t find that place. Try a U.S. city, state, or ZIP code.');
  const lat = Number(match.lat); const lon = Number(match.lon);
  if (!match.display_name || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('We couldn’t find that place. Try a U.S. city, state, or ZIP code.');
  const place = { label: match.display_name, lat, lon };
  try { sessionStorage.setItem(key, JSON.stringify(place)); } catch { /* storage can be disabled */ }
  return place;
}
export async function getPlaceSuggestions(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const normalized = normalizeLocationQuery(query);
  if (normalized.error) return [];
  query = normalized.query;
  const url = new URL('/api/suggest', window.location.origin); url.searchParams.set('q', query);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Place suggestions are temporarily unavailable.');
  const data = await readApiJson<{ suggestions?: PlaceSuggestion[] }>(res, 'Place suggestions are temporarily unavailable.');
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}
type GeoPoint = { lat: number; lon: number };
function featureLines(feature: any): GeoPoint[][] {
  const lines: GeoPoint[][] = [];
  const add = (geometry: any[]) => {
    const points = geometry?.map(point => ({ lat: point.lat, lon: point.lon }))
      .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lon));
    if (points?.length) lines.push(points);
  };
  if (Array.isArray(feature.geometry)) add(feature.geometry);
  for (const member of feature.members ?? []) if (Array.isArray(member.geometry)) add(member.geometry);
  const lat = feature.lat ?? feature.center?.lat;
  const lon = feature.lon ?? feature.center?.lon;
  if (Number.isFinite(lat) && Number.isFinite(lon)) lines.push([{ lat, lon }]);
  return lines;
}

function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 4) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    const crosses = (a.lat > point.lat) !== (b.lat > point.lat)
      && point.lon < ((b.lon - a.lon) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lon;
    if (crosses) inside = !inside;
  }
  return inside;
}

function distanceToFeature(origin: GeoPoint, feature: any, isArea: boolean): number | undefined {
  const lines = featureLines(feature);
  let nearest = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    if (isArea && pointInPolygon(origin, line)) return 0;
    if (line.length === 1) nearest = Math.min(nearest, milesBetween(origin, line[0]));
    for (let i = 1; i < line.length; i++) {
      // Project a short local segment into miles before finding its nearest point.
      const scaleX = 69.0 * Math.cos(origin.lat * Math.PI / 180);
      const ax = (line[i - 1].lon - origin.lon) * scaleX;
      const ay = (line[i - 1].lat - origin.lat) * 69.0;
      const bx = (line[i].lon - origin.lon) * scaleX;
      const by = (line[i].lat - origin.lat) * 69.0;
      const dx = bx - ax; const dy = by - ay;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
      nearest = Math.min(nearest, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return Number.isFinite(nearest) ? nearest : undefined;
}

export function enrichNearbyCourtDetails(courts: Court[], elements: any[], locality: string): Court[] {
  const localityLabel = usefulLocality(locality);
  // Overpass returns full geometries. A way's center can be miles from the
  // actual road or park edge, which used to make valid nearby context disappear.
  const roads = elements.filter(item => item.tags?.highway && item.tags?.name);
  const places = elements.filter(item => item.tags?.name && (['park', 'recreation_ground'].includes(item.tags?.leisure) || ['school', 'college', 'university', 'community_centre', 'community_hall'].includes(item.tags?.amenity) || item.tags?.landuse === 'school'));
  return distinguishCourtNames(courts.map(court => {
    const nearestRoad = roads.map(feature => ({ feature, distance: distanceToFeature(court, feature, false) }))
      .filter((item): item is { feature: any; distance: number } => item.distance !== undefined && item.distance <= 0.35)
      .sort((a, b) => a.distance - b.distance)[0];
    let address = court.address;
    let addressApprox = court.addressApprox;
    if (!address && nearestRoad?.feature.tags?.name) {
      address = `Near ${nearestRoad.feature.tags.name}${localityLabel ? `, ${localityLabel}` : ''}`;
      addressApprox = true;
    }
    const nearestPlace = places.map(feature => ({ feature, distance: distanceToFeature(court, feature, true) }))
      .filter((item): item is { feature: any; distance: number } => item.distance !== undefined && item.distance <= 0.35)
      .sort((a, b) => a.distance - b.distance)[0];
    const genericName = /^tennis courts?(?:\s+·\s+\d+)?(?:\s+(?:at|near)\s+.*)?$/i.test(court.name);
    const numberedCourtName = /^(?:tennis\s+)?courts?\s*#?\s*\d+$/i.test(court.name);
    let name = genericName ? 'Tennis courts' : court.name;
    let contextName = court.contextName;
    const placeName = nearestPlace?.feature.tags.name || nearestPlace?.feature.tags['name:en'];
    if (!address && placeName) {
      address = `Near ${placeName}${localityLabel ? `, ${localityLabel}` : ''}`;
      addressApprox = true;
    }
    if (genericName && nearestPlace) contextName = `${nearestPlace.distance <= 0.05 ? 'At' : 'Near'} ${placeName}`;
    else if (genericName && address) name = 'Tennis courts';
    else if (numberedCourtName && placeName) contextName = `${nearestPlace!.distance <= 0.05 ? 'At' : 'Near'} ${placeName}`;
    return { ...court, name, contextName, address, addressApprox };
  }));
}
function refreshCourtContext(courts: Court[], lat: number, lon: number, locality: string, signal?: AbortSignal, onUpdate?: (courts: Court[]) => void) {
  if (courts.length > 0 && courts.every(court => court.contextCached)) return;
  const url = new URL('/api/court-context', window.location.origin);
  const nearbyCourts = [...courts].filter(court => !court.contextCached)
    .filter(court => Number.isFinite(court.lat) && Number.isFinite(court.lon))
    .sort((a, b) => milesBetween(a, { lat, lon }) - milesBetween(b, { lat, lon }))
    .slice(0, 24);
  if (nearbyCourts.length === 0) return;
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courts: nearbyCourts.map(({ lat: courtLat, lon: courtLon }) => ({ lat: courtLat, lon: courtLon })) }),
    signal,
  }).then(async response => {
    if (!response.ok) {
      const failure = await response.json().catch(() => ({} as { error?: string; diagnostic?: string }));
      console.warn('[OpenCourts] Nearby court details request failed', response.status, failure.diagnostic || failure.error || 'No diagnostic returned');
      return;
    }
    const data = await response.json();
    if (!Array.isArray(data.elements)) return;
    if (data.elements.length === 0) console.info('[OpenCourts] Nearby map data returned no named context features.');
    const enriched = groupCourtsByVenue(enrichNearbyCourtDetails(courts, data.elements, locality));
    try { sessionStorage.setItem(`opencourts-courts-v12-${lat.toFixed(3)}-${lon.toFixed(3)}`, JSON.stringify(enriched)); } catch { /* storage can be disabled */ }
    onUpdate?.(enriched);
  }).catch(error => { if (error.name !== 'AbortError') console.info('[OpenCourts] Nearby court details are still unavailable.'); });
}
export async function getCourts(lat: number, lon: number, signal?: AbortSignal, locality = '', onUpdate?: (courts: Court[]) => void): Promise<Court[]> {
  const key = `opencourts-courts-v12-${lat.toFixed(3)}-${lon.toFixed(3)}`;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const courts = JSON.parse(saved) as Court[];
      refreshCourtContext(courts, lat, lon, locality, signal, onUpdate);
      return courts;
    }
  } catch { /* storage can be disabled */ }
  const res = await fetch(`/api/courts?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { signal });
  if (!res.ok) {
    const failure = await res.json().catch(() => ({} as Record<string, unknown>));
    const diagnostic = typeof failure.diagnostic === 'string' && failure.diagnostic ? ` (${failure.diagnostic})` : '';
    if (diagnostic) console.warn('[OpenCourts] Court lookup failed', diagnostic);
    throw new Error(res.status === 429 ? 'Court data is busy. Please try again shortly.' : typeof failure.error === 'string' ? failure.error : 'Court data is temporarily unavailable. Please try again.');
  }
  const data = await readApiJson<{ elements?: any[] }>(res, 'Court data could not be read. Please try again.');
  const elements = Array.isArray(data.elements) ? data.elements : []; const roads = elements.filter((item: any) => item.tags?.highway && item.tags?.name);
  const places = elements.filter((item: any) => item.tags?.name && (['park', 'recreation_ground'].includes(item.tags?.leisure) || ['school', 'college', 'university', 'community_centre', 'community_hall'].includes(item.tags?.amenity) || item.tags?.landuse === 'school'));
  const courtElements = elements.filter((item: any) => ['pitch', 'sports_centre'].includes(item.tags?.leisure) && /(^|;)tennis(;|$)/.test(item.tags?.sport || ''));
  const courts = groupCourtsByVenue(distinguishCourtNames(courtElements.map((element: any) => ({ element, court: normalizeCourt(element, roads, locality, places) }))
    .filter(({ element, court }: { element: any; court: Court }) => Number.isFinite(court.lat) && Number.isFinite(court.lon) && !isLikelyMembersClub(court, element.tags))
    .map(({ court }: { court: Court }) => court)));
  try { sessionStorage.setItem(key, JSON.stringify(courts)); } catch { /* storage can be disabled */ }
  refreshCourtContext(courts, lat, lon, locality, signal, onUpdate);
  return courts;
}
export async function getRainAssessments(
  courts: Court[],
  signal?: AbortSignal,
): Promise<RainAssessment[]> {
  const batchSize = 12;
  const assessments: RainAssessment[] = [];

  for (let start = 0; start < courts.length; start += batchSize) {
    const batch = courts.slice(start, start + batchSize);
    const res = await fetch('/api/rain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courts: batch.map(court => ({
          id: court.id,
          lat: court.lat,
          lon: court.lon,
        })),
      }),
      signal,
    });

    const data = await readApiJson<{ error?: string; diagnostic?: string; assessments?: RainAssessment[] }>(res, 'Recent rain data is temporarily unavailable. Please try again.');
    if (!res.ok) {
      if (data.diagnostic) console.warn('[OpenCourts] Recent rain request failed', data.diagnostic);
      throw new Error(data.error || 'Recent rain data is temporarily unavailable. Please try again.');
    }

    if (!Array.isArray(data.assessments)) throw new Error('Recent rain data could not be read. Please try again.');
    assessments.push(...data.assessments);
  }

  return assessments;
}
export function assessRainfall(rain1h: number | null, rain3h: number | null, rain6h: number | null): Omit<RainAssessment, 'courtId'> {
  const valid = (value: number | null): value is number => value !== null && Number.isFinite(value) && value >= 0;
  // Conservative screening limits, not a claim about the maximum possible
  // rainfall. An anomalous pixel must not become a high-quality recommendation.
  const outlier = (valid(rain1h) && rain1h > 12) || (valid(rain3h) && rain3h > 20) || (valid(rain6h) && rain6h > 30);
  const current = valid(rain1h) && rain1h <= 12 ? rain1h : null;
  const three = valid(rain3h) && rain3h <= 20 ? rain3h : null;
  const six = valid(rain6h) && rain6h <= 30 ? rain6h : null;
  if (current === null && three === null && six === null) return {
    rain1h: null, rain3h: null, rain6h: null, score: 50, confidence: 'Low',
    summary: outlier ? 'An unusually high radar value was omitted. Verify conditions locally.' : 'Radar estimate unavailable',
  };
  let score = 100; let summary = 'No precipitation in the latest 6-hour radar estimate';
  if (current !== null && current >= 0.01) { summary = 'Precipitation detected in the past hour'; }
  else if (three !== null && three >= 0.01) {
    summary = current === null ? 'Precipitation detected in the past 3 hours; current-hour data unavailable' : 'Precipitation likely stopped 1–3 hours ago';
  }
  else if (six !== null && six >= 0.01) { summary = 'Precipitation likely stopped 3–6 hours ago'; }
  else if (current === null || three === null || six === null) {
    // Use the available per-court readings while making incomplete coverage
    // explicit in the summary.
    const availableHours = [current !== null ? '1h' : '', three !== null ? '3h' : '', six !== null ? '6h' : ''].filter(Boolean).join(' and ');
    summary = `No precipitation detected in available ${availableHours} radar; coverage is incomplete`;
  }
  // Each estimate is sampled at the court's coordinates. Let small local
  // accumulation differences affect the score instead of assigning every dry
  // court the same fixed value. The windows overlap, so weight older windows
  // less heavily and compare successive totals to approximate when rain fell.
  const recent = current ?? 0;
  const priorThree = current !== null && three !== null ? Math.max(0, three - current) : (three ?? 0);
  const priorSix = three !== null && six !== null ? Math.max(0, six - three) : (six ?? 0);
  // Rain from the oldest window is a weaker residual-dampness signal than
  // rain in the last one or three hours. Keep it in the score, but let that
  // penalty fade so a storm from earlier in the six-hour window does not
  // dominate a court's current estimate.
  const rainImpact = recent * 420 + priorThree * 180 + priorSix * 5;
  // A soft curve preserves separation between wet courts without a shared
  // low-score floor (the former floor made very wet locations all show 12).
  score = Math.round(100 / (1 + rainImpact / 50));
  const readings = [current, three, six].filter((value): value is number => value !== null);
  // Independent radar mosaics can differ slightly. Allow rounding and small
  // revisions while requiring longer accumulation windows to agree broadly.
  const tolerance = (shorter: number) => Math.max(0.03, shorter * 0.1);
  const consistent = (current === null || three === null || three + tolerance(current) >= current)
    && (three === null || six === null || six + tolerance(three) >= three)
    && (current === null || six === null || six + tolerance(current) >= current);
  const confidence: RainAssessment['confidence'] = outlier || !consistent ? 'Low'
    : readings.length === 3 ? 'High' : readings.length === 2 ? 'Moderate' : 'Low';
  if (outlier) summary += '. An unusually high radar value was omitted; verify conditions locally.';
  else if (!consistent) summary += '. Radar time windows disagree; verify conditions locally.';
  return { rain1h: current, rain3h: three, rain6h: six, score, confidence, summary };
}
export function hasWidespreadRecentRain(assessments: RainAssessment[], sampledCourtIds: ReadonlySet<string>): boolean {
  let readable = 0;
  let wet = 0;
  for (const item of assessments) {
    if (!sampledCourtIds.has(item.courtId)) continue;
    const hour = item.rain1h;
    const threeHours = item.rain3h;
    const validHour = hour !== null && Number.isFinite(hour) && hour >= 0 && hour <= 12;
    const validThreeHours = threeHours !== null && Number.isFinite(threeHours) && threeHours >= 0 && threeHours <= 20;
    if (!validHour && !validThreeHours) continue;
    if (validHour && validThreeHours && threeHours + Math.max(0.03, hour * 0.1) < hour) continue;
    readable++;
    if ((validHour && hour >= 0.01) || (validThreeHours && threeHours >= 0.01)) wet++;
  }
  return readable >= 3 && wet / readable >= 0.6;
}
export async function getWeather(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherData> {
  const res = await fetch(`/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { signal }); if (!res.ok) throw new Error('Local forecast is temporarily unavailable. Please try again.');
  const data = await readApiJson<Partial<WeatherData>>(res, 'Local forecast is temporarily unavailable. Please try again.');
  return { periods: Array.isArray(data.periods) ? data.periods : [], outlook: Array.isArray(data.outlook) ? data.outlook : [], timeZone: data.timeZone || 'America/New_York' };
}
export async function getWeatherAlerts(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherAlertData> {
  const res = await fetch(`/api/weather-alerts?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { signal });
  if (!res.ok) throw new Error('Weather alert information is temporarily unavailable.');
  const data = await readApiJson<Partial<WeatherAlertData>>(res, 'Weather alert information could not be read.');
  return { supported: data.supported === true, alerts: Array.isArray(data.alerts) ? data.alerts : [] };
}
export const HEAT_INDEX_DISPLAY_THRESHOLD_F = 90;
export function heatIndexFahrenheit(temp: number, humidity: number): number {
  if (!Number.isFinite(temp) || !Number.isFinite(humidity) || humidity < 0 || humidity > 100) return temp;
  // NWS first uses the simple approximation; the Rothfusz regression is only
  // appropriate when the averaged simple value reaches 80°F.
  const simple = 0.5 * (temp + 61 + (temp - 68) * 1.2 + humidity * 0.094);
  const initial = (simple + temp) / 2;
  if (initial < 80) return Math.round(initial);
  const t = temp; const rh = humidity;
  let index = -42.379 + 2.04901523 * t + 10.14333127 * rh - 0.22475541 * t * rh - 0.00683783 * t * t - 0.05481717 * rh * rh + 0.00122874 * t * t * rh + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh;
  if (rh < 13 && t >= 80 && t <= 112) index -= ((13 - rh) / 4) * Math.sqrt(Math.max(0, (17 - Math.abs(t - 95)) / 17));
  if (rh > 85 && t >= 80 && t <= 87) index += ((rh - 85) / 10) * ((87 - t) / 5);
  return Math.round(index);
}
export function currentHeatCaution(period?: Forecast, alertEvent?: string): { label: string; high: boolean } | null {
  const temp = period?.temp;
  const validTemp = temp !== undefined && Number.isFinite(temp);
  const humidity = period?.humidity;
  const index = validTemp && humidity !== undefined && Number.isFinite(humidity) && humidity >= 0 && humidity <= 100
    ? heatIndexFahrenheit(temp, humidity) : undefined;
  const elevated = index !== undefined && index >= HEAT_INDEX_DISPLAY_THRESHOLD_F;
  const temperatureOnly = index === undefined && validTemp && temp >= HEAT_INDEX_DISPLAY_THRESHOLD_F;
  if (!alertEvent && !elevated && !temperatureOnly) return null;
  const measure = elevated ? `${index}°F heat index` : temperatureOnly ? `${Math.round(temp)}°F air temperature` : '';
  return {
    label: `${alertEvent ? `${alertEvent} in this area` : 'Area forecast'}${measure ? ` · ${measure}` : ''} · check heat conditions`,
    high: /warning|emergency|excessive heat/i.test(alertEvent || '') || (index !== undefined ? index >= 103 : validTemp && temp >= 103),
  };
}
function rainChancePenalty(chance: number): number {
  const probability = Math.max(0, Math.min(100, chance)) / 100;
  return 70 * probability ** 1.5;
}

function combinedForecastDescription(first: Forecast, second: Forecast): string {
  const descriptions = [first.short, second.short].filter(Boolean);
  if (descriptions.length < 2) return descriptions[0] || 'Forecast conditions';
  const event = (description: string) => description.replace(/^(?:slight chance|chance|likely)\s+/i, '').trim().toLowerCase();
  if (event(descriptions[0]) === event(descriptions[1])) {
    return second.precip >= first.precip ? descriptions[1] : descriptions[0];
  }
  return [...new Set(descriptions)].join(' · ');
}

function temperaturePenalty(f: Forecast): number {
  if (f.temp < 60) return (60 - f.temp) * 4.2;
  const apparent = f.humidity === undefined ? f.temp : heatIndexFahrenheit(f.temp, f.humidity);
  return Math.max(0, Math.min(apparent, HEAT_INDEX_DISPLAY_THRESHOLD_F) - 78) * 3.7
    + Math.max(0, apparent - HEAT_INDEX_DISPLAY_THRESHOLD_F) * 2.5;
}

export type PlayScoreFactor = { type: 'ice' | 'snow' | 'rain' | 'wind' | 'heat' | 'cold'; penalty: number };
export function playScoreFactors(f: Forecast): PlayScoreFactor[] {
  if (f.winterRisk || f.winterCaution) return [{ type: f.winterRisk || f.winterCaution!.type, penalty: 80 }];
  const factors: PlayScoreFactor[] = [
    { type: f.temp >= 60 ? 'heat' : 'cold', penalty: temperaturePenalty(f) },
    { type: 'wind', penalty: Math.min(40, Math.max(0, f.wind - 8) * 2.2) },
    { type: 'rain', penalty: rainChancePenalty(f.precip) },
  ];
  return factors.filter(factor => factor.penalty >= 5).sort((a, b) => b.penalty - a.penalty);
}

export function playScore(f: Forecast): number {
  const comfortable = Math.max(0, 100 - temperaturePenalty(f));
  const windPenalty = Math.min(40, Math.max(0, f.wind - 8) * 2.2);
  const rainPenalty = rainChancePenalty(f.precip);
  const score = Math.round(Math.max(0, Math.min(100, comfortable - windPenalty - rainPenalty)));
  return f.winterRisk || f.winterCaution ? Math.min(20, score) : score;
}
export type WinterCautionSeed = { type: 'snow' | 'ice'; until: number };
export function withWinterSurfaceCaution(periods: Forecast[], seed?: WinterCautionSeed): Forecast[] {
  const ordered = [...periods].sort((a, b) => a.time.localeCompare(b.time));
  let lingering: { type: 'snow' | 'ice'; until: number; warmHours: number } | null = seed ? { ...seed, warmHours: 0 } : null;
  let previousEnd = seed && ordered.length ? Date.parse(ordered[0].time) : Number.NEGATIVE_INFINITY;
  return ordered.map(period => {
    const start = Date.parse(period.time);
    const end = period.endTime ? Date.parse(period.endTime) : start + 60 * 60_000;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { ...period, winterCaution: undefined };
    if (lingering && (start >= lingering.until || start - previousEnd > 90 * 60_000)) lingering = null;
    previousEnd = end;
    if (period.winterRisk) {
      const type = period.winterRisk === 'ice' || lingering?.type === 'ice' ? 'ice' : 'snow';
      lingering = { type, until: Math.max(lingering?.until ?? 0, end + (type === 'ice' ? 36 : 24) * 60 * 60_000), warmHours: 0 };
      return { ...period, winterCaution: { type, lingering: false } };
    }
    if (!lingering) return { ...period, winterCaution: undefined };
    // Six consecutive warm, relatively dry forecast hours can end the extra
    // caution early. This is an area forecast, never a surface observation.
    const warm = Number.isFinite(period.temp) && period.temp >= (lingering.type === 'ice' ? 50 : 45)
      && Number.isFinite(period.precip) && period.precip < 20;
    lingering.warmHours = warm ? lingering.warmHours + Math.min(2, Math.max(0, (end - start) / 60 / 60_000)) : 0;
    if (lingering.warmHours >= 6) { lingering = null; return { ...period, winterCaution: undefined }; }
    return { ...period, winterCaution: { type: lingering.type, lingering: true } };
  });
}
export function weeklyPlayWindows(periods: Forecast[], timeZone = 'UTC', lat?: number, lon?: number): DailyPlayWindows[] {
  const partsFor = (time: string) => new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(time));
  const localParts = (periods.some(period => period.winterCaution) ? periods : withWinterSurfaceCaution(periods)).map(period => {
    if (!Number.isFinite(new Date(period.time).getTime())) return { period, day: '', hour: -1 };
    const parts = partsFor(period.time);
    const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    return { period, day: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')) };
  });
  const daylightByDate = new Map<string, { sunrise: number; sunset: number }>();
  const daytime = localParts.flatMap(({ period, day, hour }) => {
    if (!day) return [];
    if (lat === undefined || lon === undefined) return hour >= 8 && hour <= 18 ? [period] : [];
    if (!daylightByDate.has(day)) {
      const date = new Date(period.time);
      const sunrise = estimatedSunrise(lat, lon, timeZone, date)?.getTime();
      const sunset = estimatedSunset(lat, lon, timeZone, date)?.getTime();
      if (sunrise !== undefined && sunset !== undefined) daylightByDate.set(day, { sunrise, sunset });
    }
    const daylight = daylightByDate.get(day);
    if (!daylight) return [];
    const start = Math.max(new Date(period.time).getTime(), daylight.sunrise);
    const end = Math.min(period.endTime ? new Date(period.endTime).getTime() : new Date(period.time).getTime() + 60 * 60_000, daylight.sunset);
    return end > start ? [{ ...period, time: new Date(start).toISOString(), endTime: new Date(end).toISOString() }] : [];
  });
  const byDay = new Map<string, Forecast[]>();
  for (const period of daytime) {
    const parts = partsFor(period.time);
    const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    const day = `${value('year')}-${value('month')}-${value('day')}`;
    byDay.set(day, [...(byDay.get(day) ?? []), period]);
  }
  const getEnd = (period: Forecast) => {
    const explicitEnd = period.endTime ? new Date(period.endTime).getTime() : Number.NaN;
    return Number.isFinite(explicitEnd) ? explicitEnd : new Date(period.time).getTime() + 60 * 60 * 1000;
  };
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 7).map(([date, hours]) => {
    hours.sort((a, b) => a.time.localeCompare(b.time));
    type PoorCondition = 'ice' | 'snow' | 'rain' | 'wind' | 'heat' | 'cold';
    const poorCondition = (period: Forecast): PoorCondition | null => {
      if (playScore(period) >= 55) return null;
      if (period.winterRisk?.includes('ice') || period.winterCaution?.type === 'ice') return 'ice';
      if (period.winterRisk === 'snow' || period.winterCaution?.type === 'snow') return 'snow';
      const thermalPenalty = temperaturePenalty(period);
      const windPenalty = Math.min(40, Math.max(0, period.wind - 8) * 2.2);
      const rainPenalty = rainChancePenalty(period.precip);
      const largest = Math.max(thermalPenalty, windPenalty, rainPenalty);
      if (rainPenalty === largest) return 'rain';
      if (thermalPenalty === largest && period.temp >= 60) return 'heat';
      if (windPenalty === largest) return 'wind';
      return 'cold';
    };
    const poorSummary = (stretch: Forecast[], condition: PoorCondition, fullDay: boolean): PlayWindow => {
      const average = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
      const humidity = stretch.every(period => period.humidity !== undefined) ? average(stretch.map(period => period.humidity!)) : undefined;
      return {
        ...stretch[0], endTime: new Date(getEnd(stretch[stretch.length - 1])).toISOString(),
        temp: average(stretch.map(period => period.temp)), wind: average(stretch.map(period => period.wind)),
        precip: average(stretch.map(period => period.precip)),
        ...(humidity === undefined ? {} : { humidity, heatIndex: heatIndexFahrenheit(average(stretch.map(period => period.temp)), humidity) }),
        ...(condition === 'snow' || condition === 'ice' ? { winterRisk: condition, winterCaution: { type: condition, lingering: stretch.every(period => !period.winterRisk) } } : {}),
        short: `${condition === 'ice' ? 'Ice risk' : condition === 'wind' ? 'Windy' : condition === 'heat' ? 'Hot' : condition === 'cold' ? 'Cold' : condition === 'rain' ? 'Rain' : 'Snow'} ${fullDay ? 'throughout the day' : 'during this period'}`,
        score: average(stretch.map(playScore)),
      };
    };
    const windows: PlayWindow[] = [];
    for (let i = 0; i < hours.length;) {
      const first = hours[i];
      const condition = poorCondition(first);
      if (condition) {
        let end = i + 1;
        while (end < hours.length && poorCondition(hours[end]) === condition &&
          (condition !== 'snow' && condition !== 'ice' || !!hours[end].winterRisk === !!first.winterRisk) &&
          Math.abs(new Date(hours[end].time).getTime() - getEnd(hours[end - 1])) <= 60_000) end++;
        const solarDay = daylightByDate.get(date);
        const fullDay = i === 0 && end === hours.length && (solarDay
          ? Math.abs(new Date(hours[0].time).getTime() - solarDay.sunrise) <= 60_000 && Math.abs(getEnd(hours[end - 1]) - solarDay.sunset) <= 60_000
          : hours.length === 11 && hours.every((period, index) => Number(partsFor(period.time).find(part => part.type === 'hour')?.value) === 8 + index));
        windows.push(poorSummary(hours.slice(i, end), condition, fullDay));
        i = end;
        continue;
      }
      const next = hours[i + 1];
      const second = next && !poorCondition(next) && Math.abs(new Date(next.time).getTime() - getEnd(first)) <= 60_000 && getEnd(next) - new Date(first.time).getTime() <= 150 * 60_000 ? next : undefined;
      if (!second) {
        windows.push({ ...first, endTime: new Date(getEnd(first)).toISOString(), score: playScore(first) });
        i++;
        continue;
      }
      const end = getEnd(second);
      const humidity = first.humidity !== undefined && second.humidity !== undefined ? (first.humidity + second.humidity) / 2 : first.humidity ?? second.humidity;
      const winterRisk = first.winterCaution?.type === 'ice' || second.winterCaution?.type === 'ice' ? 'ice' : first.winterCaution?.type || second.winterCaution?.type;
      const winterLingering = winterRisk && !first.winterRisk && !second.winterRisk;
      const window: PlayWindow = {
        time: first.time, endTime: second.endTime || new Date(end).toISOString(),
        temp: (first.temp + second.temp) / 2,
        wind: Math.round((first.wind + second.wind) / 2),
        precip: Math.round((first.precip + second.precip) / 2),
        ...(humidity === undefined ? {} : { humidity, heatIndex: heatIndexFahrenheit((first.temp + second.temp) / 2, humidity) }),
        ...(winterRisk === undefined ? {} : { winterRisk, winterCaution: { type: winterRisk, lingering: !!winterLingering } }),
        short: combinedForecastDescription(first, second), icon: first.icon,
        score: 0,
      };
      window.score = playScore(window);
      windows.push(window);
      i += 2;
    }
    return { date, windows };
  });
}

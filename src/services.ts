import type { Access, Court, DailyPlayWindows, Forecast, Lighting, Place, PlaceSuggestion, PlayWindow, RainAssessment, WeatherData } from './types';

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
export function normalizeCourt(element: any, roads: any[] = [], locality = '', nearbyPlaces: any[] = []): Court {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat; const lon = element.lon ?? element.center?.lon;
  const addressLine = tags['addr:full'] || [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const cityLine = [tags['addr:city'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', ') || locality;
  let address = addressLine ? [addressLine, cityLine].filter(Boolean).join(', ') : undefined;
  let addressApprox = false;
  if (!address && Number.isFinite(lat) && Number.isFinite(lon)) {
    const nearby = roads.map(road => ({ road, lat: road.lat ?? road.center?.lat, lon: road.lon ?? road.center?.lon })).filter(r => r.road.tags?.name && Number.isFinite(r.lat) && Number.isFinite(r.lon)).map(r => ({ ...r, distance: milesBetween({ lat, lon }, r) })).sort((a, b) => a.distance - b.distance)[0];
    if (nearby && nearby.distance <= 0.12) { address = `Near ${nearby.road.tags.name}${cityLine ? `, ${cityLine}` : ''}`; addressApprox = true; }
  }
  const mappedName = tags.name || tags['name:en'];
  const nearbyPlace = nearbyPlaces.map(place => ({ place, lat: place.lat ?? place.center?.lat, lon: place.lon ?? place.center?.lon })).filter(item => (item.place.tags?.name || item.place.tags?.['name:en']) && Number.isFinite(item.lat) && Number.isFinite(item.lon)).map(item => ({ ...item, distance: milesBetween({ lat, lon }, item) })).filter(item => item.distance <= 0.35).sort((a, b) => a.distance - b.distance)[0];
  const placeName = nearbyPlace?.place.tags?.name || nearbyPlace?.place.tags?.['name:en'];
  const placeLabel = nearbyPlace ? `Tennis courts ${nearbyPlace.distance <= 0.05 ? 'at' : 'near'} ${placeName}` : undefined;
  const fallbackLocation = address?.replace(/^Near\s+/i, '').split(',')[0];
  return { id: `osm-${element.type}-${element.id}`, name: mappedName || placeLabel || (fallbackLocation ? `Tennis courts near ${fallbackLocation}` : 'Tennis courts'), lat, lon, lighting: classifyLighting(tags), access: classifyAccess(tags), surface: tags.surface, courts: Number(tags.count || tags['courts:count'] || tags.courts) || undefined, sheltered: tags.indoor === 'yes' || tags.covered === 'yes', address, addressApprox, sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}` };
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
    const duplicate = (groups.get(court.name)?.length ?? 0) > 1;
    let name = duplicate ? `${court.name} · ${rank.get(court.id)}` : court.name;
    let suffix = 2;
    while (used.has(name)) name = `${court.name} · Court ${suffix++}`;
    used.add(name);
    return { ...court, name };
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
  const key = `opencourts-place-${query.trim().toLowerCase()}`;
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
  const url = new URL('/api/suggest', window.location.origin); url.searchParams.set('q', query);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Place suggestions are temporarily unavailable.');
  const data = await readApiJson<{ suggestions?: PlaceSuggestion[] }>(res, 'Place suggestions are temporarily unavailable.');
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}
const DETAIL_GRID_SIZE = 0.01;
type NearbyFeature = { feature: any; lat: number; lon: number };
type NearbyGrid = Map<string, NearbyFeature[]>;

function makeNearbyGrid(features: any[]): NearbyGrid {
  const grid: NearbyGrid = new Map();
  for (const feature of features) {
    const lat = feature.lat ?? feature.center?.lat;
    const lon = feature.lon ?? feature.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = `${Math.floor(lat / DETAIL_GRID_SIZE)}:${Math.floor(lon / DETAIL_GRID_SIZE)}`;
    const bucket = grid.get(key);
    const point = { feature, lat, lon };
    if (bucket) bucket.push(point);
    else grid.set(key, [point]);
  }
  return grid;
}

function nearestFeature(origin: { lat: number; lon: number }, grid: NearbyGrid, maxMiles: number): { feature: any; distance: number } | undefined {
  const latCell = Math.floor(origin.lat / DETAIL_GRID_SIZE);
  const lonCell = Math.floor(origin.lon / DETAIL_GRID_SIZE);
  const latCells = Math.ceil(maxMiles / (68.7 * DETAIL_GRID_SIZE)) + 1;
  const lonMilesPerDegree = 68.7 * Math.max(0.05, Math.abs(Math.cos(origin.lat * Math.PI / 180)));
  const lonCells = Math.ceil(maxMiles / (lonMilesPerDegree * DETAIL_GRID_SIZE)) + 1;
  let nearest: { feature: any; distance: number } | undefined;
  for (let y = latCell - latCells; y <= latCell + latCells; y++) {
    for (let x = lonCell - lonCells; x <= lonCell + lonCells; x++) {
      for (const point of grid.get(`${y}:${x}`) ?? []) {
        const distance = milesBetween(origin, point);
        if (distance <= maxMiles && (!nearest || distance < nearest.distance)) nearest = { feature: point.feature, distance };
      }
    }
  }
  return nearest;
}

export function enrichNearbyCourtDetails(courts: Court[], elements: any[], locality: string): Court[] {
  const roads = makeNearbyGrid(elements.filter(item => item.tags?.highway && item.tags?.name));
  const places = makeNearbyGrid(elements.filter(item => item.tags?.name && (['park', 'recreation_ground'].includes(item.tags?.leisure) || ['school', 'college', 'university', 'community_centre', 'community_hall'].includes(item.tags?.amenity) || item.tags?.landuse === 'school')));
  return distinguishCourtNames(courts.map(court => {
    const nearestRoad = nearestFeature(court, roads, 0.12);
    let address = court.address;
    let addressApprox = court.addressApprox;
    if (!address && nearestRoad?.feature.tags?.name) {
      address = `Near ${nearestRoad.feature.tags.name}${locality ? `, ${locality}` : ''}`;
      addressApprox = true;
    }
    const nearestPlace = nearestFeature(court, places, 0.35);
    const genericName = /^tennis courts?(?:\s+(?:at|near)\s+.*)?$/i.test(court.name);
    let name = court.name;
    if (genericName && nearestPlace) name = `Tennis courts ${nearestPlace.distance <= 0.05 ? 'at' : 'near'} ${nearestPlace.feature.tags.name || nearestPlace.feature.tags['name:en']}`;
    else if (genericName && address) name = `Tennis courts near ${address.replace(/^Near\s+/i, '').split(',')[0]}`;
    return { ...court, name, address, addressApprox };
  }));
}
function refreshCourtContext(courts: Court[], lat: number, lon: number, locality: string, signal?: AbortSignal, onUpdate?: (courts: Court[]) => void) {
  const url = new URL('/api/court-context', window.location.origin);
  url.searchParams.set('lat', String(lat)); url.searchParams.set('lon', String(lon));
  void fetch(url, { signal }).then(async response => {
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data.elements)) return;
    const enriched = enrichNearbyCourtDetails(courts, data.elements, locality);
    try { sessionStorage.setItem(`opencourts-courts-v6-${lat.toFixed(3)}-${lon.toFixed(3)}`, JSON.stringify(enriched)); } catch { /* storage can be disabled */ }
    onUpdate?.(enriched);
  }).catch(error => { if (error.name !== 'AbortError') console.info('[OpenCourts] Nearby court details are still unavailable.'); });
}
export async function getCourts(lat: number, lon: number, signal?: AbortSignal, locality = '', onUpdate?: (courts: Court[]) => void): Promise<Court[]> {
  const key = `opencourts-courts-v6-${lat.toFixed(3)}-${lon.toFixed(3)}`;
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
  const courts = distinguishCourtNames(courtElements.map((element: any) => ({ element, court: normalizeCourt(element, roads, locality, places) }))
    .filter(({ element, court }: { element: any; court: Court }) => Number.isFinite(court.lat) && Number.isFinite(court.lon) && !isLikelyMembersClub(court, element.tags))
    .map(({ court }: { court: Court }) => court));
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
  const valid = (value: number | null): value is number => value !== null && Number.isFinite(value);
  if (![rain1h, rain3h, rain6h].some(valid)) return { rain1h, rain3h, rain6h, score: 50, confidence: 'Low', summary: 'Radar estimate unavailable' };
  const current = valid(rain1h) ? rain1h : null;
  const three = valid(rain3h) ? rain3h : null;
  const six = valid(rain6h) ? rain6h : null;
  let score = 100; let summary = 'No rain detected in the past 6 hours';
  if (current !== null && current >= 0.01) { summary = 'Rain detected in the past hour'; }
  else if (three !== null && three >= 0.01) {
    summary = current === null ? 'Rain detected in the past 3 hours; current-hour data unavailable' : 'Rain likely stopped 1–3 hours ago';
  }
  else if (six !== null && six >= 0.01) { summary = 'Rain likely stopped 3–6 hours ago'; }
  else if (current === null || three === null || six === null) {
    // Use the available per-court readings while making incomplete coverage
    // explicit in the summary.
    const availableHours = [current !== null ? '1h' : '', three !== null ? '3h' : '', six !== null ? '6h' : ''].filter(Boolean).join(' and ');
    summary = `No rain detected in available ${availableHours} radar; coverage is incomplete`;
  }
  // Each estimate is sampled at the court's coordinates. Let small local
  // accumulation differences affect the score instead of assigning every dry
  // court the same fixed value. The windows overlap, so weight older windows
  // less heavily and compare successive totals to approximate when rain fell.
  const recent = current ?? 0;
  const priorThree = current !== null && three !== null ? Math.max(0, three - current) : (three ?? 0);
  const priorSix = three !== null && six !== null ? Math.max(0, six - three) : (six ?? 0);
  const rainImpact = recent * 420 + priorThree * 180 + priorSix * 80;
  // A soft curve preserves separation between wet courts without a shared
  // low-score floor (the former floor made very wet locations all show 12).
  score = Math.round(100 / (1 + rainImpact / 50));
  const readings = [current, three, six].filter((value): value is number => value !== null);
  const completeDryReadings = current !== null && three !== null && six !== null && readings.every(value => value < 0.005);
  const currentRainConfirmed = current !== null && current >= 0.02 && three !== null && three >= current * 0.8;
  const stoppedRecently = current !== null && current < 0.005 && three !== null && three >= 0.02;
  const rainOnlyInOlderWindow = current !== null && current < 0.005 && three !== null && three < 0.005 && six !== null && six >= 0.02;
  const confidence: RainAssessment['confidence'] = currentRainConfirmed || completeDryReadings ? 'High'
    : stoppedRecently || rainOnlyInOlderWindow || (readings.length === 3 && Math.max(...readings) >= 0.02) ? 'Moderate'
    : 'Low';
  return { rain1h, rain3h, rain6h, score, confidence, summary };
}
export async function getWeather(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherData> {
  const res = await fetch(`/api/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, { signal }); if (!res.ok) throw new Error('Local forecast is temporarily unavailable. Please try again.');
  const data = await readApiJson<Partial<WeatherData>>(res, 'Local forecast is temporarily unavailable. Please try again.');
  return { periods: Array.isArray(data.periods) ? data.periods : [], outlook: Array.isArray(data.outlook) ? data.outlook : [], timeZone: data.timeZone || 'America/New_York' };
}
export function playScore(f: Forecast): number {
  const comfortable = Math.max(0, 100 - Math.abs(f.temp - 70) * 2.2);
  const windPenalty = Math.min(40, Math.max(0, f.wind - 8) * 2.2);
  const rainPenalty = Math.min(60, f.precip * 1.5);
  return Math.round(Math.max(0, Math.min(100, comfortable - windPenalty - rainPenalty)));
}
export function weeklyPlayWindows(periods: Forecast[], timeZone = 'UTC'): DailyPlayWindows[] {
  const partsFor = (time: string) => new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(time));
  const localParts = periods.map(period => {
    if (!Number.isFinite(new Date(period.time).getTime())) return { period, day: '', hour: -1 };
    const parts = partsFor(period.time);
    const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    return { period, day: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')) };
  });
  const daytime = localParts.filter(({ hour }) => hour >= 8 && hour <= 18);
  const byDay = new Map<string, Forecast[]>();
  for (const { period, day } of daytime) {
    if (!day) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), period]);
  }
  const getEnd = (period: Forecast) => {
    const explicitEnd = period.endTime ? new Date(period.endTime).getTime() : Number.NaN;
    return Number.isFinite(explicitEnd) ? explicitEnd : new Date(period.time).getTime() + 60 * 60 * 1000;
  };
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 7).flatMap(([date, hours]) => {
    hours.sort((a, b) => a.time.localeCompare(b.time));
    const candidates: PlayWindow[] = [];
    for (let i = 0; i < hours.length - 1; i++) {
      const first = hours[i]; const second = hours[i + 1];
      const start = new Date(first.time).getTime(); const nextStart = new Date(second.time).getTime(); const end = getEnd(second);
      if (Math.abs(nextStart - getEnd(first)) > 60_000 || end - start < 90 * 60_000 || end - start > 150 * 60_000) continue;
      const conditions = [...new Set([first.short, second.short].filter(Boolean))];
      const window: PlayWindow = {
        time: first.time, endTime: second.endTime || new Date(end).toISOString(),
        temp: (first.temp + second.temp) / 2,
        wind: Math.round((first.wind + second.wind) / 2),
        precip: Math.round((first.precip + second.precip) / 2),
        short: conditions.join(' · ') || 'Forecast conditions', icon: first.icon,
        score: 0,
      };
      window.score = playScore(window);
      candidates.push(window);
    }
    const bestScore = Math.max(...candidates.map(candidate => candidate.score), -1);
    const threshold = Math.max(55, bestScore - 18);
    const selected: PlayWindow[] = [];
    for (const candidate of candidates.filter(item => item.score >= threshold).sort((a, b) => b.score - a.score || a.time.localeCompare(b.time))) {
      const start = new Date(candidate.time).getTime(); const end = getEnd(candidate);
      const overlaps = selected.some(item => start < getEnd(item) && end > new Date(item.time).getTime());
      if (!overlaps) selected.push(candidate);
    }
    if (!selected.length && hours.length) {
      const bestHour = hours.map(period => ({ ...period, score: playScore(period) })).sort((a, b) => b.score - a.score)[0];
      if (bestHour.score >= 55) selected.push(bestHour);
    }
    if (!selected.length) return [];
    return [{ date, windows: selected.sort((a, b) => a.time.localeCompare(b.time)) }];
  });
}

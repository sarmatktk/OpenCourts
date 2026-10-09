import type { Access, Court, Forecast, Lighting, Place, WeatherData } from './types';

export function classifyLighting(tags: Record<string, string | undefined>): Lighting {
  if (tags.lit === 'yes' || tags.lighting === 'yes') return 'yes';
  if (tags.lit === 'no' || tags.lighting === 'no') return 'no';
  return 'unknown';
}
export function classifyAccess(tags: Record<string, string | undefined>): Access {
  if (tags.access === 'private' || tags.access === 'members' || tags.access === 'customers') return 'restricted';
  if (tags.access === 'yes' || tags.access === 'permissive' || tags.access === 'public' || tags.leisure === 'park' || tags.access === undefined) return 'public';
  return 'unknown';
}
export function normalizeCourt(element: any): Court {
  const tags = element.tags ?? {};
  return { id: `osm-${element.type}-${element.id}`, name: tags.name || tags['name:en'] || 'Public tennis courts', lat: element.lat ?? element.center?.lat, lon: element.lon ?? element.center?.lon, lighting: classifyLighting(tags), access: classifyAccess(tags), surface: tags.surface, courts: Number(tags['courts:count'] || tags.courts) || undefined, sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}` };
}
export async function findPlace(query: string, signal?: AbortSignal): Promise<Place> {
  const key = `opencourts-place-${query.trim().toLowerCase()}`;
  try { const saved = sessionStorage.getItem(key); if (saved) return JSON.parse(saved); } catch { /* storage can be disabled */ }
  const url = new URL('/api/geocode', window.location.origin); url.searchParams.set('q', query);
  const res = await fetch(url, { signal }); if (!res.ok) throw new Error(res.status === 429 ? 'Location search is busy. Please wait a moment and try again.' : 'Location search is unavailable. Try a city and state or ZIP code.');
  const data = await res.json(); const match = data.result;
  if (!match) throw new Error('We couldn’t find that place. Try a U.S. city, state, or ZIP code.');
  const place = { label: match.display_name, lat: Number(match.lat), lon: Number(match.lon) };
  try { sessionStorage.setItem(key, JSON.stringify(place)); } catch { /* storage can be disabled */ }
  return place;
}
export async function getCourts(lat: number, lon: number, signal?: AbortSignal): Promise<Court[]> {
  const key = `opencourts-courts-v1-${lat.toFixed(3)}-${lon.toFixed(3)}`;
  try { const saved = sessionStorage.getItem(key); if (saved) return JSON.parse(saved); } catch { /* storage can be disabled */ }
  const res = await fetch(`/api/courts?lat=${lat}&lon=${lon}`, { signal });
  if (!res.ok) throw new Error(res.status === 429 ? 'Court data is busy. Please try again shortly.' : 'Court data is temporarily unavailable. Please try again.');
  const data = await res.json(); const courts = (data.elements ?? []).map(normalizeCourt).filter((court: Court) => Number.isFinite(court.lat) && Number.isFinite(court.lon) && court.access !== 'restricted');
  try { sessionStorage.setItem(key, JSON.stringify(courts)); } catch { /* storage can be disabled */ }
  return courts;
}
export async function getWeather(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherData> {
  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, { signal }); if (!res.ok) throw new Error('Weather forecast unavailable');
  const data = await res.json(); return { periods: data.periods ?? [], timeZone: data.timeZone ?? 'America/New_York' };
}
export function playScore(f: Forecast): number {
  const comfortable = Math.max(0, 100 - Math.abs(f.temp - 70) * 2.2);
  const windPenalty = Math.min(40, Math.max(0, f.wind - 8) * 2.2);
  const rainPenalty = Math.min(60, f.precip * 1.5);
  return Math.round(Math.max(0, Math.min(100, comfortable - windPenalty - rainPenalty)));
}

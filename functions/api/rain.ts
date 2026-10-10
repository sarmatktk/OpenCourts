import { assessRainfall } from '../../src/services';

interface Env { LOCAL_DEV?: boolean }

const service = 'https://mapservices.weather.noaa.gov/raster/rest/services/obs/mrms_qpe/ImageServer/getSamples';
type CourtPoint = { id: string; lat: number; lon: number };

async function sample(points: CourtPoint[], hours: 1 | 3 | 6): Promise<(number | null)[]> {
  const params = new URLSearchParams({
    geometry: JSON.stringify({ points: points.map(point => [point.lon, point.lat]), spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryMultipoint',
    mosaicRule: JSON.stringify({ mosaicMethod: 'esriMosaicAttribute', where: `idp_subset='mrms_${hours}h_co'`, sortField: 'idp_filedate', sortValue: 0, ascending: false, mosaicOperation: 'MT_FIRST' }),
    returnFirstValueOnly: 'true', returnGeometry: 'false', f: 'json',
  });
  const response = await fetch(`${service}?${params}`, { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`MRMS ${hours}h sample failed (${response.status})`);
  const data: any = await response.json();
  if (data.error) throw new Error(data.error.message || 'MRMS sample unavailable');
  return points.map((_, index) => {
    const sample = data.samples?.find((item: any) => Number(item.locationId) === index + 1) ?? data.samples?.[index];
    const raw = sample?.value;
    if (raw === undefined || raw === null || raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0) return null;
    return Number(raw);
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body: any = await request.json();
    const points: CourtPoint[] = Array.isArray(body.courts) ? body.courts.slice(0, 50) : [];
    if (!points.length || points.some(point => typeof point.id !== 'string' || !Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180)) {
      return Response.json({ error: 'Valid court coordinates are required.' }, { status: 400 });
    }
    const [rain1h, rain3h, rain6h] = await Promise.all([sample(points, 1), sample(points, 3), sample(points, 6)]);
    const assessments = points.map((point, index) => {
      const one = rain1h[index]; const three = rain3h[index]; const six = rain6h[index];
      const complete = [one, three, six].every(value => value !== null);
      const result = assessRainfall(one, three, six);
      return { courtId: point.id, ...result, score: complete ? result.score : Math.min(result.score, 55), summary: complete ? result.summary : 'Radar coverage is incomplete' };
    });
    return Response.json({ assessments, updatedAt: new Date().toISOString(), source: 'NOAA/NWS MRMS radar QPE' }, { headers: { 'Cache-Control': 'public, max-age=600' } });
  } catch (error) {
    const reason = error instanceof Error ? [error.message, error.cause instanceof Error ? error.cause.message : ''].filter(Boolean).join(': ') : 'request failed';
    console.warn('[OpenCourts] Radar rainfall query failed', reason);
    return Response.json({ error: 'Recent radar rainfall is temporarily unavailable.', ...(env?.LOCAL_DEV ? { diagnostic: reason } : {}) }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};

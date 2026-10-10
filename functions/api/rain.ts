import { assessRainfall } from '../../src/services';

interface Env { LOCAL_DEV?: boolean }

const service = 'https://mapservices.weather.noaa.gov/raster/rest/services/obs/mrms_qpe/ImageServer/getSamples';
type CourtPoint = { id: string; lat: number; lon: number };

async function sample(points: CourtPoint[], hours: 1 | 3 | 6): Promise<(number | null)[]> {
  // Keep URLs short enough for NOAA/ArcGIS gateways when checking many courts.
  // The ArcGIS getSamples operation accepts GET requests, so sample in small batches.
  const batchSize = 10;
  const values: (number | null)[] = [];
  for (let start = 0; start < points.length; start += batchSize) {
    const batch = points.slice(start, start + batchSize);
    // NOAA's MRMS ImageServer is published in Web Mercator (WKID 3857).
    // Send coordinates in its native spatial reference to avoid server-side
    // projection failures in getSamples.
    const mercatorPoints = batch.map(point => {
      const latitude = Math.max(-85.05112878, Math.min(85.05112878, point.lat));
      const x = point.lon * 20037508.342789244 / 180;
      const y = Math.log(Math.tan((90 + latitude) * Math.PI / 360)) * 20037508.342789244 / Math.PI;
      return [x, y];
    });
    const params = new URLSearchParams({
      geometry: JSON.stringify({ points: mercatorPoints, spatialReference: { wkid: 3857 } }),
      geometryType: 'esriGeometryMultipoint',
      // The service has one current MRMS mosaic per period and region. A
      // simple where clause selects the correct product without optional
      // sorting parameters that the NOAA service may reject.
      mosaicRule: JSON.stringify({ where: `idp_subset='mrms_${hours}h_co'` }),
      returnFirstValueOnly: 'true', f: 'json',
    });
    const response = await fetch(`${service}?${params}`, { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`MRMS ${hours}h sample failed (${response.status})`);
    const data: any = await response.json();
    if (data.error) {
      const details = Array.isArray(data.error.details) ? data.error.details.join('; ') : '';
      const codes = [data.error.code, data.error.extendedCode].filter((code: unknown) => code !== undefined && code !== null).join('/');
      const reason = [data.error.message || 'MRMS sample unavailable', codes ? `ArcGIS ${codes}` : '', details].filter(Boolean).join(': ');
      throw new Error(`MRMS ${hours}h: ${reason}`);
    }
    values.push(...batch.map((_, index) => {
      const item = data.samples?.find((sample: any) => Number(sample.locationId) === index + 1) ?? data.samples?.[index];
      const raw = item?.value;
      if (raw === undefined || raw === null || raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0) return null;
      return Number(raw);
    }));
  }
  return values;
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

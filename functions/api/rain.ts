import { assessRainfall } from '../../src/services';

interface Env { LOCAL_DEV?: boolean }

const service = 'https://mapservices.weather.noaa.gov/raster/rest/services/obs/mrms_qpe/ImageServer/identify';
type CourtPoint = { id: string; lat: number; lon: number };

function mrmsSubset(point: CourtPoint): 'conus' | 'alaska' | 'hawaii' | 'carib' {
  if (point.lat >= 17 && point.lat <= 24 && point.lon >= -162 && point.lon <= -153) return 'hawaii';
  if (point.lat >= 16 && point.lat <= 20 && point.lon >= -69.5 && point.lon <= -64) return 'carib';
  if (point.lat >= 50 || point.lon <= -130) return 'alaska';
  return 'conus';
}

async function sample(points: CourtPoint[], hours: 1 | 3 | 6): Promise<(number | null)[]> {
  // Select NOAA's actual catalog image for this region and accumulation period.
  // Do not use a renderingRule: its classified display value can be 1 even
  // when the raw precipitation pixel is 0 inches.
  const batchSize = 10;
  const values: (number | null)[] = [];
  for (let start = 0; start < points.length; start += batchSize) {
    const batch = points.slice(start, start + batchSize);
    const results = await Promise.all(batch.map(async point => {
      // NOAA publishes this ImageServer in Web Mercator (WKID 3857).
      const latitude = Math.max(-85.05112878, Math.min(85.05112878, point.lat));
      const x = point.lon * 20037508.342789244 / 180;
      const y = Math.log(Math.tan((90 + latitude) * Math.PI / 360)) * 20037508.342789244 / Math.PI;
      const expectedImage = `${mrmsSubset(point)}_QPE_${String(hours).padStart(2, '0')}H`;
      const params = new URLSearchParams({
        geometry: JSON.stringify({ x, y, spatialReference: { wkid: 3857 } }),
        geometryType: 'esriGeometryPoint',
        mosaicRule: JSON.stringify({ where: `name='${expectedImage}'` }),
        returnGeometry: 'false', returnCatalogItems: 'true', maxItemCount: '1', f: 'json',
      });
      const response = await fetch(`${service}?${params}`, { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`MRMS ${hours}h identify failed (${response.status})`);
      const data: any = await response.json();
      if (data.error) {
        const details = Array.isArray(data.error.details) ? data.error.details.join('; ') : '';
        const codes = [data.error.code, data.error.extendedCode].filter((code: unknown) => code !== undefined && code !== null).join('/');
        const reason = [data.error.message || 'MRMS identify unavailable', codes ? `ArcGIS ${codes}` : '', details].filter(Boolean).join(': ');
        throw new Error(`MRMS ${hours}h: ${reason}`);
      }
      const selectedImages = (data.catalogItems?.features ?? [])
        .map((feature: any) => feature.attributes?.name ?? feature.attributes?.Name)
        .filter((name: unknown): name is string => typeof name === 'string')
        .map((name: string) => name.toLowerCase());
      if (data.value === 'NoData' && selectedImages.length === 0) return null;
      if (!selectedImages.includes(expectedImage.toLowerCase())) {
        throw new Error(`MRMS ${hours}h returned an unverified raster for this location`);
      }
      const raw = data.value;
      if (raw === undefined || raw === null || raw === '' || !Number.isFinite(Number(raw)) || Number(raw) < 0) return null;
      return Number(raw);
    }));
    values.push(...results);
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
    const periods = await Promise.allSettled([sample(points, 1), sample(points, 3), sample(points, 6)]);
    const failedPeriods = periods.flatMap((period, index) => period.status === 'rejected' ? [`${[1, 3, 6][index]}h: ${period.reason instanceof Error ? period.reason.message : 'request failed'}`] : []);
    if (failedPeriods.length === periods.length) throw new Error(failedPeriods.join(' · '));
    // NOAA can have a catalog failure for one accumulation period while the
    // others remain available. Keep useful short-window estimates instead of
    // failing the whole response for every court.
    const rainByPeriod = periods.map(period => period.status === 'fulfilled' ? period.value : Array<number | null>(points.length).fill(null));
    const [rain1h, rain3h, rain6h] = rainByPeriod;
    const assessments = points.map((point, index) => {
      const one = rain1h[index]; const three = rain3h[index]; const six = rain6h[index];
      const result = assessRainfall(one, three, six);
      return { courtId: point.id, ...result };
    });
    return Response.json({ assessments, unavailablePeriods: failedPeriods, updatedAt: new Date().toISOString(), source: 'NOAA/NWS MRMS radar QPE' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const reason = error instanceof Error ? [error.message, error.cause instanceof Error ? error.cause.message : ''].filter(Boolean).join(': ') : 'request failed';
    console.warn('[OpenCourts] Radar rainfall query failed', reason);
    return Response.json({ error: 'Recent radar rainfall is temporarily unavailable.', ...(env?.LOCAL_DEV ? { diagnostic: reason } : {}) }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};

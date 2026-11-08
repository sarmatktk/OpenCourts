import { readEdgeCache, writeEdgeCache } from '../lib/edge-cache';

interface Env { WEATHERAPI_KEY?: string }

function durationMs(value: string): number | null {
  const match = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(value);
  if (!match) return null;
  const [, days = '0', hours = '0', minutes = '0', seconds = '0'] = match;
  return ((Number(days) * 24 + Number(hours)) * 60 + Number(minutes)) * 60_000 + Number(seconds) * 1000;
}

function forecastWinterRisk(text: unknown): 'snow' | 'ice' | undefined {
  if (typeof text !== 'string') return undefined;
  if (/\b(?:freezing rain|freezing drizzle|freezing fog|sleet|ice pellets|wintry mix|glaze)\b/i.test(text)) return 'ice';
  if (/\bsnow(?:fall|ing|y|s)?\b/i.test(text)) return 'snow';
  return undefined;
}

export function humidityForTime(values: any[], time: string): number | undefined {
  const timestamp = Date.parse(time);
  if (!Number.isFinite(timestamp)) return undefined;
  const sample = values.find(item => {
    if (typeof item?.validTime !== 'string' || !Number.isFinite(item.value)) return false;
    const [startText, durationText] = item.validTime.split('/');
    if (!startText || !durationText) return false;
    const start = Date.parse(startText);
    const duration = durationMs(durationText);
    return Number.isFinite(start) && duration !== null && timestamp >= start && timestamp < start + duration;
  });
  return sample && sample.value >= 0 && sample.value <= 100 ? sample.value : undefined;
}

function parseMetSymbol(symbol: string | undefined) {
  const code = (symbol || '').toLowerCase();
  if (code.includes('thunder')) return 'Thunderstorms';
  if (code.includes('snow') || code.includes('sleet')) return 'Snow';
  if (code.includes('rain') || code.includes('drizzle')) return 'Rain';
  if (code.includes('fog')) return 'Fog';
  if (code.includes('cloudy')) return 'Cloudy';
  if (code.includes('partlycloudy')) return 'Partly cloudy';
  if (code.includes('fair')) return 'Mostly clear';
  if (code.includes('clearsky')) return 'Clear';
  return 'Weather conditions';
}

export function mapMetNorwayForecast(data: any) {
  const periods = (data.properties?.timeseries ?? []).slice(0, 168).map((item: any, index: number, all: any[]) => {
    const details = item.data?.instant?.details ?? item.data?.next_1_hours?.details ?? item.data?.next_6_hours?.details ?? {};
    const summary = item.data?.next_1_hours?.summary ?? item.data?.next_6_hours?.summary ?? {};
    const symbol = summary.symbol_code || '';
    const description = parseMetSymbol(symbol);
    const symbolBase = symbol.replace(/_(?:day|night|polartwilight)$/, '');
    const snow = /snow|sleet/.test(symbolBase);
    const ice = /sleet|freezing|hail/.test(symbolBase);
    return {
      time: item.time,
      endTime: all[index + 1]?.time,
      temp: details.air_temperature,
      wind: details.wind_speed,
      precip: item.data?.next_1_hours?.details?.probability_of_precipitation ?? item.data?.next_6_hours?.details?.probability_of_precipitation ?? 0,
      humidity: details.relative_humidity,
      ...(ice ? { winterRisk: 'ice' } : snow ? { winterRisk: 'snow' } : {}),
      short: description,
      icon: '',
    };
  }).filter((period: any) => Number.isFinite(period.temp) && Number.isFinite(period.wind));
  return { periods, outlook: [], timeZone: data.properties?.meta?.timezone || 'UTC', source: 'MET Norway', attributionUrl: 'https://www.met.no/en' };
}

async function metNorwayForecast(lat: number, lon: number, origin: string, waitUntil?: (promise: Promise<unknown>) => void) {
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const key = new Request(`${origin}/api/weather?provider=met&lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`);
  const cached = await readEdgeCache(cache, key);
  if (cached) return cached;
  const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, {
    headers: { 'User-Agent': 'OpenCourts.us/1.0 (https://opencourts.us/contact; samktk23@gmail.com)', Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return openMeteoForecast(lat, lon, origin, waitUntil);
  const data: any = await response.json();
  const mapped = mapMetNorwayForecast(data);
  if (!mapped.periods.length) return Response.json({ error: 'Forecast temporarily unavailable.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  // Weather is intentionally short-lived: refresh forecasts every 30 minutes.
  const result = Response.json(mapped, { headers: { 'Cache-Control': 'public, max-age=1800' } });
  writeEdgeCache(cache, key, result, waitUntil);
  return result;
}

async function openMeteoForecast(lat: number, lon: number, origin: string, waitUntil?: (promise: Promise<unknown>) => void) {
  const cache = typeof caches === 'undefined' ? undefined : caches.default;
  const key = new Request(`${origin}/api/weather?provider=met-fallback&lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`);
  const cached = await readEdgeCache(cache, key); if (cached) return cached;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m&forecast_days=7&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return Response.json({ error: 'Forecast temporarily unavailable.' }, { status: 502 });
    const data: any = await response.json(); const hourly = data.hourly ?? {};
    const periods = (hourly.time ?? []).map((time: string, i: number) => ({ time, endTime: hourly.time?.[i + 1], temp: hourly.temperature_2m?.[i], wind: hourly.wind_speed_10m?.[i], precip: hourly.precipitation_probability?.[i] ?? 0, humidity: hourly.relative_humidity_2m?.[i], short: 'Forecast', icon: '' })).filter((p: any) => Number.isFinite(p.temp) && Number.isFinite(p.wind));
    const result = Response.json({ periods, outlook: [], timeZone: data.timezone || 'UTC', source: 'Open-Meteo', attributionUrl: 'https://open-meteo.com/' }, { headers: { 'Cache-Control': 'public, max-age=1800' } });
    writeEdgeCache(cache, key, result, waitUntil); return result;
  } catch { return Response.json({ error: 'Forecast temporarily unavailable.' }, { status: 502 }); }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, waitUntil, env }) => {
  const u = new URL(request.url); const rawLat = u.searchParams.get('lat'); const rawLon = u.searchParams.get('lon');
  if (rawLat === null || rawLon === null || !rawLat.trim() || !rawLon.trim()) return Response.json({ error: 'Valid coordinates are required.' }, { status: 400 });
  const lat = Number(rawLat); const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({ error: 'Valid coordinates are required.' }, { status: 400 });
  if (u.searchParams.get('provider') === 'met') {
    if (env.WEATHERAPI_KEY) {
      try {
        // WeatherAPI's free plan provides a three-day forecast. Keep this
        // international-only request within that limit; the US NWS path is
        // unchanged and still supplies its normal seven-day data.
        const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(env.WEATHERAPI_KEY)}&q=${lat},${lon}&days=3&aqi=no&alerts=no`, { signal: AbortSignal.timeout(12000) });
        if (response.ok) {
          const data: any = await response.json(); const periods = (data.forecast?.forecastday ?? []).flatMap((day: any) => day.hour ?? []).map((h: any) => ({ time: h.time, temp: h.temp_f, wind: h.wind_mph, precip: h.chance_of_rain ?? 0, humidity: h.humidity, short: h.condition?.text || 'Forecast', icon: h.condition?.icon || '' })).filter((p: any) => Number.isFinite(p.temp) && Number.isFinite(p.wind));
          return Response.json({ periods, outlook: [], timeZone: data.location?.tz_id || 'UTC', source: 'WeatherAPI', attributionUrl: 'https://www.weatherapi.com/' }, { headers: { 'Cache-Control': 'public, max-age=1800' } });
        }
      } catch { /* fall through to free providers */ }
    }
    return metNorwayForecast(lat, lon, u.origin, waitUntil);
  }
  const cache = typeof caches === 'undefined' ? undefined : caches.default; const key = new Request(`${u.origin}/api/weather?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`); const cached = await readEdgeCache(cache, key); if (cached) return cached;
  try {
    const headers = { 'User-Agent': 'OpenCourts.us (https://opencourts.us; hello@opencourts.us)', 'Accept': 'application/geo+json' };
    const point = await fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers, signal: AbortSignal.timeout(12000) }); if (!point.ok) return Response.json({ error: 'Forecast unavailable for this location.' }, { status: 502 });
    const pointData: any = await point.json(); const properties = pointData.properties ?? {}; const forecastUrl = properties.forecastHourly;
    if (!forecastUrl) return Response.json({ periods: [], outlook: [], timeZone: properties.timeZone || 'America/New_York' });
    const [hourlyResponse, dailyResponse, gridDataResponse] = await Promise.all([
      fetch(forecastUrl, { headers, signal: AbortSignal.timeout(12000) }),
      properties.forecast ? fetch(properties.forecast, { headers, signal: AbortSignal.timeout(12000) }) : Promise.resolve(null),
      properties.forecastGridData ? fetch(properties.forecastGridData, { headers, signal: AbortSignal.timeout(5000) }).catch(() => null) : Promise.resolve(null),
    ]);
    if (!hourlyResponse.ok) return Response.json({ error: 'Forecast temporarily unavailable.' }, { status: 502 });
    const [hourly, daily, gridData] = await Promise.all([hourlyResponse.json() as Promise<any>, dailyResponse?.ok ? dailyResponse.json() as Promise<any> : Promise.resolve(null), gridDataResponse?.ok ? gridDataResponse.json().catch(() => null) : Promise.resolve(null)]);
    const humidityValues = gridData?.properties?.relativeHumidity?.values ?? [];
    const mapPeriod = (p: any) => {
      const humidity = humidityForTime(humidityValues, p.startTime);
      const winterRisk = forecastWinterRisk(p.shortForecast);
      return { time: p.startTime, endTime: p.endTime, temp: p.temperature, wind: parseInt(p.windSpeed, 10) || 0, precip: p.probabilityOfPrecipitation?.value ?? 0, ...(humidity === undefined ? {} : { humidity }), ...(winterRisk ? { winterRisk } : {}), short: p.shortForecast, icon: p.icon };
    };
    const periods = (hourly.properties?.periods ?? []).slice(0, 168).map(mapPeriod);
    const outlook = (daily?.properties?.periods ?? []).map(mapPeriod);
    const response = Response.json({ periods, outlook, timeZone: properties.timeZone || 'America/New_York' }, { headers: { 'Cache-Control': 'public, max-age=1800' } }); writeEdgeCache(cache, key, response, waitUntil); return response;
  } catch { return Response.json({ error: 'Weather forecast is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
};

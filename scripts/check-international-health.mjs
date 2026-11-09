// Read-only checks against the deployed API; no provider keys are needed here.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const value = flag => { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; };
const origin = new URL(value('--base-url') || 'https://opencourts.pages.dev').origin;
const basicCases = [
  ['Tokyo', 35.6768601, 139.7638947, 'jp'], ['Paris', 48.8588897, 2.3200410, 'fr'],
  ['Madrid', 40.4168, -3.7038, 'es'], ['Sydney', -33.8688, 151.2093, 'au'],
  ['Singapore', 1.3521, 103.8198, 'sg'], ['Johannesburg', -26.2041, 28.0473, 'za'],
];
const extraCases = [
  ['London', 51.5074, -0.1278, 'gb'], ['Berlin', 52.52, 13.405, 'de'],
  ['Seoul', 37.5665, 126.978, 'kr'], ['Dubai', 25.2048, 55.2708, 'ae'],
  ['Sao Paulo', -23.5505, -46.6333, 'br'], ['Mexico City', 19.4326, -99.1332, 'mx'],
  ['Vancouver', 49.2827, -123.1207, 'ca'], ['Buenos Aires', -34.6037, -58.3816, 'ar'],
];
const cases = [...basicCases, ...(process.argv.includes('--extended') || value('--city') ? extraCases : [])]
  .filter(([name]) => !value('--city') || name.toLowerCase() === value('--city').toLowerCase());
if (!cases.length) throw new Error('Unknown --city; see the city list in this script');
const rounds = Number(value('--rounds') || 1);
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 3) throw new Error('--rounds must be 1, 2, or 3');
const results = [];
let failed = false;
// Bound concurrency to one city/two endpoints to avoid a provider traffic burst.
for (let round = 1; round <= rounds; round++) for (const [city, lat, lon, country] of cases) {
  await Promise.all(['courts', 'weather'].map(async endpoint => {
    const url = new URL(`/api/${endpoint}`, origin);
    url.search = new URLSearchParams({ lat, lon, ...(endpoint === 'courts' ? { country } : { provider: 'met' }) }).toString();
    const start = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (endpoint === 'courts') {
        if (!Array.isArray(data.elements) || !data.elements.length) throw new Error('No mapped court results for this test city');
        if (data.stale) throw new Error('Saved results available, but live refresh is degraded');
        if (!data.elements.every(item => Number.isFinite(item.lat ?? item.center?.lat) && Number.isFinite(item.lon ?? item.center?.lon))) throw new Error('Court coordinates are missing or invalid');
      } else {
        if (!Array.isArray(data.periods) || !data.periods.some(period => Date.parse(period.endTime || period.time) > Date.now())) throw new Error('No future forecast periods');
        if (!data.timeZone) throw new Error('Missing forecast time zone');
        new Intl.DateTimeFormat('en', { timeZone: data.timeZone });
        if (!data.periods.every(period => Number.isFinite(Date.parse(period.time)) && Number.isFinite(period.temp) && Number.isFinite(period.wind))) throw new Error('Invalid forecast timestamp, temperature, or wind');
      }
      const result = { city, round, endpoint, ok: true, ms: Date.now() - start, count: data.elements?.length ?? data.periods?.length, source: data.source || data.catalog?.region };
      results.push(result); console.log(JSON.stringify(result));
    } catch (error) {
      failed = true;
      const result = { city, round, endpoint, ok: false, ms: Date.now() - start, error: error.message };
      results.push(result); console.error(JSON.stringify(result));
    }
  }));
}
if (value('--report')) {
  const file = path.resolve(value('--report'));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ origin, checkedAt: new Date().toISOString(), passed: results.filter(result => result.ok).length, failed: results.filter(result => !result.ok).length, results }, null, 2) + '\n');
}
if (failed) process.exitCode = 1;

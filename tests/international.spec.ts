import { test, expect } from '@playwright/test';

test('Tokyo shows forecast recommendations without calling US weather or rain services', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.addInitScript(() => localStorage.setItem('opencourts-place-v2', JSON.stringify({ label: 'Tokyo, Japan', lat: 35.68, lon: 139.69, countryCode: 'jp' })));
  const start = Math.floor(Date.now() / 3600_000) * 3600_000;
  const periods = Array.from({ length: 72 }, (_, i) => ({ time: new Date(start + i * 3600_000).toISOString(), endTime: new Date(start + (i + 1) * 3600_000).toISOString(), temp: 65, wind: 5, precip: 20, short: 'Partly cloudy', icon: '' }));
  await page.route('**/api/courts?**', route => route.fulfill({ json: { elements: [{ type: 'node', id: 1, lat: 35.68, lon: 139.69, tags: { leisure: 'pitch', sport: 'tennis', name: 'Tokyo Park Courts', access: 'yes' } }] } }));
  await page.route('**/api/weather?**', route => route.fulfill({ json: { periods, timeZone: 'Asia/Tokyo', source: 'WeatherAPI' } }));
  await page.goto('/');
  await expect(page.locator('.dry-court-card')).toHaveCount(1);
  await expect(page.locator('.dry-court-card')).toContainText('FORECAST');
  await expect(page.locator('.dry-court-card')).toContainText('20% average hourly rain chance');
  await expect(page.locator('.dry-court-card')).not.toContainText('Radar');
  await expect(page.locator('.dry-rain-timeline')).toHaveCount(0);
  await expect(page.locator('.weather-source')).toContainText('WeatherAPI');
  await page.locator('.dry-court-name').click();
  await expect(page.locator('.court-detail-radar')).toContainText('AREA RAIN FORECAST');
  await expect(page.locator('.court-detail-radar')).not.toContainText('Radar');
  expect(requests.filter(url => /\/api\/(rain|weather-alerts|court-context)(?:\?|$)/.test(url))).toEqual([]);
  expect(requests.some(url => url.includes('/api/weather?') && url.includes('provider=met'))).toBe(true);
  expect(requests.some(url => url.includes('/api/courts?') && url.includes('country=jp'))).toBe(true);
});

for (const place of [
  { label: 'Tokyo, Japan', lat: 35.6768601, lon: 139.7638947, countryCode: 'jp', region: 'Tokyo', timeZone: 'Asia/Tokyo' },
  { label: 'Paris, France', lat: 48.8588897, lon: 2.3200410, countryCode: 'fr', region: 'Paris', timeZone: 'Europe/Paris' },
]) {
test(`fresh ${place.region} search loads the actual imported catalog through the local API`, async ({ page }) => {
  await page.addInitScript(place => localStorage.setItem('opencourts-place-v2', JSON.stringify(place)), place);
  // Weather is independent of this catalog regression; the courts route is real.
  await page.route('**/api/weather?**', route => route.fulfill({ json: { periods: [], timeZone: place.timeZone } }));
  const responsePromise = page.waitForResponse(response => response.url().includes('/api/courts?'));
  await page.goto('/');
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.catalog.region).toBe(place.region);
  expect(body.elements.length).toBeGreaterThan(10);
  await expect(page.locator('.result-meta')).toContainText(/\d+ courts/);
  await expect(page.locator('.court-list-card').first()).toBeVisible();
  await expect(page.locator('.result-meta')).not.toContainText('unavailable');
});
}

test('international saved listings remain visible with an outage notice', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('opencourts-place-v2', JSON.stringify({ label: 'Madrid, Spain', lat: 40.4168, lon: -3.7038, countryCode: 'es' })));
  await page.route('**/api/courts?**', route => route.fulfill({ json: { stale: true, dataUpdatedAt: new Date(Date.now() - 7 * 3600_000).toISOString(), elements: [{ type: 'node', id: 1, lat: 40.4168, lon: -3.7038, tags: { leisure: 'pitch', sport: 'tennis', name: 'Saved Tennis Courts', access: 'yes' } }] } }));
  await page.route('**/api/weather?**', route => route.fulfill({ json: { periods: [], timeZone: 'Europe/Madrid' } }));
  await page.goto('/');
  await expect(page.locator('.result-meta')).toContainText('1 court');
  await expect(page.locator('.court-list-card')).toContainText('Saved Tennis Courts');
  await expect(page.getByText('Showing saved court listings while live updates are unavailable. Confirm access and amenities before visiting.')).toBeVisible();
});

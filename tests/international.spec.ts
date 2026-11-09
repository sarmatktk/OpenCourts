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

import { test, expect } from '@playwright/test';

test('visitor can search for a city and use lighting filter', async ({ page }) => {
  await page.route('**/api/geocode?**', route => route.fulfill({ json: { result: { display_name: 'Austin, Texas', lat: '30.2672', lon: '-97.7431' } } }));
  await page.route('**/api/courts?**', route => route.fulfill({ json: { elements: [{ type: 'node', id: 42, lat: 30.2672, lon: -97.7431, tags: { leisure: 'pitch', name: 'Test Public Courts', sport: 'tennis', lit: 'yes' } }] } }));
  await page.route('**/api/court-context', route => route.fulfill({ json: { elements: [] } }));
  await page.route('**/api/weather?**', route => route.fulfill({ json: { periods: [] } }));
  await page.route('**/api/weather-alerts?**', route => route.fulfill({ json: { supported: false, alerts: [] } }));
  await page.route('**/api/rain', route => route.fulfill({ json: { assessments: [] } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /find public tennis courts near you/i })).toBeVisible();
  const search = page.getByRole('searchbox', { name: /search by address, city, or ZIP code/i });
  await search.fill('Austin, Texas');
  await page.getByRole('button', { name: /find courts/i }).click();
  await expect(page.getByRole('heading', { name: /Austin, Texas/i })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.result-meta')).toContainText('1 court');
  const lightingFilter = page.getByRole('button', { name: 'With lights' });
  await lightingFilter.click();
  await expect(lightingFilter).toHaveAttribute('aria-pressed', 'true');
});

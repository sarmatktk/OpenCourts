import { test, expect } from '@playwright/test';

test('visitor can search for a city and use lighting filter', async ({ page }) => {
  await page.route('**/api/geocode?**', route => route.fulfill({ json: { result: { display_name: 'Austin, Texas', lat: '30.2672', lon: '-97.7431' } } }));
  await page.route('**/api/courts?**', route => route.fulfill({ json: { elements: [{ type: 'node', id: 42, lat: 30.2672, lon: -97.7431, tags: { name: 'Test Public Courts', sport: 'tennis', lit: 'yes' } }] } }));
  await page.route('**/api/weather?**', route => route.fulfill({ json: { periods: [] } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /your next court is/i })).toBeVisible();
  const search = page.getByRole('textbox', { name: /search by city/i });
  await search.fill('Austin, Texas');
  await page.getByRole('button', { name: /find courts/i }).click();
  await expect(page.getByRole('heading', { name: /Austin, Texas/i })).toBeVisible({ timeout: 15000 });
  const lightingFilter = page.getByRole('button', { name: 'Lighted courts', exact: true });
  await lightingFilter.click();
  await expect(lightingFilter).toHaveAttribute('aria-pressed', 'true');
});

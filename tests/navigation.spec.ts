import { expect, test } from '@playwright/test';

const courts = [
  { type: 'node', id: 101, lat: 38.8462, lon: -77.3064, tags: { leisure: 'pitch', sport: 'tennis', name: 'Park Court', lit: 'yes', access: 'yes' } },
  { type: 'node', id: 102, lat: 38.8472, lon: -77.3064, tags: { leisure: 'pitch', sport: 'tennis', name: 'School Court', lit: 'no' } },
  { type: 'node', id: 103, lat: 38.8482, lon: -77.3064, tags: { leisure: 'pitch', sport: 'tennis', name: 'Community Court' } },
];

test.beforeEach(async ({ page }) => {
  const start = Date.now() - 60 * 60_000;
  const periods = Array.from({ length: 72 }, (_, index) => ({
    time: new Date(start + index * 60 * 60_000).toISOString(),
    endTime: new Date(start + (index + 1) * 60 * 60_000).toISOString(),
    temp: 64, wind: 5, precip: 2, humidity: 45, short: 'Partly Sunny', icon: '',
  }));
  await page.route('**/api/courts?**', route => route.fulfill({ json: { elements: courts } }));
  await page.route('**/api/court-context', route => route.fulfill({ json: { elements: [] } }));
  await page.route('**/api/weather?**', route => route.fulfill({ json: { periods, timeZone: 'America/New_York' } }));
  await page.route('**/api/weather-alerts?**', route => route.fulfill({ json: { supported: false, alerts: [] } }));
  await page.route('**/api/rain', route => route.fulfill({ json: { assessments: [] } }));
});

for (const width of [320, 393, 768, 1280]) {
  test(`main page fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(page.locator('.current-weather-hero')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test('mobile navigation and court actions lead to the intended views', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await expect(page.locator('.result-meta')).toContainText('3 courts');

  const quickNav = page.getByRole('navigation', { name: 'Quick navigation' });
  await quickNav.getByRole('button', { name: 'Show court list' }).click();
  await expect(page.locator('#explore')).toHaveClass(/list-open/);
  await page.locator('.court-list-card').first().click();
  await expect(page.locator('#explore')).not.toHaveClass(/list-open/);
  await expect(page.getByRole('region', { name: 'Park Court' })).toBeVisible();
  await page.getByRole('button', { name: 'Close court details' }).click();

  await quickNav.getByRole('link', { name: 'Search courts' }).click();
  await expect(page.getByRole('searchbox', { name: 'Search by address, city, or ZIP code' })).toBeFocused();
  await quickNav.getByRole('link', { name: 'Dry courts' }).click();
  await expect(page).toHaveURL(/#rain-planner-title$/);
  await quickNav.getByRole('link', { name: 'Weather' }).click();
  await expect(page).toHaveURL(/#conditions$/);

  await quickNav.getByRole('button', { name: 'Show court list' }).click();
  await page.getByRole('button', { name: 'Center map on location' }).click();
  await expect(page.locator('#explore')).not.toHaveClass(/list-open/);
  await quickNav.getByRole('button', { name: 'Show court map' }).click();
  await expect(page.locator('#explore .map-panel')).toBeVisible();
});

test('filters and menu links work on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('button', { name: 'Show court list' }).click();
  await page.getByRole('button', { name: 'With lights' }).click();
  await expect(page.locator('.result-meta')).toContainText('1 court');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('.result-meta')).toContainText('3 courts');

  await page.getByRole('button', { name: 'Toggle menu' }).click();
  const menu = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(menu.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
  await menu.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.locator('nav.nav')).not.toHaveClass(/open/);
});

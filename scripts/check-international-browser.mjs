import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const value = flag => { const index = process.argv.indexOf(flag); return index < 0 ? undefined : process.argv[index + 1]; };
const baseURL = value('--base-url') || 'http://localhost:5173';
const cases = [
  ['Tokyo',35.6768601,139.7638947,'jp'],['Paris',48.8588897,2.3200410,'fr'],
  ['Madrid',40.4168,-3.7038,'es'],['Sydney',-33.8688,151.2093,'au'],
  ['Singapore',1.3521,103.8198,'sg'],['Johannesburg',-26.2041,28.0473,'za'],
  ['London',51.5074,-0.1278,'gb'],['Berlin',52.52,13.405,'de'],
  ['Seoul',37.5665,126.978,'kr'],['Dubai',25.2048,55.2708,'ae'],
  ['Sao Paulo',-23.5505,-46.6333,'br'],['Mexico City',19.4326,-99.1332,'mx'],
  ['Vancouver',49.2827,-123.1207,'ca'],['Buenos Aires',-34.6037,-58.3816,'ar'],
];
const executablePath = process.env.OPENCOURTS_CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
const results = [];
try {
  for (const [city,lat,lon,countryCode] of cases) {
    const context = await browser.newContext({ viewport: {width:393,height:852} });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(place => localStorage.setItem('opencourts-place-v2',JSON.stringify(place)), {label:city,lat,lon,countryCode});
    try {
      await page.goto(baseURL);
      await page.waitForFunction(() => !document.querySelector('.search-progress') && !document.querySelector('.skeleton-weather'), {}, { timeout:20000 });
      const result = await page.evaluate(() => ({
        results:document.querySelector('.result-meta')?.textContent,
        courtCards:document.querySelectorAll('.court-list-card').length,
        weatherCards:document.querySelectorAll('.weather-card').length,
        dryCourtCards:document.querySelectorAll('.dry-court-card').length,
        alerts:[...document.querySelectorAll('.error-box,.weather-error')].map(node=>node.textContent),
        overflow:document.documentElement.scrollWidth > window.innerWidth,
      }));
      results.push({city,...result,errors}); console.log(JSON.stringify(results.at(-1)));
    } catch(error) { results.push({city,error:error.message,errors}); console.log(JSON.stringify(results.at(-1))); }
    finally { await context.close(); }
  }
} finally { await browser.close(); }
const report = value('--report') || 'test-results/international-browser-health.json';
await mkdir(path.dirname(report), {recursive:true});
await writeFile(report, JSON.stringify(results,null,2)+'\n');
if (results.some(result=>result.error || result.errors.length || result.alerts?.length || result.overflow)) process.exitCode=1;

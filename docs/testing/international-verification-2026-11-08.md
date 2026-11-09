# International verification — November 8, 2026

Tests ran from the Windows development workspace. Local and published-site
results are intentionally separate. These checks are a point-in-time sample,
not proof of complete global court coverage or an availability SLA.

## Results

| Check | Result |
| --- | --- |
| Unit tests, including existing US regression tests | 147 passed |
| Full Playwright desktop/mobile suite | 11 passed |
| API checks against existing local server: 14 cities, courts + weather, two rounds | 56 passed |
| API checks against a separate freshly started local server: same cities, two rounds | 56 passed |
| Fresh mobile browser contexts with live local data | 14 cities loaded courts, weather, and forecast recommendations |
| Production weather checks | 6 passed |
| Production court checks | 6 failed with HTTP 503 |
| Production build | Passed |
| Provider-key exposure scan | Passed: 73 built/public/template files and staged template checked |
| Direct local HTTP request for `.env` | Blocked with 403; no provider key values returned |

## Countries and rendered court results

API checks validate HTTP/JSON results, coordinates, forecast timestamps, future
coverage, time-zone identifiers, and non-stale data. The browser check additionally
verifies that court filtering leaves rendered listings and that the page has no
JavaScript errors, loading error boxes, or horizontal overflow at 393 px width.

| City | Court listings after current filtering/grouping | Weather cards | Dry-court forecast cards |
| --- | ---: | ---: | ---: |
| Tokyo | 737 | 3 | 3 |
| Paris | 1,724 | 3 | 3 |
| Madrid | 11 | 3 | 3 |
| Sydney | 14 | 3 | 3 |
| Singapore | 11 | 3 | 3 |
| Johannesburg | 3 | 3 | 3 |
| London | 13 | 3 | 3 |
| Berlin | 11 | 3 | 3 |
| Seoul | 11 | 3 | 3 |
| Dubai | 1 | 3 | 1 |
| São Paulo | 1 | 3 | 1 |
| Mexico City | 1 | 3 | 1 |
| Vancouver | 7 | 3 | 3 |
| Buenos Aires | 11 | 3 | 3 |

Counts are observations, not expected permanent totals. Unknown access does not
mean confirmed public access. Geoapify's tennis-name query is not exhaustive;
the low counts in Dubai, São Paulo, and Mexico City are a coverage limitation.
Tokyo and Paris used imported OSM catalogs; the other cities used Geoapify.
WeatherAPI returned 72 hourly periods per city, consistent with the configured
three-day request. No seven-day international guarantee is implied.

The separate clean-server run had a maximum observed successful API response
time of 1,789 ms. This includes fresh first requests and fast repeat requests,
so its combined median is not a cold-provider latency metric. Third-party
providers may cache their own responses; the isolated Vite process started with
empty application memory caches.

## Defect found and fixed

The expanded language tests found that Unicode decomposition could reject a
Korean-only tennis name. The international adapter now recomposes text after
removing combining accents. The regression test for `테니스장` passes, alongside
English, Spanish, Portuguese, Japanese, Chinese, Cyrillic, Arabic, and Greek names.
No US routing or scoring behavior was changed for this correction.

Additional tests cover provider quota failures, complete outages, retained/stale
results, corrupted cache data, concurrent requests, retry cooldowns, empty provider
responses, and cancellation without replacing a new search with old results.

## Published-site failures remain

At `https://opencourts.pages.dev`, Tokyo, Paris, Madrid, Sydney, Singapore, and
Johannesburg weather checks passed using WeatherAPI. All six court endpoints
returned HTTP 503 in approximately 8.7 seconds. Local success must not be reported
as production success. Updated backend deployment and shared-cache setup remain
pending; see `docs/international-reliability.md`.

## Reproduce

```sh
npm test
npm run build
npx playwright test
node scripts/check-international-health.mjs --base-url http://localhost:5173 --extended --rounds 2
node scripts/check-international-health.mjs --base-url https://opencourts.pages.dev
node scripts/check-international-browser.mjs --base-url http://localhost:5173
```

The browser script uses system Chrome on Windows, or Playwright Chromium on
other platforms. Set `OPENCOURTS_CHROME_PATH` to choose another installed Chrome.
Provider keys must remain server-side in ignored `.env` or Cloudflare settings.
The isolated test server was stopped after verification; the user's original dev
server was left running.

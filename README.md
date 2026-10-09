# OpenCourts

OpenCourts is a map-first public tennis court finder. It combines OpenStreetMap court features, a MapLibre map, OpenStreetMap Nominatim place search, and National Weather Service hourly forecasts. No account or API key is required for the included setup.

## Run locally

```sh
npm install
npm run dev
```

The Vite development server hosts the interface and forwards `/api/geocode`, `/api/courts`, and `/api/weather` to the same Pages Function handlers used in production. After building, `npm run preview` runs the built site and functions through Wrangler Pages.

```sh
npm run build
npm test
```

`npm run test:e2e` runs the Playwright search flow. Install a browser once with `npx playwright install chromium`.

## Data and providers

- **Court features:** OpenStreetMap through a Cloudflare Pages Function proxy to Overpass. The function limits searches to a regional bounding box, caches successful responses at the edge for 30 minutes, and tries a second public Overpass instance if the first is unavailable. Court coverage depends on OSM mapping and is not guaranteed complete.
- **Maps:** MapLibre GL JS and OpenFreeMap's hosted Liberty vector style. The map UI includes OpenStreetMap attribution. Follow the tile provider's current usage and attribution terms before scaling traffic.
- **Place search:** User-submitted searches go through a Cloudflare Pages Function to OpenStreetMap's Nominatim geocoder; repeat searches are cached. Search is not autocomplete. Nominatim's public service has a strict shared limit of one request per second and is intended for moderate user-triggered traffic. For higher volume, configure a geocoding provider with suitable production terms or host your own Nominatim service before launch. See https://operations.osmfoundation.org/policies/nominatim/.
- **Weather:** NWS hourly forecasts via a Cloudflare Pages Function. A location's coordinates are sent to api.weather.gov. NWS support varies by location and API availability.
- **Play score:** A simple 0–100 heuristic based on forecast temperature, wind, and precipitation probability. It is guidance, not a guarantee; it does not account for humidity, court surface, or sunset.

The frontend uses the same origin for the Pages Functions. No secret keys are embedded in the browser and `.env` configuration is not required.

## Cloudflare Pages deployment

1. Push this directory to a GitHub repository.
2. In Cloudflare, create a Pages project connected to that repository.
3. Set the framework preset to **Vite**, build command to `npm run build`, and output directory to `dist`. Use Node 20 or newer.
4. Deploy. Cloudflare Pages automatically publishes the `functions/` endpoints alongside the static assets.
5. Add `opencourts.us` in the Pages project's **Custom domains** settings. Follow Cloudflare's DNS setup instructions and verify both apex and `www` routing if you use both.

No Worker binding, D1 database, KV namespace, or API key is needed. Cloudflare's edge cache is used opportunistically for upstream results; responses remain usable when that cache is unavailable.

## Project structure

```text
src/                 React application, styles, data normalization, API client
functions/api/       Cloudflare Pages Functions for geocoding, court, and weather requests
public/              SEO files and privacy page
tests/               Unit tests and the Playwright search flow
```

## Notes

OpenStreetMap features are community contributed. Access, lighting, availability, and amenities can change and should be confirmed locally. The app makes no reservation or availability guarantees and does not offer booking or accounts.
"# OpenCourts" 

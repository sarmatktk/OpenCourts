# OpenCourts

OpenCourts is a map-first public tennis court finder. It combines OpenStreetMap court features, a MapLibre map, Photon place suggestions and OpenStreetMap Nominatim place search, and National Weather Service hourly forecasts. No account or API key is required for the included setup.

## Run locally

```sh
npm install
npm run dev
```

The Vite development server hosts the interface and runs `/api/geocode`, `/api/suggest`, `/api/courts`, `/api/rain`, and `/api/weather` through the Pages Function handlers locally. **You do not need a Cloudflare account or deployment to test the app.** After building, `npm run preview` runs the built site and functions through Wrangler Pages. If recent radar data is unavailable, the local error includes a diagnostic and the terminal logs `[OpenCourts] Radar rainfall query failed`. The radar route needs outbound access to NOAA's MRMS service. If your machine uses an HTTP proxy, environment-proxy support requires Node 22.21 or newer; otherwise the app uses your normal network connection.

```sh
npm run build
npm test
```

`npm run test:e2e` runs the Playwright search flow. Install a browser once with `npx playwright install chromium`.

## Data and providers

- **Court features:** OpenStreetMap through a Cloudflare Pages Function proxy to Overpass. The function limits searches to a regional bounding box, caches successful responses at the edge for 30 minutes, and tries alternate public Overpass instances if one is unavailable. It also finds nearby named parks, schools, and community centers for court labels, with named streets as a fallback, and looks for approximate addresses. Grouped court counts read the OSM `count=*` tag (plus legacy aliases); court names, counts, lighting, access, and coverage depend on OSM mapping and may be incomplete.
- **Maps:** MapLibre GL JS with OpenStreetMap raster tiles and visible OpenStreetMap attribution. Follow the tile provider's usage policy; for commercial or high-traffic use, select a tile provider and plan that supports your expected usage.
- **Place search:** Typing at least three characters shows debounced suggestions from Photon; selecting one searches courts at that location. Submitting without selecting a suggestion uses OpenStreetMap's Nominatim geocoder through a Cloudflare Pages Function, with repeat searches cached. Nominatim's public service has a strict shared limit of one request per second and forbids autocomplete, so it is used only for a submitted search. Photon supports search-as-you-type; for high traffic, follow its service guidance or configure a provider with suitable production terms. See https://github.com/komoot/photon and https://operations.osmfoundation.org/policies/nominatim/.
- **Weather:** NWS hourly and 12-hour forecast periods (up to seven days) via a Cloudflare Pages Function. A location's coordinates are sent to api.weather.gov. NWS support varies by location and API availability.
- **Play planner:** Shows multiple non-overlapping two-hour daytime options per day when the hourly forecast supports them, ranked by temperature, wind, and precipitation probability. It falls back to the best available hour when a full two-hour slot is unavailable. A separate rain planner samples NOAA/NWS MRMS one-, three-, and six-hour precipitation estimates at up to 50 nearby court coordinates, then ranks courts with less recent radar rain first. Selecting a court outside that nearby set triggers an on-demand radar sample for that court. Radar estimates are about 1 km resolution; scores and low/moderate confidence labels do not confirm that a surface is dry. Actual drying depends on drainage, shade, surface, and maintenance. Courts marked fee-based, private, member-only, or named as clubs are excluded; untagged access may still need confirmation. Lighting and address data come from OpenStreetMap and can be inaccurate or incomplete.
- **Mobile court browsing:** Phone users can switch between map and list views. Choosing a court in the list returns to the map and centers the selected court; map popups include available count, address, amenities, rain estimate, and directions.

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
functions/api/       Cloudflare Pages Functions for geocoding, courts, rain estimates, and weather
public/              SEO files and privacy page
tests/               Unit tests and the Playwright search flow
```

## Notes

OpenStreetMap features are community contributed. Access, lighting, availability, and amenities can change and should be confirmed locally. The app makes no reservation or availability guarantees and does not offer booking or accounts.

# OpenCourts

OpenCourts is a map-first public tennis court finder. It combines OpenStreetMap court features, a MapLibre map, Photon place suggestions and OpenStreetMap Nominatim place search, and National Weather Service hourly forecasts. No account or API key is required for the included setup.

## Run locally

```sh
npm install
npm run dev
```

The Vite development server hosts the interface and runs `/api/geocode`, `/api/suggest`, `/api/courts`, `/api/court-context`, `/api/rain`, `/api/weather`, and `/api/weather-alerts` through the Pages Function handlers locally. Winter and heat forecasts use live National Weather Service data; `npm test` includes deterministic checks for them. To preview the interface without waiting for unusual weather, run `npm run dev` and open `http://localhost:5173/?winterDemo=snow`, `http://localhost:5173/?winterDemo=ice`, or `http://localhost:5173/?heatDemo=1`. These preview options simulate forecast conditions locally; the heat option also shows a clearly marked sample Heat Advisory. They only work in Vite development mode and do not affect production builds or API data. Without a `COURTS_DB` binding, local court searches use the public Overpass fallback, so local dev can still encounter the same upstream outages. **You do not need a Cloudflare account or deployment to test the app.** After building, `npm run preview` runs the built site and functions through Wrangler Pages. If recent radar data is unavailable, the visitor sees a short message; local diagnostics are written to the terminal. The radar route needs outbound access to NOAA's MRMS service. If your machine uses an HTTP proxy, environment-proxy support requires Node 22.21 or newer; otherwise the app uses your normal network connection.

```sh
npm run build
npm test
```

`npm run test:e2e` runs the Playwright search flow. Install a browser once with `npx playwright install chromium`.

## Data and providers

- **Court features:** When configured, `/api/courts` checks Cloudflare's edge cache, then reads a preloaded nationwide OpenStreetMap tennis-court catalog from Cloudflare D1 using an indexed latitude/longitude range query. The monthly import also precomputes the closest mapped street and named park, school, or community place for each court, so U.S. catalog searches do not rely on a live Overpass request for those labels. If D1 returns no courts for an area or the query fails, the site falls back to global Overpass providers; searches outside the U.S. catalog can also use the optional live context lookup. Successful responses are cached at the edge for six hours. Failed imports leave the last published catalog intact. Grouped court counts read the OSM `count=*` tag (plus legacy aliases). Names, counts, lighting, access, and coverage depend on OSM mapping and may be incomplete.
- **Maps:** MapLibre GL JS with OpenStreetMap raster tiles and visible OpenStreetMap attribution. Follow the tile provider's usage policy; for commercial or high-traffic use, select a tile provider and plan that supports your expected usage.
- **Place search:** Typing at least three characters shows debounced suggestions from Photon; selecting one searches courts at that location. Submitting without selecting a suggestion uses OpenStreetMap's Nominatim geocoder through a Cloudflare Pages Function, with repeat searches cached. Nominatim's public service has a strict shared limit of one request per second and forbids autocomplete, so it is used only for a submitted search. Photon supports search-as-you-type; for high traffic, follow its service guidance or configure a provider with suitable production terms. See https://github.com/komoot/photon and https://operations.osmfoundation.org/policies/nominatim/.
- **Weather:** NWS hourly and 12-hour forecast periods (up to seven days) via a Cloudflare Pages Function. A location's coordinates are sent to api.weather.gov. NWS support varies by location and API availability.
- **Play planner:** Shows multiple non-overlapping two-hour daytime options per day when the hourly forecast supports them, ranked by temperature, wind, and precipitation probability. It falls back to the best available hour when a full two-hour slot is unavailable. A separate rain planner samples NOAA/NWS MRMS one-, three-, and six-hour precipitation estimates at up to 50 nearby court coordinates in batches of ten, then ranks courts with less recent radar rain first. Selecting a court outside that nearby set triggers an on-demand radar sample for that court. Radar estimates are about 1 km resolution; scores and low/moderate confidence labels do not confirm that a surface is dry. Actual drying depends on drainage, shade, surface, and maintenance. Courts marked fee-based, private, member-only, or named as clubs are excluded; untagged access may still need confirmation. Lighting and address data come from OpenStreetMap and can be inaccurate or incomplete.
- **Mobile court browsing:** Phone users can switch between map and list views. Choosing a court in the list returns to the map and centers the selected court; map popups include available count, address, amenities, rain estimate, and directions.

The frontend uses the same origin for the Pages Functions. No secret keys are embedded in the browser and `.env` configuration is not required.

## Cloudflare Pages deployment

1. Push this directory to a GitHub repository.
2. In Cloudflare, create a Pages project connected to that repository.
3. Set the framework preset to **Vite**, build command to `npm run build`, and output directory to `dist`. Use Node 20 or newer.
4. Deploy. Cloudflare Pages automatically publishes the `functions/` endpoints alongside the static assets.
5. Add `opencourts.us` in the Pages project's **Custom domains** settings. Follow Cloudflare's DNS setup instructions and verify both apex and `www` routing if you use both.

### Enable the D1 court catalog

The existing Overpass fallback remains active until a D1 binding is added. To use the catalog in production:

1. Create a D1 database named `opencourts-courts` in Cloudflare.
2. Apply the schema from the repository root:

   ```sh
   npx wrangler d1 execute opencourts-courts --remote --file=functions/db/migrations/0001_create_tennis_courts.sql
   ```

3. Prepare a GeoJSON FeatureCollection (`.geojson`) or GeoJSON Text Sequence (`.geojsonseq`) from an OpenStreetMap regional extract. It must retain OSM type/id, geometry, and tags. Filter the PBF to tennis facilities and export it with Osmium; for example:

   ```sh
   osmium tags-filter region.osm.pbf 'nwr/sport=*tennis*' -o tennis-sites.osm.pbf
   osmium export tennis-sites.osm.pbf -f geojsonseq --attributes=type,id -o courts.geojsonseq
   ```

   `osmium tags-filter` keeps referenced geometry needed for ways and relations. The importer then keeps only tennis-tagged facilities. For wide U.S. coverage, process regional extracts and pass each output as another `--input` argument. Osmium's GeoJSON export may need substantial memory for large extracts; start with the regions you need. Geofabrik provides current OpenStreetMap extracts, and Osmium documents the filter/export commands at https://download.geofabrik.de/north-america.html and https://docs.osmcode.org/osmium/latest/.

4. From a machine with Wrangler authenticated to the correct Cloudflare account, import and publish the catalog:

   ```sh
   npm run import:courts -- --input courts.geojsonseq --execute --database opencourts-courts
   ```

   To combine regions, repeat `--input`, for example `--input northeast.geojsonseq --input south.geojsonseq`. Without `--execute`, the script only generates reviewable SQL files under `.court-catalog-import/`. It refuses an empty catalog and keeps the previous live table until all import chunks have completed.

5. In the Pages project, open **Settings → Functions → D1 database bindings**, add a binding named `COURTS_DB`, select `opencourts-courts`, save, and redeploy. Import the catalog before enabling this binding. Searches outside its coverage can use the live Overpass fallback.

This uses D1 for court records and compact precomputed context labels; forecasts and radar estimates remain live weather-service calls. The D1 Free allowance is finite, so check database row read/write metrics during the first nationwide import; an import may need to be split across days if it reaches the daily write allowance. The GitHub Actions workflow at `.github/workflows/refresh-court-catalog.yml` downloads the four Geofabrik U.S. regions plus the Pacific special region, filters tennis courts and nearby-context feature types, and stores only the enriched court records in D1. Run it manually for the first nationwide import; it refreshes monthly afterward. Add repository secrets named `CLOUDFLARE_API_TOKEN` (with D1 edit access) and `CLOUDFLARE_ACCOUNT_ID`, push the workflow to the default branch, then open **Actions → Refresh court catalog → Run workflow**. Regional extracts can overlap; the importer deduplicates courts by OSM type and ID before publishing. The context labels add only a few short strings per court, rather than storing the full road and park extracts in D1.

## Project structure

```text
src/                 React application, styles, data normalization, API client
functions/api/       Cloudflare Pages Functions for geocoding, courts, rain estimates, and weather
functions/db/        D1 schema migrations for the OSM court catalog
scripts/             Local catalog import tooling
public/              SEO files and privacy page
tests/               Unit tests and the Playwright search flow
```

## Notes

OpenStreetMap features are community contributed. Access, lighting, availability, and amenities can change and should be confirmed locally. The app makes no reservation or availability guarantees and does not offer booking or accounts.

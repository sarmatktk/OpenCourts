# OpenCourts

**Deployment architecture — November 27, 2026:** Production Pages is static-only
and the API is deployed separately as `opencourts-api-production` on
`opencourts.us/api/*`. Current deployment IDs, the backend/frontend boundary,
release commands and rollback steps are in the
[deployment architecture handoff](docs/DEPLOYMENT_ARCHITECTURE.md). The detailed
[separation log](docs/FRONTEND_BACKEND_SEPARATION_LOG.md) records migration
decisions and dated evidence. The native iOS app has its own Xcode/store release
workflow; see the [iOS app handover](ios-app/IOS_APP_HANDOVER.md).

Coding agents must start with [`AGENTS.md`](AGENTS.md); it points to the one
current [deployment procedure](docs/DEPLOYMENT_WORKFLOW.md) and explains the
separate frontend, backend, database, and native-app release boundaries.

The current Play Together source is on `feature/play-together`; its stable
Preview is `https://feature-play-together.opencourts.pages.dev`. See the
[Play Together handoff](docs/PLAY_TOGETHER_HANDOFF.md) and
[Production issue handover](docs/PRODUCTION_ISSUE_HANDOVER.md) for acceptance
checks and active incidents.

**Continuing Play Together with another agent? Start with the
[development handoff and next steps](docs/PLAY_TOGETHER_HANDOFF.md).**

Current development Preview includes accounts, all three game audiences, groups/roles,
guest participation, sharing, opt-in discovery and safety reporting. See the
[current handoff](docs/PLAY_TOGETHER_HANDOFF.md) and
[remaining release checks](docs/PLAY_TOGETHER_RELEASE_CHECKLIST.md).
Production and Preview use separate deployment and database bindings; the current
Production deployment and outstanding acceptance checks are recorded in the
[Production issue handover](docs/PRODUCTION_ISSUE_HANDOVER.md).

Known cross-platform failures, root causes, mitigations and remaining risks are
indexed in the [known issues and risk register](docs/KNOWN_ISSUES_AND_FIXES.md).

International provider, cache, coverage, and rollout details are documented in
[International reliability](docs/international-reliability.md). US behavior is
preserved separately from this international data path.

OpenCourts is a map-first public tennis court finder. It combines OpenStreetMap court features, a MapLibre map, Photon place suggestions and OpenStreetMap Nominatim place search, and National Weather Service hourly forecasts. Browsing courts does not require an account or API key. Play Together accounts are required for games, groups, player discovery, and messaging.

[Play Together product decisions, architecture, and progress](docs/PLAY_TOGETHER.md)
are maintained as the central reference for the community features.

## Run locally

For isolated Play Together development with local D1, see
[the development setup and preview approval checklist](docs/play-together-development.md).
Local Vite handlers do not forward requests to the production OpenCourts API.

```sh
npm install
npm run dev
```

The Vite development server hosts the interface and routes `/api/geocode`, `/api/suggest`, `/api/courts`, `/api/court-context`, `/api/rain`, `/api/weather`, and `/api/weather-alerts` to the shared handlers locally. Production requests go to the separately deployed API Worker. Winter and heat forecasts use live National Weather Service data; `npm test` includes deterministic checks for them. To preview the interface without waiting for unusual weather, run `npm run dev` and open `http://localhost:5173/?winterDemo=snow`, `http://localhost:5173/?winterDemo=ice`, or `http://localhost:5173/?heatDemo=1`. These preview options simulate forecast conditions locally; the heat option also shows a clearly marked sample Heat Advisory. They only work in Vite development mode and do not affect production builds or API data. Without a `COURTS_DB` binding, local court searches use the public Overpass fallback, so local dev can still encounter the same upstream outages. **You do not need a Cloudflare account or deployment to test the app.** After building, `npm run preview` runs the built site and local function handlers through Wrangler Pages. If recent radar data is unavailable, the visitor sees a short message; local diagnostics are written to the terminal. The radar route needs outbound access to NOAA's MRMS service. If your machine uses an HTTP proxy, environment-proxy support requires Node 22.21 or newer; otherwise the app uses your normal network connection.

```sh
npm run build
npm test
```

`npm run test:e2e` runs the Playwright search flow. Install a browser once with `npx playwright install chromium`.

## Data and providers

- **Court features:** When configured, `/api/courts` checks Cloudflare's edge cache, then reads a preloaded nationwide OpenStreetMap tennis-court catalog from Cloudflare D1 using an indexed latitude/longitude range query. The monthly import also precomputes the closest mapped street and named park, school, or community place for each court, so U.S. catalog searches do not rely on a live Overpass request for those labels. If D1 returns no courts for an area or the query fails, the site falls back to global Overpass providers; searches outside the U.S. catalog can also use the optional live context lookup. Successful responses are cached at the edge for six hours. Failed imports leave the last published catalog intact. Grouped court counts read the OSM `count=*` tag (plus legacy aliases). Names, counts, lighting, access, and coverage depend on OSM mapping and may be incomplete.
- **Maps:** MapLibre GL JS with OpenStreetMap raster tiles and visible OpenStreetMap attribution. Follow the tile provider's usage policy; for commercial or high-traffic use, select a tile provider and plan that supports your expected usage.
- **Place search:** Typing at least three characters shows debounced suggestions from Photon; selecting one searches courts at that location. Submitting without selecting a suggestion uses OpenStreetMap's Nominatim geocoder through the same-origin API, with repeat searches cached. Nominatim's public service has a strict shared limit of one request per second and forbids autocomplete, so it is used only for a submitted search. Photon supports search-as-you-type; for high traffic, follow its service guidance or configure a provider with suitable production terms. See https://github.com/komoot/photon and https://operations.osmfoundation.org/policies/nominatim/.
- **Weather:** NWS hourly and 12-hour forecast periods (up to seven days) via the same-origin API. A location's coordinates are sent to api.weather.gov. NWS support varies by location and API availability.
- **Play planner:** Shows every available forecast period from estimated local sunrise to sunset each day, grouping adjacent hours into two-hour blocks where possible, with scores based on temperature, wind, and precipitation probability. Rainy and low-scoring periods remain visible. Consecutive low-scoring hours are summarized by their leading condition (rain, snow, ice, heat, wind, or cold); other hours remain in two-hour blocks where possible. A separate rain planner samples NOAA/NWS MRMS one-, three-, and six-hour precipitation estimates at up to 50 nearby court coordinates in batches of ten, then ranks courts with less recent radar rain first. Selecting a court outside that nearby set triggers an on-demand radar sample for that court. Radar estimates are about 1 km resolution; scores and low/moderate confidence labels do not confirm that a surface is dry. Actual drying depends on drainage, shade, surface, and maintenance. Courts marked fee-based, private, member-only, or named as clubs are excluded; untagged access may still need confirmation. Lighting and address data come from OpenStreetMap and can be inaccurate or incomplete.
- **Mobile court browsing:** Phone users can switch between map and list views. Choosing a court in the list returns to the map and centers the selected court; map popups include available count, address, amenities, rain estimate, and directions.

The frontend and API use the same public origin. No secret keys are embedded in the browser and `.env` configuration is not required.

## Production deployment

Follow the [deployment architecture handoff](docs/DEPLOYMENT_ARCHITECTURE.md)
and [deployment workflow](docs/DEPLOYMENT_WORKFLOW.md). Production website
releases build and publish static assets only; API Worker releases use the
separate `backend/wrangler.jsonc` configuration. Do not deploy from the
repository root as a substitute for the frontend-only release command.

### Court catalog maintenance

The court catalog is already served by the Production API Worker, which is bound
to the Production D1 database. The following is catalog import/refresh context,
not a Production deployment procedure. For releases, migrations, or environment
changes, use the canonical [deployment workflow](docs/DEPLOYMENT_WORKFLOW.md)
and obtain the required Production authorization.

The schema and Production binding are already provisioned. Do not create a
database or apply the initial schema as part of ordinary releases. The existing
GitHub Actions workflow `.github/workflows/refresh-court-catalog.yml` handles
the monthly catalog refresh. For a one-off catalog refresh, review the current
workflow and repository authorization before using its manual dispatch; it
updates Production court data and is not a frontend/API deployment.

For contributor-created regional imports, prepare GeoJSON FeatureCollections
(`.geojson`) or GeoJSON Text Sequences (`.geojsonseq`) from OpenStreetMap
extracts. Retain OSM type/id, geometry, and tags. Filter the PBF to tennis
facilities and export it with Osmium; for example:

```sh
osmium tags-filter region.osm.pbf 'nwr/sport=*tennis*' -o tennis-sites.osm.pbf
osmium export tennis-sites.osm.pbf -f geojsonseq --attributes=type,id -o courts.geojsonseq
```

`osmium tags-filter` keeps referenced geometry needed for ways and relations.
The importer then keeps only tennis-tagged facilities. For wide U.S. coverage,
process regional extracts and pass each output as another `--input` argument.
Osmium's GeoJSON export may need substantial memory for large extracts; start
with the regions you need. Geofabrik provides current OpenStreetMap extracts,
and Osmium documents the filter/export commands at
https://download.geofabrik.de/north-america.html and
https://docs.osmcode.org/osmium/latest/.

For general Production/Preview releases or backend/database changes, use the
single current [deployment workflow](docs/DEPLOYMENT_WORKFLOW.md). Do not copy
remote mutation commands from historical notes into a release.

This uses D1 for court records and compact precomputed context labels; forecasts
and radar estimates remain live weather-service calls. The D1 Free allowance is
finite, so monitor database row read/write metrics during catalog refreshes.
The GitHub Actions workflow downloads Geofabrik U.S. regions, filters tennis
courts and nearby-context feature types, and stores enriched court records in
D1. Regional extracts can overlap; the importer deduplicates courts by OSM type
and ID before publishing. The context labels add only a few short strings per
court, rather than storing full road and park extracts in D1.

## Project structure

```text
src/                 React application, styles, data normalization, API client
backend/             Independently deployed API Worker and Wrangler environments
functions/api/       Shared API handlers; local Pages handlers and Preview bridge
functions/lib/       Shared API/domain logic used by Worker and local handlers
functions/db/        D1 schema migrations for the OSM court catalog
scripts/             Local catalog import tooling
public/              SEO files and privacy page
tests/               Unit tests and the Playwright search flow
```

## Notes

OpenStreetMap features are community contributed. Access, lighting, availability, and amenities can change and should be confirmed locally. Games do not reserve courts, and the app makes no court availability or booking guarantees. Account-based Play Together features are available on the website, Android app, and native iOS app.

Phase 2 public games: [implementation and testing guide](docs/play-together-games.md).

Phase 3 participation: [implementation and rollout guide](docs/play-together-participation.md).

Phase 4 groups: [implementation, privacy and rollout guide](docs/play-together-groups.md).

Android testing readiness and release gates: [docs/APP_TESTING_CHECKLIST.md](docs/APP_TESTING_CHECKLIST.md). iOS release state and device acceptance: [ios-app/IOS_APP_HANDOVER.md](ios-app/IOS_APP_HANDOVER.md).

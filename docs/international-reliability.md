# International reliability and Cloudflare rollout

This implementation preserves the existing US route. It improves international
availability without claiming that two city snapshots provide global coverage.

## Data path

International `/api/courts` requests use `functions/lib/international-courts.ts`.

1. Nearby search centers are rounded consistently to 0.01 degrees for the cache
   and provider query. Country codes isolate cache entries. Discovery remains
   bounded and is not a completeness guarantee.
2. Fresh edge or shared KV results are reused for six hours.
3. The imported Tokyo/Paris catalogs are used where matching records exist.
   Imported D1 court regions are also supported.
4. `GEOAPIFY_API_KEY` enables the primary live international court service. Public
   Overpass providers are a bounded fallback, not a service-level guarantee.
5. Successful nonempty results are retained for up to 30 days. When refresh fails,
   retained results are returned with `stale: true`, `dataUpdatedAt`, and
   `Cache-Control: no-store`. With a Pages `waitUntil` context, stale results can
   be served immediately while a background refresh runs.
6. Within an isolate, concurrent requests for a search cell share one pending
   lookup. A failed lookup has a 30-second retry cooldown. This reduces duplicate
   provider traffic; it is not a distributed lock across all Cloudflare locations.

The web client separately keeps international listings for six hours, then tries
to refresh. On refresh failure it can show its last successful listings for up to
30 days, with a visible saved-data notice. US storage keys and behavior are not
changed. Backend `stale` results are never recached as fresh by Vite middleware.

International weather keeps WeatherAPI first when `WEATHERAPI_KEY` is present,
then Open-Meteo, then MET Norway. These attempts are bounded and no longer loop
back to an already failed weather provider. Forecast failure remains separate
from court loading. Old rain guidance must not be presented as current surface
observations.

## Required production configuration

Project supplied by the user: `opencourts` at https://opencourts.pages.dev.
The user reports `GEOAPIFY_API_KEY` and `WEATHERAPI_KEY` are already configured
there. Their values have not been inspected. They remain server-side secrets.

For durable shared outage fallback, create a Workers KV namespace and bind it to
the Pages **Production** environment as **`INTERNATIONAL_COURTS_CACHE`**. Bind a
separate preview namespace if preview deployments should be isolated. This is a
KV namespace binding, not a text environment variable. Keep existing `COURTS_DB`
and US settings intact. Redeploy the updated Pages Functions after adding it.

Official binding instructions:
https://developers.cloudflare.com/pages/functions/bindings/#kv-namespaces

Without this binding, the code still uses edge and browser caches, but those do
not provide the same shared, persistent fallback. The first search for an
uncached area still needs a functioning provider or imported catalog. KV must
first be populated by successful searches; it does not create missing court data.

To deploy from this workspace, first authenticate to the existing Cloudflare
account with `npx wrangler login`, or use the existing Git-integrated Pages
deployment. Do not create a temporary account/site. At the time of implementation,
`wrangler whoami` reported that this workspace was not authenticated, so no KV
binding or deployment was performed by the agent.

## Coverage and provider limits

Geoapify supports sport categories, not a `sport.tennis` category. The adapter
uses supported categories, a localized tennis-name query where configured, and
validates returned tennis evidence. This cannot exhaustively find unnamed or
differently named courts. Mapped restrictions/fees are retained, and unknown
access is not promoted to public. Accuracy and completeness depend on upstream
data. See https://apidocs.geoapify.com/docs/places/.

Explicit country names are recognized beyond the original hand-written country
list. Existing two-letter US state searches and ambiguous US Georgia routing are
preserved. A bare ambiguous city name does not imply an international country;
use city and country. GPS country resolution still needs explicit handling when
the saved place lacks country metadata. Neither the browser's locale nor a simple
continental bounding box is a reliable replacement.

For stronger long-term coverage, expand imported regional catalogs with a
repeatable refresh process and choose provider quota/capacity suitable for actual
traffic. Do not replace the US D1 inventory with an international-only import.
This work does not establish provider contracts or an availability SLA.

## Verification and monitoring

```sh
npm test
npm run build
npx playwright test tests/international.spec.ts tests/search.spec.ts
node scripts/check-international-health.mjs --base-url https://opencourts.pages.dev
```

The health script checks Tokyo, Paris, Madrid, Sydney, Singapore, and Johannesburg
court/forecast responses without needing direct provider keys. It exits nonzero
for HTTP failures, missing expected city results, expired forecasts, or degraded
stale responses. Use `--city Madrid` for a targeted check. It is read-only, bounds
concurrency, and does not turn a passing sample into proof of worldwide coverage.

`.github/workflows/check-international-health.yml` runs the checks every six hours
and supports manual execution. It becomes active after being pushed to the default
branch. Review failing Actions runs and provider quota dashboards. A workflow file
in a local checkout is not active production monitoring.

Before calling the rollout complete, verify the deployed version and KV binding,
run the real multi-country checks with configured production keys, test a provider
outage with retained results in a preview environment, and compare US behavior to
the existing baseline. Native iOS must handle `stale`/`dataUpdatedAt` too; see the
iOS handoff README.

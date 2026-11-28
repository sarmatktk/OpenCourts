# Phase 2: public games (deployed to development Preview)

> This is a dated feature implementation record. The rollout examples below
> document completed historical work and are not current commands to repeat.
> Follow [`DEPLOYMENT_WORKFLOW.md`](DEPLOYMENT_WORKFLOW.md) for all current
> website/API Preview and Production releases.

The user authorized Phase 2 on November 17, 2026 ("continue with phase 22",
interpreted in context as Phase 2). This phase covers public discovery, creation
and details only. Joining/leaving, organizer editing/cancellation, My Games,
unlisted-game permissions and groups are later phases. All first-release features
remain free. Read [the central reference](PLAY_TOGETHER.md) and
[handoff](PLAY_TOGETHER_HANDOFF.md) before continuing.

## Current implementation

- `/play-together`: chronological upcoming public games; location/distance, device-
  local calendar date, singles/doubles and advisory skill filters; bounded pagination.
- `/play-together/create`: authenticated completed-profile gate, existing court
  picker, title, start date/time, explicit IANA time zone, duration, format/capacity,
  skill preference, notes and acknowledgements.
- `/play-together/game?id=UUID`: public details, organizer display name, court,
  time zone, duration, occupancy count and notes/directions. No participant names
  or private identifiers are returned. Joining is honestly labeled not available yet.
- Existing app shell, tennis-ball brand, account icon and automatic device theme
  are reused. Forms work at 320px and use existing theme tokens.
- No production code path is enabled: games use the same explicit development
  environment/host/origin/branch gate as authentication. Vite does not forward game
  APIs to production or impersonate a D1-backed server.

## Schema and integrity

`functions/db/migrations/0003_public_games.sql` adds `games` and
`game_participants`, indexes, unique participation keys, format/capacity constraints
and capacity triggers. It has been applied to LOCAL SQLite only. Do not edit this
applied migration; add a later corrective migration if schema needs to change.

One `games.visibility` field supports `public`, `unlisted`, `group`. Group ID must
exist exactly for the group visibility value. The actual group foreign key is
deferred until groups exist. APIs currently create PUBLIC games only and return
404 for all unlisted/group game details, including organizer requests, until their
full permission model is implemented. Public listing SQL excludes them before
projection, filtering, pagination or cursor creation. There are no public private-
game counts. Shared game/time/court helpers are intended for later phases too.

Organizer identity comes from the current authenticated session, never the request.
Creation and insertion of the organizer's participant row are an atomic D1 batch.
The final INSERT checks the active account/session again. Singles capacity is 2,
doubles is 4, INCLUDING the organizer. These are format sizes, not paid limits.
Database uniqueness and capacity triggers also reject invalid direct SQL insert/
move operations, preparing for Phase 3; no join endpoint is enabled now.

A UUID submission ID plus canonical request hash prevents duplicates on retry;
conflicting reuse returns 409. A database-checked rate guard permits up to ten new
games per account per minute, then returns 429; it is an anti-burst control, not
a subscription quota. Provider/edge abuse protections still need rollout review.

Games reference their organizer with ON DELETE CASCADE. At this stage, deleting an
account also deletes its organized public games and participation rows, and the
account UI discloses this. Revisit cancellation/notification/ownership semantics
before group games and other participants exist in later phases.

## Court validation

The authenticated `/api/games/courts` endpoint calls the EXISTING court handler
directly using only validated coordinates/country. It reuses D1, bundled catalogs,
and existing upstream fallback behavior, not the production website API.

Restricted/member-only/private/fee-based locations are excluded from the public
game picker. Unknown access requires an extra acknowledgement. Mapped access can
be incomplete; neither a public tag nor creating a game reserves a court.

Server-generated selection proofs contain a bounded court snapshot, authenticated
player ID, origin and 30-minute expiry. They use HS256 with a purpose-separated key
derived from the existing server-side `AUTH_RATE_LIMIT_SECRET` (local-only fallback
for loopback development). No additional Preview secret is required. Creation
verifies signature/audience/issuer/subject/expiry and ignores client court names,
coordinates or organizer/visibility injections. This supports non-D1 locations
without trusting arbitrary client records or destructively coupling games to the
refreshable court catalog.

## Time, search and privacy

Start must be in the future within 180 days. Duration is 30–240 minutes in
15-minute increments. UTC start/end and the canonical IANA time zone are persisted.
Server-side Intl conversion checks candidate offsets around the wall-clock time;
DST gaps and repeated/ambiguous times are rejected with a clear message instead
of silently shifting the event. The initial time zone is the user's device zone;
the form explicitly asks them to choose the COURT's zone.

Search dates are converted from the browser's local midnight to UTC boundaries;
the UI explains this. Game cards/detail dates use each game's saved time zone.
Distance uses a generous indexed bounding box plus exact great-circle filtering,
including antimeridian handling. Listing scans at most 500 candidate public rows
in bounded batches, returns 25 results and an opaque public-record cursor. No
offsets/totals over private rows. Additional pages may be empty for sparse exact-
distance matches; pagination remains bounded and resumable.

API responses use allowlisted game projections, no private account data, no
wildcard CORS and `private, no-store`. Mutations require Origin/CSRF/session checks.
New endpoints fail closed if the development binding or flag is absent.

## API and files

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/games` | Public upcoming game list; `lat`, `lon`, `radius` 1–50 miles, `from`/`to` ISO boundaries, `format`, `skill`, `cursor` |
| GET | `/api/games/courts?lat=…&lon=…&country=…` | Signed-in court search/proofs; country optional |
| POST | `/api/games` | Create public game with active profile/session and CSRF |
| GET | `/api/games/UUID` | Public detail only; private audiences return 404 |

Creation JSON fields: `title`, `courtToken`, `startLocal` (`YYYY-MM-DDTHH:mm`),
`timeZone`, `durationMinutes`, `format`, `capacity`, `skillPreference`, `notes`,
`requestId`, `acknowledgeNoReservation`, `confirmAccess`. Unexpected fields rejected.

Source: `functions/lib/games.ts`, `functions/lib/game-time.ts`,
`functions/api/games/[[path]].ts`, `src/game-api.ts`, `src/PlayTogether.tsx`,
`src/CreateGame.tsx`, `src/GameDetails.tsx`, `src/PlayTogetherShell.tsx`, scoped CSS,
main route selection and development HTML export script.

## Local testing

```cmd
npm.cmd run dev:db:migrate
npm.cmd run dev:db:seed
npm.cmd run dev:db:seed-games
npm.cmd run build:dev
npm.cmd run dev:pages
```

`seed-games` creates/refreshes one clearly marked `[Demo] Friendly doubles` game
tomorrow at a seeded Paris court and a synthetic organizer. It is guarded LOCAL-
ONLY, generates SQL under ignored `.wrangler/`, and creates no identity/session or
login bypass. It does not alter real players/games. Do not upload that SQL remotely
without a separate explicit decision. Omit it to keep a genuinely empty game list.

Visit `http://127.0.0.1:8788/play-together`. Local Google sign-in needs local private
credentials; Apple needs the approved HTTPS Preview. Never bypass authentication
just to create a local game. Automated API tests use real in-memory SQLite and
synthetic signed sessions/proofs; browser tests intercept APIs solely in test code.

Validation: `tests/games.test.ts` covers real migration SQL, creation, privacy
sentinels, idempotency, CSRF/session checks, court proof rejection, access warnings,
exact-distance/date/skill filtering, pagination, database capacity/uniqueness,
account deletion and DST handling. `tests/games.spec.ts` covers actual UI flows,
both themes and six visual baselines, narrow layouts, automatic theme changes,
signed-out gating, empty/error states and form acknowledgements.

## Development rollout (completed with approval)

User approved and these commands completed November 17, 2026:

```cmd
npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.remote.json
npm.cmd run build:dev
npx.cmd wrangler pages deploy dist --project-name opencourts --branch feature/play-together --commit-dirty=true
```

Only pending migration 0003 was applied to verified dev D1. Preview deployment `28912170` is available at https://feature-play-together.opencourts.pages.dev/play-together. Deployed D1 UUID matches dev; production deployment and binding unchanged. HTML routes and public games/auth APIs passed smoke checks. No remote demo seed uploaded. Authenticated creation awaits user verification; joining is Phase 3.

Court-picker follow-up: address/city/ZIP autocomplete implemented locally using existing suggestion service and styles. Selection searches using suggested coordinates. Build and focused browser test pass; Preview deployment pending approval.

Autocomplete follow-up deployed to development Preview `10a19a10` with user approval. Test ZIP 22033 using location suggestions. No database changes.

Court labels now reuse main discovery nearby-place/street enrichment server-side before signing selection proofs. Closest 40 eligible results; bounded context batches of at most 24. Optional context failure preserves mapped labels. Deployment pending approval.

Court naming fix deployed to Preview `d3d5d610` with explicit approval. Existing game snapshots are unchanged; verify by selecting a court for a new game.

Follow-up: screenshot still generic after deployment. Two-point live context lookup succeeds (171 features). Smaller eight-point batches and combined place/address labels prepared locally; end-to-end fix remains unverified.

Revised context batching deployed with approval: `f5e3f542`. User verification of visible street labels remains pending.

Local coordinate street fallback: bounded OpenStreetMap named-highway lookup, existing nearest-geometry rules, approximate Near labels. Real coordinate lookup returns street data; build/API tests pass. Deployment and hosted picker verification pending.

Venue-first labels: generic court labels become associated park/school names using geometry context; street names remain approximate fallbacks. New helper regression tests cover venue priority, numbered courts, named courts and street fallback.

Venue-first coordinate lookup deployed with approval: Preview `94a8f12a`. User verification pending.

100 enriched public Fairfax court records imported with approval into opencourts-dev only and verified. Fixture development/fairfax-public-courts.sql contains public map data only; no SQL transaction wrappers (D1 import manages execution).

Catalog-first game picker deployed to approved Preview `80b21fe9`. Bypasses stale raw court cache by reading isolated D1 first; hosted label verification pending.

Phase 3 participation and organizer controls now implemented locally; see [participation guide](play-together-participation.md). Latest hosted build remains Phase 2 until Phase 3 rollout approval.

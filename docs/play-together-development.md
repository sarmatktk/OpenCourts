# Play Together development environment

Current handover: see PLAY_TOGETHER_HANDOFF.md. Preview a9127653 and remote dev migrations0001-0010 are deployed. Older setup/provider/data counts below are historical. Approved Owner/Co-owner/Organizer/Member roles are design-only; current schema remains Owner/legacy Admin/Member. Do not infer role implementation or pending migrations from the new plan.

Product rules, roadmap and progress are maintained in
[the central Play Together reference](PLAY_TOGETHER.md). Review it before feature work.

## What is verified

Repository: `sarmatktk/OpenCourts`; branch at inspection: `feature/play-together`.
The existing Pages project is verified as `opencourts` at
`https://opencourts.pages.dev`. After user approval, Wrangler authentication,
development D1 creation, Preview binding, preview deployment, and development
migration/seeding were completed. Production data/settings were not modified.

Approved implementation scope and proposed schema/permissions are documented in
[the Play Together implementation plan](play-together-implementation-plan.md).
Private groups are required for release one. Phase 1 Google/Apple authentication
and profiles are approved and implemented locally. `0002_player_auth.sql` has been
applied locally and, after explicit approval, to `opencourts-dev`. Phase 1 preview is
deployed; both Google/Apple start routes pass. Actual user callbacks remain pending.

Verified environment:

- Production branch: `main`; D1 `opencourts-courts`, UUID
  `56c414b7-aca5-429b-acfa-b9e8e87b052b`.
- Preview branch: `feature/play-together`; D1 `opencourts-dev`, UUID
  `cae4849c-3e99-4945-9d70-bef7b48707ce`.
- Preview: https://feature-play-together.opencourts.pages.dev
- Latest verified deployment: https://6a6270c8.opencourts.pages.dev
- Remote development court migration applied; three sample records verified;
  preview API returned seeded `way/40881080` successfully.

The website is React/TypeScript/Vite with Pages Functions. The build command is
`npm run build`, output `dist`. Functions receive D1 through `context.env.COURTS_DB`.
There is no root Wrangler deployment configuration or website deployment workflow.
The production binding ID is verified above; its live schema has not been inspected.
The monthly catalog workflow writes to `opencourts-courts`.
Do not run that workflow or the production catalog importer for development.

## Local use (no Cloudflare account needed)

In PowerShell use `npm.cmd` if the npm PowerShell shim is blocked:

```powershell
npm.cmd run dev:db:migrate
npm.cmd run dev:db:seed
npm.cmd run dev:db:verify
npm.cmd run build
npm.cmd run dev:pages
```

Open `http://127.0.0.1:8788`. This serves the built site plus Pages Functions with
local D1. Rebuild after source changes (or run `npm.cmd run build:watch` separately).
For Phase 1 account UI use `npm.cmd run build:dev` instead of `build`, then visit
`http://127.0.0.1:8788/account`. Migration `0002_player_auth.sql` is also applied
to remote development D1. See [authentication setup](play-together-authentication.md)
for configuration and remaining real-login checks. No Google/Apple credentials are bundled.
The wrapper binds `COURTS_DB` to an intentionally fake local ID and persists only
under `.wrangler/play-together-local`. Its migration/seed commands force `--local`
and reject extra CLI arguments, including `--remote`. Do not replace that ID with
a real database ID. `development/wrangler.local.json` is not auto-discovered as a
deployment configuration; do not deploy it.

The seed uses three existing OSM records marked `access=yes` from the checked-in
Paris snapshot, with attribution. Re-running it does not overwrite existing rows.
It is a small sample, not proof of current public access. To test the D1 path
without the bundled international catalog taking priority, request:

`http://127.0.0.1:8788/api/courts?lat=48.84528395&lon=2.1901775`

Omitting `country` here intentionally selects the D1-first path. Other locations
can still use public upstream providers. Those calls do not use production D1.

`npm.cmd run dev` remains the fast Vite-only option: local handlers, no D1 binding,
public upstream providers and bundled catalogs. Both production API fallbacks have
been removed. Unknown local APIs return 404; unsupported methods return 405.
Use the Wrangler option above when testing database behavior.

No environment variables are required for the default court/weather experience.
Optional server-side `GEOAPIFY_API_KEY` and `WEATHERAPI_KEY` go in `.env` for Vite
or ignored `.dev.vars` at the repository root for Wrangler. Never prefix secrets
with `VITE_`. Optional `INTERNATIONAL_COURTS_CACHE` can be omitted locally and in
preview; if used, give preview its own KV namespace. Never reuse production KV.

`development/games.fixture.json` contains synthetic players and an example game.
It is not loaded into D1: game tables, accounts, and endpoints are deferred until
feature implementation is approved. Future mutations must use relative same-origin
URLs, require their local/preview binding, and fail closed if it is missing.
No development mutation may fall back to an external production URL. Authentication
cookies and callbacks must be scoped to the preview host, not `.opencourts.us`.

## Manual dashboard checks before any push or preview deployment

Open Cloudflare **Workers & Pages > opencourts** and record:

1. Git repository, deployment method, production branch, and automatic production
   deployment setting. Confirm whether pushes to `main` deploy production.
2. Preview branch controls: is `feature/play-together` included or excluded?
   A push may deploy immediately; do not push until preview isolation is complete.
3. Build command `npm run build`, output `dist`, root directory, Node version,
   compatibility date and flags. Reuse verified production runtime settings for preview.
4. In Production bindings, record `COURTS_DB` database name AND UUID without changing
   them. Also record any KV/service bindings and environment-variable names.
5. In Preview bindings, inspect every database/cache/service binding. Do not assume
   that a separate URL means separate data. Remove any production resource access
   from Preview only; production remains unchanged.
6. Confirm the production domain remains attached to production only. Inspect
   preview redirects, OAuth callbacks, and any API URL variables for production URLs.

## Cloud setup procedure (completed with approval; reference only)

Do not rerun database creation. The commands below preserve the setup procedure;
the approved actions and verified IDs are recorded above. Future remote changes
still require separate approval.

First approve creation of the development database in the verified Cloudflare account:

```powershell
npx.cmd wrangler login
npx.cmd wrangler whoami
npx.cmd wrangler d1 create opencourts-dev
npx.cmd wrangler d1 list
```

`login` is only needed if not authenticated. Record the returned development UUID
and confirm that it differs from the production UUID. Resource creation alone does
not change any Pages binding.

Before any remote migrations, prepare ignored `development/wrangler.remote.json`
with this content, replacing the two placeholders after checking the account:

```json
{
  "name": "opencourts-dev-migrations-only",
  "account_id": "VERIFIED_ACCOUNT_ID",
  "d1_databases": [{
    "binding": "COURTS_DB",
    "database_name": "opencourts-dev",
    "database_id": "VERIFIED_DEVELOPMENT_UUID",
    "migrations_dir": "../functions/db/migrations"
  }]
}
```

Show the resolved account, name, UUID, and commands for approval before executing:

```powershell
npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.remote.json
npx.cmd wrangler d1 execute opencourts-dev --remote --config development/wrangler.remote.json --file development/courts.seed.sql
npx.cmd wrangler d1 execute opencourts-dev --remote --config development/wrangler.remote.json --command "SELECT osm_type, osm_id FROM tennis_courts ORDER BY osm_type, osm_id LIMIT 10"
```

Remote config and guarded remote scripts are intentionally not active yet. The
guard must verify the actual database name from the Cloudflare API for the chosen
UUID, reject the recorded production UUID, and refuse extra target flags. Account
credentials can still bypass scripts: these guards prevent routine mistakes, not
arbitrary manual commands. Avoid production write credentials in development; check
the available token scope rather than assuming it can be limited to one D1 database.

Then approve these dashboard actions for the existing Pages project's **Preview**
environment only:

- Set `COURTS_DB` to `opencourts-dev`, checking the UUID.
- Configure separate optional provider secrets; omit optional KV or bind separate KV.
- Allow `feature/play-together` preview builds after isolation is verified.
- Leave Production bindings, domain, branch, and settings unchanged.

After separate push/deployment approval, use the Pages-generated preview URL.
Expected pattern: `https://<deployment-id>.opencourts.pages.dev`; a branch alias may
also be available. Copy the actual URL from Cloudflare rather than guessing it.
No new Pages project or custom domain is needed. Preview data is shared between
preview builds using this same database; it is not a database per commit.

The installed Android app still opens production. Test preview in mobile Chrome
first; TWA testing later needs a separate debug build/verified origin. Leave the
release Android project and native Swift project untouched.

## Verification checklist

- [x] Capture production binding name/UUID and deployment before changes.
- [x] Verify development UUID differs; inspect Preview bindings after saving.
- [x] Apply schema and seed locally; confirm seeded records through the local API.
- [x] Verify local wrapper rejects `seed --remote` before starting Wrangler.
- [x] After approval, apply the same schema/seed only to the verified remote dev UUID.
- [ ] With browser network tools, confirm preview API calls stay on its own origin.
- [ ] Inspect preview bindings for production D1, KV, service bindings, and secrets.
- [ ] Once game tables exist, write a unique synthetic marker through preview, confirm
      it in dev, then use a separately approved read-only production query to show
      it is absent. If that table does not exist in production, record that fact.
- [x] Recheck production binding UUID and deployment are unchanged. Row counts alone
      are insufficient proof; the scheduled catalog refresh may change them normally.
- [ ] Test court search, map/list switching, details, geocoding, weather, rain, and
      directions locally and in preview on desktop/mobile; verify existing tests pass.
- [ ] Verify unknown account/game endpoints do not contact production. When added,
      test missing bindings, unauthorized writes, and concurrency before release.

Preview D1 binding and seeded API access have been verified remotely. The remaining
checklist items still need completion; this does not yet certify future feature
authorization, write isolation, or browser/device behavior.

Local validation on November 17, 2026: build passed (existing bundle-size warning),
all 155 unit tests passed, migration and three-row seed succeeded, and the local
Pages API returned seeded court `way/40881080` through `COURTS_DB` with HTTP 200.
Windows sandbox path restrictions required normal filesystem access for esbuild.
No live browser/provider regression has been performed. Subsequent approved remote
checks confirmed the development schema, three records, and preview API access.

References:
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/
- https://developers.cloudflare.com/d1/reference/migrations/

## Phase 2 public games

See [the games guide](play-together-games.md). Migration 0003 is applied locally and to isolated dev D1. Optional `npm.cmd run dev:db:seed-games` seeds LOCAL synthetic data only. No remote demo seed was uploaded. User-approved Phase 2 Preview rollout: November 17, 2026. Production remains unchanged.

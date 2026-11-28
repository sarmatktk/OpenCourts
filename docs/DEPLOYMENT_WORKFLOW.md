# Deployment workflow

Cloudflare Pages project `opencourts` serves the web frontend. API traffic is
served separately by `opencourts-api-production` on `opencourts.us/api/*`.
Do not deploy the API with Pages. Worker releases use
`npx wrangler deploy --env production --config backend/wrangler.jsonc` and have
their own readiness and rollback process in
the [deployment architecture handoff](DEPLOYMENT_ARCHITECTURE.md) and
[separation log](FRONTEND_BACKEND_SEPARATION_LOG.md).

## Production frontend asset release

The supported manual Production release builds only Vite frontend assets and
deploys with the generated artifact directory as Wrangler's working directory.
Wrangler looks for Pages Functions in its working directory; using
`dist-frontend` ensures it cannot discover the repository-root `functions/`
directory. The deploy script also rejects a Functions/Worker entry point in
the artifact, requires a clean Git tree on `main`, confirms the active API
Worker deployment, and requires a successful read-only API health request.

1. Work on a feature branch and keep the release scope frontend-only. Before
   committing, inspect the diff and exclude backend, migration, secret/config,
   and native-app changes. Do not merge/push to `main` or deploy Production
   without the owner's explicit authorization.
2. Push the feature branch only when authorized. The configured Pages Preview
   branch build publishes the Preview website automatically. Check its
   deployment and review the changed flows on
   `https://feature-play-together.opencourts.pages.dev`.
3. For a local Preview-artifact review, run
   `npm run build:frontend:preview`; this builds `dist-preview/` and adds only
   the Preview middleware bridge. It does not publish the artifact. Do not run
   `wrangler pages deploy` from the repository root.
4. Only after Preview review and explicit Production authorization, merge the
   reviewed frontend-only commit to `main`.
5. In the clean `main` checkout, run `npm run build:frontend:release` and
   review the candidate under `dist-frontend/`.
6. Run `ALLOW_PRODUCTION_PAGES_ASSET_DEPLOY=opencourts.us npm run deploy:pages:assets`.
7. Confirm the new Pages deployment serves the changed pages and that
   `https://opencourts.us/api/auth/me` remains healthy.

The deploy command refuses feature branches, dirty checkouts, missing API
health, a missing active Worker, and Production config without the exact API
route. It does not run automatically on push. Cloudflare automatic Production
branch deployments are disabled for `opencourts`; Preview branch deployments
remain enabled. Do not use the old Git-triggered `build:pages` flow as the
Production asset release. Production Pages is static-only and the API Worker
owns `/api/*`. Removing the Worker route by itself will **not** restore API
service because the active Pages artifact contains no Functions. For a full
API rollback, first restore a reviewed Pages deployment that includes the
legacy Functions, then remove the Worker route so Pages can serve those
Functions. Alternatively, roll back the Worker version while leaving its route
attached. See [the current architecture and rollback record](DEPLOYMENT_ARCHITECTURE.md).

Preview uses a separate `dist-preview/` artifact with noindex headers, the
development Android association, and only the existing
`functions/api/_middleware.ts` API bridge. Its Pages service binding routes
`/api/*` to `opencourts-api-preview`; that Worker uses isolated Preview data.
Do not use the Production asset deploy script for Preview. Do not publish a
manual Pages Preview artifact unless the automatic Preview path is unavailable
and the owner has authorized the deployment.

For the complete website-only sequence, follow the numbered procedure above.
Do not interpret the automatic Preview publication as Production approval.

### API, migration, and other backend changes

1. Identify whether the change affects `backend/`, shared API modules under
   `functions/`, Worker bindings/secrets, D1 schema/data, the media processor,
   scheduled push Workers, or iOS API contracts. Keep the API code release
   separate from web assets and native app releases.
2. Review the exact diff and `git status`. Run `npm run typecheck:api` for API
   changes. Never stage unrelated user changes.
3. Deploy a reviewed API Worker change to Preview with
   `npx wrangler deploy --env preview --config backend/wrangler.jsonc`, only
   after confirming the Preview resources and explicit authorization for the
   remote Preview change. Verify the affected routes through the stable Preview
   site; Preview Worker and Pages publishing are separate operations.
4. Before any D1 migration, inspect pending migrations and target database
   identity. Preview and Production use different databases. Back up and review
   the exact migration. Apply it only with explicit authorization; never apply
   all pending migrations blindly.
5. A Production API Worker release, Production migration, secret/binding change,
   media/push Worker release, or native app release each needs its own explicit
   Production authorization. After authorization, use only the relevant
   service's documented release path and verify that service independently.
6. For API rollback, restore the previous known-good Worker version while
   leaving its route attached. Do not remove the route unless a reviewed Pages
   deployment containing the legacy API Functions has first been restored.
   Never roll back D1/R2 data as part of a code rollback.

A Pages release does not migrate a database or redeploy any Worker. Existing
environment secrets are managed in Cloudflare; never commit, print, or
overwrite their values as part of routine code deployment.

Never commit `.wrangler`, credentials, private signing material, local databases,
uploaded photos, generated builds or raw test logs. Preserve real QA history;
do not update screenshots merely to conceal test failures.

Website changes appear in the Android TWA after refresh/reopen. Native wrapper
changes require a signed bundle for the existing `us.opencourts.app` and existing
upload key. Google Play uploads require explicit owner approval.

## Historical release record — November 20, 2026

The initial Play Together Production releases were manual deployments from the
feature working tree. This record describes the synchronization at that time;
it is not part of the current procedure above.

# OpenCourts deployment architecture

**Current as of November 28, 2026.** This is the short operational handoff for
agents and maintainers. For the full migration decisions and dated evidence, see
the [frontend/backend separation log](FRONTEND_BACKEND_SEPARATION_LOG.md). The
[deployment workflow](DEPLOYMENT_WORKFLOW.md) contains the guarded website
release steps.

## System boundary

OpenCourts is a monorepo, not a submodule. The source is kept together, while
Cloudflare deploys the website and API as separate products:

- **Website:** Cloudflare Pages project `opencourts`, served at
  `https://opencourts.us`. Production Pages receives only a static frontend
  artifact; it does not package or deploy root `functions/`. The current
  release procedure builds that artifact into `dist-frontend/`.
- **API:** Cloudflare Worker `opencourts-api-production` handles
  `https://opencourts.us/api/*`. The Worker has its own Wrangler config,
  deployment command, bindings, secrets, and rollback point. Web and native iOS
  clients keep the same origin and `/api/...` paths.
- **Preview:** the stable Pages branch alias
  `https://feature-play-together.opencourts.pages.dev` publishes a separate
  `dist-preview/` artifact. Its one Pages middleware file forwards `/api/*` to
  `opencourts-api-preview`, which uses the isolated `opencourts-dev` D1 database
  and development media resources. Do not point Preview at Production data.
- **Android:** the TWA displays the website, so website asset changes appear
  after refresh/reopen. Native wrapper changes still need their own signed
  Android release.
- **iOS:** the native app is a separate Xcode project and store release. It
  calls the same Production API origin; website releases do not rebuild or
  replace the iOS app.

The Worker adapter in `backend/api-worker.ts` dispatches to the existing
handlers and shared domain modules under `functions/api/` and `functions/lib/`.
Those modules remain in the monorepo for shared implementation and local Pages
development. The Production boundary is created by the separate Worker
deployment and static-only Pages artifact, not by deleting or duplicating the
shared handler code.

## Current Production snapshot

- Static Pages deployment: `7690e4c6-cf49-425a-8247-a0c08b20c5f0`, built from
  frontend release commit `990b91bf` (organizer landing page and chat button styling).
- API Worker active version after the Apple sign-in key correction:
  `bf43e899-04ff-4ac0-b9ff-836003957db4`.
- API Worker route: `opencourts.us/api/*`; `workers_dev` is disabled.
- Cloudflare's current `opencourts` Pages configuration has automatic
  Production deployments disabled and Preview branch deployments enabled for
  all branches. A Git push to `main` may be recorded as a skipped deployment;
  it does not build or publish Production. The latest website release was the
  guarded manual static asset deployment above.
- Production and Preview API Worker environments use distinct D1, R2, media
  processor, and feature configuration. Secrets are stored in Cloudflare only;
  never commit or print their values.

The migration has not changed D1 schemas or data. The existing scheduler,
APNs/push sender, media processor and other independent Workers remain separate
deployments; changing website assets does not release those services.

## Canonical procedure

There is one current website/API release and rollback procedure:
[`DEPLOYMENT_WORKFLOW.md`](DEPLOYMENT_WORKFLOW.md). Follow it for Preview and
Production website assets, API Worker changes, database migrations, secrets,
validation, and rollback. This document records the architecture and current
environment snapshot; it is not a second procedure. The
[`AGENTS.md`](../AGENTS.md) rules apply to coding agents. Older dated commands
in product/QA histories are not deploy instructions.

## Deployment document index

- [Deployment workflow](DEPLOYMENT_WORKFLOW.md): routine frontend release and
  Preview/Production workflow.
- [Frontend/backend separation log](FRONTEND_BACKEND_SEPARATION_LOG.md):
  migration decisions, bindings/secret inventory, deployment IDs, smoke checks,
  and dated work log.
- [Production rollout history](PRODUCTION_ROLLOUT.md): chronological release
  and acceptance record; old entries are historical.
- [Android TWA build and store guide](../android-app/README.md) and
  [iOS app handover](../ios-app/IOS_APP_HANDOVER.md): native wrapper
  build/store instructions and device acceptance.
- [Production owner setup](PRODUCTION_OWNER_SETUP.md) and
  [launch readiness](PRODUCTION_LAUNCH_READINESS.md): setup and launch evidence
  archives; use the current workflow above for present-day deployment steps.
- [Production issue handover](PRODUCTION_ISSUE_HANDOVER.md): current incidents
  and recovery state.

Historical rollout and issue entries should be retained as evidence. They are
not additional live deployment procedures; update the current snapshot at the
top of the relevant handoff when a release changes it.

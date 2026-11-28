# Instructions for coding agents

Before changing, building, or deploying OpenCourts, read
[`docs/DEPLOYMENT_ARCHITECTURE.md`](docs/DEPLOYMENT_ARCHITECTURE.md) and
[`docs/DEPLOYMENT_WORKFLOW.md`](docs/DEPLOYMENT_WORKFLOW.md). They are the
current source of truth for the frontend/API boundary and release procedures.
Use [`docs/FRONTEND_BACKEND_SEPARATION_LOG.md`](docs/FRONTEND_BACKEND_SEPARATION_LOG.md)
for migration decisions, resource boundaries, and rollback history. Dated QA,
rollout, and feature logs are evidence, not current deployment instructions.

## Change scope and release boundaries

- **Website-only:** change web source/assets. Do not edit `backend/`, API
  handlers, migrations, Worker configuration, secrets, or native app projects.
  Preview is reviewed on the feature Pages branch. Production Pages is
  static-only and can be published only through the guarded workflow in
  `docs/DEPLOYMENT_WORKFLOW.md` from a clean `main` checkout after review.
- **API/backend:** change Worker code/config separately from web/native code.
  Typecheck with `npm run typecheck:api`; deploy to the isolated Preview Worker
  first using the documented Preview process. Production Worker deployment is a
  separate live API release and requires explicit authorization. Never run the
  Production Worker command for a frontend-only request.
- **Database:** inspect and document whether a change needs a schema/data
  migration. Preview and Production use different databases. A database
  migration is a separate operation from either Pages or Worker deployment;
  do not apply one without explicit authorization and an appropriate backup /
  recovery plan.
- **Secrets and bindings:** use the Cloudflare dashboard or approved secret
  tooling. Never print secret values, commit credentials, or copy Production
  values into Preview. Preserve the Apple token-encryption key unless a reviewed
  key-rotation plan explicitly accounts for stored tokens.
- **iOS/Android:** website and Worker releases do not build or publish native
  apps. Keep native source and store releases out of web-only changes; handle
  wrapper/app changes through their platform-specific handoffs.
- **Git:** inspect the existing worktree before changes. Do not stage, discard,
  commit, or push unrelated user work. Never use the monorepo root as the
  Wrangler working directory for a static-only Production Pages release.

If an older document conflicts with the current architecture or workflow,
follow the two current documents linked above and update the stale document's
status/link when appropriate. Do not silently treat a dated deployment record
as authorization for a new Production change.

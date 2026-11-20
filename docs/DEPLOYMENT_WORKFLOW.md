# Git deployment workflow

Cloudflare Pages project `opencourts` is connected to `sarmatktk/OpenCourts`.
The production branch is `main`; feature branches deploy to Preview. Use
`npm run build:pages` with output directory `dist` in Cloudflare. The script
uses `CF_PAGES_BRANCH` to build production on main and protected Preview
artifacts elsewhere (noindex and the Android development association).

For future changes:

1. Work on a feature branch, run checks appropriate to the change, then commit
   and push reviewed source, tests and sanitized QA evidence.
2. Wait for the Git-triggered Preview deployment and check the changed behavior.
3. Merge the verified branch into main and push. Cloudflare builds and publishes
   the website and Pages Functions to `https://opencourts.us` automatically.
4. Check the production deployment status and the affected public routes.

Database migrations, media processor and scheduled push Worker releases are
separate operations. A Pages push does not migrate a database or redeploy those
Workers. Keep their production/Preview resources separate. Existing environment
secrets are managed in Cloudflare and must not be committed or overwritten.

Never commit `.wrangler`, credentials, private signing material, local databases,
uploaded photos, generated builds or raw test logs. Preserve real QA history;
do not update screenshots merely to conceal test failures.

Website changes appear in the Android TWA after refresh/reopen. Native wrapper
changes require a signed bundle for the existing `us.opencourts.app` and existing
upload key. Google Play uploads require explicit owner approval.

## November 20, 2026 synchronization

The initial Play Together production releases were manual deployments from the
feature working tree. This synchronization saves that source in Git before main
is updated. Fresh checks: 432 unit tests passed; branch-aware Preview build passed.
Production build, focused browser verification and Git deployment acceptance are
recorded in the current checklist/handoff as completed. Historical full-suite
visual-baseline exceptions remain in the QA records; no snapshots were regenerated
for this synchronization.

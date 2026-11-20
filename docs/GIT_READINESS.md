# Feature branch Git review

November 19 launch-copy/SEO follow-up: include scripts/community-metadata.mjs,
scripts/prepare-production-pages.mjs, changed prepare-dev-pages.mjs, index metadata,
public sitemap/copy, customer-facing auth wording, tests and readiness docs. The new
npm build:release command generates ignored dist-release/ only; no deployment follows.
dist-release is excluded alongside dist. Preview builds add noindex headers/debug
association; production candidates reject those additions. Preserve historical QA
records; do not replace captured old wording/email with invented current evidence.

## November 19 internal-testing preparation review

Verified checkout/remote `sarmatktk/OpenCourts`, branch `feature/play-together` and
preserved the intentional working tree. Reviewed push APIs/sender/migration 0024,
service-worker destinations, opt-in UI, cache/media behavior, Android notification
delegation/debug isolation, information-page updates and browser fixture changes.
Keep package.json/package-lock.json together and include the new push source/tests,
notification icons, safe disabled development sender config and current handover docs.
Keep the six allowed synthetic QA screenshots, JSON audit evidence and test baselines.
The current browser run does not update screenshot baselines.

A bounded credential-pattern scan of 80 changed/untracked text files found no matching
embedded private keys or common provider-token patterns. This does not certify all
history. No environment-secret files or Cloudflare environment secrets were read.
Ignore checks confirm .wrangler secrets, local SQLite, generated build/APK output and
test logs/results stay excluded. No new uploaded photos or runtime records appear in
the candidate inventory. Preserve ignored local data and credentials.

An existing tracked `android-app/app/release/app-release.aab` predates this work;
it is unchanged and must not be included as a new test release or uploaded. The current
Gradle version remains 2 / 1.0.1; the next approved signed bundle needs code 3 or higher.
No package/destination selection, staging, commit or Git push is part of this review.

Reviewed November 17, 2026, on `feature/play-together` in OpenCourts.
Remote: `https://github.com/sarmatktk/OpenCourts.git`.

This review does not stage, commit, push, delete, deploy, or modify database records.
The ignore rules were strengthened as described below. Existing feature work is preserved.

## Include in the feature commit

| Files | Reason |
| --- | --- |
| All changed/new `src/` files | Complete Play Together frontend, shared APIs and theme integration |
| `functions/api/`, new `functions/lib/` files | Authentication, games, groups, media, player discovery and server authorization |
| `functions/db/migrations/0002_*.sql` through `0017_*.sql` | Required schema history; these are source migrations, not database dumps |
| `public/interactions.css`, `public/pages.css`, `index.html` | Shared interaction styles and stylesheet wiring; omitting any would break consistency |
| `package.json` AND `package-lock.json` | Keep dependency definitions and exact resolutions together |
| Vite/Playwright configuration and changed types/services | Required development isolation, routing and test behavior |
| `scripts/dev-environment.mjs`, `prepare-dev-pages.mjs`, `preview-acceptance.ps1` | Reproducible development, build preparation and guarded synthetic acceptance |
| `development/wrangler.local.json` | Uses a deliberately dummy local database ID; needed by the development helper |
| `development/media-processor/index.ts` and `wrangler.json` | Source/configuration of the isolated image-processing service; no credentials found |
| `development/auth.dev.vars.example`, existing `.env.example` | Names/placeholders only; real values must remain local or in Cloudflare secrets |
| `development/courts.seed.sql`, `fairfax-public-courts.sql` | Reviewed public court fixtures, not private user/account exports |
| `development/games.fixture.json` | Synthetic planning fixture referenced in documentation; keep its planning-only status clear |
| New/changed tests and 32 new `tests/*-snapshots/*.png` baselines | Baselines are test inputs, not disposable Playwright output |
| README, handover, feature documentation and QA audit | Another agent needs these to continue safely |
| `.gitignore` | Prevent accidental inclusion of local secrets/data/output |

The initial inventory contained **214 changed/untracked files** before this review document.
The candidate feature spans many files because the complete feature has not been committed
yet. Do not commit only the latest CSS while leaving its dependent components/APIs behind.

## QA evidence: selected for the feature commit

User approved committing only the audit-linked screenshots. Six PNGs under
`docs/qa-evidence/` are allowed by `.gitignore`; other generated PNGs remain local and
ignored. Structured JSON audit evidence is included. The 32 test baseline PNGs remain
included because they are test inputs. Website logos/icons/assets remain included.
The eligible QA screenshots and test baseline PNGs together are approximately 2.5 MiB.

No local images were deleted. The earlier full 34-screenshot audit directory was about
8.27 MiB; that entire set is no longer proposed for Git. Do not add a global `*.png`
ignore rule, which would hide required assets and baseline tests.

## Keep local and ignored

Already excluded: `.env`, `.dev.vars*` containing actual values, `.wrangler/`,
`development/wrangler.remote.json`, `node_modules/`, `dist/`, `test-results/`,
`playwright-report/`, catalog-import downloads and generated international-health reports.
Android build/IDE/local properties are also ignored by existing rules.

The remote Wrangler file contains real development resource identifiers and is intentionally
machine-specific; regenerate it through the documented setup. Cloudflare/D1 IDs are not
passwords, but this file is not required as a checked-in application configuration.

New ignore coverage added:

- `.env.*`, retaining `.env.example`.
- `.dev.vars.example` explicitly allowed as an example; actual `.dev.vars.*` stays ignored.
- Signing/key files: `.p8`, `.pem`, `.key`, `.p12`, `.pfx`, `.jks`, `.keystore`, provisioning profiles.
- Local `.db`/SQLite files and sidecars, logs, TypeScript build caches and OS metadata.

`git check-ignore` verified actual environment variants and sample key/database/log paths
are ignored while templates, local-safe Wrangler config, migrations and test baselines
remain eligible for Git. Ignore patterns do not remove already tracked files: no tracked
private-key/signing/database files were found in the filename checks performed here.

## Delete versus retain

**Nothing must be deleted to make this feature safe to commit.** Ignored files can stay local.

| Item | Recommendation |
| --- | --- |
| `dist/` (about 9.6 MiB) | Optional cleanup after local servers stop; recreate with `npm.cmd run build:dev` |
| `test-results/`, `playwright-report/` | Optional cleanup; regenerated by browser tests |
| Old `.wrangler/logs/` and audit command logs | Optional cleanup after review; never commit them |
| Four generated `tmp/international-*.json` reports (about 0.02 MiB) | Optional cleanup; already ignored |
| `.court-catalog-import/` (about 328 MiB) | Keep ignored unless disk space is needed; removing it requires downloading/regenerating catalog work |
| `.wrangler/state/` and local D1 | Retain: deletion loses local development records; do not treat all `.wrangler/` content as disposable |
| `.env`, `.dev.vars`, Apple keys, signing material | Retain securely outside Git; do not delete credentials as repository cleanup |
| Applied SQL migrations, source files, test baselines, referenced QA evidence | Retain and commit |

No deletion commands were executed. In particular, do not use `git clean -fdx`: it could
remove both the uncommitted feature and ignored credentials/local databases.

## Secret and privacy review

Candidate text files were scanned for private-key blocks, common provider tokens, JWT-shaped
literals and long literal assignments to the auth/Cloudflare secret names. No actual secret
values were detected by these checks. Private-key header matches in auth code/tests were
parsing/fixture strings, with no embedded complete PEM key. Both example environment files
contain comments, empty values or placeholders. Secret values were not printed.

This is a bounded pattern review, not a guarantee or a scan of all Git history. Handover
documents contain operational identifiers such as Cloudflare resource IDs and the approved
development moderator's player UUID. These are not authentication credentials; review their
visibility if making the repository public. Do not commit real user exports or screenshots
of real accounts in place of the current synthetic QA evidence.

## Recommended commit sequence

1. Review the complete source, config, migrations, tests, baseline and documentation set above.
2. Run `git diff --check`; inspect the staged file list and staged diff before committing.
   Do not force-add ignored files. Dependency changes must include the lockfile.
3. Validate with the documented unit/build/browser commands. Audit matrix tests explicitly
   skip when their optional local axe engine is absent; a skip is not an accessibility pass.
4. Commit on `feature/play-together`, then push that branch when authorized.
5. Expect that a Git push may trigger Cloudflare's configured preview build. Verify its
   branch/build environment before pushing. Never merge into `main` as part of this backup.

Current hosted Preview is `89a8ba19`. The subsequent single-search-focus and unfilled
top-navigation corrections are local working-tree changes and would be included in this
feature commit. No production rollout is authorized by this review.

## Feature-branch pre-push verification

257 unit tests passed. After approved screenshot-baseline updates, the browser suite
passed 101 of 103 cases; the remaining two direct-focus comparisons read a transient
browser outline. The test now waits for the final 2px/3px keyboard focus dimensions;
all four direct-comparison cases passed on rerun. No application behavior was changed
for that synchronization. Development build passed before staging.
The staged review found 192 files, six audit-linked PNGs and 32 test-baseline PNGs,
with no excluded paths or secret-pattern matches. Production branch remains main;
production deployment 7ef38ff2 and Preview development D1 were verified unchanged.

November 19 production candidate adds public Terms/Delete Account pages, policy and footer links, scripts/build-pages.mjs, guarded production source/cleanup, release/ public resource examples and migration hashes, and corresponding tests/baselines. These are intended reviewable source/docs. Keep .wrangler artifacts/backups/logs, dist/dist-release, local DBs/media and signing/Cloudflare secrets excluded. No Git push/merge is included in preparation.

Account moderation follow-up: include migration 0026, moderation backend/UI, visible staff entry, required explanation dialog, updated policies/tests and the refreshed 26-file release migration inventory. Dev schema 0026 only; no real-account suspensions or production changes. Keep private runtime data/logs/build outputs excluded.

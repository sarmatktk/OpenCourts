# Play Together: start here to continue development

## Git feature backup checkpoint

User approved committing and pushing to `feature/play-together` only. The complete feature
source, migrations, safe development setup, tests/baselines and handover are included;
only six audit-linked QA screenshots are selected, with other generated PNGs ignored.
Secrets, local databases, build output and machine-specific Wrangler config stay local.
Use `git log -1` and `git status` to identify the source checkpoint; older statements that
all feature work exists only in the working tree are historical after this checkpoint.
No main merge, production migration/settings change or production deployment authorized.
A Git push may create a feature-branch Pages preview; it does not approve production.


Current local follow-up: single search focus boundary and unfilled top navigation;
see the latest correction section below. Preview remains 89a8ba19.

## Latest published checkpoint - shared interactions

User-authorized Preview publication completed: https://89a8ba19.opencourts.pages.dev
Stable URL: https://feature-play-together.opencourts.pages.dev
Bundle: index-CVviCwyx.js; shared stylesheet: /interactions.css.
Includes player-search race hardening and consistent primary/secondary/selected/title-hover
styles across main court discovery, Play Together and static Support. Eight interaction
browser checks, 350-state audit with zero detected violations/overflow/JS errors and
build passed before publication. Hosted HTML/stylesheet HTTP 200 verified afterward.
Preview COURTS_DB remains opencourts-dev; production deployment 7ef38ff2 and original
production D1 unchanged. No migrations, GitHub push or production deployment.
This supersedes earlier local-only notices. Next: user/physical-device review.


## Latest: c17ef75c published; search and shared interaction styling local

Preview: https://feature-play-together.opencourts.pages.dev
Immutable: https://c17ef75c.opencourts.pages.dev; bundle index-BxFx9CTz.js.
All eight audit fixes are published. Preview COURTS_DB verified dev UUID
cae4849c-3e99-4945-9d70-bef7b48707ce; production deployment still
7ef38ff2-91e0-4505-a215-fa16edcfa0bc and original production D1 unchanged.
No migration or GitHub push. Preserve all uncommitted/untracked work.

Published validation: 257 units, 85 browser workflows, 350 theme/viewport states with
no detected axe violations/page overflow/JS errors, final development build.
Subsequent LOCAL ONLY: player-search cancellation and generation guard; concurrent
submission test failed before the fix, passed afterward. Focused discovery/sharing/safety
suite: 10 passes. See QA_AUDIT.md and current implementation plan for exact scope.
Do not mistake this new local fix for published code.

Next: real-phone, screen-reader and provider acceptance; notification/pending-request
bounds and safety operations review. Recurrence comes after the free first release.
The implementation plan is now rewritten to remove contradictory historical statuses.

Handoff date: November 17, 2026 (America/New_York).
This is the current operational snapshot for a new agent. Read
[PLAY_TOGETHER.md](PLAY_TOGETHER.md) for product rules and decisions, then
[the implementation plan](play-together-implementation-plan.md) and
[authentication guide](play-together-authentication.md). Earlier proposals and dated
troubleshooting notes in those documents are historical; use the latest verified
state below. Do not mistake a proposed feature for implemented functionality.


## Latest checkpoint: sharing and safety milestone on isolated Preview

November17,2026. This snapshot supersedes all historical notes below.

- Repository OpenCourts, branch feature/play-together; preserve ALL uncommitted/untracked
  work. No GitHub push, main merge, production deployment or production D1 changes.
- Stable Preview: https://feature-play-together.opencourts.pages.dev
  Latest immutable: https://3af45daf.opencourts.pages.dev; bundle index-JralF0cq.js.
- Preview D1 opencourts-dev / cae4849c-3e99-4945-9d70-bef7b48707ce; migrations through0017.
  Production opencourts-courts /56c414b7-aca5-429b-acfa-b9e8e87b052b;
  production deployment remains7ef38ff2-91e0-4505-a215-fa16edcfa0bc.
- Deployed: Apple/Google accounts and provider linking; profiles/circular drag-and-zoom
  avatar crop; optimized private image processing; public/unlisted/group games;
  approval joining/guest approval and atomic party capacity; organizer controls;
  My Games/private notification inbox/bell; public/private discoverable group previews;
  Owner/Co-owner/Organizer/Member roles; invitations requiring approval; protected group
  feed/games and organizer-to-Owner transfer on departure; personal feed; compact phone
  dock and member directory with search/pagination; public/group share and unlisted
  revocable invitations; opt-in player discovery; block/unblock; private safety reports.
- Preview moderator explicitly approved by user: Sam owner of Tennis, player UUID
  87be695a-f00f-4689-b0c7-16ad9a50346d, via MODERATOR_PLAYER_IDS (Preview only).
  Players page shows Report review to this account; group roles do not grant moderation.
- Media: private processor opencourts-media-processor-dev version
  c5e01912-6e84-4938-bf78-049d2096bd24; dev R2/service bindings unchanged.
- Verification:251 unit tests,76 complete browser tests, development build passed.
  Actual Preview/D1 synthetic acceptance26 API checks passed; all fixtures removed.
  This is not real-provider OAuth or physical Safari/TWA acceptance.
- MapLibre updated to5.24.1 patched backport; sanitizer regression passed. npm audit
  still flags an overbroad range. See sharing-safety guide; do not claim zero findings.
- NEXT: run user/device acceptance in PLAY_TOGETHER_RELEASE_CHECKLIST.md, resolve
  advisory-metadata/operational release gates, then separately approved production
  rollout. Recurrence is the milestone after the free first release. No payments or
  native Swift integration yet.
- Read play-together-sharing-safety.md for exact link/block/moderation behavior and
  preview-acceptance.ps1 guard/cleanup; never run remote scripts without authorization.

## 1. Current guides and next phases

1. PLAY_TOGETHER.md: approved product decisions, visibility and target role matrix.
2. play-together-implementation-plan.md: refreshed current plan and next milestones.
3. play-together-groups.md: group architecture and historical rollout notes.
4. play-together-participation.md: public participation, notifications and guest design.
5. play-together-authentication.md: account architecture/provider configuration history.
6. play-together-development.md: local setup; current checkpoint overrides dated notes.

Phase5: IMPLEMENTED roles, invitations, protected group games and guests.
Phase6: IMPLEMENTED sharing/unlisted games, opt-in discovery, blocking/reporting.
Phase7: security/accessibility/real Android TWA and mobile Safari/release acceptance.
Phase8: recurring/series events after first release; not approved as Pro-only.
Phase9: separately approved subscriptions/entitlements (no payments now).
Phase10: native Swift using shared backend/account, applicable Apple purchase system.
See the implementation plan for concrete Phase5 steps and remaining release gates.

## 2. Preserve the workspace before doing anything

Run read-only checks first:

```cmd
cd /d "C:\Users\bigda\OneDrive\Documents\Git Projects\OpenCourts"
git remote -v
git status --short --branch
git log -1 --oneline
```

Last Git commit at handoff: `fd35836` (`Bump iOS app version to 1.0.5`). The feature
branch already existed before this work. Its Git HEAD is not the complete deployed
source because all Play Together additions are working-tree changes.

Do not reset, clean, switch branches, overwrite local files, or assume a fresh clone
contains this work. A different agent must use this same workspace or a securely
preserved copy. A Git commit/push or source backup strategy should be discussed
with the user; this documentation task did not authorize pushing anything.
Keep ignored secrets and local databases out of Git. Do not open the Google client
secret JSON visible in the IDE or private keys just to investigate the repository.

## 3. Environment and live URLs

| Item | Verified value |
| --- | --- |
| Cloudflare account ID | `0f71d46e637d75b35ce799d1e90559b3` |
| Existing Pages project | `opencourts` |
| Production site | `https://opencourts.us` |
| Production branch | `main` |
| Production D1 | `opencourts-courts`, UUID `56c414b7-aca5-429b-acfa-b9e8e87b052b` |
| Development D1 | `opencourts-dev`, UUID `cae4849c-3e99-4945-9d70-bef7b48707ce` |
| D1 binding in each environment | `COURTS_DB`, mapped to DIFFERENT databases |
| Preview homepage | `https://feature-play-together.opencourts.pages.dev/` |
| Community home | `https://feature-play-together.opencourts.pages.dev/play-together` |
| Account/settings | `https://feature-play-together.opencourts.pages.dev/account` |
| Latest verified immutable preview | `https://a9127653.opencourts.pages.dev` |
| Production deployment last verified unchanged | `7ef38ff2-91e0-4505-a215-fa16edcfa0bc` |

Reverify these before remote changes. Use the **stable branch alias** for login;
immutable preview URLs are deliberately rejected by authentication origin checks.
Preview deployments share development D1; they do not create fresh data per build.
Changes to Pages secrets require a new preview deployment to load them.

## 4. Safety and approval boundaries

- Work on `feature/play-together`; keep production website, D1, court records,
  bindings, domains, settings and existing mobile releases untouched.
- No production deployment, merge to main, production migration or catalog import.
  `scripts/import-court-catalog.mjs` defaults to production; do not run it with
  `--execute`. The catalog GitHub workflow also targets production explicitly.
- Do not push to GitHub without approval. Pushes can trigger Pages Git deployments.
- Before a new milestone, present its concrete schema/API plan where necessary.
  Before remote migrations/resources/deployments, show the target/action and obtain
  approval. Prior approvals covered the completed dev setup, auth deployment and
  its troubleshooting, not blanket authorization for future releases.
- Local implementation, builds and tests are permitted for approved scope. An
  approval to build a feature is not approval to publish it to production.
- Never paste/log credentials, OAuth codes, ID/access/refresh tokens, session tokens,
  private keys or full private API responses. Use safe aggregate diagnostics.
- Update central documentation, progress, decisions, schema/API notes and test
  evidence after each change. Flag conflicting product instructions before silently
  changing business rules. Current visibility and theme decisions supersede old ones.

## 5. What has been implemented

### Development isolation

- Separate development D1 created and Preview `COURTS_DB` binding verified.
- Local SQLite uses fake UUID `00000000-0000-0000-0000-000000000001`, persisted under
  `.wrangler/play-together-local`; wrapper rejects extra target flags/remote access.
- Both Vite fallbacks to the production courts API were removed. Public upstream
  court/weather providers may still be called. No account/game requests proxy to production.
- `0001_create_tennis_courts.sql` and `0002_player_auth.sql` applied locally and,
  after approval, remotely to `opencourts-dev` only.
- `0003_public_games.sql` applied locally and to remote dev D1 with user approval. It creates games/participants and
  integrity constraints/triggers. Do NOT edit it; use a later migration for corrections.
  Remote Phase 2 migration/deployment completed November 17, 2026.
- Three public-access-tagged OSM Paris sample courts seeded in development. No
  production catalog copy. A U.S. search may still depend on live upstream providers.
- `development/games.fixture.json` remains planning data. Optional LOCAL-ONLY
  `npm.cmd run dev:db:seed-games` now creates one labeled demo game and synthetic
  organizer without any identity/session/login bypass. It was run locally.

### Phase 2 public games (development Preview)

- Browse by location/distance, date, format and advisory skill, with pagination.
- Create at an existing OpenCourts court using an actor/origin-bound, expiring
  signed court proof. Restricted/fee-based courts excluded; unknown access requires
  acknowledgement. Snapshots survive court catalog refreshes.
- Explicit IANA zone, UTC persistence, DST gap/fold rejection; future starts within
  180 days; 30–240-minute durations. Singles capacity 2, doubles 4, organizer counted.
- One visibility-aware model supports future public/unlisted/group audiences, but
  creation is public-only and unlisted/group reads fail closed with 404.
- Atomic game/organizer creation, idempotent submissions, capacity/uniqueness
  constraints, active-session recheck and anti-burst guard.
- Account deletion cascades organized public games; account UI discloses it.
- New routes `/play-together/create` and `/play-together/game?id=UUID` are exported
  by `prepare-dev-pages.mjs`, along with a community directory index.
- See [Phase 2 implementation](play-together-games.md) for schema/API/defaults.
  Phase 2 remote dev migration and Preview deployment completed; no remote demo seed was uploaded.

### Authentication/profile

- Google and Apple only, using `oauth4webapi` and `jose`; no password/email login.
  Arctic was evaluated, found deprecated, and removed; do not reintroduce it.
- Stable OpenCourts player UUIDs; identity uniqueness by issuer/provider subject.
  Matching emails NEVER automatically merge accounts.
- Four D1 tables: `players`, `auth_identities`, `auth_sessions`, `auth_login_attempts`.
- Hash-only seven-day session tokens; HttpOnly/host-only cookies, Secure on HTTPS;
  CSRF and exact Origin checks for mutations; private responses are no-store.
- Browser-bound, expiring, single-use OAuth state/nonce; Google PKCE. Apple's
  form_post uses a short-lived SameSite=None flow cookie while main session is Lax.
- Explicit second-provider linking requires a recent authenticated session and
  cannot steal an identity owned by another account. No manual account merge/unlink UI.
- Editable display name, optional bio/general area/self-reported skill, opt-in
  discovery defaulting off. Private emails/provider identifiers are not returned.
- Logout/current-device and logout-all; explicit account deletion with recent-auth
  checks. Apple refresh material is encrypted and revoked before deletion.
- DB-backed start throttling and bounded requests. Additional public-rollout abuse
  protection still needs review. Native exchange/refresh endpoints are not built.

Implemented route entry: `functions/api/auth/[[path]].ts`.

| Method | Endpoint |
| --- | --- |
| GET | `/api/auth/me` |
| PATCH / DELETE | `/api/auth/me` |
| POST | `/api/auth/google/start`, `/api/auth/apple/start` |
| GET | `/api/auth/google/callback` |
| POST | `/api/auth/apple/callback` |
| POST | `/api/auth/logout`, `/api/auth/logout-all` |

Sign-in returns to `/account`. API is gated to explicit enablement, exact
`AUTH_ORIGIN`, localhost or the stable preview alias, and rejects `main`/production
hosts. This is defense in depth; never substitute gates for correct D1 bindings.

## 6. File map

| Files | Purpose |
| --- | --- |
| `docs/PLAY_TOGETHER.md` | Central approved product rules, progress and decisions |
| `docs/play-together-implementation-plan.md` | Earlier detailed architecture draft; some proposals superseded by central reference |
| `docs/play-together-development.md` | Environment setup and isolation checklist |
| `docs/play-together-authentication.md` | Phase 1 setup, endpoints, security and troubleshooting history |
| `docs/play-together-games.md` | Phase 2 schema, API, defaults, local seed and rollout steps |
| `functions/lib/auth.ts` | Authentication, profile/session lifecycle, provider signing, safe error categories |
| `functions/api/auth/[[path]].ts` | Pages API adapter |
| `functions/db/migrations/0002_player_auth.sql` | Applied Phase 1 migration; do not edit/reapply as new SQL |
| `functions/lib/games.ts`, `functions/lib/game-time.ts`, `functions/api/games/[[path]].ts` | Phase 2 game logic, court proofs, DST conversion, route adapter |
| `functions/db/migrations/0003_public_games.sql` | Local-only game/participant schema and integrity triggers |
| `src/PlayTogether.tsx`, `src/CreateGame.tsx`, `src/GameDetails.tsx`, `src/game-api.ts`, `src/PlayTogetherShell.tsx` | Public discovery, creation and details with shared shell/API models |
| `src/PlayerAccount.tsx` | Sign-in, profile, linking, logout and deletion UI |
| `src/PlayTogetherHeader.tsx` | Shared community/account header with right-side account icon |
| `src/useTheme.ts`, `src/TennisBall.tsx` | Shared automatic device theme and unchanged reusable brand mark |
| `src/play-together.css` | Scoped styles using existing tokens; accessible muted text derived from current palette |
| `src/App.tsx`, `src/main.tsx` | Existing discovery page integrations and community/account route selection |
| `vite.config.ts` | Local API handlers, no production fallback; auth explicitly requires Pages dev |
| `scripts/dev-environment.mjs` | Guarded LOCAL migrate/seed/query/server wrapper |
| `scripts/prepare-dev-pages.mjs` | Exports community/account HTML routes for development build |
| `development/wrangler.local.json` | Local-only migration config; deliberately not root/autodiscovered |
| `development/wrangler.remote.json` | Ignored dev-only account/UUID config; exists locally, no credentials |
| `development/auth.dev.vars.example` | Credential NAMES/placeholders only |
| `tests/auth.test.ts` | Real in-memory SQLite and signed synthetic provider-token security tests |
| `tests/player-account.spec.ts` and snapshots | Browser/navigation/profile/theme tests and four Windows Chrome visual baselines |
| `tests/games.test.ts`, `tests/games.spec.ts` and snapshots | Real-SQL privacy/integrity tests, seven browser flows and six visual baselines |

## 7. Run and test locally

Use Command Prompt or `npm.cmd` in PowerShell. Node 24 is recommended; tests use
built-in `node:sqlite`. Dependencies are already installed in this workspace.

```cmd
npm.cmd run dev:db:migrate
npm.cmd run dev:db:seed
npm.cmd run dev:db:seed-games
npm.cmd run build:dev
npm.cmd run dev:pages
```

The two seed commands are optional; run court seed before game seed.
Open `http://127.0.0.1:8788/play-together` or `/account`. Local Google login needs
private local credentials in ignored `.dev.vars`. Apple requires HTTPS Preview.
Do not copy credentials out of Cloudflare or request secrets in chat just to run tests.
The existing Cloudflare Preview is the simplest place for the user to test real login.

Fast `npm.cmd run dev` renders pages but does not provide D1 authentication; account
API explains that Pages dev is required. After changes, rebuild with `build:dev` and
restart Pages dev. Existing `public/404.html` disables Pages' SPA fallback, so the
development build explicitly exports `play-together.html` and `account.html`.
Export each future route as needed; do not silently introduce production redirects.

```cmd
npm.cmd test
npm.cmd test -- --run tests/auth.test.ts
```

Browser checks on this Windows machine:

```cmd
set "OPENCOURTS_CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
npx.cmd playwright test tests/player-account.spec.ts
```

Use `--update-snapshots` only for intentional visual changes after reviewing them.
Existing baselines are Windows-specific; another OS may need reviewed equivalents.
Tests intercept provider HTTP requests and use synthetic identities; no test auth
bypass or fake login is shipped. No real account data is required for automated tests.

Last verification evidence (do not inflate it):

- Full unit suite: **199 passed** (29 auth, 15 games plus existing suites).
- Full browser suite: **26 passed** (8 account/navigation, 7 games plus existing suites).
- Latest development build passed; existing large MapLibre bundle warning remains.
- Fresh Chrome on deployed Preview verified both pages, account icon, removed theme
  controls and live device-theme switching.
- Live Apple start preflight passed real key import/signing; user then confirmed
  full Apple login. Google login was separately user-confirmed.
- Local Pages runtime: game list/detail and all exported game pages return HTTP
  200 with the demo record; unauthenticated court picker returns 401.
- Profile persistence/linking/logout/deletion are automated-test-covered but have
  not all been reported manually verified on real Preview accounts.
- Mobile Safari, installed Android TWA and native iOS are not device-certified.

The sandbox sometimes prevents esbuild reading ancestor directories on Windows;
normal-filesystem tool execution was needed for builds/browser tests. Do not change
PowerShell execution policy. Avoid duplicate local servers; stop only the verified
OpenCourts server tree you started, never all Node processes.

## 8. Credentials and the resolved Apple problem

Preview is configured with these names; actual values must stay private:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
APPLE_CLIENT_ID
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
APPLE_TOKEN_ENCRYPTION_KEY
AUTH_RATE_LIMIT_SECRET
PLAY_TOGETHER_ENABLED=true
AUTH_ORIGIN=https://feature-play-together.opencourts.pages.dev
VITE_PLAY_TOGETHER=true
```

Apple Services ID: `us.opencourts.playtogether.dev`, associated with the existing
OpenCourts primary iOS App ID. Both Google and Apple callbacks are:
`https://feature-play-together.opencourts.pages.dev/api/auth/PROVIDER/callback`,
replacing PROVIDER with `google` or `apple`. Local Google callback also uses
`http://127.0.0.1:8788/api/auth/google/callback`.

The Apple failure was incomplete PEM text in `APPLE_PRIVATE_KEY`. User replaced it
with the ENTIRE downloaded `.p8`, including BEGIN/END PRIVATE KEY lines, then a new
Preview deployment loaded it. Key preflight and real login now work. Normalization
accepts raw/quoted/escaped/flattened PEM; cryptographic import/signing still validates
the key. Safe stage categories distinguish malformed key, import, signing, token
exchange/signature and account storage without disclosing provider secrets.

`APPLE_TOKEN_ENCRYPTION_KEY` is a DIFFERENT 32-byte key, encoded as 64 hex characters;
never replace it with the Apple PEM. Keep it stable/backed up. Rotating it without
reencrypting stored Apple refresh credentials breaks revocation until reauthentication.
An earlier Google secret was exposed through IDE context and the user was told to
rotate it; verify rotation privately before public rollout. Do not repeat that value.

## 9. Product rules the next agent must preserve

- First release is FREE: free players, group memberships and basic organizers.
  Organizer Pro is future only; $29.99/year is tentative, limits/benefits undecided.
- Google/Apple only. Shared player IDs across web, Android and future native iOS.
  Group membership and future paid entitlements are separate; paying cannot bypass
  private-group approval. Future iOS billing uses Apple's system/StoreKit 2 as applicable;
  Android must use compliant payments and web provider is undecided. No billing now.
- Public, unlisted and group-only games must share game-management logic.
- **Both public AND private groups are discoverable in release one.** Earlier
  hidden-private-group rules are superseded. No hidden/unlisted group feature approved.
- Private-group nonmember previews: name, optional PUBLIC description, general
  location, private badge and Request to Join only. No precise address, member
  identities, schedules, game locations/times, RSVPs, private posts or management data.
- Owner/authorized admin approval is required for private membership, including
  invited players. Forwarded URLs never bypass access checks. Removal revokes access.
- Public-group member lists and members-only activities also remain protected.
  Public open-join versus approval-required policy remains undecided.
- Enforce permissions in Pages Functions/SQL, including searches, API projections,
  notifications and shared links. Prevent duplicate memberships/participation and
  overbooking with atomic operations/database invariants.
- Match existing OpenCourts components, CSS variables, typography, spacing and icons;
  no independent theme/framework. Follow system theme automatically. Support desktop,
  mobile Safari/Chrome and Android TWA. Never redesign unrelated court discovery.

## 10. Next work and unresolved release gates

Do not rebuild deployed Phases1-4. Read the current checkpoint/implementation plan.
The latest approved role design is NOT implemented. Next specify its D1 migration,
legacy Admin transition and event lifecycle, then implement Phase5 locally in small
milestones. No applied migrations may be edited. Do not start Phase6/recurrence or
paid/native work as part of the role update.

Manual group/inbox two-account acceptance and physical Android TWA/Safari remain.
Before public rollout resolve existing MapLibre advisory GHSA-jrc7-96c5-q579,
privacy disclosures, abuse/moderation/retention, provider/account lifecycle checks
and large roster pagination. No production release is authorized by this handoff.

## 11. Remote commands for reference, NOT standing authorization

Inspect the ignored remote config and exact UUID before any remote migration.
Never omit `--config`, substitute production names or run a production importer.

```cmd
npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.remote.json
npm.cmd run build:dev
npx.cmd wrangler pages deploy dist --project-name opencourts --branch feature/play-together --commit-dirty=true
```

Migrations0001-0010 are applied locally and remotely to dev. No new role migration exists. Do not rerun for recreation or edit applied migrations. A migration command can apply ALL pending SQL,
so review the full pending set before asking approval/executing.
Direct upload is intentional: it updates Preview without pushing GitHub or changing
the shared Git build command. A future Git-driven preview must explicitly use
`build:dev`/equivalent route export; ordinary `build` does not enable the account UI.

After any approved remote deployment, verify the environment is `preview`, branch
is `feature/play-together`, D1 UUID is development, stable-alias routes work, and
production deployment/binding remain unchanged. Test through the stable alias.

## 12. Prompt to give the next agent

> Continue OpenCourts in this workspace on feature/play-together. Read this handoff,
> PLAY_TOGETHER.md and the refreshed implementation plan. Preserve all uncommitted
> work. Phases1-4 and polished UI are deployed to isolated Preview a9127653; dev
> migrations0001-0010 applied. Latest approved roles are Owner, Co-owner, Organizer,
> Member, but deployed schema still uses Owner/legacy Admin/Member. User requested
> documentation before further coding; no new role migration exists. Next specify
> safe legacy-role transition and implement Phase5 role permissions, invitations,
> protected group games and member-brought guest capacity. Only Owner may transfer,
> appoint/remove Co-owners or archive; Organizers manage own events only; Members
> cannot create events. Preserve discoverable previews/private content, all-free
> first release, existing theme/design and notifications. Never modify production,
> push, deploy or run remote migrations without applicable approval. Keep handoff current.

Update this handoff when the source, deployment, milestone or next action changes.

November 17 follow-up: Create Game now reuses getPlaceSuggestions for debounced address/city/ZIP suggestions, keyboard selection and direct coordinate search. Development build and focused browser test passed. This follow-up is local only, awaiting Preview deployment approval. Original empty-court search needs the user's exact ZIP to reproduce; no confirmed cause yet.

ZIP 22033 investigation: preview geocode resolves correctly to Fairfax County (38.8755027, -77.3850505). Read-only court API returned 823 mapped features. Original signed-in picker failure remains unconfirmed; no production access used.

Phase 2 court-search follow-up deployed with user approval: November 17, 2026, Preview `10a19a10`. Address/city/ZIP suggestions are available on the stable branch alias. No migration or seed required. Original 22033 signed-in empty result still needs user retest; public API returned 823 features, 796 passing access filters. Build and focused browser test passed before deployment.

Court naming follow-up: picker now invokes the existing bounded court-context handler and reuses normalizeCourt/enrichNearbyCourtDetails from discovery. Closest 40 eligible courts receive named-place/street labels, signed server-side and saved with games. Optional provider failure retains mapped labels. Local implementation; Preview deployment pending approval. No schema changes.

Court-name fix deployed with explicit user approval November 17, 2026: Preview `d3d5d610`, stable branch alias unchanged. Uses existing discovery court-context/name/street enrichment before signing selections. Build and 15 game API tests passed. No migration, remote seed or GitHub push. Existing games retain their saved old court-name snapshots; test by searching and creating a NEW game. User label verification pending.

Latest court-label issue: user screenshot still generic on d3d5d610. Read-only POST court-context for two exact screenshot coordinates returned 171 named features, so context exists. Larger batch failure is suspected, not proven. Revised local batching from 24 to 8 points and include address alongside place labels; build/API regression checks run. Not deployed; signed-in end-to-end label verification still outstanding. Do not claim issue resolved.

Revised eight-point context batches and combined address labels deployed with explicit approval to Preview `f5e3f542`. Stable alias unchanged. Build and 15 game tests pass; actual signed-in picker labels still await user verification. Do not claim resolved until verified. No migration or production changes.

Coordinate street fallback now implemented locally: replaced broad named-feature context batches in game picker with bounded named-highway lookup within 250m for closest 40 eligible courts, reusing existing geometry distance/label rules. Real provider check at 38.8766,-77.3848 returned named streets including Burning Bush Drive and Tallow Tree Court; nearest street is selected geometrically, no address invented. Build and 15 game tests pass. Not deployed; signed-in end-to-end label verification outstanding. Previous broad-context failure cause remains unproven.

Latest approved naming requirement: preserve actual court names; replace generic Tennis courts/Court 1 with associated park/school name, otherwise approximate Near street. Local lookup now includes named park/recreation and school/college/university geometry with existing containment/proximity rules. New game-court-label helper and targeted regression tests. No deployment yet; hosted verification remains pending.

Park/school/street label update deployed with explicit approval to Preview `94a8f12a`. Stable alias unchanged. Build and 17 targeted tests passed. No migrations, production changes or GitHub pushes. User verification of actual picker labels is still pending; earlier deployments failed to show useful labels, so do not claim resolved before verification.

Confirmed live/dev data difference: public live API returns enriched catalog tags opencourts:nearby_place, nearby_street, context_version=2; Preview public API returned raw OSM records without context. Prepared development/fairfax-public-courts.sql from closest 100 enriched public court records (no users/accounts). Remote dev import NOT performed. Recommended dev-only fixture command: npx.cmd wrangler d1 execute opencourts-dev --remote --config development/wrangler.remote.json --file development/fairfax-public-courts.sql. Requires explicit approval. Do not run production importer. Existing normalizeCourt already consumes these tags.

Approved Fairfax fixture import completed November 17: 100 enriched public court records in remote opencourts-dev only, verified context_version=2 count 100. Removed BEGIN/COMMIT wrappers because D1 file import rejects them; first attempt failed before import, retry succeeded. No user data or production writes. Existing six-hour court edge cache can retain earlier raw OSM responses; preview response verification follows.

Post-import verification: Preview /api/courts still returned 823 raw records, zero enriched; old edge-cache response confirmed versus 100 enriched dev DB records. Prepared catalog-first picker read using existing findCourtsInCatalog, no production access, avoids stale raw-map cache. Build/targeted tests run; this source change needs preview deployment approval.

Catalog-first picker fix deployed with explicit approval: Preview `80b21fe9`, November 17. Uses isolated COURTS_DB directly before cached raw map results. 100 enriched Fairfax public fixtures already imported; build and 17 targeted tests passed. Actual authenticated picker labels still require user verification. No production modifications/GitHub push.

Profile-save report clarified by user: fields remain populated; Save profile button always visible caused confusion, no lost profile data confirmed. Local UI now disables save and says Profile saved when draft matches account, enables Save profile on edits. Build run; deployment pending approval.

User confirmed profile was saved; confusion involved another browser/session, no persistence defect confirmed. Requested clearer save behavior implemented locally: Profile saved disabled when unchanged, Save profile enabled for changes, Saving... while request runs. Focused browser test checks editing, reverting, save and refresh against persisted API fixture. Preview deployment still requires approval.

User screenshot confirms named park/school/street court labels now appear after catalog-first deployment. New local UI fix: paired game form labels align content at top and controls have consistent 48px heights, preventing helper text from stretching adjacent date/duration controls. Desktop/mobile browser geometry check added. Profile saved-state UI also remains local pending deployment approval.

Profile saved-state and game form alignment fixes deployed with explicit approval to Preview `784ae071`. Stable alias unchanged. Build passed; focused profile state/refresh and desktop/mobile alignment browser tests passed. No database changes or GitHub push. Court selection collapse/change-court UX was suggested but is NOT implemented.

## Latest Phase 3 work (November 17, 2026)

User authorized Phase 3 local implementation. Latest joining decision: all PUBLIC games require approval; approved GROUP members may join immediately; group guests require approval without bypassing private-content restrictions. See docs/play-together-participation.md. New migration 0004 applied LOCAL ONLY. Source includes request/withdraw, atomic approval, rejection/removal, organizer title/notes edits with version checks, cancel, and My Games. Existing remote Preview remains Phase 2 (784ae071). Remote migration/deployment need explicit approval. Final checks in progress.

Phase 3 verification: development build passes; full unit suite passed (209 tests). Game lifecycle suite 23 passed, including eight Phase 3 tests. Game browser suite 12 passed, including new approval/withdraw/My Games/organizer cancellation tests; light/dark snapshots updated and mobile dark detail reviewed. Initial full browser run had one ambiguous test selector (not app failure), corrected and game suite passed; final full suite rerun in progress. Local migration 0004 applied, remote pending. Next step: request approval for dev-only 0004 migration and Preview rollout, then user two-account acceptance. Organizer edits currently title/notes only; no rescheduling, notifications, guest groups or recurrence yet.

Final Phase 3 validation: all 32 browser tests passed (including existing court/weather/navigation flows); full unit suite 209 passed; development build and git diff --check passed. Phase 3 local implementation ready for review. Remote 0004 migration/Preview deployment NOT run. Next action: user approval for dev-only migration + deploy, then two-account manual acceptance.

Latest user clarification: group member may bring guests (Sam + Tom + 1 guest = 3 places). Guest capacity design recorded in participation guide; group guest UI/schema not implemented yet. Approved member self-joining immediate, guest additions require approval; guests gain no private-content permission. Added optional confirmed-player cancellation reason UI, private organizer cancellation history, and migration 0005 applied LOCAL ONLY. Remote rollout now needs BOTH 0004 and 0005. Pending requests can withdraw; approved players can leave regardless of providing a reason. Latest targeted API suite: 24 passed. Build/browser follow-up in progress.

Cancellation follow-up validation complete: development build passed; game API suite 24 passed; focused browser checks for optional cancellation reason and organizer approval/cancellation both passed. Latest source remains LOCAL; remote 0004/0005 and Phase 3 deploy await approval.

Host notification requirement implemented locally: private My Games in-app inbox for request withdrawal and approved cancellation, optional reason, released-place count, unread/read states. Atomic SQL with participation removal, retries deduplicated; owner-only inbox access. New 0006 applied LOCAL ONLY. Remote 0004/0005/0006 all pending. No email/push configured; guest counts remain future group phase. API suite 25 passed; build/browser inbox check in progress.

Host notification checks complete: build passed, 25 game API tests passed. Game browser run passed 13/14; dashboard test fixture lacked the new notifications endpoint and was corrected, then dashboard/inbox checks both passed. No application change needed for that fixture issue. Source ready for dev rollout approval; migrations 0004/0005/0006 pending remotely.

## Latest approved rollout: Phase 3 deployed

November 17: user explicitly approved migrations 0004-0006 and Preview deployment. Verified only those migrations pending, then applied all three to dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Deployment cf3d2b64 serves the stable feature alias. Verified HTML routes including My Games return200 and latest bundle; public list returns approval joining policy; signed-out My Games/notifications APIs return401. Production deployment 7ef38ff2 and production D1 binding unchanged. No GitHub push.

Next: user test with TWO accounts: guest requests place, host approves, guest leaves with optional reason, host sees private notification in My Games. Also test rejection/removal, capacity, edits/cancel. Groups/guest-plus-one capacity remain future group phase. Email/push unimplemented. Earlier statements that migrations/deployment are pending are superseded by this rollout.

Latest local corrections: organizer self-join now409 by account ID; top-header bell/unread count links to host inbox on community/account/dev discovery; new pending join requests notify host using new migration0007 trigger. 0007 applied LOCAL ONLY; remote pending. Build and26 game API tests passed. Screenshot example had zero pending requests at read-only diagnostic time, original same-account vs same-name not established. Browser/theme tests running. Existing remote remains cf3d2b64.

Follow-up validation complete: development build,26 game API tests and24 game/account browser tests passed, including new header bell/inbox navigation and320px fit. Theme screenshots updated. Source/migration0007 remain local; request approval for dev-only0007 and Preview deployment before publishing.

Latest requester notification work: local0008 replaces host-only table with game_notifications(recipient_id), preserving existing events/read states. Triggers privately notify requesters on approval/rejection/removal and pending/confirmed players on game cancellation, without duplicates for unchanged-state retries. Combined Notifications inbox/bell. 0007 AND0008 applied LOCAL ONLY; both pending remotely. Backend suite28 passed; build/browser checks running. No email/push, group notifications or production changes.

Requester notification final verification: development build passed; full unit suite214 passed; all16 game browser tests passed including requester inbox and header bell. diff whitespace checks passed. Next action request approval for dev-only pending0007/0008 and Preview deployment. Existing remote still cf3d2b64; no migration or deployment performed this turn.

## Latest rollout: host/requester alerts and bell

User approved development migrations0007/0008 and Preview deployment November17. Both migrations applied successfully to isolated dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Preview b5f880ff serves the stable alias with header bell, host new-request alerts, requester approval/rejection/removal/cancellation alerts and organizer self-request409. Existing notification events preserved by migration. Previous pending-rollout statements superseded. Build214 unit/16 game browser checks passed before rollout. Next user two-account notification acceptance; sign into same account/provider across browsers. No email/push or group guest implementation. Production/GitHub untouched.

Phase 4 final verification: development build passes; full227-unit/43-browser regression passed. Final group-specific suite12 passed after adding private-search and peer/removed-admin tests. Group screenshots inspected; adjacent back-link spacing corrected, rebuilt and7 group browser checks rerun successfully. Latest build includes group-specific Back to groups link. Pending remote0009/0010 and Preview deployment require approval. No production or remote data changes this phase.

Latest user request: organize inbox and allow approvals directly there. Local fix replaces flex list with stacked notification cards (requester, game/group, current status, timestamp, actions). Server projects actionPlayerId only for current authorized pending requests. Approve/Deny call existing APIs, preserve capacity/role checks, mark read and refresh bell/status. Resolved requests lose action buttons. Build,31 game/12 group API tests,19 game browser checks plus group inbox approval test passed. Mobile snapshots reviewed. No new migration for UI, but pending Phase4 migrations0009/0010 still required before deploying combined build. No remote deployment yet.

## Latest approved rollout: Phase 4 and inline inbox decisions

User authorized Preview upload. Verified ONLY0009/0010 pending; applied both to opencourts-dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce and deployed14cd548b. Stable alias serves latest index-vay_ncRX.js on all group routes and My Games. Public group API returns empty discovery successfully (no seed groups created), signed-out My Groups/inbox return401. Deployed environment preview/branch feature/play-together/D1 verified. Production7ef38ff2 and production D1 unchanged. No GitHub push.

Test with real accounts: owner creates a private group; outsider sees only public preview, requests membership; owner approves directly in organized inbox; member sees roster/private details; owner removes member and member loses access. Also test public groups, admins, withdrawal, owner transfer/archive and game inbox Approve/Deny. Invitations/group games/member-guests remain next phase. Earlier pending/local-only statements superseded by this checkpoint.

Latest local UI request: group navigation links converted to styled icon buttons (Find groups/My Groups/Create group), using existing colors/borders/shadows and active aria-current state. Responsive two-column mobile arrangement with full-width Create group, keyboard focus and reduced-motion support. Build and7 group browser tests passed; mobile light/dark nav baselines added/reviewed. No database changes. NOT deployed; preview remains14cd548b until approval.

Latest local inbox compactness request: reduced panel/card padding and gaps, combined game/group link with timestamp, compact success messages, omitted empty action containers for resolved/read requests. Decisions retain44px touch targets. Also tightened <=360px header spacing for bell/account/menu. Build passed; inline game/group decisions passed; light/dark desktop/mobile notification baselines reviewed and320px responsive check passed after waiting for viewport reflow. Navigation/group regression13 passed. Group navigation button polish remains bundled and LOCAL. Preview remains14cd548b pending approval for both UI updates. No schema or remote changes.

Latest local design request: consistent polished Play Together action styling across games/groups/account/inbox (existing theme tokens, shared6px radius, subtle token-derived shadow, hover/focus/disabled/reduced-motion states). Key navigation actions My Games/Browse public games/View game/Open group use buttons; group search gains icon; Mark as read is a quiet secondary button. Existing design/colors retained. Build passed; game/group/account browser and refreshed theme baselines running. No DB changes or deployment. Bundles prior group-button and compact-inbox updates; approval needed for Preview.

Shared button/compact inbox verification complete: development build and36 game/group/account browser tests passed, including light/dark and320px layouts. Desktop dark inbox screenshot reviewed. No schema changes; ready for Preview UI deployment approval. Removed temporary test layout diagnostic logging.

## Latest review build: polished actions and compact inbox

User explicitly requested publication for review. Preview a9127653 serves stable feature alias with index-Dz31s1Qs.js: polished shared actions/group navigation, compact notification cards and narrow-header spacing. Build and36 game/group/account browser checks passed. No schema changes/migrations or GitHub push for this UI rollout. Production deployment and bindings unchanged; group/inbox/account routes/latest bundle smoke-checked. Earlier local-only UI notes are historical. User visual review next; Phase5 group invitations/games/member-guests still unimplemented.

Documentation-only checkpoint: approved role model/current deployed state/next phases refreshed at user request. No application files, database state, branches or remote configuration changed in this turn.

Latest instruction: user authorized moving to next phase. Reviewed current schema/permissions; prepared docs/play-together-roles.md Phase5A transition proposal. Recommended retaining legacy Admin permissions temporarily, Owner explicitly converts to new roles; no automatic privilege elevation/demotion. Awaiting user choice on this transition before role coding. No app/schema/remote changes this turn. Next steps remain roles, invites, protected games, guests, event lifecycle.

## Phase 5A local implementation checkpoint

User approved retaining legacy Admins unchanged until Owner conversion. Implemented
additive0011_group_roles.sql with nullable assigned_role (member/organizer/coowner).
NULL preserves legacy role. Owner identity remains tennis_groups.owner_id. Existing
memberships/triggers retained; request notifications now include effective Co-owners
and exclude demoted legacy Admins. Active role checks and target protections repeated
in SQL; only Owner appoints/removes Co-owners, manages legacy Admin roles, transfers
or archives. Co-owner assigns/removes ordinary Organizer/Member roles. Organizer has
no group-management authority; group-event permissions remain dormant until games.

Role selector requires confirmation. My Groups shows effective role. Re-request/
leave clears elevated assignment. Migration0011 applied LOCAL ONLY. Build and231
unit tests passed;7 group browser regressions plus explicit Owner Co-owner assignment
check passed. Initial new browser fixture used the member's ID as owner; corrected
fixture passed. No remote changes/deployment. Preview remains a9127653, remote0010.
Next request approval for dev0011 plus Preview; invitations/group games/guests follow.

Latest approved rollout November17: migration0011 applied to remote opencourts-dev only; Preview79f9e7ca published with role upgrade and styled game Directions button using Navigation icon. Existing court-discovery directions were already buttons. Build/28 game+group browser checks passed; earlier231-unit run passed. Legacy Admins retain authority until explicit Owner conversion; Co-owner/Organizer roles now implemented, group events/guests remain next. Production unchanged; no GitHub push. Current stable alias serves index-kMUzYR4L.js. Supersedes earlier design-only/local-only role statements.

Latest local UI fix: group member management reorganized into bordered rows with name/role badges, aligned controls and styled theme-aware role selects. Long role explanation moved to expandable help; mobile controls use grid. No permission/schema changes. Build/group browser verification running; Preview deployment pending approval. Existing Preview79f9e7ca unchanged.

Member layout build passed; privacy test selector updated for new name/badge markup, rerun group suite passes. UI changes remain local; request Preview approval.

Latest user authorization: add one optional player photo/group cover. Inspected repo: no R2/upload bindings. Read-only R2 API returned403; bucket availability/billing unconfirmed. Prepared docs/play-together-media.md concrete isolated bucket command/Preview binding and secure upload/storage/privacy/test contract. No Cloudflare resource or app changes this turn. Need approval before r2 bucket create opencourts-media-dev or binding changes; transformation availability/cost needs check before service setup. Group cover explicitly public preview, player image follows profile/member permissions. Preserve pending local member layout fix.

Media setup attempted with explicit approval: r2 bucket create opencourts-media-dev failed code10042 (enable R2 through Cloudflare Dashboard). No resources/bindings created. Ask user to activate R2, then retry same already-approved dev bucket command. Approved resize limits512px avatar/1200x600 cover, optimized WebP only, discard originals. No uploads implemented/enabled. Preserve local group-member layout fix; Preview remains79f9e7ca. No production changes.

Latest media setup: user activated R2. Empty bucket list verified, then created approved private opencourts-media-dev and added Preview-only PLAY_TOGETHER_MEDIA binding. Production R2 null/production7ef38ff2 unchanged and Preview D1 dev verified. No image upload code yet; server image transform setup still pending. No deployment this turn; binding needs subsequent deployment. Existing pending local member layout fix preserved.

Media follow-up: prepared private transform Worker source/config development/media-processor (not deployed). Pages does not document IMAGES binding, so use service Worker with no public URL/no storage permissions. Need explicit approval for new Worker deploy and Preview service binding; check Images capability/cost first. End-to-end upload/image validation/metadata stripping not verified. No upload UI or media migration created. Existing R2 binding remains Preview-only.

Latest media infrastructure: approved private Worker opencourts-media-processor-dev deployed (a55bc1f7-3b84-4b7e-afd8-4d775b482aa1), IMAGES binding, public subdomain/previews disabled verified. Pages Preview-only PLAY_TOGETHER_IMAGE_PROCESSOR binding added; production services null/site7ef38ff2 unchanged; R2 dev binding retained. Worker service environment=production is its default environment, not production website. Three local processor mock tests passed; live transform/EXIF behavior unverified. Upload routes/schema/UI still not implemented, bindings need subsequent Pages deployment. Do not claim photo feature complete. Preserve local member layout change; latest site remains79f9e7ca.

Latest local media implementation:0012 media references/cleanup queue/deletion triggers applied LOCAL ONLY; authenticated API GET/PUT/DELETE for own player/Owner-Coowner group cover,5MB bounded input, private processor output inspected for dimensions/EXIF/animation then stored, optimistic replacement and old-key cleanup. PhotoUpload controls added to Account/group.16 group/media tests+3 processor tests pass. MEDIA_UPLOADS_ENABLED remains unset remotely; actual IMAGES transform/metadata behavior still unverified. No media deployment/migration this turn. Cleanup backlog drains on media writes, no sweeper yet. Need live binding integration + race review before enabling upload. Build/browser checks running.

Media local verification complete: build passed; full unit suite passed (236 tests: prior231 +3 processor +2 media);17 group/account browser checks passed and optional photo upload/save/remove test passed separately. Initial photo browser fixture served404 after success; corrected valid image fixture passed. Local media feature not deployed;0012 pending remotely; MEDIA_UPLOADS_ENABLED unset. Live processor decode/re-encode and EXIF/animation verification still required. Known follow-ups: actual transform compatibility/metadata behavior; cleanup queue scheduling/orphan failure recovery review; member photo display beyond own-account not implemented. No remote media schema/site deployment this turn.

Latest approved Preview rollout:0012 applied to opencourts-dev only; media/member-layout build d02fb1eb deployed (index-C37aM5Kh.js), stable alias unchanged. MEDIA_UPLOADS_ENABLED remains unset: controls are reviewable but saving photos intentionally unavailable until actual private processor transform/metadata verification. Remote dev migrations0001-0012 applied. Production unchanged/no GitHub push. Next finish real image integration/cleanup validation before enabling uploads, then secure invitations, protected group games and guest capacity.

Latest local photo UI cleanup: single styled icon picker (native file input hidden), compact avatar/cover placeholder, bordered editor with aligned actions and explicit Unsaved preview badge, filename truncation and discard action; no false saved state. Responsive stacked mobile layout, smaller group placeholder; missing noneditable group cover hidden. Build/browser snapshots running. No API/schema/flag changes; Preview remains d02fb1eb, uploads disabled.

Photo cleanup validation complete: build and18 account/group browser tests passed, mobile account screenshot reviewed. Corrected a file-format separator rendering issue found in review; final rebuild run. Local only, no deployment or upload enablement; request Preview approval.

Latest requested photo interaction: local pencil overlay on avatar/group cover opens same picker for add/change; separate Choose photo button removed, Save/Discard remain for explicit unsaved selection.44px accessible pencil control, keyboard label, theme tokens and mobile single-column layout. Upload flag still disabled. Build/photo browser checks running; no deployment.

Latest local group location UI: MapPin icon alongside general-location text in group discovery/My Groups/detail, with wrapping and theme-aware inherited colors. No precise coordinates or private-address exposure added. Bundled with pending photo pencil/cleanup changes; no deployment. Build/group browser checks running.

Latest approved UI review build: Preview eb2f943b deployed, stable alias unchanged, index-B47lirXy.js. Includes compact photo editors, add/change pencil overlays, explicit unsaved preview/discard, group location MapPin and earlier member layout fixes. Build/8 group browser tests and photo interaction checks passed. No migrations this rollout; media saving remains disabled (MEDIA_UPLOADS_ENABLED unset) pending live transformation verification. Production unchanged/no GitHub push. Next real processor integration/cleanup checks, then enablement approval and invitations/group games/guests.

Media verification latest: actual Cloudflare Images remote binding successfully transformed EXIF-bearing JPEG to512-square avatar and1200x600 cover, WebP with no EXIF/XMP/ICC. Fixed MIME info bug(image/jpeg vs jpeg) in LOCAL processor source; deployed processor still old until approved redeploy.19 media/group tests passed/build passed. Temporary localhost check sessions stopped/config removed. Next approve private processor redeploy + Pages UI deploy + Preview-only MEDIA_UPLOADS_ENABLED=true. Current site eb2f943b/uploads disabled. No production writes/config changes.

Latest approved media enablement: private processor fix deployed version a55617d2-08b0-404d-8fff-513b240c4de5; MEDIA_UPLOADS_ENABLED=true set on Pages PREVIEW ONLY preserving existing vars; Preview643c7700 published. Stable alias unchanged. Remote dev0012 already applied. Production upload flag absent/deployment7ef38ff2 unchanged; processor no public targets. Real Cloudflare binding resize/metadata checks passed before rollout. User must now test real authenticated photo save/refresh/replace/remove and group Owner/Coowner cover. No fake user account/session created. Cleanup queue currently drained on authorized media writes; no scheduled sweeper. Invitations/group games/guests remain next.

Latest local header avatar request: AccountAvatar component loads signed-in player's saved private photo; used by shared community/account header and dev court-discovery header. Falls back to person icon for signed-out/missing/failed photo. Photo save/remove dispatch refresh event; header also refreshes on focus. No private/public media permission change. Build and4 photo/profile browser checks plus saved-header-photo/fallback test passed. Not deployed; Preview remains643c7700.

Latest: approved header-photo update deployed to Preview36c696b2 (index-DrmkPMDf.js), stable alias verified200/dev D1/prod7ef38ff2 unchanged. Continued next work locally: secure group invitations,0013 applied LOCAL ONLY. Owner/Coowner create/copy/revoke, token hashes only, fragment link, public-safe preview, expiry/creator-role validity, acceptance creates pending membership/idempotent redemption. See play-together-invitations.md. Build and18 group API checks pass;10 group browser checks run. No remote0013 or invitation deploy. Preserve existing photos/storage permissions. Next rollout approval then group games/guest capacity.

Invitation validation final: development build passed; full238 unit tests passed;10 group browser tests passed after fixtures supplied invitations:[] for new endpoint (earlier timeouts were fixture render failures). Existing18 group API tests include invitation hash/preview/pending dedup/revoke/expiry/role restrictions. Invitation UI/schema remains local; next request explicit dev0013 + Preview rollout approval.

Latest approved rollout: invitation0013 applied to opencourts-dev and Preview962fb2da published (index-CJSUEJ5t.js). Stable alias invitation route verified. Production7ef38ff2 unchanged. Group-only games next: shared groupGameAccess authorization foundation added LOCALLY,19 group tests pass. It denies outsiders/removed members; Owner/Coowner create/manage all, Organizer creates/manages own, ordinary Member/legacy Admin cannot create. No group game routes/UI enabled yet. User explicitly selected lifecycle: upcoming games transfer to primary Owner when Organizer leaves/loses role; departing member places must be released. Implement creation/list/detail/participation/notifications with those checks next; do not claim group games complete.

Latest local milestone group games/personal feed: shared group-capability gated creation/detail/participation, protected group and own public activity feed All/MyGames/MyGroups with25-item cursor pages; group upcoming list/create action. Approved members self-join, Owner/Coowner manage all, Organizer own; members/legacyAdmin cannot create. Local0014/0015 enforce membership participation and approved Organizer-departure transfer to primary Owner; remove/leave releases future place. Group private inbox/MyGames membership filtered. Build/full240 unit tests passed;31 game/group browser tests running. Remote Preview still962fb2da,0013. No group-game remote migrations/deploy. Guests remain next. See play-together-group-games.md.


November 17 - Responsive floating navigation: Play Together Header now includes the existing court-site dock style on phones/tablets up to 1100px. Courts uses the live List icon, Find Games uses Search, Groups uses UsersRound, with CalendarDays/My Games and Rss/My Feed. Current tab, accessible labels/focus, safe-area offset and content clearance included. Desktop retains header navigation. Development build passed; two browser tests cover light/dark at 320, 768, 1024 and desktop-hidden at 1440. Shared stylesheet visibility conflict corrected. Existing screenshot baselines may need review/update for the new dock. Local only, not deployed. Pending dev0014/0015 rollout and guest work unchanged.


Preview rollout November 17: user approved publication. Dev-only migrations 0014/0015 successfully applied to opencourts-dev (cae4849c-3e99-4945-9d70-bef7b48707ce). Build deployed directly to existing Pages project opencourts, feature/play-together branch, deployment 17d2fa6b-4ea2-47c8-8081-095644e85ee2. Stable URL https://feature-play-together.opencourts.pages.dev; immutable https://17d2fa6b.opencourts.pages.dev. Includes group games, personal feed and phone/tablet floating dock. Feed/groups/account returned HTTP200 with bundle index-LsELY3PS.js; public games/auth-me HTTP200. Preview/production D1 UUIDs confirmed separate. No GitHub push or production deployment. Real signed-in two-account acceptance remains manual; next guest-party requests/capacity. This supersedes all local-only/remote0013 checkpoints above.


Mobile follow-up November 17: phone headers (<=620px) hide hamburger on map and Play Together; account/notifications remain visible. Map floating dock now adds a UsersRound Play Together shortcut, labeled Play for narrow-screen fit and aria-label Play Together. Shortcut is gated by existing development/VITE_PLAY_TOGETHER flag so disabled builds cannot link to disabled features. All existing map/weather tabs retained. Three browser checks passed (light/dark phone-tablet dock and 320px map shortcut navigation); local only, not yet deployed. Previous hosted build remains17d2fa6b.


Preview publication November 17: approved phone header cleanup/map Play shortcut deployed to https://6dc50889.opencourts.pages.dev, stable https://feature-play-together.opencourts.pages.dev. HTTP200 with bundle index-BRekpr2f.js verified. No migrations, GitHub push or production changes. This supersedes prior local-only mobile follow-up note.


November 17 mobile spacing follow-up: phone-only <=620px hides direct page-level back links (bottom dock remains), reduces main top padding to14px and heading/title/copy spacing. Desktop/tablet back links unchanged; contextual links inside cards stay visible. Development build passed. Focused browser coverage includes light/dark phone title placement and desktop back-link visibility. Local only; Preview remains6dc50889 until approved publication.


November 17 community feed layout: local feed now follows approved Meetup reference structure while retaining OpenCourts theme/type. Compact Your Groups horizontal shortcuts (approved active memberships only), group covers with tennis fallback, Start a tennis group action, one-row pill filters, chronological date sections and dense event rows with court/time/group/host/count and View game. Group media uses existing public cover endpoint; no roster/photo privacy expansion. No fake Saved/Past/share controls added; those require future functionality. Seven responsive/browser checks and feed filter check passed, new light/dark visual baselines reviewed. Development build verified; pending Preview publication. Last hosted build remains6dc50889, remote dev migrations0015. Next product milestone remains guest-party approval/capacity.


Preview published: compact community feed and phone spacing now hosted at https://99dbfdcd.opencourts.pages.dev, alias https://feature-play-together.opencourts.pages.dev. Rebuilt successfully; feed HTTP200 and index-knwLHojQ.js verified. No new migrations or production changes. Previous attempt was not executed because automatic approval service usage limit; user requested retry and approved publication succeeded. This supersedes local-only feed notes.


November17 badge/avatar fix LOCAL ONLY: notification link inherited avatar overflow:hidden, clipping count badge. Explicit bell overflow:visible fixes it. Header portrait now object-fit:contain with78% inset inside round frame; player-photo editor contain. Private processor avatar transform preserves full source aspect ratio within512x512 without upscaling (cover output unchanged1200x600). Earlier stored square crops cannot be recovered; re-upload original AFTER processor update deploy. Four processor tests (portrait/landscape/small/cover/privacy bounds) and browser check at320/440/1440 passed; dev build passed. Publish BOTH private development media processor and Pages Preview before asking user to re-upload. No DB migration/resources/production changes needed. Last hosted Preview remains99dbfdcd and processor versiona55617d2.


November17 group shortcut refinement LOCAL: user disliked horizontal Tennis/Find Groups slider. Replaced carousel with responsive grid (three desktop columns, two tablet, full-width phone rows) preserving full names/covers and Find Groups action. No horizontal scrollbar/clipping. Two light/dark visual tests passed with explicit rail overflow/bounds checks. Includes pending badge/avatar fixes; no publication yet. Update processor and Preview together on approval; original headshot must be re-uploaded afterward.


November17 latest: approved fixes published to https://703d8689.opencourts.pages.dev and stable alias. Private processor c5e01912-6e84-4938-bf78-049d2096bd24 deployed. Feed HTTP200 with index-DJy8xIGV.js verified; production still7ef38ff2. User may re-upload original full headshot. Subsequent guest milestone implemented LOCAL ONLY:0016_game_guests.sql, game-guests.ts, GameGuests.tsx, shared capacity totals and private guest notifications. Full243 units passed; local0016 migration successful; remote remains0015. No guest deployment yet. See play-together-guests.md for behavior, limitations and next checks. Preserve all uncommitted/untracked work.


Guest Preview rollout approved and completed: migration0016 applied only to opencourts-dev cae4849c-3e99-4945-9d70-bef7b48707ce. New deployment https://6eec28c4.opencourts.pages.dev, alias https://feature-play-together.opencourts.pages.dev. Bundle index-3lPfxaLb.js verified; public games endpoint HTTP200. Production deployment remains7ef38ff2. No GitHub push or production mutation. Guest feature now ready for manual two-account acceptance (host approves player first for public games, then approves guests; approved group members self-join then request guests). This supersedes LOCAL ONLY/remote0015 guest notes. Next: Preview acceptance, then sharing/unlisted games and safety/discovery milestones.


November17 account photo polish LOCAL: removed nested player-photo card, added compact divider section/portrait frame and understated remove action; pencil offset outside frame. Image now lives in absolutely constrained inner clip wrapper so tall portrait intrinsic sizing cannot overflow the grid and cut off the face. Group editor keeps existing cover treatment. Three upload/pencil/header checks plus two light/dark portrait framing checks at320/393/1280 passed; visual baselines reviewed and dev build passed. Last hosted remains6eec28c4. No migration or processor change needed for this polish; Preview publication pending.


Approved account portrait polish published to https://0b10ef19.opencourts.pages.dev and stable feature alias. Account HTTP200 with index-CJikg5Ua.js verified. Remote dev schema remains0016, processor c5e01912. Production unchanged; no GitHub push. Supersedes local-only portrait editor checkpoint.


November17 header avatar refinement LOCAL: account photo now fills circular header control using object-fit:cover and object-position50%25% (face-focused), instead of78% contain postage-stamp rendering. Full portrait remains contain in profile editor; original asset untouched. Browser badge/avatar check at320/440/1440 passed. Preview publication pending, last hosted0b10ef19.


November17 approved avatar preview alignment LOCAL: player-photo editor is now circular with identical object-fit:cover/object-position50%25% as header avatar, including selected-file preview before saving. Original optimized portrait remains uncropped in storage so framing is presentation-only. Supersedes full-portrait-editor UI decision; group covers unchanged. Local visual tests updated for circular framing. Preview deployment pending; hosted remains0b10ef19.


Approved circular avatar alignment published: https://30bcd70e.opencourts.pages.dev, stable feature alias unchanged. Account HTTP200 with index-DUUW5bWl.js verified. Includes header full-circle face framing and same circular upload preview. Remote dev0016 and processor c5e01912 unchanged; production unchanged. Supersedes local-only avatar notes.


November17 avatar positioning editor implemented: selecting a player photo opens circular draggable preview, Zoom1-3x, horizontal/vertical keyboard-accessible sliders and Reset. Save generates512x512 PNG of chosen framing in browser; existing private processor validates/re-encodes bounded metadata-free WebP. Saved square framing matches header/editor circle. No schema/processor change. This supersedes fixed50%25% as the only framing choice; stored avatar is now the selected crop, so later reframing requires selecting source again. Original local source file is not uploaded/stored. Three existing photo lifecycle checks and two light/dark crop tests passed, including drag/keyboard/zoom and decoded uploaded pixels proving selected blue half was saved,512square. Development build and Preview publication recorded next.


Avatar crop editor published with explicit Preview approval to https://aabb4c22.opencourts.pages.dev and stable feature alias. Account HTTP200 with index-vcxdfgXf.js verified. Five focused photo checks and development build passed. No DB migration, processor deployment, GitHub push or production changes. To test: account pencil -> select original -> drag/use sliders -> Save photo -> header matches.


Crop controls layout fix LOCAL November17: crop preview spans both photo grid columns, but subsequent controls incorrectly fell into96px column. Added explicit cropping state class and full-width controls row, normal-width metadata, aligned save/discard actions and responsive button wrapping. Zoom/drag/crop math unchanged. Two browser crop tests pass at320/440/1280 in both themes with screenshot baselines and exact saved512square pixel check; build passed. Last hosted remainsaabb4c22; layout fix awaiting publication.


Approved crop-controls layout fix deployed to https://795ab8c7.opencourts.pages.dev and stable feature alias. Account HTTP200/index-CaoyvesW.js verified. No migration/processor/production changes. Supersedes local-only crop layout note; pending next product work remains sharing/unlisted games and safety/discovery after user acceptance.


November17 member directory refinement LOCAL: replaced separate padded member cards with compact continuous48px-min rows and subtle horizontal dividers; name left and understated role right. Existing manager actions remain44px touch targets and wrap separately on phones. No roster privacy/API changes. Light/dark directory browser checks at393/1280 with compact row height assertions plus revoked-membership and owner workflow checks; build recorded next. Last hosted795ab8c7, publication pending.


Final safeguard: block relationships are rechecked within participant approval SQL, not only before the batch. Concurrency regression inserts a block between the permission read and mutation and confirms no participant is inserted. Full251-unit suite passed afterward;76 complete browser checks passed for this unchanged interface. Final Preview65f4d761 successfully deployed, bundle unchanged index-CBW7dPXl.js; production remains7ef38ff2. Actual Preview synthetic26-check acceptance completed for this milestone with fixture cleanup. All current guides refreshed; real OAuth/physical-device and operational release gates remain in release checklist.


November17 follow-up LOCAL, not deployed: My Games now focuses on schedule only. Notification bell links to dedicated /play-together/notifications inbox; old my-games#host-notifications redirects there. Inbox has All/Unread,20-at-a-time UI rendering within existing latest100 API cap, empty/loading/sign-in states, existing inline Approve/Deny/read controls. Account auth/me returns connectedAccounts(provider,email) only for authenticated own account; public player DTO unchanged, signed-out accounts empty. Profile connected sign-in rows show private provider email or unavailable text, including Apple relay explanation. No migration/resources/production changes.30 auth unit tests and12 focused browser checks passed/recorded; build passed. Last hosted65f4d761 remains unchanged until Preview approval. Update deployment snapshot after publication.


Approved inbox/account-email follow-up published November17: https://10cf494a.opencourts.pages.dev and stable feature alias. Notifications/My Games/Account HTTP200 with index-BTKwqqVl.js verified. Bell opens dedicated inbox; schedule no longer renders notification cards; own connected-provider emails shown privately in Account.30 auth unit checks/12 focused browsers/build passed. No migration, production changes or GitHub push. Supersedes local-only inbox/email checkpoint.


November17 schedule-tabs update LOCAL ONLY: My Games defaults Upcoming, with Requests/Past/Cancelled. Server-side classification and50-item cursor pagination replace mixed100-row history. In-progress until ends_at, old pending requests expire into Cancelled, left/withdrawn/removed/declined statuses labeled. Existing cancellation/withdrawal records preserve own history; revoked group membership hides private history and reasons never enter schedule DTO.39 games+24 groups API tests/four browser checks/build passed. No migration/resources/production changes. Last hosted10cf494a; Preview publication pending. See play-together-schedule.md.


November17 player location search LOCAL ONLY: player lookup previously compared literal q with saved general_location, so22033 could not matchFairfax. New player-search-location helper uses existing geocode handler for US ZIP/ZIP+4, validates returned postcode/country, expands safe city/county labels (e.g22033 ->Fairfax County ->Fairfax), and supports city-state labels through existing cityStateQuery. Player names are never sent to geocoder; no profile addresses/coordinates stored or returned. Generic city/name text search remains. UI labels Name, city or ZIP code and displays resolved area, with readable skill labels. General-area matching, NOT precise ZIP boundaries, proximity radius or guaranteed disambiguation of free-text same-name cities. Existing opt-in/block/active filters and pagination retained. Lookup failures/malformed or wrong postcode return explicit errors.39 group/geocode API checks and two phone light/dark browser checks passed; build passed. No migration/resources/production changes. Schedule-tabs update remains local too; last hosted10cf494a. Publish both on next explicit Preview approval.


Approved schedule/ZIP-search review build published: https://b7d3bd1d.opencourts.pages.dev, stable feature alias unchanged. My Games/Players HTTP200 with index-Bw5A20Db.js verified. Includes Upcoming/Requests/Past/Cancelled server-filtered pagination and ZIP/city player matching. No migration, production changes or GitHub push. Supersedes local-only schedule/ZIP checkpoints.


November17 location autocomplete LOCAL ONLY: shared LocationAutocomplete now powers Players location search and Account General location. Player-name field separated to keep names out of external location suggestions. Reuses existing Photon/Nominatim client with300ms debounce, aborts, keyboard arrows/Enter/Escape, touch-friendly option rows and theme tokens. Suggest/geocode now supply generalLabel/general_label from city/locality/county + state, never street/house/POI, with cacheversion8. Selected addresses store/search only general label; no profile coordinates saved. Existing manual city/ZIP input remains available. Additional optional name filter is bound server-side.91 geocode/services/groups unit checks and four light/dark ZIP/autocomplete browser checks passed; profile payload assertion proves selected123MainStreet saves onlyFairfaxVirginia. Build passed. No migration/resources/deployment/production changes. Last hostedb7d3bd1d; publish on approval.


Approved location-autocomplete build published: https://3af45daf.opencourts.pages.dev, stable feature alias unchanged. Players/Account HTTP200/index-JralF0cq.js verified;22033 geocode returns general_label Fairfax CountyVirginia. Shared suggestions preserve general city/area on selection; separate name search. No migration/resources/production changes or GitHub push. Supersedes local-only autocomplete checkpoint.


Verification rerun November17 requested by user:257 units,84 complete Chrome browser checks, TypeScript/dev build and26 actual Preview synthetic API checks PASSED. Hosted3af45daf/index-JralF0cq.js verified; synthetic cleanup confirmed zero QA players; production7ef38ff2 unchanged. No deployment or app edits. Real provider Google/Apple and physical Safari/Android/TWA acceptance remain manual. See PLAY_TOGETHER_TEST_RESULTS.md and refreshed release checklist.

Local search-hardening validation: 257 unit tests (17 suites) and development build passed;
10 focused browser checks passed. This follow-up is not deployed in c17ef75c.


### Latest local styling - shared primary actions

User requested matching main-site and Play Together action buttons. Shared action tokens
now drive green/white primary buttons, hover, focus, radius and disabled opacity on both
sides. Court picker, group and member search actions use primary styling consistently.
Secondary actions retain their existing neutral treatment. Device theme remains automatic.
Four cross-site button tests passed: phone/desktop in light/dark, normal/hover/focus/disabled.
No deployment for this styling yet; hosted Preview remains c17ef75c. See button-consistency.spec.ts.


### Latest local design consistency pass - not deployed

User requested consistent controls across main court discovery and Play Together, including
light/dark, selected highlights and title hovers. `public/interactions.css` is the shared
interaction stylesheet, loaded by the React entry HTML and static informational page CSS.

- Primary actions: fixed brand green #123d32 with white labels/icons in both modes;
  hover #205646 and pressed #0d2f26.
- Selected tabs/filters/dock items/court selections: pale green #edf2e8, readable green
  text #264b39, hover #e0e9d7 and shared border. Selection remains distinct from submission.
- Secondary/icon button hover, autocomplete options and keyboard focus now follow the
  shared rules. Neutral unselected surfaces remain theme-aware.
- Group/game/court title links use a green hover cue without introducing underlines;
  inline prose/privacy links retain their existing persistent underline.
- Desktop community navigation now marks the current section instead of highlighting
  Play Together on every community page.

Verification: eight cross-site interaction tests passed on phone/desktop in light/dark,
including static Support. Development build passed. Fourteen audit matrix tests completed:
350 states, zero detected axe violations/page overflow/uncaught JS errors. This does not
replace real-device or screen-reader review. No deployment or production change in this pass;
Preview remains c17ef75c. Local search hardening and this styling await publication.


### Latest local correction - search focus and top navigation

User reported nested dark focus borders on Find games and a persistent filled top-bar
link. Fixed in shared interactions CSS: search wrappers now own one border/glow, their
inner inputs suppress duplicate borders/outlines/shadows, and standalone search/combobox
fields reuse court discovery focus tokens. Dark/light tokens match the main site.
Keyboard focus remains visible; forced-colors mode gets a single system-color outline.
Player-name search now explicitly uses type=search so the shared treatment applies.

Top-bar links retain aria-current semantics but have transparent backgrounds in normal,
hover and current states; hover changes text only. This supersedes the earlier top-nav
filled highlight. Actual selection controls (filters, tabs, mobile dock) retain their
selected states. No authorization or database change.

Regression: tests/search-focus.spec.ts covers nested and standalone search fields,
member search, light/dark, phone/desktop, navigation after clicking and keyboard focus.
Twelve combined focus/button/interaction checks and the development build passed.
LOCAL ONLY; hosted Preview remains 89a8ba19 until requested publication.


### Git preparation review

See GIT_READINESS.md for the concrete include/ignore/optional-cleanup review. Ignore rules
now cover environment variants, signing keys, SQLite files, logs and build caches while
keeping example templates. Initial candidate inventory: 214 changed/untracked files;
current referenced QA evidence retained (8.27 MiB) and test baselines must be committed.
No staging, commit, push, deletion or deployment was performed during this review.
Do not delete local D1 state or credentials as cleanup.


### Latest local correction - dark-mode floating search icon

Screenshot 1383 exposed a CSS specificity conflict: Play Together's dock icon background
used the dark theme text color while the shared glyph stayed white. Increased the shared
icon selector specificity so the circle always uses brand green with a white magnifier.
Regression checks cover selected/unselected navigation and live theme switching; the
375px iPhone SE width shown by the user is explicitly covered as well as 390/1440px.
Eight interaction/focus browser checks plus two iPhone SE checks and development build
passed. Local only; hosted Preview remains 89a8ba19 until publication is requested.


### Direct comparison with the main court page

User requested direct comparison, not just an isolated icon fix. New dock-comparison.spec.ts
compares actual computed styles on the main court page and Play Together in the same local
feature build: 375/390px, light/dark, normal/selected/keyboard-focused states. It records
size, border, offset, typography, label/glyph colors, shadow and focus in qa-evidence JSON.
The remaining mismatch was Play Together's theme-dependent shadow; the shared icon rule
now uses the main court page shadow. Four comparison tests pass with equal fingerprints
in all three states; development build passed. Labels/destinations and number of dock tabs
are intentionally page-specific and are not claimed to be identical. No production change,
no hosted preview publication; current hosted candidate remains 89a8ba19.

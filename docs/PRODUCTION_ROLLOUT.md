## Sign-in recovery buttons fixed - November 20, 2026

Current live production **0c966dd9** / feature Preview **7ef90df7**. This supersedes
prior deployment identifiers below. Players' authentication error is now a single
clear message, An account is required to find players, with a filled Sign in link
styled as a button and a login icon. It navigates to Account; it does not directly
select a provider or bypass age/provider sign-in. Removed the redundant generic
search-failed line in error states. Signed-out safety lookup does not add a second
unhelpful failure banner or retain stale blocked-player/moderator UI.

The shared API error preserves HTTP status so Players can distinguish 401 from
temporary failures. Non-auth player-search errors now offer Retry search rather
than a misleading sign-in action. Feed, My Games and Groups error-recovery links
also use the shared button/message layout. Actions wrap below copy on narrow
screens with at least 44px targets, visible keyboard focus and existing theme colors.

Verification: 7 fresh-server browser checks passed (47.2s): 320/390/1440px, both
themes, recovery style/focus/navigation, scoped axe checks, 503 retry and stale
search-order regression. Development/release builds passed (Vite 29.02s / 7.12s).
Hosted Preview signed-out state passed. Four real production browser checks passed
at 390/1440px in both themes, with working account navigation, no page overflow
or JavaScript errors. No snapshots updated; no new broad backend/full-site run.
Reviewed synthetic screenshots: qa-evidence/sign-in-recovery-390-light.png and
sign-in-recovery-320-dark.png. Evidence: qa-evidence/sign-in-recovery-production.json.

This is a website hotfix; no Android native rebuild is needed to display it after
refresh/reopen. Existing package/signing identity, account data, schema, environment
settings, secrets and sender Worker were unchanged. Production push remains enabled;
its earlier owner-reported receipt/tap pass is preserved. Git main was not merged
or pushed. A private frozen hotfix source/artifact ZIP is ignored under .wrangler;
previous production 33ba5db1 remains available as the preceding deployment.
No Google Play upload occurred.

## Production notification receipt/tap confirmed and test removed - November 20, 2026

Owner replied done after being asked to verify the requested notification arrived
and opened its test destination. Record receipt and tap as owner-confirmed, alongside
the sender's first-attempt/provider-accepted evidence. The exact phone platform,
OS, installed package/build and closed-app condition were not separately described;
this is not a new platform-specific Android/TWA or Play-installed bundle pass.

Removed only the synthetic unlisted test game, synthetic host, invitation, event,
deliveries and chat room after confirmation. Verified all scoped fixture counts
are zero and the real receiving account remains active. Real profile/device
preferences, other notifications, secrets and production settings were unchanged.
Evidence: qa-evidence/production-requested-test-notification-cleanup.json.

Production 33ba5db1 and push remain live. Next store milestone is the existing
us.opencourts.app internal-test bundle, code 3 / 1.1.0, with the existing upload key
and Play App Signing setup. Android README instructions were corrected to preserve
the existing app/signing identity; no package, certificate, Gradle source, signed
bundle, Git main or Play upload was changed. Actual Apple sign-in and store-specific
acceptance remain distinct checks. No broad tests or snapshot updates were run.

## Production push and moderator settings published - November 20, 2026

**Current live production: https://opencourts.us, deployment 33ba5db1.** This
supersedes 0edd7fe3 for runtime configuration; reviewed application source and
static artifact are unchanged. Preview 50d37245 remains separate and unchanged.

Owner corrected key placement: PUSH_VAPID_PRIVATE_KEY now exists as secret_text
on Worker opencourts-push-production and is absent from Pages Production. Verified
names/types only, without reading key values. The owner-managed secret survived
--keep-vars deployment. Sender version ef0ed442-4765-4f69-b59c-53fe09435d32 runs
minute cleanup and push delivery. PUSH_ENABLED is now true on sender and Pages.
The matching fresh production public key is published; no private key is included
in the Pages environment or client artifact. Existing unrelated variables/secrets
and Preview settings were preserved.

The uniquely identified owner Google production player is included in the live
MODERATOR_PLAYER_IDS list, preserving prior IDs. The agent did not impersonate the
owner's session. Owner should refresh Players/Account to confirm Site moderation.

Post-publish synthetic check passed: an ordinary signed-in production account gets
push available:true and the expected public key, stays nonmoderator, and can delete
its account. Temporary QA account count returned to zero. No real-device test
notification was sent, and **physical production push delivery/tap is not yet
verified**. Prior production API/browser/schema/media/cleanup acceptance remains
recorded below; this settings publication did not repeat broad tests or update
snapshots. Evidence: qa-evidence/production-push-enabled-check.json.

Next owner action: on a phone, open opencourts.us/account, refresh, choose Enable
on this device and allow OS permission. On iPhone use the production site's Home
Screen app. Preview/debug-app subscriptions do not migrate. Verify a notification
from another account with the receiving app/chat closed, then tap the destination
and verify mute/category/sign-out controls. Do not claim receipt merely because
the sender is enabled. Actual Apple account sign-in remains a separate pending
owner check; Google sign-in was reported and matched a production identity.

If notification acceptance fails, disable push on both production components while
investigating; do not rotate keys, erase user data or restore the database blindly.
Website features, production media, schema 0031 and scheduled cleanup are live.
Source remains on feature/play-together with intentional uncommitted work, private
frozen release snapshot and rollback records. Git main was not merged/pushed, and
Google Play has not been uploaded.

## Production website launched - November 20, 2026

**Live production: https://opencourts.us, deployment 0edd7fe3.** This supersedes
earlier statements that production is unchanged/not deployed. Feature Preview
50d37245 remains separate and unchanged. Google Play has not been uploaded.

Fresh private production backup production-pre-play-together-20261120-175644.sql
restored successfully in isolation. All 31 migrations through 0031 then applied
to opencourts-courts, preserving 201,799 court rows and 100,750 staging rows with
zero foreign-key errors. No Preview account data was copied. A private ignored
source/artifact snapshot preserves the exact released 224-file source manifest;
source revision a0d245ab plus intentional uncommitted work. Git main, branch
checkout, staging/commits and pushes were not changed. Future Git-triggered main
releases must first include the reviewed feature source to avoid replacing this
manual release with old code. Rollback artifact: prior production deployment
7ef38ff2-91e0-4505-a215-fa16edcfa0bc. Do not blindly restore the database after users
start writing; disable the feature/restore an artifact under a controlled plan.

Production resources: private bucket opencourts-media; image processor
opencourts-media-processor (f70f5575-1cb9-432b-9527-56d2ebfb0b54); scheduled
maintenance/push Worker opencourts-push-production (latest agent version
d450d70a-fcdc-4514-88f9-4c3309ac7bab), minute cron. Actual Pages D1/R2/service
bindings were verified. Feature and media flags are true. **Push remains false.**
Cleanup cron is running; recorded age 20 seconds, no pending media cleanup and
zero FK errors. The owner-managed private push key is not yet on the sender.

Acceptance completed: 13 public-route/API checks; four age/origin/OAuth-start
checks including server-side Apple signing; eight scoped private production API
scenarios (group approval, series creation, guest/capacity, shared chat, private
photos, access revocation and archive/account deletion); eight live browser checks
at phone/desktop widths in both themes. All temporary accounts/groups/games/rooms
were removed, with no real-user notifications sent. Provider booleans are true.
The owner subsequently confirmed Google and one real Google identity was found;
actual Apple account completion and real-device production push remain pending.
No new full-site or broad unit run is claimed. Earlier known visual differences
remain recorded; owner requested production progress without repetitive broad QA.

The first policy byte comparison differed because of Cloudflare email protection;
normalized content and real browser-decoded mail links passed. New Worker and
binding setup initially hit short propagation delays, then verified successfully.
One existing weather check returned 503; retry and upstream NWS checks returned
200, including 156 forecast periods. US weather source code was unchanged; no
weather fix/credential change was made. Court discovery and geocoding returned 200.

**Pending owner setup:** a fresh production push pair was generated into ignored
.wrangler/production-push-keys.json without printing its private key. Public key
was matched in Production Pages settings and sender config before first push
activation. The owner placed the private-key field on Pages by mistake; sender
secret-list/settings metadata still show no private secret. Owner must add
PUSH_VAPID_PRIVATE_KEY as an encrypted Secret on the separate Worker
opencourts-push-production, save/deploy, and remove the misplaced Pages entry.
The agent has not read, removed or changed that secret. Push stays disabled until
corrected. Do not paste the private file/key into chat or Git.

The unique owner Google production player was added to MODERATOR_PLAYER_IDS,
preserving existing IDs and unrelated variables/secrets. No owner session was
fabricated. This updated moderator list and public push key are in Pages project
settings, **awaiting a production redeploy** after the misplaced Pages private-key
entry is removed. Once sender setup is verified, activate production push and
redeploy with these settings, then verify the owner's moderation queue and a
closed-app notification/tap on opencourts.us. Preview device subscriptions do not
carry over. Initial actual provider/device acceptance is not yet a pass.

Evidence is in qa-evidence/production-launch-*.json and
production-push-key-setup.json. Raw logs, backups, restored databases, source ZIP,
temporary sessions and key material remain private and ignored under .wrangler.

## Owner-filled production configuration checked - November 20, 2026

Owner reported that Production variables were filled. Read-only metadata confirms
all four Google/Apple identifier fields are nonempty and all four required secret
entries exist as secret_text. Secret values were not inspected; replacement of a
masked placeholder, credential correctness, Apple key formatting and encryption-key
length cannot be attested from this metadata check. End-to-end sign-in remains the
verification after production preparation/deployment.

AUTH_ORIGIN and production environment markers are correct. Feature/media/push
activation flags remain false. PUSH_VAPID_PUBLIC_KEY is filled and has the expected
65-byte uncompressed public-key shape; private-key pairing is not yet verified.
MODERATOR_PLAYER_IDS is filled but must be checked against the owner's eventual
production player ID, since this database had no player accounts at preflight.

Actual Production COURTS_DB binding was verified against
56c414b7-aca5-429b-acfa-b9e8e87b052b. Production photo bucket and image-processor
service bindings are absent. Those resources/bindings, production maintenance/push
sender setup, schema migration and reviewed production deployment remain pending.
No variables, secrets, bindings, database data or deployment changed in this check.
Evidence: qa-evidence/production-owner-config-check.json (booleans, public settings
and resource metadata only; no credential values).

## Production setup entries created - November 20, 2026

At the owner's explicit request, added only missing Production variables and four
new encrypted placeholder fields on Pages project opencourts. An add-only partial
PATCH contained no pre-existing variable names. Existing GEOAPIFY_API_KEY and
WEATHERAPI_KEY entries were preserved. Before/after configuration fingerprints
verified existing entries, Preview, non-variable Production configuration/bindings
and the canonical live deployment remained unchanged. No real credential values
were printed, supplied, copied from Preview or rotated. This is a Production
configuration change, not a production app deployment or database migration.

Added ordinary settings: AUTH_ORIGIN=https://opencourts.us,
PLAY_TOGETHER_ENVIRONMENT=production, PUSH_ENVIRONMENT=production and
PUSH_VAPID_SUBJECT=https://opencourts.us/contact. New PLAY_TOGETHER_ENABLED,
PLAY_TOGETHER_PRODUCTION_ENABLED, MEDIA_UPLOADS_ENABLED and PUSH_ENABLED are false.

Added blank owner-fill fields: GOOGLE_CLIENT_ID, APPLE_CLIENT_ID, APPLE_TEAM_ID,
APPLE_KEY_ID, PUSH_VAPID_PUBLIC_KEY and MODERATOR_PLAYER_IDS. The first four are
needed for sign-in; the last two are completed during push/moderator setup.

Added encrypted setup placeholders (not usable credentials): GOOGLE_CLIENT_SECRET,
APPLE_PRIVATE_KEY, APPLE_TOKEN_ENCRYPTION_KEY and AUTH_RATE_LIMIT_SECRET. Owner
must replace all four directly in Cloudflare Production. Placeholder value is
OWNER_SETUP_REQUIRED_BEFORE_LAUNCH. Do not enable features until configuration,
production resources, schema and deployment are ready. PUSH_VAPID_PRIVATE_KEY was
not created on Pages; it belongs only on the future production sender Worker.

Evidence: qa-evidence/production-vars-add-only.json contains names/types and
preservation booleans only. The helper/plan stay private and ignored under
.wrangler/qa-audit. Cloudflare's partial variable update behavior is documented at
https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/edit/
and matched the installed Wrangler single-variable update implementation.

## Production preflight started - November 20, 2026

The owner confirmed that Google/Apple sign-in is configured only for Preview.
Owner action is now required to configure production callbacks and Production
credentials directly; see PRODUCTION_OWNER_SETUP.md. No secret values were read,
changed, copied or rotated. Existing Preview settings remain untouched.

Read-only production schema inspection found only _cf_KV, tennis_courts and
tennis_courts_staging, with no d1_migrations ledger or Play Together tables. No
ledger was created. Production photo-bucket inventory still contains only
opencourts-media-dev, so production storage must be provisioned separately.
The Pages project lists opencourts.us, but its actual Production bindings have
not been verified; no full environment/settings object was fetched.

A fresh private production SQL export completed. An isolated local restore and
all 31 migration files passed integrity/FK checks, preserving 201,799 court rows
and 100,750 staging rows. The live catalog columns match migration 0001, whose
CREATE TABLE IF NOT EXISTS is compatible. A first unbatched local restore was
stopped for performance; a separate transaction-based restore completed and is
the verified evidence. No remote schema or user-data changes occurred.
Backups/restored databases and signed export-download logs stay ignored/private.
Sanitized evidence: qa-evidence/production-preflight-backup.json.

Next after owner sign-in setup: verify live non-secret bindings, apply only the
reviewed missing migrations under a valid backup window, provision/bind private
production media and maintenance services, complete owner-managed production push
configuration, publish the reviewed artifact and perform production acceptance.
The backup must be refreshed if catalog/data changes make it stale before writes.
Production feature activation, migrations, main, workers and Google Play have not
been deployed by this preflight. This is not a new broad application test cycle.

## Current production sequence - November 20, 2026

Owner has expressed intent to move to production and asked for the required steps.
This check made no production changes. Current reviewed Preview: 50d37245. The
public-page review is complete; the latest full unit result is 432 tests, with
subsequent focused UI/policy checks recorded in APP_TESTING_CHECKLIST.md.

1. Preserve/review the intentional uncommitted candidate, exclude credentials,
   databases/uploads/builds/raw logs, and identify the release revision. Resolve
   the earlier visual-regression differences and complete final integrated checks.
   The owner previously confirmed physical Android core flows; only the latest
   dialog, guest/capacity and related UI changes need additional device review.
2. Verify actual production Pages D1/media/service bindings, the applied migration
   ledger and existing resource state using non-secret metadata. The source
   inventory contains **31 migrations through 0031**; apply only those genuinely
   pending after verifying the catalog/schema and ledger. Old development-schema
   counts and old 'production unsupported' statements below are historical.
3. Take a fresh private production backup and prove an isolated restore before any
   schema change. Provision/verify production-only private media storage, image
   processor and scheduled chat/push/media-maintenance worker. Preserve production
   catalog/data; no Preview accounts or fixture data are promoted.
4. Owner handles required provider/secret setup directly. Google and Apple callbacks
   must use https://opencourts.us/api/auth/google/callback and
   https://opencourts.us/api/auth/apple/callback. Never read, copy, replace or rotate
   Cloudflare secret values in this workflow. Production push needs its matching
   production public/private-key configuration and per-device opt-in.
5. Configure the explicit production guards and correct production bindings; publish
   the reviewed production artifact through the production release path, preserving
   feature Preview. Keep the previous deployment and feature-disable rollback plan.
   The source already implements guarded production support; do not remove guards.
6. Smoke-test opencourts.us with controlled production accounts: provider sign-in,
   games/groups, requests/waitlist/guests, series/chat, photos, reports/moderation,
   deletion and closed-app notification receipt/tap. Assign the owner's production
   moderator ID. Enable production push only after the delivery/settings checks.
   Production and Preview accounts/subscriptions stay isolated.

Website deployment and Google Play internal testing are separate milestones. The
Android source already uses us.opencourts.app, opencourts.us, version code 3 /
1.1.0. Build/sign using the existing app setup and verify the Play signing/Digital
Asset Links association, then review Console declarations and internal-test scope.
Explicit approval is still required before any Google Play upload.

## Public-policy review completed - November 20, 2026

Current feature Preview **50d37245**:
https://feature-play-together.opencourts.pages.dev. This supersedes prior Preview
identifiers below. Privacy, Terms, Help, account deletion, About and Contact were
reviewed against current source and updated for chat/series retention, staff
exemptions, counted guests and direct guest privileges, queue confirmation,
notification behavior, retained safety evidence and current app availability.
Support wording needed no change. Sitemap dates now reflect changed pages;
public canonical URLs and private-route exclusions remain intact. Primary
Google Play deletion/privacy and Cloudflare security guidance was checked.

Verification: 15 fresh-server browser checks (39.7s), 27 metadata/release tests
(three files, 0.501s), six static policy-page audits and all 17 canonical sitemap
entries passed. Development and local production builds passed (Vite 8.03s /
8.14s). All six published pages returned HTTP 200 and matched the reviewed build.
No snapshot updates. This scoped verification does not claim a new full-site
or complete backend-suite run. See LAUNCH_POLICY_REVIEW.md and
qa-evidence/launch-policy-links.json / launch-policy-hosted.json.

No schema, worker, account data, environment settings or secrets were changed.
Production/main/production D1 and Google Play remain untouched. The user's latest
instruction was to review these pages before moving to production; production
rollout, final binding/ledger/backup checks, earlier full-site visual reconciliation
and physical review of newest UI remain pending. Existing intentional uncommitted
work is preserved. Store Data safety declarations were not inspected or changed.

## Latest Preview: capacity and lifecycle follow-up (November 20, 2026)

Preview ef0ceaad / opencourts-dev now includes migrations 0030 (quiet lifecycle
notices) and 0031 (atomic format/capacity editing and merged waiting-player queue).
The next production migration review must include both, after checking the live
ledger and taking a verified production backup under separate authorization.
Guest approval stays manual. Increasing capacity can confirm waiting players;
valid reserved offers precede remaining requests in chronological order. Settings
apply to one occurrence. Unit suite 427/427 and focused browser checks 43/43
passed; six hosted synthetic checks passed with fixtures removed. Both candidate
builds passed. See APP_TESTING_CHECKLIST.md for the actual evidence and remaining
visual/device/release gates. Production has not been deployed.

## Group staff retain series-chat access - November 20, 2026

Current Preview 31411e87: https://feature-play-together.opencourts.pages.dev.
Group owners, co-owners and assigned group organizers have automatic series-chat
access without attending a game, posting or possessing a series membership row.
The actual series organizer remains exempt too. Live group roles grant access;
promotions apply immediately and demotions remove role-only authority. Ordinary
participant eligibility can still apply after demotion. Active group membership,
active account/group, existing block safeguards and current series access remain
required. Legacy Admin alone does not acquire new event/chat privileges.

Inactivity maintenance excludes staff. Migration 0029 changes only the rejoin
trigger so staff confirming a place do not generate a false inactivity departure.
Active group series retain room/read/mute metadata through quiet periods, allowing
staff to return after the old room deadline; individual messages and notices still
expire after 30 days, subject to existing evidence holds. Ordinary participants'
activity clocks are unchanged. Group departure/archival still revokes access.
Named audiences and push candidate selection include current staff even without
attendance. Opt-in/category/device/mute/read/block checks and no-self suppression
remain in force; staff roles do not grant site-moderator/report-queue authority.
Privacy, Terms, Help and the chat audience text explain the exemption and metadata
retention. The roster identifies Group owner, Co-owner and Organizer.

Verification: 415/415 units across 25 files (5.89s final run), including six new
staff cases; 36/36 browser checks (1.1m), no snapshot updates. Development and
production candidate builds passed (Vite 13.76s / 15.43s). A hosted check caught
D1's compound-SELECT limit, which local SQLite did not reproduce. Series audience
and push recipient selection now use group-membership joins/predicates instead
of expanded UNION candidates; four remote access/audience/push query-plan checks
passed. Full units and functions TypeScript checks passed after the backend fix;
client bundles did not change. One initial post-publish co-owner request also
returned 503; the final complete hosted check passed all seven scenarios. No
permission safeguard or existing-user data was weakened/changed to satisfy tests.

Seven hosted synthetic staff checks verify all three roles on a long-quiet series
without attendance/membership records, named roles, posting, live promotion/
demotion, no false inactivity notice, and immediate group departure denial. All
temporary accounts/groups/games/rooms were removed, with no real-user notifications.
These synthetic sessions do not claim a real OAuth-provider or physical-device
sign-in test. The earlier full-site visual-baseline reconciliation remains pending.

Development migration 0029 alone was applied to opencourts-dev after a fresh
private ignored backup, isolated restore and migration dry run preserved message,
room, report and membership row counts with zero integrity/FK errors. Worker
994ba867-74bf-4e64-a2ea-c21ed91d2a7a preserves existing variables/secrets via --keep-vars and has a fresh
cleanup heartbeat. Production, main, production D1, Cloudflare environment secrets,
app package/signing and store uploads are unchanged. Release inventory now has
29 verified migration hashes. Evidence: docs/qa-evidence/series-chat-staff-verification.json,
series-chat-staff-hosted.json and series-chat-staff-320-dark.png. Private backups,
restored databases, raw diagnostics and transient QA scripts remain ignored.

## Separate chat dialog and shared group-series chat - November 20, 2026

Current Preview 4dd76fd5: https://feature-play-together.opencourts.pages.dev.
Development migration 0028 is applied only to opencourts-dev. Worker f56801ee-573e-4196-a43e-d148debca31a
retains existing dashboard variables/secrets through the variable-free --keep-vars
configuration. A fresh chat-cleanup heartbeat was observed after migration.
Production, main, production D1, app packages/signing and Google Play uploads are
unchanged. No environment secret values were read or changed.

Chat opens in a native top-layer dialog: centered on desktop and full-screen on
phones, with a fixed composer, visual-viewport keyboard sizing, safe areas, Close
and Escape, keyboard focus wrapping/return, and preserved unsent drafts. Opening
shows latest messages; scrolling back keeps the anchor through pagination and
refresh. Closing leaves the original game page in place. Nested report dialogs
and pickers remain usable; a closed SiteSelect no longer swallows Escape.

Group recurring series now have one Series chat across all dates. Standalone
and non-group recurring games retain per-game chat. Approved active group members
enter when a playing place is confirmed; group membership, a pending request,
waitlist or invitation alone does not admit them. They retain access with an
upcoming confirmed place, a confirmed game in the last 30 days, or a message in
the last 30 days. Both game and message activity must be old before expiry;
reading/muting do not reset activity. The current series organizer retains access.
Leaving/removal from the group ends access immediately. A fresh confirmed place
can rejoin an expired/removed member. Small centered join/left/inactivity notices
are excluded from unread counts, reports, rate limits and push. Personal blocks,
no-self notifications, category/device consent and shared mute/read state remain.

Series messages/notices have rolling 30-day access/retention, independent of
continued membership. Room expiry follows the last scheduled game end,
cancellation or ordinary message plus 30 days. One date's cancellation does not
close other dates' shared room. Report snapshots and explicit holds retain their
separate rules. Existing occurrence messages, IDs, text/authors, sequence order,
report contexts and holds migrate to the shared room. Old read positions merge
conservatively and any explicit occurrence mute is retained. Old preservation
holds follow the merged series conversation; staff should review their scope and
existing review dates. Public Privacy, Terms and Help explain the new behavior
and carry November 20 dates. Game-chat pushes now use generic chat wording and
resolve a surviving series occurrence at delivery time.

Verification: 409/409 units (25 files, 8.20s); 43/43 fresh-server browser checks
(1.0m), no snapshots updated; development build Vite 14.04s, production candidate
Vite 9.87s. Three static policy date changes were subsequently copied exactly to
both artifacts and production preparation revalidated without changing bundles.
Coverage includes the two inactivity criteria/boundary, upcoming/canceled places,
read-vs-message activity, group departure/rejoining, blocks, atomic send access,
canonical read/mute/unread/push, rolling expiry/held evidence, deletion, legacy
room migration and push routing after occurrence deletion. Dialog checks cover
320/390/1440 px, light/dark, focus, nested reports/Escape, drafts, long-history
scrolling, simulated visual-keyboard height and axe accessibility.

A private ignored development SQL backup restored into isolated local SQLite.
The migration dry run preserved all 15 existing messages and report/hold records,
with zero foreign-key errors. This live backup had no series; legacy two-room
merging and hold/mute preservation were additionally exercised by synthetic unit
fixtures. The rollout paused sender claims until schema readiness, published a
fail-closed chat API, then applied only pending migration 0028. Existing messages
remained 15 immediately afterward. Nine hosted synthetic two-account checks then
passed. Fixtures were completely removed; no real-user push or report was sent.
Initial hosted harness corrections: use the HTTPS __Host- cookie name and count
chat push events/deliveries separately from ordinary synthetic game notifications.
No application safeguard was weakened to make these checks pass.

Detailed evidence: docs/qa-evidence/series-chat-dialog-verification.json and
series-chat-hosted-check.json; reviewed screenshots chat-dialog-desktop-light.png
and series-chat-dialog-phone-dark.png. Raw logs, backup/restore DB, transient
sessions and test scripts stay under ignored .wrangler directories. This is not
a new all-green full site browser run: earlier 20 visual-baseline differences
remain pending. Physical phone acceptance must repeat the new dialog/keyboard
and series membership cases; older owner-confirmed phone checks predate this
feature. Production additionally requires the reviewed backup/ledger/bindings,
migrations through 0028, private media/services, cleanup, provider/moderator setup
and smoke tests in PRODUCTION_ROLLOUT.md. No store upload is authorized.

## Desktop chat and moderation workspaces - November 20, 2026

Published Preview ef83db3e at https://feature-play-together.opencourts.pages.dev.
Chat now uses the same full content width as the game layout below it, removing
the separate 720 px cap. Both expanded and collapsed chat share the alignment.
Site moderation now has Reports, Accounts, Message evidence and History views.
Reports open first with a count and type filter; account search/suspend/restore,
message-case tools and account decision history occupy separate workspaces.
The view controls form two columns on phones and one row on desktop. State is
preserved while switching views. Evidence no longer requires opening an extra
outer disclosure. Moderator permissions, decision reasons, CSRF and backend
behavior are unchanged. Ordinary players still cannot see the staff tools.

The broader release run exposed an intermittent initial-scroll failure. Chat now
distinguishes deliberate wheel/touch/pointer/keyboard scrolling from layout scroll
events and observes the full message/log border boxes. Layout growth follows the
bottom; reading older messages preserves the anchor. A new layout-growth case and
four repeats of all six long-history cases passed (24/24, 37.5s). Final chat and
moderation suite passed 11/11 (20.1s), including full-width geometry, two-column
mobile navigation, report filtering, suspend/restore, view changes, evidence
preservation/release and axe checks. Development and production builds passed
(Vite 6.69s / 7.08s). Hosted game route returned 200 with Preview noindex.

Release evidence is not an all-green full browser suite: the fresh no-update
311-case run ended 290 passed / 21 failed (10.4m): 20 outdated visual baselines
plus the initial-scroll failure. The follow-up 89-flow run with screenshot
assertions ignored completed 87 passed / 2 failed (1.6m); both were layout-growth
scroll cases subsequently fixed and covered by the final 24 passes. No snapshots
were updated. All 20 snapshot-blocked flows completed their functional assertions
in that follow-up. Actual/expected/diff PNGs are preserved under ignored
.wrangler/qa-audit/production-review-visual-diffs. Baseline reconciliation remains
a release gate. Latest units: 394/394 across 25 files (9.24s); production-only npm
audit: zero known vulnerabilities. Detailed evidence and reviewed synthetic
screenshots are under docs/qa-evidence/chat-moderation-layout-review.json and
chat-full-width/moderation-workspaces PNGs.

Owner confirmed physical Android sign-in, second-account join, chat, closed-app
push receipt and tap passed. This supersedes emulator-only status for those core
checks; exact device/version/build details and every extended case are not claimed.
Production still requires binding/ledger verification, a verified backup, migrations
through 0027, private media/processor and scheduled cleanup provisioning, provider
configuration, moderator setup and live smoke tests under the documented rollout.
No production/main/D1 operation, secret access/change, or Google Play upload was
performed. Intentional uncommitted work and prior QA evidence are preserved.

# Production rollout candidate — November 19, 2026

This is a reviewable rollout plan, not evidence of a production deployment. Keep
feature/play-together Preview separate. No Google Play upload is included. Existing
Cloudflare secret values must not be read, replaced, copied or rotated by this work.

## Confirmed decisions

- Operator: Big Data Analytica LLC, registered in Virginia, United States.
- Play Together accounts: 18+, approved by the owner. Public court browsing stays open.
  Sign-in requires an explicit age self-declaration; it is not identity verification.
- support@opencourts.us works and the owner will monitor it (owner-confirmed).
- Push: owner confirmed iPhone receipt and Android emulator testing. Physical Android
  closed-app receipt/tap/current-access acceptance is still pending.
- Android package remains us.opencourts.app, destination opencourts.us. Next candidate
  version is code 3 / 1.1.0; debug package and Preview destination are unchanged.

## Resource isolation and evidence

Read-only Cloudflare inventory found production candidate D1 opencourts-courts,
56c414b7-aca5-429b-acfa-b9e8e87b052b, and separate development D1 opencourts-dev,
cae4849c-3e99-4945-9d70-bef7b48707ce. This inventory does not prove the Pages binding
or the production migration ledger. No database rows were queried or modified.

R2 inventory found only opencourts-media-dev. Production must have a separate private
bucket, proposed name opencourts-media; do not bind production to the development
bucket. Production media processor and scheduled push/cleanup Worker are prepared
as example configurations in release/. They have not been provisioned or deployed.
No private objects or environment secrets were inspected.

## Before any production write

1. Review the current candidate on Preview, including Terms, Privacy, account-deletion
   help, 18+ sign-in, profile setup, organizer attendance and irreversible archiving.
2. Finish physical Android Chrome/TWA and two-account acceptance in
   ANDROID_DEVICE_ACCEPTANCE.md. Record device/version/date and actual outcomes.
3. Review the 31-file migration SHA-256 inventory in release/migration-inventory.json.
   Migration 0026 adds moderation decision history and immediate suspension revocation. It is applied only on development; include it in the reviewed production pending migration list. Migration 0027 adds game chat, expiry/access-revocation triggers and separately retained message-report evidence. It is development-only until the production plan is approved.
4. Verify the actual production COURTS_DB binding against the production ID above.
   Read only non-secret binding metadata. Do not fetch an environment-variables
   object that might include secret values. Owner confirms provider callback settings
   separately: https://opencourts.us/api/auth/google/callback and
   https://opencourts.us/api/auth/apple/callback.
5. Obtain approval for the specific production backup/migration/provision/deploy plan.
   The earlier instruction to leave production D1 untouched remains in force until
   that approval. No fixture or development account data may be copied to production.

## Planned execution order (commands below have NOT been run)

Use release/wrangler.production-migrations.json, which targets only the identified
production database. Review the applied ledger before applying pending migrations:

```powershell
New-Item -ItemType Directory -Path .wrangler/release-backups -Force
npx.cmd wrangler d1 export COURTS_DB --remote --config release/wrangler.production-migrations.json --output .wrangler/release-backups/pre-play-together.sql
```

Keep the backup private and ignored. Verify export completion, schema/row counts and
restore into an isolated local database before proceeding. Resolve any mismatch
between legacy catalog tables and migration 0001 before applying the pending ledger.
Do not rerun SQL files manually or mark unknown migrations as applied.

```powershell
npx.cmd wrangler d1 migrations list COURTS_DB --remote --config release/wrangler.production-migrations.json
npx.cmd wrangler d1 migrations apply COURTS_DB --remote --config release/wrangler.production-migrations.json
npx.cmd wrangler r2 bucket create opencourts-media
npx.cmd wrangler deploy --config release/wrangler.media-processor-production.example.json
```

Verify production Pages bindings: COURTS_DB to the production D1 ID,
PLAY_TOGETHER_MEDIA to the new private bucket, and PLAY_TOGETHER_IMAGE_PROCESSOR to
the private production processor service. No development resource may be used. Configure MODERATOR_PLAYER_IDS with the owner's production player ID after sign-in; group ownership does not grant report-review access. Verify the in-site open-report queue and a real report/review cycle. Site moderation now appears above player search, with links near the top of Account/community pages. Verify suspend/restore on an approved synthetic production account, revocation, private audit history and support appeals. Existing games and group ownership are preserved by suspension.

Production non-secret rollout settings are:

| Setting | Required value |
| --- | --- |
| AUTH_ORIGIN | https://opencourts.us |
| PLAY_TOGETHER_ENABLED | true |
| PLAY_TOGETHER_ENVIRONMENT | production |
| PLAY_TOGETHER_PRODUCTION_ENABLED | true |
| MEDIA_UPLOADS_ENABLED | true, after processor/storage acceptance |
| PUSH_ENVIRONMENT | production |
| PUSH_ENABLED | false until production push acceptance |

Pages supplies CF_PAGES_BRANCH=main. The production guard requires all markers and
the exact origin. Preview and localhost explicitly reject a production environment
marker. Arbitrary Pages URLs and www are not accepted as auth origins.

The owner must arrange any necessary existing-secret/provider configuration outside
this agent workflow. Do not copy Preview secrets. Test only public provider readiness
booleans and real sign-in results. Never print credential values.

Deploy the production maintenance Worker using the prepared example only after
bindings exist. Its minute schedule retries unreferenced queued photo objects even
with PUSH_ENABLED=false. Account deletion also attempts cleanup immediately. Failed
objects stay queued for retry; monitor aggregate failure counts, not object keys.

Phone push activation needs matching production public-key configuration and
owner-managed private key settings for Pages and Worker, production-only origin,
explicit production markers and enabled user/category/device/session preferences.
Copied development settings cannot activate the production sender. Do not enable
PUSH_ENABLED until the owner has verified delivery, tap destination, opt-out and
sign-out behavior on production test accounts. In-site notifications work separately.

```powershell
npm.cmd run build:release
# After approval only, from the reviewed production commit on main:
npx.cmd wrangler pages deploy dist-release --project-name opencourts --branch main
```

Preserve the existing uncommitted work before any later authorized Git push/merge.
For the reviewed manual release, deploy dist-release, never Preview dist. For future
Git-triggered Pages builds, set the dashboard build command to npm run build:pages
and output directory to dist. That adapter emits production route metadata on main
and the .dev association/noindex safeguards on Preview branches. Do not leave the
dashboard on the old normal build command, which serves discovery only.
The release preparation rejects debug asset associations and Preview noindex headers.

## Post-deployment acceptance and rollback

Check home, Terms, Privacy, deletion help, public community/groups, canonical URLs,
sitemap and private-route noindex metadata. Sign in with both providers; verify
secure same-origin sessions, age confirmation, profile, deletion, private-group
access transitions, membership/guest approvals, capacity and notification suppression.
Verify private photos, public covers, metadata removal and cleanup queue processing.
No private activity or invitation URL belongs in the sitemap.

If auth, access isolation or data integrity fails, disable the production feature
flag and push sender, restore the prior production artifact and investigate. Do not
drop new tables or restore a full backup blindly while users may be writing records.
Database restoration requires a controlled write stop and an explicit data-loss
decision. Preserve the pre-deployment backup and deployment identifiers.

Google Play remains a separate internal-testing step: validate signed code-3 AAB,
existing package/signature and production Digital Asset Links, complete Console
Data safety/audience/privacy/deletion/app-access declarations, obtain upload approval,
then test the Play-installed build. No public store rollout or new iOS app is included.

Policy references reviewed: [Google Play User Data](https://support.google.com/googleplay/android-developer/answer/10144311),
[account deletion](https://support.google.com/googleplay/android-developer/answer/13327111),
[FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).
The authored policies are a product/legal review candidate, not a legal certification.

Game chat requires the scheduled Worker running cleanupChat even when push sends are disabled. Check chat_cleanup_last_at and review held message cases at least every 30 days. Do not launch with policy retention promises and an inactive cleanup schedule.

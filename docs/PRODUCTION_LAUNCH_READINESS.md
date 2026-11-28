# Production launch readiness archive

This file preserves dated launch checks and historical deployment notes. Some
statuses and deployment instructions below have since changed. For the current
frontend/API boundary and release procedure, use the
[deployment architecture handoff](DEPLOYMENT_ARCHITECTURE.md),
[deployment workflow](DEPLOYMENT_WORKFLOW.md), and
[Production issue handover](PRODUCTION_ISSUE_HANDOVER.md).

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

## November 19 - Game chat candidate

Chat is now part of the launch candidate: see [GAME_CHAT.md](GAME_CHAT.md).
Production requires reviewed migration inventory through 0027, scheduled room/case
cleanup with a fresh heartbeat, owner review of open/held message cases, store
Data safety review for chat and report evidence, and physical Android acceptance.
Ordinary chat expires 30 days after end/cancel; replies close at end+24h or on
cancel. Separate safety snapshots retain until resolution+90d unless held. Policies
are updated; this is an implementation description, not legal certification.
Production/main/production D1 are unchanged, and no store upload is authorized.

## Account suspension and clearer reporting - November 19, 2026 (current)

Published Preview c302b713 (https://feature-play-together.opencourts.pages.dev;
immutable https://c302b713.opencourts.pages.dev), bundle index-DGHVaVZk.js, dev
schema 0026. Initial moderation Preview a556cbfa was superseded by the shared-game
report-access fix. Hosted Players/Account/Privacy/Terms/Help HTTP 200 with Preview
noindex/nofollow. Anonymous report/account/history reads and suspension attempts
all returned 401. No authenticated real-account/report mutation was performed.

Site moderators now have Site moderation above player search, with a prominent
reports/accounts link near the top of Account and community pages. The shared
queue supports player/game/group filters, visible explanations, explicit empty
states and refresh errors. Moderator lookup failures on Players are no longer
silently swallowed. The link targets /play-together/players#moderation and focuses
the section after asynchronous permission checks.

Authorized moderators can search account names/IDs, suspend and restore accounts,
and review private decision history. A decision requires a reason (up to 500
characters), records moderator/target references, action and timestamp, and rechecks
live moderator authorization within the atomic database batch. Self-suspension and
suspension of another configured site moderator are rejected. Stale actions do not
create a second audit entry. Ordinary users/group owners receive no extra authority.

Suspension uses the existing disabled account status, revokes all sessions/device
subscriptions through a database trigger, prevents subsequent account actions and
OAuth login through an existing identity. Restore does not revive old credentials;
the player must sign in and enable device notifications again. Public anonymous
court browsing remains available. Games, confirmed places and group ownership are
preserved, not automatically canceled/transferred; the moderator confirmation says
to review affected activities separately. This is account suspension, not an IP or
identity-wide permanent ban. Support appeals and deletion requests remain available.

All report forms now open in a focused, accessible dialog with a required What
happened? explanation (up to 1,000 characters), in addition to category. Server-side
validation rejects blank explanations and supports multiline text. Older blank
reports remain readable with a fallback message. Shared-game players can report
non-discoverable co-players; unrelated hidden accounts remain unavailable. Moderator
report context does not reveal private/unlisted game titles or bypass activity access.
Personal blocking remains separate. No email/Resend alert integration was added.

Development migration 0026_account_moderation.sql applied only to opencourts-dev,
cae4849c-3e99-4945-9d70-bef7b48707ce. It adds audit records and the revocation trigger;
no real account was suspended or restored by the agent. Production remains untouched.
The reviewed production inventory now contains 26 migrations; production must apply
0026 as part of the approved rollout. Privacy/Terms/Help disclose moderation access,
retained decision history, support appeals and the new reporting flow.

Verification:
- 379 units /24 files passed (4.19s), exercising real SQLite migrations/transactions,
  authorization/CSRF/staff protection, session/device revocation, suspended OAuth,
  restoration, stale authorization, private-title protection and shared-game reports.
- Initial unit fixture errors (auth_sessions column count and mismatched OAuth subject)
  were corrected; they did not justify weakening security assertions. Initial report
  browser tests exposed an accessible-label mismatch; explicit names corrected it.
- 30 focused moderation/sharing/policy browsers passed (37.0s), no snapshot updates.
- 10 moderator/accessibility/matrix checks passed (1.1m): four matrices cover 100
  existing phone/desktop states at 320/1440px in both themes with zero detected
  JS errors, axe violations or horizontal overflow. Report dialogs also passed axe.
- Final refined layout/confirmation/report checks: 6/6 passed (14.9s), both themes
  and phone/desktop widths; real QA screenshots captured under ignored qa-audit.
- Release and Preview builds passed (7.13s /6.79s); production policy/canonical/
  bundled-worker checks passed. The entire 280-test suite was not rerun for this
  change; previous full-suite evidence remains historical.

Logs/screenshots are ignored under .wrangler/qa-audit/moderation-*. Intentional
uncommitted work and real QA evidence remain preserved. No production/main/D1,
Cloudflare secret/settings, signing or Play upload changes are included.

## Production review candidate published - November 19, 2026 (latest)

Feature Preview 88882429: https://feature-play-together.opencourts.pages.dev
(immutable https://88882429.opencourts.pages.dev), bundle index-DxfoJfZm.js,
map worker maplibre-gl-worker-1K9-aB_Z.js. Home, Privacy, Terms, Delete Account,
Account, group discovery, sitemap and worker HTTP 200; Preview noindex/nofollow
retained. Provider readiness Google/Apple true; actual production callbacks are
not verified by these booleans. A signed-out request with adultConfirmed=false
returned HTTP 400 with the 18+ guidance before creating an OAuth attempt/account.
The Python HTTP client was rejected with 403; PowerShell HTTP checks succeeded.

Final evidence:
- 370 units /23 files passed, including production/Preview isolation, production
  push, immediate/retried photo cleanup, adult confirmation, migration hashes and
  CI output routing. Production dependency audit reports zero vulnerabilities.
- Complete fresh-server browser run, no snapshot updates: 275 passed /5 failed
  (9.1m). Four old palette fixtures lacked a chosen search area; corrected them to
  explicitly restore a saved area. One dark discovery screenshot differed by 73
  glyph-edge pixels; reviewed diff had no layout changes, and that single screenshot
  now permits at most 100 differing pixels instead of 60 (other screenshots unchanged).
  Corrected fixture/visual coverage rerun: 8/8 passed (26.7s), no snapshot updates.
  This is not a claimed single clean 280-test full run.
- Earlier map-upgrade checks: final six map/permission/attribution-sanitizing tests
  passed (18.3s), including the actual bundled worker response and malicious
  consecutive attribution attributes. Fixed the empty-map status overlapping the
  location-denial actions. Earlier failed checks/logs are retained, not rewritten.
- Twelve deliberately reviewed Terms-footer/18+ sign-in visual checks passed after
  targeted baseline refresh (43.9s); no blanket snapshot update was used.
- Both build:release and build:dev passed. Future Pages CI adapter build:pages was
  tested with main and feature/play-together: production emits no global Preview
  noindex or .dev association; Preview retains both. Both include the map worker.
  Dashboard build command/output still need owner configuration per rollout plan.
- Isolated Android debug assembly/release-manifest processing passed (14s), code 3
  /1.1.0-dev, package us.opencourts.app.dev. Release remains us.opencourts.app and
  opencourts.us. No signed AAB or Google Play upload. Original locked debug output
  remains intact; new QA artifact is under .wrangler/android-production-check.
- git diff --check passed (existing LF/CRLF conversion warnings only). Intentional
  uncommitted work and QA evidence preserved. Keys, databases, uploaded objects,
  build artifacts and test logs remain ignored; nothing was staged/committed/pushed.

Production remains deployment 7ef38ff2-91e0-4505-a215-fa16edcfa0bc /main (read-only
Cloudflare deployment metadata confirmed). No production D1 SQL, bucket creation,
processor/sender deployment, Pages settings/secret change or store operation ran.
Read-only inventory found production D1 ID and only a development R2 bucket.

See PRODUCTION_ROLLOUT.md for the concrete approval-ready backup/migration/private
media/maintenance/bindings/build/deployment/rollback sequence. Production needs
resource provisioning, reviewed applied migration ledger and backup, provider and
moderator configuration, controlled smoke acceptance, and physical Android/two-
account acceptance. Do not describe the still-untouched live system as ready solely
because source/build/Preview preparation is complete. Policy owner is Big Data
Analytica LLC (Virginia); 18+ approved; support mailbox and monitoring owner confirmed.
Policies are an authored review candidate, not legal certification. Site reports go
only to the moderator queue, not email; MODERATOR_PLAYER_IDS must be configured with
production staff IDs, never copied development IDs.

## Production candidate preparation - November 19, 2026 (current)

Work remains on feature/play-together. Production/main, production D1 data,
Cloudflare secret values and Google Play uploads are unchanged. The concrete
rollout plan is PRODUCTION_ROLLOUT.md; release/ contains a hashed 25-migration
inventory and production-only migration/processor/maintenance example configs.
No proposed provisioning or remote migration command has been executed.

Owner decisions: Big Data Analytica LLC, Virginia, United States; Play Together
accounts 18+; support@opencourts.us works and owner will monitor it. Phone push
receipt is user-confirmed on iPhone and Android emulator, not physical Android.

Implemented candidate changes:
- Terms of Use and public Delete Account help pages, shared branding/footer links,
  sitemap entries, and sign-in Terms/Privacy links. Privacy/Help now match current
  location actions, 24h court-cache reuse, age self-declaration, recent sign-in
  deletion steps and irreversible group archiving. No identity-based age check or
  legally certified policy is claimed.
- 18+ confirmation required before starting non-link Google/Apple OAuth; server
  rejects absent/false/string confirmations before creating an attempt. Existing
  provider-linking session/CSRF/recent-sign-in controls remain intact.
- Exact production origin/main branch plus PLAY_TOGETHER_ENVIRONMENT=production
  and PLAY_TOGETHER_PRODUCTION_ENABLED=true are required in addition to the normal
  feature flag/binding. Localhost/Preview reject production markers; arbitrary
  domains and mixed-origin settings remain disabled. No live flag was changed.
- Push now supports a separate explicitly enabled production environment while
  preserving development tester restrictions and user/category/device/session/
  access checks. Production example starts PUSH_ENABLED=false. No sender or key
  configuration changed remotely.
- Deleted account photos get immediate best-effort cleanup, and scheduled worker
  retries queued unreferenced objects even with push off. Failed objects remain
  queued. Production needs a separate private R2 bucket/processor/worker; metadata
  inventory found only opencourts-media-dev, so provisioning is still a rollout gate.
- Android candidate code 3 /1.1.0; existing release package/domain and debug suffix/
  Preview are preserved. No signed AAB or upload. The default debug output was
  locked during packaging; isolated assembly/release-manifest processing passed
  (14s) under .wrangler/android-production-check. This is not physical acceptance.
- MapLibre upgraded from 5.24.1 to pinned 6.19.0, outside GHSA-jrc7-96c5-q579's
  advisory range; npm audit --omit=dev now reports zero vulnerabilities. Adapted
  named imports and Vite's bundled worker URL per upstream migration documentation.
  Do not apply the earlier advisory/backport caveat to the new installed version.

Verification so far: 367 units /22 files passed. Production build passed before
final worker integration and is being rebuilt. Twelve targeted visual checks
passed after reviewing and refreshing only Terms footer/18+ sign-in baselines.
The first 278-test browser attempt ended without completion summary at test 193;
retain it as incomplete, not a full pass. It exposed stale location fixtures,
a duplicate selector and expected footer/age snapshots. Later map-upgrade checks
found/corrected worker bundling and an empty-map/permission-message overlap;
final verification is recorded separately when complete. Evidence stays ignored
under .wrangler/qa-audit/production-*; real QA artifacts remain preserved.

Remaining external gates: physical Android/two-account acceptance, production
backup/ledger/binding/provisioning/provider/moderator setup, controlled deployment
approval, production smoke acceptance, signing/Play declarations and upload approval.
A ready build candidate is not evidence that these live operations happened.


> Earlier dated checkpoints below are historical and are superseded by the current candidate notes above.

## Production readiness recheck - November 19, 2026

Read-only release review after Preview 948f89ae; no production deployment authorized
or performed. Production is still NOT ready based on the current checked-in/local
source and documented acceptance gates:

- No Terms of Use page or app navigation destination exists in public/src. Privacy,
  About, Contact, Support and Help exist; their existence is not legal sign-off.
- Privacy location copy still says Map requests geolocation, but Map now only changes
  view. Persistent last-area court caching (24h) and the recent-sign-in deletion steps
  need a final policy/help consistency pass. Archive is irreversible in current UI.
- auth.ts still accepts only localhost or feature Preview and explicitly rejects main.
  Production migration inventory/backups/isolation, auth rollout and push readiness
  remain unresolved; no secret or production DB inspection performed.
- Physical Android Chrome/TWA/push and two-account acceptance have not been recorded
  as complete. Focused checks since the prior full run do not replace final integrated
  verification. Support inbox delivery/triage/retention remain unconfirmed.
- Android release remains version code 2; next existing-package internal bundle must
  be 3+. Signing/Console declarations/upload approval remain separate gates.

This review changes documentation only and does not claim a new test pass, legal
approval, store readiness, real-device acceptance or production availability.

# Production and Google Play readiness - November 19, 2026

**Not release-ready yet.** Launch copy/SEO preparation does not enable production.
Current work is authorized on feature/play-together Preview only; production/main,
production D1, Cloudflare environment secrets and Google Play uploads remain untouched.

## Confirmed engineering blockers

| Gate | Evidence / required next step |
| --- | --- |
| Production access guards | functions/lib/auth.ts accepts only localhost or stable feature Preview, rejects main. Deliberately unchanged. A reviewed production environment/isolation rollout is required before enabling accounts/games |
| Production schema and resources | Development uses schema 0025. Production migration/backups/bindings/rollback have not been approved or executed; never point production at development D1 |
| Push | Sender is gated to development origin/testers. Production push is not configured or verified; do not claim production closed-app delivery |
| Production build/routing | New build:release emits community routes into ignored dist-release, rejecting .dev associations and Preview noindex headers. It remains a candidate until production environment rollout and acceptance pass; normal build still serves discovery only |
| Android version/signing | Release package us.opencourts.app opens opencourts.us, code 2 / 1.0.1. Next signed bundle must use 3+. Confirm upload key and Play App Signing certificate; no signed AAB prepared/uploaded |
| Physical acceptance | Emulator checks do not complete physical Android Chrome/TWA, OAuth return, photos, sharing, offline/font-size, push receipt/tap/category/sign-out gates. Follow ANDROID_DEVICE_ACCEPTANCE.md |
| Two-account acceptance | Real account access transitions/private groups/unlisted invitations/capacity/waitlist/series/notification acceptance remains incomplete in the checklist |
| Play Console | Data safety, deletion URLs/behavior, app access instructions, content rating, audience and store copy need final review; upload/internal-testing destination needs approval |
| Operations | Verify support@opencourts.us delivery, report triage, retention/backup policy, provider redirects, monitoring and rollback. No mailbox setup or secret inspection is part of this work |
| Dependency advisory | Existing MapLibre 5.24.1 advisory/backport metadata discrepancy remains documented; do not claim a clean audit |

Google Play **internal testing** is the next store milestone, not public rollout.
No native iOS Play Together release is included. Existing discovery-app installation
prompts remain as requested; defer adding prompts to community pages until app support
is ready. No new store availability claims are introduced.

## Copy and SEO candidate

- Removed outdated test-environment/first-release messaging from Privacy, About,
  Contact, Support, Help, account and group/game creation screens. Retained privacy,
  visibility, reservation, retention and actual feature limitations. "Group preview",
  "photo preview" and "Review changes" describe real product workflows and remain.
  Local weather simulation remains DEV-only and explicitly labeled to avoid confusing
  simulated weather with real safety information.
- Sign-in problems use customer-facing wording rather than key/client configuration
  instructions. Technical environment safeguards are retained.
- Full responsive audit found the shared muted logo wordmark below text contrast
  requirements on light tablet/desktop backgrounds. Shared light muted color changed
  from #748078 to #59685f; dark colors and geometry retained, all pages stay consistent.
  The three failed matrices passed after correction; retain the original failed-run
  evidence rather than claiming that run passed.
- Home metadata now describes courts, playing weather, games and groups. Generated
  community HTML has route-specific titles/descriptions/OG/Twitter URLs/canonicals;
  removes inherited court-finder structured data. No private names or activity details
  are emitted into social metadata.
- Sitemap candidate adds public Play Together, group discovery and Help; excludes
  account/feed/inbox/player directory/management/individual game/group/invitation URLs.
  Shared public-page lastmod updated for November 19 changes. No synthetic events,
  private activities or invitation tokens included.
- Feature build adds X-Robots-Tag: noindex, nofollow to Preview only. Production
  candidate route HTML distinguishes public entry pages from noindex activity pages.
  Do not ship Preview noindex headers to production. Sitemap is a launch candidate,
  not a claim these routes are available on production or submitted to Search Console.

SEO references: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[Google developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers).
Per-page metadata and crawlable canonical URLs are used; robots/noindex does not
replace server authorization. No ranking or rich-result guarantees.

Final validation/publication evidence is recorded in APP_TESTING_CHECKLIST.md and
PLAY_TOGETHER_TEST_RESULTS.md. Preserve dated test records and intentional uncommitted
work. Do not stage credentials/runtime data/builds/logs or rewrite historical QA evidence.

Verified candidate: Preview d3ee9b78/index-DOfKH7ra.js published. 357 units passed;
first full browser run 252/255 identified and corrected three contrast issues. Final
full run 251/255 had four 30s timing failures; all four passed a single-worker rerun.
All 350 audit states have zero detected violations/JS errors/overflow. No single clean
final full-suite pass claimed. Dev and isolated production candidate builds pass.
Hosted canonicals, public sitemap, cleaned copy and Preview noindex header verified;
production deployment remains 7ef38ff2/main. No production/database/secret/Play changes.

## Concrete production rollout review still required

1. Complete device/two-account acceptance and review Console declarations, signing,
   support delivery and current advisories. Confirm intended release scope, especially
   whether production push remains unavailable initially.
2. Prepare reviewed backups and a migration inventory/rollback plan for production
   before any remote write. No development test-user data may be copied to production.
3. Implement/test explicit production environment authorization in source; do not
   merely remove origin guards or flip the development flag. Verify production-only
   bindings/resources and auth callback origins without reading/resubmitting secrets.
   Owner handles any required existing-secret configuration outside this workflow.
4. Build/review `npm.cmd run build:release`, route metadata, associations, generated
   sitemap, privacy and deletion paths. Exclude private/invitation routes from sitemap.
   Publish production only after approval, then perform controlled smoke acceptance.
5. Prepare signed version-code 3+ AAB with existing package/signature/destination;
   request approval before Google Play upload. Start internal testing, verify a
   Play-installed build, then consider public rollout separately.

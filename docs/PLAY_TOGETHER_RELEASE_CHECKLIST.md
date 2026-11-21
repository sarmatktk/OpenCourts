## Discussion production rollout authorized and in progress - November 21, 2026

Owner instructed production rollout after the explicit backup/migration request. Fresh production backup was exported into the disclosed Git-ignored workspace folder, restored with integrity/foreign-key checks, and migration 0033 dry-run preserved all existing table counts with no historical announcements. Initial export failed on network transport without creating a backup; retry succeeded. Evidence: qa-evidence/discussion-staff-production-backup.json.

Production push Worker f7e408f6-e40e-4ae7-9758-fd1ea0fbbf0e deployed before migration with --keep-vars; secret names/types are unchanged and no secret values were read. Migration 0033 is now applied: ledger 33, courts 201799, staging 100750, players 6, groups 1, photos 2, posts 1, comments 0, shared-photo choices 2, foreign-key errors 0. Existing records/choices were preserved. Pages publication and live acceptance next. Final merged production build passed. Android/store assets remain outside this release.

## Discussion presentation and staff announcements prepared - November 21, 2026

Prepared locally; not published. The Discussions tab shows the viewer-visible post count (including while on Group details), updates after post changes and replaces the duplicate feed heading. The compact toolbar retains the member-only reminder and New discussion. Posts and replies label current Owner, Co-owner and Organizer roles; ordinary members have no role badge. Three-dot reporting remains available on other people's posts/comments. Own content intentionally offers Edit/Delete rather than self-reporting.

New staff posts create one durable in-site announcement per other active member, with existing Groups/device push preferences and delivery-time checks for membership, blocks, author status, read state and post existence. No new notification setting. Ordinary member posts do not broadcast; existing reply subscriptions remain unchanged. Existing posts are not backfilled. Announcement records retain 30 days, pending push events 24 hours. Privacy/help copy updated.

Verification: full unit suite 465/465 passed; targeted discussion suite then 19/19 passed including the additional existing-preference test. All eight discussion browser tests passed after fixing the missing comment role header, plus six moderation checks passed in the earlier combined run. The earlier combined run was 11/14, with three role-header failures before correction; no snapshot updates. The final owner creation/edit/delete check also passed with explicit owner-badge, tab-count and no-self-report assertions. Production build passed. New regression covers 0032-to-0033 preservation with no historical announcement backfill.

Release requires additive migration 0033_discussion_announcements.sql (new announcement table/index/two triggers), updated Pages and push sender Worker. Automatic approval review rejected a proposed fresh production database export because explicit approval was missing for this new rollout's user-data payload and local backup destination. No export or production mutation ran. Required destination: the Git-ignored .wrangler/release-backups/production-pre-discussion-staff-<UTC>.sql inside this workspace; restore/integrity verification and local migration dry run before applying. Await explicit owner approval for backup export, migration and production Pages/Worker rollout. Existing Android/store asset changes remain untouched.

## Group discussions, menus and avatars live - November 20, 2026

Owner approved production rollout. **Production 76ed1d9a**, Git release commit
**4aa4d76**, is live. Migration 0032 was applied after a fresh private backup,
restore/integrity verification and migration dry run against that restored data.
Ledger is through 32; 201799 court rows / 100750 staging rows remain intact with
zero foreign-key errors. Existing accounts/photos were preserved; sharing stayed
off until each account opts in. Private backup hash and aggregate verification are
recorded in qa-evidence/discussions-production-backup.json.

Production sender/cleanup Worker version b7fb671b-9289-4d1b-859c-a20f39875670 was
deployed with --keep-vars. Existing secret names/types were preserved, with the
private push secret still present. No secret values were read, replaced or rotated.

The group overview now has reference-style Discussions/See all; full posts and
comments use avatars, relative times, inline Like/Reply and three-dot actions.
Only active members can read/post/reply in either public or private groups. Author
edit/delete, owner/co-owner remove/lock, site report review, evidence holds and
cleanup are implemented. Chat reports, games, groups and players use the same
three-dot menu pattern. Profile photos are optional: Account -> Show my photo
beside my name in games and groups. Existing private photos are not exposed by
default; initials appear otherwise. Photos remain private/no-store and require
current sharing/access and no bilateral block.

Local verification: 449 units, 38 combined browser checks, final 8 feed/photo
checks and production build passed. No snapshot updates. Live production API
verification passed ten scenarios: membership isolation, post/reply submission,
no self-notification, likes without notification spam, mute, lock/unlock and edit,
report access, real image processor/R2 sharing, block/removal revocation and
cascading deletion with report evidence. Four hosted phone/desktop-theme browser
checks passed against production HTML/JS with browser-local synthetic API data;
live backend checks were separate. Thirty public routes and six shared assets
still pass. No Preview acceptance was requested or required by the owner.

All scoped synthetic accounts/groups/posts/comments/reports/actions/photos were
removed. No real-user notifications were sent. Provider/device receipt for the
new discussion notification kind and real OAuth were not retested; earlier owner
acceptance is preserved without expanding its scope. This website update does
not upload an Android bundle or Google Play release. Unrelated Android work and
store assets remain preserved locally. Source and handover records are in Git.
See GROUP_DISCUSSIONS.md and qa-evidence/discussions-production-smoke.json.

## Group discussions, content menus and avatars ready locally - November 20, 2026

Reference-style discussion feed implemented: avatar rail, name/relative time,
three-dot menus, open text rows, Like/Reply, plus count/See all on the group
overview. Only active members can read/post/reply, even in public groups.
Authors can edit/delete; owners/co-owners can remove/lock; site moderators can
review reported snapshots, remove content and preserve/release evidence. Reply
notifications exclude the sender and respect mute, blocks and membership; likes
send no notifications. Ordinary posts remain until deleted. Privacy/Terms/Help
describe access, moderation, retention and photo sharing.

Chat, posts and comments use small avatars with initials fallback. Existing
uploaded photos stay private unless the player explicitly enables sharing in
Account. Sharing is independent of discoverability. Photo reads recheck current
game/shared-group access and bilateral blocks and remain private/no-store.

Final local checks: 449 units (27 files, 5.35s); combined 38 browser checks
(52.4s); after the final narrow-screen heading adjustment, all 8 discussion/
layout/photo-preference browser checks passed again (20.3s). Production build
passed (Vite 7.10s). Browser checks cover 320/390/1440px, both themes, axe,
menus in modal chat, focus restoration, author edit/delete, likes, replies and
photo preference controls. Upgrade from existing schema 0031 was verified with
existing private photo data retained, zero foreign-key errors and integrity ok.
No snapshots updated. Earlier intermediate failures remain in ignored test logs;
they were corrected, not hidden by snapshot updates.

**Not yet deployed.** New additive migration 0032_group_discussions.sql and
production sender Worker update are required. Prior production deployment
c8272ecf remains the live website. No production DB write, secret access/change,
Git main update or Google Play upload occurred during this feature work.
Owner approval for the new production migration/rollout is pending; do not
publish the discussion UI against an unmigrated database. See GROUP_DISCUSSIONS.md
for backup/target/rollback steps and qa-evidence/group-discussions-local.json for
sanitized evidence. Unrelated Android bundle/version/store-asset work is preserved.

## Android release version updated - November 20, 2026

Owner requested version name **2.0.0**. Android source now uses versionCode 3 /
versionName 2.0.0; debug displays 2.0.0-dev. Package, signing identity and destinations
are unchanged. Earlier 1.1.0 references below describe previous source/artifacts.
Rebuild the signed bundle before uploading; no bundle or Google Play upload was
performed for this version-label change.

## Git deployment synchronized - November 20, 2026

Current production **c1e970ce** and feature Preview **115472aa** were built by
Cloudflare from GitHub push of release commit **8d6bea3**, with commitDirty false.
The intentional local release work is now committed and pushed; main was
fast-forwarded to the verified feature release. This supersedes earlier statements
that Git main was not changed. Existing snapshot changes were preserved; no
snapshots were generated or updated during this synchronization.

Cloudflare build command is now npm run build:pages, output dist. Production on
main and Preview on feature branches build separately. Environment configuration
preservation was verified. No secret values were printed or changed; no database
migrations, user-data writes, Worker releases or Google Play uploads occurred.

Fresh verification: 432 unit tests passed, six fresh-server sign-in recovery
browser checks passed (18.1s), both branch-aware builds passed. Each Git-built
environment passed seven public route/API checks and four browser checks
(390/1440px, light/dark), with no overflow or JavaScript errors. An initial smoke
probe used nonexistent /play-together/games and returned 404; corrected to the
actual /play-together/groups route, which passed. This was a probe correction,
not an application fix. Historical broad-suite visual exceptions remain recorded.

Future workflow: feature commit/push, check Preview, merge/push main, check
production. Database/Worker changes require their own reviewed operations.
See DEPLOYMENT_WORKFLOW.md and qa-evidence/git-deployment-sync.json.

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

## Guest permissions follow-up (November 20, 2026)

Preview 1019f776 allows group owner/co-owner/organizer and non-group host direct
confirmation of own guests after confirming their own playing place. Other players
still need approval; capacity and waitlist reservations apply. No new migration.
432 unit and 20 focused browser checks passed; candidate builds passed. Review
APP_TESTING_CHECKLIST.md for current hosted evidence and outstanding release gates.
Production is unchanged.

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

November 19 game-chat candidate: include migration 0027 in the reviewed production
plan, verify scheduled chat cleanup heartbeat and case/hold review ownership,
and update Google Play Data safety for stored text chat/user-generated content
and safety-report evidence. Privacy/Terms/Help describe 30-day room expiry,
90-day resolved-report retention, preservation exceptions and server-readable
(not E2EE) chat. Real Android closed-app chat push/tap is still pending. Preview
verification is not production or Google Play upload approval.

November 19 latest candidate: Preview 88882429, Terms/Privacy/deletion help and approved 18+ sign-in, production-isolated source guards/push/cleanup, MapLibre 6.19.0 with zero production dependency findings, and Android code 3 are prepared. Production has NOT changed. Read [the rollout plan](PRODUCTION_ROLLOUT.md) and [current evidence](APP_TESTING_CHECKLIST.md) before any live action.

> Historical snapshot. Use [the current app testing checklist](APP_TESTING_CHECKLIST.md) for current readiness; checks below are dated evidence, not current acceptance.

November 19 launch review: production/Google Play remain **not ready**. See
[PRODUCTION_LAUNCH_READINESS.md](PRODUCTION_LAUNCH_READINESS.md) for current blockers,
the isolated production build candidate, SEO/copy changes and rollout order. A green
automated suite or removal of test-language is not production enablement or Play approval.

November 19 current checkpoint: 231/231 fresh-server browsers and development build
passed; feature Preview 014eaa04 published and public route/provider-readiness checks
passed. Physical Android Chrome/TWA/push and two-account acceptance remain pending.
Google Play internal testing only; no native iOS release. Existing release package
us.opencourts.app opens opencourts.us; debug us.opencourts.app.dev opens Preview.
Gradle still uses code 2 / 1.0.1; next signed bundle needs code 3+ after signing and
destination approval. No store upload authorized or performed. Production unchanged.

# Play Together - release acceptance checklist

Preview candidate:e303ef23, development schema0017. November17,2026.
This is a development candidate, not approval to release to production.

## Automated and live-development checks completed

- [x] Build/TypeScript and257 unit tests.
- [x] Complete85-browser suite: court discovery/weather, responsive layouts, theme switching,
  profile/media, roles/groups, invitations, guest counts and cancellations, inbox, sharing/safety.
- [x] SQLite tests: duplicate participation/membership, overbooking rollback, current membership
  and manager roles, outsider denied, invitation expiry/revocation, private API projection,
  CSRF, opt-in discovery, symmetric blocking, moderator-only reports, roster pagination.
- [x] Real Preview/D1:26 synthetic-account API checks; fixture cleanup confirmed.
- [x] Preview COURTS_DB is devUUID; production binding/config/deployment kept unchanged.
- [x] MapLibre5.24.1 patched sanitizer regression tested. Audit discrepancy documented separately.
- [x] Theme/mobile screenshots and basic keyboard/contrast tests;44px important action targets.

## User/device checks still required

- [ ] Real Google sign-in, sign-out, refresh and reconnect in two browsers after latest deployment.
- [ ] Real Apple sign-in/callback, linking and return-to-app behavior.
- [ ] On physical iPhone Safari and Android Chrome: create game, join/request, host approve,
  guests/capacity/cancel/reason/notifications; use account crop via touch and save.
- [ ] Actual Android TWA: login transitions, back/navigation, safe-area dock, external directions/share.
  Existing Android package/domain remains production; do not change app association or publish
  an app just to test Preview. Use mobile Chrome for Preview where TWA isn't configured for it.
- [ ] Private group with separate real accounts: preview reveals only approved public fields;
  forwarded group game denies outsider; removal closes subsequent API access and clears next refresh.
- [ ] Sam account: Players -> Report review; see submitted test report, resolve it. Other accounts
  cannot read queue. Test reporting with synthetic content only.
- [ ] Unlisted: create/revoke invitation, open after sign-in, request approval, test expired link.
- [ ] Opt-in profile appears, opt-out disappears, block/unblock updates discovery/new join permissions.
- [ ] Screen reader/VoiceOver/TalkBack and keyboard review on actual devices; detailed contrast audit.

## Remaining release operations

- [ ] Reconcile npm advisory metadata that flags the officially patched MapLibre5.x backport and
  review dev-tool audit findings. Do not describe npm audit as clean.
- [ ] Agree report triage/enforcement/retention responsibilities and support response process.
- [ ] Review notification retention and pending-membership request review bound (200 entries).
- [ ] Separately approve production migration/config/domain rollout and backup/rollback plan.
  Never point preview at production or copy synthetic user records into production.

Next product milestone after free first release: recurring/series games. Payments/entitlements
and native Swift integration remain later and require their own design/approval.

Latest rerun November17:257 units/84 browsers/build/26 live synthetic checks passed. See PLAY_TOGETHER_TEST_RESULTS.md. Real-provider and physical-device items above remain manual; no production release approved.


Audit fixes published November 17: candidate c17ef75c, bundle index-BxFx9CTz.js.
350 local responsive/theme states have no detected axe violations or page overflow;
physical-device/screen-reader gates above remain open. Production unchanged.
Subsequent player-search race hardening is local only, with a red/green regression
and 10 focused browser passes. See current handoff before publishing another build.


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


## Pending player-invitation Preview rollout

- [ ] Review/apply migration 0018 to opencourts-dev only before deploying the new backend.
- [ ] Publish the local Players mobile tab and public-game invitations to feature Preview.
- [ ] Two-account synthetic verification: send, inbox, request, approve, block/full-game denial.
- [ ] Physical-phone test of all six dock targets and the invitation picker in both themes.

Local checks: 268 units / 107 browsers / build passed. No hosted migration or deployment yet.

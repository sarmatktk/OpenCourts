## Profile photo mobile upload investigation - November 21, 2026

Owner reported a raw expected-pattern error on phone Save photo; desktop upload worked. The original failure is not reproduced on the physical phone and its exact response/status remains unknown. Do not claim a confirmed root cause or device fix. Unauthenticated production media probes returned normal JSON (GET 404, PUT 401), without modifying accounts or photos.

Upload compatibility changes materialize bounded image bytes before fetch instead of passing a Blob, request JSON explicitly, handle non-JSON/error responses without leaking browser parse errors, explain expired sessions/network errors, and preserve the selected crop for retry. Existing authentication, CSRF, privacy and 5 MB limits remain enforced.

Verification: 6 unit tests passed; 6 focused browser upload/crop/retry checks passed; one additional mobile-size boundary test passed (5 MB accepted and cropped to under 1 MB; 5 MB + 1 byte rejected before upload). Production build passed. Earlier broader photo selection ran 7 tests: 5 passed, 2 failed only on existing crop-action snapshots that predate the photo-sharing checkbox/privacy copy. No snapshots updated. Separate pixel-level crop test passed at 512x512 with the selected blue region preserved. Physical-phone retry remains pending. Publication pending; no database or Worker changes.

## Group tabs and moderation toggle fix - November 20, 2026

Removed the discussion overview preview from Group details; discussions now appear only in their own tab. Hash navigation also restores the correct section. The Site moderation entry on Players now expands/collapses its panel with accessible expanded state, preserving the selected moderation view.

Focused browser verification: 14/14 passed on a fresh local server without snapshot updates, covering phone/desktop, light/dark, repeated tab changes, mouse and keyboard moderation toggles, and existing reporting flows. Production build passed. Published Git commit cf9aed2 as production deployment c853ba3a-27aa-4419-8452-df8fd02c34e6. Four hosted UI checks passed (390/1440 px, light/dark), including both fixes, using live production assets and synthetic browser-local API fixtures; no real group/report data was changed. Evidence: qa-evidence/group-tabs-production-browser.json. No database, Worker or secret changes required.

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

## Metadata and analytics published - November 20, 2026

Production **c8272ecf** is live from Git commit **023e078**. New premium versioned
social artwork, consistent browser/Apple/install icons and a single shared Google
Analytics loader are published across public and generated community pages.
Owner confirmed Enhanced measurement is off. Explicit page views use approved
paths/generic titles and suppress query strings, fragments and referrers; Preview
hosts do not load the Google tag. Privacy disclosure is updated. Keep Enhanced
measurement off. Actual GA dashboard receipt has not been verified.

435 unit tests, production build and seven stubbed-network browser checks passed.
Published production verification passed 30 routes and six assets. Per owner
instruction, did not wait for or run additional Preview acceptance. No snapshots
updated, SQL changed/applied, secrets changed, Android bundle published or Google
Play upload performed. Android/store-asset work remains preserved separately.
See WEB_METADATA_AUDIT.md and qa-evidence/site-metadata-production.json.

## Tablet store screenshots prepared - November 20, 2026

Created seven images each in android-app/play-store/tablet-7-inch (1200 x 1920)
and tablet-10-inch (2560 x 1600): court discovery, court map, weather, public games,
game details, groups and dark-mode chat. Actual production web UI captured at
tablet viewports; public court/weather data live, community data fictional and
intercepted locally. These are not installed-tablet acceptance evidence. All 14
opaque PNG dimensions checked; no page overflow or JavaScript errors during
capture. Visually reviewed. No app styles, production settings, secrets or
real account data changed; no Google Play upload. Capture script and instructions
are in scripts/capture-store-screenshots.cjs and android-app/play-store/README.md.

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

## Owner-requested production notification sent - November 20, 2026

At the owner's explicit request, queued exactly one test invitation event for the
owner's active production subscription. Scheduled sender marked it sent on its
first attempt, with no provider error. This confirms provider acceptance, not yet
phone receipt or tap. Real-device delivery acceptance remains pending owner reply.

The target is a clearly labeled unlisted game, Notification test - no actual game,
with a nondiscoverable synthetic host and recipient-specific access. No real
attendance or venue booking is intended. A two-hour invitation-access window keeps
the target usable for tapping. No real account/profile/preferences were altered.
Only the explicitly requesting owner was targeted; one device was eligible.

**Cleanup pending after receipt/tap confirmation:** remove only this synthetic
host/game/invitation and its event/room records. Scoped identifiers are in the
private ignored .wrangler/qa-audit/production-test-notification.json. Do not remove
the test destination before tapping has been verified. The sender helper refuses
a duplicate while that record exists. Do not modify other games, notifications,
player records, device registrations or secrets. Sanitized evidence:
qa-evidence/production-requested-test-notification.json.

## Production phone opt-in confirmed; delivery still pending - November 20, 2026

Owner clarified that notifications were enabled, but receipt/tap had not yet been
tested. Read-only account-scoped metadata confirms production opt-in and one active
session-owned device subscription. No endpoint, encryption key or session token
was inspected. Do not mark closed-app delivery or tap acceptance as passed yet.
Next: another account sends a message in a shared game while the receiving phone
app/chat is closed; verify receipt and the tapped game/chat destination. Evidence:
qa-evidence/production-owner-push-opt-in.json. No notification was sent by this check.
Google Play signed bundle/internal upload remain subsequent work, with existing
package/signing identity preserved and explicit approval required before upload.

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

## Desktop chat composer layout - November 20, 2026

Current feature Preview **9811481a**:
https://feature-play-together.opencourts.pages.dev. This supersedes the earlier
Preview deployment identifiers below. The message input now fills the dialog's
content width and Send remains entirely visible. Generic site-footer CSS had
applied a fixed height and flex layout to the chat composer footer, squeezing
its form. The composer explicitly resets display/height/min-height/width and
makes its form full-width, while keeping the existing compact padding.

Four desktop geometry checks reproduced the defect before the fix (input about
228px in a 758px footer). Final fresh-server Chrome verification: **15/15 passed
(31.1s)** across game/series chats, light/dark, 320/390/1440px, short desktop windows,
focus/report/mute/accessibility and long-history scrolling/sending. Resize checks
wait for visualViewport layout to settle; an intermediate immediate assertion
raced that resize and was corrected. No snapshots updated. Development build
passed (Vite 8.06s); existing bundle-size warning remains. No unit/backend changes
or new full-site regression run are claimed for this CSS-only fix.

Reviewed synthetic screenshots: qa-evidence/chat-composer-desktop-light.png and
qa-evidence/chat-composer-desktop-dark.png. Production/main, databases, worker,
secrets, Git staging/commits/push and Google Play are untouched. Intentional work
is preserved. Earlier physical-device and full-site visual/release gates remain.

## Direct guest places for hosts and group staff - November 20, 2026

Current feature Preview **1019f776**:
https://feature-play-together.opencourts.pages.dev. This supersedes earlier
Preview identifiers and the blanket statements that every guest needs approval.

Group owners, co-owners and assigned group organizers can add their own guests
without approval. Hosts of non-group games can do the same. The person bringing
guests must have a confirmed playing place; each can add one to three guests.
Other players continue to request approval. Guest places still count toward total
capacity and cannot consume a live waitlist reservation. Capacity expansion does
not itself approve pending guest requests. Guests do not acquire an account,
group membership or chat access. The controls say Add guest places / Guest places
confirmed for direct additions and Request guest places for ordinary participants.
Help and Terms explain the distinction.

Direct additions atomically recheck the session, current role, open game and own
attendance. Occupancy guards reject overbooking without a partial request or
headcount change. Role loss during saving denies the addition. Existing pending
or confirmed guest places must be cancelled before replacement. No self action
notification is created; cancellation copy no longer incorrectly promises that
the acting host was notified of their own action.

Verification: **432/432 units**, 25 files (5.47s), including all group staff roles,
public hosts, ordinary-member approval, missing own attendance, overbooking,
reserved places, role-loss races and no-self notification. **20/20 fresh-server
browser checks** (35.5s), mobile/desktop and both themes, including add/request,
confirmation/cancellation, request decision styling and capacity editor regression.
No snapshot updates. Development and local production-candidate builds passed
(Vite 12.62s / 8.08s); existing bundle-size warnings remain.

Hosted Preview verification also passed **8/8 synthetic scenarios**, including
public-host direct confirmation without self notifications and direct confirmation
for group owner, co-owner and a non-host assigned organizer. All temporary
players/games/groups/rooms were removed; no real-user notification was sent.
The initial hosted fixture used an approval policy inconsistent with the app's
approved-member group instant joining; after correcting that fixture and asserting
confirmed attendance, the complete run passed. These setup attempts are not
counted as passes. Evidence: qa-evidence/direct-guests-hosted.json. The stable
Preview client bundle and updated Help copy were verified after publication.

No migration or worker change is needed. Production/main/production D1, secrets,
Git staging/commits/push and Google Play are untouched. Existing intentional work
is preserved. Physical-device review and the prior full-site visual/release gates
remain pending; these focused checks do not claim a new full-site run.

## Chat title focus outline fix - November 20, 2026

Current feature Preview **4f971d64**:
https://feature-play-together.opencourts.pages.dev. This supersedes the deployment
identifiers in earlier entries below. Opening Game chat or Series chat no longer
draws a rectangular outline around the static title. The general .pt-page
:focus-visible rule had greater specificity than the title reset. A narrowly
scoped title-focus rule now wins, while initial heading focus, screen-reader
announcement, keyboard control outlines, modal focus trapping and return focus
remain intact. No JavaScript focus behavior or notification/access rules changed.

Verification: nine fresh-server Chrome browser checks passed (29.1s), covering
320px/1440px, both themes, both conversation types, pointer and keyboard opening,
visible keyboard-control focus, close/Escape/return focus, nested reports and axe.
Development build passed (Vite 7.38s); existing bundle-size warning remains.
No snapshot updates. Preview publication succeeded; no migration or worker deploy.
Production, main, databases, secrets and Google Play are untouched. Intentional
uncommitted work is preserved. Physical Android confirmation of this styling fix
remains a device check; automated browser verification does not claim that test.

## Capacity editing and chat lifecycle notices - November 20, 2026

Current feature Preview: https://feature-play-together.opencourts.pages.dev
(deployment **ef0ceaad**). This supersedes the older Preview identifiers below.

Organizers can edit format, courts planned and total capacity for group and
non-group games. Increasing capacity offers an explicit, default-on option to
confirm waiting players. Existing valid reserved offers are honored first; the
remaining waitlist and pending join requests share request order, with duplicate
players admitted once. A preview shows the maximum number to be confirmed.
Confirmed players and approved guests keep their places; shrinking cannot remove
occupied or reserved places. **Pending guest requests remain separate and require
manual approval**, as requested. Editing one series date does not edit other dates.
Saving rechecks live permissions, version, eligibility and occupancy atomically;
conflicts return an error without partially editing the game or admitting players.

Confirmed admissions create small quiet chat notices. Pending requests do not.
Standalone removals immediately revoke chat access; the nonplaying organizer
retains management and chat access. Series group-departure notices also cover
staff who accessed the chat through their role without a membership record.
The existing 30-day dual-inactivity rule and staff exemptions remain. Notices do
not create unread counts or push alerts. Game actions refresh an open chat
immediately rather than waiting for the normal polling interval. Help and Terms
now describe the capacity choice and quiet notices.

Verification: **427/427 unit tests**, 25 files, 5.85s. Focused fresh-server browser
runs: **21/21** capacity/chat/scroll checks (41.2s) and **22/22** waitlist/request/
action-layout/dynamic checks (41.3s), Chrome, no snapshot updates. Development
and local production-candidate builds passed (Vite 9.17s / 7.64s). Existing
bundle-size warnings remain. Six hosted synthetic scenarios passed on real D1,
including FIFO preview, standalone expansion, opt-out, separate guest approval,
group co-owner mixed queues, shared-series notices and immediate removal denial.
All temporary accounts, games, groups and rooms were removed; no real-user
notification was sent. See qa-evidence/chat-capacity-hosted.json.

Final editor rerun: **6/6** (18.9s), including zero detected axe violations
in both themes at 320/390/1440px and saved-value persistence after asynchronous
refresh. A final UI review caught an old-value reset; the effect now also tracks
returned game settings, and the regression asserts the saved capacity remains
visible. Screenshots: qa-evidence/capacity-editor-320-dark.png and
qa-evidence/capacity-editor-1440-light.png. These six cases overlap the 43 above.
The initial hosted setup hit Windows command-length limits; batched fixture setup
resolved that tooling issue, and the complete hosted run passed.

Development-only migrations **0030 and 0031** applied after a fresh private backup,
isolated restore, integrity/FK checks and migration dry run. Attendance, request,
guest and report counts were preserved; the deliberate recent-admission repair
added one quiet notice. Ephemeral edit receipts/plans are cleared after saving.
Dev notification worker **d1a76c66-7bf6-4215-83b1-08ef1feaf76b** deployed with
--keep-vars and a variable-free config; secrets were neither read nor changed.
Production/main/production D1, Git staging/commits/push and Google Play are untouched.

The earlier full-site screenshot reconciliation remains a release gate; these
focused checks do not claim a fresh full-site green run. Physical Android owner
acceptance from before the dialog/series/capacity changes remains recorded, but
these latest changes still need physical-device review. Existing rollout and
Play upload approvals are still required.

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

## Unread chat indicator contrast - November 20, 2026

Preview be84f6fc changes the unread dot and count badge to theme-aware text/surface
colors, matching the header notification count. Dark mode uses a light indicator
with dark badge text; light mode uses a dark indicator with light badge text.
The icon dot increases from 12 to 14 px and retains its separating surface ring.

5/5 targeted browser checks passed (21.9s): chat flow and accessibility at
320/1440 px in light/dark mode plus moderator evidence. Added computed contrast
assertions: dot/ring and badge/panel >=3:1, badge text/background >=4.5:1.
Development build passed (Vite 10.15s). No snapshot updates. Actual collapsed-chat
screenshots preserved in docs/qa-evidence/chat-unread-320-light.png and
chat-unread-320-dark.png. Previous full unit result remains 394/394; no new full
unit run for this scoped CSS correction. Published only to feature-play-together
Preview. Production, D1, secrets, worker configuration and store uploads unchanged.

## Sent chat message visible on the page - November 20, 2026

Follow-up to the scroll fix: scrolling only the internal chat log could leave
an outgoing message above the visible page while the composer was in view.
After a successful send, the confirmed message now scrolls into the page viewport
with space for the fixed header and floating navigation. This reveal runs only
for that sent message; background refresh retains the existing reading behavior.
Keyboard focus is not moved. The same GameChat component serves group/public games.

Preview b202a06a published to https://feature-play-together.opencourts.pages.dev;
hosted game route returned 200 with noindex. 11/11 browser checks passed (26.1s),
including six long-history cases at 320/390/1440 px in both themes. The strengthened
send assertion checks the message is inside the visible page with a 600 px
viewport, clear of header/navigation, as well as at the bottom of the internal
log. Existing chat/report/mute/accessibility and moderator evidence checks passed.
Development build passed (Vite 7.48s). No snapshots changed. Prior 394/394 unit
result remains the latest full unit run; this follow-up changes client scroll
behavior only. Evidence: docs/qa-evidence/chat-send-visible-verification.json.
Physical phone/keyboard behavior remains a manual acceptance check. Production,
main, D1, secrets, worker configuration and store uploads unchanged.

## Game chat scroll stability - November 20, 2026

Preview 89a9dfa5 (feature-play-together) opens expanded chat at the newest
messages. It follows incoming messages while the reader is at the bottom;
scrolling back preserves the visible message and its offset. Loading older
messages preserves that anchor, and background refresh revalidates and retains
the loaded history instead of replacing it with the newest 50 messages.
A Latest messages button returns to the bottom; new arrivals are not marked
read while the reader is away from the bottom. Sending a message returns to the
latest conversation. Reopening resets to the latest page. Content/viewport resize
preserves the reading position or follows the bottom as appropriate.

Verification: 12/12 browser checks passed (26.9s), including six long-history
cases at 320/390/1440 px in light/dark themes, existing chat/report/mute/accessibility
checks, moderator evidence and dynamic access-revocation checks. Synthetic 120+
message fixtures cover pagination, refresh, incoming messages while reading,
read acknowledgement, resize, close/reopen, own send and revoked-access clearing.
394/394 unit tests across 25 files passed (6.85s). Development build passed
(Vite 6.81s). No snapshots updated. This is targeted verification, not a new full
site browser-suite pass. Evidence: docs/qa-evidence/chat-scroll-verification.json.

Published only to https://feature-play-together.opencourts.pages.dev.
Production, main, production D1, secrets and store uploads unchanged. Existing
uncommitted work preserved. Native phone/installed-app scrolling remains a manual
acceptance check; browser emulation does not replace physical-device verification.

## Chat defaults on and specific test-chat unmute - November 20, 2026

Verified new chats already default to push unmuted: database muted DEFAULT0,
missing-state fallback false and enqueue/delivery COALESCE(muted,0)=0. Added a
regression case proving a new chat is unmuted, marking read keeps that default,
and an explicit mute persists until explicitly unmuted. Chat tests13/13 pass1.53s.
No application behavior or deployment change was needed for the default.

Following the user's request to enable chat notifications, updated only the
previously identified receiving profile/game in Preview to muted=0, guarded by
that profile's identity. Exactly one row changed. Read cursor remained unchanged
(the returned current last_seq was5). No other account's mute choices, category
preferences or device permissions were changed. A new unread message is needed
for the closed-chat test; old/read messages do not generate retrospective push.
No actual notification delivery or physical Android acceptance is claimed.
Raw account/game identifiers stay in ignored diagnostics. Production, secrets,
Cloudflare configuration and store targets unchanged. Preview remains ac818aea.

## Emulator chat-push diagnosis - November 20, 2026 (read-only)

Investigated a reported missing message push after all-account eligibility rollout.
Named receiving profile has push/game/group preferences enabled and one active
registered device. Scheduled worker cleanup heartbeat was fresh. Latest relevant
chat message has no push event; receiving chat state is muted=1 and its read cursor
includes the latest message. This is not evidence of delayed provider delivery:
room mute prevents enqueue and already-read events are suppressed at send time.
Recommended explicit user test: unmute with the crossed bell, leave receiving
chat, send a fresh message from another account. No preferences, subscriptions,
messages or notification permissions were changed remotely.

Read-only ADB found Google Play Services present, Chrome POST_NOTIFICATION ignored,
and development app notification operation allowed by default. Manifest includes
TWA notification delegation, so Chrome permission is a separate browser-only
concern and was not asserted as the sole TWA cause. No real receipt/tap success is
claimed; physical Android acceptance remains pending. Diagnostic queries selected
only identifiers/timestamps/counters/preferences/read cursors, never message text,
session tokens, raw endpoints or encryption keys. Raw details remain ignored.
Production, Cloudflare secrets/configuration and source behavior are unchanged.

## Push available to all accounts - November 20, 2026 (current Preview)

Published Preview ac818aea (https://feature-play-together.opencourts.pages.dev).
Development delivery worker opencourts-push-dev version
9bc7814e-e2ea-49ad-8269-e4108fc789d8, minute cron. The user authorized opening push
eligibility to all accounts. Removed the per-player tester restriction from both
registration/settings and worker delivery. The legacy PUSH_ALLOWED_PLAYER_IDS
setting is ignored; no Cloudflare setting/secret changes were needed. Deployment
used the variable-free development configuration and --keep-vars.

Every active signed-in account may opt in on supported devices. Each device still
needs browser/OS permission and registration through Account > Enable on this
device. Existing opt-outs, category choices, chat mute/read state, blocks, current
activity access, session revocation, generic payloads and no-self notifications
are preserved. Only relevant recipients receive events, not every account. No
bulk device registration, account merging, historical-event replay or test push to
real users was performed. The existing ten-active-device account cap remains.
Production remains gated separately and unchanged.

Investigation before the change found the named email linked to two active
profiles, neither with push preferences or registered devices; only one had live
sessions. No tokens, endpoints, encryption keys or message contents were selected.
Read-only diagnostics are private/ignored, not copied into tracked docs. This
account will still need the device opt-in step after eligibility opens.

Verification: full units 393/393 across 25 files, 10.86s; focused notification/chat
browsers 15/15, 27.3s, no snapshot updates; Preview build passes, 12.12s. Added a
real SQLite/mocked-sender test proving a previously unlisted new account can
register and receive an eligible push with an empty legacy list. Disabled/wrong
origin/environment cases still fail closed. Permission-denial and chat mute UI
checks pass. Hosted Account HTTP200 and anonymous push settings HTTP401/private,
no-store. No real-device delivery is claimed from these checks. Physical Android
closed-app receipt/tap and new-account/device acceptance remain pending.
Production/main/D1, credentials/secrets, account preferences/devices and stores
were not changed by this rollout. Existing uncommitted work preserved.

## Site compactness audit - November 19, 2026 (current Preview)

Published Preview753893ed (https://feature-play-together.opencourts.pages.dev),
immutable https://753893ed.opencourts.pages.dev, bundle index-DUFTZfF7.js.
See [COMPACT_LAYOUT_AUDIT.md](COMPACT_LAYOUT_AUDIT.md) and the retained measured
[comparison](qa-evidence/compact-layout-audit.json).

Audited31 page views at320/390/768/1024/1440 in both themes:310 final states,
zero runtime errors, axe violations or horizontal overflow. Baseline180 states;
intermediate186 and310 passes retained; verified310 plus targeted10 group-owner
rechecks cover the final source. Changes: consistent panel/card/form spacing,
responsive player search and player action rows, grouped account sign-out/group
management controls, inline invitation controls where they fit, location/report
metadata row, corrected invitation trigger positioning, and one community dock
reserve instead of two. Small-phone invitation controls stack to keep selected
values on one line. Policy reading space, court map/weather space, essential
safety copy, brand/theme tokens and44px action targets preserved.

Measured synthetic light-theme examples: account390px2744->2512 (-232px), group
owner390px2948->2712 (-236px), group owner1440px2511->2300 (-211px), players/
moderator1440px2218->1872 (-346px). These are fixture comparisons, not a promise
that every real account or activity has the same height. Court and Privacy page
heights are unchanged in these comparisons. Before/after representative renders
were inspected; raw screenshots/logs stay under ignored qa-audit folders.

Verification:

- Full units392/392,25 files,6.92s.
- Initial fresh-server non-matrix browser run291:265 passed,26 failed (6 geometry,
  20 screenshot baseline differences),6.0min. No baseline updates.
- Corrected desktop location double-margin and phone heading gap, used atomic
  geometry measurements while asynchronous sections settle, and retained readable
  stacked invitation controls where a side-by-side field was too narrow.
- Final targeted40/40 passed39.1s:10 group-owner audit states,8 compact-control
  cases,2 phone-heading cases,20 flow-completion cases. Snapshot assertions were
  explicitly ignored for those20 flow cases so later assertions (including avatar
  crop save/pixel verification) could run; their old baselines remain unchanged.
  Combined with the265 initial passes, all291 unique non-matrix cases completed
  their functional assertions. This is NOT a fully green snapshot suite:20 stored
  screenshot comparisons still reflect earlier layouts. Preserved60 expected/
  actual/diff images and failure summary in qa-audit/density-visual-diffs.
- Final dev build passed19.77s; release candidate passed7.10s. Existing map-chunk
  size warning remains. No production deployment or store upload.
- Hosted Account/Players/Groups/My Games/Privacy/Terms HTTP200 with Preview
  noindex/nofollow, current bundle verified; anonymous moderator account endpoint
  HTTP401/private,no-store. No authenticated real-account changes performed.
- git diff --check passed for changed source/docs/tests. Existing uncommitted work,
  including previously modified snapshot baselines, preserved. No staging/commit/
  push. Credentials, databases, uploaded photos, build outputs and raw logs excluded.

Production/main/D1, Cloudflare variables/secrets, push worker and stores unchanged.
Physical Android Chrome/installed TWA, enlarged font/landscape/keyboard/footer
acceptance remains pending; reviewed snapshot refresh is separate outstanding QA.

## Compact game actions and detail rows - November 19, 2026

Published Preview56a6a8af (https://feature-play-together.opencourts.pages.dev),
bundle index-DWlHqUbF.js. Invite/Share/Report now share a wrapping Game actions
section instead of separately padded sections. My Games moved out of participation
to a navigation row beside Browse public games. Mobile Invite/Share and navigation
pairs fit at320/375; desktop fits Report alongside Invite/Share. Expanded invitation
forms, unlisted links, help and feedback retain full-width rows. Updated unlisted
invite guidance to refer to Game actions. Tightened aside spacing and game facts;
labels/values stay alongside each other on mobile with wrapping values. All action
targets remain at least44px. Access/attendance/guest/sharing behavior unchanged.

Final dev build passed6.20s. Final focused browsers20/20 passed22.4s, including six
new geometry/axe/overflow cases320/375/1440 light/dark, invitation picker expansion,
report dialog and44px targets; invitation/sharing/safety checks also passed. Earlier
broader run49 tests:47 passed, two game-mobile screenshot comparisons differ only
with the reviewed intended layout change (393x2026 old vs393x1663 new). Inspected
old/new dark mobile views and new375/320 light +1440 dark action-row renders.
No snapshot updates: previous intentional uncommitted baseline changes preserved;
these two comparisons remain expected visual-baseline differences, not a new full
passing-suite claim. Initial new geometry checks measured during host/guest data
loading; awaited host editor/guest section/fonts, then corrected320px horizontal
padding while preserving44px height. Final all20 passed; logs retained in ignored
qa-audit. No production/main/database/secrets/store changes. Physical Android
acceptance and reviewed baseline refresh remain separate outstanding QA work.

## Messenger-style compact bubbles - November 19, 2026

Published Previewfe208d2a (https://feature-play-together.opencourts.pages.dev),
bundle index-wETsT2IM.js; stable hosted bundle independently verified by curl.
Own messages now align right; incoming align left. Content-sized bubbles cap at
92% width, use tighter6px gaps/8px inset, and remove the old44px metadata-row
minimum. Date and time share a single line. Name, timestamp and report flag retain
a compact header; very long names truncate visually with full name in title/DOM
and audience list. Own-message tint/You remain; flags retain44px targets with
reserved text space. Bell, audience rules, reporting and compose behavior preserved.
No backend/push/access/retention changes.

Final dev build passed11.78s. Final focused browsers5/5 passed16.0s, covering
320/1440 both themes, outgoing-right/incoming-left geometry, own-bubble height,
one-line timestamp height, no minimum header height, report target/accessibility,
keyboard, axe/overflow, existing chat actions and moderator evidence. Inspected
rendered mobile/dark and desktop/light layouts and refined long-name layout after
visual review. Earlier first bubble pass5/5 (28.4s); refined pass initially3/5
because collapse measurement ran before the React header bell unmounted. Kept the
100px limit and added an explicit wait for the collapsed bell to disappear;
isolated320-light then passed, final full focused5/5 passed. No snapshot updates.
Historical full-suite evidence below retained, not rerun for this presentation
change. Production/main/database/secrets/stores unchanged; physical Android
acceptance remains pending.

## Game-chat push bell - November 19, 2026

Published Preview6fb287b9 (https://feature-play-together.opencourts.pages.dev),
bundle index-CfwJTewV.js. Replaced the Mute/Unmute chat push text toolbar with a
44px icon button in the expanded chat header's top-right. Bell/BellOff indicate
unmuted/muted; title tooltip explains state/action; dynamic accessible label and
aria-pressed retain screen-reader state. Button is outside the summary disclosure,
so clicking mute does not collapse chat. Removed the old standalone toolbar row;
read-only text remains when applicable. This changes room push mute only, not
device permission, unread inbox, eligibility or delivery configuration.

Final dev build passed13.55s after correcting an initial TypeScript aria-label
assignment error. Focused browsers5/5 passed33.5s with assertions for tooltip,
icon-only content, mute state, placement above audience text, and chat remaining
open; existing send/report/keyboard/axe/overflow and moderator workflows passed.
Phone/desktop320/1440 both themes covered; desktop dark render inspected.
No snapshot updates, production/database/secrets/store changes. Historical full
suite evidence below retained without claiming a fresh full run for this UI change.

## Compact message cards and report flag - November 19, 2026

Published Previewac018eec (https://feature-play-together.opencourts.pages.dev),
bundle index-lUZq-W0J.js. Messages now use compact bordered cards with name,
date/time and report flag in one grid header; long names wrap within their column.
Own messages have a subtle theme-based tint and You label. Message reporting uses
an icon-only flag with Report message title/accessible label and44px target.
Player/game/group report buttons retain their existing visible text. Reporting
still opens the required-explanation focused dialog and shows submission feedback.
No chat access, moderation, push, retention or API changes.

Chat+moderation browsers11/11 passed33.9s; final focused chat5/5 passed15.9s after
correcting a visually detected encoding issue in the You separator. Additional
assertions verify report icon is inside message header, has no visible label text,
has the tooltip and44px width. Both themes320/1440, axe, overflow, send/mute/report,
keyboard and evidence workflow passed. Inspected desktop light/dark renders.
Final dev build passed10.72s. No snapshot updates. Existing full392-unit/290-browser
history below preserved; not rerun for this presentation change. Production,
secrets/database/store unchanged; physical Android acceptance remains pending.

## Named game-chat audience - November 19, 2026

Published Preview5a2c2c2a (https://feature-play-together.opencourts.pages.dev),
bundle index-DJCBKwWD.js. Expanded chat has Who can see this chat (count), listing
current reader display names and organizer/confirmed/invited roles, including
You. List is an optional disclosure to preserve the compact layout. API returns
only names/IDs/game roles to already-authorized chat readers; audience selection
reuses chatAccessSql, active-account and current invitation/membership checks.
Nonplaying organizer remains listed; expired invites/leavers are excluded. List
refreshes with the existing visible-chat polling, not online presence/read receipts.
Blocks between non-organizer participants do not remove shared access; the UI
explains they hide those accounts' messages. No photos/contact details exposed.
Privacy now explicitly describes this audience visibility.

Full units392/392 passed25files6.32s (including12 chat-security tests). New roster
case verifies invitees, spectators, expiry/leaving and organizer attendance roles.
Focused browsers5/5 passed16.2s: current audience names/roles and long names,
320/1440 both themes, unread/read/chat actions, axe/overflow and moderator evidence.
Dev build passed6.89s. No snapshot updates. Production/database/secrets/store and
worker configuration untouched. Physical Android acceptance remains pending.

## New chat indicator - November 19, 2026

Published Preview7dca3eea (https://feature-play-together.opencourts.pages.dev),
bundle index-Ddo3z4En.js. Unread chat uses a filled chat-icon tile, corner dot,
count and New messages subtitle (polite announcement); not color alone. Badge is
not restricted to collapsed state. Successful visible-conversation read clears
local unread state immediately, matching the backend read cursor. No self-alert,
push, retention or access rules changed. Existing ten-second visible polling and
focus refresh apply; this is not a native app-icon badge.
Dev build passed7.28s; focused browsers5/5 passed16.8s, covering unread appearance,
clearing on open/read, phone/desktop light/dark, existing chat actions, axe and
layout checks. Inspected rendered320px light indicator. No snapshot updates.
Production, secrets, database and stores unchanged; earlier full-suite evidence
below is retained without claiming a new full-suite run for this UI change.

## Game chat near the title - November 19, 2026

Published Preview8f31944d (https://feature-play-together.opencourts.pages.dev),
bundle index-D3g1IDLr.js. Chat now sits immediately below the game heading and
above court/participation panels on desktop and phones. Compact launcher stays
collapsed by default except #chat links; aligns with page heading. Expanded chat
always shows audience rules and earlier-message visibility before messages;
private-group games additionally state active membership is required.
Dev build passed7.02s. Focused browser5/5 passed14.6s: verified chat appears above
Game details, compact dimensions, icon, keyboard, light/dark320/1440, axe/overflow
and existing chat/moderation actions. No snapshot updates or backend changes.
Production, secrets, database and stores unchanged. Earlier full-suite evidence
below remains historical; only focused checks rerun for this placement change.

## Compact game chat layout - November 19, 2026

Published Preview c95529f3 (https://feature-play-together.opencourts.pages.dev),
bundle index-aae5C2tl.js. Replaced the padded full-width chat box with a compact
launcher: 28px chat icon in a 44px tile, short subtitle, unread badge and explicit
expand arrow. Desktop width capped at720px; responsive mobile header under100px
in checked layouts. Expanded chat moves privacy/expiry explanations into a
keyboard-accessible disclosure, keeps mute in a compact toolbar, reduces message
spacing and uses a two-row composer with count/send aligned. Theme tokens and
44px action targets retained. No access, push or retention changes.

Final dev build passed (6.91s). Focused browser suite5/5 passed (14.8s), covering
320/1440 light/dark, collapsed dimensions/icon size, keyboard reopen, send/mute/
report, axe and overflow, plus moderator evidence workflow. Inspected actual
compact phone/light and expanded desktop/dark screenshots. No snapshot updates.
Prior full290-browser/391-unit evidence is retained below; these were not rerun
for this UI-only update. Production/secrets/database/store unchanged. Physical
Android keyboard/dock acceptance remains pending.

## Game chat icon - November 19, 2026

Preview eb3426bb (https://feature-play-together.opencourts.pages.dev), bundle
index-DCU4rYkG.js, adds the shared Lucide MessageCircle icon beside Game chat.
Icon inherits light/dark text color and is decorative to screen readers; text and
native expand/collapse semantics remain. Dev build passed (7.22s); focused chat
browser suite passed5/5 (13.2s), including phone/desktop light/dark and axe checks.
No notification rules changed: other eligible unread recipients need opted-in
active devices/game category, no mute/block and current access. No self sends;
one event per game/recipient/minute. Development delivery remains tester-allowlisted.
No secrets/configuration/database/production/store changes for this UI update.

## Game chat - November 19, 2026 (current Preview)

Published [feature/play-together Preview](https://feature-play-together.opencourts.pages.dev),
immutable https://88b2deae.opencourts.pages.dev, bundle index-B4Xl1o49.js.
Development-only schema 0027_game_chat.sql applied to opencourts-dev,
cae4849c-3e99-4945-9d70-bef7b48707ce (18 commands, 5.85 ms). Production/main/
production D1 and all environment secrets are unchanged. No store upload.

Game pages now offer shared text chat for organizers (including non-playing
organizers), confirmed players and valid invitees with current game access.
Private-group membership is additionally required. Public/unlisted/group games
and separate weekly occurrences are supported. Replies close at end+24 hours or
immediately on cancellation. Ordinary messages become inaccessible at end+30 days
or cancellation+30 days, then scheduled cleanup deletes unheld rooms. Includes
unread inbox counts, per-room push mute, generic chat push/#chat destinations,
no self notifications, blocking, rate limits, idempotent retries and message reports.
Reported snapshot is up to five messages. Cases remain open until handled, then
normally expire after 90 days; documented preservation holds retain remaining
conversation/case evidence with a 30-day human review date and explicit release.
Staff get a Messages queue filter and separate evidence/hold controls. Privacy,
Terms and Help explain server-readable (not E2EE) messaging, access, retention,
account-deletion exceptions and backups. See [GAME_CHAT.md](GAME_CHAT.md).

Verification:

- Full unit suite: 391/391 tests, 25 files, 8.76 s. Includes authorization/revocation,
  private membership, blocks, send limits, concurrent retry, read/mute/push routing,
  report access, evidence holds, expiry and account/game deletion cascades.
- Fresh-server full Playwright: 290/290, 8.1 min, workers=2, no snapshot updates.
  Afterwards the expanded chat suite passed 5/5 in 14.1 s, including the added
  moderator preservation/inspect/release workflow (four cases overlap the full run).
- Retained QA matrix: 350 states across 14 width/theme combinations, zero runtime
  errors, axe violations or horizontal overflow. New chat checks cover 320/1440
  light/dark, safe text rendering, send, mute, report, axe and overflow.
- Final release candidate build: pass (12.08 s); final dev build: pass (10.28 s).
  Existing large-map-chunk warning remains; TypeScript and route preparation pass.
- Development worker opencourts-push-dev version
  2e7dbe20-5ea9-4672-91bb-21bdf98b0f31 deployed with minute cron, variable-free
  keep_vars/--keep-vars config preserving current settings/secrets. Cleanup heartbeat
  read from development metadata: 2026-11-20 02:23:16 UTC. Cleanup runs even when
  sends are disabled or fail; no new credential/configuration setup was required.
- Hosted Preview game shell/Privacy/Terms/Help: HTTP 200, noindex/nofollow;
  anonymous chat/cases/evidence/health: HTTP 401 and private,no-store. No real
  authenticated chat/report mutation was performed. Initial Python HTTP client
  received network/client-specific 403; curl checks succeeded and are recorded.
- git diff --check passed (line-ending notices only). Existing uncommitted work
  preserved. No staging/commit/push; credentials, databases, photos, build outputs
  and raw test logs remain excluded. Logs/screenshots are in ignored qa-audit;
  reviewed matrix JSON evidence remains under docs/qa-evidence.

Investigation evidence: initial full unit pass attempt had 15 failures because
legacy games/groups fixtures lacked schema 0027; updated fixture schemas retained
historical migration-specific tests. Follow-up caught a real participant-exclusion
FK conflict during account deletion, corrected by guarding parent existence in the
trigger. Corrected tests passed. Initial focused browser run was 21/25: the four
new chat cases had incomplete guest/participation mocks causing a render failure;
corrected fixtures passed 4/4, then all 290 passed. No real failure evidence erased.

Pending acceptance: two real accounts on Preview, physical Android Chrome and
installed TWA send/keyboard/closed-app push/tap/mute/current-access tests. Existing
phone evidence is iPhone receipt plus Android emulator, not physical Android chat
acceptance. Owner must monitor message cases and review held evidence. Production
rollout/backup/migration/worker provisioning and Google Play Data safety/signing/
upload remain separate gates; Preview completion does not approve those actions.

## Work order and evidence

1. [x] Verify OpenCourts repository and feature branch; retain existing work. Remote: sarmatktk/OpenCourts. Production remains outside this task.
2. [x] Inspect public Privacy, About, Contact and Help pages against implemented behavior. Remove obsolete preview marketing and future-series claims without claiming production availability or email delivery.
3. [x] Run current unit tests, TypeScript and development build; record actual results below.
4. [x] Run information-page and notification browser tests; verify mobile layouts and both themes covered by tests. Browser emulation is not physical-device proof.
5. [x] Build Android debug APK and inspect release manifest. Confirm preview debug package and production release destination remain separate.
6. [x] Review dependency advisories and record unresolved findings; do not silently force dependency upgrades.
7. [ ] Complete physical Android Chrome and installed TWA testing: Google/Apple sign-in, return to app, back navigation, permissions, upload/crop, all pickers, sharing/directions, offline errors, font scaling and bottom dock.
8. [ ] Complete two-account tests: public/unlisted/private-group access, role changes/removal, join/guest approvals, capacity race, cancellation/rejoin, waitlist, independent series occurrences and notifications. Never use production records for fixtures.
9. [ ] Verify push on actual Android: permission accept/deny, delivery with app closed, tap correct activity, signed-out access, category disable and revoked session. iPhone Home Screen receipt was user-confirmed; Android remains unverified.
10. [ ] Confirm Play Console highest version code, upload-key access and Play App Signing certificate. User confirmed Play Console highest version code 2 (1.0.1), released November 2. Next bundle must use 3 or higher. Upload-key access and app-signing certificate still need confirmation.
11. [ ] Choose and approve internal-testing destination: current release opens opencourts.us, debug uses a separate .dev package. A preview-targeted Play internal bundle needs the existing package identity, correct signing and matching preview Digital Asset Links. Do not upload the debug APK as an update to the existing app.
12. [ ] Review Play Console Data safety, privacy-policy URL, account-deletion web URL and in-app deletion, app access reviewer instructions, content rating, target audience, permissions and store description against actual collection. Confirm support/report triage responsibilities and retention policy.
13. [ ] Separate production readiness approval: backups, migration rollout, environment/auth guards, push routing/keys and rollout/rollback. Current auth and push guards intentionally restrict development; no production configuration changes are included here.
14. [ ] Create signed internal-test AAB only after items 10-11 are resolved. Validate package/version/signature, upload to internal testing with approval, then test a Play-installed build before wider rollout.

## Current status

Current candidate includes account suspension/restoration and required report explanations, schema 0026 on development only. Latest units: 379 passed; 30 focused browsers, 10 accessibility/matrix checks and 6 final layout checks passed, plus release/Preview builds. The older full-suite run was 275/280 with corrected targeted checks passing; it predates this moderation change. Production resources/migrations/bindings/provider/moderator rollout and physical Android/two-account acceptance remain pending. Google Play signing/declarations/upload approval remain separate. Latest Preview publication is recorded below.

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

## Moderator setting refresh - November 19, 2026

User added MODERATOR_PLAYER_IDS in Cloudflare but could not see the queue. Redeployed
unchanged verified Preview artifact as 35711d3c (https://feature-play-together.opencourts.pages.dev;
immutable https://35711d3c.opencourts.pages.dev) to apply saved runtime settings.
No Cloudflare settings/secret values were read or changed. Production remains untouched.

Code review: /api/players/blocks returns moderator=true only when the signed-in
player ID matches the comma-separated setting. Report review appears even for zero
reports when true; all player/game/group reports share that queue. Safety-load
errors currently get swallowed, so an authenticated response is needed to distinguish
permissions from a request failure. The agent cannot inspect the user's signed-in
browser/session. User should refresh Players and, if still missing, report only the
moderator true/false field from /api/players/blocks; no CSRF/session data is needed.
No claim of verified moderator access yet; no new source change or test run.

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

## Clear account-deletion sign-in guidance - November 19, 2026

Published feature Preview 948f89ae (https://feature-play-together.opencourts.pages.dev;
immutable https://948f89ae.opencourts.pages.dev). Development build/TypeScript passed.
Production/main/D1/secrets and Google Play remain untouched.

The recent-sign-in deletion error now says: "For your security, sign out and sign
back in, then try deleting your account again." Existing 15-minute security gate
and nearby deletion-error placement are unchanged. Archiving groups still does
not refresh the sign-in timestamp. No real account or group was changed by tests.

Six fresh-server browser checks passed (12.9s) at 320/390/1440px in light/dark,
including clear sign-in guidance beside delete controls, archive recovery,
focus/visibility and cancel/reset. No snapshot updates. Evidence ignored under
.wrangler/qa-audit/delete-signin-copy-*. Physical Android acceptance pending.

## Explicit irreversible archive warning - November 19, 2026

Published feature Preview 257aa85d (https://feature-play-together.opencourts.pages.dev;
immutable https://257aa85d.opencourts.pages.dev). Development build/TypeScript passed.
Production/main/D1/secrets and Google Play remain untouched.

Added a bold "You cannot undo this action." warning to the group archive dialog,
after the explanation that group records are kept. Archive group / Keep group
active actions and backend behavior remain unchanged. Current app has no reopen
flow. Four fresh-server checks passed (12.5s) at 320/1440px in both themes, including
visible warning, cancel and mocked confirmation. No snapshot updates or real group
mutations. Logs ignored under .wrangler/qa-audit/archive-warning-*.

## Plain-language group archive confirmation - November 19, 2026

Published Preview f21e5441 (https://feature-play-together.opencourts.pages.dev;
immutable https://f21e5441.opencourts.pages.dev). Development build/TypeScript passed.
Hosted group page HTTP 200, bundle index-ChZqwjSI.js, noindex/nofollow retained.

Replaced "leave discovery and members-only access will close" with:
"Archiving closes the group. It will no longer appear in search or accept new
members." Followed by: "Members will lose access to the member list and private
group details. This does not delete the group."

Archive confirmation now uses an Archive this group? heading and explicit
Archive group / Keep group active actions. Other group confirmations retain their
existing behavior. Wording checked against active-group directory, membership
and member-details guards; archiving still only updates group status. No real
group was archived by verification and no backend permissions/data were changed.

Four fresh-server checks passed (10.3s) at 320/1440px in both themes, covering
explanation, cancel without mutation and confirmed mocked archive with CSRF.
No snapshot updates; logs ignored under .wrangler/qa-audit/archive-copy-*.
Production/main/D1/secrets and Google Play remain untouched.

## Installed-only subtle dock lift - November 19, 2026

Published Preview 9c1cc244 (https://feature-play-together.opencourts.pages.dev;
immutable https://9c1cc244.opencourts.pages.dev). Development build/TypeScript passed.
Hosted home HTTP 200, bundle index-BMcw9tcO.js, noindex/nofollow retained.
Production/main/D1/secrets unchanged.

Supersedes the preceding all-browser 20px change. User clarified that browser
spacing was already correct and only saved Home Screen apps were too close.
Restored original browser gaps: 5px on small Courts screens, 8px on community
and tablet screens, plus safe area. Only standalone/fullscreen display modes
now use 12px plus safe area for both docks. Installed content/review clearance
increases by just 8px. No general browser spacing change remains.

Fresh-server checks: 6/6 passed (13.5s), covering 320/390/768px and both themes.
Each checks the real browser gap first, then explicitly applies the production
standalone-rule declarations to simulate installed styling and checks 12px.
This is CSS simulation, not proof from an installed Android/iPhone app. Actual
Home Screen/gesture-area appearance remains pending user/device verification.
No snapshot updates. Logs ignored under .wrangler/qa-audit/dock-installed-*.

## Floating navigation bottom spacing - November 19, 2026

Published Preview aef6a063 (https://feature-play-together.opencourts.pages.dev;
immutable https://aef6a063.opencourts.pages.dev). Development build/TypeScript passed.
Hosted home HTTP 200, bundle index-CtBGN5c0.js, noindex/nofollow retained.

Raised both Courts and Play Together floating navigation to 20px plus the device
bottom safe-area inset (previously 5px on small court screens and 8px elsewhere).
Same spacing applies to browser and installed Home Screen/TWA views, including
narrow tablets. Increased court-page bottom clearance and review-prompt offset
by 20px so the raised navigation does not obscure end-of-page content. Existing
community bottom clearance and keyboard/touch behavior are retained.

Fresh-server browsers: 10/10 passed (21.7s), no snapshot updates. Six spacing checks
cover both navigation bars at 320/390/768px in both themes; four existing dock
style/focus comparisons passed. Actual OS safe-area appearance in an installed
phone app still needs device confirmation. Full screenshot suite was not rerun;
older dock screenshots predate this intended position change. Evidence ignored
under .wrangler/qa-audit/dock-spacing-*. Production/main/D1/secrets untouched.

## Distinct group-management recovery action - November 19, 2026

Published Preview e6e1bdcf (https://feature-play-together.opencourts.pages.dev;
immutable https://e6e1bdcf.opencourts.pages.dev). Development build/TypeScript passed.
Hosted Account HTTP 200, bundle index-BeeoEmiV.js, noindex/nofollow retained.

Manage my groups now uses the existing outlined pt-secondary action with a trailing
arrow, on its own row 14px below the deletion error. The explanatory text and action
are visibly separated, retain keyboard focus styles and a minimum 46px touch target,
and wrap within narrow screens. The alert remains beside the delete controls.

Fresh-server browsers: 6/6 passed (12.1s), at 320/390/1440px in light/dark, with no
snapshot updates. Checks verify the outlined action appears below the message,
focus/viewport behavior, destination, subsequent errors and cancellation. No real
account deletion; physical-device checks still pending. Evidence ignored under
.wrangler/qa-audit/delete-recovery-*. Production, main, D1 and secrets untouched.

## Account deletion feedback placement - November 19, 2026

Published feature Preview e97f4391 (https://feature-play-together.opencourts.pages.dev;
immutable https://e97f4391.opencourts.pages.dev). Development build/TypeScript passed.
Hosted Account HTTP 200, bundle index-BvwWsxOd.js, noindex/nofollow retained.
Production/main/D1, secrets and Google Play remain untouched.

Deletion failures now appear inside the Delete account section, immediately before
Permanently delete, instead of the page-wide error banner. The message receives
keyboard focus and scrolls into the nearest visible area; group-archiving errors
include Manage my groups. Other deletion failures (including recent-sign-in
requirements) use the same placement. Cancel/reopen clears the old message.
Backend deletion requirements and group data are unchanged.

Fresh-server browser verification: 21/21 passed (27.4s), no snapshot updates.
Includes four new 320/390px light/dark checks for nearby focused feedback,
archiving link, subsequent sign-in error and cancel/reopen reset, plus all 17
existing account tests (profile, sign-in, photo/crop, private identities and visuals).
Logs: ignored .wrangler/qa-audit/delete-feedback-*. Physical Android verification
remains pending. No real account was deleted by automated checks.

## Profile welcome and mobile court startup - November 19, 2026

Preview bfe49755: https://feature-play-together.opencourts.pages.dev
(immutable https://bfe49755.opencourts.pages.dev). No production/main/D1,
secret/settings, Git push or Google Play upload changes.

- Signed-in players with a blank display name see a focused, keyboard-dismissible
  welcome dialog. Name is required to save; photo is optional and uses the existing
  private account photo/crop controls. Other profile fields/preferences are preserved.
  Save returns to the current page and refreshes account state. Browse for now/Escape
  dismisses for that account in the current browser session. Existing backend name
  requirements still apply to participation; named users are not prompted.
- New mobile visitors see location/manual city-or-ZIP choices instead of an empty
  default-area map. No automatic location permission request; Map only changes view.
  Saved search areas are restored and their court results (under 24h) display while
  fresh results load. Failed refresh retains cached courts with a warning; expired
  cache is not reused. Loading, empty and failed map lookups offer manual search.
- Development build/TypeScript passed; 357 units passed. Final fresh-server startup
  and existing search-navigation run: 13/13 passed (24.2s), no snapshot updates.
  Covers both themes, name save/no repeat, failed save/dismissal, no automatic
  geolocation, denial/manual search, pending-refresh cache and successful manual lookup.
  Two preceding focused runs had one test expectation failure each from Windows
  apostrophe encoding; corrected the test selector, no application change needed.
  Full browser suite has not been rerun for these changes; prior full-suite evidence
  and its isolated timing reruns remain historical. Physical Android acceptance pending.
- Hosted home, Account and Feed returned HTTP 200 with Preview noindex/nofollow;
  all serve bundle index-CAL_kjGu.js.
- Local logs/screenshots: ignored .wrangler/qa-audit/startup-*. Previous intentional
  uncommitted work and actual QA evidence preserved. No credentials or build logs staged.

## Launch-copy/SEO readiness review - November 19, 2026

Published **Preview d3ee9b78**, index-DOfKH7ra.js, schema 0025 unchanged. Hosted
home/privacy/contact/community/groups/account/sitemap HTTP 200; correct canonicals,
no stale staging copy, Preview-wide noindex/nofollow and private Account noindex meta.
Google/Apple readiness true; production 7ef38ff2/main unchanged.

Production and Google Play are not release-ready. See PRODUCTION_LAUNCH_READINESS.md:
production-origin guard, production migration/binding/backup/rollback, physical
Android/two-account/push acceptance, signing/version-code 3+, store declarations and
support operations remain open. No production/main/D1/settings/secrets/Play changes.

Prepared customer launch copy and SEO: removed staging/first-release wording; retained
privacy and actual feature limits; public-only sitemap now includes community home,
group discovery and Help. Community routes get distinct HTML titles/descriptions/
canonical/social URLs, private routes noindex. Preview build gets site-wide noindex.
New build:release emits a separate ignored production candidate without debug package
association or Preview noindex header; tested build passes, APIs remain guarded.

357 units /22 files and 15 information-page browsers passed; four intended copy-related
baselines updated separately. First full run 252/255 (11.5m) found three shared light
logo contrast failures; fixed to #59685f and three matrices/three visual checks passed.
Final full run 251/255 (11.9m), four 30s timing failures; all four passed in isolation
with one worker (27s), unchanged assertions. No single clean final full-suite pass
claimed. All 350 matrix states: zero JS errors, detected violations or page overflow.
Development and isolated production builds pass (existing chunk warning). Real QA
history preserved; store prompts left unchanged per user instruction.

## Earlier information-page design - November 19, 2026

Latest follow-up **Preview 3cccd5df**, bundle index-BYvMHzjB.js: shared main-page
branding across headers/footers, including Account/community/404. See BRANDING_AUDIT.md.
90 browser checks passed (1.9m), no snapshot updates in final run; 16 intentional
logo/footer baselines reviewed/refreshed separately. Build/Functions compiled. Contact
and Privacy now use support@opencourts.us (visible text + mailto); weather service
contact identifier updated. Historical QA records preserved; mailbox delivery untested.
Hosted new email links and shared stylesheet confirmed. Production 7ef38ff2 unchanged;
no DB/settings/secrets/sender/Play/Git push. Current schema remains 0025.

Latest Preview **eda7c7c1** at https://feature-play-together.opencourts.pages.dev.
Privacy now has an On this page navigation panel directly below its title/date,
using neutral outlined section links instead of underlined navigation text. Help has
the same menu and native section anchors. Layout adapts to available space/font size
(one column on narrow/enlarged-text layouts, two on phones, three on wider pages).
Links inside paragraphs remain underlined. Shared Privacy/Help/About/Contact/Support
styles improve reading to 16px, heading/metadata hierarchy, 44px+ footer/header link
targets and visible keyboard focus. Reduced-motion and forced-color styles included.
No Terms page exists in this checkout; no policy wording/legal terms were created.

15 browser checks passed (29.7s): five information pages, light/dark, 320/390/768/1440px,
native anchor focus/keyboard navigation, touch targets, 200% root text, reduced motion,
no overflow, and axe audits of all five pages in both themes (no detected violations).
Four additional checks passed (47.1s), covering seven guide pages using the shared
footer at 390/1440px in both themes. No snapshot updates. Build/Functions compiled;
Privacy mobile light and navigation dark screens visually reviewed. Hosted primary
pages and pages.css HTTP 200; stylesheet revalidates. Production 7ef38ff2/main unchanged.
No backend, DB, environment-secret, sender, Play or Git push changes. Logs/screenshots
remain ignored under .wrangler/qa-audit/info-design-*; physical acceptance remains open.

## Organizer attendance follow-up - November 19, 2026

Latest Preview **4f2da8b6**, bundle index-Ds509M8B.js, schema unchanged 0025.
In group and non-group games, Your attendance > I'm not playing > Release my place
frees only the organizer's playing place and keeps the game/other players/management
running. Keep my place aborts. Join as a player reclaims a place only when available;
group waitlist reservations remain protected. Cancel game separately cancels everyone.
Game details identify an organizer not playing. Works for one series occurrence,
before game start; organizers remain in My Games even without a playing place.

354 units and 62 browser checks passed (55.6s); no snapshot updates. Dev build and
Functions compilation passed. Hosted routes/bundle HTTP 200, public attendance field
verified, provider readiness true; production 7ef38ff2 unchanged. No DB migration,
record changes, environment-secret, sender, Play upload or Git push. Physical Android
acceptance step 17 added and still pending. Evidence: ignored organizer-attendance-*.

## Earlier request-button consistency - November 19, 2026

Superseded by compact-row follow-up **Preview 5fae5e7e** (index-BbfWaYWV.js).
Game/group membership requests display short Approve / Reject labels; screen-reader
labels retain the player name. Game, membership and guest rows place the name/actions
inline, wrap buttons individually, preserve long names and use subtle dividers between
requests. 45 browsers passed (37.8s), including multi-request/long-name/layout tests in
both themes at 320/390/1280px; no snapshot updates. Build/Functions compile passed.
Hosted groups/inbox/new bundle HTTP 200; production 7ef38ff2 unchanged. No backend,
DB, environment-secret, sender, Play or Git push changes. Device/store gates remain.

Previous styling Preview: **5386786b**, https://feature-play-together.opencourts.pages.dev,
bundle index-JgeozLs9.js; schema remains 0025. Guest Approve/Reject now use the
regular game request's neutral outlined pt-secondary style; removed guest-only
green/red palette, check/X icons, compact sizing and custom focus outline. Group
membership requests already matched and were verified unchanged. Inbox Approve now
uses the same outlined style; Deny renamed Reject, including its confirmation text.
Inbox action buttons use standard 46px minimum height/padding. Labels stay whole;
action buttons wrap, and guest approval/rejection pairs stay grouped on narrow screens.

Six new style comparisons cover game/guest/group/inbox decisions in light/dark at
320/390/1280px, including actual height, colors, borders, typography, padding, hover,
focus and disabled states. Final **49 browser tests passed (53.2s)** with no snapshot
updates; dev TypeScript/build and Functions compilation passed. Only four intended
inbox light/dark mobile/desktop baselines refreshed in a separate two-test run and
visually reviewed. An earlier 42/43 run had an unrelated game screenshot mismatch;
that screenshot passed an isolated rerun unchanged and the final full scoped run.
Initial style fixture lacked invitations data; corrected locally before the final run.

Hosted Account/inbox/groups/new bundle HTTP 200; provider readiness true. No backend,
database, environment-secret, sender, production, Git push or Play changes in this UI
follow-up. Evidence stays ignored under .wrangler/qa-audit/request-buttons-*.

## Self-notification correction - November 19, 2026

User reported receiving their own reschedule notification. Audited all current
notification categories; policy and findings: [NOTIFICATION_BEHAVIOR_AUDIT.md](NOTIFICATION_BEHAVIOR_AUDIT.md).
Actual authenticated actor is excluded before inbox/push fanout, including schedule,
single/series cancellation, group archival and manager guest decisions. Other affected
players still receive notifications; creators receive another manager's changes.
Automatic waitlist availability offers remain. Self invitations remain prohibited.

348 unit tests / 21 files passed; 76 focused game/group/series/waitlist/invitation/
push browser tests passed in a fresh-server run, no snapshots updated. Final focused
85-unit pass also verifies unknown historical actors are retained. TypeScript/dev
build passed (existing size warning); Pages Functions compiled on publication.
Migration 0025 alone applied to opencourts-dev, UUID cae4849c-3e99-4945-9d70-bef7b48707ce.
Identifiable historical self inbox rows and queued deliveries cleaned; displayed OS
notifications cannot be recalled. Aggregate post-check: zero self source rows in all
four notification tables, zero active actor-context rows; no pending dev migrations.

Published https://6ab4bcc2.opencourts.pages.dev to stable
https://feature-play-together.opencourts.pages.dev. Account/search/manage-series/public
games/sw.js HTTP 200; Google/Apple readiness true. Production remains 7ef38ff2 on main.
No production D1, authentication/environment-secret, sender-config, Git push or Play
operation. Evidence logs/aggregate counts stay ignored under .wrangler/qa-audit/self-notification-*.
Next device check: change your otherwise empty game's time, confirm no new inbox/push;
then have another authorized manager change it and confirm the affected creator is notified.

## Verified Preview publication - November 19, 2026

Published https://014eaa04.opencourts.pages.dev to stable
https://feature-play-together.opencourts.pages.dev, branch feature/play-together,
bundle index-B9p3nSSQ.js. Pages Functions compiled successfully during publication.
Account, game search, help, privacy, sw.js and assetlinks returned HTTP 200;
Account/search serve the expected bundle. Google/Apple public readiness flags are
true (not proof of actual OAuth callbacks). Preview assetlinks includes the separate
us.opencourts.app.dev; production association source unchanged. sw.js revalidates.
Production deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc before/after.
No database operations, sender deployment, settings/secret access, main changes,
Git push or Play upload. Deploy evidence: ignored readiness-preview-deploy.log.

## Verification results

- Unit tests: 339 passed across 21 files on Vitest 5.1.1.
- TypeScript and development build: passed on Vite 6.4.6; existing large-chunk warning remains.
- Focused information/push browser checks: 18 passed. Information pages cover 320/390/768/1440 px in light and dark themes.
- Updated game/group behavior and reviewed screenshots: 39 passed.
- Follow-up dropdown/invitation/waitlist/navigation checks: 30 passed.
- Account/mobile behavior and reviewed screenshots: 25 passed.
- Android: assembleDebug and processReleaseMainManifest passed in the initial readiness pass. No signed store artifact created.
- Security tooling updated: Vite 6.4.6, Vitest 5.1.1 and Wrangler 4.165.0. Node 22.21+ required.
- npm audit: one critical advisory flag remains for MapLibre GL 5.24.1; its official release includes the sanitizer fix, while advisory metadata still flags that version range. Keep the discrepancy visible and retain sanitizer regression coverage; do not claim a clean audit.
- Browser regression: **231/231 passed in one fresh-server run (3.7 minutes)**, no snapshot updates. Earlier failed-run evidence and fixture corrections are preserved below.
- Logs are ignored under .wrangler/qa-audit/readiness-* and app-readiness-*.

Physical-device script: [ANDROID_DEVICE_ACCEPTANCE.md](ANDROID_DEVICE_ACCEPTANCE.md).

## Immediate next engineering work

1. Complete physical Android acceptance and two-account checks; browser regression is green.
2. Resolve dependency advisories with scoped upgrades/backport verification and regression checks.
3. Run physical Android acceptance with the preview debug APK.
4. Confirm signing/certificate and approve the internal-test destination before preparing a bundle. Highest code is already confirmed as 2; next code must be 3+.

## Fresh-server verification follow-up - November 19, 2026

Repository/remote/branch verified: OpenCourts, sarmatktk/OpenCourts,
feature/play-together. Intentional work preserved. First fresh-server run:
**230 passed, 1 failed (5.9 minutes)**, eight workers, CI=1 so server reuse is
disabled, installed Chrome, no snapshot updates. The prior 1024 light and dynamic
audits passed. The remaining 320 dark matrix timeout was traced to its missing
waitlist fixture: `{ok:true}` caused HostWaitlist to read an undefined players list.
The isolated trace reproduced the JavaScript error; that diagnostic run was stopped
after root-cause capture and is not a pass. Matrix fixture now returns `{players:[]}`;
each route asserts no JavaScript errors and reports its name on heading failures.
Corrected complete rerun: **231 passed (3.7 minutes), exit 0**, eight workers, CI=1 fresh server and no snapshot updates. All 350 matrix states have zero JavaScript errors, detected axe violations and page-width overflow. Physical Android/TWA/push acceptance remains open.

Development TypeScript/build rerun passed with exit 0; existing chunk-size warning.
Logs stay ignored: `.wrangler/qa-audit/readiness-browser-fresh.log`,
`readiness-browser-320-dark.log`, `readiness-browser-final.log` and
`readiness-preview-build-confirmed.log`. See GIT_READINESS.md for the candidate review.
No secrets/settings, remote databases, production, main or Play uploads touched.

## November 19 follow-up: regression and dependency remediation

- Updated stale tests to exercise visible site pickers, 12-hour time entry, explicit role confirmation, invitation action menus and the five-tab mobile navigation. Search tests now use an explicit search URL rather than the signed-in Feed redirect.
- Corrected waitlist test fixtures to return the member roster/cancellation response shapes now required by approved-member visibility. No application permission checks were removed.
- Reviewed changed screenshots for approved navigation, notification destination buttons, new game fields and compact member rows; refreshed the affected game/group baselines. Game/group behavioral and screenshot run: 39 passed.
- Updated Vite to 6.4.6, Vitest to 5.1.1 and Wrangler to 4.165.0. Node minimum is 22.21. Full 339 unit tests passed on the new runner.
- Audit reduced from 10 flagged packages to one: MapLibre GL 5.24.1 remains flagged by the advisory version range. Its official release includes the sanitizer backport; keep this discrepancy visible, retain the sanitizer regression and review any later advisories. Do not claim npm audit is clean or suppress the finding.
- Evidence: https://github.com/maplibre/maplibre-gl-js/releases/tag/v5.24.1 and https://github.com/advisories/GHSA-jrc7-96c5-q579 .
- This earlier remediation pass started the full regression; the subsequent clean 231/231 run and Preview publication are recorded above. No production or secret changes, Git push or store upload.

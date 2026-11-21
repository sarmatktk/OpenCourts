## Player location pin - November 21, 2026

Added the existing MapPin icon before player location metadata, with compact spacing and theme-inherited color. Decorative icon is hidden from screen readers. Production build passed after rerunning outside the sandbox to allow esbuild; initial sandbox build could not start its process. No backend, database or secret changes.

## Compact Players listing and safety menu - November 21, 2026

Player rows now put Invite to game beside the photo/name where space permits. Block player joins Report player in the existing three-dot menu. Location and bio align beneath the name; long names and very narrow screens move Invite below rather than squeezing the name. The invitation picker opens across the full row below the details. Its disclosure uses an accessible button with expanded state and keyboard support; invitation authorization/limits and block/report APIs are unchanged.

Verification: 12 initial functional browser checks passed (photos, invitations, empty picker/server errors, block/report, refresh), eight refined layout/keyboard checks passed, and six final name/meta alignment checks passed at 320/390/1440 px in both themes. Final production build passed. Visual review found an older margin rule overriding metadata alignment; corrected and reran the affected checks. No snapshot updates. Published Git fb5d9e0 as production fdd41444-af67-49c5-aa4c-9337debb6c44. Six hosted checks passed (320/390/1440 px, light/dark), covering alignment/wrapping, photos, menu contents, full-width picker, collapse/reopen and synthetic invitation submission. Live assets with browser-local synthetic API data; no real invitations, blocks or reports sent. Evidence: qa-evidence/player-row-production.json. No database, Worker or secret changes. Android/store assets preserved.

## Discussion count badge spacing and growth - November 21, 2026

Added an explicit 8 px label-to-count gap in the Discussions tab. The pill has automatic width, horizontal padding, no shrinking and no wrapping; counts use readable separators (1,000) rather than a fixed-width bubble or truncation.

Production build passed. A fresh local server/browser check verified counts 1, 1,000 and 1,000,000 at 320/390/1440 px in light/dark: all 18 combinations passed, with measured label gap, increasing badge width, no clipped digits and no horizontal page overflow. Synthetic browser-local group data only; no snapshots updated or database changes. Published Git c7b4226 as production c14a50d0-5687-431f-bfcb-6ec1612d6849. All 18 equivalent hosted checks passed against live production assets. Evidence: qa-evidence/discussion-count-badge-local.json and discussion-count-badge-production.json. No database, Worker or secret changes.

## Photo sharing requires a saved photo - November 21, 2026

The sharing checkbox no longer reports success when no photo exists. It stays off and provides Upload photo guidance; a selected but unsaved image prompts Save first. After a successful upload the user may enable the same single sharing option. The API reports saved-photo presence and rejects enabling without a saved asset, including a concurrent-removal check in the write. Removing a photo clears sharing atomically. First upload resets a legacy empty-photo opt-in to private; replacement preserves an existing valid sharing choice. No new setting or schema.

Verification: 68 backend/media tests passed. Four phone/desktop light/dark upload-share-remove browser flows passed, the existing single-choice browser check passed, and a concurrent-removal browser check passed. Final production build passed. Initial test failures were incomplete fixture account fields and a pre-sharing schema in the new regression; fixtures corrected, schema fallback retained and affected checks rerun successfully. No snapshots updated. Privacy/help explain upload-first/removal behavior. Published Git 496fb31 as production 0402d9b0-9091-458d-b248-582e969d7998. All five actual API scenarios passed with a temporary synthetic account (missing photo, legacy empty opt-in, enabling after save, replacement, removal), and four hosted UI flows passed at 390/1440 px in light/dark using synthetic browser-local API data. Test account, photo and preference rows removed; no real-user photos/preferences changed. Evidence: qa-evidence/photo-sharing-required-production-api.json and photo-sharing-required-production-browser.json. Android/store work preserved.

## Discussion updates live in production - November 21, 2026

Owner-authorized release c713ec8 is live at opencourts.us, production deployment 1825fb76-4fc4-4e3c-910b-75098187c8e7. Discussions now has one viewer-visible count in its tab, compact layout, staff role labels on posts/replies, and existing three-dot reporting for other authors (own content has Edit/Delete). New staff posts alert other active members through the existing Groups/device push preferences. No additional notification setting. The unified photo-sharing choice for Players/games/groups remains live.

Fresh approved backup was restored and checked; additive migration 0033 passed its dry run and is applied. Sender Worker f7e408f6-e40e-4ae7-9758-fd1ea0fbbf0e is deployed with --keep-vars; secret names/types are unchanged, no secret values read/changed. After fixture cleanup: ledger 33, courts 201799, staging 100750, players 6, groups 1, photos 2, posts 1, shared-photo choices 2, foreign-key errors 0. Existing records and choices preserved; historical posts did not generate new alerts.

Acceptance: final merged production build passed; earlier full unit suite 465 checks plus final merged focused group/schema suite 23 checks passed. Live API verified seven scenarios: staff role/broadcast authority, idempotency and self/outsider exclusion, ordinary posts/count, announcement deep links/read state, reporting/self-report denial, block/removal safeguards, and absence of real-user push from QA. Six hosted browser checks passed (320/390/1440 px, light/dark) with synthetic API fixtures; real backend verified separately. All 30 public routes and six assets passed. The generated hosted helper first had an extraction-boundary syntax error; corrected before its successful run, with no production source change. No snapshots updated.

All temporary QA accounts, group, posts, announcements and reports were removed; no real-user notifications sent. The new staff-post notification's physical-device receipt/tap has not been separately retested; existing owner-confirmed phone push evidence remains unchanged. Android artifacts/store assets preserved; no Google Play upload. Detailed evidence: qa-evidence/discussion-staff-production-status.json and the corresponding backup/migration/Worker/smoke/browser JSON records.

## Discussion production rollout authorized and in progress - November 21, 2026

Owner instructed production rollout after the explicit backup/migration request. Fresh production backup was exported into the disclosed Git-ignored workspace folder, restored with integrity/foreign-key checks, and migration 0033 dry-run preserved all existing table counts with no historical announcements. Initial export failed on network transport without creating a backup; retry succeeded. Evidence: qa-evidence/discussion-staff-production-backup.json.

Production push Worker f7e408f6-e40e-4ae7-9758-fd1ea0fbbf0e deployed before migration with --keep-vars; secret names/types are unchanged and no secret values were read. Migration 0033 is now applied: ledger 33, courts 201799, staging 100750, players 6, groups 1, photos 2, posts 1, comments 0, shared-photo choices 2, foreign-key errors 0. Existing records/choices were preserved. Pages publication and live acceptance next. Final merged production build passed. Android/store assets remain outside this release.

## One photo-sharing option includes Players search - November 21, 2026

Owner explicitly requested that the existing sharing option cover Players search as well as games/groups, without another opt-in. The existing shared flag now permits an active signed-in viewer to read an active discoverable player's shared photo, subject to bilateral blocking checks. Non-discoverable players keep the existing shared game/group boundaries. Sharing off remains private, signed-out reads remain denied, and private/no-store responses remain enforced. No preference values, database schema or notification settings changed. Account wording, privacy and help now describe this single choice. Player avatars refresh on window focus so sharing changes do not leave a stale fallback or revoked photo visible after returning.

Verification: 15 backend tests passed, seven browser checks passed (avatar layouts in both themes plus the single Account photo-sharing control), one additional sharing-change refresh browser check passed, and the final production build passed. No snapshots updated. Prepared on an isolated hotfix branch from current production: pending discussion/staff notification commit f5d3f81 and migration 0033 are not included and remain unapproved. Published Git 8d4207c as production 6637e19c-ce63-4617-9ddf-10fb566a0569. Four hosted single-choice checks and six hosted player-layout checks passed against live production assets with synthetic browser-local API fixtures. Evidence: qa-evidence/photo-search-single-choice-production.json. Physical-device search confirmation remains owner verification.
## Discussion presentation and staff announcements prepared - November 21, 2026

Prepared locally; not published. The Discussions tab shows the viewer-visible post count (including while on Group details), updates after post changes and replaces the duplicate feed heading. The compact toolbar retains the member-only reminder and New discussion. Posts and replies label current Owner, Co-owner and Organizer roles; ordinary members have no role badge. Three-dot reporting remains available on other people's posts/comments. Own content intentionally offers Edit/Delete rather than self-reporting.

New staff posts create one durable in-site announcement per other active member, with existing Groups/device push preferences and delivery-time checks for membership, blocks, author status, read state and post existence. No new notification setting. Ordinary member posts do not broadcast; existing reply subscriptions remain unchanged. Existing posts are not backfilled. Announcement records retain 30 days, pending push events 24 hours. Privacy/help copy updated.

Verification: full unit suite 465/465 passed; targeted discussion suite then 19/19 passed including the additional existing-preference test. All eight discussion browser tests passed after fixing the missing comment role header, plus six moderation checks passed in the earlier combined run. The earlier combined run was 11/14, with three role-header failures before correction; no snapshot updates. The final owner creation/edit/delete check also passed with explicit owner-badge, tab-count and no-self-report assertions. Production build passed. New regression covers 0032-to-0033 preservation with no historical announcement backfill.

Release requires additive migration 0033_discussion_announcements.sql (new announcement table/index/two triggers), updated Pages and push sender Worker. Automatic approval review rejected a proposed fresh production database export because explicit approval was missing for this new rollout's user-data payload and local backup destination. No export or production mutation ran. Required destination: the Git-ignored .wrangler/release-backups/production-pre-discussion-staff-<UTC>.sql inside this workspace; restore/integrity verification and local migration dry run before applying. Await explicit owner approval for backup export, migration and production Pages/Worker rollout. Existing Android/store asset changes remain untouched.


## Players result avatars - November 21, 2026

Players search used a generic person icon and never rendered uploaded avatars. It now uses the existing PlayerAvatar component beside the name, with a compact 40 px circle and initials fallback. The existing private media endpoint continues deciding who may view each photo. No photo permissions, opt-in values or database schema are changed. A discoverable profile does not by itself make an existing games/groups-only shared photo visible to strangers; a separate player-search opt-in is proposed and awaiting owner preference.

Six fresh browser checks passed at 320/390/1440 px in light/dark: authorized image loads, denied photo falls back to initials, name alignment and long-name wrapping, player actions, no horizontal overflow, and accessibility checks. No snapshot updates. Production build passed. Published Git 75000e0 as production 0274d4fa-34b5-4879-8488-d13726e606b2. All six hosted checks passed against live production assets with synthetic browser-local API fixtures. The hosted helper initially retained TypeScript annotations in a CommonJS file; transpiling that helper corrected the runner error, with no application change. Evidence: qa-evidence/player-photos-production-browser.json. Existing media access rules remain unchanged.

## iPhone photo save confirmed; touch action-state fix - November 21, 2026

Owner confirmed the metadata fix saved their photo on iPhone. This closes the reported save failure. They then reported Remove photo looking pressed/highlighted while using upload controls. Photo action containers/buttons now have distinct identities across editing/saved modes, and photo controls suppress native touch tap highlighting/sticky touch-only hover without removing keyboard focus-visible outlines.

Fresh browser verification: six existing upload/crop/retry checks passed, plus two touch-transition checks passed in light/dark. Touch checks cover opening the picker, uploading, old action-node removal, neutral/unfocused Remove photo after upload, no DELETE requests, and visible focus after switching to keyboard input. The first touch run failed only because its focus assertion used programmatic focus in touch modality; corrected to keyboard modality and both passed. No snapshots updated. Production build passed. Published Git 4223807 as production fd19abe5-d632-4838-830c-f8e39b8c0489. Hosted checks passed at 390 px (touch emulated) and 1440 px: Remove remains neutral/unfocused after saving. The first hosted probe could not find Remove because its image GET fixture incorrectly returned 404 after saving; corrected the synthetic saved-image response and both checks passed. Owner clarified this is a lingering green hover appearance after Photo saved, not an actual deletion. Physical iPhone verification of the highlight fix remains pending. Evidence: qa-evidence/photo-touch-production-browser.json. No database, Worker or secret changes.

## Confirmed iPhone photo rejection and metadata fix - November 21, 2026

The owner-triggered failing upload was captured on production 110d9988: outcome ok, HTTP 502, stage validate-output, code output-metadata. This identifies the output validator rejection, rather than a file-size warning, session failure or unhandled runtime crash. The original metadata:none image transformation did not guarantee metadata-free output for this phone upload. Earlier client upload hardening did not fix this server rejection.

The API now parses the bounded processed WebP, retains only static image/alpha chunks, removes EXIF/XMP/ICC and other ancillary chunks, updates RIFF length and VP8X metadata flags, then applies the existing dimension/metadata validator before R2 storage. Animation flags/frames, malformed containers/chunks and duplicate image bitstreams are rejected. No original metadata is stored. No schema, secret, signing or destination changes.

Verification: 56 focused tests passed (media/group authorization and handler storage, WebP sanitizer and client request handling); production build passed. Regression confirms processor metadata is removed before storage, image/alpha bytes stay unchanged, dimensions remain enforced and animations/malformed data remain rejected. The old group WebP mock was header-only; it now includes a static image chunk for the stricter validation. Synthetic real-processor pre-fix tests passed (including a standard system ICC profile), but did not reproduce the owner's metadata variant. Published as production deployment 52583e8b-c84e-4248-a746-07f9fde5d9b5 / Git 17931b1. All five real production synthetic uploads (sRGB/P3, transparency and standard ICC-tagged PNG) returned 200, and downloaded stored output had no EXIF/XMP/ICC/animation chunks. Temporary QA account/photo removed. Evidence: qa-evidence/photo-metadata-production.json. Owner iPhone confirmation remains pending.

## Mobile photo upload remains unresolved - November 21, 2026

Owner confirmed all attempted photos still fail on iPhone after deployment cee3d0ea. Do not treat prior mocked/browser tests as confirmation of a real-device fix. Read-only Cloudflare aggregate analytics for the preceding three hours showed 20 MobileSafari PUTs and one ChromeMobile PUT with edge/origin HTTP 502, versus one Chrome PUT with HTTP 200. These aggregate counts cannot individually identify the owner requests. Invalid-ID, unauthenticated 800000-byte requests with iPhone and desktop user-agent headers both returned 401, so browser-header or size-only rejection was not reproduced.

A temporary sanitized Pages runtime tail was validated with a 401 probe, then closed automatically. No authenticated failing upload was captured in that window. Next step: capture a fresh owner-triggered iPhone save and correlate runtime outcome/status; determine whether it reaches Pages or fails upstream before changing another implementation. No user photos, cookies, IDs, private keys or secret values were logged. The owner retry was captured: four real upload invocations returned 502 with outcome ok and no unhandled exceptions. This confirms the failure reaches Pages but does not yet identify which rejection occurs. Diagnostic Git ffc5930 / production 110d9988-fe2a-453d-80cf-47b5b032e614 now logs only allowlisted processing stage/status/error category for PUT 5xx; no payloads, identities, raw exception values or secrets. Production build and all 44 group/media tests passed. Two real-processor runs each uploaded four synthetic images (sRGB/display-P3, opaque/transparent, simple then complex); all eight returned 200. Each run used an isolated temporary QA account and cleaned its photo/account afterward; no real users changed. Awaiting a new owner retry under the detailed diagnostic. Issue remains unresolved.

## Profile photo mobile upload investigation - November 21, 2026

Owner reported a raw expected-pattern error on phone Save photo; desktop upload worked. The original failure is not reproduced on the physical phone and its exact response/status remains unknown. Do not claim a confirmed root cause or device fix. Unauthenticated production media probes returned normal JSON (GET 404, PUT 401), without modifying accounts or photos.

Upload compatibility changes materialize bounded image bytes before fetch instead of passing a Blob, request JSON explicitly, handle non-JSON/error responses without leaking browser parse errors, explain expired sessions/network errors, and preserve the selected crop for retry. Existing authentication, CSRF, privacy and 5 MB limits remain enforced.

Verification: 6 unit tests passed; 6 focused browser upload/crop/retry checks passed; one additional mobile-size boundary test passed (5 MB accepted and cropped to under 1 MB; 5 MB + 1 byte rejected before upload). Production build passed. Earlier broader photo selection ran 7 tests: 5 passed, 2 failed only on existing crop-action snapshots that predate the photo-sharing checkbox/privacy copy. No snapshots updated. Separate pixel-level crop test passed at 512x512 with the selected blue region preserved. Physical-phone retry remains pending. Production deployment cee3d0ea-658f-431b-afb3-cbd718fb01a3 (Git 8972593) succeeded. Two hosted checks passed at 390/1440 px using live production assets and synthetic API fixtures: oversized source blocked; 5 MB source cropped to 7109 bytes; gateway-error retry retained selection and saved. Evidence: qa-evidence/photo-upload-production-browser.json. No database or Worker changes.

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

## Provider callback registration update - November 20, 2026

Owner confirmed adding the production Apple domain/return URL and Google redirect
URI. Public read-only verification of opencourts.us returned HTTP 404 for Account,
/api/auth/me and both auth callback endpoints. Production does not yet expose the
Play Together authentication routes, so this does not verify or disprove the
provider registrations. No authenticated OAuth flow was attempted and provider
console configuration was not independently inspected. No credentials were read
or changed. Production credential setup, resources/schema and release deployment
remain pending before end-to-end sign-in can be verified.

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

## Launch-copy and SEO preparation - November 19, 2026

Published **Preview d3ee9b78**, https://feature-play-together.opencourts.pages.dev
(immutable https://d3ee9b78.opencourts.pages.dev), bundle index-DOfKH7ra.js, schema 0025.
Hosted home/privacy/contact/community/groups/account/sitemap HTTP 200, correct
canonicals, no stale staging copy, Preview-wide noindex/nofollow and Account noindex
meta; provider readiness true. Production remains 7ef38ff2/main. No production/main/
D1, secret/settings, sender, Play upload or Git push operation.

Production/Google Play are **not yet release-ready**. Read PRODUCTION_LAUNCH_READINESS.md
for evidence and concrete remaining rollout steps. Production origin/main guards
remain intentional; no production DB/config/secret or store operation is authorized
by this copy review. Version code still 2; signed internal-test bundle needs 3+.

Removed staging/first-release copy across public pages and account/game/group screens;
kept accurate privacy/retention/push/email limits and legitimate photo/group previews.
Customer sign-in errors no longer instruct users about private keys/provider config.
Home metadata now includes tennis games/groups; sitemap adds public community home,
group discovery and Help. Route-specific HTML metadata/canonical/social URLs and
noindex private activity routes are generated by scripts/community-metadata.mjs.
Feature build adds Preview-wide noindex/nofollow header. No private activities,
invitation IDs or personal data added to sitemap/social metadata.

New npm run build:release creates an ignored dist-release candidate with community
routes and without the debug app association or Preview noindex header. Production
candidate build passed, but APIs stay guarded until a separately reviewed production
rollout. Do not deploy build:dev to production. Existing store prompts unchanged.

357 units /22 files passed; 15 information/accessibility/guide browser checks passed.
Four intended sign-in/create-game baselines updated separately (four tests passed).
First full run: 252/255 passed (11.5m); three light tablet/desktop logo contrast
failures fixed by darkening shared muted wordmark to #59685f. Three failed matrices
and three affected visual checks then passed without baseline updates. Final complete
run: 251/255 passed (11.9m); four 30s timing failures (Support style / three touch
picker checks) all passed in a fresh-server one-worker rerun (27s), assertions intact.
No single clean final full-suite pass claimed. All 350 matrix states: zero JS errors,
detected axe violations and page overflow. Development and isolated production builds
confirmed exit 0; Functions compiled on publication. Logs ignored under release-copy-*.

## Shared branding and support email on Preview 3cccd5df - November 19, 2026

Published https://feature-play-together.opencourts.pages.dev (immutable
https://3cccd5df.opencourts.pages.dev), bundle index-BYvMHzjB.js; schema 0025 unchanged.
Main court page logo is the reference for all headers/footers. Shared brand.css and
React SiteBrand replace divergent mark fills/colors/sizes/wordmark rules; Account and
community footers now have matching logos, and 404 has matching chrome. See
BRANDING_AUDIT.md: 30 views x three widths x two themes, 360 header/footer comparisons,
plus hover/focus/live theme switching. Main-page header/footer size hierarchy retained.

Final 90 browsers passed (1.9m), fresh server, no snapshot updates. Sixteen intended
full-page logo/footer baselines refreshed separately (15 tests passed). Initial run
67/84 preserved in logs: expected baseline changes plus navigation timing failures;
guest behavior test now waits for management readiness before measuring controls.
Build/Functions compiled successfully. Existing intentional working tree preserved.

Replaced personal contact address with support@opencourts.us in Privacy/Contact text
and mailto links and weather provider User-Agent contact. Historical QA reports retain
their captured old label; no mailbox provisioning or email delivery claim. Hosted
Privacy/Contact verified new links/no old address; Support/guide/brand.css HTTP 200.
404.html redirects canonically; local error-page branding covered by logo audit.
Production 7ef38ff2/main unchanged. No DB, environment-secret, sender, Play or Git push.
Evidence ignored under .wrangler/qa-audit/branding-*; device/store gates remain open.

## Information-page redesign on Preview eda7c7c1 - November 19, 2026

Published https://feature-play-together.opencourts.pages.dev (immutable
https://eda7c7c1.opencourts.pages.dev), schema still 0025. Static pages.css changes;
application functionality/organizer attendance retained. Privacy contents moved below
title/date into a labeled responsive On this page panel; Help gets the same menu.
Neutral section links have 46px targets, theme-aware hover/focus and native anchor
keyboard focus. Paragraph links retain underlines. Shared information-page text is
16px; header/footer targets are 44px+, with stronger focus and reduced-motion support.
Enlarged-text/narrow layouts stack menu entries. Privacy/legal wording unchanged.
There is no standalone Terms page in this checkout; no legal text invented.

15 primary browser checks + four guide checks passed, no snapshots updated. Primary
checks cover five pages in both themes, responsive layout, native keyboard anchors,
200% text, reduced motion and axe audits (zero detected violations). Guide checks cover
seven additional pages using the shared footer. Build and Functions compiled. Hosted
privacy/help/about/contact/support/pages.css HTTP 200; CSS revalidates. Production
7ef38ff2/main unchanged; no DB/backend/settings/secrets/sender/Play/Git push changes.
Evidence ignored under .wrangler/qa-audit/info-design-*; device/store gates remain.

## Organizer attendance on Preview 4f2da8b6 - November 19, 2026

Published https://feature-play-together.opencourts.pages.dev (immutable
https://4f2da8b6.opencourts.pages.dev), bundle index-Ds509M8B.js; schema stays 0025.
Organizers/managers now have Your attendance controls: I'm not playing opens an
explicit Release my place / Keep my place confirmation. Releasing affects only their
playing place, never game status/ownership or other players. Empty games can continue.
Management and My Games organizing access remain. Join as a player restores a place
only when capacity allows, without self-approval; group waitlist reservations win.
Cancel game remains a separate whole-game action. Applies to public/unlisted and
public/private group games, one weekly occurrence at a time, before game start.

Participation adds isGameOrganizer for actual creator versus isOrganizer management
capability. Game DTO adds organizerPlaying; details show Not playing when false.
No self notifications from releasing/reclaiming a place; normal automatic waitlist
offers remain. No new migration, store artifact or sender/environment changes.

354 units / 21 files and 62 browsers passed (55.6s), no snapshot updates. Covers
release/rejoin/confirmation/cancellation, current management, remaining players,
empty games, occurrence isolation, full games and reserved offers. Fixed an old push
cleanup test timestamp that could predate its subscription. Build/Functions compiled;
mobile group dark screen reviewed. Hosted account/search/help/bundle HTTP 200;
public games have the attendance field; provider readiness true. Production 7ef38ff2
unchanged. Physical Android acceptance step 17 added; phone testing remains pending.
Evidence ignored under .wrangler/qa-audit/organizer-attendance-*; work uncommitted.

## Compact request rows on Preview 5fae5e7e - November 19, 2026

Published https://feature-play-together.opencourts.pages.dev (immutable
https://5fae5e7e.opencourts.pages.dev), bundle index-BbfWaYWV.js; schema unchanged 0025.
Game/group membership request buttons now display only Approve / Reject; accessible
names still identify the player. Game, membership and guest requests share inline
name/action rows. Buttons wrap individually when space runs out, long names remain
readable, and subtle dividers separate multiple requests. Existing button styles,
46px targets and action/notification behavior retained.

45 browser checks passed (37.8s), covering styles, short/long names, multiple rows,
wrapping/separators and game/group behavior at mobile/desktop light/dark. No snapshot
updates. Dev build and Pages Functions compilation passed. Hosted groups/inbox/new
bundle HTTP 200. Production stays 7ef38ff2/main. No DB/settings/secrets/sender/Play/Git
push changes. Evidence ignored under .wrangler/qa-audit/request-rows-*.

## Request buttons consistent on Preview 5386786b - November 19, 2026

Published https://feature-play-together.opencourts.pages.dev (immutable
https://5386786b.opencourts.pages.dev), bundle index-JgeozLs9.js, schema still 0025.
Guest approvals/rejections now match regular game requests: neutral outlined shared
buttons, no green/red palette or check/X icons, standard sizing and focus treatment.
Inbox decisions use the same style and Approve/Reject wording. Existing group-member
request buttons already matched. Guest pairs stay together; inbox labels do not wrap
within words on mobile. Other inbox action buttons share standard button dimensions.

49 scoped browsers passed, including six new cross-screen/theme/width style checks;
dev build and Functions compilation passed. Four intended inbox baselines updated
separately and reviewed; final verification used no snapshot updates. Public hosted
routes/new bundle HTTP 200; Google/Apple readiness true. No backend/database/secret/
sender/production/Git push/Play operations in this styling pass. Previous self-action
notification fix remains deployed. See APP_TESTING_CHECKLIST.md for remaining gates.

## Self-notifications fixed on Preview 6ab4bcc2 - November 19, 2026

Published https://feature-play-together.opencourts.pages.dev (immutable
https://6ab4bcc2.opencourts.pages.dev), schema 0025 on opencourts-dev only.
No self inbox/push for explicit actions. Schedule changes now exclude the actual
editor; creator still receives another manager's edit. Cancellation/series/archive
and manager guest decisions use the actual actor too. Other action categories audited;
see NOTIFICATION_BEHAVIOR_AUDIT.md. Waitlist availability outcomes retained.

348 units and 76 focused browsers passed; final 85-unit check covers historical cleanup
and preservation of unknown actors. Dev build/Functions compilation passed; no snapshot
updates. Only 0025 was pending/applied. Post-check: no pending dev migrations, zero
identifiable self notification rows and zero leaked actor context. Hosted Account/search/
manage-series/public games/sw.js HTTP 200; Google/Apple readiness true. Production
7ef38ff2 on main unchanged; no production D1/settings/secrets/sender-config changes,
Git push or Play upload. Logs ignored under .wrangler/qa-audit/self-notification-*.

Retest on Android: edit an otherwise empty own game and expect only on-screen
confirmation; another manager editing the creator's game should still notify them.
Already displayed OS notifications remain. Physical Android/TWA/push and Play gates
remain pending in APP_TESTING_CHECKLIST.md. All intentional uncommitted work preserved.

## Fresh-server readiness continuation - November 19, 2026

**Published Preview 014eaa04**: https://feature-play-together.opencourts.pages.dev
(immutable https://014eaa04.opencourts.pages.dev), bundle index-B9p3nSSQ.js.
Build/Functions compilation passed. Post-publication Account/search/help/privacy/sw.js/
assetlinks HTTP 200; expected app bundle served; Google/Apple readiness true.
Actual OAuth callbacks and physical Android/TWA/push remain unverified. Preview has
dev package association; production source association unchanged. Production deployment
7ef38ff2-91e0-4505-a215-fa16edcfa0bc unchanged before/after. No remote database,
sender/settings/secret operation, Git push or Play upload. This supersedes older
local-only/publication-pending notes for this readiness continuation.

Verified expected repository/remote and feature/play-together; intentional working tree
preserved. First fresh-server Chrome run: 230/231 passed in 5.9m, no snapshot updates.
320 dark matrix timeout traced to missing `/waitlist` mock returning `{ok:true}` and
crashing HostWaitlist. Corrected it to `{players:[]}`; matrix now asserts no JS errors
per route and gives route-specific heading failures. Diagnostic trace reproduced the
cause; diagnostic run stopped after capture, not counted as passing. Complete corrected
rerun **passed 231/231 in 3.7m, exit 0**, eight workers, fresh server, no snapshot updates. All 350 matrix states have zero JS errors, detected axe violations and page overflow.
Previous 1024 light and dynamic audits passed in the first complete run.

Development build rerun exits 0; bundle index-B9p3nSSQ.js, existing size warning.
Candidate review recorded in GIT_READINESS.md. Preserve synthetic QA evidence/baselines;
no snapshot update flags used. Credentials/runtime data/builds/logs remain excluded.
No staging, commit or Git push. No production/main/D1 changes or environment-secret
access. Preview publication verified above. No Play upload;
Gradle remains code 2/1.0.1, next approved bundle requires 3+. Package/destination and
signing decision remain with user; physical Android/TWA/push acceptance remains open.

## Android readiness follow-up - November 19, 2026

Google Play only; no native iOS app exists yet. User confirmed highest published version code 2 / 1.0.1 (November 2), so a later upload needs 3+. No signing keys accessed.

Updated obsolete browser expectations for custom pickers, time entry, roles, invitation confirmation and navigation. Reviewed and refreshed affected game/group/account/feed screenshots. Scoped checks passed (39 game/group, 30 picker/invitation/waitlist/navigation, 25 account/mobile). Security tools now Vite 6.4.6, Vitest 5.1.1, Wrangler 4.165.0; Node 22.21+ required. All 339 units and development build pass; Pages Functions compile locally. npm audit now flags only MapLibre 5.24.1, whose official sanitizer backport conflicts with advisory version metadata; retain evidence and regression coverage.

Full 231-browser verification passed in the continuation above; check APP_TESTING_CHECKLIST.md for current results. Physical Android/TWA/push testing, signing/certificate, internal-test destination and Play Console declarations remain open. Use ANDROID_DEVICE_ACCEPTANCE.md. No production deployment, store upload, Git push or authentication-secret changes.

Latest readiness note: user confirmed Google Play internal testing. Full browser suite is green (231/231); physical Android and store gates remain open. See APP_TESTING_CHECKLIST.md before continuing.

## App testing readiness ? November 19, 2026

See [APP_TESTING_CHECKLIST.md](APP_TESTING_CHECKLIST.md) for the ordered current acceptance gates and evidence. Public information pages were updated for current series, group visibility and optional push behavior. 339 unit tests, development build, 18 focused browser checks and Android debug/manifest checks passed. Store upload remains blocked by signing/version/destination decisions, physical-device acceptance and dependency review. No production deployment, store upload or authentication-secret changes.

## November 19 - Cache improvements Preview7bfb84b9

Published court expiry/background refresh and versioned public cover caching. Verified live HTML/sw.js no-cache must-revalidate and hashed JS public max-age31536000 immutable. Google/Apple readiness true; production deployment unchanged.339 unit tests and build passed before deployment. Private API/avatar no-store preserved; no migrations, auth secret changes or settings patches. Stable Preview https://feature-play-together.opencourts.pages.dev.

## November 19 - Cache improvements (local)

US court session cache v26 now stores savedAt/courts. Up to6h returns saved results;6-24h returns saved results immediately and refreshes in background; older/malformed/legacy arrays refetch. Background failures preserve bounded saved data. International persistent fallback unchanged. Updated context writes match timestamp format. Public group covers redirect unversioned/mismatched versions to actual stored version with no-store redirect, then public max-age3600. Public cover removal/archive can remain visible in browser cache for up to1h; never use this for private avatars. Player images remain private no-store. Upload responses return actual committed media version.

Content-hashed /assets/* now cache1year immutable; HTML and sw.js revalidate. No private pages/API responses cached, no offline data caching, no production/settings change.339 unit tests passed including US fresh/stale/expired caches and image privacy/version rollover; build passed. Not deployed yet.

## November 19 - Direct links and opt-in prompts Preview release8107cffc

Published development sender and Preview8107cffc. Direct validated game/group targets, optional successful-action prompts,30-day dismissal and unavailable-game inbox/account fallback included.35 focused push backend/worker tests,10 prompt/settings browser checks and final build passed. Served service-worker routing verified; Google/Apple ready; production deployment unchanged. No auth secrets or Pages vars changed. Physical Home Screen/Android tap and OS permission acceptance still required; reopen/refresh Home Screen app for worker update. Email/APNs remain deferred.

## November 19 - Direct notification destinations and contextual opt-in (local)

Encrypted payload includes target {type:game|group,id}; service worker validates fixed destination types and UUIDs and builds same-origin URLs itself. Invalid/old targets open inbox. Game/group APIs retain sign-in/current-access checks; unavailable game screen offers inbox/account links. No private text in push payloads.

Optional prompt after successful join/join-waitlist, or hosted created-game landing; never blocks submission. Enable uses same opt-in code; Not now stores30-day per-account/browser cooldown. Hidden for already enabled preference/current device, denied permission, unsupported browsers and unavailable tester configuration. No auto permission prompt. Direct link + safe fallback35 focused backend/worker tests passed; browser prompt/settings validation recorded separately. Existing installed Home Screen worker must refresh before direct-link testing. No auth secret/config changes.

## November 19 - Distinct notification wording published (198b7cbc)

Replaced identical push message with fixed privacy-safe wording for all19 supported event kinds. Sender transmits version1/kind/tag only using encrypted raw payload; service worker selects trusted fixed text, rejects arbitrary payload body/title/URL, and falls back for unknown/malformed kinds. No private names, locations, meeting times or reasons in lock-screen messages. Taps remain same-origin inbox. Updated future APNs/email contract: adapters should share equivalent type-specific safe templates, not arbitrary caller text.

33 focused push/API/service-worker tests passed, including all19 distinct texts, unknown/prototype-like kind values, null payloads, sender encryption and privacy. Development build passed. Published sender and feature Preview198b7cbc; served sw.js templates verified, Google/Apple readiness true, production unchanged. No authentication secret or Pages variable update. Home Screen users must reopen/refresh Preview to receive the new service worker before testing; already displayed messages retain old text. No unsolicited new test pushes sent.

## November 19 - Confirmed Sam push tester added; Preview 1d203b57

User-supplied player ID matched development account a4746f68-1be9-49dd-87ae-170494349ee6 (message omitted initial a). Added alongside original tester87be695a-f00f-4689-b0c7-16ad9a50346d in PUSH_ALLOWED_PLAYER_IDS for Pages Preview and development sender. Pages PATCH contained ONLY that public key; no authentication secrets read as values/resubmitted/changed. Sender and existing build republished; Google/Apple readiness true and production deployment unchanged. Next: refresh stable Preview Account on affected device, enable notifications, then verify a real event from another account. Phone delivery remains unverified.

## November 19 - Preview authentication restored; push device opt-in next

Owner restored authentication secrets. Redeployed existing build only as c9d0b7b3 at stable Preview, without any env/config/secret mutation. Read-only verification: Google=true, Apple=true, Account HTTP200, production deployment/config unchanged. Development push database: zero registered devices, zero provider-accepted deliveries. Sender is Sam-only; real phone delivery awaits opt-in. Next: Sam signs into stable Preview Account on Android, enables notifications, then generates real activity from another account. Separate debug APK is android-app/app/build/outputs/apk/debug/app-debug.apk. Installed production app still points to production and cannot test this Preview feature.

USER REQUIREMENT: never modify, rotate, replace or resubmit existing authentication secrets. All future config patches must include only explicitly changed new keys; never GET/redacted secret fields. Restoration readiness is verified but actual OAuth callback still requires user sign-in. Email and native APNs remain deferred.

## November 19 - IMPORTANT: Preview push activation interrupted; sign-in recovery required

Approved remote migration0024 successfully applied to opencourts-dev. Created opencourts-push-dev Worker, uploaded VAPID private secret, enabled Sam-only cron sender (version fa773791-54e0-4b11-bed1-e233e2a3ca93), and deployed Preview 0d8fffd7. Production deployment/configuration compared unchanged. Preview account/sw/games HTTP200 and dev Android assetlinks published, BUT auth/me reports Google=false and Apple=false.

Cause: agent PATCH resubmitted GET-redacted secret_text fields along with public Preview vars. This left Preview sign-in secrets unusable. NEVER resubmit secret placeholders from GET responses. Future patches must contain ONLY explicit changed variables; omitted variables are preserved. Do not repeat the activation instructions' full env merge approach. No secret values can be recovered from GET/deployment metadata.

Recovery: owner must re-enter original GOOGLE_CLIENT_SECRET, APPLE_PRIVATE_KEY (full .p8), APPLE_TOKEN_ENCRYPTION_KEY (original 64-hex value; do not rotate), AUTH_RATE_LIMIT_SECRET in Cloudflare Pages opencourts > Settings > Preview > Variables and secrets. Do not paste credentials in chat. Preserve public IDs, origin, bindings and existing encryption key. Then redeploy feature Preview and verify both providers true, actual Google/Apple callback, and court endpoint readiness. Only afterward proceed to phone opt-in/real push delivery. No email implementation/activation yet.

Attempt to pause sender with `npx.cmd wrangler deploy --config development/wrangler.push-dev.json` was NOT executed: automatic approval review failed due to usage limit, not an unsafe-action decision. Do not bypass approval. Sender therefore remains enabled Sam-only; real delivery unverified. If needed owner can pause opencourts-push-dev by setting its PUSH_ENABLED=false in Workers settings and deploying that Worker only. Pages PUSH_ENABLED=false alone does not pause the Worker.

Current feature source/docs/Android changes are uncommitted; last Git checkpoint a0d245a precedes push implementation. Private keys remain ignored. No production change, Play release, or push implementation Git push. Read NOTIFICATION_ARCHITECTURE.md but this incident entry overrides its old full env merge instruction.

## November 19 - Push implementation validated; remote activation requires approval

331 unit tests passed (31 new push/API/worker tests); 14 browser checks passed (opt-in phone/desktop light/dark, permission denial, disabled state and information pages). Development build and Worker dry-run passed. Separate Android debug APK built and release manifest validated; actual debug signing fingerprint matches development assetlinks. Mobile dark opt-in UI visually inspected. Local migration0024 applied; remote list confirms only0024 pending. No remote migration, new Worker, Pages binding/secret change, Preview deployment, Git push or production operation.

Generated private VAPID keys stay in ignored .wrangler/push-dev-secrets.json; ignored .wrangler/push-dev-ready.json and push-preview-vars.json prepare tester-only activation for Sam (87be695a-f00f-4689-b0c7-16ad9a50346d). VAPID contact URI uses existing https://opencourts.us/contact. Never print/commit secret values. Review/approve exact activation commands in NOTIFICATION_ARCHITECTURE.md before running them. Physical Android delivery/delegation/notification taps remain pending, and no end-to-end phone delivery is claimed. Email/APNs remain future adapters.

## November 19 - Push foundation and Android development build (local, activation pending)

Shared event/channel delivery architecture documented in NOTIFICATION_ARCHITECTURE.md. Migration 0024 adds routing events, opt-in preferences, session-bound devices and leased delivery records. New push settings APIs and Account controls; generic service-worker messages and inbox taps; separate minute-scheduled development sender with allowlist, retries/expiry and current access checks. Email stays deferred. APNs schema/adapter contract is reserved for future native iOS, not implemented.

Android source adds permission/delegation/icon/deep links; debug installs separately as us.opencourts.app.dev pointed at stable Preview. Release package/domain preserved. Debug APK and release manifest compile; no Play release. Ignored development VAPID keys generated locally; no secrets printed or committed. Local SQLite migration only; remote opencourts-dev remains schema0023. No Cloudflare worker/secrets/settings created, no Preview/production deployment and no Git push. Read architecture activation checklist before any remote operation.

Next: finish automated verification, then request approval for remote migration0024 and development sender/Preview configuration with named testers/contact address. Real Chrome/Android notification delivery remains unverified until activation and physical-device acceptance. Do not call push live based on mocks/builds. Existing in-app notifications are unchanged.

## November 19 - Git checkpoint pushed and Preview published

Feature code checkpoint f3a0a07 pushed to origin/feature/play-together. Verified development build published as 758ff97b at https://feature-play-together.opencourts.pages.dev. Includes latest compact guest rows and light/dark decision colors. All 300 unit tests and seven focused guest/series browser checks passed. Game page, notification page, auth API and game discovery returned HTTP 200; production deployment unchanged and bindings isolated. No migrations, production changes, email or push implementation. Maintained source/tests/docs and reviewed QA images/baselines committed; credentials, uploads, databases, build/log output remain excluded. Physical-device review remains next. A documentation-only follow-up records this release; automatic Preview builds from that commit may receive a new deployment ID with the same application code.

## November 19 - Git checkpoint and Preview preparation

Current implementation includes migrations 0018-0023 (already applied to development D1), player invitations, multi-court/weekly games, waitlists, public/private group event access, series management, mobile controls, privacy/help content and recent roster/guest fixes. Latest local additions include natural-width guest request rows and light/dark Approve/Deny colors. Unit suite: 300 passed; development build passed. Physical-device acceptance remains outstanding. Push/email are not implemented; email remains explicitly deferred. Android push was inspected only: wrapper needs delegation, permission/deep-link integration, and backend/service-worker delivery.

Commit source, migrations, tests, maintained documentation, reviewed QA evidence and existing visual test baselines. Exclude credentials/signing keys, user uploads, local databases, generated builds/reports/logs and .wrangler. Existing .gitignore covers those exclusions. No production operations or remote migrations authorized by this checkpoint. Git push is feature/play-together only; Preview publication is authorized. Older local-only deployment notices are historical.

## November 19 - Guest decision colors (local)

Guest Approve uses existing primary action tokens; Deny uses a restrained red semantic treatment with separate light/dark tokens. Hover, keyboard focus, icons/text and disabled behavior retained. Small semantic color extension scoped to guest controls; no global theme redesign. Not yet published to Preview.

## November 19 - Guest row width correction (local)

Removed the guest sponsor label's 110px flex basis/grow reservation, using natural text width and compact action padding instead. Short player/guest labels and both actions now fit a 375px viewport; buttons still wrap whole and keep 44px height. Browser regression confirms Approve/Deny share the same row and host approval works. Not yet deployed; supersedes the spacing behavior in Preview 66fe9674.

## November 19 - Preview release 66fe9674

Published guest count touch buttons, compact indivisible Approve/Deny actions, rejoin-aware cancellation roster and separately labelled guest cancellations to https://feature-play-together.opencourts.pages.dev (66fe9674). Supersedes local-only status for these changes. Build, 36 group backend tests, light/dark touch guest request/cancel checks and host approval check passed. Post-release game page/auth/discovery HTTP 200. Production deployment unchanged and D1 isolation checked before deployment. No migrations or Git push. Physical iPhone review remains pending: switch guest counts, approve/deny at narrow width, cancel guests and leave/rejoin to verify roster. Evidence .wrangler/qa-audit/guest-polish-preview-deploy.log.

## November 19 - Compact guest approval rows (local)

Guest request rows show player/guest count alongside short Check Approve / X Deny buttons. Each button is an indivisible no-wrap flex item and moves as a complete unit to the next line when necessary. Player names can wrap; 44px touch targets and full contextual accessible labels preserved. Existing host approval browser check passed. Development build passed. Not published to Preview; guest count buttons and cancellation fixes also remain pending publication.

## November 19 - Current cancellations reflect rejoining and guest withdrawals (local)

Cancellation roster excludes players currently confirmed again; historical game_cancellations records remain stored. Guest cancellation notifications supply separately labelled sponsor name/guest-count/time rows; latest cancellation per sponsor is shown, hidden while a replacement guest request is pending or approved. Guest-only cancellation does not label the sponsor cancelled. Member responses omit private reasons; existing organizer-only reason access unchanged. No schema changes. All 36 group tests and development build passed. Not deployed; includes pending guest touch-button work for next Preview. Native clients should use optional kind (player/guests) and guestCount in cancellation rows, defaulting older responses to player.

## November 19 - Guest count touch controls (local)

Replaced the three-option guest count dropdown with direct 1 guest / 2 guests / 3 guests buttons, selected aria-pressed state, existing action colors, 44px-plus targets and disabled state while submitting. No picker popup or shared SiteSelect behavior change. Browser touch-emulation tests passed in light/dark at 393px, changing 3 -> 2 -> 1 and requesting/cancelling guests; no horizontal overflow. This is Chromium emulation, not physical iPhone/Safari acceptance. Development build passed. Not deployed; ask user to retest their iPhone after next authorized Preview publication. No backend/schema change.

## November 19 - Preview release e4f40377

Published notification destination styling and read-only approved-member game rosters to https://feature-play-together.opencourts.pages.dev (deployment e4f40377). Supersedes local-only status for these changes. Notification page, auth API and game discovery returned HTTP 200 after publishing. Preview/prod D1 bindings verified isolated; production deployment unchanged. No migrations or Git push. Test member roster/waitlist/cancellation views with a second approved group account; cancellation reasons remain organizer-only. Evidence: .wrangler/qa-audit/member-roster-preview-deploy.log. Physical-device review remains pending.

## November 19 - Read-only group game rosters (local)

Approved group members can view confirmed players (including guest counts), the group-game waitlist and player cancellations. GET games/:id/participants, /waitlist and /cancellations allow current approved members as well as authorized managers. Member cancellation responses expose displayName/cancelledAt only, never private cancellation reasons. Pending join requests and all management writes remain restricted to authorized organizers/managers. Public-group nonmembers do not gain roster access; removed private-group members receive 404. No schema changes.

UI includes compact read-only lists for members, with no remove/approve/edit controls. Validation: all 35 group backend tests passed, including private-reason exclusion, forbidden management and revoked membership. Development build passed. Not published to Preview yet; physical-device visual review remains pending.

## November 19 - Notification destination links polished locally

Inbox group/game names now use compact bordered destination links with a group or tennis icon and navigation arrow, replacing underlined text. Existing theme variables, wrapping names, 44px touch targets and keyboard focus retained. Styling only; authorization and delivery unchanged. Not deployed by this change; Preview publication remains pending.

## November 18 - Future milestone: email notifications (deferred)

Approved for the future roadmap only. Do not implement, activate billing, configure sender DNS, create email resources, or send test/user emails until separately authorized. Existing in-app notifications remain the current delivery channel; this milestone does not block current development or authorize a deployment.

Planned scope:
- Evaluate Cloudflare Email Service and confirm availability/pricing before activation; verify a sending domain and sender authentication. Provider choice and paid service activation still require approval.
- Create reusable OpenCourts-branded, mobile-friendly HTML and plain-text templates for game invitations, join/membership requests, approval/rejection, cancellations, schedule changes, and waitlist place offers. Include clear game/group context, relevant date/time/time zone, status, and a link to the appropriate action.
- Use a shared server-side delivery workflow for web, Android and future native iOS, alongside existing in-app notifications. Native push is a separate future capability.
- Plan a D1 outbox and background delivery with retries, duplicate prevention, delivery tracking, bounce/suppression handling, notification preferences and opt-out controls appropriate to each email category. No schema or delivery contract is implemented by this plan.
- Protect private group content: recheck current recipient access before sending, minimize sensitive details in emails, and enforce authorization again when opening a link. Email links must never bypass membership or game permissions.
- Confirm verified recipient email handling, including Apple Hide My Email sender registration/deliverability. Never expose account email addresses in public profiles.
- Start in the isolated development environment with an explicit tester recipient allowlist. First rollout candidates: invitations, approvals, cancellations and schedule changes; expand only after delivery/privacy testing.

Next step when authorized: agree email categories/preferences, provider and sender domain, then approve the delivery/schema design before implementing. This is a future milestone, not a completed feature or production setting change.

## November 18 - Series management Preview release 31bafac6

Applied approved migration 0023_series_management.sql to opencourts-dev only, then published 31bafac6 at https://feature-play-together.opencourts.pages.dev. Open a hosted game and choose Manage series (or Change date or time for a single game). Review and confirm single/future schedule edits or cancellations; exceptions and attendance are preserved as documented. Earlier local-only status entries for series management are superseded.

Post-release checks: manage-series page, game discovery/feed and canonical help HTTP 200; Google and Apple providers ready; no pending development migrations. Preview D1 isolation verified; production retains original binding 56c414b7-aca5-429b-acfa-b9e8e87b052b and deployment 7ef38ff2-91e0-4505-a215-fa16edcfa0bc. No Git push or production deployment. Evidence .wrangler/qa-audit/series-management-remote-migration.log, series-management-preview-deploy.log, series-management-post-migrations.log.

Next manual acceptance: on physical iPhone/Android, reschedule one week, change later weeks while preserving an exception, cancel a single date, verify remaining dates/players, and check old/new time notifications with another approved test account. Browser/unit tests do not replace real-device acceptance. Native blueprint updated to published schema0023; native authentication/push/payments and other production readiness gates remain open.

## November 18 - Series management implemented locally (migration 0023)

New Manage series / Manage schedule screen linked from host/authorized group management in game details. Lists authorized dates with status, exceptions and confirmed count/capacity. Reschedule or cancel This game only / This and future games. Past/started/cancelled dates stay unchanged; single-date reschedules set series_exception. Future time edits preserve individually changed exceptions by default (except selected anchor); cancel remaining includes all upcoming selected/future weeks. Hosts review affected old/new dates and skipped reasons before confirmation. Duration, IDs, players, guests, requests, invitations and waitlists remain attached to each occurrence; cancellation hides the event without deleting its record.

GET games/:id/series lists management data (single games supported). POST .../series/preview returns planHash, affected dates/versions and skipped reasons. POST .../series/apply checks planHash plus requestId for confirmation/retry, rebuilds authorized plan, validates every IANA-zone/local date for DST/future/180-day bounds, then atomically applies all targets. DB triggers revalidate current actor/session/role and expected versions per target; any conflict rolls back the entire batch. Later schedule conflicts require a fresh preview. Current owner/coowner/own-event Organizer permissions retained.

Migration 0023_series_management.sql: series_exception, change/target audit records and schedule notifications. Old/new time notifications for host, confirmed players, pending requesters, invitees and active waitlist entries; cancellation extends existing notifications to invited/waiting users. Responses recheck current public/private/unlisted access. Active waitlist deadlines shorten for earlier starts and never extend due to rescheduling. No email/push or attendance auto-enrollment.

Validation: full backend 298 tests passed; four mobile/desktop light/dark management checks passed, including preview/exception display, single cancellation and visible confirmation. Tested retries, preserving attendance, stale preview rejection, transactional rollback, group-role revocation and schedule notification privacy. Mobile dark confirmation visually inspected. Logs .wrangler/qa-audit/series-management-*.log; local migration applied only. Physical iOS/Android retest remains pending. iOS blueprint and public help updated.

REMOTE NOT MIGRATED / NOT DEPLOYED. Current live Preview remains 03fdacfb/schema0022. Request approval for exact command before release: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Verify only 0023 pending, dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Then build/deploy feature/play-together Preview. No production operations or Git push. Series management becomes available only after migration and publishing.

## November 18 - Public/private group events Preview release 03fdacfb

Approved migration 0022_public_group_events.sql applied to opencourts-dev only; published 03fdacfb at https://feature-play-together.opencourts.pages.dev. Public-group event discovery/viewing and nonmember host approval are live; private-group membership checks remain. Simple Public/Private group labels and previous local editable hour/minute + AM/PM calendar controls are included. Earlier local-only statuses for these features are superseded.

Post-release: Create Game, anonymous event search and feed, help and privacy HTTP 200; Google and Apple providers ready; migration list checked. Preview D1 binding verified dev cae4849c-3e99-4945-9d70-bef7b48707ce; production binding retains 56c414b7-aca5-429b-acfa-b9e8e87b052b and deployment 7ef38ff2-91e0-4505-a215-fa16edcfa0bc unchanged. No Git push or production deployment. Evidence public-group-events-remote-migration.log, public-group-events-preview-deploy.log, public-group-events-post-migrations.log under .wrangler/qa-audit.

Next physical-device/two-account QA: public-group event seen by outsider, outsider submits approval request, member joins directly; private event absent to outsider; member lists remain private; Public->Private hides events and removes outsider future participation/requests. Verify calendar time Apply and reopen on original phone. iOS blueprint carries latest groupVisibility and isGroupMember/viewer joinPolicy contract. Production readiness gates remain open.

## November 18 - Latest approved group visibility: public events vs private events (local)

Supersedes earlier rule that ALL group games require membership. Group picker labels now Public / Private. Public-group events appear in public discovery and the All feed, including nonmembers/anonymous viewers, and in the group's preview. Private-group events remain current-approved-members-only. My Groups feed filter remains actual memberships only. Public-group nonmembers request host approval; approved members join directly. Game participation does not create group membership. Member lists, private descriptions, membership management and host/participant-management APIs stay restricted. Group event API retains visibility=group and adds groupVisibility; participation exposes viewer-specific joinPolicy and isGroupMember. Guest/capacity/reservation protections retained; waitlists remain approved-members-only. Public-group hosts can invite outsiders without exposing private groups.

Migration 0022_public_group_events.sql updates DB participation guard and clears nonmember requests/future attendance on Public->Private changes. Visibility is read dynamically from current group, including shared URLs, feeds, My Games, notifications and safety reports. Existing PUBLIC groups' events will become visible under the approved new policy upon deployment; PRIVATE groups remain restricted. No production change. No native auth change.

Validation: full backend 292 tests passed; 13 phone/desktop light/dark browser checks passed, including nonmember event preview/approval and waitlist regressions. Build passed. Evidence .wrangler/qa-audit/public-group-events-*.log. Physical iOS/Android confirmation remains pending. Local time-entry fix from prior task also included in pending build.

REMOTE NOT MIGRATED / NOT DEPLOYED. Current live Preview remains 056fd9a9/schema0021. Before publishing request approval for exact command: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Verify only 0022 pending; dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Update iOS blueprint/help/privacy to this latest rule (done). Then build/deploy feature/play-together only when authorized. No Git push or production operation.

## November 18 - Create Game time entry revision (local)

Reported physical-device time dropdown selection reverting. Initial Chromium touch/desktop reproduction successfully changed and reopened old dropdown values, so exact physical-device cause is not confirmed. Replaced nested Hour/Minute SiteSelect controls inside calendar dialog with explicit numeric-text hour/minute fields plus AM/PM toggle buttons. This removes the nested time-picker dependency rather than claiming the original device-specific cause was proven. Uses existing theme tokens, 44px+ targets, accessible labels/pressed/invalid states and numeric keyboard hint.

Time is converted to canonical 24-hour HH:mm only when applied; calendar date selection and court time-zone rules retained. Editable partial values no longer need to map to a selected option. Apply disables for invalid/missing hour/minute and past starts. Reopening initializes fields from the saved parent value. Hour 1-12, minute 00-59, explicit 12 AM/PM conversion.

Build passed. Calendar touch/desktop tests verify 3:45 PM -> 15:45, reopen persistence, 12:07 AM -> 00:07 and invalid hour/minute rejection. All twelve time-entry and device-profile browser checks passed (iPhone-sized, Pixel, Galaxy, tablet, desktop, both themes). Device-profile regressions logged in .wrangler/qa-audit/calendar-time-final.log; initial reproduce log calendar-time-reproduce.log documents old Chromium success. Physical iPhone/Android retest remains required; no Safari/WebKit claim. No schema change, deployment or production operation; live Preview remains 056fd9a9. Publish only on authorization, then ask user to retest original phone.

## November 18 - Waitlist polish Preview release 056fd9a9

Published approved build to https://feature-play-together.opencourts.pages.dev (056fd9a9). Host queue, My Games Waitlisted actions, wrapping mobile schedule filters, corrected role/deletion help and community analytics exclusion are now on Preview. No migration required; schema remains 0021. No Git push or production deployment.

Post-release: My Games, game discovery API, canonical help and privacy HTTP 200; Google and Apple providers ready. Preview binding verified development cae4849c-3e99-4945-9d70-bef7b48707ce; production retains original binding/deployment 7ef38ff2-91e0-4505-a215-fa16edcfa0bc. Deployment evidence .wrangler/qa-audit/waitlist-polish-preview-deploy.log. Earlier local-only statuses for this polish are superseded.

Next: physical iPhone/Android and assistive-technology acceptance checklist in PLAY_TOGETHER_RELEASE_REVIEW.md. Native blueprint reflects current APIs; native auth/push/payments remain unimplemented. Production prerequisites remain open; no claim of production readiness.

## November 18 - Waitlist polish and release review (local)

Host queue and My Games Waitlisted section added, with named compact queue rows, offer deadlines, positions and Accept/Leave actions. Host endpoint GET games/:id/waitlist uses existing group event management permission (max 200 entries). GET games/mine?view=waitlisted returns only current eligible own group games (max 100); membership removal and expired offers filtered. Refresh every 30 seconds while visible/on focus; no push/background worker. Mobile schedule filters wrap. No schema changes required.

Privacy/accessibility review: disabled Google tag on community/account routes; sanitized court analytics initialization query/fragment/referrer. Corrected obsolete transfer-ownership deletion copy and updated public help/privacy and iOS blueprint. Added PLAY_TOGETHER_RELEASE_REVIEW.md with completed evidence, exact remaining physical-device/two-person test steps and production gates. Automated tests do not claim physical iOS/Android or assistive-technology acceptance. 289 backend tests passed; 19 mobile/desktop/theme and device-profile browser checks passed, plus six visual captures. Final groups/privacy log and build under .wrangler/qa-audit/waitlist-polish-*.log.

Current live Preview remains 32b0d2b5; these polish changes are local awaiting Preview publishing. No migrations, remote writes, production config/deploy or Git push. Next: publish Preview when authorized, then complete real-device acceptance checklist. Operator retention/age/jurisdiction/provider deletion/media-cleanup decisions remain before production. Do not mark the entire production readiness checklist completed.

## November 18 ? Native iOS blueprint added

Added PLAY_TOGETHER_IOS_BLUEPRINT.md as the current native handoff: shared backend/product rules, roles/privacy, series, capacity/guests, invitations, waitlist, API map and native implementation sequence. Explicitly distinguishes existing browser authentication from unimplemented native exchange, deep links, push and payment entitlements. No Swift client/OpenAPI generation claimed. Source-reviewed against current handlers/schema0021. Keep blueprint updated with shared behavior changes. Documentation-only; live Preview remains 32b0d2b5.

## November 18 ? Waitlist Preview release 32b0d2b5

Approved migration 0021 applied to remote opencourts-dev only. Published release 32b0d2b5 to https://feature-play-together.opencourts.pages.dev. Release includes group-game waitlist, mobile top-layer role/action confirmations, and contextual invitation rows with compact revoke menus. All earlier local-only status notes for these changes are superseded.

Post-release checks: Create Game and public game API HTTP 200; canonical /play-together-help HTTP 200 (.html redirects); Google and Apple providers ready; no development migrations pending. Preview binding verified development UUID cae4849c-3e99-4945-9d70-bef7b48707ce; production binding retains 56c414b7-aca5-429b-acfa-b9e8e87b052b and production deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc. No Git push or production writes/deployment. Evidence .wrangler/qa-audit/waitlist-remote-migration.log, waitlist-preview-deploy.log, waitlist-post-migrations.log.

Next physical-device/two-account QA: fill group game, join queue, cancel a confirmed place, verify reserved offer/inbox, accept or leave, and verify role confirmation is visible on a small phone. Offer window two hours or game start; refresh-driven expiry advancement, no background/push delivery. Each weekly game has independent attendance and queue. Host queue overview and My Games waitlist listing remain possible followups.

## November 18 ? Group game waitlist implemented locally

Approved feature: full group games offer Join waitlist to approved members. FIFO by created_at/player_id; each offer reserves one place for two hours or until start, whichever comes first. Player can accept or leave the queue. Expired offers become inactive and next player is promoted on game/inbox refresh. Cancelling attendance or approved guests refreshes the queue. No email/push or scheduled worker: promotion/expiry refreshes lazily through participation and inbox; do not promise background delivery. Each weekly occurrence has its own queue. Guests are not queued and still require host approval. Other players' identities are not exposed to waiting members.

Migration 0021_group_game_waitlist.sql adds game_waitlist and reservation-capacity triggers protecting participant INSERT and guest UPDATE. Server rechecks active membership, blocks, declined participation, game state/time, offers and available capacity. Owner cannot join their own waitlist. Waiting player receives position, offer expiry and accept/leave controls. In-app inbox shows only current eligible offers, including membership checks on final response query; read support included. Reserved offers reduce UI availability. Existing group permissions and normal cancellation reasons preserved.

Validation: development build passed; 288 backend tests passed (18 files), plus final 30 group tests after revoked-member inbox hardening; two phone/desktop browser cases passed for join, withdrawal and acceptance. Local migration applied only. Evidence .wrangler/qa-audit/waitlist-*.log. Physical iOS/Android validation pending.

REMOTE NOT MIGRATED OR DEPLOYED. Live Preview remains 5d18a62a/schema0020. Pending release also contains earlier local role-confirmation dialog and contextual invitation rows. Before publishing request approval for exact command: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Verify only 0021 pending and development UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Build and deploy feature/play-together only after migration. No production operations or Git push performed. Potential next extensions: host queue overview, waitlisted games in My Games, background scheduling/push; not implemented in this milestone.

## November 18 ? Invitation context and compact management UI (local)

Screenshot was Group membership invitation links, not a named game invitation. GroupInvitations now explicitly identifies membership links as shareable/non-recipient-specific and shows group name, short non-secret reference, created/expiry/revocation dates and status. Shared InvitationRow renders compact rows; Revoke moved into a 44px three-dot action menu, with contextual confirmation identifying recipient/link and group/game. GameSharing uses the same row and includes named recipient where available, game title/date and link dates. Inline send success includes recipient, game and start date. No invented recipient tracking for shared links. Existing approval/access semantics unchanged.

Build passed; four mocked mobile/desktop invitation checks passed, including menu access, recipient/game context and Keep invitation confirmation. Previous mobile top-layer role dialog fix included locally. No schema changes, deployment, Git push or production operations. Live Preview remains 5d18a62a. Next: publish on authorization and physical-device review of role confirmations and invitation rows.

## November 18 ? Mobile role confirmation visibility fixed locally

Reported: selecting Organizer did not expose Confirm on a physical phone. Root UI issue: shared FocusedConfirmation rendered an inline alert after the page's long content, relying on scrollIntoView. Replaced with native modal dialog/showModal in browser top layer, above fixed header and dock; background scroll locks while open, focus returns to trigger, Escape activates the existing non-destructive Keep/Cancel action when available. Dialog uses existing theme tokens, bounded viewport height with scrolling, and full-width phone buttons. All existing uses of the shared component receive this presentation.

Validation: role assignment tests passed at small phone 375x667 touch viewport and desktop, asserting Confirm within viewport and submitting Organizer role. Development build checked (role-dialog-build.log). No migration, production change or deployment. Current live Preview remains 5d18a62a; this fix is local awaiting publishing. Evidence .wrangler/qa-audit/role-dialog-browser.log. Next: publish Preview when authorized and verify on physical iPhone/Android; include confirmation flows for leaving/cancelling games and removing members.

## November 18 ? Weekly series Preview release 5d18a62a

User approved remote development migration and Preview publishing. Applied 0020_weekly_game_series.sql to opencourts-dev only; published release 5d18a62a at https://feature-play-together.opencourts.pages.dev. ZIP-aware inline invite search and independent weekly series are now on Preview. Google and Apple providers ready; Create Game and public game discovery returned HTTP 200. Production deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc; production binding unchanged. No Git push.

Pre-release build passed, 285 backend tests and ten mocked mobile/desktop browser checks passed. Post migration list checked; evidence weekly-remote-migration.log, weekly-preview-deploy.log, weekly-post-migrations.log under .wrangler/qa-audit. Earlier local-only status notes are superseded.

Next manual verification: search invitees using 22033 and Fairfax; only eligible discoverable accounts are returned, capped at 25. Create a 3-week series and use two accounts to verify invitation/approval for week one does not affect weeks two/three. Each week is listed in My Games, with its own player capacity, guests, edits and cancellation. No whole-series edit/cancel UI yet. Physical iOS/Android checks remain pending. Future development must preserve production isolation.

## November 18 ? Weekly series and inline ZIP search implemented locally

Inline host invitation search now calls the same playerSearchLocation resolver as player discovery, expands ZIP to general locality terms, and accepts partial city/name matches. Eligibility, opt-in, blocks and 25-result cap remain; ZIP matching is general locality matching, not exact-distance discovery or a guarantee of every nearby player. No private profile address lookup.

Create Game adds Repeat weekly: 1 game or 2?12 weekly occurrences total. Server validates every local calendar date in the event time zone (DST safe; ambiguous/nonexistent times rejected), all within 180 days. A single atomic batch inserts occurrences plus host participation. First game ID is series_id; occurrence request IDs and first submission hash prevent retry duplication. All visibility types reuse existing authorization, capacity and approval. Each week has its own game ID/invitations/requests/guests/participants; nothing rolls over. Cancel/edit one occurrence only; no bulk series editing or tournament brackets in this milestone. My Games lists occurrences normally. Existing invitation limit remains ten per occurrence.

Additive migration 0020_weekly_game_series.sql adds series_id, series_week, series_weeks plus a unique series/week index. Applied locally only. Remote opencourts-dev remains 0019; live Preview remains ce046f38. BEFORE publishing ask approval for: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Verify only 0020 pending and dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. No production operations or Git push performed.

Validation: development build and all 285 backend tests passed. Logs: .wrangler/qa-audit/weekly-regression.log, weekly-build.log, weekly-local-migration.log, weekly-browser.log. Ten mocked mobile/touch and desktop browser checks passed, including repeat-week submission and inline ZIP entry. Physical-device validation remains required. Next: approved dev migration, rebuild help-page changes, Preview deployment and two-account testing of separate weekly invitations/attendance.

## November 18 ? Multi-court Preview published

Approved migration 0019 applied successfully to remote opencourts-dev only (cae4849c-3e99-4945-9d70-bef7b48707ce). Published working-tree build ce046f38 to https://feature-play-together.opencourts.pages.dev. Includes multi-court event creation, clearer Owner-only role controls and one Co-owner/Organizer limits, and inline public/unlisted game invitations. No Git push or production deployment.

Post-release verification: Create Game HTTP 200; Google and Apple providers both ready; Preview COURTS_DB targets development, production COURTS_DB retains 56c414b7-aca5-429b-acfa-b9e8e87b052b; production deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc. Remote migration completion checked. Evidence: .wrangler/qa-audit/multi-court-remote-migration.log, multi-court-deploy.log, multi-court-post-migrations.log. Pre-release: build, 281 backend tests and six touch/desktop browser cases passed.

Next manual QA: on physical iOS and Android create two-court singles (4 default), four-court doubles (16 default), add rotating attendance, verify approved guests count and full-event rejection, assign/demote group roles with two accounts, and invite/revoke unlisted access. Test via stable alias above for OAuth. Earlier notes describing these changes as local-only are superseded by this release entry.

## November 18 ? Multi-court events implemented locally

Create Game now separates singles/doubles format, courts planned (1?16) and total attendance (up to 128). Defaults are courts ? 2 for singles and courts ? 4 for doubles; hosts may increase capacity for rotation. Changing format/courts resets the suggested capacity, explicitly explained in the UI. Capacity includes host and approved guests. Game details show planned courts and the no-reservation notice. Applies to public, unlisted and group events using existing authorization/approval logic.

Migration 0019_multi_court_events.sql is additive: retains legacy capacity as per-match size, adds court_count/default 1 and nullable event_capacity, and updates database capacity triggers to use COALESCE(event_capacity,capacity). Existing games retain their limits. All game projections, participation, guest checks and invitation eligibility use total capacity. No table rebuild or production change.

Validation: development build passed; all 281 backend tests passed (18 files), including multi-court creation, invalid sizes, guests, full-event approval rejection and foreign-key integrity. Six mobile/touch and desktop browser checks passed, including 2 singles courts ? 4, 4 doubles courts ? 16, custom rotating attendance payload, role assignment and skill selection. Local guarded migration applied successfully. Evidence: .wrangler/qa-audit/multi-court-*.log. Physical iPhone/Android verification remains pending.

REMOTE PREVIEW NOT YET MIGRATED OR DEPLOYED. Before deploying, request approval for this exact development-only command, after verifying database identity/schema: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Config must name only opencourts-dev (cae4849c-3e99-4945-9d70-bef7b48707ce), binding COURTS_DB, migrations_dir ../../functions/db/migrations; account 0f71d46e637d75b35ce799d1e90559b3. Verify 0019 alone is pending. Never target opencourts-courts or main. Then build and deploy feature/play-together Preview only when authorized. Current live Preview remains 8019d3ea. Includes previous local role UI and inline invitations, also awaiting Preview.

## November 18 ? Group leadership and role assignment revision

Latest approved rule supersedes earlier multiple-role/ownership-transfer decisions: one permanent primary Owner; at most one active Co-owner and one active Organizer; other players are Members. Only the Owner assigns roles. Ownership transfer is rejected server-side and removed from the UI. Co-owner retains group management; Organizer manages their own events. Existing legacy Admin records are preserved for compatibility, not newly assignable. Existing duplicate leadership records, if any, need Owner review; this task does not silently demote members.

Replaced role dropdown with descriptive Member / Organizer / Co-owner action choices, current-role indication and explicit confirmation. Atomic membership UPDATE checks the active role slot, preventing concurrent duplicate assignment; demotion/removal releases it. Existing organizer-demotion future-game handoff behavior remains. Build passed; 27 backend group tests passed. Six browser checks passed: touch and desktop role assignment, game format persistence, and player skill selection. Physical iPhone/Android verification remains pending. Browser verification log: `.wrangler/qa-audit/group-role-controls-browser.log`. No production, remote database, Git push or deployment changes.

Next design recommendation (not implemented): separate singles/doubles format, courts planned and total player capacity. Two singles courts default to four players; four doubles courts default to sixteen; permit extra rotating players. One event/session is distinct from recurring scheduling and tournament brackets. Current API and schema restrict capacity to 2/4; inspect and migrate those constraints plus capacity/race tests before implementing. Courts planned must never imply a reservation. Previous inline player invitations remain ready locally for Preview.

## November 18 ? Invitations inside game details

Implemented host-only **Invite players** within public and unlisted game details. Search discoverable players by name/general-location text and send to the current game without leaving the page. Self, blocked, inactive, participating and previously requesting players are excluded server-side. Existing atomic 10-distinct-player/game and host/recipient rate limits remain; invitations do not reserve capacity or bypass approval.

Unlisted direct invitations atomically create recipient-specific access using existing invitation-link/access tables, expiring within seven days or at game start. Hosts revoke individual access under Share this game; recipient names identify those entries. Confirmed participants retain their existing access. Unlisted invitations do not enter public discovery; notification responses require current access. No migration, production change or deployment in this task. Previous live preview remains 8019d3ea.

Validation: development build passed; 18 invitation backend tests passed, including host scoping, unlisted recipient access, revocation and approval. Four mocked browser checks passed for public/unlisted inline invitations at 375px and 1280px, including exact request payload and no horizontal overflow. Browser evidence is in `.wrangler/qa-audit/inline-invite-browser-final.log`. Physical iOS/Android retest remains necessary. Next: publish this working tree to Preview when requested, then test real two-account invitations and revocation. Dropdown selection fix from the previous task remains included.

# Play Together: start here to continue development

### November 18 - Dropdown selection-value audit and direct callbacks published

Latest Preview 8019d3ea: https://feature-play-together.opencourts.pages.dev. User reported iPhone selections reverting in player skills, game format and member roles. Initial Chrome touch/desktop request tests did not reproduce the original failure; do NOT claim a physical Safari reproduction. Replaced SiteSelect's imperative hidden-select synthetic change dispatch with direct onValueChange(string) callbacks across all 22 usages (main sort/distance/surface; creation visibility/time-zone/duration/format/skill; guest count; member role; group visibility/skill; group-invite expiry; game-invite picker; profile/player/discovery skills; discovery radius/format; report category; calendar hour/minute). Hidden native select stays for form values/validation and cannot open a native picker. Trigger blur with null relatedTarget no longer immediately discards option clicks; option click prevents label/default bubbling. Group role confirmation text now maps chosen role instead of reading event.target.selectedIndex.
Validation: six payload-level browser cases passed on touch and desktop: three successive player skills reach search URL and retain selected state on reopening; singles persists across duration/skill/title edits and submits format=singles/capacity=2/duration=90/skill=advanced; Organizer reaches role confirmation then role API and refreshed membership display. Ten existing cross-device touch/desktop cases each passed in the combined run (that run was interrupted because new payload test fixtures needed corrections; final six-case run passed). TypeScript/development build and whitespace check passed. Google and Apple true after deploy. No production/config/database changes, no Git push. Existing physical-device retest is still required. Role dropdown intentionally shows current persisted role until confirmation/refetch; cancellation leaves role unchanged.
Next: user iPhone check for actual value persistence and role confirmation. Broader old specs that use native selectOption must be migrated to real button/listbox actions before full release-suite claims. Docs/DROPDOWN_AUDIT.md contains additional audit record.


### November 18 - Privacy and information pages updated and published

Latest Preview c0e6ddbe: https://feature-play-together.opencourts.pages.dev. Updated /privacy, /about, /contact and /support; added /play-together-help with practical account/game/group/invitation/guest/safety instructions. Shared existing static page design/system theme, added privacy contents links, and help navigation in static footers/community footer. Explicit test-release status, free first release, group-preview privacy, avatar/group-cover distinctions, location/provider/analytics practices, deletion limits and retention uncertainty reflect current implementation rather than stale phase docs.
Eight responsive/theme browser cases visit all five pages at 320/390/768/1440; build and whitespace checks passed. All five extensionless hosted routes returned HTTP 200 after deployment; Google/Apple both enabled. Production deployment and both D1 bindings verified unchanged before deploy. No production settings/database or Git push changes.
Read docs/PRIVACY_CONTENT_REVIEW.md for evidence mapping and unresolved production privacy decisions: retention/backup schedules, analytics consent and invite-token URL sanitization, intended age policy/operator confirmation and region/rights review. These are NOT implemented by a notice update. No legal compliance certification or invented retention guarantees. Next: user content review on Preview, then operational follow-ups and device/release QA.


### November 18 - Latest picker fixes republished on request
Preview 935f653f: https://feature-play-together.opencourts.pages.dev. Fresh build passed; deployed asset index-B0eMN8tX.js verified contains oc-select-trigger. Google and Apple both report enabled after deployment. Same single-picker implementation tested by the ten cross-device browser-profile cases; physical iPhone Safari/Chrome retest remains. Production deployment/D1 isolation verified before publishing. No production configuration, database or Git push changes.


### November 18 - Cross-device single-picker regression verified

Expanded tests/ios-dropdown.spec.ts to ten Chromium browser-emulation cases: iPhone-sized touch, Android Pixel 7, Android Galaxy S9+, tablet touch and desktop, each in light/dark. All ten passed (46 seconds). Checks actual touch/click selections, exactly one rendered listbox, viewport width bounds, selected text, hidden native selects with aria-hidden/tabindex=-1, keyboard selection and nested calendar menu. Static scan confirms SiteSelect is the only raw select implementation. These are emulated profiles on Windows Chrome, not physical Android/iOS or Safari WebKit tests; physical device retest remains required. Test/docs changes only: deployed fix remains bb13166d on stable Preview, no new deployment needed. Production unchanged.


### November 18 - iPhone duplicate native/custom dropdown fix published

Preview bb13166d: https://feature-play-together.opencourts.pages.dev. Physical iPhone screenshots showed Safari native select opening on top of our custom listbox. Root cause: SiteSelect still focused/clicked a real select despite preventDefault handlers. Replaced interactive trigger with type=button role=combobox; native select is hidden, aria-hidden and removed from tab order, retained for form/change/validation. Shared listbox anchors/focus/keyboard now use button, so native picker has no visible interactive target. Applies to every SiteSelect consumer, including calendar time. Updated common trigger styling retains site tokens.
Eleven browser checks passed: touch selection/no native select focus across discovery, scheduling and players, keyboard selection and nested calendar menu, plus mobile/tablet/desktop navigation. Build and diff checks passed. Google and Apple readiness both true before and after deployment. No credential/config/database or production changes. Physical iPhone retest is required; desktop touch emulation does not certify native Safari behavior. Earlier selectOption/option-bound tests need migration to the new button/listbox contract in broader QA. Screenshots with d5317393 URL are immutable old builds; use stable alias above (older unique builds also fail exact-origin auth guards).


### November 18 - Google and Apple sign-in startup restored

Latest Preview fbd7a20e: https://feature-play-together.opencourts.pages.dev. User restored Google and Apple bindings manually; Google client ID is Text. User reported no saved Apple token encryption key and generated a replacement 32-byte/64-hex Preview key after being informed old encrypted Apple refresh tokens cannot be decrypted. Existing accounts/profiles were not deleted; affected users should sign in with Apple again before token-dependent actions such as account deletion. Preserve the new key securely; never print or commit it.
Live /api/auth/me now reports google=true, apple=true; Google start and Apple start both returned HTTP 200 in checks (Apple signing preparation succeeds). These checks do NOT complete interactive provider authentication/callback; user/testers must verify fresh Google/Apple login. Root cause of original missing-secret delivery remains unproven; metadata presence was insufficient. No production changes. Earlier exposed Google client secret still requires rotation in Google Cloud and Preview update; do not reproduce it.
Next: real sign-in checks before inviting testers back; add provider startup/readiness smoke checks to future preview release workflow. Handoff records outage and recovery without any credential values.


### November 18 - Google sign-in readiness restored
Preview dc89e526. User saved GOOGLE_CLIENT_ID as Text and manually resaved GOOGLE_CLIENT_SECRET as Secret. Redeployed; live /api/auth/me now google=true, apple=false. Google start returns HTTP 200 (authorization response); real end-to-end provider login still requires user/tester verification. No local credential read/upload occurred; earlier attempted transfer was blocked by approval review. Client secret appeared in user-supplied IDE context: user advised to rotate in Google Cloud and update Preview; never reproduce or commit it. Apple remains unavailable and needs separate configuration repair. Production untouched.


### November 18 - Auth outage narrowed to all provider runtime secret bindings
Screenshots confirm Preview secret names. Added safe missing-name diagnostic in auth start (no values). Live Google start lists GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET missing; Apple lists all five provider bindings missing. Metadata/encrypted dashboard placeholders cannot prove usable values. Do not repeatedly assert user entered them incorrectly. Next controlled check: make non-secret GOOGLE_CLIENT_ID a Text binding with actual ID while keeping secret credentials encrypted; verify deployment runtime. Production untouched. Completed build redeployed after diagnostic compilation; do not assume sign-in restored.


### November 18 - Preview Google sign-in still blocked after credential resave
User resaved Google credentials. Redeployed Preview b5956863, but live /api/auth/me still reports google=false/apple=false; POST /api/auth/google/start returns 503 'This sign-in option is not configured yet.' That means providerReady sees missing/empty GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET before the rate-limit check. Project metadata lists both names as secret_text in Preview only; secret API redaction alone cannot prove values are empty. Do not claim restored or assume Google test-user restrictions. Need inspect saved dashboard values/configuration or securely reinsert credentials and verify runtime. Never print secrets. Production unchanged.


### November 18 - Single community desktop header cleanup published

Latest Preview d5317393: https://feature-play-together.opencourts.pages.dev. Supersedes prior two-level desktop navigation. One header now contains Courts, Feed, Find games, My Games, Groups, Players, followed by notifications/account. Removed desktop second section bar and unused hamburger component state. Feed opts out of redundant Back to games link. Support is available alongside Privacy in community footer; Weather remains on Courts. Mobile/tablet five-tab bars and explicit area switches remain unchanged. Nine navigation tests passed across 320/375/768/1440 light/dark including visitor landing and cross-area round trips. Development build and whitespace checks passed. No production/database or Git push changes. Next: preview review and remaining full release/device QA.


### November 18 - Approved navigation sequence published

Preview e5fbae9b: https://feature-play-together.opencourts.pages.dev. Desktop main header: Explore courts, Play Together, Weather, Support. Community section tabs: Feed, Find games, My Games, Groups, Players. Community phone/tablet bar uses those same five destinations. Main phone/tablet bar: Search, Map, Courts, Dry courts, Weather. Labeled header switch links Play Together and Courts connect both areas; logo condenses at small widths to preserve 320px space. Notifications and account retained. Hamburger removed through tablet widths. No duplicate sixth bottom destination.
Bare /play-together checks auth: signed-in users replace to /play-together/feed, visitors see Find Games. Explicit hashes/query/deep URLs bypass landing redirect; Find Games points to /play-together#search and focuses input. Default Back to games targets search rather than signed-in landing. Existing saved court search location is preserved; arbitrary map pan/zoom persistence was not added.
Thirteen focused browser checks passed at 320/375/768/1440 in both themes plus visitor routing and map geolocation regressions. Development build and whitespace checks passed. No database/production changes or Git push. Old navigation/screenshot assertions in broader suites still encode six tabs/Search-first and need updating to this approved arrangement before full release QA; focused new tests are tests/navigation-sequence.spec.ts. Physical device review remains.


### November 18 - Map tab device location published

Preview 42069b81: https://feature-play-together.opencourts.pages.dev. Both mobile Map tab/switch now explicitly request browser geolocation and load courts at returned coordinates. Near me and search location controls share the same guarded request; duplicate pending requests suppressed. Browser controls whether a prompt is shown (already-granted permission will not prompt again). Permission denied/unsupported/unavailable/timeout messages now appear on the visible map, with retry, search fallback and dismiss. Existing results stay if location fails. No automatic permission request on page load. Device coordinates are used for the existing court/weather lookup, not saved to player profiles. Ten browser checks and development build passed, including coordinate-based search, permission denial in both themes, focused search fallback and existing main navigation. Physical OS location services/TWA remain device checks. No production/database changes or Git push.


### November 18 - Future-only scheduling published

Preview 7b03b291: https://feature-play-together.opencourts.pages.dev. Scheduling calendar disables past dates and previous months; today disables elapsed hours/minutes. Bounds use the selected court IANA time zone, refresh every 15 seconds, and recheck on opening/applying. Typed past values fail form validity. Existing server gameStart still rejects past, ambiguous/nonexistent DST times and starts beyond 180 days. Discovery date filters remain unrestricted. Twenty-two browser checks passed, including frozen-clock New York/Tokyo date boundaries, stale selections, mobile/desktop themes and calendar/manual court regressions. Development build passed. No production/database changes or Git push.
Next: review scheduling on Preview. Earlier requested host Invite players shortcut with game preselected and hiding declined games from public discovery remain pending implementation; do not treat the conversational recommendations as completed features.


### November 18 - Complete shared dropdown/calendar audit published

Latest Preview fc5d3849: https://feature-play-together.opencourts.pages.dev. This supersedes the earlier native/base-select CSS fix. See docs/DROPDOWN_AUDIT.md for inventory, implementation and validation.
All 20 application selects now use SiteSelect, including main-site court controls and Play Together roles/invitations/time zone. Both date fields use SiteDateField with a responsive themed calendar dialog; hour/minute use the same picker. Existing colors, icons, form data and server validation retained. Site-rendered listboxes replace browser-dependent popups, with viewport limits, wrapping, scrolling and keyboard behavior. No new framework/backend/database changes.
Final 52 browser checks and TypeScript/development build passed; earlier focused and broader group/profile/navigation checks are recorded in the audit. Open-menu and calendar screenshots inspected. Remaining: physical iOS/Android/TWA/screen-reader testing and user review. Production unchanged; source remains uncommitted, no Git push.


### November 18 - Actual open dropdown picker fix published

Preview 2fb54d45 (https://feature-play-together.opencourts.pages.dev). Previous max-width/short-label change constrained only closed fields; desktop native popup escaped the emulated phone. Shared public/interactions.css now progressively opts single selects into appearance:base-select and styles ::picker(select), matching field width, bounding viewport width/height, wrapping options, scrolling, and using existing theme/selected tokens. Native select semantics, keyboard and form handling retained; unsupported browsers retain OS-native controls. No new UI framework. Multiple/size listboxes excluded. Native Safari/Firefox/older Android pickers still need physical-device checks; do not claim identical rendering there.
Validation: 23 browser checks including actual open option rectangles at 320/375/440/768/1440 in both themes, long labels, Escape and keyboard selection, plus manual-court and invitation regressions; TypeScript/development build passed. Stable Preview CSS verified after deployment. No database, production, or Git push changes. Next: review the OPEN menus on Preview and complete physical device checks. Existing screenshot baselines may need an approved refresh for browser-drawn arrows after this global styling change.


### November 18 - Ten invitations per game approved and published

Latest preview: https://b2743afe.opencourts.pages.dev (stable https://feature-play-together.opencourts.pages.dev). Supersedes earlier local self-invitation notes and pending-limit recommendation.
Each game permits up to ten distinct player invitation records total, not ten reserved places or ten per day. Repeated sends to an existing invitee remain deduplicated. Expired, declined or accepted invites do not reopen the ten-recipient budget. Picker excludes capped games for new recipients; INSERT enforces the cap atomically alongside existing 20/hour sender and 30/day recipient limits. No migration needed. Self-send returns explicit 400 and self picker is empty; UI filters its viewer ID and rechecks the account before send. Separate accounts with matching display names remain separate identities.
Validation: 275 unit/API tests; five invitation browser checks; development build. Live isolated Preview test accepted ten synthetic invites, rejected the eleventh and self-send, deduplicated repeat sends and kept participant count at one. All synthetic fixtures removed. No production changes or Git push. Next: user review and remaining release/device checks.


### November 18 - Self-invitation investigation (local changes)
Read-only aggregate query of development D1 found zero same-account self-invitations and one invitation between distinct accounts with matching display names. Account identity uses player ID, never names/email matching. Existing discovery SQL and invitation eligibility already exclude the actor/host. Added explicit server 400 for self-send, empty self picker, viewerId-based defensive client filtering, and pre-send current-account check. Fifteen invitation API tests and development build passed. These latest safeguards have NOT been deployed. Current live preview remains 75aa19c9.
Existing limits: sender 20/hour and recipient 30/day, unique game/recipient, no capacity reservation until host approval. Proposed additional per-game limit of 10 invitees is a recommendation awaiting user decision; NOT implemented. Explain separate-account linking through Account; never silently merge matching names/emails. Production untouched.

### November 18 - Responsive create form and court-search repair (published)

Preview: https://75aa19c9.opencourts.pages.dev (stable alias https://feature-play-together.opencourts.pages.dev).
Native visibility menu now uses short Public/Unlisted labels, with explanations below; select/grid children are constrained to available width. Manual court entry accepts a facility name and address, resolves its map position using existing geocoding, and requires access confirmation. It uses the existing game court snapshot, not a catalog insertion or new migration. Auth, origin, CSRF, organizer/group permissions, capacity and rate limits remain unchanged. Server validates text, coordinates, exclusive manual/token choice, and access acknowledgement. Manual locations are organizer-supplied and have unknown access. A usable geocoded position is still required; if geocoding itself fails, retry a full address.

Root cause reproduced on deployed preview with a synthetic account: court endpoint returned its signing-key configuration 503 after address geocoding succeeded. AUTH_RATE_LIMIT_SECRET was listed in Cloudflare but unavailable at runtime. With explicit user approval, replaced only that Preview secret using a cryptographically random value, then redeployed. Normal court search at 38.8766,-77.3848 (22033) now returns HTTP 200. Synthetic fixtures removed. Old court-selection proofs expire after secret rotation; reselect a court if necessary. New fail-fast signing check avoids map-provider work when misconfigured.

Validation: 273 unit/API tests, 34 focused browser tests (including 320/440/768/1440 widths in both themes and manual submission), TypeScript/development build, and diff whitespace check passed. Create-form visual baselines refreshed. Native mobile picker presentation still benefits from physical iOS/Android testing; desktop emulation cannot certify OS-native popups. No production or D1 schema changes, no Git push. Production deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc and both database bindings remain unchanged.

Next: review normal court lookup and manual fallback on the stable preview, then continue release/device testing. Never deploy main or modify production as part of this work.


### November 18 - Published preview: player invitations and shared search

Latest deployment: https://741b0103.opencourts.pages.dev
Stable preview: https://feature-play-together.opencourts.pages.dev
Hosted bundle: index-diXCyBuI.js. This entry supersedes earlier LOCAL ONLY rollout notes below.

Published the pending flat/search-first navigation, consistent search focus/caret, mobile Players entry, public-game player invitations with normal host approval, and invitation lifecycle cleanup. Active/Unread exclude expired, completed and cancelled invitations; History retains them. Unanswered/pending invitations expire at game start; confirmed participation becomes Completed at game end. No place is reserved by an invitation. Current server permissions and time checks remain authoritative.

Migration 0018_player_game_invitations.sql applied remotely ONLY to opencourts-dev (cae4849c-3e99-4945-9d70-bef7b48707ce). Preview COURTS_DB verified isolated. Production main deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc and production D1 remains 56c414b7-aca5-429b-acfa-b9e8e87b052b. No production deployment, production migration or Git push in this release.

Validation: 271 unit/API tests; 129 Chrome browser checks including the optional layout/accessibility matrix; TypeScript and build:dev passed. Approved visual baselines refreshed. Guarded live preview acceptance workflows passed and synthetic records were removed. Its printed API counter was zero because invocation used a nested scriptblock and the counter uses script scope; assertions still executed. Physical iOS/Android keyboard, TWA and real-provider checks remain manual. Existing bundle-size warning remains.

Next: user review on this preview, especially sending/receiving a public-game invitation, normal host approval, History, and both mobile search entries. Continue remaining release/device checks from the release checklist. Keep production untouched; recurring games, native Swift and payments remain later milestones. Source changes remain in the working tree; a separate Git push was not requested for this preview release.



### November 18 - Search first and shared typing focus (LOCAL ONLY)

Latest user direction: Search/Find games is the LEFTMOST destination in both bottom bars.
Reordered DOM entries, not just CSS order, so keyboard order matches visual order.
Play Together now links to /play-together#search from other pages. On the discovery page,
tapping its Search destination focuses the actual input synchronously and preserves text
instead of reloading the page. Hash entry uses conditional autofocus and hash-change focus.

Shared search-focus.ts handles scrolling, input focus and a collapsed caret at the end of
existing text for both court and game searches. Existing shared focus-border/glow rules
remain in use; caret color follows the same theme text token. No second dark border.
Desktop current-section detection now uses destination lookup rather than array indices,
so moving Search does not highlight the wrong section.

14 focused cross-page typing/caret/border/comparison checks and development build passed.
Full browser regression and approved visual baseline refresh are recorded in the latest
verification update. Physical iOS/Android soft-keyboard appearance remains a device check;
Chrome browser tests verify DOM focus, typing and caret state, not operating-system UI.
No deployment or remote database action. Migration 0018 remains local-only and must be
applied to isolated development D1 before publishing the pending player-invitation backend.


### November 18 - Useful player discovery and mobile access (LOCAL ONLY)

User approved in-app invitations to the sender's public games, with normal host approval.
Added Players to the phone/tablet dock and Invite to game on discovered player results.
The recipient sees an inbox invitation and can Request a place; no place is reserved.
Opt-in, blocks, own-game permissions, public-only scope, duplicate/rate and capacity
checks are server-enforced. See play-together-player-invitations.md for architecture.

268 unit tests (18 suites), 107 browser checks and development build passed. New migration
0018_player_game_invitations.sql applied locally only. Hosted opencourts-dev remains 0017;
apply the reviewed development migration before any Preview deployment of this backend.
No production change, remote migration, real invitation, Git push or deployment this milestone.


### November 18 - Flat dock published to isolated Preview

User-approved manual deployment: https://b7c07c08.opencourts.pages.dev
Stable alias: https://feature-play-together.opencourts.pages.dev
Bundle index-DGGCkx1b.js; hosted shared CSS includes the uniform icon-row styles.
Search is a normal inline dock destination in both court discovery and Play Together.
Validated: 10 alignment/comparison checks, 14 navigation checks, 12 visual-baseline
checks and development build. Production deployment unchanged; Preview uses opencourts-dev.
No database migration or production change. This update and flat-dock source remain
local working-tree changes relative to the last Git push; no Git push in this publication.

Latest local design: Nov 18 flat Search tab; see the final checkpoint below.
This supersedes earlier raised-circle decisions. Not deployed yet.


## Latest verified manual Preview publication

Published application source commit `2674be8` to https://e303ef23.opencourts.pages.dev.
Stable alias https://feature-play-together.opencourts.pages.dev serves HTTP 200 with
`index-CjwFqLZq.js` and the shared interaction stylesheet. Search-focus and floating-dock
corrections verified in hosted CSS. Preview COURTS_DB remains isolated development D1.
Production remains main / 7ef38ff2 with its original D1. No migration or production deployment.
This supersedes earlier local-only styling notes. Later documentation-only commits may
trigger another feature preview without changing application code.


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


### November 18, 2026 - Flat mobile/tablet dock search tab (local)

Latest approved design supersedes the raised search-circle treatment: Search/Find games
is now a standard outline magnifier in the same row as the other dock destinations on
both court discovery and Play Together. Removed featured-circle markup and obsolete
special styling instead of adding another visual override. All dock icons use 21px,
1.9 stroke, no negative offset or circle/shadow, and at least 48px tall tab targets.
Selected-state and keyboard-focus behavior stays consistent with other tabs.

Ten comparison/alignment/theme checks passed (including 375px iPhone SE); fourteen
navigation/mobile checks passed; development build passed. Full-page visual baselines
are refreshed for the approved new row. One concurrent visual run lost its shared dev
server and was restarted independently; that interrupted run is not counted as a pass.
Changes remain local and uncommitted; no deployment, database change or production change.

Latest search-order verification: all 113 browser regression checks passed; approved
full-page baselines refreshed. Development build passed. No publication this milestone.

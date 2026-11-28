# Play Together: product decisions, architecture and progress

## Current status — November 27, 2026

This document retains the product decisions and implementation history below.
For live release state, use the [Play Together handoff](PLAY_TOGETHER_HANDOFF.md),
[release checklist](PLAY_TOGETHER_RELEASE_CHECKLIST.md), and
[Production issue handover](PRODUCTION_ISSUE_HANDOVER.md). Production and the
feature Preview are separate environments. The Production website/API has the
24-hour and 3-hour game reminder inbox path and approximate player activity
labels deployed; real reminder delivery still needs natural, platform-specific
confirmation. The owner reports the current native iOS build is in App Review.

Entries below are dated implementation snapshots. Their old shell commands,
deployment steps, and statements that something is local-only, pending rollout,
or not implemented are historical evidence; **do not execute or rely on them as
current procedures**. The current deployment and migration instructions are
centralized in [DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md) and
[DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md).

## November 24, 2026 - Capacity reduction Preview update

Published the game-capacity edit handler to the feature Preview as deployment
`6b9814ed-79a5-4066-b205-b39d1d12f7ee` (`https://6b9814ed.opencourts.pages.dev`);
the stable alias is `https://feature-play-together.opencourts.pages.dev`. This
release includes the existing server preview/demotion flow: reducing capacity
moves the newest non-host party or parties out of confirmed attendance; group
players enter the waitlist and standalone players return to pending host approval.
The host and active reserved offers are preserved. The isolated Preview build was
based on feature commit `22c0e9f` with only `functions/lib/game-edit.ts` overlaid;
the development database already had migration0031. No migration, production
deployment, Git push or unrelated working-tree change was included. Stable Preview
`/api/games` and `/play-together` returned HTTP200. Physical-device confirmation of
the four-to-two-place change remains open.

## Direct guest contract - November 20, 2026

## Current group-game policy — November 21, 2026

User clarification supersedes historical public-group event exceptions (including migration 0022 and the November 18 public-event rollout notes): **all group games are members-only, in both public and private groups**. Public visibility exposes the limited group preview, never its games. A player requests group membership first; an active Owner, Co-owner or Organizer approves the request; only then can that approved active member view/join group games, subject to capacity and existing lifecycle rules. Pending, rejected, removed and signed-out players have no group-game access. Game-host approval, invitations and shared URLs cannot substitute for membership approval. Standalone public/unlisted games retain their separate host-approval rules. Organizers approve/reject membership requests but do not gain group metadata, role-assignment, archive or other managers' game powers. Legacy Admin compatibility remains existing behavior.

Local implementation: membership checks in details, discovery/feed, participation, chat, invitations, inbox and push delivery; migration `0036_members_only_group_games.sql` restores the database participant guard and includes Organizers in membership-request notifications. This migration and server changes have **not been applied remotely**. Previously deployed behavior remains until an approved server rollout. Review existing outsider attendance/requests for a separate explicit migration decision before rollout; this migration does not silently delete historic attendance. Native group membership approval UI remains batch 6 work; native request/leave and approved-member game navigation exist.

Preview 1019f776: GET games/:id/guests includes canAddGuestsDirectly. It is true
for current active group owners/co-owners/assigned organizers or the non-group
host; it does not imply a confirmed playing place. own remains null until the
player confirms a place. POST request-guests atomically confirms eligible staff's
own guests immediately (response approved:true), subject to occupancy, reserved
places, live role/session and open-game checks. Other players create pending
requests, including when the game is full; pending requests do not reserve places.
Hosts can approve only when capacity is available at approval time. Existing
confirmed/pending guest places must be cancelled before replacement. One to three
guests, confirmed sponsor required. No schema change.
This supersedes historical blanket guest-approval descriptions below.

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

Approved feature: full group games offer Join waitlist to approved members. FIFO by created_at/player_id; each offer reserves one place for two hours or until start, whichever comes first. Player can accept or leave the queue. Expired offers become inactive and next player is promoted on game/inbox refresh. Cancelling attendance or approved guests refreshes the queue. No email/push or scheduled worker: promotion/expiry refreshes lazily through participation and inbox; do not promise background delivery. Each weekly occurrence has its own queue. Guests are not queued and follow the current role-based guest policy at the top of this document. Other players' identities are not exposed to waiting members.

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

# OpenCourts Play Together

## Current guest-request policy — November 23, 2026

This supersedes older guest-policy and rollout notes in this chronological record. In group games, group Owners, Co-owners and Organizers can directly add their own guests and approve/reject other members' guest requests; other group members submit requests. In standalone games, only the host can add guests directly or decide requests. Requests do not reserve places; full-capacity approval leaves them pending and a failed direct addition adds no guests. Role-scoped guest API deployed to feature Preview (`f6939c04`); production unchanged. See `play-together-guests.md` for details.

### November 18 - Dropdown selection-value audit and direct callbacks published

Latest Preview 8019d3ea: https://feature-play-together.opencourts.pages.dev. User reported iPhone selections reverting in player skills, game format and member roles. Initial Chrome touch/desktop request tests did not reproduce the original failure; do NOT claim a physical Safari reproduction. Replaced SiteSelect's imperative hidden-select synthetic change dispatch with direct onValueChange(string) callbacks across all 22 usages (main sort/distance/surface; creation visibility/time-zone/duration/format/skill; guest count; member role; group visibility/skill; group-invite expiry; game-invite picker; profile/player/discovery skills; discovery radius/format; report category; calendar hour/minute). Hidden native select stays for form values/validation and cannot open a native picker. Trigger blur with null relatedTarget no longer immediately discards option clicks; option click prevents label/default bubbling. Group role confirmation text now maps chosen role instead of reading event.target.selectedIndex.
Validation: six payload-level browser cases passed on touch and desktop: three successive player skills reach search URL and retain selected state on reopening; singles persists across duration/skill/title edits and submits format=singles/capacity=2/duration=90/skill=advanced; Organizer reaches role confirmation then role API and refreshed membership display. Ten existing cross-device touch/desktop cases each passed in the combined run (that run was interrupted because new payload test fixtures needed corrections; final six-case run passed). TypeScript/development build and whitespace check passed. Google and Apple true after deploy. No production/config/database changes, no Git push. Existing physical-device retest is still required. Role dropdown intentionally shows current persisted role until confirmation/refetch; cancellation leaves role unchanged.
Next: user iPhone check for actual value persistence and role confirmation. Broader old specs that use native selectOption must be migrated to real button/listbox actions before full release-suite claims. Docs/DROPDOWN_AUDIT.md contains additional audit record.


### November 18 - Privacy and information pages updated and published

Latest Preview c0e6ddbe: https://feature-play-together.opencourts.pages.dev. Updated /privacy, /about, /contact and /support; added /play-together-help with practical account/game/group/invitation/guest/safety instructions. Shared existing static page design/system theme, added privacy contents links, and help navigation in static footers/community footer. Explicit test-release status, free first release, group-preview privacy, avatar/group-cover distinctions, location/provider/analytics practices, deletion limits and retention uncertainty reflect current implementation rather than stale phase docs.
Eight responsive/theme browser cases visit all five pages at 320/390/768/1440; build and whitespace checks passed. All five extensionless hosted routes returned HTTP 200 after deployment; Google/Apple both enabled. Production deployment and both D1 bindings verified unchanged before deploy. No production settings/database or Git push changes.
Read docs/PRIVACY_CONTENT_REVIEW.md for evidence mapping and unresolved production privacy decisions: retention/backup schedules, analytics consent and invite-token URL sanitization, intended age policy/operator confirmation and region/rights review. These are NOT implemented by a notice update. No legal compliance certification or invented retention guarantees. Next: user content review on Preview, then operational follow-ups and device/release QA.


### November 18 - iPhone duplicate native/custom dropdown fix published

Preview bb13166d: https://feature-play-together.opencourts.pages.dev. Physical iPhone screenshots showed Safari native select opening on top of our custom listbox. Root cause: SiteSelect still focused/clicked a real select despite preventDefault handlers. Replaced interactive trigger with type=button role=combobox; native select is hidden, aria-hidden and removed from tab order, retained for form/change/validation. Shared listbox anchors/focus/keyboard now use button, so native picker has no visible interactive target. Applies to every SiteSelect consumer, including calendar time. Updated common trigger styling retains site tokens.
Eleven browser checks passed: touch selection/no native select focus across discovery, scheduling and players, keyboard selection and nested calendar menu, plus mobile/tablet/desktop navigation. Build and diff checks passed. Google and Apple readiness both true before and after deployment. No credential/config/database or production changes. Physical iPhone retest is required; desktop touch emulation does not certify native Safari behavior. Earlier selectOption/option-bound tests need migration to the new button/listbox contract in broader QA. Screenshots with d5317393 URL are immutable old builds; use stable alias above (older unique builds also fail exact-origin auth guards).


### November 18 - Google and Apple sign-in startup restored

Latest Preview fbd7a20e: https://feature-play-together.opencourts.pages.dev. User restored Google and Apple bindings manually; Google client ID is Text. User reported no saved Apple token encryption key and generated a replacement 32-byte/64-hex Preview key after being informed old encrypted Apple refresh tokens cannot be decrypted. Existing accounts/profiles were not deleted; affected users should sign in with Apple again before token-dependent actions such as account deletion. Preserve the new key securely; never print or commit it.
Live /api/auth/me now reports google=true, apple=true; Google start and Apple start both returned HTTP 200 in checks (Apple signing preparation succeeds). These checks do NOT complete interactive provider authentication/callback; user/testers must verify fresh Google/Apple login. Root cause of original missing-secret delivery remains unproven; metadata presence was insufficient. No production changes. Earlier exposed Google client secret still requires rotation in Google Cloud and Preview update; do not reproduce it.
Next: real sign-in checks before inviting testers back; add provider startup/readiness smoke checks to future preview release workflow. Handoff records outage and recovery without any credential values.


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


For agent continuity, first read [the development handoff](PLAY_TOGETHER_HANDOFF.md).

Central product and engineering reference. Last updated: November 17, 2026.
Current deployment: isolated Preview65f4d761, development migrations through0017.
Accounts/profiles, three game audiences, groups/roles/invitations, guest capacity,
feeds/notifications, sharing, opt-in discovery, blocking and reporting are implemented.
See [current handoff](PLAY_TOGETHER_HANDOFF.md),
[sharing/safety architecture](play-together-sharing-safety.md), and
[release acceptance checklist](PLAY_TOGETHER_RELEASE_CHECKLIST.md).
Owner/Co-owner/Organizer/Member roles ARE deployed; legacy Admin mapping is preserved.
All first-release features are free. Production, payments and native Swift remain untouched.
Real-device/provider acceptance and operational release gates are still pending.

Earlier proposals and chronological checkpoints below are historical; the handoff
and latest decision log supersede them.

## 1. Product vision

Play Together is a tennis-focused community platform within OpenCourts. Players
will find games, organize matches, and join tennis groups at existing OpenCourts
locations. Recurring games, leagues, and tournaments are future extensions.
Creating a game does not reserve a court or guarantee court availability.

Release one must support public games, invitation-shared unlisted games with
explicit joining permission, and private groups with member-only games. Private
groups are required, not deferred. Both public and private groups are discoverable
in release one. Private means private content, not hidden existence. No hidden or
unlisted group type is approved; unlisted games remain a separate supported concept.

## 2. Platform strategy

- Build the website first, supporting desktop and mobile browsers.
- Android currently displays the website through a Trusted Web Activity (TWA).
- Native Swift iOS integration comes later; design account identity and APIs for it now.
- All platforms share the same OpenCourts account, group memberships, roles and
  server-verified subscription entitlements. A platform purchase is linked to that
  account; do not create unrelated accounts or group lists per device/store.
- Cloudflare Pages Functions and D1 remain the backend. No Firebase or Supabase.
- Existing Android release and Swift code remain untouched during web development.

## 3. Membership and business model

| Concept | Product rule | Status |
| --- | --- | --- |
| Player account | Free account for identity, profile and participation | Implemented and deployed to Preview; both logins user-verified |
| Group membership | Free membership governed by group permissions and approval | Decided; not implemented |
| Basic organizer | Free ability to organize games/groups; limits unresolved | Decided; not implemented |
| Organizer Pro | Future optional paid organizer capabilities | Planned; entitlements unresolved |
| Pro pricing | Tentative $29.99/year | Provisional, not a published commitment |

**All first-release features are free.** Ordinary players should not have to pay
to join games or groups. There are no paid individual group memberships in the
current scope. Do not introduce paywalls, purchase prompts, checkout, or payment
dependencies during release one. Free organizer limits and future Pro benefits
must be approved before enforcement. Group membership and paid subscription
membership are separate concepts and records. Payment never bypasses group approval.

## 4. Group privacy and permissions

### Group visibility

**Latest approved rule: both public and private groups appear in discovery/search.**
Every private group has a discoverable preview in release one. Nonmembers may see
only its name, optional explicitly public description, general location, private
badge and Request to Join action (plus routing identity needed to open that preview).
Never expose a precise private address or infer one from search coordinates.
Skill preferences may exist internally but are not an approved private-preview field.

Nonmembers must not see member names/profiles, games/schedules, court locations,
meeting times, participant lists/RSVPs, discussions/announcements, invitations or
membership-management information. Pending, rejected, removed and former members
receive only the same public preview, not private access. A forwarded group or game
URL grants no additional access. Group-only games remain excluded from public game
search even though their parent group's preview is discoverable.

Public groups are discoverable and may display a more detailed public description
and other explicitly approved public fields. Their member lists and members-only
activities remain restricted to approved active members. Additional public fields
must be deliberately allowlisted, never obtained by returning whole database rows.
Public group joining policy remains to be confirmed; public visibility is not
automatic membership or permission to view members-only content.

Removal revokes authorization on requests after it commits. Already seen content
or screenshots cannot be withdrawn. No hidden/unlisted group option may be added
without later approval. This decision supersedes the earlier hidden-private-group
rule and resolves the previous public-group discovery scope question.

Group fields: name, separate public/members-only descriptions, general location and optional skill preference.

### Latest approved roles (November 17, 2026)

**Approved design, NOT implemented yet:** Owner, Co-owner, Organizer and Member.
This supersedes the earlier owner/admin/member target model and the rule allowing
every member to create group games. All first-release roles remain free.

There is exactly one primary Owner. Only that Owner may transfer ownership,
appoint/remove Co-owners or archive the group. A Co-owner otherwise helps manage
the group, memberships, ordinary member/Organizer roles and all group events.
Co-owners cannot remove/demote each other or the primary Owner. An Organizer may
create group events and manage participation/guest requests for THEIR OWN events;
they cannot approve group membership, manage group roles/settings, or control
another Organizer's events. Members participate but cannot create group events.
All authority requires active approved membership and must be enforced server-side.

| Action | Owner | Co-owner | Organizer | Member |
| --- | --- | --- | --- | --- |
| View members-only content / join group games | Yes | Yes | Yes | Yes |
| Edit group settings / approve group membership | Yes | Yes | No | No |
| Remove ordinary members or Organizers | Yes | Yes | No | No |
| Assign/demote Organizer roles | Yes | Yes | No | No |
| Appoint/remove Co-owners | Yes | No | No | No |
| Transfer primary ownership / archive group | Yes | No | No | No |
| Create group events | Yes | Yes | Yes | No |
| Edit/cancel events / approve event or guest requests | All group events | All group events | Own events only | No |
| Leave group | Transfer ownership first | Yes | Yes | Yes |

**Currently deployed:** one Owner, legacy Admin and Member. Co-owner/Organizer roles
and group events DO NOT exist in current schema/UI. Do not describe them as deployed.
Legacy Admins cannot manage peer Admins or promote themselves. Define and review a
migration before changing roles: do not silently grant existing Admins Co-owner
powers or automatically make ordinary Members Organizers. Existing membership
approvals/removal/privacy must keep working during that transition.

Group-only games, invitation management and role-change/event ownership lifecycle
are the next implementation work. On member removal/departure, future work must
atomically release their member-plus-guest places and revoke private game access.
Decide whether their upcoming organized events transfer to the Owner or cancel;
do not silently choose ownership behavior without documenting the plan. Owner
account deletion currently requires transfer/archive; owned archived groups are
deleted with the account as disclosed in the UI.

### Membership request and approval workflow

1. Visitor discovers either group type. A private-group result contains only its
   approved public preview. Request to Join prompts sign-in when necessary.
2. A signed-in player submits a membership request. Create at most one current
   membership record per group/player; retries do not duplicate requests.
3. Pending status grants no access to private content. The requester may receive
   a separate minimal acknowledgement of their own request, not the request queue,
   invite state, admin identities or other membership-management information.
4. An active group owner/authorized admin reviews and approves or rejects requests.
   Approval, not possession of a link, transitions the player to active membership.
5. Direct invitations permit the same request workflow and never bypass approval.
   Revalidate token validity, revocation/expiry and inviter permission server-side.
6. Rejection grants no access. Removal revokes active access immediately on subsequent
   requests, including shared links and game participation; a fresh approval is
   required for readmission. Clear revoked private content from the client UI.

Public-group request/approval behavior is provisionally the same safe workflow;
any open-join option requires an explicit product decision before implementation.

### Game permission matrix (planned)

Eligibility always includes account status, blocks, game status/time, capacity,
and any explicit skill requirement. Skill preferences alone are advisory.

| Action | Public game | Unlisted game | Group-only game |
| --- | --- | --- | --- |
| Discover | Public search | Never public search | Active members' group views only |
| View details | Safe public details | Organizer/approved participants; valid invite shows limited summary only | Approved active group members only |
| View participants | Proposed authenticated eligible viewers, limited profile fields | Organizer/approved participants | Approved active group members |
| Create | Signed-in player | Signed-in player | Approved active member |
| Join | Eligible signed-in player | Invitation request plus explicit organizer approval | Eligible approved active member |
| Leave | Self | Self | Self while active; removal also revokes participation |
| Edit/cancel/manage participants | Organizer | Organizer | Organizer for own events while active, group Owner/Co-owner for all group events |

My Games and profile activity must filter through current access, including old
participation. Do not expose private affiliations, emails, identity subjects,
invitation secrets or exact home locations in API responses. Only minimal display
name/skill projections may be returned when authorized.

### Invitations, authorization and integrity

- Enforce every read and mutation server-side using authoritative account,
  membership and role data. Hidden controls and client role claims are insufficient.
- Enforce the private/public preview boundary in Cloudflare Pages Functions. Use
  separate allowlisted preview and member-content projections, with authorization
  before querying/serializing private fields. Search must not leak private content
  through filters, snippets, sort keys, counts, metadata or error messages.
- Shared links/social previews, API responses and notifications must respect the
  same boundary. Notifications to nonmembers contain no private content. Queued
  private notifications must recheck active membership before dispatch so removal
  revokes delivery as well as API access. Do not include private payloads in push
  previews or third-party notification services without a separately approved design.
- Search/preview caches, if used, may contain only the approved public projection.
  Member-only content must never enter those responses or caches. Add tests using
  private sentinel values across search, previews, shared links and notifications.
- Invitations must be difficult to guess, revocable and optionally expiring.
  Proposed design: at least 256 random bits, hash-only storage, default expiration,
  bounded uses, and replay-safe redemption. A group invitation permits requesting
  membership, not approval. Rejoining after removal needs a fresh admin decision.
- Proposed transport: URL fragment -> POST exchange, then clear the token from the
  address bar. No secret URLs/bodies in analytics or logs; no-referrer invitation
  landing page. GET/prefetch must never consume an invite or approve membership.
- Check membership inside protected reads/mutations; use authoritative consistency
  for revocation. Never serve private content from stale edge/browser caches.
  Private/personalized responses use `private, no-store`; clear private UI on access loss.
- Unique membership and participation keys prevent duplicates. Atomic conditional
  operations plus database invariants prevent overbooking and approval races.
- Owner transfer, member removal, invitation consumption and related game cleanup
  must be atomic. Test actual local D1/SQLite behavior, not only mocks.
- Session cookies, CSRF/Origin validation, rate limits, bounded queries and input
  validation are required. No wildcard CORS on private APIs.
- Blocking/reporting are release requirements. Their detailed effects on existing
  shared groups/games and the site moderation process remain provisional.

## 5. Cross-platform subscriptions (future, not implemented)

Use Apple StoreKit 2 for applicable native iOS subscriptions, Google Play-compliant
payments for Android, and a future web payment provider. Android TWA payment
integration and applicable store rules must be reviewed when implementing billing;
do not assume a generic web checkout is suitable. No payment provider is selected
or provisioned. Recheck current store policies and official APIs at implementation.

Proposed architecture:

- Account-linked subscription records identify provider, product, subscription
  reference, verified status, validity period and cancellation/renewal information.
- Server verifies purchases and signed provider events; clients cannot grant Pro.
- Deduplicated provider events handle renewals, refunds, revocations, expiration
  and reconciliation. Cancellation may stop renewal without immediately ending
  already paid access; derive access from verified provider state.
- Restore purchases and link them safely to the correct OpenCourts account.
  Prevent the same store purchase being claimed by multiple accounts; define
  recovery/transfer procedures before implementing them.
- Central entitlement checks provide consistent access on all supported platforms,
  subject to applicable store policies. Never cache permanent Pro flags in clients.
- Handle grace periods, billing retry, overlapping subscriptions and product mapping
  explicitly. Final entitlements and provider lifecycle rules remain undecided.

No billing schema migrations or purchase code are authorized by this documentation.

## 6. Technical architecture

The deployment boundary and current release commands changed after the
architecture notes below were first written. For present-day environment
bindings, deployment steps, rollback, and platform separation, use the
[current deployment architecture handoff](DEPLOYMENT_ARCHITECTURE.md). The
table below describes the current implementation; older planning details later
in this section remain historical unless explicitly marked current.

### Existing and verified

| Area | Current repository evidence |
| --- | --- |
| Frontend | React 18, TypeScript, Vite; `src/App.tsx`, `src/services.ts`, `src/styles.css`; MapLibre and Lucide |
| Backend | Production API Worker `opencourts-api-production` routes `opencourts.us/api/*`; Worker adapter imports shared handlers in `functions/api/` and `functions/lib/` |
| D1 | Production Worker binds `COURTS_DB` to `opencourts-courts`; Preview Worker uses isolated `opencourts-dev` |
| Migration | Production Pages is static-only; Preview has a Pages middleware bridge to its separate API Worker; neither frontend release deploys Worker code |
| Existing API | Courts, court context, geocoding, suggestions, rain, weather, weather alerts, games, players, groups, discussions, media, auth and push routes |
| Authentication | Owner confirmed Google and Apple sign-in work on Production web and native iOS after correcting the Apple private-key PEM; full Preview callback acceptance remains unconfirmed |
| Tests | Vitest, real SQLite auth tests, Playwright account tests and light/dark visual baselines |
| Android | `android-app/` TWA launches `https://opencourts.us/`; website assets and signed wrapper releases are separate |
| iOS | Native project in `ios-app/`; the native app uses the Production API origin and has a separate Xcode/store release |

Production Pages project `opencourts` serves only the static frontend. The
Production API Worker owns `/api/*`. Preview uses
`https://feature-play-together.opencourts.pages.dev` and a separate API Worker
and database. See the deployment handoff for current deployment IDs and
environment bindings.

Local tooling in `scripts/dev-environment.mjs` forces local migration/seed targets
and rejects additional CLI flags. SQLite persists under `.wrangler/play-together-local`.
Both Vite production API fallbacks were removed. Fast Vite mode has no D1 binding;
use `npm run dev:pages` for database testing. Public upstream services may still
be called. No game/account write may fall back to production.

### Proposed application architecture

Pages handlers delegate to shared identity, policy, validation, group and game
services. One game model and service support all three audiences. Use same-origin
web API calls and explicit response projections. Missing bindings fail closed.
Phase 1 adds explicit feature flag/origin/host/branch gates. Production settings
remain untouched; the API denies production hosts and the main branch.

**Approved providers: Google and Apple only.** No email/password login. OAuth
processing uses maintained `oauth4webapi`; `jose` handles Apple credential signing
and encrypted revocation tokens. Arctic was removed after its deprecation was found.
Web sessions use hashed opaque tokens and host-only HttpOnly cookies (Secure on
HTTPS), with a seven-day lifetime. Explicit recent-session linking connects both
providers to one player ID; email matches never merge accounts. Recovery relies
on the provider or a linked second provider. Native endpoints remain future work;
never ship OAuth client secrets inside native apps.

See [Phase 1 implementation and provider setup](play-together-authentication.md)
for exact endpoints, environment variables, migration and validation limits.

### Tables and relationships

Phase 1 auth tables and Phase 2 `games`/`game_participants` are implemented locally and in isolated development D1. Group, safety, subscription and native tables/routes remain proposed. See [Phase 2 implementation](play-together-games.md).

| Tables | Purpose/relationships |
| --- | --- |
| `players`, `auth_identities`, `auth_sessions`, `auth_login_attempts` | Implemented in `0002_player_auth.sql`: private identities, revocable sessions, expiring browser-bound OAuth flows and throttling; unique issuer/subject and token hashes; encrypted Apple revocation credential |
| `tennis_groups`, `group_memberships`, `group_notifications` | Implemented locally in0009/0010: group ownership, public previews, member/admin approval states and private notifications; unique group/player |
| Implemented `games`, `game_participants`; proposed `game_join_requests` | Shared visibility model, organizer, nullable group, location snapshot, UTC time plus IANA zone, capacity, status; unique game/player participation and requests |
| `group_invitations`, `game_invitations`, `invitation_redemptions` | Hashed revocable tokens, expiration/use limits and replay-safe per-account redemption |
| `player_blocks`, `reports`, `activity_audit` | Safety, restricted moderation, minimal audit events |
| Future `subscriptions`, `subscription_events`, entitlement mapping | Verified provider state linked to player; unique provider subscription/event references; final schema deferred |

Foreign keys, CHECK constraints, unique keys, conditional writes and indexes enforce
integrity. Group ID is required exactly for group-only games. Query indexes cover
game visibility/status/start time, group/time, memberships/player/state and tokens.
Snapshot court identity/name/coordinates server-side from validated OpenCourts
locations; avoid destructive foreign-key coupling to the refreshable court catalog.
No existing court records/schema changes are required for this planning task.

### API areas (Phases 1 and 2 implemented; later areas proposed)

| API area | Intended endpoints/authorization |
| --- | --- |
| Auth/profile | Implemented `/api/auth/{google,apple}/start` and callback, GET/PATCH/DELETE `/api/auth/me`, POST logout/logout-all; private own-profile projection. Public player profiles/discovery are later work |
| Public games | Implemented GET/POST `/api/games`, GET `/api/games/courts` and GET `/api/games/:id`; public-only reads, authenticated CSRF-protected creation with signed court proofs |
| Individual games | Authorized GET/PATCH `/api/games/:id`, cancellation, self join/leave; same policy service for all audiences |
| My Games | `/api/me/games`, filtered by current access |
| Groups | Public search/previews for both group types; `/api/me/groups`, authorized private detail/create/edit/archive/ownership transfer; only allowlisted preview fields to nonmembers |
| Members | Authorized member list, own membership request/leave, admin approve/reject/remove, owner role changes |
| Group games | `/api/groups/:id/games`, active members only, delegates to common game service |
| Invitations | Authorized issue/revoke, POST preview/redemption, unlisted join-request review |
| Safety | Opt-in player search, own blocks, reports and restricted moderator review |
| Future billing | Provider verification/notifications/restore and entitlement reads; paths undecided |

See [implementation design](play-together-implementation-plan.md) for the earlier
detailed proposal and [development guide](play-together-development.md) for setup.
This central reference records subsequent free-tier, subscription and roadmap
decisions; provisional details in either document must not be treated as approved.

## 7. Design requirements

Extend existing OpenCourts design, without a new palette or UI framework. Inspect
the final CSS cascade and existing components before building UI. Reuse CSS
variables (`--bg`, `--surface`, `--text`, `--muted`, `--line`, `--green`, `--lime`),
fonts, buttons, cards, forms, icons, radii, shadows, spacing and interaction styles.

Theme state is now shared through `src/useTheme.ts` by `App.tsx` and
`PlayerAccount.tsx`, under the existing `.app`/`.app.dark` variables. System mode
tracks device changes automatically on every page. Manual theme buttons and
overrides were removed at the user's request; the old `opencourts-theme` key is
cleared. Device preference remains authoritative across reload/navigation.
The existing tennis-ball mark was extracted unchanged for reuse. Account helper
text derives its muted color from existing tokens to meet small-text contrast;
unrelated court styling is unchanged.

All screens, dialogs and loading/empty/success/error/denied states need light/dark
contrast, keyboard/focus support and touch-friendly responsive layouts. Preserve
the existing mobile navigation style; test desktop, Mobile Safari, Mobile Chrome
and Android TWA. Add visual regression coverage for both themes where practical.
Small necessary style extensions must be explained; do not redesign unrelated UI.

## 8. Development roadmap

| Phase | Scope | Release |
| --- | --- | --- |
| 1 | Authentication and basic player profiles; cross-platform account identity | First release |
| 2 | Public game discovery, creation and details; shared audience-aware schema | First release |
| 3 | Join/leave, capacity safeguards, My Games and organizer controls | First release |
| 4 | Discoverable groups, safe previews, My Groups, legacy owner/admin membership controls and notifications | Deployed to isolated Preview; manual acceptance open |
| 5 | Approved Owner/Co-owner/Organizer/Member roles, safe migration, secure invitations, protected group games and member-brought guests | Next; required first release |
| 6 | Sharing, unlisted games/approvals, privacy, player discovery, blocking/reporting | First release |
| 7 | Final testing, accessibility, security and Android compatibility | First release gate |
| 8 | Recurring events first; advanced organizer features, leagues/tournaments later | After first release |
| 9 | Approved Organizer Pro limits/pricing, billing and verified cross-platform entitlements | Future |
| 10 | Native Swift Play Together integration, including applicable StoreKit 2 purchases | Later; billing/integration dependencies reviewed together |

Testing accompanies every phase. First release cannot omit private groups or their
authorization tests. Implement one reviewed milestone at a time. Plan approval is
not approval for production deployment, remote migrations, pushes or billing setup.

## 9. Implementation progress

Allowed statuses: **Not started**, **In progress**, **Completed**, **Blocked**.
Completed requires implementation and verification, not a proposal. No feature is
marked Blocked merely because it awaits ordinary planning/approval.

| Status | Milestone | Evidence / remaining work |
| --- | --- | --- |
| Completed | Repository and branch inspection | OpenCourts remote, `feature/play-together`, React/Pages/D1 files inspected |
| Completed | Local isolation tooling | `scripts/dev-environment.mjs`, `development/wrangler.local.json`, `vite.config.ts`; local migration/seed/query/API passed; remote flag override rejected |
| Completed | Dev database and Preview D1 separation | Verified distinct UUIDs above; preview metadata confirmed `preview` environment and dev binding; production deployment/binding unchanged |
| Completed | Court-only dev schema and seed | `0001_create_tennis_courts.sql`, `development/courts.seed.sql`; remote count 3; preview API returned `way/40881080` |
| Completed | Baseline build/unit checks | Build passed with bundle-size warning; 155 existing tests passed on November 17, 2026; these do not prove new feature correctness |
| Completed | Central planning documentation | This file, README link, related design/setup notes; reviewed against repository and session evidence; documentation diff checks passed |
| In progress | Phase 1 end-to-end authentication | Schema/API/UI implemented; remote dev migration and preview deployment approved/completed. Both provider starts verified; both Google and Apple login confirmed by user. Profile save/link/logout/deletion manual checks remain open |
| Completed | Phase 1/2 automated verification | Full unit suite: 199 passed; full browser suite: 26 passed, including theme/mobile visual checks; development build and local Pages smoke checks pass |
| Completed | Phase 2 implementation and development rollout | Public discovery, creation and details; 0003 applied only to local/dev D1; Preview deployed with user approval November 17, 2026. User game-creation verification pending |
| Completed | Phase 3 implementation and automated acceptance | Deployed Preview b5f880ff; migrations0004-0008 applied to dev. 216 unit /36 browser tests pass. Real provider/device manual acceptance remains open |
| Completed | Phase 4 core implementation/development rollout | Groups and legacy owner/admin membership controls deployed to Preview a9127653; dev0009/0010 applied. Real device/two-account acceptance remains open |
| Not started | Phases 5-7 | Invitations, group games/guests and remaining release features follow |
| In progress | Feature browser/device/visual/security verification | Local Chrome coverage exists; native/TWA, Mobile Safari, privacy-policy/security review, real profile lifecycle and remote write-isolation checks pending |
| Not started | Phase 8 recurrence and advanced tools | No scheduler/series schema |
| Not started | Phase 9 subscriptions | No payments, entitlements or provider provisioning |
| Not started | Phase 10 native integration | No Play Together Swift changes |

`development/games.fixture.json` is synthetic planning data only, not a feature
implementation or loaded game schema. Local changes remain uncommitted;
direct Preview deployments did not push to GitHub. Shared KV/other optional bindings,
browser network isolation and remaining checklist items are not certified by the
D1 binding checks. No production database mutation has been performed.

## 10. Decision log

Dates below record this session's November 17, 2026 decisions, not future launches.

| Date | Decision | Reason / alternatives | Status |
| --- | --- | --- | --- |
| 2026-11-17 | Preserve React/Pages/D1 and isolate dev | Reuse code/infrastructure; Firebase/Supabase excluded | Final constraint |
| 2026-11-17 | Web first, Android TWA, native iOS later | Deliver through existing website; separate native rewrite deferred | Final sequence |
| 2026-11-17 | Private groups in first release | Required private tennis organization; earlier later-phase placement rejected | Final |
| 2026-11-17 | Public/unlisted/group-only games share management logic | Avoid duplicated capacity/permission behavior; separate game implementations rejected | Final architecture requirement |
| 2026-11-17 | Server authorization for private content | Forwarded URLs must not bypass membership; link secrecy/client-only gates rejected | Final |
| 2026-11-17 | Match existing design and theme | Natural website extension; independent theme/framework rejected | Final constraint |
| 2026-11-17 | Shared identity, memberships and future entitlements | Cross-device/platform continuity; per-platform siloed accounts rejected | Final requirement |
| 2026-11-17 | Free players/groups/basic organizers; release one free | Avoid participation payment barriers; paid group entry excluded from scope | Final first-release rule |
| 2026-11-17 | Future Organizer Pro at tentative $29.99/year | Possible organizer business model; final price/limits/benefits not selected | Provisional |
| 2026-11-17 | Apple StoreKit 2, compliant Android billing, future web provider | Platform-compatible future purchases; no payment processing now | Direction decided; implementation/providers pending |
| 2026-11-17 | Public groups added to requested roadmap | Earlier draft was private-only; public metadata and join behavior required confirmation | Discovery question resolved by latest decision below; joining policy open |
| 2026-11-17 | Google OIDC and hashed web sessions proposed | Avoid password/email-delivery complexity; alternative providers/account recovery undecided | Superseded by approved Google + Apple decision below |
| 2026-11-17 | Ten documentation milestones | Explicitly separates group setup, invites, release validation and future business/native work | Current requested roadmap |
| 2026-11-17 (latest) | Both public and private groups discoverable; private means private content | Allow players to find groups while limiting private previews to name, optional public description, general location, private badge and Request to Join. Supersedes earlier hidden-private-group rule; no hidden/unlisted groups in release one | Approved; replaces earlier visibility policy |
| 2026-11-17 (latest) | Private membership always requires owner/authorized admin approval, including invitations | Discoverability and forwarded links must not grant access; enforce previews, private data, removal and notifications server-side | Approved; all first-release features remain free |
| 2026-11-17 | Google and Apple only for Phase 1 | User approved cross-platform social sign-in; password/email login excluded; explicit linking instead of email matching | Approved; deployed to Preview, both provider logins user-verified |
| 2026-11-17 | oauth4webapi plus jose | Arctic was discovered deprecated; use maintained WebCrypto-compatible protocol/signature libraries, D1-owned identities and sessions | Implemented locally |
| 2026-11-17 | Phase 1 privacy/session lifecycle | Seven-day hashed sessions, recent-auth linking/deletion, encrypted Apple revocation credential and CSRF/Origin checks; no paid access fields | Implemented and locally tested |
| 2026-11-17 | Phase 1 development rollout approved | User configured Preview secrets; applied 0002 only to opencourts-dev and deployed feature branch. Both provider starts verified; production deployment/database binding unchanged | Completed; both provider logins subsequently user-verified |
| 2026-11-17 | Automatic device theme only | User requested removing the header theme button; shared matchMedia listener follows live device changes and ignores/removes old manual overrides | Approved; deployed and verified on Preview |
| 2026-11-17 | Separate community home from account settings | Play Together must lead to games/groups; move account/profile controls to a right-hand icon and `/account`, with shared responsive navigation | Approved; deployed and verified on Preview |
| 2026-11-17 | User reports preview sign-in working | Records user verification without assuming both providers or other account actions were tested | Verified by user; provider unspecified |

## 11. Open questions

- Confirm public-group joining policy (approval-required proposed; no open join
  approved) and any public fields beyond description/general location. Both group
  types' discovery, private previews and protected member content are now decided.
- Verify real Google/Apple callbacks and native/web Apple identity association,
  provider account-change handling and later native
  exchange/purchase restoration. Provider selection is resolved; native endpoints
  and recovery beyond the providers/explicit linking are deferred.
- Approve detailed permission defaults: public participant visibility, unlisted
  summary fields, ownership transfer/organizer departure and blocking consequences.
- Define free organizer limits, group-size/invitation limits and abuse limits without
  contradicting free first-release participation.
- Finalize Organizer Pro price, premium entitlements, currencies, trials/grace
  behavior and overlapping cross-platform subscriptions.
- Select Android purchase integration and future web provider; review current store
  requirements before implementation, not from this planning document alone.
- Decide notifications, moderation staffing/tools, retention/privacy policy,
  account deletion effects and any minimum-age rules before public release.
- Define recurrence/league/tournament scope after release one, and exact timing of
  native iOS relative to paid subscriptions.
- Resolve existing MapLibre critical sanitizer advisory before public account
  rollout; assess a major-version upgrade separately. Update production privacy
  disclosures before collecting real accounts; do not silently change production.

## Maintenance contract

Before coding any Play Together change, read this document and follow its business,
privacy and permission rules. After implementing, update affected sections, progress,
decision log, migrations/endpoints, tests performed and outstanding issues. Keep
existing/proposed labels accurate. Do not mark milestones complete without evidence.

If a new instruction conflicts with a recorded decision, flag it and ask for
clarification rather than silently changing business logic. New ideas are provisional
until approved. Keep related implementation/setup documents aligned. Work on
`feature/play-together`; do not change production resources/settings for this work.

Latest preview verification (November 17, 2026): deployment `36f69d2d` is Preview on
`feature/play-together`, bound to development D1. Fresh Chrome verified community
and account routes, right-hand account icon, no theme toggle and live system-theme
changes. Both providers remain enabled; production deployment and binding unchanged.
Safe diagnostics pass 27 local auth tests; actual Apple callback diagnosis awaits retry.

Apple troubleshooting update: user replaced APPLE_PRIVATE_KEY but had not redeployed.
Refreshed the same approved preview build as deployment `e8da7031` to load the
updated secret. Real Apple callback/signing verification still requires a fresh
user sign-in attempt; do not mark Apple working based only on provider readiness.

Apple signing diagnosis: preview `b66fdceb` now validates key import/signing before
redirecting. It accepts raw/quoted/escaped/flattened PEM, with 29 auth tests passing.
Safe remote preflight still reports apple-key-format: configured APPLE_PRIVATE_KEY
does not match a complete PEM envelope/base64 body. Actual contents were never read
or exposed. User must replace Preview secret with the actual full Apple .p8 text;
key format, rather than Apple authorization or account linking, is the current blocker.

Apple signing follow-up: user saved full PEM including header/footer. Preview
`6a6270c8` loaded the corrected secret; live Apple start returned HTTP 200 and
passed actual key import/ES256 signing preflight. Production deployment and D1
binding unchanged. Full Apple user authorization/token callback remains to test.

User verification (November 17, 2026): Apple login completed successfully after
the signing-key correction. Both approved sign-in providers are now user-verified.

### November 17, 2026: Phase 2 preview rollout

User approved development migration and Preview deployment. Only `0003_public_games.sql` was pending and applied to `opencourts-dev`. No production migration, GitHub push or remote demo seed was performed. Joining remains Phase 3.

### Court label decision: November 17, 2026
Use an actual mapped court name when available. For generic court names, use the associated park or school name; otherwise use a nearby street labeled Near. Do not invent exact addresses or infer association from an arbitrary distant venue. Local implementation pending Preview deployment and user verification.

Profile UX clarification: user confirmed saved fields persist. Save button now reflects unchanged saved state locally; Preview deployment pending approval.

Profile persistence report resolved by user: different browser/session. Save-state UX improved locally to show saved/edited/saving states; hosted deployment pending approval.

Profile saved-state UX and paired game-control alignment deployed to development Preview `784ae071` with approval November 17, 2026. Build and focused browser checks passed.

### Latest joining decision: November 17, 2026

Public games require organizer approval. Approved group members may join group games immediately; guests require approval. Guest support belongs to group implementation and must not bypass private membership/content rules. Public approval and Phase 3 controls are implemented locally; see [participation guide](play-together-participation.md). First release remains free.

### Member-brought guests and cancellation decision: November 17, 2026

Members may bring guest places attached to their own participation: Sam plus Tom + 1 guest uses 3 places. A guest is not necessarily another account. Approved members self-join immediately. Group Owner/Co-owner/Organizer can add their own guests directly and decide other group members' requests; standalone guest decisions belong to the host. Guest additions use atomic capacity checks. Guests gain no automatic group membership/private content access. Group-phase counts sum members plus confirmed guests. Leaving releases the member and all attached guests. Pending and approved participants can cancel; approved cancellation prompts for an OPTIONAL reason. See the current policy and participation guide for schema/workflow details.

Host notification decision: notify the host in-app when a player withdraws or cancels, with optional reason and released places. In-app inbox implemented locally; email/push delivery remains unimplemented.

### Phase 3 development rollout: November 17, 2026

User approved dev migrations 0004-0006 and Preview deployment cf3d2b64. Public approval requests, organizer management, My Games, optional cancellation reasons and private in-app host notifications are available for two-account acceptance testing. Production deployment/database unchanged. Group guests remain later.

Phase 3 follow-up: organizers cannot request their own games (server-side account-ID check). Notify hosts for new requests as well as withdrawal/cancellation, with a shared header bell and unread count. Local implementation and0007 migration pending Preview approval.

Requester notifications implemented locally: approved/rejected/removed/game cancelled events join host request/withdraw/cancel events in a private recipient-scoped inbox and header bell. Migrations0007/0008 and Preview rollout pending approval.

Host/requester notifications and header bell deployed to isolated Preview b5f880ff with approval; dev migrations0007/0008 applied. Pending statements above are historical. Two-account user acceptance next; no production operations.

### Phase 3 automated acceptance checkpoint

Combined two-account SQLite/API lifecycle and notification migration preservation passed. Full unit suite216 and browser suite36 pass. No additional application fixes or deployment needed. Real two-browser Google/Apple flows and physical Android TWA/mobile Safari remain manual checks; do not report those as verified. Group work is next, not implemented.

### Phase 4 local implementation checkpoint

Public/private group discovery/creation, My Groups, approval-based memberships, owner/admin management, transfer/archive and private group notifications are implemented locally. Private previews exclude skill/member information; active members alone see private description/skill/roster. Removal immediately revokes API access. Both group types use approval as the safe provisional public-group policy. Removed/rejected users may request fresh approval. Account deletion requires active ownership resolution and deletes owned archived groups. See [group implementation guide](play-together-groups.md). No remote group migrations/deployments yet.

Phase 4 final local validation: development build/full227-unit/43-browser suites passed, plus final12 group API and7 group browser checks. Pending migrations0009/0010 and Preview rollout need approval. No production changes.

Inbox UX follow-up implemented locally: organized notification cards and direct Approve/Deny for authorized pending game/group requests, reusing server permission/capacity checks. Resolved requests expose no actionable target. Pending dev0009/0010 and Preview deployment still need approval.

### Phase 4 Preview rollout completed

Approved dev migrations0009/0010 succeeded and Preview14cd548b deployed with groups, membership notifications and organized inline Approve/Deny inbox cards. Group routes/public discovery and signed-out privacy smoke checks passed. Production deployment/D1 unchanged. Real two-account acceptance pending; invitations/group games/guest parties remain Phase5.

Play Together action styling: reuse shared primary/secondary button classes for prominent actions, existing theme variables and icons; consistent keyboard focus, hover, disabled states and touch-friendly controls. Navigation buttons and compact inbox refinements are implemented locally, not yet deployed. No new design system or paid features.

UI review build a9127653 published to isolated Preview with user approval: polished shared/group navigation buttons and compact inbox. Build/36 browser checks passed. No production changes.

### Decision log: approved role model supersedes earlier rules

November 17, 2026: user approved one primary Owner, Co-owners, Organizers and Members. Primary Owner alone transfers ownership, appoints/removes Co-owners and archives the group. Organizers create/manage only their own group events, including event/guest approvals, with no group-membership authority. Members no longer create group events under the target design. This is approved planning only; deployed code remains Owner/legacy Admin/Member. First-release roles stay free. Next phase must specify safe legacy-role migration without automatic privilege escalation. Documentation-only update requested before further coding.

Phase5A transition proposal prepared: see play-together-roles.md. Recommended preserve legacy Admins with existing permissions temporarily and let primary Owner explicitly assign new roles. This mapping is proposed, not approved or implemented. No automatic Co-owner promotion or Member-to-Organizer conversion.

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

Optional media milestone approved: one player photo and one public group-preview cover, group upload controlled by Owner/Co-owner. Setup/security plan in play-together-media.md; not implemented. No R2 binding found; account inspection403, resources/cost unconfirmed. No storage created; no upload endpoints enabled.

Latest approved Preview rollout:0012 applied to opencourts-dev only; media/member-layout build d02fb1eb deployed (index-C37aM5Kh.js), stable alias unchanged. MEDIA_UPLOADS_ENABLED remains unset: controls are reviewable but saving photos intentionally unavailable until actual private processor transform/metadata verification. Remote dev migrations0001-0012 applied. Production unchanged/no GitHub push. Next finish real image integration/cleanup validation before enabling uploads, then secure invitations, protected group games and guest capacity.

Latest approved UI review build: Preview eb2f943b deployed, stable alias unchanged, index-B47lirXy.js. Includes compact photo editors, add/change pencil overlays, explicit unsaved preview/discard, group location MapPin and earlier member layout fixes. Build/8 group browser tests and photo interaction checks passed. No migrations this rollout; media saving remains disabled (MEDIA_UPLOADS_ENABLED unset) pending live transformation verification. Production unchanged/no GitHub push. Next real processor integration/cleanup checks, then enablement approval and invitations/group games/guests.

Latest approved media enablement: private processor fix deployed version a55617d2-08b0-404d-8fff-513b240c4de5; MEDIA_UPLOADS_ENABLED=true set on Pages PREVIEW ONLY preserving existing vars; Preview643c7700 published. Stable alias unchanged. Remote dev0012 already applied. Production upload flag absent/deployment7ef38ff2 unchanged; processor no public targets. Real Cloudflare binding resize/metadata checks passed before rollout. User must now test real authenticated photo save/refresh/replace/remove and group Owner/Coowner cover. No fake user account/session created. Cleanup queue currently drained on authorized media writes; no scheduled sweeper. Invitations/group games/guests remain next.

Phase5B secure invitations implemented locally: Owner/Coowner only, hashed random tokens, optional expiry/revocation, approval-preserving acceptance and safe discoverable previews. Migration0013 local only; see play-together-invitations.md. Header avatar published to Preview36c696b2; production unchanged. Invitation rollout pending approval.

Latest approved rollout: invitation0013 applied to opencourts-dev and Preview962fb2da published (index-CJSUEJ5t.js). Stable alias invitation route verified. Production7ef38ff2 unchanged. Group-only games next: shared groupGameAccess authorization foundation added LOCALLY,19 group tests pass. It denies outsiders/removed members; Owner/Coowner create/manage all, Organizer creates/manages own, ordinary Member/legacy Admin cannot create. No group game routes/UI enabled yet. User explicitly selected lifecycle: upcoming games transfer to primary Owner when Organizer leaves/loses role; departing member places must be released. Implement creation/list/detail/participation/notifications with those checks next; do not claim group games complete.

Personal feed requirement implemented locally with group-only games: upcoming member-group games and own involved public games, All/MyGames/MyGroups filters and participation states; current membership filters every private read. Group creation/joining/lifecycle local0014/0015; upcoming Organizer events transfer to primary Owner after departure/demotion as approved. Group-game milestone pending Preview approval; guest places remain next.


Latest local checkpoint (November 17, 2026): group-only games and personal member-group feed are implemented locally. Full 240 unit tests and 31 focused browser checks passed. Development migrations 0014/0015 are LOCAL ONLY; hosted Preview remains 962fb2da with migrations through 0013. See PLAY_TOGETHER_HANDOFF.md and play-together-group-games.md for lifecycle, permissions and rollout. Next: approved dev migrations/Preview review, then guest requests and atomic party capacity. No production changes.


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


Latest approved decisions November17: user authorized remaining web milestones and Preview rollout; explicitly selected Sam owner of Tennis as Preview safety-report moderator. Public/group share and protected unlisted invitations, opt-in discovery, symmetric discovery/new-hosted-join blocking, reports/moderator queue and roster search/pagination now deployed.251 units/76 browsers/26 live synthetic checks passed; real OAuth/device acceptance remains pending. See release checklist.


Final safeguard: block relationships are rechecked within participant approval SQL, not only before the batch. Concurrency regression inserts a block between the permission read and mutation and confirms no participant is inserted. Full251-unit suite passed afterward;76 complete browser checks passed for this unchanged interface. Final Preview65f4d761 successfully deployed, bundle unchanged index-CBW7dPXl.js; production remains7ef38ff2. Actual Preview synthetic26-check acceptance completed for this milestone with fixture cleanup. All current guides refreshed; real OAuth/physical-device and operational release gates remain in release checklist.


November17 follow-up LOCAL, not deployed: My Games now focuses on schedule only. Notification bell links to dedicated /play-together/notifications inbox; old my-games#host-notifications redirects there. Inbox has All/Unread,20-at-a-time UI rendering within existing latest100 API cap, empty/loading/sign-in states, existing inline Approve/Deny/read controls. Account auth/me returns connectedAccounts(provider,email) only for authenticated own account; public player DTO unchanged, signed-out accounts empty. Profile connected sign-in rows show private provider email or unavailable text, including Apple relay explanation. No migration/resources/production changes.30 auth unit tests and12 focused browser checks passed/recorded; build passed. Last hosted65f4d761 remains unchanged until Preview approval. Update deployment snapshot after publication.


Approved inbox/account-email follow-up published November17: https://10cf494a.opencourts.pages.dev and stable feature alias. Notifications/My Games/Account HTTP200 with index-BTKwqqVl.js verified. Bell opens dedicated inbox; schedule no longer renders notification cards; own connected-provider emails shown privately in Account.30 auth unit checks/12 focused browsers/build passed. No migration, production changes or GitHub push. Supersedes local-only inbox/email checkpoint.


November17 schedule-tabs update LOCAL ONLY: My Games defaults Upcoming, with Requests/Past/Cancelled. Server-side classification and50-item cursor pagination replace mixed100-row history. In-progress until ends_at, old pending requests expire into Cancelled, left/withdrawn/removed/declined statuses labeled. Existing cancellation/withdrawal records preserve own history; revoked group membership hides private history and reasons never enter schedule DTO.39 games+24 groups API tests/four browser checks/build passed. No migration/resources/production changes. Last hosted10cf494a; Preview publication pending. See play-together-schedule.md.


November17 player location search LOCAL ONLY: player lookup previously compared literal q with saved general_location, so22033 could not matchFairfax. New player-search-location helper uses existing geocode handler for US ZIP/ZIP+4, validates returned postcode/country, expands safe city/county labels (e.g22033 ->Fairfax County ->Fairfax), and supports city-state labels through existing cityStateQuery. Player names are never sent to geocoder; no profile addresses/coordinates stored or returned. Generic city/name text search remains. UI labels Name, city or ZIP code and displays resolved area, with readable skill labels. General-area matching, NOT precise ZIP boundaries, proximity radius or guaranteed disambiguation of free-text same-name cities. Existing opt-in/block/active filters and pagination retained. Lookup failures/malformed or wrong postcode return explicit errors.39 group/geocode API checks and two phone light/dark browser checks passed; build passed. No migration/resources/production changes. Schedule-tabs update remains local too; last hosted10cf494a. Publish both on next explicit Preview approval.


Approved schedule/ZIP-search review build published: https://b7d3bd1d.opencourts.pages.dev, stable feature alias unchanged. My Games/Players HTTP200 with index-Bw5A20Db.js verified. Includes Upcoming/Requests/Past/Cancelled server-filtered pagination and ZIP/city player matching. No migration, production changes or GitHub push. Supersedes local-only schedule/ZIP checkpoints.


November17 location autocomplete LOCAL ONLY: shared LocationAutocomplete now powers Players location search and Account General location. Player-name field separated to keep names out of external location suggestions. Reuses existing Photon/Nominatim client with300ms debounce, aborts, keyboard arrows/Enter/Escape, touch-friendly option rows and theme tokens. Suggest/geocode now supply generalLabel/general_label from city/locality/county + state, never street/house/POI, with cacheversion8. Selected addresses store/search only general label; no profile coordinates saved. Existing manual city/ZIP input remains available. Additional optional name filter is bound server-side.91 geocode/services/groups unit checks and four light/dark ZIP/autocomplete browser checks passed; profile payload assertion proves selected123MainStreet saves onlyFairfaxVirginia. Build passed. No migration/resources/deployment/production changes. Last hostedb7d3bd1d; publish on approval.


Approved location-autocomplete build published: https://3af45daf.opencourts.pages.dev, stable feature alias unchanged. Players/Account HTTP200/index-JralF0cq.js verified;22033 geocode returns general_label Fairfax CountyVirginia. Shared suggestions preserve general city/area on selection; separate name search. No migration/resources/production changes or GitHub push. Supersedes local-only autocomplete checkpoint.


Verification rerun November17 requested by user:257 units,84 complete Chrome browser checks, TypeScript/dev build and26 actual Preview synthetic API checks PASSED. Hosted3af45daf/index-JralF0cq.js verified; synthetic cleanup confirmed zero QA players; production7ef38ff2 unchanged. No deployment or app edits. Real provider Google/Apple and physical Safari/Android/TWA acceptance remain manual. See PLAY_TOGETHER_TEST_RESULTS.md and refreshed release checklist.


### November 17, 2026 - Approved QA remediation (local)

All eight findings in [QA_AUDIT.md](QA_AUDIT.md) fixed locally: protected-game state
revalidation, readable contrast, court autocomplete semantics, accessible inline confirmations,
compact owner member actions, metadata separator, page titles and search announcements.
257 unit tests, 85 browser workflows, the dynamic checks and development build passed;
latest 350-state audit captures have no detected axe violations or page overflow.
Not deployed. Physical-device and screen-reader checks remain release follow-ups.


### November 17 - Preview publication and release-hardening continuation

Eight audit fixes published to https://c17ef75c.opencourts.pages.dev and the stable
feature-play-together alias, bundle index-BxFx9CTz.js. Preview D1 verified isolated;
production deployment/binding unchanged. No migrations or GitHub push.
Subsequent LOCAL ONLY player-search race fix has a failing-before/passing-after stress
regression, 10 focused browser passes, 257 unit passes and successful development build.
Current implementation plan rewritten to remove contradictory old status snapshots.
Next: physical-device/provider/screen-reader acceptance and release operational review;
recurring events remain after first release. All first-release features remain free.


### Approved design decision - primary action consistency

Main court search and all Play Together primary actions share green backgrounds, white
labels/icons, hover/focus treatment, corner radius and disabled opacity through shared
site tokens. Search actions in court selection, groups and member directory use that same
primary emphasis. Verified on phone/desktop in both themes with four browser checks.
Local only; current hosted candidate is c17ef75c. No production change.


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

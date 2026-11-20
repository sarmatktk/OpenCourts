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

## Direct guest additions (Preview 1019f776)

Eligible hosts/group staff add own guests via an actor-scoped atomic notification
batch. Their own addition/cancellation does not notify them of their own action.
Ordinary guest approval and notifications remain. The UI reports direct places
as confirmed, and guest cancellation does not promise a self notification.

## Latest chat lifecycle behavior - November 20, 2026

Preview ef0ceaad, dev schema 0031: confirmed standalone admissions now produce
quiet joined notices; participant departure produces a left notice and immediately
revokes access, except the managing organizer who merely releases a playing place.
Series role-only staff departures also produce one notice. Pending requests never
produce an admission notice. System notices remain excluded from unread, message
push, reporting and rate-limit counts. Successful game actions dispatch a scoped
refresh event so an open conversation updates immediately. Capacity expansion
can admit waiting players and produces their usual quiet admission notices;
guest requests still require separate approval. Staff/inactivity/access/push
consent safeguards are unchanged. See APP_TESTING_CHECKLIST.md and
qa-evidence/chat-capacity-hosted.json for verification and rollout limits.

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

## November 20 - Shared series chat and schema cutover

Group-series chat uses one internal room and one shared mute/read state; game
category and device consent still apply. Quiet membership notices create no chat
push events or unread counts. Delivery rechecks current membership and rolling
message expiry and routes through a surviving occurrence. Generic push wording
contains no message body. The sender pauses new claims while migration 0028's
context view is unavailable; queued events are preserved during cutover. Preview
worker f56801ee-573e-4196-a43e-d148debca31a retains existing variables and secrets.
No secret rotation or production sender enablement occurred. See GAME_CHAT.md
and the current APP_TESTING_CHECKLIST.md for verified evidence and limitations.

## November 20 - All-account opt-in (current)

Preview ac818aea and development worker 9bc7814e-e2ea-49ad-8269-e4108fc789d8 remove
tester-only eligibility. PUSH_ALLOWED_PLAYER_IDS is a deprecated, ignored setting;
all active signed-in accounts can register supported devices and receive relevant
push after consent. This supersedes tester/Sam-only setup notes below, which are
historical. Environment/origin/production guards and PUSH_ENABLED still apply.
No variable, key or secret setup change was needed; --keep-vars preserved existing
worker configuration. Each device requires permission and Account opt-in; existing
preferences, 10-device cap, category and per-chat mutes, access checks and sign-out
revocation remain. No retrospective fanout or broadcast to all accounts. Moderator
permissions still use MODERATOR_PLAYER_IDS independently and are not broadened.

Full units393/393, notification/chat browsers15/15 pass. Opt-in permission and
new-account/device delivery must still be accepted on real Android/iPhone devices.

## November 19 - Game chat and scheduled retention (current)

See [GAME_CHAT.md](GAME_CHAT.md). Chat sends only fixed chat_message + game ID,
never message text. Recipient-only opt-in, games category, per-room mute, unread,
current access, symmetric blocking and live-session checks apply; no self sends.
Taps open the game at #chat. One event per recipient/game/minute limits alerts;
inbox unread remains independently available. Development worker was updated
using a variable-free config and --keep-vars; no secret values were inspected or
changed. Scheduled cleanup runs in finally even if sends are disabled or fail.
Development chat_cleanup_last_at confirmed 2026-11-20 02:23:16 UTC. Older sender
setup commands below are historical evidence, not instructions to rotate/reapply
secrets for this feature. Physical Android chat push/tap remains pending.

## November 19 - Direct notification destinations and contextual opt-in (local)

Encrypted payload includes target {type:game|group,id}; service worker validates fixed destination types and UUIDs and builds same-origin URLs itself. Invalid/old targets open inbox. Game/group APIs retain sign-in/current-access checks; unavailable game screen offers inbox/account links. No private text in push payloads.

Optional prompt after successful join/join-waitlist, or hosted created-game landing; never blocks submission. Enable uses same opt-in code; Not now stores30-day per-account/browser cooldown. Hidden for already enabled preference/current device, denied permission, unsupported browsers and unavailable tester configuration. No auto permission prompt. Direct link + safe fallback35 focused backend/worker tests passed; browser prompt/settings validation recorded separately. Existing installed Home Screen worker must refresh before direct-link testing. No auth secret/config changes.

## November 19 - Distinct notification wording published (198b7cbc)

Replaced identical push message with fixed privacy-safe wording for all19 supported event kinds. Sender transmits version1/kind/tag only using encrypted raw payload; service worker selects trusted fixed text, rejects arbitrary payload body/title/URL, and falls back for unknown/malformed kinds. No private names, locations, meeting times or reasons in lock-screen messages. Taps remain same-origin inbox. Updated future APNs/email contract: adapters should share equivalent type-specific safe templates, not arbitrary caller text.

33 focused push/API/service-worker tests passed, including all19 distinct texts, unknown/prototype-like kind values, null payloads, sender encryption and privacy. Development build passed. Published sender and feature Preview198b7cbc; served sw.js templates verified, Google/Apple readiness true, production unchanged. No authentication secret or Pages variable update. Home Screen users must reopen/refresh Preview to receive the new service worker before testing; already displayed messages retain old text. No unsolicited new test pushes sent.

## November 19 - Preview authentication restored; push device opt-in next

Owner restored authentication secrets. Redeployed existing build only as c9d0b7b3 at stable Preview, without any env/config/secret mutation. Read-only verification: Google=true, Apple=true, Account HTTP200, production deployment/config unchanged. Development push database: zero registered devices, zero provider-accepted deliveries. Sender is Sam-only; real phone delivery awaits opt-in. Next: Sam signs into stable Preview Account on Android, enables notifications, then generates real activity from another account. Separate debug APK is android-app/app/build/outputs/apk/debug/app-debug.apk. Installed production app still points to production and cannot test this Preview feature.

USER REQUIREMENT: never modify, rotate, replace or resubmit existing authentication secrets. All future config patches must include only explicitly changed new keys; never GET/redacted secret fields. Restoration readiness is verified but actual OAuth callback still requires user sign-in. Email and native APNs remain deferred.

## November 19 - IMPORTANT: Preview push activation interrupted; sign-in recovery required

Approved remote migration0024 successfully applied to opencourts-dev. Created opencourts-push-dev Worker, uploaded VAPID private secret, enabled Sam-only cron sender (version fa773791-54e0-4b11-bed1-e233e2a3ca93), and deployed Preview 0d8fffd7. Production deployment/configuration compared unchanged. Preview account/sw/games HTTP200 and dev Android assetlinks published, BUT auth/me reports Google=false and Apple=false.

Cause: agent PATCH resubmitted GET-redacted secret_text fields along with public Preview vars. This left Preview sign-in secrets unusable. NEVER resubmit secret placeholders from GET responses. Future patches must contain ONLY explicit changed variables; omitted variables are preserved. Do not repeat the activation instructions' full env merge approach. No secret values can be recovered from GET/deployment metadata.

Recovery: owner must re-enter original GOOGLE_CLIENT_SECRET, APPLE_PRIVATE_KEY (full .p8), APPLE_TOKEN_ENCRYPTION_KEY (original 64-hex value; do not rotate), AUTH_RATE_LIMIT_SECRET in Cloudflare Pages opencourts > Settings > Preview > Variables and secrets. Do not paste credentials in chat. Preserve public IDs, origin, bindings and existing encryption key. Then redeploy feature Preview and verify both providers true, actual Google/Apple callback, and court endpoint readiness. Only afterward proceed to phone opt-in/real push delivery. No email implementation/activation yet.

Attempt to pause sender with `npx.cmd wrangler deploy --config development/wrangler.push-dev.json` was NOT executed: automatic approval review failed due to usage limit, not an unsafe-action decision. Do not bypass approval. Sender therefore remains enabled Sam-only; real delivery unverified. If needed owner can pause opencourts-push-dev by setting its PUSH_ENABLED=false in Workers settings and deploying that Worker only. Pages PUSH_ENABLED=false alone does not pause the Worker.

Current feature source/docs/Android changes are uncommitted; last Git checkpoint a0d245a precedes push implementation. Private keys remain ignored. No production change, Play release, or push implementation Git push. Read NOTIFICATION_ARCHITECTURE.md but this incident entry overrides its old full env merge instruction.

# OpenCourts notification architecture

November 19 follow-up: Preview 6ab4bcc2/schema 0025 excludes the actual authenticated
actor from action notifications before inbox insertion and push fanout. Source writes
use transaction-scoped actor context; schedule records retain the actor. Identifiable
historical self records/queued pushes cleaned; unknown actors preserved. Automatic
waitlist offers remain. See NOTIFICATION_BEHAVIOR_AUDIT.md for the category review.
No sender configuration/secret change was needed or made.

Updated November 19, 2026. Development push was activated and published on feature Preview;
the historical activation instructions below are not a request to repeat setup.
The handoff records subsequent fixes and user-confirmed iPhone Home Screen receipt.
Physical Android Chrome/TWA delivery remains unverified.
Never read, change, replace, rotate or resubmit Cloudflare environment secrets.
For this readiness pass, publish only the existing feature Preview build; do not patch
environment settings, redeploy the sender or apply remote migrations.
Email remains deferred. Native iOS authentication and APNs delivery are not implemented.

## Shared events, separate delivery channels

Existing game/group/invitation/schedule/waitlist inbox records remain authoritative.
Migration `0024_notification_delivery.sql` adds:

| Table | Responsibility |
| --- | --- |
| notification_events | Routing metadata: source/source ID, recipient, category, kind, game/group reference, created/expiry milliseconds. No names, reasons, email or invitation tokens. Unique source/source ID/recipient. |
| notification_preferences | Account-level push opt-in (off initially) and games/groups categories. Future email gets separate channel preferences; disabling push must not disable email or the inbox. |
| notification_devices | Account/session-owned subscriptions, transport, endpoint hash, endpoint/encryption material, VAPID public key version and timestamps. Account/session deletion cascades. |
| notification_worker_state | Round-robin waitlist scan cursor, preventing a full queue from starving later games. |
| notification_deliveries | Per-event/channel/device status, attempt count, next attempt, lease, sanitized outcome, sent timestamp. Reserved channels: webpush, apns, email. Email can use a device-less delivery; one per event/channel. |

Database triggers capture **new** inserts in game_notifications, group_notifications,
game_guest_notifications, player_game_invitations and game_schedule_notifications, plus
waitlist transitions into offered. No historical inbox backfill. Events expire after 24 hours;
waitlist offers expire at their offer deadline. Device delivery rows are created only for
subscriptions that existed at event time, enabled preferences and live sessions. Existing
inbox read/unread history is not replaced or deleted.

The first implementation fanout is Web Push. Reserved schema values do not mean native APNs
or email sending/registration is available. Future adapters use the same events and delivery
status contract, with explicit channel preferences and authenticated recipient registration.

## Delivery Worker

`functions/push-worker.ts` has a scheduled handler, no public administration/send endpoint.
`development/wrangler.push-dev.json` names a separate `opencourts-push-dev` Worker bound
only to `opencourts-dev` (cae4849c-3e99-4945-9d70-bef7b48707ce). It is disabled by default.
Pages handles authenticated subscription/settings APIs; the Worker handles closed-app delivery.
Cron is every minute; initial capacity is 10 deliveries per invocation, sequential sends with
five-second timeout. This is a deliberate tester-scale bound, not a high-volume service.

Worker startup requires PUSH_ENABLED=true, PUSH_ENVIRONMENT=development, exact stable Preview
AUTH_ORIGIN, nonempty tester IDs and VAPID public/private/contact values. Production origins
are rejected. Pages additionally uses existing feature environment guards and per-account tester checks.
Actual binding isolation must be verified before deployment; variable names are not proof of database identity.

Delivery claims use conditional updates and a unique lease token (two-minute lease). Five attempts
maximum, exponential backoff starting at one minute, honoring Retry-After within a one-hour cap.
404/410 remove the device; permanent provider errors stop retries. Transient/network errors retry.
Only sanitized error codes are stored. Never log endpoints, encryption keys, payloads, provider
response bodies or VAPID secrets. Expired events and revoked/expired-session devices are cleaned
by the enabled Worker. While disabled, cleanup does not run; delete development resources before
reusing them if the experiment is abandoned.

Sent means **accepted by the push provider**, not displayed/read on a phone. Delivery is best effort.
There is a possible crash between provider acceptance and recording success: retries are at least
once, not exactly once. A stable event tag replaces duplicate notifications on supported browsers.
No browser or OS guarantees immediate delivery; force-stop, permission denial and battery/network
settings must be covered in device acceptance.

The Worker also refreshes a bounded, round-robin set of upcoming group waitlists so offers can advance while
the site is closed. Existing capacity/eligibility/FIFO rules remain authoritative.

## Privacy and account lifecycle

- HTTPS push-provider endpoint allowlist; reject local/private/arbitrary hosts, URL credentials,
  custom ports and invalid P-256/auth keys. All API writes require session, exact Origin and CSRF.
- Up to ten devices per account. Re-registering the same subscription/session is idempotent.
  Rebinding a shared browser to a different account/session deletes old device deliveries atomically.
- Delivery checks active player/session, preferences, tester access, unread source event, expiry,
  current private-group/unlisted access and relevant blocks. Stale group approvals are suppressed.
- The service worker always displays generic text and opens the same-origin inbox. No precise
  location, group/game names, cancellation reasons, private member names or invite tokens on lock screens.
- Deep links do not grant authority. Inbox and game/group APIs recheck membership and permissions.
- Sign-out/revocation stops subsequent sends for the session; it cannot recall a notification already
  accepted by the provider. Enable the device again after signing into a new session. Account deletion
  removes subscriptions/events/deliveries via foreign keys. In-app notification retention is unchanged.
- Subscription endpoints and encryption material are private D1 records, not public profile data.
  Web Push payloads are encrypted by the library; this is not a claim that D1 columns are separately encrypted.

## Web API contract

All endpoints are under `/api/push`, use existing cookie sessions; no native auth shortcut.

| Method/path | Request/response |
| --- | --- |
| GET settings | `{available:false}` when disabled/non-tester; otherwise publicKey, preferences `{enabled,games,groups}` (0/1) and own devices `{id,transport,endpointHash,currentSession,createdAt,updatedAt}`. No raw endpoint, keys or session ID. |
| POST devices | `{subscription:{endpoint,keys:{p256dh,auth}}}`; browser-generated Web Push subscription only. Returns `{ok:true,id}`. Explicit opt-in enables push, preserving existing category choices. |
| DELETE devices | `{id}`; deletes only the signed-in account's device and queued deliveries. |
| PATCH preferences | Full boolean `{enabled,games,groups}`; does not alter inbox notifications. |

UI is in Account > Phone & browser notifications. Permission is requested only from a user action,
never on page load. Unsupported/disabled states retain the inbox. Browser subscription expiry/key
rotation requires enabling again; automatic background resubscription is not implemented.

## Android wrapper

Source changes add POST_NOTIFICATIONS, Android Browser Helper DelegationService, notification
permission request activity, monochrome icon and HTTPS verified-link intent filter. The release
package/URL remain `us.opencourts.app` / https://opencourts.us/. No Play release was made.

Debug builds are a **separate** `us.opencourts.app.dev` installation pointed at stable Preview.
`build:dev` appends the dev package/debug certificate association to generated dist assetlinks only;
production `public/.well-known/assetlinks.json` stays unchanged. The development debug certificate
must match the included fingerprint; verify after rebuilding on another machine. Test TWA fullscreen
verification, permission delegation, notification ownership/icon and tap behavior on a physical device.

## Native Swift iOS extension

Keep shared account IDs, events, category choices, access checks, queue and outcome semantics.
First implement approved native sign-in transport; current web cookies/CSRF cannot be bypassed.
Then add authenticated APNs device registration (token + topic + sandbox/production environment),
separate from Web Push endpoint registration. Reserve per-installation/session ownership and revoke
on sign-out, account switch or APNs invalidation. Store APNs secrets only server-side.

An APNs adapter claims only channel=apns, signs APNs requests and handles provider invalid-token/
retry responses. Use the same generic lock-screen text and map taps to an authorized native inbox.
Provide iOS notification permissions/preferences and Universal Links/app association deliberately.
No APNs entitlement, provider key, native endpoint, StoreKit or native Swift implementation is included now.

## Future email extension (deferred)

Reuse notification_events and channel=email deliveries with separate email preferences and verified
recipient resolution. Build branded HTML/plain-text templates and expiring authorized action links,
bounce/suppression handling and an email provider adapter later. Never turn on email merely because
push is enabled. Consider a digest/coalescing policy and channel deduplication before adding email.

## Activation checklist and exact commands

Local first: `npm.cmd run dev:db:migrate` (guarded SQLite only), `node scripts/generate-push-dev-keys.mjs`.
Both are reversible local work. Private keys are written only to ignored `.wrangler/push-dev-secrets.json`.

**Before remote activation, obtain approval** for the following development-only operations:

1. Verify only 0024 pending with `npx.cmd wrangler d1 migrations list opencourts-dev --remote --config development/wrangler.push-dev.json`.
2. Apply: `npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.push-dev.json`.
3. Set tester IDs, contact subject, public/private VAPID keys and PUSH_ENABLED in an ignored deployment
   config/secrets file; never print private values or commit them. Pages Preview needs the public key,
   enabled/environment/tester flags. The sender Worker alone needs the private key and contact subject.
4. `npx.cmd wrangler deploy --config development/wrangler.push-dev.json` creates the development Worker;
   checked-in config is deliberately disabled. Use an approved ignored configured copy to enable it.
   Configure secrets with `npx.cmd wrangler secret bulk .wrangler/push-worker-secrets.json --config development/wrangler.push-dev.json`.
   Add contact subject as a secret/config value separately; the generated file does not guess an address.
5. Verify the account's Worker plan/limits and any billing effects before activation. No plan upgrade authorized.
6. Build/publish feature Preview with development DB only; install the separate debug APK, not a production AAB.
7. Two-account/real-phone acceptance: opt-in/deny/unsubscribe, background/closed app, invite/approval/cancel/
   time change/waitlist events, foreground inbox read suppression, old session/account removal, private
   membership revocation, no duplicate display, and tap routing. Verify production unchanged afterward.

The checked-in Worker config, VAPID generation and migration files are preparations, not remote activation.
Do not deploy a disabled Worker and call phone push functional. Do not send to all development users.

## Validation evidence and limits

Backend tests: `tests/push.test.ts`; service-worker tests: `tests/push-worker.test.ts`;
UI workflows/screenshots: `tests/push-settings.spec.ts` and `.wrangler/qa-audit/push-*`.
Tests mock external providers; real provider/Android delivery is a separate acceptance gate.
Source references: [Web Push subscriptions](https://web.dev/articles/push-notifications-subscribing-a-user),
[Cloudflare scheduled handlers](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/),
[Android delegation sample](https://github.com/GoogleChrome/android-browser-helper/tree/main/demos/twa-notification-delegation),
[Android permission](https://developer.android.com/develop/ui/views/notifications/notification-permission),
[Apple Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).

## Prepared activation for review (not executed)

Only migration0024 is pending on remote development D1. Reviewed tester: Sam, player
`87be695a-f00f-4689-b0c7-16ad9a50346d`. Contact URI: `https://opencourts.us/contact`.
Ignored `.wrangler/push-dev-ready.json` contains enabled tester-only Worker vars and the dev binding;
`.wrangler/push-preview-vars.json` contains only public Preview push vars. Private VAPID key is
only in `.wrangler/push-dev-secrets.json`. The Worker upload file `.wrangler/push-worker-secrets.json` contains only its private key; public keys are vars, not conflicting secrets. All files are ignored; regenerate locally if absent.

After explicit approval, execute in this order:

```powershell
npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.push-dev.json
npx.cmd wrangler deploy --config development/wrangler.push-dev.json
npx.cmd wrangler secret bulk .wrangler/push-worker-secrets.json --config development/wrangler.push-dev.json
npx.cmd wrangler deploy --config .wrangler/push-dev-ready.json
npm.cmd run build:dev
npx.cmd wrangler pages deploy dist --project-name opencourts --branch feature/play-together --commit-dirty=true
```

Between sender configuration and Preview publication, merge the five public push variables from
`.wrangler/push-preview-vars.json` into **Pages Preview** env_vars only using the Pages API/dashboard.
Preserve all existing variables/secrets/bindings; never replace the entire environment with this file.
Do not put PUSH_VAPID_PRIVATE_KEY on Pages. Verify the production binding/deployment and Preview
COURTS_DB before and after this step. The first deploy creates a disabled sender; the final Worker
deploy enables Sam-only delivery. If any setup fails, keep PUSH_ENABLED=false until resolved.

The existing local APK can be installed separately for acceptance; installing does not change the
Play-installed production app. No production AAB submission, Worker plan upgrade, email sender
configuration or APNs resource creation is included in this approval.

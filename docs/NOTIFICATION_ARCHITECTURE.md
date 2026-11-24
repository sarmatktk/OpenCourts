## Owner-authorized iPhone sandbox test — November 23, 2026

After the owner confirmed iPhone notification permission/registration, a fresh
read-only development D1 check found exactly one current APNs sandbox device for
the allowlisted `sam test` player, with active iOS session and push consent. Sent
one generic destination-free test through the existing one-shot guarded
diagnostic. Apple returned HTTP 200 (`accepted`, no provider code). The temporary
diagnostic was removed, original sender restored, and temporary public endpoints
disabled. No game/group event or account record was created or changed; production
was not queried or changed. Owner confirmed that the notification appeared and
opened Inbox, verifying receipt and neutral fallback for this generic diagnostic.
It does not verify scheduled reminder copy or game-detail routing. The diagnostic
displayed “You have an OpenCourts update.” Local APNs and Web Push reminder
templates now explicitly say “Reminder: Your game starts in about 24 hours” or
“...3 hours.” Reminder events carry a game target and should open game details.
This copy change has not been deployed or exercised with a real game reminder; no
second push was sent.

## Game start reminders — November 23, 2026

The minute notification worker now queues two generic game reminder events for
confirmed game participants (including the host): one at the 24-hour lead time
when the game was created more than 24 hours before its start, and one at the
3-hour lead time when it was created more than 3 hours before its start. A
30-minute worker catch-up window prevents a brief scheduler delay from losing a
reminder; reminders are not queued after their lead-time window or for games
created too close to start. Events are deduplicated per game start, reminder
kind and recipient. Rescheduling creates a new event identity, and delivery
rechecks the captured start time and current participant status so stale queued
reminders are skipped.

Events use category `games`, generic lock-screen wording, the existing game
destination and standard notification fanout. They therefore honor the account's
push-enabled and Games preferences, active registered device/session and current
delivery transport. The worker enqueues before draining existing web/APNs queues;
no new schema is required. APNs client/sender capability and actual phone
delivery still depend on the existing native push readiness gates. This code
change was not deployed and does not establish Preview/production or real-device
delivery acceptance.

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


## Native APNs registration backend foundation — November 22, 2026

Implemented local `functions/lib/native-push.ts`, routed through existing `functions/lib/push.ts` as `/api/push/native/settings` (GET), `/native/devices` (POST/DELETE), and `/native/preferences` (PATCH). New migration `0037_native_push_registration.sql` adds hashed installation metadata linked to the existing APNs-capable notification_devices table and immediate native registration/queue cleanup when a session is revoked. Existing event fanout already supports channel=apns; existing web sender still processes webpush only. `push-worker.ts` additionally cleans expired native registrations independently of VAPID readiness, with a schema guard for unupgraded databases.

Registration is disabled by default, restricted to the exact isolated feature Preview or HTTP loopback, nonproduction/main configuration, explicit NATIVE_PUSH_DEVELOPMENT_ENABLED=true, APNS_ENVIRONMENT=sandbox and existing bundle identity APNS_TOPIC=us.opencourts.ios. Missing native migration returns unavailable, not a schema failure. Production native auth/registration remains disabled. These are new local contract names, not remotely configured settings. No remote migration, deployment, secrets, credentials, signing, entitlements, capabilities or store changes were made.

Native bearer sessions are mandatory; web credentials cannot register. Origin and current-session CSRF protect mutations. POST accepts bounded even-length hex deviceToken, a 64-lowercase-hex installationId secret, sandbox environment, matching topic and Boolean consent. Tokens are normalized without assuming a fixed APNs byte length; installation secrets are hashed and never returned. Device tokens reside only in the existing private endpoint column; web encryption fields are empty for APNs, with no fabricated browser subscription. Settings omit token/installation/endpoint hashes and expose only registration metadata/preferences. This establishes authenticated installation-secret possession, not device attestation or proof APNs has accepted the token.

consent=true is explicit opt-in and enables account-wide push while preserving Games/Groups choices. consent=false only refreshes an already registered installation in the same account AND session, and never re-enables push. New account/session registration requires explicit opt-in. Idempotent same-token retries retain one device and do not replay old events. Token rotation or account/session rebinding replaces the registration and cascades old queued deliveries. A token bound to another installation fails409 instead of silently transferring. Shared ten-registration cap includes web devices. Atomic registration batch repeats current ios-session, active-account and cap checks; revoked-between-check-and-batch cannot register or opt in. DELETE affects only the actor's APNs registrations; session revocation/suspension/account deletion and expiry cleanup cascade metadata/queued work.

Native preference PATCH uses the shared three-Boolean enabled/games/groups contract, independent of browser VAPID readiness, and repeats current native-session authority in its write. The existing Swift settings screen still uses the browser-compatible endpoints; native capability/client integration is the next slice.

All native settings and successful registration responses explicitly return deliveryAvailable=false. This continuation supplies NO native Swift registration/permission/delegate flow and NO APNs provider sender or delivery claim. Pending APNs queues are retained under existing event expiry; the web sender does not attempt them. Gate activation alone cannot enable delivery.

Validation: initial full backend suite676/676 and Xcode BuildProject passed (3.255 seconds; BuildProject-Log-20261122-155727.txt); subsequent opt-out-preserving refresh checks passed49/49 targeted push checks. Final full-suite/TypeScript evidence follows. New isolated in-memory cases cover gate/schema/production boundaries, bearer/Origin/CSRF/consent/token validation, idempotency/privacy/category preservation, rotation/no replay/web-sender exclusion, account/device isolation, logout/suspension/deletion/expiry, shared cap and mid-request session revocation. No live APNs token, permission request, device registration or push was attempted. No Swift/UI changes in this backend slice, so simulator UI acceptance is not claimed.

N05 now Partial local backend only; N06–N09 remain Pending. Next: native Swift opt-in/permission and UIApplicationDelegate token callbacks, Keychain installation identity (tokens never persisted), same-session consent=false token refresh, explicit re-enable on new sign-in, disable/unregister and account/lifecycle invalidation. Fetch native capability before offering opt-in and distinguish registration readiness from delivery readiness. Then implement the APNs sender using shared event authorization/category/session checks, privacy-safe allowlisted payloads, bounded retries/token invalidation and authorized tap routing. Keep signing/capability/secret changes and remote activation behind existing explicit authorization safeguards; only seek approval once concrete rollout artifacts are reviewable. Maintain all handovers/checklist and earlier release acceptance gaps.

Native registration race/retry refinement: POST also accepts expectedRegistrationId (null/omitted for first registration). Token rotation or account/session rebinding must reference the reviewed current registration ID. A delayed old-token or old-account request fails409 after a newer binding; matching current actor/session/token retries can recover the accepted registration ID even after a lost response. Tests verify stale-token/account denial and exact rotated-body recovery. The Swift client must keep the last acknowledged registration ID alongside the installation secret (not the APNs token), refresh capability/metadata before a new explicit enable and reconcile409 without blindly retrying. This is a registration-ID precondition, separate from the preferences API's non-atomic GET/PATCH limitation.

Final validation evidence: full local backend suite678/678 across33 files passed after native preference support; final registration-precondition/retry refinement then passed50/50 targeted push checks. Backend TypeScript check passed after precondition addition. Xcode BuildProject passed as above; Swift/UI unchanged. Final whitespace check clean. No remote/live mutations or deployment, no APNs client/sender or delivery acceptance. Next remains native Swift permission/token/installation/session lifecycle integration, followed by APNs sender and authorized tap routing.


## Native iPhone permission and token client — November 22, 2026

Added `ios-app/NativePushRegistration.swift`: native capability/review/request models, origin-separated Keychain installation identity/receipt, app-level Observable coordinator, UIApplicationDelegate APNs success/failure callbacks and This iPhone status/opt-in/removal screen. `MyApp.swift` installs the delegate and scene lifecycle forwarding while preserving Google URL handling. Notification settings links to This iPhone. `NativeAccount.swift` informs the coordinator of account changes and adds a SHA256 session fingerprint plus optional expectedSessionFingerprint transport guard. The guard rejects a changed credential before URLRequest/network construction and existing token equality checks still protect responses; raw session credentials are not exposed to the coordinator.

Backend `native-push.ts` now supplies playerId in available native capability responses; Swift requires it to match the captured visible actor. Added CSRF-protected POST `/api/push/native/installation` to review a possessed installation secret's current registration ID/current-session flag without exposing tokens or another player's identity. This supports fresh expectedRegistrationId preconditions and lost-acknowledgement/account-switch reconciliation without guessing from a device list. One new isolated native-bearer test covers absent/current/unknown/cross-session review and CSRF; existing registration/privacy checks now assert actor identity.

Enable remains offered only when BOTH native registration and delivery capability are available, the response is actor-bound and the bundle is the existing us.opencourts.ios. Current local backend deliberately returns deliveryAvailable=false and deployed native endpoints are not activated; no permission prompt or registration upload runs in this state. Once approved infrastructure is ready, a direct Enable tap freshly verifies capability/session/version, reads or creates a 32-byte CSPRNG installation secret in WhenUnlockedThisDeviceOnly Keychain, requests alert/badge/sound permission if not determined and asks UIKit for a current APNs token. Denied permission offers an explicit iPhone Settings link. A successful delegate callback uploads bounded variable-length token hex under the original session fingerprint and saves only installation secret plus acknowledged registration ID/actor/session digest. APNs tokens remain in memory and are never stored in Keychain/UserDefaults or logged. Provider errors use generic user copy, not raw diagnostics.

Launch/account/foreground refresh re-requests a token only for an acknowledged receipt matching current actor AND session, authorized OS permission and ready capability. It uses consent=false, preserving account-wide opt-out. New sessions/accounts require explicit enable. Foreground token callbacks can wait through temporary inactivity in memory; background/account changes invalidate generations, pending callbacks/timers and displayed metadata. Account changes best-effort clear the previous receipt while retaining the installation identity; receipt actor/session checks remain mandatory even if Keychain cleanup fails. A 20-second APNs-callback deadline and generic failure recovery are present. Busy state releases after interrupted permission/network awaits; uncertain uploads do not automatically replay and require fresh status/explicit action.

Confirmed removal freshly reviews matching current-session ownership, sends a pinned DELETE, requires ok:true, unregisters UIKit callbacks, clears receipt and verifies server metadata. OS permission and other registrations are unchanged. Existing server session-revocation/suspension/expiry guards remain authoritative. No UNUserNotificationCenter notification-response delegate, closed-app tap routing, APNs sender, signing/capability/entitlement change, secret/configuration change, remote migration/deployment or actual push delivery was added. Migration0037 and native handlers remain local. Current generic account preference screen still uses its existing browser-compatible endpoints; future native-preference fallback integration remains open.

Validation: final BuildProject passed (6.935 seconds; BuildProject-Log-20261122-161041.txt). Push/native-auth suites65/65 pass; backend TypeScript check passes. Swift fixtures pass unavailable/prepared and contradictory capability, actor mismatch, token hex/consent/version body, review validation and token-free metadata encoding. A transient fixture initially put throwing decode inside precondition's nonthrowing autoclosure; corrected fixture passed; app source built throughout. Separate transport fixture using only synthetic in-memory credentials verified changed-session pin rejection before networking, without Keychain/real credentials or server requests. Whitespace clean. No live permission, token registration, unregister or notification mutations performed.

Simulator (device-interaction skill): explicit B0DF137B-1CF1-4D65-B682-3C70FC66192F simulator=true, normal args[], initial16:06:33 build: Feed→Inbox→Notification settings→This iPhone, permission Not requested, unavailable explanation, Refresh and Back pass; no Enable, OS prompt or false Registration saved. Deployed endpoint produced a recoverable generic status error as well as unavailable copy; HTTP status was not captured and must not be claimed as a verified404. Non404 authorization/server failures intentionally remain visible rather than being masked. Root reviewed `ActionArtifacts/41DEB671-8A53-471F-9B91-2251469AFFFC/DeviceInteractionSynthesize/Verify Native Push Device-16_07_34_000-screenshot.png`; content clears dock. Final duplicate-heading removal/actor guard recheck follows.

N05/N07 now Partial local. N06 sender and N08/N09 receipt/tap/deep-link flows remain Pending. Enabled-path actual permission/callback/Keychain upload/removal, timeout/error/account/lifecycle races, dark/Dynamic Type/VoiceOver and physical iPhone acceptance remain open. Next: implement gated APNs sender with current event/session/category/access revalidation, allowlisted privacy-safe payloads, token invalidation and bounded retry/lease outcomes; only then expose delivery readiness and complete authorized notification taps. Before remote activation prepare reviewable migration/server/signing/capability/configuration steps and obtain the existing required approval; do not modify existing secrets. Continue updating both handovers/worklist/checklist and preserve prior acceptance gaps.

Final native push screen recheck: device-interaction skill installed16:10:41 build on the same explicit confirmed simulator with normal[] arguments, then closed session. One This iPhone title, Not requested permission, unavailable and recoverable-error states, Refresh, Back and dock clearance pass. No Enable/prompt/saved-registration claim, clipping, remote writes or permission changes. Evidence: `ActionArtifacts/41DEB671-8A53-471F-9B91-2251469AFFFC/DeviceInteractionSynthesize/Verify Final Push Screen-16_11_26_350-screenshot.png` and matching hierarchy. Enabled-path gates remain open; next is the gated APNs sender, then authorized receipt/tap routing.


## Local APNs provider and delivery queue — November 22, 2026

Implemented `functions/lib/apns-provider.ts` and `apns-delivery.ts`. Existing `push-worker.ts` invokes the native drain after the web drain, with native cleanup still in finally; web sender behavior is unchanged. `push-delivery.ts` exports only its Delivery type so the native adapter can reuse eventStillVisible for current membership, blocks, group/game lifecycle, invitation/waitlist, chat and discussion rules. Native drain independently checks ios-session/player/registration/token ownership, category preferences, sandbox/topic metadata and current lease, then rechecks authority after JWT/payload work immediately before provider egress. If recurring-chat authorization retargets the destination during final checks, the older payload is skipped. A DB/external-send race cannot be made atomic: already accepted messages cannot be recalled, so tap handling must freshly authorize access.

Sender is disabled by default and sandbox/development only. It requires existing native registration gates plus APNS_SENDER_ENABLED=true, APNS_TEAM_ID/APNS_KEY_ID (10 uppercase alphanumeric characters), APNS_TOPIC=us.opencourts.ios and owner-provided APNS_PRIVATE_KEY in the sender environment. Browser VAPID credentials are independent and not required for native delivery. These are local names/contracts, not remotely configured keys. The signing key must remain sender-only; do not place it in the iOS app or Pages settings. Existing authentication secrets are neither read, reused, changed nor rotated by this work. No remote flags, migrations, deployment, signing, capabilities or entitlements were changed. Production native transport remains forbidden.

Provider uses ES256 iss/iat/kid authentication, warm-run JWT caching for50 minutes (with config/clock-change invalidation), fixed sandbox host/topic, no redirects, five-second transport timeout, alert push type, bounded expiration, deterministic apns-id and hashed event collapse ID. Payloads contain only fixed OpenCourts title,22 allowlisted generic event messages (unknown kinds use safe fallback), version/kind/opaque tag, optional UUID-only game/group/post destination and UUID registrationId. No private names, reasons, locations, meeting times, text, invite/session/device tokens or arbitrary URLs enter the payload. No inaccurate global unread badge is sent. registrationId is for the next client's account-safe tap gate: require the current acknowledged receipt, actor and session before honoring the target; otherwise open a neutral inbox/sign-in flow. Token refresh can conservatively cause an old alert to fall back to Inbox.

Queue claims use two-minute leases, at most10 jobs/run and five attempts. Signing preflight failure leaves work/attempts untouched. APNs200 records provider acceptance (`sent`), not device receipt. Network/timeouts and429/5xx have bounded retry/backoff and stop when event expiry leaves no retry window;5xx waits at least15 minutes. Provider authentication failures stop the batch without deleting devices or consuming untouched jobs. Only recognized invalid-token responses can remove a matching registration, and old410 timestamps, refreshed registration times and superseded leases prevent a stale response from deleting newer state. Exhausted abandoned native leases become failed. Error storage is restricted to generic codes; response bodies/provider exceptions are never logged or persisted. Retry after an ambiguous accepted response can duplicate delivery; stable request/collapse IDs reduce duplication but do not guarantee exactly once. Native-only drains also advance waitlists/expiry without browser credentials.

Apple references: [token authentication](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns), [request headers/expiration](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns), [response handling](https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns). APNs requires HTTP/2; local workerd transport may differ from hosted Cloudflare proxy behavior, as documented in the [Cloudflare runtime issue](https://github.com/cloudflare/workerd/issues/4841). This adapter uses injected fetch for local verification. Hosted HTTP/2 connectivity, fleet-wide JWT cache/connection behavior and actual APNs responses require isolated hosted acceptance; no local mock establishes these.

Validation: added `tests/apns-provider.test.ts` with ephemeral synthetic signing keys and injected transport (no Apple requests), plus native queue/access/lease cases in `tests/push.test.ts`. Coverage includes JWT verification/cache, fixed headers/IDs/expiration,22 event templates and unknown/prototype kinds, token-free payload/registration binding, response classes/retry-after/oversized bodies, authorization-after-signing, category/access/read/revocation/expiry denial, overlap/lease takeover, retries/attempt limits, token invalidation freshness, provider-auth batch stop and sanitized errors. Initial three failures were fixture assumptions: membership removal/archive correctly generate generic outcome notices, and an unscoped status query selected a new pending notice. Fixtures now isolate the private game event and query the original source; shared policy was preserved. First full715/715 passed; final registration-ID payload run/TypeScript evidence follows. Xcode BuildProject passed (3.026 seconds; BuildProject-Log-20261122-161936.txt). Swift/UI unchanged in this slice; no new simulator/device-delivery claim.

N06 now Partial local. Native capability and registration responses STILL return deliveryAvailable=false; implementing a sender does not activate the client or certify delivery. Migration0037 and all new server/native work remain undeployed. Next: UNUserNotificationCenter foreground/response delegate plus closed-app receipt and registration/actor/session-bound authorized tap routing (N08/N09), preserving Google URL handling and clearing stale account routes. Then prepare reviewable isolated migration/deployment/signing/credential/readiness steps for the existing required approval and complete physical-iPhone/hosted sandbox acceptance. Do not flip delivery readiness merely because local mocks pass. Rollback distinction: APNS_SENDER_ENABLED controls APNs independently of browser PUSH_ENABLED; registration gate controls native endpoints too. Preserve all earlier inbox/profile/group/chat/discussion/release acceptance gaps and continue updating handovers/worklist/checklist.

Final APNs sender validation: registration-ID payload refinement passed the complete715/715 backend checks across34 files; backend TypeScript passed. Final targeted whitespace check clean. All provider requests in verification used injected transport and ephemeral synthetic keys; no Apple request, device push, remote mutation or deployment occurred. Build evidence remains BuildProject-Log-20261122-161936.txt (Swift/UI unchanged). Next remains registration/actor/session-bound receipt/tap routing, followed by approved hosted and physical-device acceptance; deliveryAvailable is still false.


## Native notification receipt and tap routing — November 22, 2026

Continued under the user's standing instruction to act as senior iOS developer and UI/UX designer, develop the app from the checklist, and keep handover documents current for the next agent.

NativePushAppDelegate now installs UNUserNotificationCenterDelegate before launch finishes, as required by Apple's delegate documentation. Foreground callbacks suppress OS banners/sound; existing visible inbox/summary polling remains responsible for refresh (no immediate foreground refresh claim). Only the default notification-open action queues navigation; dismiss/custom actions perform no mutation. No notification is marked read by the delegate.

New NativePushRouting.swift parses version1 numeric (not Boolean/string), UUID registration, one of22 fixed event kinds and matching game/group UUID destinations, plus optional valid group post UUID. Unknown/malformed payloads use a neutral Inbox/sign-in fallback. APS text, arbitrary URLs, names and extra fields are never used for navigation or displayed by this code. One pending tap is held only in memory; newer taps replace it. No notification payload/token is persisted. AppHeader waits for the active scene and existing Account/Play Together presentation dismissal before consuming the tap into the shared account sheet, avoiding interruption of an open edit. Google URL handling is unchanged.

NativePushOpenedView restores the account before resolving a destination. NativePushCoordinator requires the acknowledged Keychain receipt's registration UUID, actor and session fingerprint, then fresh actor-validated native capability/device membership and possessed-installation current-session review. The API pins the captured session; final generation/active/account/session checks discard interrupted resolutions. Unverifiable/rotated/revoked/stale registrations fall back to the current Inbox or account flow. Background/account changes clear resolved destinations; old queued targets are dropped on an established-account change. Account sign-in after fallback does not replay an old destination. Existing chat/discussion/detail readers still fetch current authorization; receipt validation grants no content access and does not make notification delivery proof of authorization. Only the existing visible chat reader may advance its read cursor.

Validation: BuildProject passed after final source changes (1.525 seconds, BuildProject-Log-20261122-163944.txt). RunCodeSnippet fixtures passed all22 kinds, cross-target denial, malformed versions/missing fields/invalid post UUID/unknown kinds, one-shot queue consumption and neutral fallback. Separate pure fixtures accepted matching receipt and rejected other actor, changed session, rotated registration and corrupt receipt without network or Keychain writes. Simulator device-interaction skill installed the routing UI build on explicit confirmed simulator B0DF137B-1CF1-4D65-B682-3C70FC66192F with normal[] arguments; root Map → Account → Done → Play Together → Courts → Account reopen → Done passed, without overlap/clipping/crash. Evidence: ActionArtifacts/41DEB671-8A53-471F-9B91-2251469AFFFC/DeviceInteractionSynthesize/Verify Routing Navigation-16_34_09_139-screenshot.png and16_34_11_114,16_34_21_282,16_34_35_698 with matching hierarchies. Session closed. Final receipt helper refinement was compiled/snippet-checked after that UI check. No incoming APNs/tap simulation, permission changes, registration, live chat/read writes or Apple request occurred. Backend unchanged; prior715/715 backend result remains the latest backend evidence.

N07/N08/N09 now include partial local delegate/tap navigation implementation; these entries do not close physical receipt, terminated-launch, actual foreground delivery, stale live notification, modal-deferred tap, membership-loss or session-switch acceptance. Universal/associated links remain pending; no Associated Domains, entitlements, capabilities, signing, secrets, deployment or remote migrations changed. deliveryAvailable remains false. Next: add controlled receipt/tap UI acceptance (including cold launch, pending edit dismissal, fallback and account/session changes), then prepare concrete isolated hosted/sandbox migration37, HTTP/2/provider, signing and physical-iPhone rollout artifacts for required approval. Do not enable readiness based on local fixtures. Preserve all prior release gaps and continue updating every handover/checklist.


## Sandbox activation preparation — November 22, 2026

Owner requested use of connected iPhone17 Pro Max, reports app installed and This iPhone status Not requested (this supersedes earlier statement that notifications were enabled). Assistant workspace device discovery still lists simulators only; CoreDevice fallback timed out and xcdevice fallback could not connect services. Do not claim physical installation/permission/receipt was independently verified. Owner is obtaining an APNs key; instructions supplied from Apple's current key-creation documentation. Never request private-key contents in chat.

Added docs/IOS_APNS_SANDBOX_ROLLOUT.md with reviewed environment/database identity, ordered migration/profile/Preview/worker/readiness steps, physical acceptance matrix and independent rollback. New development/wrangler.apns-sandbox.example.json is a dedicated sender template with native flags false, empty tester list and Apple identifiers, browser push false and no private key. Current checked-in entitlements have Sign in with Apple only, no aps-environment; actual installed provisioning remains unverified. No entitlement/signing/project capability or remote configuration was changed.

Replaced permanently hardcoded native deliveryAvailable=false with a default-off operator assertion NATIVE_PUSH_SANDBOX_READY=true plus an exact comma-separated NATIVE_PUSH_ALLOWED_PLAYER_IDS match, still within existing sandbox/Preview/schema/native-session gates. This allows controlled opt-in once hosted sender configuration is actually reviewed; the assertion does not certify device receipt. Pages needs no Apple key. Sender also requires exact native tester-list membership and rechecks it immediately before provider egress; empty/unset lists permit nobody. Existing APNS_SENDER_ENABLED/provider gates remain independent. Configure matching tester lists in Preview and sender; deployments are not atomic. Existing browser tester behavior is unchanged. No flags are activated by these local edits; the installed app still cannot enable until the remote setup is performed.

Validation: full backend719/719 across34 files passed; backend TypeScript passed; git diff --check clean. Four new cases cover default-off/exact-listed readiness, response parity and production denial, empty/other tester denial and tester removal at final egress. One initial fixture expected an unavailable response on main, but existing outer auth gate correctly returns404; assertion corrected, gate preserved. No Apple requests or configured signing keys used (synthetic/injected transport only). Swift/UI unchanged this slice; previous BuildProject and simulator evidence remain applicable, no new device acceptance claim.

Next: owner supplies secure local APNs .p8 path, Key ID and Developer Team ID; identify actual Preview tester player ID and confirm development App ID/profile. Follow IOS_APNS_SANDBOX_ROLLOUT.md for concrete isolated activation review, migration status/backup, hosted provider validation and physical permission/token/delivery/tap acceptance. Do not use existing authentication secrets for APNs, enable production, blindly apply unrelated pending migrations or mark N05–N09 complete. Continue all handover updates under standing senior iOS/UI/UX implementation instructions.


APNs key follow-up (November22): owner says APNs was enabled on the existing Sign in with Apple key, Key ID PL878X442V, Team ID D8Z42UUJXX. Owner explicitly forbids any Preview/production changes and authorizes examining the matching key in Downloads while ignoring other tokens. Located only the matching .p8 via filename search. File contains one complete PKCS8 block plus surrounding text; whole-file import fails, but extracting that single block in memory successfully imports/signs an ES256 JWT locally. No file was rewritten/copied, no key/JWT or surrounding contents printed, no other token files opened, no Apple request or remote/settings/secret change made. This proves local signing only, not Apple key identity, enabled APNs scopes or provider acceptance. Initial OpenSSL command lacked platform support for -check; switched to local jose validation. Preserve existing Apple sign-in configuration. Remote activation remains prohibited under the owner's latest instruction; continue local work or seek a specific authorized alternative before any hosted secret/configuration/deployment action.
## Contextual iOS notification opt-in

The native app uses a shared, dismissible inline prompt in notification-relevant states: confirmed game participation, a pending game join request, or a pending group membership request. It explains the expected game reminder/request or group update. One per-account “Not now” dismissal applies across these contexts to avoid repeated prompts. The system permission prompt is requested only after “Enable notifications” is tapped. Denied permission routes to iPhone Settings. Joining and requesting never depend on opt-in.

The prompt is eligible only when native sandbox push delivery is available and the relevant Games or Groups account category is already on. It is suppressed when account push and that category are enabled, iPhone authorization is granted, and the current iPhone has an APNs registration. Explicit category opt-outs are respected. The registration endpoint sets account push consent but preserves existing category choices, so a disabled Games/Groups preference is not silently changed by the prompt. When native delivery is unavailable, the prompt is hidden instead of implying notifications can be enabled.

Current code/build status and pending simulator/physical acceptance are recorded in `ios-app/IOS_APP_HANDOVER.md` and `ios-app/IOS_IMPLEMENTATION_WORKLIST.md`.
The prompt also appears for active game waitlists and in the host’s group membership request manager, where push can alert the host to later requests. Game/series chat and group discussions also offer the nudge for future messages and discussion activity. Keep one account-level dismissal across all prompt contexts.

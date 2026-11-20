## Guest permission clarification (Preview 1019f776)

Group owners/co-owners/organizers and non-group hosts can add own guests directly
after confirming a playing place; ordinary players still need approval. Increasing
capacity does not approve pending guest requests. Guests remain counted places,
not user accounts, and gain no chat or group access. Earlier blanket statements
about all guests needing approval are superseded by this exception.

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

# Game chat

Implementation: `functions/lib/game-chat.ts`, `functions/lib/series-chat.ts`, migrations 0027/0028/0029, `src/GameChat.tsx` and `src/ChatDialog.tsx`.
Standalone public, unlisted and group games use game rooms. Group recurring series
use one shared series room across all dates; non-group recurring games keep separate
rooms. No general direct messaging, attachments, read receipts or email delivery.

## Standalone game access and lifecycle

- Organizer can coordinate without occupying a playing place. Confirmed players
  and still-valid invitees can read/send while they retain game access. Pending
  requests, spectators and group membership alone do not grant access.
- Private-group chat additionally requires approved active group membership.
  Archived groups close chat access. Leaving/removal excludes a participant even
  if they have an old invitation; confirmed rejoining clears that exclusion.
- Blocking an organizer prevents their game-chat access. Blocks between other
  players hide each other's messages, unread counts and pushes. Suspension revokes
  sessions and prevents all authenticated actions.
- Send until game end +24 hours; cancellation immediately makes it read-only.
  Read access ends at game end +30 days, or cancellation +30 days. Rescheduling a
  scheduled game moves these deadlines. No public chat endpoint or search indexing.
- Ordinary room cleanup cascades messages and read/mute preferences. Expired
  access is denied even before the next scheduled cleanup. Routine API reads can
  also trigger cleanup. Each scheduled run removes up to 100 expired unheld rooms
  and 100 eligible resolved cases; monitor backlog if volume exceeds this rate.
- Account deletion removes authored messages in ordinary rooms and unheld rooms
  for organized games. Holds and report snapshots follow their separate policy;
  account references become NULL. Backups/recovery copies follow provider windows.

## Shared group series (current)

- Canonical internal room key is series:<series ID>; public chat APIs still use a
  real occurrence game ID. No direct public room lookup is introduced.
- Ordinary players enter after confirmed participation. Current group owners, co-owners and group organizers have role-based access without attendance or a membership record. Persistent series
  membership records track join and last-message times; game records supply recent
  and upcoming confirmed places. The current organizer is retained. Reading,
  muting and quiet membership notices do not count as activity.
- Membership expires only after both game and message activity are 30 days old,
  with no upcoming confirmed place. The SQL access predicate denies expired access
  even before scheduled maintenance creates the departure notice. Group departure
  overrides activity immediately. Rejoining the group alone does not re-admit;
  a fresh game confirmation does. Personal blocks do not generate false inactivity
  departures. Audience lists only currently eligible readers.
- Join, leave and inactivity notices are small centered lines. They carry no push,
  unread increment or report button and do not consume sender message rate limits.
- Messages and notices expire individually after 30 days. Legal holds preserve
  stored evidence but do not expose expired text to participants. Active groups retain series room/read/mute metadata for staff access through quiet periods; individual messages still expire after 30 days.
- Read/mute state and inbox entry are shared. Pending push delivery rechecks current
  membership, mute, blocks, reads and message expiry, then routes to a surviving
  occurrence. One date's cancellation does not cancel the shared conversation.
- Migration 0028 preserves old occurrence message IDs/text/authors/sequences and
  report contexts/holds. Mute is conservative MAX; read cursor is conservative MIN.
  Review any old occurrence hold now attached to the merged series conversation.

## Messaging and notifications

Text is rendered as React text, never HTML. Messages are limited to 2,000 characters
and 10/minute plus 100/hour per sender. Client request UUIDs deduplicate retries.
The database rechecks live sessions/access for writes. No message contents in
push events or service-worker payloads; only IDs and fixed event kinds are sent.
Push uses existing opt-in/game category, current-access/read/block/mute checks,
and at most one queued event per recipient/room per minute. No self notifications.
Taps open the game at #chat. Delivery still depends on the existing sender/device
configuration and is not guaranteed. Inbox unread is one entry per conversation;
muting only disables that room's push. Last-read sequence is clamped to messages
that exist so marking read cannot suppress future messages.

The UI polls while visible, does not persist drafts/messages in local storage,
and clears retained display state on failed authorization or expiry. HTTPS and
Cloudflare platform encryption at rest apply. This is not end-to-end encryption.

## Reports and preservation

Report requires category and explanation (up to 1,000 characters); no self-report,
duplicate open report or inaccessible/blocked message. Up to five reports/hour.
Snapshot: reported message and up to four nearby visible messages. Reports appear
in the existing staff-only queue with a Messages filter; group ownership does not
grant site moderator rights. Account suspension targets the message author's
account, never the message ID.

Staff can load message cases, inspect limited context, hide the reported message,
resolve cases, and preserve/release evidence with a required recorded reason.
Remaining full conversation is inspectable only under an explicit hold. Each
hold has a 30-day review date; this is a human review deadline, not automatic hold
release. Review overdue cases and renew/release as appropriate. Releasing a case
hold leaves the room held if another case still requires it. A hold cannot restore
already deleted content. Participant access still expires during preservation.
Cases remain while open, then expire after 90 days from resolution unless held.
Action logs expire with the case. Other non-message safety reports retain their
existing policy. Policies describe these exceptions; 30/90 days are product rules,
not a claim that one statutory deadline applies to every report.

## Operations

`push-worker.ts` runs cleanup in finally even when delivery is disabled or fails.
`players/moderation/chat-health` exposes only the last cleanup timestamp to staff.
Verify the scheduled job and timestamp before release. Production requires the
approved migration/backup and isolated worker plan in PRODUCTION_ROLLOUT.md.
Never deploy the development source configuration with PUSH_ENABLED=false over a
working tester sender: the Preview update uses a public, variable-free config
with keep_vars/--keep-vars to preserve existing dashboard variables and secrets.
No credentials are needed in this feature's source or docs.

## November 19 Preview verification

Preview 88b2deae / index-B4Xl1o49.js; development schema 0027. Full units391/391;
fresh-server browsers290/290, plus expanded chat/moderation5/5; no snapshot updates.
Minute cleanup heartbeat confirmed on development. Worker version
2e7dbe20-5ea9-4672-91bb-21bdf98b0f31 retains existing variables/secrets. Hosted
anonymous chat/evidence/health return401. Physical Android and authenticated
two-account hosted acceptance remain pending; production and Google Play untouched.
See APP_TESTING_CHECKLIST.md for complete evidence and investigated initial failures.

### Named audience

Authorized chat readers can expand Who can see this chat to list currently active
eligible readers' display names and organizer/player/invitee roles, including
nonplaying organizers. No contact fields/photos are returned. Same chat-access
predicate excludes expired/revoked invitations and departed/ineligible players.
Audience is refreshed with the open conversation; it is not presence/read receipts.
Non-organizer personal blocks hide messages but do not end shared-game access, as
the audience help explains. Preview5a2c2c2a verifies this with392 full unit tests and
5 focused browser cases; Privacy now discloses named-audience visibility.

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


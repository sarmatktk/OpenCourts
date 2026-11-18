# Phase 3: participation, organizer controls and My Games

Local implementation only. Remote migration 0004 and Preview rollout require approval.
All first-release features are free; production remains untouched.

## Approved joining policy

Public games require organizer approval. Pending requests do not reserve capacity.
Approved group members should be able to join group games immediately in the group
phase; guest participation requires approval. Guests must not bypass existing
private-group membership/content restrictions. Guest invitations and membership
approval will be implemented with groups, not as a public/private shortcut now.

## Database

0004_game_participation.sql adds join_policy (default approval for existing games)
and game_join_requests with unique game/player state and cascading deletion.
It is applied locally only. Existing participant uniqueness/capacity triggers
protect approvals in an atomic batch. Do not edit applied migrations.

## APIs

All paths below begin /api/games. Existing public detail reads still exclude
unlisted/group games, with no participant identities in public responses.

- GET /mine: authenticated own organized/joined/requested PUBLIC games, latest 100.
- GET /:id/participation: current user's role/participation/request state.
- GET /:id/participants and /requests: organizer only, minimal display names/IDs.
- POST /:id/join: request a place; unique, no reserved spot, requires profile name.
- POST /:id/leave: withdraw pending request or leave confirmed game. Organizer
  cannot leave; cancel instead. Removed/rejected players cannot self-rejoin.
- POST /:id/approve, /reject, /remove: organizer only, playerId target. Approval
  requires pending request, active target and remaining capacity.
- POST /:id/edit: title/notes with version check. Court/time/format remain fixed;
  cancel/recreate if plans change. No silent rescheduling of confirmed players.
- POST /:id/cancel: organizer cancels; discovery excludes cancelled games, and
  confirmed players see cancellation in My Games/details. No notifications yet.

Writes require Origin, CSRF and authenticated active sessions. Mutations repeat
session and game checks in SQL. Capacity failures leave requests pending. Private
and unlisted IDs return 404. My Games requires login and reveals no other user's
private account data. Public game creation rejects instant joining.

## UI and checks

Game details include request/withdraw/leave state and organizer approvals, rejection,
removal, title/notes editing and cancellation confirmation. My Games has a dedicated
route /play-together/my-games and shared navigation. Existing components, device
themes, form styles and responsive layouts are reused.

Tests cover real SQLite migration SQL, duplicate requests, organizer authorization,
CSRF, private IDs, atomic overbooking, withdrawal/removal, cancellation, My Games
scope and concurrent edits. Browser tests cover request/withdraw and dashboard.

## Development rollout (pending approval)

Review pending migrations and verify dev UUID before executing:

```cmd
npx.cmd wrangler d1 migrations list opencourts-dev --remote --config development/wrangler.remote.json
npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.remote.json
npm.cmd run build:dev
npx.cmd wrangler pages deploy dist --project-name opencourts --branch feature/play-together --commit-dirty=true
```

No push, production deploy, remote seed or remote migration has been performed for
Phase 3. Manual acceptance needs two development accounts: request, approve,
verify confirmed state, leave; also reject/remove, capacity conflict, edit and
cancel. Google/Apple account linking and real Android/mobile Safari tests remain
separate manual gates. Recurring games and guest group workflows remain later.

Validation complete: development build, 209 unit tests, 32 browser tests and diff whitespace checks passed. Phase 3 has not been deployed. Existing Phase 2 Preview and production remain unchanged.
## Member-brought guests: approved clarification

A guest is an extra place attached to a member's participation, not necessarily
another OpenCourts account or a group membership request. Example: Sam (organizer)
= 1 place; Tom with one guest = 2 places; total occupancy = 3. The member selects
number of guests, subject to remaining capacity and organizer approval. Approved
group members can join for themselves immediately; guest additions require approval.
Pending guest additions must not consume confirmed places or block a member's own
confirmed place. The guest receives no private-group content access or membership
merely by being brought to a game. Do not collect guest email or expose names publicly.

Group-phase implementation must store a member's confirmed guest count separately
from requested guest count. All occupancy calculations and database capacity triggers
must sum 1 + confirmed_guest_count for each participant. Approval must atomically
claim all requested places or fail; never partially approve a party silently.
Leaving removes the member and all attached guest places in the same transaction.
Changing or withdrawing guests releases only the affected places. Display names
should clearly say Tom + 1 guest. No guest implementation is enabled yet in Phase 3.

## Voluntary cancellation update

Pending requests can be withdrawn. Approved players can leave using an optional
reason (up to 500 characters); declining to give a reason must never prevent leaving.
0005_game_cancellations.sql stores the latest voluntary approved cancellation per
player/game. This migration is applied locally only; remote 0004 AND 0005 are pending.
Reasons are visible only to the organizer, excluded from public details, discovery
and other participants' API responses. Leaving immediately releases the place.
The organizer sees a private cancellation history. No notifications are sent yet.
## Host notification update

Cancellation/withdrawal now creates an atomic in-app notification for the host,
including player display name, game, optional reason and number of places released.
0006_host_notifications.sql is LOCAL ONLY. Notification creation and place/request
removal share one transaction; retrying leave does not create duplicate events.
Only the host can read/mark their inbox, and public/group privacy filters remain.
My Games displays unread/read notifications, refreshing on focus and every minute
while visible. No email, mobile push or background delivery is implemented. Future
guest cancellation notifications must count all released member-plus-guest places.
Remote Phase 3 rollout now requires migrations 0004, 0005 AND 0006 with approval.

Host notification validation: build and 25 game API tests passed. Notification browser test passed; dashboard fixture corrected for the new endpoint and both dashboard/inbox checks passed.

## Approved development rollout completed

Migrations 0004-0006 applied to isolated remote opencourts-dev with explicit approval November 17, 2026. Preview cf3d2b64 is live at the stable feature alias. HTML route/latest bundle checks, public joining-policy check and signed-out private endpoint checks passed. Production deployment and binding unchanged. Manual two-account acceptance pending. Earlier local-only/pending rollout statements are superseded by this section.
## Header bell and self-request correction

Organizers now receive HTTP 409 if they POST a join request for their own game;
this is enforced by account ID, never display name. Two different accounts may
share a display name and must not be automatically merged. The screenshot's
request was no longer pending at diagnostic time, so its original identity was
not confirmed.

Migration 0007 preserves existing host notifications while extending event kind
with requested and adds an insert trigger for new pending requests. Repeated join
submissions produce only one request and one new-request notification. Withdrawal
and cancellation notifications remain intact. Applied locally only; remote 0007
and deployment require approval.

A shared header bell appears for signed-in players on Play Together, Account and
the development court discovery page. It shows unread count, polls every 30 seconds
while visible, refreshes on focus/read changes, and opens My Games host inbox.
No private notification details appear in the shared header or signed-out state.

Header/self-request correction validation: build,26 API tests and24 game/account browser checks passed; deployment and remote0007 pending approval.
## Requester decision notifications

Migration 0008 replaces the host-only notification storage with game_notifications,
retaining existing events/read states and explicitly identifying recipient_id.
Requesters receive private in-app alerts for approval, rejection, removal and game
cancellation. Game cancellation targets confirmed participants and pending requests,
excluding the organizer and players who left or were rejected/removed. Decision
triggers run inside the state-change transaction and do not fire again for unchanged
status retries. Host request/withdrawal/cancellation alerts remain supported.

Inbox/read operations are recipient-only; no email, identity subject or session
credentials are exposed. A generalized Notifications inbox and header bell serve
both hosts and requesters. Refresh on focus and short visible-page polling; no
OS background notifications/email/push yet. Group notifications remain fail-closed.

0007 and 0008 are applied LOCAL ONLY. Both remote dev migrations and Preview deploy
need approval. Existing Preview remains cf3d2b64 until then.

Final verification: build,214 unit tests and16 game browser tests passed. Pending development rollout consists of0007 and0008 plus latest build; no production operations.

## Notification rollout completed

Approved remote dev migrations0007/0008 succeeded; Preview b5f880ff deployed November17,2026. Bell and both host/requester notification flows available at stable alias. Production unchanged; manual two-account notification acceptance pending.

## Phase 3 automated acceptance complete

Full suite:216 unit and36 browser tests passed. Game API suite30 includes a complete synthetic two-account request, notification read, approval, confirmed-place cancellation/reason/privacy/capacity lifecycle; migration test verifies old events and read states survive0007/0008 with no FK violations. No new app changes were needed. Current hosted build b5f880ff remains unchanged. Automated browser APIs are test fixtures; real Google/Apple sign-in and physical TWA/Safari testing are still manual.
## Organized notification cards and inline decisions

Inbox entries now use scoped stacked cards with a separate requester/title, current
status, game/group link, optional reason, timestamp and action row. Approved managers
can Approve or Deny current pending requests directly in the inbox. Buttons reuse
existing game/group approve/reject APIs; no client-only permission decisions or new
mutation endpoints. API returns actionPlayerId only for an actionable current request
and authorized recipient; resolved/superseded requests have no action target.

Successful decisions mark the notification read, refresh its current state and bell,
and retain requester notifications from existing transaction triggers. Capacity or
stale-permission failures show the server error and refresh the inbox. No additional
migration is required beyond pending0009/0010. Existing groups work remains local,
so the next Preview deployment must include BOTH migrations first.

Validation: development build;31 game and12 group API tests;19 game browser checks
plus the group-inline-approval check passed. New mobile light/dark inbox snapshots
reviewed, and320px width checked. No remote operations performed for this UI fix.

Organized actionable inbox deployed with Phase4 groups to approved Preview14cd548b. Dev migrations0009/0010 applied; no new migration needed specifically for inbox UI. Production unchanged; direct approval/deny user acceptance pending.

Compact inbox follow-up (local): reduced padding/gaps, combined resource link/timestamp, removed empty resolved action areas and tightened success messages. Kept44px decision targets. Desktop/mobile light/dark snapshots reviewed, decision flows and320px checks passed; narrow header spacing corrected. Preview deployment pending approval.

Compact inbox/shared button update published for user review to approved development Preview a9127653. No migrations; production unchanged.

## Latest group role decision (approved design only)

Upcoming group events can be created by Owner/Co-owner/Organizer, not ordinary Members. Organizers approve/deny requests and guests only for OWN events; Owner/Co-owner may manage all group events. Group-membership approval belongs to Owner/Co-owner, never Organizer. Primary Owner alone handles ownership transfer, Co-owner appointment/removal and archival. Public game organizer permissions remain unchanged. Target roles/group games are not yet implemented; the refreshed implementation plan defines Phase5 next steps.


November17 follow-up LOCAL, not deployed: My Games now focuses on schedule only. Notification bell links to dedicated /play-together/notifications inbox; old my-games#host-notifications redirects there. Inbox has All/Unread,20-at-a-time UI rendering within existing latest100 API cap, empty/loading/sign-in states, existing inline Approve/Deny/read controls. Account auth/me returns connectedAccounts(provider,email) only for authenticated own account; public player DTO unchanged, signed-out accounts empty. Profile connected sign-in rows show private provider email or unavailable text, including Apple relay explanation. No migration/resources/production changes.30 auth unit tests and12 focused browser checks passed/recorded; build passed. Last hosted65f4d761 remains unchanged until Preview approval. Update deployment snapshot after publication.


Approved inbox/account-email follow-up published November17: https://10cf494a.opencourts.pages.dev and stable feature alias. Notifications/My Games/Account HTTP200 with index-BTKwqqVl.js verified. Bell opens dedicated inbox; schedule no longer renders notification cards; own connected-provider emails shown privately in Account.30 auth unit checks/12 focused browsers/build passed. No migration, production changes or GitHub push. Supersedes local-only inbox/email checkpoint.


November17 schedule-tabs update LOCAL ONLY: My Games defaults Upcoming, with Requests/Past/Cancelled. Server-side classification and50-item cursor pagination replace mixed100-row history. In-progress until ends_at, old pending requests expire into Cancelled, left/withdrawn/removed/declined statuses labeled. Existing cancellation/withdrawal records preserve own history; revoked group membership hides private history and reasons never enter schedule DTO.39 games+24 groups API tests/four browser checks/build passed. No migration/resources/production changes. Last hosted10cf494a; Preview publication pending. See play-together-schedule.md.

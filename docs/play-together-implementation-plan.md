# Play Together implementation plan - current state

## Current group-game policy — November 21, 2026

User clarification supersedes historical public-group event exceptions (including migration 0022 and the November 18 public-event rollout notes): **all group games are members-only, in both public and private groups**. Public visibility exposes the limited group preview, never its games. A player requests group membership first; an active Owner, Co-owner or Organizer approves the request; only then can that approved active member view/join group games, subject to capacity and existing lifecycle rules. Pending, rejected, removed and signed-out players have no group-game access. Game-host approval, invitations and shared URLs cannot substitute for membership approval. Standalone public/unlisted games retain their separate host-approval rules. Organizers approve/reject membership requests but do not gain group metadata, role-assignment, archive or other managers' game powers. Legacy Admin compatibility remains existing behavior.

Local implementation: membership checks in details, discovery/feed, participation, chat, invitations, inbox and push delivery; migration `0036_members_only_group_games.sql` restores the database participant guard and includes Organizers in membership-request notifications. This migration and server changes have **not been applied remotely**. Previously deployed behavior remains until an approved server rollout. Review existing outsider attendance/requests for a separate explicit migration decision before rollout; this migration does not silently delete historic attendance. Native group membership approval UI remains batch 6 work; native request/leave and approved-member game navigation exist.

Updated November 19, 2026. This current plan supersedes the outdated milestone snapshots
previously collected here. Read PLAY_TOGETHER_HANDOFF.md for deployment and local-work status,
PLAY_TOGETHER.md for approved product decisions, and the feature guides for implementation detail.

## Latest checkpoint (November 19)

Series management and recurring games are now implemented and published through schema 0023; older phase 8 deferral and schema 0017 snapshots below are historical. Read the latest handoff entries for current Preview releases. Current group roles allow one permanent Owner, at most one Co-owner and one Organizer; ownership transfer is not available. Public-group events are publicly discoverable; private-group events and all group member lists require approved membership. Current work is testing/polish and production readiness, not push/email implementation. Email remains deferred; Android push inspection does not authorize implementation. Native iOS, payments and production release remain separate milestones.

## Environments and preservation

- Repository: OpenCourts; branch `feature/play-together`.
- Stable Preview: https://feature-play-together.opencourts.pages.dev
- Published audit-fix candidate: https://89a8ba19.opencourts.pages.dev
- Published JavaScript: `index-CVviCwyx.js`.
- Preview D1: `opencourts-dev`, `cae4849c-3e99-4945-9d70-bef7b48707ce`; schema through 0017.
- Production remains `main`, deployment `7ef38ff2-91e0-4505-a215-fa16edcfa0bc`,
  D1 `opencourts-courts` / `56c414b7-aca5-429b-acfa-b9e8e87b052b`.
- Feature additions are uncommitted/untracked working-tree changes. Preserve all work.
  Do not reset, clean, switch branches, merge main, or infer that GitHub contains deployed code.
- Direct preview deployment does not require a GitHub push. No production rollout authorized.

## Implemented first-release web milestones

1. Authentication and profiles: Google/Apple only; shared player identity and explicit
   provider linking, private connected-provider emails, profile visibility, circular photo
   framing and optimized private image processing. Never merge accounts by email/name alone.
2. Public discovery and creation: existing OpenCourts court catalog/labels, location
   autocomplete, game time/format/capacity, details and location-based discovery.
3. Participation and schedule: public approval requests, host approvals/denials, withdrawal,
   confirmed leave with optional private reason, host/requester notifications, dedicated inbox,
   My Games upcoming/requests/past/cancelled sections, and atomic guest-party capacity.
4. Groups: discoverable public/private previews, approved memberships, My Groups, compact
   searchable member directory, requests/approval/removal/leave, group management and roles.
5. Group games and invitations: hashed revocable optional-expiry links that still require
   approval; group-only creation/access/feed, approved-member self-join and guest approval;
   upcoming events transfer to the primary Owner when their Organizer leaves or loses the role.
6. Sharing and safety: public/group sharing, unlisted game invitations with explicit access
   and approval rules, opt-in player search by name/general location/city/ZIP, symmetric blocks,
   player/game/group reports and explicitly assigned report reviewers.

All first-release features are free. Group roles are independent of future paid entitlements.

## Approved roles and privacy rules

| Role | Permissions |
| --- | --- |
| Primary Owner | Full group control; sole Co-owner appointment/removal, ownership transfer and archival; direct guest addition and guest-request decisions in all group games |
| Co-owner | Group settings/members/Organizers and all group events; direct guest addition and guest-request decisions in all group games; cannot change Owner or peer Co-owners |
| Organizer | Create group games; manage own games; direct guest addition and guest-request decisions in group games without broader edit/cancel/remove authority |
| Member | Participate and request guest places; cannot create group games or directly add/approve guests |
| Legacy Admin | Existing permissions preserved until explicitly changed by Owner; no automatic promotion |

Server functions enforce current membership and permissions on every protected operation.
Private means private content, not hidden discovery: every private group has a limited public
preview with approved public fields only. Rosters, private descriptions and group games stay
members-only. Forwarded URLs and invitations never bypass approval or current membership.
For standalone games, only the game host can directly add guests or approve/reject guest requests. In group games, group Owners/Co-owners/Organizers can directly add their own guests and decide other members' guest requests; other players request guest places. Requests do not reserve capacity; a full-capacity failure leaves approval requests pending and adds no guests. Guests consume places but gain neither accounts, group membership, private content or chat access.
Prevent duplicate memberships/participation and overbooking using existing shared game logic.

## Current phase 7 - release hardening and acceptance

Completed locally and published in candidate c17ef75c:

- Eight QA findings fixed: private-game access revalidation and state cleanup; contrast;
  court-search combobox semantics; focused inline confirmations; compact member management;
  metadata separator; page titles; search announcements.
- 257 unit tests, 85 browser workflows, final development build; 350 screen/theme audit states
  with no detected axe violations, uncaught JS errors or page overflow.
- Production deployment and separate Preview D1 binding verified before/after publication.
- Earlier 26 live synthetic API assertions passed against schema 0017; fixtures removed.
  They are not new real-provider or physical-device results.

Subsequent hardening, now published in 89a8ba19:

- Player search cancels superseded fetches, ignores stale results/errors/loading transitions,
  and invalidates pending results on unmount. Concurrent-submission stress test failed before
  the fix and passes afterward. See QA_AUDIT.md for evidence and scope.

Next release work:

1. Physical iPhone Safari, Android Chrome/TWA and tablet acceptance; real Google/Apple
   callbacks/linking, photo gestures, keyboard/safe areas, navigation and external directions.
   Preview does not change existing app domains or require a mobile-app release.
2. Screen-reader/keyboard-only review, including comboboxes, confirmations and member actions.
3. Review pending-request pagination (current review bound 200), notification retention,
   report triage/enforcement/retention responsibilities and support response process.
   Do not silently delete data or grant moderation privileges as a retention shortcut.
4. Reconcile dependency-advisory metadata with the patched MapLibre 5.24.1 backport and review
   remaining development-tool findings. Do not claim npm audit is clean or run force fixes.
5. Complete PLAY_TOGETHER_RELEASE_CHECKLIST.md. Production rollout needs separate approval,
   reviewed migrations/config, backup/rollback and production-only bindings. Keep test data out.

## Later milestones - not part of current release hardening

- Phase 8: recurring/series games, after the first release. Not approved as Pro-only.
  Design series/occurrence editing, timezone/DST handling, cancellation and participation first.
- Phase 9: separately approved subscriptions and entitlements; no payments implemented now.
- Phase 10: native Swift integration using shared identity/backend. Applicable iOS purchases
  use Apple/StoreKit. Native integration and Android billing require their own scoped design.

## Implementation rules

Reuse React, TypeScript, Vite, Pages Functions, D1, existing CSS/theme system and icons.
Keep the automatic device theme and mobile dock. No new visual system, Firebase or Supabase.
Add migrations instead of editing applied SQL. Use only isolated development resources.
Record actual verification and limits; browser fixtures cannot certify real OAuth/devices.
Update the handover, feature docs and audit statuses as each approved milestone is completed.


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


## Active milestone - notification foundation and Android Web Push

November19: implement/test locally under NOTIFICATION_ARCHITECTURE.md, then seek approval for migration0024 and the isolated development sender/configuration. Share events with future APNs/email, but implement Web Push first. Email remains deferred. Physical Android delivery and sign-out/privacy acceptance are release gates. Production deployment is a separate decision.

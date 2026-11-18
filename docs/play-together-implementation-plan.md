# Play Together implementation plan - current state

Updated November 17, 2026. This current plan supersedes the outdated milestone snapshots
previously collected here. Read PLAY_TOGETHER_HANDOFF.md for deployment and local-work status,
PLAY_TOGETHER.md for approved product decisions, and the feature guides for implementation detail.

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
| Primary Owner | Full group control; sole Co-owner appointment/removal, ownership transfer and archival |
| Co-owner | Group settings/members/Organizers and all group events; cannot change Owner or peer Co-owners |
| Organizer | Create group games and manage own games, requests and guest places |
| Member | Participate and request guest places; cannot create group games |
| Legacy Admin | Existing permissions preserved until explicitly changed by Owner; no automatic promotion |

Server functions enforce current membership and permissions on every protected operation.
Private means private content, not hidden discovery: every private group has a limited public
preview with approved public fields only. Rosters, private descriptions and group games stay
members-only. Forwarded URLs and invitations never bypass approval or current membership.
Guests consume places but gain neither accounts, group membership nor private content access.
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

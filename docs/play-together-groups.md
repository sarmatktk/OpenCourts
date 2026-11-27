# Phase 4: public/private groups

## Current implementation and rollout — November 27, 2026

Use the [current Play Together handoff](PLAY_TOGETHER_HANDOFF.md) for active
release state. Group membership approval, role checks, and members-only group
game access are implemented in the current website/API and iOS source. Migration
0036 was applied to Production; do not follow the historical rollout warning
below as a current instruction. Historical entries describe their dated state.
The current app's multi-account acceptance and post-release device confirmation
remain separate from server deployment status.

## Current group-game policy — November 21, 2026

User clarification supersedes historical public-group event exceptions (including migration 0022 and the November 18 public-event rollout notes): **all group games are members-only, in both public and private groups**. Public visibility exposes the limited group preview, never its games. A player requests group membership first; an active Owner, Co-owner or Organizer approves the request; only then can that approved active member view/join group games, subject to capacity and existing lifecycle rules. Pending, rejected, removed and signed-out players have no group-game access. Game-host approval, invitations and shared URLs cannot substitute for membership approval. Standalone public/unlisted games retain their separate host-approval rules. Organizers approve/reject membership requests but do not gain group metadata, role-assignment, archive or other managers' game powers. Legacy Admin compatibility remains existing behavior.

The current server checks membership in details, discovery/feed, participation,
chat, invitations, inbox and push delivery. Migration
`0036_members_only_group_games.sql` is applied to Production and preserves
historic attendance. Native membership approval and management UI are in the
current source; multi-account/device acceptance remains a client release check.
The old local-only rollout warning has been removed from this current summary;
dated rollout entries below remain as history.

## Historical role clarification — November 21, 2026

The following records the then-proposed role model. Its rollout status is
superseded by the current implementation and rollout summary above.

Latest UI review Preview is a9127653. Implemented group schema still uses one Owner,
legacy Admin and Member. User approved a NEW target model: Owner, Co-owner, Organizer,
Member. This target is NOT coded/migrated/deployed. Owner alone appoints/removes
Co-owners, transfers ownership and archives. Co-owners otherwise manage the group
and all its events; Organizers create/manage own events and event/guest requests,
not group membership; Members participate but cannot create group games.
Earlier descriptions of Admins below document current legacy behavior, not target
Co-owner powers. Phase5 must plan a safe explicit legacy-role transition first,
then invitations/group games/guests. See the central matrix and implementation plan.
No automatic Admin elevation or new paid roles. This clarification is docs-only.


Implemented and deployed to development Preview14cd548b with user approval November17,2026. Remote dev migrations0009/0010 applied. Production unchanged. Historical local-only rollout instructions below are superseded by the completed rollout section.

## Implemented

- Discover both public and private groups with name/location search and paged results.
- Create a group: name, visibility, optional public description, general location,
  members-only description and optional skill preference. Private is the default.
- My Groups shows current/pending memberships, own role and archival status.
- Request, withdraw, approve/reject, remove and leave membership.
- Owner assigns/demotes admins; admins manage ordinary members and requests.
- Owner transfers ownership to an active member; owner must transfer before leaving.
- Metadata editing uses version checks; owner may archive a group.
- Group membership requests/decisions/archive alerts reuse private inbox/header bell.
- All free; existing design, automatic light/dark themes and mobile navigation reused.

## Visibility and authorization

Public responses allowlist ONLY group ID, name, public description, general location
and visibility. Private description/skill and member names never appear in previews.
A signed-in user may also see their OWN membership status/role. Approved active
members can read members-only descriptions/skill and rosters. Only active owners/
admins can read pending request queues or edit metadata. Owners alone assign roles,
manage peer admins, transfer ownership or archive. Admins cannot promote themselves.
Archived groups leave discovery and members-only access closes. My Groups can still
show archived memberships. Public groups also require approval as the safe default;
public visibility never exposes rosters or automatically approves membership.

Removal/leave blocks protected reads on subsequent requests. Current group pages
refresh on focus/30-second visible-page polling and clear protected content/rosters
on loss of membership. Previously viewed information cannot be withdrawn. Rejected
or removed players may submit a fresh pending request; no access is restored until
new approval. Shared URLs do not grant membership. Hidden/unlisted groups are absent.
All mutations require authenticated session, CSRF and Origin; SQL repeats active role/
session checks. Admin/target role races cause updates to fail instead of broadening
permissions. Membership uniqueness is enforced in D1. Creation retries use a UUID;
creation has a short anti-burst guard, not a Pro limit.

## Schema and account lifecycle

0009_tennis_groups.sql adds tennis_groups and group_memberships, keys/checks/indexes.
0010_group_notifications.sql adds private group notifications and state triggers.
Both are applied LOCAL ONLY. Do not edit these applied migrations.

Owners must transfer or archive active groups before deleting their account.
Deleting an account also deletes its owned archived groups and their memberships/
notifications. Member account deletion cascades only their membership/notifications.
Account UI discloses this; no payment or entitlement behavior was introduced.

Group notifications are recipient-scoped. Removed/demoted admins cannot read old
request notifications containing applicant names. Applicant decision notifications
use generic administrator attribution, avoiding disclosure of private admin identities
to rejected/nonmembers. Public group previews remain accessible after private access
is revoked. Game notifications continue to use their original permissions.

## Routes and API

Pages: /play-together/groups, /my-groups, /create-group, /group?id=UUID (all with
/play-together prefix). Shared shell accepts an optional group back-link; game routes
keep their existing behavior. Vite rejects group APIs and directs developers to the
local Pages server; no production API proxy.

API prefix /api/groups:
- GET root: public previews, q search, before cursor, 25 results/page.
- POST root: authenticated creation, organizer profile, idempotent requestId.
- GET /mine: signed-in own active/pending memberships, latest 100 groups.
- GET /:id: public preview plus own membership; member content only when active.
- GET /:id/members: approved members only; maximum 200 currently displayed.
- GET /:id/requests: owners/admins only; maximum 200 currently displayed.
- POST /:id/request, /leave: own membership workflow.
- POST /:id/approve, /reject, /remove: authorized manager, playerId target.
- POST /:id/role: owner only, active playerId and member/admin role.
- POST /:id/transfer: owner only, active member target.
- POST /:id/edit: owner/admin with current version and editable metadata.
- POST /:id/archive: owner only.

No public/private group activity endpoints exist yet. Existing game APIs still return
404 for group/unlisted games. Invitations, guest party counts and protected group-only
games are Phase 5, required before first release; recurrence follows release one.
Notifications are in-app only; email/push, large-roster pagination and actual device
acceptance remain later release gates.

## Verification and rollout

Tests use real SQLite SQL/transactions and synthetic accounts, not remote data.
Group tests cover preview allowlists, requests, removal, admin/owner restrictions,
transfer/archive, account deletion and notification privacy. Browser tests use API
fixtures for creation/approval/withdrawal, revoked-content clearing, theme and narrow
viewport checks. Chrome checks do not replace physical Safari/TWA testing.

Before an approved Preview rollout, verify dev UUID
cae4849c-3e99-4945-9d70-bef7b48707ce and all pending SQL, then:

```cmd
npx.cmd wrangler d1 migrations list opencourts-dev --remote --config development/wrangler.remote.json
npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.remote.json
npm.cmd run build:dev
npx.cmd wrangler pages deploy dist --project-name opencourts --branch feature/play-together --commit-dirty=true
```

0009 and 0010 must be applied BEFORE deploying this code (auth deletion and inbox
now query the group tables). No remote group migrations/deployment have run yet.
Verify stable alias/group pages, public preview privacy, signed-out protected APIs,
Preview D1 binding, and unchanged production deployment/binding after rollout.
Have two users test creation, request/approve, roster, removal and notifications.

Final local evidence: build passed; full227 unit tests and43 browser tests passed. Final12 group API tests passed;7 group browser checks passed after the group back-link layout correction. Light/dark group preview screenshots reviewed. No remote rollout yet.

## Completed approved Preview rollout

0009/0010 applied only to opencourts-dev, followed by Preview14cd548b. Stable alias group routes and latest bundle return200; public group discovery returns an empty list successfully; signed-out private APIs return401. Preview development binding and unchanged production verified. No seed group or GitHub push. Manual two-account group acceptance pending. Organized inbox cards support inline game/group Approve/Deny with server checks.

Group navigation UI follow-up: polished icon buttons with existing design tokens, active page styling, accessible focus and responsive mobile layout. Build/group browser checks pass. Local only pending Preview approval.

Group navigation/shared button polish published for review to approved development Preview a9127653. No schema changes.

Member management layout follow-up: compact member rows, role badges, styled selects, aligned responsive actions and expandable role help. Local UI-only change; permissions unchanged; Preview approval pending.

General location display now includes existing Lucide MapPin icon in group cards/My Groups/detail, local only. General location privacy unchanged; no map tracking or geocoding added.


November 22 native visibility continuation (R10 Partial local): group-event rows/cursors clear on refresh, account/scene changes and disappearance; membership is revalidated around feed fetches, regardless of public/private group visibility. Native group-detail edit confirmations explicitly preserve public limited previews/covers and members-only details/games; edit POST requires fresh permission/version. All612 local backend checks and native visibility fixtures pass. Read-only simulator empty-list refresh and local visibility alert/cancel/discard pass; no visibility save, deployment or live mutation. Actual transitions/races and multi-account/device acceptance remain pending. See ios-app/IOS_APP_HANDOVER.md for evidence and the recurring-series continuation queue.

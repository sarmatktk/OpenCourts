# Group games and personal feed - Phase 5C

## Current group-game policy — November 21, 2026

User clarification supersedes historical public-group event exceptions (including migration 0022 and the November 18 public-event rollout notes): **all group games are members-only, in both public and private groups**. Public visibility exposes the limited group preview, never its games. A player requests group membership first; an active Owner, Co-owner or Organizer approves the request; only then can that approved active member view/join group games, subject to capacity and existing lifecycle rules. Pending, rejected, removed and signed-out players have no group-game access. Game-host approval, invitations and shared URLs cannot substitute for membership approval. Standalone public/unlisted games retain their separate host-approval rules. Organizers approve/reject membership requests but do not gain group metadata, role-assignment, archive or other managers' game powers. Legacy Admin compatibility remains existing behavior.

Local implementation: membership checks in details, discovery/feed, participation, chat, invitations, inbox and push delivery; migration `0036_members_only_group_games.sql` restores the database participant guard and includes Organizers in membership-request notifications. This migration and server changes have **not been applied remotely**. Previously deployed behavior remains until an approved server rollout. Review existing outsider attendance/requests for a separate explicit migration decision before rollout; this migration does not silently delete historic attendance. Native group membership approval UI remains batch 6 work; native request/leave and approved-member game navigation exist.

Local implementation only. Preview962fb2da remains invitations build. Migrations0014
and0015 applied LOCAL ONLY; approval needed before remote dev migration/deploy.

## Guest places update — November 23, 2026

The earlier “No guest workflow enabled yet” status below is historical and superseded. Current rule: group Owner/Co-owner/Organizer can add their own guests without approval and approve/reject other members' guest requests; standalone games are host-only for direct guest additions and request decisions. Full capacity does not reserve places and an approval request remains pending. The role-scoped API is on feature Preview deployment `f6939c04`; production is unchanged. See `play-together-guests.md` for the current detail and native acceptance status.

Shared games model supports public/group audiences. GroupId creation requires approved
active Owner/Coowner/Organizer, repeated in SQL. Members and legacy Admins cannot create.
Group games use instant self-join for approved active members; outsiders cannot view,
join, inspect counts/participants, or infer private details through public discovery.
Unlisted games remain fail-closed. Guest places use the role and capacity rules in the current Guest places update above.

Group details show upcoming group games and Create group game for authorized roles.
Personal /play-together/feed has All/My Games/My Groups filters, chronological25-item
cursor pages, group/court/time and Going/Organizing/request/cancellation state. Feed
includes group upcoming games for current memberships and public games the user is
involved with; global public discovery stays separate. Per-group feed validates
membership first. Focus/30second refresh clears revoked content on subsequent fetch.
Server enforces current membership on each detail/participation/feed/inbox read.

Shared participation service uses group capabilities: Owner/Coowner manage all group
games; Organizer manages own. Approved member can self-join with unique participation
and capacity triggers. Group access is rechecked in mutation SQL; DB trigger blocks
participant insertion without current approved group membership. Ordinary players
cannot change audience/group/owner through event editing. Title/notes editing only;
rescheduling still requires cancel/recreate.

Approved lifecycle: future scheduled games transfer to primary Owner if Organizer
leaves/is removed/loses event role; transfer is hosting authority, not automatically
another playing place. Leaving/removal clears their future participant place and
requests. Archiving cancels future group games. Account deletion transfers future
organized group games before player cascade. Already-ended games follow existing
account cascade behavior. No guest counts yet, so future guest release must extend
these same lifecycle guards atomically.

Group notification inbox is membership-filtered and My Games includes own protected
group participation. Public details/search never include group games. Group cancellation/
removal decisions use existing notification triggers, and only still-approved members
can read those private game notifications. Archived group content stays inaccessible.

Evidence: full240-unit suite passed including real SQLite group creation, public-list
privacy, outsider404, feed inclusion/removal, member self-join and organizer transfer.
Browser/feed checks recorded in handoff. Real multi-account/device acceptance remains.
No remote mutations in this milestone. Next review local code/migrations and approve
dev0014/0015 + Preview; then add requested/confirmed guest counts/party capacity.


Preview rollout November 17: user approved publication. Dev-only migrations 0014/0015 successfully applied to opencourts-dev (cae4849c-3e99-4945-9d70-bef7b48707ce). Build deployed directly to existing Pages project opencourts, feature/play-together branch, deployment 17d2fa6b-4ea2-47c8-8081-095644e85ee2. Stable URL https://feature-play-together.opencourts.pages.dev; immutable https://17d2fa6b.opencourts.pages.dev. Includes group games, personal feed and phone/tablet floating dock. Feed/groups/account returned HTTP200 with bundle index-LsELY3PS.js; public games/auth-me HTTP200. Preview/production D1 UUIDs confirmed separate. No GitHub push or production deployment. Real signed-in two-account acceptance remains manual; next guest-party requests/capacity. This supersedes all local-only/remote0013 checkpoints above.


November 22 native R07 continuation: game editor now checks current management authority and expected version before showing the draft, reviewing or saving; denied/uncertain state hides editing and requires close/refresh. Management decisions preflight current participation before POST and clear old queues. Existing server lifecycle/roles remain authoritative. Full local suite601/601 and native authority/route fixtures pass. Simulator non-host participation and measured game-detail dock clearance pass, but current account has no managed upcoming game; actual authorized editor/role-loss/transfer/multi-account/device acceptance remains pending. No live mutations or deployment. See latest iOS handover/worklist for exact evidence.

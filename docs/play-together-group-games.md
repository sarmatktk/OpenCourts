# Group games and personal feed - Phase 5C

Local implementation only. Preview962fb2da remains invitations build. Migrations0014
and0015 applied LOCAL ONLY; approval needed before remote dev migration/deploy.

Shared games model supports public/group audiences. GroupId creation requires approved
active Owner/Coowner/Organizer, repeated in SQL. Members and legacy Admins cannot create.
Group games use instant self-join for approved active members; outsiders cannot view,
join, inspect counts/participants, or infer private details through public discovery.
Unlisted games remain fail-closed. No guest workflow enabled yet.

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

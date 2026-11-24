# Guest places — policy and implementation

## Current permission and capacity policy — November 23, 2026

This owner-confirmed policy supersedes older blanket-approval wording below. In group games, the Owner, Co-owners and Organizers can add their own guests directly without approval after confirming their own place and when capacity permits; all three roles can approve/reject other group members' guest requests. Other group members request guest places. In standalone games, only the game host can add guests directly or decide guest requests. Requests reserve no capacity. A full-capacity approval leaves the request pending; a failed direct addition adds no guests. Guests get no player account, group membership, private content or chat access.

The role-scoped guest API is deployed to feature Preview deployment `f6939c04`; no migration was needed for that change and production is unchanged. Native pending counts and capacity alerts build locally; physical-device alert/focus acceptance remains pending.

The guest feature and migration0016 are already present in the Preview rollout. This supersedes the original local-only and remote-schema warnings in the dated implementation notes below. Production remains unchanged.

## Implemented behavior

The earlier image-processing and layout Preview checkpoints below are unrelated history. Current deployment status is recorded above.

Migration0016 adds confirmed guest_count to a participant, one guest request per sponsor/game,
and private guest notifications. Guest records have no account, membership, name or private-content access.
Approved active group members self-join; confirmed players may then add or request1-3 guests subject to game-format capacity and the role policy above. Standalone players must first receive host approval for their own place. A host or authorized group role uses direct addition when permitted rather than submitting an approval request for their own guests.

For group games, group Owners, Co-owners and Organizers approve/reject requests in Game details. For standalone games, only the game host can decide guest requests.
A request consumes no places until approved. A capacity conflict leaves it pending and is reported to the manager. Database triggers enforce SUM(1+guest_count),
including concurrent member joining, guest approval and capacity changes. Requests use current
session/CSRF and repeated SQL checks of event state and group management/membership rights.

Sponsor can cancel pending or approved guest places without losing their own confirmed place.
Sponsor leaving releases their own place plus approved guests, cascades the request and notifies
the host with full places-released count and existing optional cancellation reason. Group removal
uses the same participant cascade; guest access never bypasses group membership.

Separate private guest notifications inform host of request/cancellation and sponsor of decisions.
The existing bell counts them. Notifications link to Game details for decisions; inline guest
approval in the inbox is not implemented. No OS push/email. Group notifications require current
approved membership. No private addresses, tokens or guest identities added to API projections.

## Original guest rollout notes (historical)

Full243-unit suite passed, including real SQLite guest approval, complete-party release,
unique request behavior, overbooking rollback, group privacy and lifecycle. Focused guest
phone light/dark and host-control browser checks complement API tests. Development build passes.
Migration0016 applied to LOCAL SQLite ONLY. Do not publish this new backend against remote
schema0015; first obtain explicit approval to apply0016 to opencourts-dev and publish Preview.
No production changes or GitHub push. Manual two-account Preview testing remains next.

## Original next-work list (historical)

Preview acceptance: Sam host, Tom member + one guest should show3/4, Jane can fill final
place, another guest approval must fail, Tom cancels guests then leaves, host receives notices.
Check rejected/pending requests, revoked membership, public approval and phone themes.
Then sharing/unlisted games, opt-in player discovery, blocking/reporting, security/accessibility/device review.
Recurring games remain the milestone after the free first release. Payments/native iOS remain deferred.


Guest Preview rollout approved and completed: migration0016 applied only to opencourts-dev cae4849c-3e99-4945-9d70-bef7b48707ce. New deployment https://6eec28c4.opencourts.pages.dev, alias https://feature-play-together.opencourts.pages.dev. Bundle index-3lPfxaLb.js verified; public games endpoint HTTP200. Production deployment remains7ef38ff2. No GitHub push or production mutation. Guest feature now ready for manual two-account acceptance (host approves player first for public games, then approves guests; approved group members self-join then request guests). This supersedes LOCAL ONLY/remote0015 guest notes. Next: Preview acceptance, then sharing/unlisted games and safety/discovery milestones.

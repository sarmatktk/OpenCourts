# Guest places - local development milestone

Published Preview remains703d8689 (badge, avatar framing and non-scrolling group shortcuts).
Private development image processor versionc5e01912-6e84-4938-bf78-049d2096bd24 preserves full portrait framing. Re-upload original headshots to replace old square crops.

## Implemented locally

Migration0016 adds confirmed guest_count to a participant, one guest request per sponsor/game,
and private guest notifications. Guest records have no account, membership, name or private-content access.
Approved active group members self-join; confirmed players may then request1-3 guests subject to game format capacity. Public players must first receive approval for their own place. The host cannot request guest places through this participant workflow.

Hosts and authorized group event managers approve/deny guest requests in Game details.
A request consumes no places until approved. Database triggers enforce SUM(1+guest_count),
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

## Validation and rollout

Full243-unit suite passed, including real SQLite guest approval, complete-party release,
unique request behavior, overbooking rollback, group privacy and lifecycle. Focused guest
phone light/dark and host-control browser checks complement API tests. Development build passes.
Migration0016 applied to LOCAL SQLite ONLY. Do not publish this new backend against remote
schema0015; first obtain explicit approval to apply0016 to opencourts-dev and publish Preview.
No production changes or GitHub push. Manual two-account Preview testing remains next.

## Next work

Preview acceptance: Sam host, Tom member + one guest should show3/4, Jane can fill final
place, another guest approval must fail, Tom cancels guests then leaves, host receives notices.
Check rejected/pending requests, revoked membership, public approval and phone themes.
Then sharing/unlisted games, opt-in player discovery, blocking/reporting, security/accessibility/device review.
Recurring games remain the milestone after the free first release. Payments/native iOS remain deferred.


Guest Preview rollout approved and completed: migration0016 applied only to opencourts-dev cae4849c-3e99-4945-9d70-bef7b48707ce. New deployment https://6eec28c4.opencourts.pages.dev, alias https://feature-play-together.opencourts.pages.dev. Bundle index-3lPfxaLb.js verified; public games endpoint HTTP200. Production deployment remains7ef38ff2. No GitHub push or production mutation. Guest feature now ready for manual two-account acceptance (host approves player first for public games, then approves guests; approved group members self-join then request guests). This supersedes LOCAL ONLY/remote0015 guest notes. Next: Preview acceptance, then sharing/unlisted games and safety/discovery milestones.

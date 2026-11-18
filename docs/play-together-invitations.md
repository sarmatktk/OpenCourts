# Secure group invitations - Phase 5B

Local implementation only; hosted Preview36c696b2 currently contains the header-avatar
update. New migration0013_group_invitations.sql applied LOCAL ONLY. Remote migration
and invitation UI deployment require approval.

Owner/Co-owner can create invitation links (1/7/30 days or no expiry), copy the full
link once, view invitation metadata and revoke links. Legacy Admin/Organizer/Member
cannot issue or revoke. Creator must remain active Owner/Coowner; role loss or group
archival invalidates links server-side. No unlisted/hidden groups introduced.

Tokens use32 cryptographically random bytes encoded hex; D1 stores SHA256 hashes
only. URL fragment carries token; landing page POSTs token for preview/accept rather
than placing it in a query/path. Logs must never record invitation request bodies.
Public preview allowlists group ID/name/public description/general location/visibility
only; no roster, private description, skill, schedule or admin identity. Metadata
lists never include token/hash. Raw token shown once, revocation does not require it.

Signed-in acceptance requires Origin/CSRF/session/display name, validates token and
creator role again in SQL, and creates a unique pending membership. Existing active
members stay active; pending requests remain deduplicated. Removed/rejected/former
members can request fresh approval but gain no content access. Redemption records
are unique per invitation/player and never substitute for active membership.

Creation anti-burst limit10/min/group. No email delivery/guest access. Sign-in page
currently requires reopening invitation link afterward (explicit instruction shown).
Invitation use-count limits/acceptance rate limiting beyond current session/creation
controls should be reviewed before broad public release. No cap on total accepted
members is enforced as a paid/free policy. Invitations do not grant new roles.

Local routes: /play-together/invitation#TOKEN; POST /api/groups/invitation-preview,
POST /invitation-accept, GET/POST /:groupId/invitations, POST /:groupId/revoke-invitation.
Core group authorization/privacy remains unchanged. Current same-origin no-store
JSON helpers used throughout. No original user accounts or production data changed.

Next: approval for dev0013 + Preview deployment; two real accounts test invitation
copy/open/sign-in/request/approve/revoke/expire. Then protected group games and
member-plus-guest capacity with reviewed role-loss/event ownership lifecycle.

Latest approved rollout: invitation0013 applied to opencourts-dev and Preview962fb2da published (index-CJSUEJ5t.js). Stable alias invitation route verified. Production7ef38ff2 unchanged. Group-only games next: shared groupGameAccess authorization foundation added LOCALLY,19 group tests pass. It denies outsiders/removed members; Owner/Coowner create/manage all, Organizer creates/manages own, ordinary Member/legacy Admin cannot create. No group game routes/UI enabled yet. User explicitly selected lifecycle: upcoming games transfer to primary Owner when Organizer leaves/loses role; departing member places must be released. Implement creation/list/detail/participation/notifications with those checks next; do not claim group games complete.

# Phase 5A: group roles transition proposal

Prepared November 17, 2026. Next implementation milestone; no schema/code changes yet.

## Scope and approved permissions

Introduce Co-owner and Organizer while retaining one authoritative primary Owner.
Owner alone appoints/removes Co-owners, transfers ownership and archives the group.
Co-owners manage settings, membership and ordinary Organizer roles, and eventually
all group events. Organizers manage only their OWN events/participants/guest requests.
Members cannot create group events. All roles are free in release one.

## Recommended existing-role transition

Preserve legacy Admins as legacy Admins with exactly their existing permissions:
metadata edits, membership approval/rejection and ordinary-member removal. Do not
promote them to Co-owner, add event permissions, or demote them without an Owner
choice. New role assignment UI offers Member, Organizer and Co-owner; legacy Admin
is a transitional display state only and cannot be newly assigned. Owner explicitly
converts each existing Admin when ready. Owner's underlying membership role is not
an independent source of ownership; tennis_groups.owner_id remains authoritative.

Do not rebuild membership rows or lose notification triggers. Proposed additive
role column (Member/Organizer/Co-owner), nullable for legacy Admin fallback, allows
migration without changing applied0009 or deleting existing memberships. All APIs
must derive capabilities from the authoritative owner and current active membership;
legacy Admin handling must not accidentally satisfy Co-owner/event checks.

## Implementation order

1. Add new migration after0010; preserve membership IDs/statuses/created times and
   triggers. Test migration on existing Owner/Admin/Member fixtures and rollback of
   rejected mutations, with no remote writes.
2. Centralize capability checks and use them in group metadata, roster/request
   queue, role assignment/removal, ownership transfer and notification projection.
   Repeat capability/target protection in SQL so concurrent demotion cannot grant
   permissions. Owner and peer Co-owner protections apply to every write path.
3. Add role selectors/labels with explanatory text and protected actions in group
   UI; never expose admin/co-owner identity in nonmember previews/decision messages.
4. Add cross-group, self-promotion, peer-removal, inactive-membership, legacy-role,
   transfer and notification privacy regressions plus light/dark/mobile checks.
5. Update handoff and request approval for dev-only migration/Preview rollout.
   Existing deployment a9127653 and remote migrations0001-0010 stay unchanged until
   approval. New event permissions remain dormant until group events exist.

## Later Phase 5 milestones

5B invitations: secure hashed/revocable/expiring tokens; approval required.
5C protected group games: Owner/Co-owner/Organizer creation; approved-member self
joining; authorization on all detail/list/RSVP/notification endpoints.
5D guests: separate requested/confirmed guest counts; Sam + Tom +1 guest uses3
places, atomic party approval and release, no automatic private-content access.
5E role/membership/event lifecycle: decide transfer-to-Owner versus cancellation
for an Organizer's upcoming events after role revocation/removal/departure, then
implement with capacity release and notifications. Confirm before group events ship.

## Decision to confirm before coding this transition

Keep existing Admins temporarily with unchanged permissions, and let each primary
Owner explicitly convert them? This preserves existing work without elevating or
removing privileges. Alternative demotion/reassignment would require an explicit
user decision, not a migration assumption.

## Phase 5A local implementation checkpoint

User approved retaining legacy Admins unchanged until Owner conversion. Implemented
additive0011_group_roles.sql with nullable assigned_role (member/organizer/coowner).
NULL preserves legacy role. Owner identity remains tennis_groups.owner_id. Existing
memberships/triggers retained; request notifications now include effective Co-owners
and exclude demoted legacy Admins. Active role checks and target protections repeated
in SQL; only Owner appoints/removes Co-owners, manages legacy Admin roles, transfers
or archives. Co-owner assigns/removes ordinary Organizer/Member roles. Organizer has
no group-management authority; group-event permissions remain dormant until games.

Role selector requires confirmation. My Groups shows effective role. Re-request/
leave clears elevated assignment. Migration0011 applied LOCAL ONLY. Build and231
unit tests passed;7 group browser regressions plus explicit Owner Co-owner assignment
check passed. Initial new browser fixture used the member's ID as owner; corrected
fixture passed. No remote changes/deployment. Preview remains a9127653, remote0010.
Next request approval for dev0011 plus Preview; invitations/group games/guests follow.

Latest approved rollout November17: migration0011 applied to remote opencourts-dev only; Preview79f9e7ca published with role upgrade and styled game Directions button using Navigation icon. Existing court-discovery directions were already buttons. Build/28 game+group browser checks passed; earlier231-unit run passed. Legacy Admins retain authority until explicit Owner conversion; Co-owner/Organizer roles now implemented, group events/guests remain next. Production unchanged; no GitHub push. Current stable alias serves index-kMUzYR4L.js. Supersedes earlier design-only/local-only role statements.

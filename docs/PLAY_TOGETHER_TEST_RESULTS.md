## November 18 - Series management Preview release 31bafac6

Applied approved migration 0023_series_management.sql to opencourts-dev only, then published 31bafac6 at https://feature-play-together.opencourts.pages.dev. Open a hosted game and choose Manage series (or Change date or time for a single game). Review and confirm single/future schedule edits or cancellations; exceptions and attendance are preserved as documented. Earlier local-only status entries for series management are superseded.

Post-release checks: manage-series page, game discovery/feed and canonical help HTTP 200; Google and Apple providers ready; no pending development migrations. Preview D1 isolation verified; production retains original binding 56c414b7-aca5-429b-acfa-b9e8e87b052b and deployment 7ef38ff2-91e0-4505-a215-fa16edcfa0bc. No Git push or production deployment. Evidence .wrangler/qa-audit/series-management-remote-migration.log, series-management-preview-deploy.log, series-management-post-migrations.log.

Next manual acceptance: on physical iPhone/Android, reschedule one week, change later weeks while preserving an exception, cancel a single date, verify remaining dates/players, and check old/new time notifications with another approved test account. Browser/unit tests do not replace real-device acceptance. Native blueprint updated to published schema0023; native authentication/push/payments and other production readiness gates remain open.

## November 18 - Series management implemented locally (migration 0023)

New Manage series / Manage schedule screen linked from host/authorized group management in game details. Lists authorized dates with status, exceptions and confirmed count/capacity. Reschedule or cancel This game only / This and future games. Past/started/cancelled dates stay unchanged; single-date reschedules set series_exception. Future time edits preserve individually changed exceptions by default (except selected anchor); cancel remaining includes all upcoming selected/future weeks. Hosts review affected old/new dates and skipped reasons before confirmation. Duration, IDs, players, guests, requests, invitations and waitlists remain attached to each occurrence; cancellation hides the event without deleting its record.

GET games/:id/series lists management data (single games supported). POST .../series/preview returns planHash, affected dates/versions and skipped reasons. POST .../series/apply checks planHash plus requestId for confirmation/retry, rebuilds authorized plan, validates every IANA-zone/local date for DST/future/180-day bounds, then atomically applies all targets. DB triggers revalidate current actor/session/role and expected versions per target; any conflict rolls back the entire batch. Later schedule conflicts require a fresh preview. Current owner/coowner/own-event Organizer permissions retained.

Migration 0023_series_management.sql: series_exception, change/target audit records and schedule notifications. Old/new time notifications for host, confirmed players, pending requesters, invitees and active waitlist entries; cancellation extends existing notifications to invited/waiting users. Responses recheck current public/private/unlisted access. Active waitlist deadlines shorten for earlier starts and never extend due to rescheduling. No email/push or attendance auto-enrollment.

Validation: full backend 298 tests passed; four mobile/desktop light/dark management checks passed, including preview/exception display, single cancellation and visible confirmation. Tested retries, preserving attendance, stale preview rejection, transactional rollback, group-role revocation and schedule notification privacy. Mobile dark confirmation visually inspected. Logs .wrangler/qa-audit/series-management-*.log; local migration applied only. Physical iOS/Android retest remains pending. iOS blueprint and public help updated.

REMOTE NOT MIGRATED / NOT DEPLOYED. Current live Preview remains 03fdacfb/schema0022. Request approval for exact command before release: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Verify only 0023 pending, dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Then build/deploy feature/play-together Preview. No production operations or Git push. Series management becomes available only after migration and publishing.

## November 18 - Public/private group events Preview release 03fdacfb

Approved migration 0022_public_group_events.sql applied to opencourts-dev only; published 03fdacfb at https://feature-play-together.opencourts.pages.dev. Public-group event discovery/viewing and nonmember host approval are live; private-group membership checks remain. Simple Public/Private group labels and previous local editable hour/minute + AM/PM calendar controls are included. Earlier local-only statuses for these features are superseded.

Post-release: Create Game, anonymous event search and feed, help and privacy HTTP 200; Google and Apple providers ready; migration list checked. Preview D1 binding verified dev cae4849c-3e99-4945-9d70-bef7b48707ce; production binding retains 56c414b7-aca5-429b-acfa-b9e8e87b052b and deployment 7ef38ff2-91e0-4505-a215-fa16edcfa0bc unchanged. No Git push or production deployment. Evidence public-group-events-remote-migration.log, public-group-events-preview-deploy.log, public-group-events-post-migrations.log under .wrangler/qa-audit.

Next physical-device/two-account QA: public-group event seen by outsider, outsider submits approval request, member joins directly; private event absent to outsider; member lists remain private; Public->Private hides events and removes outsider future participation/requests. Verify calendar time Apply and reopen on original phone. iOS blueprint carries latest groupVisibility and isGroupMember/viewer joinPolicy contract. Production readiness gates remain open.

## November 18 - Latest approved group visibility: public events vs private events (local)

Supersedes earlier rule that ALL group games require membership. Group picker labels now Public / Private. Public-group events appear in public discovery and the All feed, including nonmembers/anonymous viewers, and in the group's preview. Private-group events remain current-approved-members-only. My Groups feed filter remains actual memberships only. Public-group nonmembers request host approval; approved members join directly. Game participation does not create group membership. Member lists, private descriptions, membership management and host/participant-management APIs stay restricted. Group event API retains visibility=group and adds groupVisibility; participation exposes viewer-specific joinPolicy and isGroupMember. Guest/capacity/reservation protections retained; waitlists remain approved-members-only. Public-group hosts can invite outsiders without exposing private groups.

Migration 0022_public_group_events.sql updates DB participation guard and clears nonmember requests/future attendance on Public->Private changes. Visibility is read dynamically from current group, including shared URLs, feeds, My Games, notifications and safety reports. Existing PUBLIC groups' events will become visible under the approved new policy upon deployment; PRIVATE groups remain restricted. No production change. No native auth change.

Validation: full backend 292 tests passed; 13 phone/desktop light/dark browser checks passed, including nonmember event preview/approval and waitlist regressions. Build passed. Evidence .wrangler/qa-audit/public-group-events-*.log. Physical iOS/Android confirmation remains pending. Local time-entry fix from prior task also included in pending build.

REMOTE NOT MIGRATED / NOT DEPLOYED. Current live Preview remains 056fd9a9/schema0021. Before publishing request approval for exact command: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Verify only 0022 pending; dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Update iOS blueprint/help/privacy to this latest rule (done). Then build/deploy feature/play-together only when authorized. No Git push or production operation.

## November 18 - Create Game time entry revision (local)

Reported physical-device time dropdown selection reverting. Initial Chromium touch/desktop reproduction successfully changed and reopened old dropdown values, so exact physical-device cause is not confirmed. Replaced nested Hour/Minute SiteSelect controls inside calendar dialog with explicit numeric-text hour/minute fields plus AM/PM toggle buttons. This removes the nested time-picker dependency rather than claiming the original device-specific cause was proven. Uses existing theme tokens, 44px+ targets, accessible labels/pressed/invalid states and numeric keyboard hint.

Time is converted to canonical 24-hour HH:mm only when applied; calendar date selection and court time-zone rules retained. Editable partial values no longer need to map to a selected option. Apply disables for invalid/missing hour/minute and past starts. Reopening initializes fields from the saved parent value. Hour 1-12, minute 00-59, explicit 12 AM/PM conversion.

Build passed. Calendar touch/desktop tests verify 3:45 PM -> 15:45, reopen persistence, 12:07 AM -> 00:07 and invalid hour/minute rejection. All twelve time-entry and device-profile browser checks passed (iPhone-sized, Pixel, Galaxy, tablet, desktop, both themes). Device-profile regressions logged in .wrangler/qa-audit/calendar-time-final.log; initial reproduce log calendar-time-reproduce.log documents old Chromium success. Physical iPhone/Android retest remains required; no Safari/WebKit claim. No schema change, deployment or production operation; live Preview remains 056fd9a9. Publish only on authorization, then ask user to retest original phone.

## November 18 - Waitlist polish Preview release 056fd9a9

Published approved build to https://feature-play-together.opencourts.pages.dev (056fd9a9). Host queue, My Games Waitlisted actions, wrapping mobile schedule filters, corrected role/deletion help and community analytics exclusion are now on Preview. No migration required; schema remains 0021. No Git push or production deployment.

Post-release: My Games, game discovery API, canonical help and privacy HTTP 200; Google and Apple providers ready. Preview binding verified development cae4849c-3e99-4945-9d70-bef7b48707ce; production retains original binding/deployment 7ef38ff2-91e0-4505-a215-fa16edcfa0bc. Deployment evidence .wrangler/qa-audit/waitlist-polish-preview-deploy.log. Earlier local-only statuses for this polish are superseded.

Next: physical iPhone/Android and assistive-technology acceptance checklist in PLAY_TOGETHER_RELEASE_REVIEW.md. Native blueprint reflects current APIs; native auth/push/payments remain unimplemented. Production prerequisites remain open; no claim of production readiness.

## November 18 - Waitlist polish and release review (local)

Host queue and My Games Waitlisted section added, with named compact queue rows, offer deadlines, positions and Accept/Leave actions. Host endpoint GET games/:id/waitlist uses existing group event management permission (max 200 entries). GET games/mine?view=waitlisted returns only current eligible own group games (max 100); membership removal and expired offers filtered. Refresh every 30 seconds while visible/on focus; no push/background worker. Mobile schedule filters wrap. No schema changes required.

Privacy/accessibility review: disabled Google tag on community/account routes; sanitized court analytics initialization query/fragment/referrer. Corrected obsolete transfer-ownership deletion copy and updated public help/privacy and iOS blueprint. Added PLAY_TOGETHER_RELEASE_REVIEW.md with completed evidence, exact remaining physical-device/two-person test steps and production gates. Automated tests do not claim physical iOS/Android or assistive-technology acceptance. 289 backend tests passed; 19 mobile/desktop/theme and device-profile browser checks passed, plus six visual captures. Final groups/privacy log and build under .wrangler/qa-audit/waitlist-polish-*.log.

Current live Preview remains 32b0d2b5; these polish changes are local awaiting Preview publishing. No migrations, remote writes, production config/deploy or Git push. Next: publish Preview when authorized, then complete real-device acceptance checklist. Operator retention/age/jurisdiction/provider deletion/media-cleanup decisions remain before production. Do not mark the entire production readiness checklist completed.

## November 18 ? Waitlist Preview release 32b0d2b5

Approved migration 0021 applied to remote opencourts-dev only. Published release 32b0d2b5 to https://feature-play-together.opencourts.pages.dev. Release includes group-game waitlist, mobile top-layer role/action confirmations, and contextual invitation rows with compact revoke menus. All earlier local-only status notes for these changes are superseded.

Post-release checks: Create Game and public game API HTTP 200; canonical /play-together-help HTTP 200 (.html redirects); Google and Apple providers ready; no development migrations pending. Preview binding verified development UUID cae4849c-3e99-4945-9d70-bef7b48707ce; production binding retains 56c414b7-aca5-429b-acfa-b9e8e87b052b and production deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc. No Git push or production writes/deployment. Evidence .wrangler/qa-audit/waitlist-remote-migration.log, waitlist-preview-deploy.log, waitlist-post-migrations.log.

Next physical-device/two-account QA: fill group game, join queue, cancel a confirmed place, verify reserved offer/inbox, accept or leave, and verify role confirmation is visible on a small phone. Offer window two hours or game start; refresh-driven expiry advancement, no background/push delivery. Each weekly game has independent attendance and queue. Host queue overview and My Games waitlist listing remain possible followups.

## November 18 ? Group game waitlist implemented locally

Approved feature: full group games offer Join waitlist to approved members. FIFO by created_at/player_id; each offer reserves one place for two hours or until start, whichever comes first. Player can accept or leave the queue. Expired offers become inactive and next player is promoted on game/inbox refresh. Cancelling attendance or approved guests refreshes the queue. No email/push or scheduled worker: promotion/expiry refreshes lazily through participation and inbox; do not promise background delivery. Each weekly occurrence has its own queue. Guests are not queued and still require host approval. Other players' identities are not exposed to waiting members.

Migration 0021_group_game_waitlist.sql adds game_waitlist and reservation-capacity triggers protecting participant INSERT and guest UPDATE. Server rechecks active membership, blocks, declined participation, game state/time, offers and available capacity. Owner cannot join their own waitlist. Waiting player receives position, offer expiry and accept/leave controls. In-app inbox shows only current eligible offers, including membership checks on final response query; read support included. Reserved offers reduce UI availability. Existing group permissions and normal cancellation reasons preserved.

Validation: development build passed; 288 backend tests passed (18 files), plus final 30 group tests after revoked-member inbox hardening; two phone/desktop browser cases passed for join, withdrawal and acceptance. Local migration applied only. Evidence .wrangler/qa-audit/waitlist-*.log. Physical iOS/Android validation pending.

REMOTE NOT MIGRATED OR DEPLOYED. Live Preview remains 5d18a62a/schema0020. Pending release also contains earlier local role-confirmation dialog and contextual invitation rows. Before publishing request approval for exact command: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Verify only 0021 pending and development UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Build and deploy feature/play-together only after migration. No production operations or Git push performed. Potential next extensions: host queue overview, waitlisted games in My Games, background scheduling/push; not implemented in this milestone.

## November 18 ? Invitation context and compact management UI (local)

Screenshot was Group membership invitation links, not a named game invitation. GroupInvitations now explicitly identifies membership links as shareable/non-recipient-specific and shows group name, short non-secret reference, created/expiry/revocation dates and status. Shared InvitationRow renders compact rows; Revoke moved into a 44px three-dot action menu, with contextual confirmation identifying recipient/link and group/game. GameSharing uses the same row and includes named recipient where available, game title/date and link dates. Inline send success includes recipient, game and start date. No invented recipient tracking for shared links. Existing approval/access semantics unchanged.

Build passed; four mocked mobile/desktop invitation checks passed, including menu access, recipient/game context and Keep invitation confirmation. Previous mobile top-layer role dialog fix included locally. No schema changes, deployment, Git push or production operations. Live Preview remains 5d18a62a. Next: publish on authorization and physical-device review of role confirmations and invitation rows.

## November 18 ? Mobile role confirmation visibility fixed locally

Reported: selecting Organizer did not expose Confirm on a physical phone. Root UI issue: shared FocusedConfirmation rendered an inline alert after the page's long content, relying on scrollIntoView. Replaced with native modal dialog/showModal in browser top layer, above fixed header and dock; background scroll locks while open, focus returns to trigger, Escape activates the existing non-destructive Keep/Cancel action when available. Dialog uses existing theme tokens, bounded viewport height with scrolling, and full-width phone buttons. All existing uses of the shared component receive this presentation.

Validation: role assignment tests passed at small phone 375x667 touch viewport and desktop, asserting Confirm within viewport and submitting Organizer role. Development build checked (role-dialog-build.log). No migration, production change or deployment. Current live Preview remains 5d18a62a; this fix is local awaiting publishing. Evidence .wrangler/qa-audit/role-dialog-browser.log. Next: publish Preview when authorized and verify on physical iPhone/Android; include confirmation flows for leaving/cancelling games and removing members.

## November 18 ? Weekly series Preview release 5d18a62a

User approved remote development migration and Preview publishing. Applied 0020_weekly_game_series.sql to opencourts-dev only; published release 5d18a62a at https://feature-play-together.opencourts.pages.dev. ZIP-aware inline invite search and independent weekly series are now on Preview. Google and Apple providers ready; Create Game and public game discovery returned HTTP 200. Production deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc; production binding unchanged. No Git push.

Pre-release build passed, 285 backend tests and ten mocked mobile/desktop browser checks passed. Post migration list checked; evidence weekly-remote-migration.log, weekly-preview-deploy.log, weekly-post-migrations.log under .wrangler/qa-audit. Earlier local-only status notes are superseded.

Next manual verification: search invitees using 22033 and Fairfax; only eligible discoverable accounts are returned, capped at 25. Create a 3-week series and use two accounts to verify invitation/approval for week one does not affect weeks two/three. Each week is listed in My Games, with its own player capacity, guests, edits and cancellation. No whole-series edit/cancel UI yet. Physical iOS/Android checks remain pending. Future development must preserve production isolation.

## November 18 ? Weekly series and inline ZIP search implemented locally

Inline host invitation search now calls the same playerSearchLocation resolver as player discovery, expands ZIP to general locality terms, and accepts partial city/name matches. Eligibility, opt-in, blocks and 25-result cap remain; ZIP matching is general locality matching, not exact-distance discovery or a guarantee of every nearby player. No private profile address lookup.

Create Game adds Repeat weekly: 1 game or 2?12 weekly occurrences total. Server validates every local calendar date in the event time zone (DST safe; ambiguous/nonexistent times rejected), all within 180 days. A single atomic batch inserts occurrences plus host participation. First game ID is series_id; occurrence request IDs and first submission hash prevent retry duplication. All visibility types reuse existing authorization, capacity and approval. Each week has its own game ID/invitations/requests/guests/participants; nothing rolls over. Cancel/edit one occurrence only; no bulk series editing or tournament brackets in this milestone. My Games lists occurrences normally. Existing invitation limit remains ten per occurrence.

Additive migration 0020_weekly_game_series.sql adds series_id, series_week, series_weeks plus a unique series/week index. Applied locally only. Remote opencourts-dev remains 0019; live Preview remains ce046f38. BEFORE publishing ask approval for: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Verify only 0020 pending and dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. No production operations or Git push performed.

Validation: development build and all 285 backend tests passed. Logs: .wrangler/qa-audit/weekly-regression.log, weekly-build.log, weekly-local-migration.log, weekly-browser.log. Ten mocked mobile/touch and desktop browser checks passed, including repeat-week submission and inline ZIP entry. Physical-device validation remains required. Next: approved dev migration, rebuild help-page changes, Preview deployment and two-account testing of separate weekly invitations/attendance.

## November 18 ? Multi-court Preview published

Approved migration 0019 applied successfully to remote opencourts-dev only (cae4849c-3e99-4945-9d70-bef7b48707ce). Published working-tree build ce046f38 to https://feature-play-together.opencourts.pages.dev. Includes multi-court event creation, clearer Owner-only role controls and one Co-owner/Organizer limits, and inline public/unlisted game invitations. No Git push or production deployment.

Post-release verification: Create Game HTTP 200; Google and Apple providers both ready; Preview COURTS_DB targets development, production COURTS_DB retains 56c414b7-aca5-429b-acfa-b9e8e87b052b; production deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc. Remote migration completion checked. Evidence: .wrangler/qa-audit/multi-court-remote-migration.log, multi-court-deploy.log, multi-court-post-migrations.log. Pre-release: build, 281 backend tests and six touch/desktop browser cases passed.

Next manual QA: on physical iOS and Android create two-court singles (4 default), four-court doubles (16 default), add rotating attendance, verify approved guests count and full-event rejection, assign/demote group roles with two accounts, and invite/revoke unlisted access. Test via stable alias above for OAuth. Earlier notes describing these changes as local-only are superseded by this release entry.

## November 18 ? Multi-court events implemented locally

Create Game now separates singles/doubles format, courts planned (1?16) and total attendance (up to 128). Defaults are courts ? 2 for singles and courts ? 4 for doubles; hosts may increase capacity for rotation. Changing format/courts resets the suggested capacity, explicitly explained in the UI. Capacity includes host and approved guests. Game details show planned courts and the no-reservation notice. Applies to public, unlisted and group events using existing authorization/approval logic.

Migration 0019_multi_court_events.sql is additive: retains legacy capacity as per-match size, adds court_count/default 1 and nullable event_capacity, and updates database capacity triggers to use COALESCE(event_capacity,capacity). Existing games retain their limits. All game projections, participation, guest checks and invitation eligibility use total capacity. No table rebuild or production change.

Validation: development build passed; all 281 backend tests passed (18 files), including multi-court creation, invalid sizes, guests, full-event approval rejection and foreign-key integrity. Six mobile/touch and desktop browser checks passed, including 2 singles courts ? 4, 4 doubles courts ? 16, custom rotating attendance payload, role assignment and skill selection. Local guarded migration applied successfully. Evidence: .wrangler/qa-audit/multi-court-*.log. Physical iPhone/Android verification remains pending.

REMOTE PREVIEW NOT YET MIGRATED OR DEPLOYED. Before deploying, request approval for this exact development-only command, after verifying database identity/schema: npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config .wrangler/qa-audit/multi-court-dev.json. Config must name only opencourts-dev (cae4849c-3e99-4945-9d70-bef7b48707ce), binding COURTS_DB, migrations_dir ../../functions/db/migrations; account 0f71d46e637d75b35ce799d1e90559b3. Verify 0019 alone is pending. Never target opencourts-courts or main. Then build and deploy feature/play-together Preview only when authorized. Current live Preview remains 8019d3ea. Includes previous local role UI and inline invitations, also awaiting Preview.

## November 18 ? Group leadership and role assignment revision

Latest approved rule supersedes earlier multiple-role/ownership-transfer decisions: one permanent primary Owner; at most one active Co-owner and one active Organizer; other players are Members. Only the Owner assigns roles. Ownership transfer is rejected server-side and removed from the UI. Co-owner retains group management; Organizer manages their own events. Existing legacy Admin records are preserved for compatibility, not newly assignable. Existing duplicate leadership records, if any, need Owner review; this task does not silently demote members.

Replaced role dropdown with descriptive Member / Organizer / Co-owner action choices, current-role indication and explicit confirmation. Atomic membership UPDATE checks the active role slot, preventing concurrent duplicate assignment; demotion/removal releases it. Existing organizer-demotion future-game handoff behavior remains. Build passed; 27 backend group tests passed. Six browser checks passed: touch and desktop role assignment, game format persistence, and player skill selection. Physical iPhone/Android verification remains pending. Browser verification log: `.wrangler/qa-audit/group-role-controls-browser.log`. No production, remote database, Git push or deployment changes.

Next design recommendation (not implemented): separate singles/doubles format, courts planned and total player capacity. Two singles courts default to four players; four doubles courts default to sixteen; permit extra rotating players. One event/session is distinct from recurring scheduling and tournament brackets. Current API and schema restrict capacity to 2/4; inspect and migrate those constraints plus capacity/race tests before implementing. Courts planned must never imply a reservation. Previous inline player invitations remain ready locally for Preview.

## November 18 ? Invitations inside game details

Implemented host-only **Invite players** within public and unlisted game details. Search discoverable players by name/general-location text and send to the current game without leaving the page. Self, blocked, inactive, participating and previously requesting players are excluded server-side. Existing atomic 10-distinct-player/game and host/recipient rate limits remain; invitations do not reserve capacity or bypass approval.

Unlisted direct invitations atomically create recipient-specific access using existing invitation-link/access tables, expiring within seven days or at game start. Hosts revoke individual access under Share this game; recipient names identify those entries. Confirmed participants retain their existing access. Unlisted invitations do not enter public discovery; notification responses require current access. No migration, production change or deployment in this task. Previous live preview remains 8019d3ea.

Validation: development build passed; 18 invitation backend tests passed, including host scoping, unlisted recipient access, revocation and approval. Four mocked browser checks passed for public/unlisted inline invitations at 375px and 1280px, including exact request payload and no horizontal overflow. Browser evidence is in `.wrangler/qa-audit/inline-invite-browser-final.log`. Physical iOS/Android retest remains necessary. Next: publish this working tree to Preview when requested, then test real two-account invitations and revocation. Dropdown selection fix from the previous task remains included.

# Play Together verification - November 17, 2026

### November 18 - Dropdown selection-value audit and direct callbacks published

Latest Preview 8019d3ea: https://feature-play-together.opencourts.pages.dev. User reported iPhone selections reverting in player skills, game format and member roles. Initial Chrome touch/desktop request tests did not reproduce the original failure; do NOT claim a physical Safari reproduction. Replaced SiteSelect's imperative hidden-select synthetic change dispatch with direct onValueChange(string) callbacks across all 22 usages (main sort/distance/surface; creation visibility/time-zone/duration/format/skill; guest count; member role; group visibility/skill; group-invite expiry; game-invite picker; profile/player/discovery skills; discovery radius/format; report category; calendar hour/minute). Hidden native select stays for form values/validation and cannot open a native picker. Trigger blur with null relatedTarget no longer immediately discards option clicks; option click prevents label/default bubbling. Group role confirmation text now maps chosen role instead of reading event.target.selectedIndex.
Validation: six payload-level browser cases passed on touch and desktop: three successive player skills reach search URL and retain selected state on reopening; singles persists across duration/skill/title edits and submits format=singles/capacity=2/duration=90/skill=advanced; Organizer reaches role confirmation then role API and refreshed membership display. Ten existing cross-device touch/desktop cases each passed in the combined run (that run was interrupted because new payload test fixtures needed corrections; final six-case run passed). TypeScript/development build and whitespace check passed. Google and Apple true after deploy. No production/config/database changes, no Git push. Existing physical-device retest is still required. Role dropdown intentionally shows current persisted role until confirmation/refetch; cancellation leaves role unchanged.
Next: user iPhone check for actual value persistence and role confirmation. Broader old specs that use native selectOption must be migrated to real button/listbox actions before full release-suite claims. Docs/DROPDOWN_AUDIT.md contains additional audit record.


### November 18 - Privacy and information pages updated and published

Latest Preview c0e6ddbe: https://feature-play-together.opencourts.pages.dev. Updated /privacy, /about, /contact and /support; added /play-together-help with practical account/game/group/invitation/guest/safety instructions. Shared existing static page design/system theme, added privacy contents links, and help navigation in static footers/community footer. Explicit test-release status, free first release, group-preview privacy, avatar/group-cover distinctions, location/provider/analytics practices, deletion limits and retention uncertainty reflect current implementation rather than stale phase docs.
Eight responsive/theme browser cases visit all five pages at 320/390/768/1440; build and whitespace checks passed. All five extensionless hosted routes returned HTTP 200 after deployment; Google/Apple both enabled. Production deployment and both D1 bindings verified unchanged before deploy. No production settings/database or Git push changes.
Read docs/PRIVACY_CONTENT_REVIEW.md for evidence mapping and unresolved production privacy decisions: retention/backup schedules, analytics consent and invite-token URL sanitization, intended age policy/operator confirmation and region/rights review. These are NOT implemented by a notice update. No legal compliance certification or invented retention guarantees. Next: user content review on Preview, then operational follow-ups and device/release QA.


### November 18 - Cross-device single-picker regression verified

Expanded tests/ios-dropdown.spec.ts to ten Chromium browser-emulation cases: iPhone-sized touch, Android Pixel 7, Android Galaxy S9+, tablet touch and desktop, each in light/dark. All ten passed (46 seconds). Checks actual touch/click selections, exactly one rendered listbox, viewport width bounds, selected text, hidden native selects with aria-hidden/tabindex=-1, keyboard selection and nested calendar menu. Static scan confirms SiteSelect is the only raw select implementation. These are emulated profiles on Windows Chrome, not physical Android/iOS or Safari WebKit tests; physical device retest remains required. Test/docs changes only: deployed fix remains bb13166d on stable Preview, no new deployment needed. Production unchanged.


### November 18 - iPhone duplicate native/custom dropdown fix published

Preview bb13166d: https://feature-play-together.opencourts.pages.dev. Physical iPhone screenshots showed Safari native select opening on top of our custom listbox. Root cause: SiteSelect still focused/clicked a real select despite preventDefault handlers. Replaced interactive trigger with type=button role=combobox; native select is hidden, aria-hidden and removed from tab order, retained for form/change/validation. Shared listbox anchors/focus/keyboard now use button, so native picker has no visible interactive target. Applies to every SiteSelect consumer, including calendar time. Updated common trigger styling retains site tokens.
Eleven browser checks passed: touch selection/no native select focus across discovery, scheduling and players, keyboard selection and nested calendar menu, plus mobile/tablet/desktop navigation. Build and diff checks passed. Google and Apple readiness both true before and after deployment. No credential/config/database or production changes. Physical iPhone retest is required; desktop touch emulation does not certify native Safari behavior. Earlier selectOption/option-bound tests need migration to the new button/listbox contract in broader QA. Screenshots with d5317393 URL are immutable old builds; use stable alias above (older unique builds also fail exact-origin auth guards).


### November 18 - Google and Apple sign-in startup restored

Latest Preview fbd7a20e: https://feature-play-together.opencourts.pages.dev. User restored Google and Apple bindings manually; Google client ID is Text. User reported no saved Apple token encryption key and generated a replacement 32-byte/64-hex Preview key after being informed old encrypted Apple refresh tokens cannot be decrypted. Existing accounts/profiles were not deleted; affected users should sign in with Apple again before token-dependent actions such as account deletion. Preserve the new key securely; never print or commit it.
Live /api/auth/me now reports google=true, apple=true; Google start and Apple start both returned HTTP 200 in checks (Apple signing preparation succeeds). These checks do NOT complete interactive provider authentication/callback; user/testers must verify fresh Google/Apple login. Root cause of original missing-secret delivery remains unproven; metadata presence was insufficient. No production changes. Earlier exposed Google client secret still requires rotation in Google Cloud and Preview update; do not reproduce it.
Next: real sign-in checks before inviting testers back; add provider startup/readiness smoke checks to future preview release workflow. Handoff records outage and recovery without any credential values.


### November 18 - Single community desktop header cleanup published

Latest Preview d5317393: https://feature-play-together.opencourts.pages.dev. Supersedes prior two-level desktop navigation. One header now contains Courts, Feed, Find games, My Games, Groups, Players, followed by notifications/account. Removed desktop second section bar and unused hamburger component state. Feed opts out of redundant Back to games link. Support is available alongside Privacy in community footer; Weather remains on Courts. Mobile/tablet five-tab bars and explicit area switches remain unchanged. Nine navigation tests passed across 320/375/768/1440 light/dark including visitor landing and cross-area round trips. Development build and whitespace checks passed. No production/database or Git push changes. Next: preview review and remaining full release/device QA.


### November 18 - Approved navigation sequence published

Preview e5fbae9b: https://feature-play-together.opencourts.pages.dev. Desktop main header: Explore courts, Play Together, Weather, Support. Community section tabs: Feed, Find games, My Games, Groups, Players. Community phone/tablet bar uses those same five destinations. Main phone/tablet bar: Search, Map, Courts, Dry courts, Weather. Labeled header switch links Play Together and Courts connect both areas; logo condenses at small widths to preserve 320px space. Notifications and account retained. Hamburger removed through tablet widths. No duplicate sixth bottom destination.
Bare /play-together checks auth: signed-in users replace to /play-together/feed, visitors see Find Games. Explicit hashes/query/deep URLs bypass landing redirect; Find Games points to /play-together#search and focuses input. Default Back to games targets search rather than signed-in landing. Existing saved court search location is preserved; arbitrary map pan/zoom persistence was not added.
Thirteen focused browser checks passed at 320/375/768/1440 in both themes plus visitor routing and map geolocation regressions. Development build and whitespace checks passed. No database/production changes or Git push. Old navigation/screenshot assertions in broader suites still encode six tabs/Search-first and need updating to this approved arrangement before full release QA; focused new tests are tests/navigation-sequence.spec.ts. Physical device review remains.


### November 18 - Map tab device location published

Preview 42069b81: https://feature-play-together.opencourts.pages.dev. Both mobile Map tab/switch now explicitly request browser geolocation and load courts at returned coordinates. Near me and search location controls share the same guarded request; duplicate pending requests suppressed. Browser controls whether a prompt is shown (already-granted permission will not prompt again). Permission denied/unsupported/unavailable/timeout messages now appear on the visible map, with retry, search fallback and dismiss. Existing results stay if location fails. No automatic permission request on page load. Device coordinates are used for the existing court/weather lookup, not saved to player profiles. Ten browser checks and development build passed, including coordinate-based search, permission denial in both themes, focused search fallback and existing main navigation. Physical OS location services/TWA remain device checks. No production/database changes or Git push.


### November 18 - Future-only scheduling published

Preview 7b03b291: https://feature-play-together.opencourts.pages.dev. Scheduling calendar disables past dates and previous months; today disables elapsed hours/minutes. Bounds use the selected court IANA time zone, refresh every 15 seconds, and recheck on opening/applying. Typed past values fail form validity. Existing server gameStart still rejects past, ambiguous/nonexistent DST times and starts beyond 180 days. Discovery date filters remain unrestricted. Twenty-two browser checks passed, including frozen-clock New York/Tokyo date boundaries, stale selections, mobile/desktop themes and calendar/manual court regressions. Development build passed. No production/database changes or Git push.
Next: review scheduling on Preview. Earlier requested host Invite players shortcut with game preselected and hiding declined games from public discovery remain pending implementation; do not treat the conversational recommendations as completed features.


### November 18 - Complete shared dropdown/calendar audit published

Latest Preview fc5d3849: https://feature-play-together.opencourts.pages.dev. This supersedes the earlier native/base-select CSS fix. See docs/DROPDOWN_AUDIT.md for inventory, implementation and validation.
All 20 application selects now use SiteSelect, including main-site court controls and Play Together roles/invitations/time zone. Both date fields use SiteDateField with a responsive themed calendar dialog; hour/minute use the same picker. Existing colors, icons, form data and server validation retained. Site-rendered listboxes replace browser-dependent popups, with viewport limits, wrapping, scrolling and keyboard behavior. No new framework/backend/database changes.
Final 52 browser checks and TypeScript/development build passed; earlier focused and broader group/profile/navigation checks are recorded in the audit. Open-menu and calendar screenshots inspected. Remaining: physical iOS/Android/TWA/screen-reader testing and user review. Production unchanged; source remains uncommitted, no Git push.


### November 18 - Actual open dropdown picker fix published

Preview 2fb54d45 (https://feature-play-together.opencourts.pages.dev). Previous max-width/short-label change constrained only closed fields; desktop native popup escaped the emulated phone. Shared public/interactions.css now progressively opts single selects into appearance:base-select and styles ::picker(select), matching field width, bounding viewport width/height, wrapping options, scrolling, and using existing theme/selected tokens. Native select semantics, keyboard and form handling retained; unsupported browsers retain OS-native controls. No new UI framework. Multiple/size listboxes excluded. Native Safari/Firefox/older Android pickers still need physical-device checks; do not claim identical rendering there.
Validation: 23 browser checks including actual open option rectangles at 320/375/440/768/1440 in both themes, long labels, Escape and keyboard selection, plus manual-court and invitation regressions; TypeScript/development build passed. Stable Preview CSS verified after deployment. No database, production, or Git push changes. Next: review the OPEN menus on Preview and complete physical device checks. Existing screenshot baselines may need an approved refresh for browser-drawn arrows after this global styling change.


### November 18 - Ten invitations per game approved and published

Latest preview: https://b2743afe.opencourts.pages.dev (stable https://feature-play-together.opencourts.pages.dev). Supersedes earlier local self-invitation notes and pending-limit recommendation.
Each game permits up to ten distinct player invitation records total, not ten reserved places or ten per day. Repeated sends to an existing invitee remain deduplicated. Expired, declined or accepted invites do not reopen the ten-recipient budget. Picker excludes capped games for new recipients; INSERT enforces the cap atomically alongside existing 20/hour sender and 30/day recipient limits. No migration needed. Self-send returns explicit 400 and self picker is empty; UI filters its viewer ID and rechecks the account before send. Separate accounts with matching display names remain separate identities.
Validation: 275 unit/API tests; five invitation browser checks; development build. Live isolated Preview test accepted ten synthetic invites, rejected the eleventh and self-send, deduplicated repeat sends and kept participant count at one. All synthetic fixtures removed. No production changes or Git push. Next: user review and remaining release/device checks.


### November 18 - Responsive create form and court-search repair (published)

Preview: https://75aa19c9.opencourts.pages.dev (stable alias https://feature-play-together.opencourts.pages.dev).
Native visibility menu now uses short Public/Unlisted labels, with explanations below; select/grid children are constrained to available width. Manual court entry accepts a facility name and address, resolves its map position using existing geocoding, and requires access confirmation. It uses the existing game court snapshot, not a catalog insertion or new migration. Auth, origin, CSRF, organizer/group permissions, capacity and rate limits remain unchanged. Server validates text, coordinates, exclusive manual/token choice, and access acknowledgement. Manual locations are organizer-supplied and have unknown access. A usable geocoded position is still required; if geocoding itself fails, retry a full address.

Root cause reproduced on deployed preview with a synthetic account: court endpoint returned its signing-key configuration 503 after address geocoding succeeded. AUTH_RATE_LIMIT_SECRET was listed in Cloudflare but unavailable at runtime. With explicit user approval, replaced only that Preview secret using a cryptographically random value, then redeployed. Normal court search at 38.8766,-77.3848 (22033) now returns HTTP 200. Synthetic fixtures removed. Old court-selection proofs expire after secret rotation; reselect a court if necessary. New fail-fast signing check avoids map-provider work when misconfigured.

Validation: 273 unit/API tests, 34 focused browser tests (including 320/440/768/1440 widths in both themes and manual submission), TypeScript/development build, and diff whitespace check passed. Create-form visual baselines refreshed. Native mobile picker presentation still benefits from physical iOS/Android testing; desktop emulation cannot certify OS-native popups. No production or D1 schema changes, no Git push. Production deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc and both database bindings remain unchanged.

Next: review normal court lookup and manual fallback on the stable preview, then continue release/device testing. Never deploy main or modify production as part of this work.


### November 18 - Published preview: player invitations and shared search

Latest deployment: https://741b0103.opencourts.pages.dev
Stable preview: https://feature-play-together.opencourts.pages.dev
Hosted bundle: index-diXCyBuI.js. This entry supersedes earlier LOCAL ONLY rollout notes below.

Published the pending flat/search-first navigation, consistent search focus/caret, mobile Players entry, public-game player invitations with normal host approval, and invitation lifecycle cleanup. Active/Unread exclude expired, completed and cancelled invitations; History retains them. Unanswered/pending invitations expire at game start; confirmed participation becomes Completed at game end. No place is reserved by an invitation. Current server permissions and time checks remain authoritative.

Migration 0018_player_game_invitations.sql applied remotely ONLY to opencourts-dev (cae4849c-3e99-4945-9d70-bef7b48707ce). Preview COURTS_DB verified isolated. Production main deployment remains 7ef38ff2-91e0-4505-a215-fa16edcfa0bc and production D1 remains 56c414b7-aca5-429b-acfa-b9e8e87b052b. No production deployment, production migration or Git push in this release.

Validation: 271 unit/API tests; 129 Chrome browser checks including the optional layout/accessibility matrix; TypeScript and build:dev passed. Approved visual baselines refreshed. Guarded live preview acceptance workflows passed and synthetic records were removed. Its printed API counter was zero because invocation used a nested scriptblock and the counter uses script scope; assertions still executed. Physical iOS/Android keyboard, TWA and real-provider checks remain manual. Existing bundle-size warning remains.

Next: user review on this preview, especially sending/receiving a public-game invitation, normal host approval, History, and both mobile search entries. Continue remaining release/device checks from the release checklist. Keep production untouched; recurring games, native Swift and payments remain later milestones. Source changes remain in the working tree; a separate Git push was not requested for this preview release.


Tested Preview: https://3af45daf.opencourts.pages.dev
Stable alias: https://feature-play-together.opencourts.pages.dev
Hosted bundle: index-JralF0cq.js; development schema0017.

- PASS:257 unit/API tests across17 suites.
- PASS:84 Chrome browser checks, including mobile/tablet layouts, light/dark switching,
  existing courts/weather, authentication boundaries, profiles and avatar cropping,
  group roles/privacy, invitations, guest approval/capacity, schedule tabs,
  dedicated notifications, private sign-in emails, player search and location autocomplete.
- PASS:TypeScript and development build. Existing large MapLibre chunk warning remains.
- PASS:26 real Preview API assertions using temporary synthetic accounts and isolated D1.
  Covers membership approval, outsider denial, member self-join, guest request/approval,
  host+member+guest=3, guest cancellation=2, member leave=1, both notification directions,
  unlisted link redemption/revocation, block discovery filtering, report submission and
  non-moderator report-queue denial. Synthetic fixtures removed; cleanup independently verified.
- PASS:hosted account/schedule/notifications/players pages serve expected bundle;
  Preview D1 remains devUUID; production deployment7ef38ff2 remains unchanged.

Browser/API tests use mocked providers or synthetic sessions; they do NOT prove actual
Google/Apple account sign-in on this deployment. No physical iPhone, Android handset,
Safari/VoiceOver/TalkBack or installed Android TWA is available in this run. Those checks
remain unchecked in PLAY_TOGETHER_RELEASE_CHECKLIST.md. Sam real-account moderator UI
acceptance remains manual. Dependency-audit metadata/backport discrepancy remains as documented.

No application change, deployment, production mutation or GitHub push was needed for this run.
Only verification documentation updated. Temporary D1 writes were limited to explicitly
created synthetic development fixtures, then cleaned up.


## Latest - audit fixes published, follow-up local

Published preview c17ef75c / index-BxFx9CTz.js serves HTTP 200 at the stable alias.
Production canonical deployment and separate D1 bindings verified unchanged.
Published validation: 257 units, 85 browser workflows, 350 theme/viewport captures
without detected axe violations/page overflow/uncaught JS errors; development build.
Subsequent LOCAL ONLY search generation/cancellation guard: regression failed before
fix, passed afterward; 10 focused browser checks, 257 unit tests and development build pass.
No new live synthetic API run for these frontend-only fixes; earlier 26 checks remain
historical evidence for unchanged backend/schema 0017. Physical devices and real OAuth
remain manual gates; no production release approval.


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

## Feature-branch pre-push verification

257 unit tests passed. After approved screenshot-baseline updates, the browser suite
passed 101 of 103 cases; the remaining two direct-focus comparisons read a transient
browser outline. The test now waits for the final 2px/3px keyboard focus dimensions;
all four direct-comparison cases passed on rerun. No application behavior was changed
for that synchronization. Development build passed before staging.
The staged review found 192 files, six audit-linked PNGs and 32 test-baseline PNGs,
with no excluded paths or secret-pattern matches. Production branch remains main;
production deployment 7ef38ff2 and Preview development D1 were verified unchanged.


## Latest verified manual Preview publication

Published application source commit `2674be8` to https://e303ef23.opencourts.pages.dev.
Stable alias https://feature-play-together.opencourts.pages.dev serves HTTP 200 with
`index-CjwFqLZq.js` and the shared interaction stylesheet. Search-focus and floating-dock
corrections verified in hosted CSS. Preview COURTS_DB remains isolated development D1.
Production remains main / 7ef38ff2 with its original D1. No migration or production deployment.
This supersedes earlier local-only styling notes. Later documentation-only commits may
trigger another feature preview without changing application code.


### November 18 - Flat dock published to isolated Preview

User-approved manual deployment: https://b7c07c08.opencourts.pages.dev
Stable alias: https://feature-play-together.opencourts.pages.dev
Bundle index-DGGCkx1b.js; hosted shared CSS includes the uniform icon-row styles.
Search is a normal inline dock destination in both court discovery and Play Together.
Validated: 10 alignment/comparison checks, 14 navigation checks, 12 visual-baseline
checks and development build. Production deployment unchanged; Preview uses opencourts-dev.
No database migration or production change. This update and flat-dock source remain
local working-tree changes relative to the last Git push; no Git push in this publication.


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


### November 18 - Search first and shared typing focus (LOCAL ONLY)

Latest user direction: Search/Find games is the LEFTMOST destination in both bottom bars.
Reordered DOM entries, not just CSS order, so keyboard order matches visual order.
Play Together now links to /play-together#search from other pages. On the discovery page,
tapping its Search destination focuses the actual input synchronously and preserves text
instead of reloading the page. Hash entry uses conditional autofocus and hash-change focus.

Shared search-focus.ts handles scrolling, input focus and a collapsed caret at the end of
existing text for both court and game searches. Existing shared focus-border/glow rules
remain in use; caret color follows the same theme text token. No second dark border.
Desktop current-section detection now uses destination lookup rather than array indices,
so moving Search does not highlight the wrong section.

14 focused cross-page typing/caret/border/comparison checks and development build passed.
Full browser regression and approved visual baseline refresh are recorded in the latest
verification update. Physical iOS/Android soft-keyboard appearance remains a device check;
Chrome browser tests verify DOM focus, typing and caret state, not operating-system UI.
No deployment or remote database action. Migration 0018 remains local-only and must be
applied to isolated development D1 before publishing the pending player-invitation backend.

Latest search-order verification: all 113 browser regression checks passed; approved
full-page baselines refreshed. Development build passed. No publication this milestone.

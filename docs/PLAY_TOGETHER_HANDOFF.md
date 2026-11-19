## November 19 - Git checkpoint pushed and Preview published

Feature code checkpoint f3a0a07 pushed to origin/feature/play-together. Verified development build published as 758ff97b at https://feature-play-together.opencourts.pages.dev. Includes latest compact guest rows and light/dark decision colors. All 300 unit tests and seven focused guest/series browser checks passed. Game page, notification page, auth API and game discovery returned HTTP 200; production deployment unchanged and bindings isolated. No migrations, production changes, email or push implementation. Maintained source/tests/docs and reviewed QA images/baselines committed; credentials, uploads, databases, build/log output remain excluded. Physical-device review remains next. A documentation-only follow-up records this release; automatic Preview builds from that commit may receive a new deployment ID with the same application code.

## November 19 - Git checkpoint and Preview preparation

Current implementation includes migrations 0018-0023 (already applied to development D1), player invitations, multi-court/weekly games, waitlists, public/private group event access, series management, mobile controls, privacy/help content and recent roster/guest fixes. Latest local additions include natural-width guest request rows and light/dark Approve/Deny colors. Unit suite: 300 passed; development build passed. Physical-device acceptance remains outstanding. Push/email are not implemented; email remains explicitly deferred. Android push was inspected only: wrapper needs delegation, permission/deep-link integration, and backend/service-worker delivery.

Commit source, migrations, tests, maintained documentation, reviewed QA evidence and existing visual test baselines. Exclude credentials/signing keys, user uploads, local databases, generated builds/reports/logs and .wrangler. Existing .gitignore covers those exclusions. No production operations or remote migrations authorized by this checkpoint. Git push is feature/play-together only; Preview publication is authorized. Older local-only deployment notices are historical.

## November 19 - Guest decision colors (local)

Guest Approve uses existing primary action tokens; Deny uses a restrained red semantic treatment with separate light/dark tokens. Hover, keyboard focus, icons/text and disabled behavior retained. Small semantic color extension scoped to guest controls; no global theme redesign. Not yet published to Preview.

## November 19 - Guest row width correction (local)

Removed the guest sponsor label's 110px flex basis/grow reservation, using natural text width and compact action padding instead. Short player/guest labels and both actions now fit a 375px viewport; buttons still wrap whole and keep 44px height. Browser regression confirms Approve/Deny share the same row and host approval works. Not yet deployed; supersedes the spacing behavior in Preview 66fe9674.

## November 19 - Preview release 66fe9674

Published guest count touch buttons, compact indivisible Approve/Deny actions, rejoin-aware cancellation roster and separately labelled guest cancellations to https://feature-play-together.opencourts.pages.dev (66fe9674). Supersedes local-only status for these changes. Build, 36 group backend tests, light/dark touch guest request/cancel checks and host approval check passed. Post-release game page/auth/discovery HTTP 200. Production deployment unchanged and D1 isolation checked before deployment. No migrations or Git push. Physical iPhone review remains pending: switch guest counts, approve/deny at narrow width, cancel guests and leave/rejoin to verify roster. Evidence .wrangler/qa-audit/guest-polish-preview-deploy.log.

## November 19 - Compact guest approval rows (local)

Guest request rows show player/guest count alongside short Check Approve / X Deny buttons. Each button is an indivisible no-wrap flex item and moves as a complete unit to the next line when necessary. Player names can wrap; 44px touch targets and full contextual accessible labels preserved. Existing host approval browser check passed. Development build passed. Not published to Preview; guest count buttons and cancellation fixes also remain pending publication.

## November 19 - Current cancellations reflect rejoining and guest withdrawals (local)

Cancellation roster excludes players currently confirmed again; historical game_cancellations records remain stored. Guest cancellation notifications supply separately labelled sponsor name/guest-count/time rows; latest cancellation per sponsor is shown, hidden while a replacement guest request is pending or approved. Guest-only cancellation does not label the sponsor cancelled. Member responses omit private reasons; existing organizer-only reason access unchanged. No schema changes. All 36 group tests and development build passed. Not deployed; includes pending guest touch-button work for next Preview. Native clients should use optional kind (player/guests) and guestCount in cancellation rows, defaulting older responses to player.

## November 19 - Guest count touch controls (local)

Replaced the three-option guest count dropdown with direct 1 guest / 2 guests / 3 guests buttons, selected aria-pressed state, existing action colors, 44px-plus targets and disabled state while submitting. No picker popup or shared SiteSelect behavior change. Browser touch-emulation tests passed in light/dark at 393px, changing 3 -> 2 -> 1 and requesting/cancelling guests; no horizontal overflow. This is Chromium emulation, not physical iPhone/Safari acceptance. Development build passed. Not deployed; ask user to retest their iPhone after next authorized Preview publication. No backend/schema change.

## November 19 - Preview release e4f40377

Published notification destination styling and read-only approved-member game rosters to https://feature-play-together.opencourts.pages.dev (deployment e4f40377). Supersedes local-only status for these changes. Notification page, auth API and game discovery returned HTTP 200 after publishing. Preview/prod D1 bindings verified isolated; production deployment unchanged. No migrations or Git push. Test member roster/waitlist/cancellation views with a second approved group account; cancellation reasons remain organizer-only. Evidence: .wrangler/qa-audit/member-roster-preview-deploy.log. Physical-device review remains pending.

## November 19 - Read-only group game rosters (local)

Approved group members can view confirmed players (including guest counts), the group-game waitlist and player cancellations. GET games/:id/participants, /waitlist and /cancellations allow current approved members as well as authorized managers. Member cancellation responses expose displayName/cancelledAt only, never private cancellation reasons. Pending join requests and all management writes remain restricted to authorized organizers/managers. Public-group nonmembers do not gain roster access; removed private-group members receive 404. No schema changes.

UI includes compact read-only lists for members, with no remove/approve/edit controls. Validation: all 35 group backend tests passed, including private-reason exclusion, forbidden management and revoked membership. Development build passed. Not published to Preview yet; physical-device visual review remains pending.

## November 19 - Notification destination links polished locally

Inbox group/game names now use compact bordered destination links with a group or tennis icon and navigation arrow, replacing underlined text. Existing theme variables, wrapping names, 44px touch targets and keyboard focus retained. Styling only; authorization and delivery unchanged. Not deployed by this change; Preview publication remains pending.

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

## November 18 ? Native iOS blueprint added

Added PLAY_TOGETHER_IOS_BLUEPRINT.md as the current native handoff: shared backend/product rules, roles/privacy, series, capacity/guests, invitations, waitlist, API map and native implementation sequence. Explicitly distinguishes existing browser authentication from unimplemented native exchange, deep links, push and payment entitlements. No Swift client/OpenAPI generation claimed. Source-reviewed against current handlers/schema0021. Keep blueprint updated with shared behavior changes. Documentation-only; live Preview remains 32b0d2b5.

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

# Play Together: start here to continue development

### November 18 - Dropdown selection-value audit and direct callbacks published

Latest Preview 8019d3ea: https://feature-play-together.opencourts.pages.dev. User reported iPhone selections reverting in player skills, game format and member roles. Initial Chrome touch/desktop request tests did not reproduce the original failure; do NOT claim a physical Safari reproduction. Replaced SiteSelect's imperative hidden-select synthetic change dispatch with direct onValueChange(string) callbacks across all 22 usages (main sort/distance/surface; creation visibility/time-zone/duration/format/skill; guest count; member role; group visibility/skill; group-invite expiry; game-invite picker; profile/player/discovery skills; discovery radius/format; report category; calendar hour/minute). Hidden native select stays for form values/validation and cannot open a native picker. Trigger blur with null relatedTarget no longer immediately discards option clicks; option click prevents label/default bubbling. Group role confirmation text now maps chosen role instead of reading event.target.selectedIndex.
Validation: six payload-level browser cases passed on touch and desktop: three successive player skills reach search URL and retain selected state on reopening; singles persists across duration/skill/title edits and submits format=singles/capacity=2/duration=90/skill=advanced; Organizer reaches role confirmation then role API and refreshed membership display. Ten existing cross-device touch/desktop cases each passed in the combined run (that run was interrupted because new payload test fixtures needed corrections; final six-case run passed). TypeScript/development build and whitespace check passed. Google and Apple true after deploy. No production/config/database changes, no Git push. Existing physical-device retest is still required. Role dropdown intentionally shows current persisted role until confirmation/refetch; cancellation leaves role unchanged.
Next: user iPhone check for actual value persistence and role confirmation. Broader old specs that use native selectOption must be migrated to real button/listbox actions before full release-suite claims. Docs/DROPDOWN_AUDIT.md contains additional audit record.


### November 18 - Privacy and information pages updated and published

Latest Preview c0e6ddbe: https://feature-play-together.opencourts.pages.dev. Updated /privacy, /about, /contact and /support; added /play-together-help with practical account/game/group/invitation/guest/safety instructions. Shared existing static page design/system theme, added privacy contents links, and help navigation in static footers/community footer. Explicit test-release status, free first release, group-preview privacy, avatar/group-cover distinctions, location/provider/analytics practices, deletion limits and retention uncertainty reflect current implementation rather than stale phase docs.
Eight responsive/theme browser cases visit all five pages at 320/390/768/1440; build and whitespace checks passed. All five extensionless hosted routes returned HTTP 200 after deployment; Google/Apple both enabled. Production deployment and both D1 bindings verified unchanged before deploy. No production settings/database or Git push changes.
Read docs/PRIVACY_CONTENT_REVIEW.md for evidence mapping and unresolved production privacy decisions: retention/backup schedules, analytics consent and invite-token URL sanitization, intended age policy/operator confirmation and region/rights review. These are NOT implemented by a notice update. No legal compliance certification or invented retention guarantees. Next: user content review on Preview, then operational follow-ups and device/release QA.


### November 18 - Latest picker fixes republished on request
Preview 935f653f: https://feature-play-together.opencourts.pages.dev. Fresh build passed; deployed asset index-B0eMN8tX.js verified contains oc-select-trigger. Google and Apple both report enabled after deployment. Same single-picker implementation tested by the ten cross-device browser-profile cases; physical iPhone Safari/Chrome retest remains. Production deployment/D1 isolation verified before publishing. No production configuration, database or Git push changes.


### November 18 - Cross-device single-picker regression verified

Expanded tests/ios-dropdown.spec.ts to ten Chromium browser-emulation cases: iPhone-sized touch, Android Pixel 7, Android Galaxy S9+, tablet touch and desktop, each in light/dark. All ten passed (46 seconds). Checks actual touch/click selections, exactly one rendered listbox, viewport width bounds, selected text, hidden native selects with aria-hidden/tabindex=-1, keyboard selection and nested calendar menu. Static scan confirms SiteSelect is the only raw select implementation. These are emulated profiles on Windows Chrome, not physical Android/iOS or Safari WebKit tests; physical device retest remains required. Test/docs changes only: deployed fix remains bb13166d on stable Preview, no new deployment needed. Production unchanged.


### November 18 - iPhone duplicate native/custom dropdown fix published

Preview bb13166d: https://feature-play-together.opencourts.pages.dev. Physical iPhone screenshots showed Safari native select opening on top of our custom listbox. Root cause: SiteSelect still focused/clicked a real select despite preventDefault handlers. Replaced interactive trigger with type=button role=combobox; native select is hidden, aria-hidden and removed from tab order, retained for form/change/validation. Shared listbox anchors/focus/keyboard now use button, so native picker has no visible interactive target. Applies to every SiteSelect consumer, including calendar time. Updated common trigger styling retains site tokens.
Eleven browser checks passed: touch selection/no native select focus across discovery, scheduling and players, keyboard selection and nested calendar menu, plus mobile/tablet/desktop navigation. Build and diff checks passed. Google and Apple readiness both true before and after deployment. No credential/config/database or production changes. Physical iPhone retest is required; desktop touch emulation does not certify native Safari behavior. Earlier selectOption/option-bound tests need migration to the new button/listbox contract in broader QA. Screenshots with d5317393 URL are immutable old builds; use stable alias above (older unique builds also fail exact-origin auth guards).


### November 18 - Google and Apple sign-in startup restored

Latest Preview fbd7a20e: https://feature-play-together.opencourts.pages.dev. User restored Google and Apple bindings manually; Google client ID is Text. User reported no saved Apple token encryption key and generated a replacement 32-byte/64-hex Preview key after being informed old encrypted Apple refresh tokens cannot be decrypted. Existing accounts/profiles were not deleted; affected users should sign in with Apple again before token-dependent actions such as account deletion. Preserve the new key securely; never print or commit it.
Live /api/auth/me now reports google=true, apple=true; Google start and Apple start both returned HTTP 200 in checks (Apple signing preparation succeeds). These checks do NOT complete interactive provider authentication/callback; user/testers must verify fresh Google/Apple login. Root cause of original missing-secret delivery remains unproven; metadata presence was insufficient. No production changes. Earlier exposed Google client secret still requires rotation in Google Cloud and Preview update; do not reproduce it.
Next: real sign-in checks before inviting testers back; add provider startup/readiness smoke checks to future preview release workflow. Handoff records outage and recovery without any credential values.


### November 18 - Google sign-in readiness restored
Preview dc89e526. User saved GOOGLE_CLIENT_ID as Text and manually resaved GOOGLE_CLIENT_SECRET as Secret. Redeployed; live /api/auth/me now google=true, apple=false. Google start returns HTTP 200 (authorization response); real end-to-end provider login still requires user/tester verification. No local credential read/upload occurred; earlier attempted transfer was blocked by approval review. Client secret appeared in user-supplied IDE context: user advised to rotate in Google Cloud and update Preview; never reproduce or commit it. Apple remains unavailable and needs separate configuration repair. Production untouched.


### November 18 - Auth outage narrowed to all provider runtime secret bindings
Screenshots confirm Preview secret names. Added safe missing-name diagnostic in auth start (no values). Live Google start lists GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET missing; Apple lists all five provider bindings missing. Metadata/encrypted dashboard placeholders cannot prove usable values. Do not repeatedly assert user entered them incorrectly. Next controlled check: make non-secret GOOGLE_CLIENT_ID a Text binding with actual ID while keeping secret credentials encrypted; verify deployment runtime. Production untouched. Completed build redeployed after diagnostic compilation; do not assume sign-in restored.


### November 18 - Preview Google sign-in still blocked after credential resave
User resaved Google credentials. Redeployed Preview b5956863, but live /api/auth/me still reports google=false/apple=false; POST /api/auth/google/start returns 503 'This sign-in option is not configured yet.' That means providerReady sees missing/empty GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET before the rate-limit check. Project metadata lists both names as secret_text in Preview only; secret API redaction alone cannot prove values are empty. Do not claim restored or assume Google test-user restrictions. Need inspect saved dashboard values/configuration or securely reinsert credentials and verify runtime. Never print secrets. Production unchanged.


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


### November 18 - Self-invitation investigation (local changes)
Read-only aggregate query of development D1 found zero same-account self-invitations and one invitation between distinct accounts with matching display names. Account identity uses player ID, never names/email matching. Existing discovery SQL and invitation eligibility already exclude the actor/host. Added explicit server 400 for self-send, empty self picker, viewerId-based defensive client filtering, and pre-send current-account check. Fifteen invitation API tests and development build passed. These latest safeguards have NOT been deployed. Current live preview remains 75aa19c9.
Existing limits: sender 20/hour and recipient 30/day, unique game/recipient, no capacity reservation until host approval. Proposed additional per-game limit of 10 invitees is a recommendation awaiting user decision; NOT implemented. Explain separate-account linking through Account; never silently merge matching names/emails. Production untouched.

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


### November 18 - Flat dock published to isolated Preview

User-approved manual deployment: https://b7c07c08.opencourts.pages.dev
Stable alias: https://feature-play-together.opencourts.pages.dev
Bundle index-DGGCkx1b.js; hosted shared CSS includes the uniform icon-row styles.
Search is a normal inline dock destination in both court discovery and Play Together.
Validated: 10 alignment/comparison checks, 14 navigation checks, 12 visual-baseline
checks and development build. Production deployment unchanged; Preview uses opencourts-dev.
No database migration or production change. This update and flat-dock source remain
local working-tree changes relative to the last Git push; no Git push in this publication.

Latest local design: Nov 18 flat Search tab; see the final checkpoint below.
This supersedes earlier raised-circle decisions. Not deployed yet.


## Latest verified manual Preview publication

Published application source commit `2674be8` to https://e303ef23.opencourts.pages.dev.
Stable alias https://feature-play-together.opencourts.pages.dev serves HTTP 200 with
`index-CjwFqLZq.js` and the shared interaction stylesheet. Search-focus and floating-dock
corrections verified in hosted CSS. Preview COURTS_DB remains isolated development D1.
Production remains main / 7ef38ff2 with its original D1. No migration or production deployment.
This supersedes earlier local-only styling notes. Later documentation-only commits may
trigger another feature preview without changing application code.


## Git feature backup checkpoint

User approved committing and pushing to `feature/play-together` only. The complete feature
source, migrations, safe development setup, tests/baselines and handover are included;
only six audit-linked QA screenshots are selected, with other generated PNGs ignored.
Secrets, local databases, build output and machine-specific Wrangler config stay local.
Use `git log -1` and `git status` to identify the source checkpoint; older statements that
all feature work exists only in the working tree are historical after this checkpoint.
No main merge, production migration/settings change or production deployment authorized.
A Git push may create a feature-branch Pages preview; it does not approve production.


Current local follow-up: single search focus boundary and unfilled top navigation;
see the latest correction section below. Preview remains 89a8ba19.

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


## Latest: c17ef75c published; search and shared interaction styling local

Preview: https://feature-play-together.opencourts.pages.dev
Immutable: https://c17ef75c.opencourts.pages.dev; bundle index-BxFx9CTz.js.
All eight audit fixes are published. Preview COURTS_DB verified dev UUID
cae4849c-3e99-4945-9d70-bef7b48707ce; production deployment still
7ef38ff2-91e0-4505-a215-fa16edcfa0bc and original production D1 unchanged.
No migration or GitHub push. Preserve all uncommitted/untracked work.

Published validation: 257 units, 85 browser workflows, 350 theme/viewport states with
no detected axe violations/page overflow/JS errors, final development build.
Subsequent LOCAL ONLY: player-search cancellation and generation guard; concurrent
submission test failed before the fix, passed afterward. Focused discovery/sharing/safety
suite: 10 passes. See QA_AUDIT.md and current implementation plan for exact scope.
Do not mistake this new local fix for published code.

Next: real-phone, screen-reader and provider acceptance; notification/pending-request
bounds and safety operations review. Recurrence comes after the free first release.
The implementation plan is now rewritten to remove contradictory historical statuses.

Handoff date: November 17, 2026 (America/New_York).
This is the current operational snapshot for a new agent. Read
[PLAY_TOGETHER.md](PLAY_TOGETHER.md) for product rules and decisions, then
[the implementation plan](play-together-implementation-plan.md) and
[authentication guide](play-together-authentication.md). Earlier proposals and dated
troubleshooting notes in those documents are historical; use the latest verified
state below. Do not mistake a proposed feature for implemented functionality.


## Latest checkpoint: sharing and safety milestone on isolated Preview

November17,2026. This snapshot supersedes all historical notes below.

- Repository OpenCourts, branch feature/play-together; preserve ALL uncommitted/untracked
  work. No GitHub push, main merge, production deployment or production D1 changes.
- Stable Preview: https://feature-play-together.opencourts.pages.dev
  Latest immutable: https://3af45daf.opencourts.pages.dev; bundle index-JralF0cq.js.
- Preview D1 opencourts-dev / cae4849c-3e99-4945-9d70-bef7b48707ce; migrations through0017.
  Production opencourts-courts /56c414b7-aca5-429b-acfa-b9e8e87b052b;
  production deployment remains7ef38ff2-91e0-4505-a215-fa16edcfa0bc.
- Deployed: Apple/Google accounts and provider linking; profiles/circular drag-and-zoom
  avatar crop; optimized private image processing; public/unlisted/group games;
  approval joining/guest approval and atomic party capacity; organizer controls;
  My Games/private notification inbox/bell; public/private discoverable group previews;
  Owner/Co-owner/Organizer/Member roles; invitations requiring approval; protected group
  feed/games and organizer-to-Owner transfer on departure; personal feed; compact phone
  dock and member directory with search/pagination; public/group share and unlisted
  revocable invitations; opt-in player discovery; block/unblock; private safety reports.
- Preview moderator explicitly approved by user: Sam owner of Tennis, player UUID
  87be695a-f00f-4689-b0c7-16ad9a50346d, via MODERATOR_PLAYER_IDS (Preview only).
  Players page shows Report review to this account; group roles do not grant moderation.
- Media: private processor opencourts-media-processor-dev version
  c5e01912-6e84-4938-bf78-049d2096bd24; dev R2/service bindings unchanged.
- Verification:251 unit tests,76 complete browser tests, development build passed.
  Actual Preview/D1 synthetic acceptance26 API checks passed; all fixtures removed.
  This is not real-provider OAuth or physical Safari/TWA acceptance.
- MapLibre updated to5.24.1 patched backport; sanitizer regression passed. npm audit
  still flags an overbroad range. See sharing-safety guide; do not claim zero findings.
- NEXT: run user/device acceptance in PLAY_TOGETHER_RELEASE_CHECKLIST.md, resolve
  advisory-metadata/operational release gates, then separately approved production
  rollout. Recurrence is the milestone after the free first release. No payments or
  native Swift integration yet.
- Read play-together-sharing-safety.md for exact link/block/moderation behavior and
  preview-acceptance.ps1 guard/cleanup; never run remote scripts without authorization.

## 1. Current guides and next phases

1. PLAY_TOGETHER.md: approved product decisions, visibility and target role matrix.
2. play-together-implementation-plan.md: refreshed current plan and next milestones.
3. play-together-groups.md: group architecture and historical rollout notes.
4. play-together-participation.md: public participation, notifications and guest design.
5. play-together-authentication.md: account architecture/provider configuration history.
6. play-together-development.md: local setup; current checkpoint overrides dated notes.

Phase5: IMPLEMENTED roles, invitations, protected group games and guests.
Phase6: IMPLEMENTED sharing/unlisted games, opt-in discovery, blocking/reporting.
Phase7: security/accessibility/real Android TWA and mobile Safari/release acceptance.
Phase8: recurring/series events after first release; not approved as Pro-only.
Phase9: separately approved subscriptions/entitlements (no payments now).
Phase10: native Swift using shared backend/account, applicable Apple purchase system.
See the implementation plan for concrete Phase5 steps and remaining release gates.

## 2. Preserve the workspace before doing anything

Run read-only checks first:

```cmd
cd /d "C:\Users\bigda\OneDrive\Documents\Git Projects\OpenCourts"
git remote -v
git status --short --branch
git log -1 --oneline
```

Last Git commit at handoff: `fd35836` (`Bump iOS app version to 1.0.5`). The feature
branch already existed before this work. Its Git HEAD is not the complete deployed
source because all Play Together additions are working-tree changes.

Do not reset, clean, switch branches, overwrite local files, or assume a fresh clone
contains this work. A different agent must use this same workspace or a securely
preserved copy. A Git commit/push or source backup strategy should be discussed
with the user; this documentation task did not authorize pushing anything.
Keep ignored secrets and local databases out of Git. Do not open the Google client
secret JSON visible in the IDE or private keys just to investigate the repository.

## 3. Environment and live URLs

| Item | Verified value |
| --- | --- |
| Cloudflare account ID | `0f71d46e637d75b35ce799d1e90559b3` |
| Existing Pages project | `opencourts` |
| Production site | `https://opencourts.us` |
| Production branch | `main` |
| Production D1 | `opencourts-courts`, UUID `56c414b7-aca5-429b-acfa-b9e8e87b052b` |
| Development D1 | `opencourts-dev`, UUID `cae4849c-3e99-4945-9d70-bef7b48707ce` |
| D1 binding in each environment | `COURTS_DB`, mapped to DIFFERENT databases |
| Preview homepage | `https://feature-play-together.opencourts.pages.dev/` |
| Community home | `https://feature-play-together.opencourts.pages.dev/play-together` |
| Account/settings | `https://feature-play-together.opencourts.pages.dev/account` |
| Latest verified immutable preview | `https://a9127653.opencourts.pages.dev` |
| Production deployment last verified unchanged | `7ef38ff2-91e0-4505-a215-fa16edcfa0bc` |

Reverify these before remote changes. Use the **stable branch alias** for login;
immutable preview URLs are deliberately rejected by authentication origin checks.
Preview deployments share development D1; they do not create fresh data per build.
Changes to Pages secrets require a new preview deployment to load them.

## 4. Safety and approval boundaries

- Work on `feature/play-together`; keep production website, D1, court records,
  bindings, domains, settings and existing mobile releases untouched.
- No production deployment, merge to main, production migration or catalog import.
  `scripts/import-court-catalog.mjs` defaults to production; do not run it with
  `--execute`. The catalog GitHub workflow also targets production explicitly.
- Do not push to GitHub without approval. Pushes can trigger Pages Git deployments.
- Before a new milestone, present its concrete schema/API plan where necessary.
  Before remote migrations/resources/deployments, show the target/action and obtain
  approval. Prior approvals covered the completed dev setup, auth deployment and
  its troubleshooting, not blanket authorization for future releases.
- Local implementation, builds and tests are permitted for approved scope. An
  approval to build a feature is not approval to publish it to production.
- Never paste/log credentials, OAuth codes, ID/access/refresh tokens, session tokens,
  private keys or full private API responses. Use safe aggregate diagnostics.
- Update central documentation, progress, decisions, schema/API notes and test
  evidence after each change. Flag conflicting product instructions before silently
  changing business rules. Current visibility and theme decisions supersede old ones.

## 5. What has been implemented

### Development isolation

- Separate development D1 created and Preview `COURTS_DB` binding verified.
- Local SQLite uses fake UUID `00000000-0000-0000-0000-000000000001`, persisted under
  `.wrangler/play-together-local`; wrapper rejects extra target flags/remote access.
- Both Vite fallbacks to the production courts API were removed. Public upstream
  court/weather providers may still be called. No account/game requests proxy to production.
- `0001_create_tennis_courts.sql` and `0002_player_auth.sql` applied locally and,
  after approval, remotely to `opencourts-dev` only.
- `0003_public_games.sql` applied locally and to remote dev D1 with user approval. It creates games/participants and
  integrity constraints/triggers. Do NOT edit it; use a later migration for corrections.
  Remote Phase 2 migration/deployment completed November 17, 2026.
- Three public-access-tagged OSM Paris sample courts seeded in development. No
  production catalog copy. A U.S. search may still depend on live upstream providers.
- `development/games.fixture.json` remains planning data. Optional LOCAL-ONLY
  `npm.cmd run dev:db:seed-games` now creates one labeled demo game and synthetic
  organizer without any identity/session/login bypass. It was run locally.

### Phase 2 public games (development Preview)

- Browse by location/distance, date, format and advisory skill, with pagination.
- Create at an existing OpenCourts court using an actor/origin-bound, expiring
  signed court proof. Restricted/fee-based courts excluded; unknown access requires
  acknowledgement. Snapshots survive court catalog refreshes.
- Explicit IANA zone, UTC persistence, DST gap/fold rejection; future starts within
  180 days; 30–240-minute durations. Singles capacity 2, doubles 4, organizer counted.
- One visibility-aware model supports future public/unlisted/group audiences, but
  creation is public-only and unlisted/group reads fail closed with 404.
- Atomic game/organizer creation, idempotent submissions, capacity/uniqueness
  constraints, active-session recheck and anti-burst guard.
- Account deletion cascades organized public games; account UI discloses it.
- New routes `/play-together/create` and `/play-together/game?id=UUID` are exported
  by `prepare-dev-pages.mjs`, along with a community directory index.
- See [Phase 2 implementation](play-together-games.md) for schema/API/defaults.
  Phase 2 remote dev migration and Preview deployment completed; no remote demo seed was uploaded.

### Authentication/profile

- Google and Apple only, using `oauth4webapi` and `jose`; no password/email login.
  Arctic was evaluated, found deprecated, and removed; do not reintroduce it.
- Stable OpenCourts player UUIDs; identity uniqueness by issuer/provider subject.
  Matching emails NEVER automatically merge accounts.
- Four D1 tables: `players`, `auth_identities`, `auth_sessions`, `auth_login_attempts`.
- Hash-only seven-day session tokens; HttpOnly/host-only cookies, Secure on HTTPS;
  CSRF and exact Origin checks for mutations; private responses are no-store.
- Browser-bound, expiring, single-use OAuth state/nonce; Google PKCE. Apple's
  form_post uses a short-lived SameSite=None flow cookie while main session is Lax.
- Explicit second-provider linking requires a recent authenticated session and
  cannot steal an identity owned by another account. No manual account merge/unlink UI.
- Editable display name, optional bio/general area/self-reported skill, opt-in
  discovery defaulting off. Private emails/provider identifiers are not returned.
- Logout/current-device and logout-all; explicit account deletion with recent-auth
  checks. Apple refresh material is encrypted and revoked before deletion.
- DB-backed start throttling and bounded requests. Additional public-rollout abuse
  protection still needs review. Native exchange/refresh endpoints are not built.

Implemented route entry: `functions/api/auth/[[path]].ts`.

| Method | Endpoint |
| --- | --- |
| GET | `/api/auth/me` |
| PATCH / DELETE | `/api/auth/me` |
| POST | `/api/auth/google/start`, `/api/auth/apple/start` |
| GET | `/api/auth/google/callback` |
| POST | `/api/auth/apple/callback` |
| POST | `/api/auth/logout`, `/api/auth/logout-all` |

Sign-in returns to `/account`. API is gated to explicit enablement, exact
`AUTH_ORIGIN`, localhost or the stable preview alias, and rejects `main`/production
hosts. This is defense in depth; never substitute gates for correct D1 bindings.

## 6. File map

| Files | Purpose |
| --- | --- |
| `docs/PLAY_TOGETHER.md` | Central approved product rules, progress and decisions |
| `docs/play-together-implementation-plan.md` | Earlier detailed architecture draft; some proposals superseded by central reference |
| `docs/play-together-development.md` | Environment setup and isolation checklist |
| `docs/play-together-authentication.md` | Phase 1 setup, endpoints, security and troubleshooting history |
| `docs/play-together-games.md` | Phase 2 schema, API, defaults, local seed and rollout steps |
| `functions/lib/auth.ts` | Authentication, profile/session lifecycle, provider signing, safe error categories |
| `functions/api/auth/[[path]].ts` | Pages API adapter |
| `functions/db/migrations/0002_player_auth.sql` | Applied Phase 1 migration; do not edit/reapply as new SQL |
| `functions/lib/games.ts`, `functions/lib/game-time.ts`, `functions/api/games/[[path]].ts` | Phase 2 game logic, court proofs, DST conversion, route adapter |
| `functions/db/migrations/0003_public_games.sql` | Local-only game/participant schema and integrity triggers |
| `src/PlayTogether.tsx`, `src/CreateGame.tsx`, `src/GameDetails.tsx`, `src/game-api.ts`, `src/PlayTogetherShell.tsx` | Public discovery, creation and details with shared shell/API models |
| `src/PlayerAccount.tsx` | Sign-in, profile, linking, logout and deletion UI |
| `src/PlayTogetherHeader.tsx` | Shared community/account header with right-side account icon |
| `src/useTheme.ts`, `src/TennisBall.tsx` | Shared automatic device theme and unchanged reusable brand mark |
| `src/play-together.css` | Scoped styles using existing tokens; accessible muted text derived from current palette |
| `src/App.tsx`, `src/main.tsx` | Existing discovery page integrations and community/account route selection |
| `vite.config.ts` | Local API handlers, no production fallback; auth explicitly requires Pages dev |
| `scripts/dev-environment.mjs` | Guarded LOCAL migrate/seed/query/server wrapper |
| `scripts/prepare-dev-pages.mjs` | Exports community/account HTML routes for development build |
| `development/wrangler.local.json` | Local-only migration config; deliberately not root/autodiscovered |
| `development/wrangler.remote.json` | Ignored dev-only account/UUID config; exists locally, no credentials |
| `development/auth.dev.vars.example` | Credential NAMES/placeholders only |
| `tests/auth.test.ts` | Real in-memory SQLite and signed synthetic provider-token security tests |
| `tests/player-account.spec.ts` and snapshots | Browser/navigation/profile/theme tests and four Windows Chrome visual baselines |
| `tests/games.test.ts`, `tests/games.spec.ts` and snapshots | Real-SQL privacy/integrity tests, seven browser flows and six visual baselines |

## 7. Run and test locally

Use Command Prompt or `npm.cmd` in PowerShell. Node 24 is recommended; tests use
built-in `node:sqlite`. Dependencies are already installed in this workspace.

```cmd
npm.cmd run dev:db:migrate
npm.cmd run dev:db:seed
npm.cmd run dev:db:seed-games
npm.cmd run build:dev
npm.cmd run dev:pages
```

The two seed commands are optional; run court seed before game seed.
Open `http://127.0.0.1:8788/play-together` or `/account`. Local Google login needs
private local credentials in ignored `.dev.vars`. Apple requires HTTPS Preview.
Do not copy credentials out of Cloudflare or request secrets in chat just to run tests.
The existing Cloudflare Preview is the simplest place for the user to test real login.

Fast `npm.cmd run dev` renders pages but does not provide D1 authentication; account
API explains that Pages dev is required. After changes, rebuild with `build:dev` and
restart Pages dev. Existing `public/404.html` disables Pages' SPA fallback, so the
development build explicitly exports `play-together.html` and `account.html`.
Export each future route as needed; do not silently introduce production redirects.

```cmd
npm.cmd test
npm.cmd test -- --run tests/auth.test.ts
```

Browser checks on this Windows machine:

```cmd
set "OPENCOURTS_CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
npx.cmd playwright test tests/player-account.spec.ts
```

Use `--update-snapshots` only for intentional visual changes after reviewing them.
Existing baselines are Windows-specific; another OS may need reviewed equivalents.
Tests intercept provider HTTP requests and use synthetic identities; no test auth
bypass or fake login is shipped. No real account data is required for automated tests.

Last verification evidence (do not inflate it):

- Full unit suite: **199 passed** (29 auth, 15 games plus existing suites).
- Full browser suite: **26 passed** (8 account/navigation, 7 games plus existing suites).
- Latest development build passed; existing large MapLibre bundle warning remains.
- Fresh Chrome on deployed Preview verified both pages, account icon, removed theme
  controls and live device-theme switching.
- Live Apple start preflight passed real key import/signing; user then confirmed
  full Apple login. Google login was separately user-confirmed.
- Local Pages runtime: game list/detail and all exported game pages return HTTP
  200 with the demo record; unauthenticated court picker returns 401.
- Profile persistence/linking/logout/deletion are automated-test-covered but have
  not all been reported manually verified on real Preview accounts.
- Mobile Safari, installed Android TWA and native iOS are not device-certified.

The sandbox sometimes prevents esbuild reading ancestor directories on Windows;
normal-filesystem tool execution was needed for builds/browser tests. Do not change
PowerShell execution policy. Avoid duplicate local servers; stop only the verified
OpenCourts server tree you started, never all Node processes.

## 8. Credentials and the resolved Apple problem

Preview is configured with these names; actual values must stay private:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
APPLE_CLIENT_ID
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
APPLE_TOKEN_ENCRYPTION_KEY
AUTH_RATE_LIMIT_SECRET
PLAY_TOGETHER_ENABLED=true
AUTH_ORIGIN=https://feature-play-together.opencourts.pages.dev
VITE_PLAY_TOGETHER=true
```

Apple Services ID: `us.opencourts.playtogether.dev`, associated with the existing
OpenCourts primary iOS App ID. Both Google and Apple callbacks are:
`https://feature-play-together.opencourts.pages.dev/api/auth/PROVIDER/callback`,
replacing PROVIDER with `google` or `apple`. Local Google callback also uses
`http://127.0.0.1:8788/api/auth/google/callback`.

The Apple failure was incomplete PEM text in `APPLE_PRIVATE_KEY`. User replaced it
with the ENTIRE downloaded `.p8`, including BEGIN/END PRIVATE KEY lines, then a new
Preview deployment loaded it. Key preflight and real login now work. Normalization
accepts raw/quoted/escaped/flattened PEM; cryptographic import/signing still validates
the key. Safe stage categories distinguish malformed key, import, signing, token
exchange/signature and account storage without disclosing provider secrets.

`APPLE_TOKEN_ENCRYPTION_KEY` is a DIFFERENT 32-byte key, encoded as 64 hex characters;
never replace it with the Apple PEM. Keep it stable/backed up. Rotating it without
reencrypting stored Apple refresh credentials breaks revocation until reauthentication.
An earlier Google secret was exposed through IDE context and the user was told to
rotate it; verify rotation privately before public rollout. Do not repeat that value.

## 9. Product rules the next agent must preserve

- First release is FREE: free players, group memberships and basic organizers.
  Organizer Pro is future only; $29.99/year is tentative, limits/benefits undecided.
- Google/Apple only. Shared player IDs across web, Android and future native iOS.
  Group membership and future paid entitlements are separate; paying cannot bypass
  private-group approval. Future iOS billing uses Apple's system/StoreKit 2 as applicable;
  Android must use compliant payments and web provider is undecided. No billing now.
- Public, unlisted and group-only games must share game-management logic.
- **Both public AND private groups are discoverable in release one.** Earlier
  hidden-private-group rules are superseded. No hidden/unlisted group feature approved.
- Private-group nonmember previews: name, optional PUBLIC description, general
  location, private badge and Request to Join only. No precise address, member
  identities, schedules, game locations/times, RSVPs, private posts or management data.
- Owner/authorized admin approval is required for private membership, including
  invited players. Forwarded URLs never bypass access checks. Removal revokes access.
- Public-group member lists and members-only activities also remain protected.
  Public open-join versus approval-required policy remains undecided.
- Enforce permissions in Pages Functions/SQL, including searches, API projections,
  notifications and shared links. Prevent duplicate memberships/participation and
  overbooking with atomic operations/database invariants.
- Match existing OpenCourts components, CSS variables, typography, spacing and icons;
  no independent theme/framework. Follow system theme automatically. Support desktop,
  mobile Safari/Chrome and Android TWA. Never redesign unrelated court discovery.

## 10. Next work and unresolved release gates

Do not rebuild deployed Phases1-4. Read the current checkpoint/implementation plan.
The latest approved role design is NOT implemented. Next specify its D1 migration,
legacy Admin transition and event lifecycle, then implement Phase5 locally in small
milestones. No applied migrations may be edited. Do not start Phase6/recurrence or
paid/native work as part of the role update.

Manual group/inbox two-account acceptance and physical Android TWA/Safari remain.
Before public rollout resolve existing MapLibre advisory GHSA-jrc7-96c5-q579,
privacy disclosures, abuse/moderation/retention, provider/account lifecycle checks
and large roster pagination. No production release is authorized by this handoff.

## 11. Remote commands for reference, NOT standing authorization

Inspect the ignored remote config and exact UUID before any remote migration.
Never omit `--config`, substitute production names or run a production importer.

```cmd
npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.remote.json
npm.cmd run build:dev
npx.cmd wrangler pages deploy dist --project-name opencourts --branch feature/play-together --commit-dirty=true
```

Migrations0001-0010 are applied locally and remotely to dev. No new role migration exists. Do not rerun for recreation or edit applied migrations. A migration command can apply ALL pending SQL,
so review the full pending set before asking approval/executing.
Direct upload is intentional: it updates Preview without pushing GitHub or changing
the shared Git build command. A future Git-driven preview must explicitly use
`build:dev`/equivalent route export; ordinary `build` does not enable the account UI.

After any approved remote deployment, verify the environment is `preview`, branch
is `feature/play-together`, D1 UUID is development, stable-alias routes work, and
production deployment/binding remain unchanged. Test through the stable alias.

## 12. Prompt to give the next agent

> Continue OpenCourts in this workspace on feature/play-together. Read this handoff,
> PLAY_TOGETHER.md and the refreshed implementation plan. Preserve all uncommitted
> work. Phases1-4 and polished UI are deployed to isolated Preview a9127653; dev
> migrations0001-0010 applied. Latest approved roles are Owner, Co-owner, Organizer,
> Member, but deployed schema still uses Owner/legacy Admin/Member. User requested
> documentation before further coding; no new role migration exists. Next specify
> safe legacy-role transition and implement Phase5 role permissions, invitations,
> protected group games and member-brought guest capacity. Only Owner may transfer,
> appoint/remove Co-owners or archive; Organizers manage own events only; Members
> cannot create events. Preserve discoverable previews/private content, all-free
> first release, existing theme/design and notifications. Never modify production,
> push, deploy or run remote migrations without applicable approval. Keep handoff current.

Update this handoff when the source, deployment, milestone or next action changes.

November 17 follow-up: Create Game now reuses getPlaceSuggestions for debounced address/city/ZIP suggestions, keyboard selection and direct coordinate search. Development build and focused browser test passed. This follow-up is local only, awaiting Preview deployment approval. Original empty-court search needs the user's exact ZIP to reproduce; no confirmed cause yet.

ZIP 22033 investigation: preview geocode resolves correctly to Fairfax County (38.8755027, -77.3850505). Read-only court API returned 823 mapped features. Original signed-in picker failure remains unconfirmed; no production access used.

Phase 2 court-search follow-up deployed with user approval: November 17, 2026, Preview `10a19a10`. Address/city/ZIP suggestions are available on the stable branch alias. No migration or seed required. Original 22033 signed-in empty result still needs user retest; public API returned 823 features, 796 passing access filters. Build and focused browser test passed before deployment.

Court naming follow-up: picker now invokes the existing bounded court-context handler and reuses normalizeCourt/enrichNearbyCourtDetails from discovery. Closest 40 eligible courts receive named-place/street labels, signed server-side and saved with games. Optional provider failure retains mapped labels. Local implementation; Preview deployment pending approval. No schema changes.

Court-name fix deployed with explicit user approval November 17, 2026: Preview `d3d5d610`, stable branch alias unchanged. Uses existing discovery court-context/name/street enrichment before signing selections. Build and 15 game API tests passed. No migration, remote seed or GitHub push. Existing games retain their saved old court-name snapshots; test by searching and creating a NEW game. User label verification pending.

Latest court-label issue: user screenshot still generic on d3d5d610. Read-only POST court-context for two exact screenshot coordinates returned 171 named features, so context exists. Larger batch failure is suspected, not proven. Revised local batching from 24 to 8 points and include address alongside place labels; build/API regression checks run. Not deployed; signed-in end-to-end label verification still outstanding. Do not claim issue resolved.

Revised eight-point context batches and combined address labels deployed with explicit approval to Preview `f5e3f542`. Stable alias unchanged. Build and 15 game tests pass; actual signed-in picker labels still await user verification. Do not claim resolved until verified. No migration or production changes.

Coordinate street fallback now implemented locally: replaced broad named-feature context batches in game picker with bounded named-highway lookup within 250m for closest 40 eligible courts, reusing existing geometry distance/label rules. Real provider check at 38.8766,-77.3848 returned named streets including Burning Bush Drive and Tallow Tree Court; nearest street is selected geometrically, no address invented. Build and 15 game tests pass. Not deployed; signed-in end-to-end label verification outstanding. Previous broad-context failure cause remains unproven.

Latest approved naming requirement: preserve actual court names; replace generic Tennis courts/Court 1 with associated park/school name, otherwise approximate Near street. Local lookup now includes named park/recreation and school/college/university geometry with existing containment/proximity rules. New game-court-label helper and targeted regression tests. No deployment yet; hosted verification remains pending.

Park/school/street label update deployed with explicit approval to Preview `94a8f12a`. Stable alias unchanged. Build and 17 targeted tests passed. No migrations, production changes or GitHub pushes. User verification of actual picker labels is still pending; earlier deployments failed to show useful labels, so do not claim resolved before verification.

Confirmed live/dev data difference: public live API returns enriched catalog tags opencourts:nearby_place, nearby_street, context_version=2; Preview public API returned raw OSM records without context. Prepared development/fairfax-public-courts.sql from closest 100 enriched public court records (no users/accounts). Remote dev import NOT performed. Recommended dev-only fixture command: npx.cmd wrangler d1 execute opencourts-dev --remote --config development/wrangler.remote.json --file development/fairfax-public-courts.sql. Requires explicit approval. Do not run production importer. Existing normalizeCourt already consumes these tags.

Approved Fairfax fixture import completed November 17: 100 enriched public court records in remote opencourts-dev only, verified context_version=2 count 100. Removed BEGIN/COMMIT wrappers because D1 file import rejects them; first attempt failed before import, retry succeeded. No user data or production writes. Existing six-hour court edge cache can retain earlier raw OSM responses; preview response verification follows.

Post-import verification: Preview /api/courts still returned 823 raw records, zero enriched; old edge-cache response confirmed versus 100 enriched dev DB records. Prepared catalog-first picker read using existing findCourtsInCatalog, no production access, avoids stale raw-map cache. Build/targeted tests run; this source change needs preview deployment approval.

Catalog-first picker fix deployed with explicit approval: Preview `80b21fe9`, November 17. Uses isolated COURTS_DB directly before cached raw map results. 100 enriched Fairfax public fixtures already imported; build and 17 targeted tests passed. Actual authenticated picker labels still require user verification. No production modifications/GitHub push.

Profile-save report clarified by user: fields remain populated; Save profile button always visible caused confusion, no lost profile data confirmed. Local UI now disables save and says Profile saved when draft matches account, enables Save profile on edits. Build run; deployment pending approval.

User confirmed profile was saved; confusion involved another browser/session, no persistence defect confirmed. Requested clearer save behavior implemented locally: Profile saved disabled when unchanged, Save profile enabled for changes, Saving... while request runs. Focused browser test checks editing, reverting, save and refresh against persisted API fixture. Preview deployment still requires approval.

User screenshot confirms named park/school/street court labels now appear after catalog-first deployment. New local UI fix: paired game form labels align content at top and controls have consistent 48px heights, preventing helper text from stretching adjacent date/duration controls. Desktop/mobile browser geometry check added. Profile saved-state UI also remains local pending deployment approval.

Profile saved-state and game form alignment fixes deployed with explicit approval to Preview `784ae071`. Stable alias unchanged. Build passed; focused profile state/refresh and desktop/mobile alignment browser tests passed. No database changes or GitHub push. Court selection collapse/change-court UX was suggested but is NOT implemented.

## Latest Phase 3 work (November 17, 2026)

User authorized Phase 3 local implementation. Latest joining decision: all PUBLIC games require approval; approved GROUP members may join immediately; group guests require approval without bypassing private-content restrictions. See docs/play-together-participation.md. New migration 0004 applied LOCAL ONLY. Source includes request/withdraw, atomic approval, rejection/removal, organizer title/notes edits with version checks, cancel, and My Games. Existing remote Preview remains Phase 2 (784ae071). Remote migration/deployment need explicit approval. Final checks in progress.

Phase 3 verification: development build passes; full unit suite passed (209 tests). Game lifecycle suite 23 passed, including eight Phase 3 tests. Game browser suite 12 passed, including new approval/withdraw/My Games/organizer cancellation tests; light/dark snapshots updated and mobile dark detail reviewed. Initial full browser run had one ambiguous test selector (not app failure), corrected and game suite passed; final full suite rerun in progress. Local migration 0004 applied, remote pending. Next step: request approval for dev-only 0004 migration and Preview rollout, then user two-account acceptance. Organizer edits currently title/notes only; no rescheduling, notifications, guest groups or recurrence yet.

Final Phase 3 validation: all 32 browser tests passed (including existing court/weather/navigation flows); full unit suite 209 passed; development build and git diff --check passed. Phase 3 local implementation ready for review. Remote 0004 migration/Preview deployment NOT run. Next action: user approval for dev-only migration + deploy, then two-account manual acceptance.

Latest user clarification: group member may bring guests (Sam + Tom + 1 guest = 3 places). Guest capacity design recorded in participation guide; group guest UI/schema not implemented yet. Approved member self-joining immediate, guest additions require approval; guests gain no private-content permission. Added optional confirmed-player cancellation reason UI, private organizer cancellation history, and migration 0005 applied LOCAL ONLY. Remote rollout now needs BOTH 0004 and 0005. Pending requests can withdraw; approved players can leave regardless of providing a reason. Latest targeted API suite: 24 passed. Build/browser follow-up in progress.

Cancellation follow-up validation complete: development build passed; game API suite 24 passed; focused browser checks for optional cancellation reason and organizer approval/cancellation both passed. Latest source remains LOCAL; remote 0004/0005 and Phase 3 deploy await approval.

Host notification requirement implemented locally: private My Games in-app inbox for request withdrawal and approved cancellation, optional reason, released-place count, unread/read states. Atomic SQL with participation removal, retries deduplicated; owner-only inbox access. New 0006 applied LOCAL ONLY. Remote 0004/0005/0006 all pending. No email/push configured; guest counts remain future group phase. API suite 25 passed; build/browser inbox check in progress.

Host notification checks complete: build passed, 25 game API tests passed. Game browser run passed 13/14; dashboard test fixture lacked the new notifications endpoint and was corrected, then dashboard/inbox checks both passed. No application change needed for that fixture issue. Source ready for dev rollout approval; migrations 0004/0005/0006 pending remotely.

## Latest approved rollout: Phase 3 deployed

November 17: user explicitly approved migrations 0004-0006 and Preview deployment. Verified only those migrations pending, then applied all three to dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Deployment cf3d2b64 serves the stable feature alias. Verified HTML routes including My Games return200 and latest bundle; public list returns approval joining policy; signed-out My Games/notifications APIs return401. Production deployment 7ef38ff2 and production D1 binding unchanged. No GitHub push.

Next: user test with TWO accounts: guest requests place, host approves, guest leaves with optional reason, host sees private notification in My Games. Also test rejection/removal, capacity, edits/cancel. Groups/guest-plus-one capacity remain future group phase. Email/push unimplemented. Earlier statements that migrations/deployment are pending are superseded by this rollout.

Latest local corrections: organizer self-join now409 by account ID; top-header bell/unread count links to host inbox on community/account/dev discovery; new pending join requests notify host using new migration0007 trigger. 0007 applied LOCAL ONLY; remote pending. Build and26 game API tests passed. Screenshot example had zero pending requests at read-only diagnostic time, original same-account vs same-name not established. Browser/theme tests running. Existing remote remains cf3d2b64.

Follow-up validation complete: development build,26 game API tests and24 game/account browser tests passed, including new header bell/inbox navigation and320px fit. Theme screenshots updated. Source/migration0007 remain local; request approval for dev-only0007 and Preview deployment before publishing.

Latest requester notification work: local0008 replaces host-only table with game_notifications(recipient_id), preserving existing events/read states. Triggers privately notify requesters on approval/rejection/removal and pending/confirmed players on game cancellation, without duplicates for unchanged-state retries. Combined Notifications inbox/bell. 0007 AND0008 applied LOCAL ONLY; both pending remotely. Backend suite28 passed; build/browser checks running. No email/push, group notifications or production changes.

Requester notification final verification: development build passed; full unit suite214 passed; all16 game browser tests passed including requester inbox and header bell. diff whitespace checks passed. Next action request approval for dev-only pending0007/0008 and Preview deployment. Existing remote still cf3d2b64; no migration or deployment performed this turn.

## Latest rollout: host/requester alerts and bell

User approved development migrations0007/0008 and Preview deployment November17. Both migrations applied successfully to isolated dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce. Preview b5f880ff serves the stable alias with header bell, host new-request alerts, requester approval/rejection/removal/cancellation alerts and organizer self-request409. Existing notification events preserved by migration. Previous pending-rollout statements superseded. Build214 unit/16 game browser checks passed before rollout. Next user two-account notification acceptance; sign into same account/provider across browsers. No email/push or group guest implementation. Production/GitHub untouched.

Phase 4 final verification: development build passes; full227-unit/43-browser regression passed. Final group-specific suite12 passed after adding private-search and peer/removed-admin tests. Group screenshots inspected; adjacent back-link spacing corrected, rebuilt and7 group browser checks rerun successfully. Latest build includes group-specific Back to groups link. Pending remote0009/0010 and Preview deployment require approval. No production or remote data changes this phase.

Latest user request: organize inbox and allow approvals directly there. Local fix replaces flex list with stacked notification cards (requester, game/group, current status, timestamp, actions). Server projects actionPlayerId only for current authorized pending requests. Approve/Deny call existing APIs, preserve capacity/role checks, mark read and refresh bell/status. Resolved requests lose action buttons. Build,31 game/12 group API tests,19 game browser checks plus group inbox approval test passed. Mobile snapshots reviewed. No new migration for UI, but pending Phase4 migrations0009/0010 still required before deploying combined build. No remote deployment yet.

## Latest approved rollout: Phase 4 and inline inbox decisions

User authorized Preview upload. Verified ONLY0009/0010 pending; applied both to opencourts-dev UUID cae4849c-3e99-4945-9d70-bef7b48707ce and deployed14cd548b. Stable alias serves latest index-vay_ncRX.js on all group routes and My Games. Public group API returns empty discovery successfully (no seed groups created), signed-out My Groups/inbox return401. Deployed environment preview/branch feature/play-together/D1 verified. Production7ef38ff2 and production D1 unchanged. No GitHub push.

Test with real accounts: owner creates a private group; outsider sees only public preview, requests membership; owner approves directly in organized inbox; member sees roster/private details; owner removes member and member loses access. Also test public groups, admins, withdrawal, owner transfer/archive and game inbox Approve/Deny. Invitations/group games/member-guests remain next phase. Earlier pending/local-only statements superseded by this checkpoint.

Latest local UI request: group navigation links converted to styled icon buttons (Find groups/My Groups/Create group), using existing colors/borders/shadows and active aria-current state. Responsive two-column mobile arrangement with full-width Create group, keyboard focus and reduced-motion support. Build and7 group browser tests passed; mobile light/dark nav baselines added/reviewed. No database changes. NOT deployed; preview remains14cd548b until approval.

Latest local inbox compactness request: reduced panel/card padding and gaps, combined game/group link with timestamp, compact success messages, omitted empty action containers for resolved/read requests. Decisions retain44px touch targets. Also tightened <=360px header spacing for bell/account/menu. Build passed; inline game/group decisions passed; light/dark desktop/mobile notification baselines reviewed and320px responsive check passed after waiting for viewport reflow. Navigation/group regression13 passed. Group navigation button polish remains bundled and LOCAL. Preview remains14cd548b pending approval for both UI updates. No schema or remote changes.

Latest local design request: consistent polished Play Together action styling across games/groups/account/inbox (existing theme tokens, shared6px radius, subtle token-derived shadow, hover/focus/disabled/reduced-motion states). Key navigation actions My Games/Browse public games/View game/Open group use buttons; group search gains icon; Mark as read is a quiet secondary button. Existing design/colors retained. Build passed; game/group/account browser and refreshed theme baselines running. No DB changes or deployment. Bundles prior group-button and compact-inbox updates; approval needed for Preview.

Shared button/compact inbox verification complete: development build and36 game/group/account browser tests passed, including light/dark and320px layouts. Desktop dark inbox screenshot reviewed. No schema changes; ready for Preview UI deployment approval. Removed temporary test layout diagnostic logging.

## Latest review build: polished actions and compact inbox

User explicitly requested publication for review. Preview a9127653 serves stable feature alias with index-Dz31s1Qs.js: polished shared actions/group navigation, compact notification cards and narrow-header spacing. Build and36 game/group/account browser checks passed. No schema changes/migrations or GitHub push for this UI rollout. Production deployment and bindings unchanged; group/inbox/account routes/latest bundle smoke-checked. Earlier local-only UI notes are historical. User visual review next; Phase5 group invitations/games/member-guests still unimplemented.

Documentation-only checkpoint: approved role model/current deployed state/next phases refreshed at user request. No application files, database state, branches or remote configuration changed in this turn.

Latest instruction: user authorized moving to next phase. Reviewed current schema/permissions; prepared docs/play-together-roles.md Phase5A transition proposal. Recommended retaining legacy Admin permissions temporarily, Owner explicitly converts to new roles; no automatic privilege elevation/demotion. Awaiting user choice on this transition before role coding. No app/schema/remote changes this turn. Next steps remain roles, invites, protected games, guests, event lifecycle.

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

Latest local UI fix: group member management reorganized into bordered rows with name/role badges, aligned controls and styled theme-aware role selects. Long role explanation moved to expandable help; mobile controls use grid. No permission/schema changes. Build/group browser verification running; Preview deployment pending approval. Existing Preview79f9e7ca unchanged.

Member layout build passed; privacy test selector updated for new name/badge markup, rerun group suite passes. UI changes remain local; request Preview approval.

Latest user authorization: add one optional player photo/group cover. Inspected repo: no R2/upload bindings. Read-only R2 API returned403; bucket availability/billing unconfirmed. Prepared docs/play-together-media.md concrete isolated bucket command/Preview binding and secure upload/storage/privacy/test contract. No Cloudflare resource or app changes this turn. Need approval before r2 bucket create opencourts-media-dev or binding changes; transformation availability/cost needs check before service setup. Group cover explicitly public preview, player image follows profile/member permissions. Preserve pending local member layout fix.

Media setup attempted with explicit approval: r2 bucket create opencourts-media-dev failed code10042 (enable R2 through Cloudflare Dashboard). No resources/bindings created. Ask user to activate R2, then retry same already-approved dev bucket command. Approved resize limits512px avatar/1200x600 cover, optimized WebP only, discard originals. No uploads implemented/enabled. Preserve local group-member layout fix; Preview remains79f9e7ca. No production changes.

Latest media setup: user activated R2. Empty bucket list verified, then created approved private opencourts-media-dev and added Preview-only PLAY_TOGETHER_MEDIA binding. Production R2 null/production7ef38ff2 unchanged and Preview D1 dev verified. No image upload code yet; server image transform setup still pending. No deployment this turn; binding needs subsequent deployment. Existing pending local member layout fix preserved.

Media follow-up: prepared private transform Worker source/config development/media-processor (not deployed). Pages does not document IMAGES binding, so use service Worker with no public URL/no storage permissions. Need explicit approval for new Worker deploy and Preview service binding; check Images capability/cost first. End-to-end upload/image validation/metadata stripping not verified. No upload UI or media migration created. Existing R2 binding remains Preview-only.

Latest media infrastructure: approved private Worker opencourts-media-processor-dev deployed (a55bc1f7-3b84-4b7e-afd8-4d775b482aa1), IMAGES binding, public subdomain/previews disabled verified. Pages Preview-only PLAY_TOGETHER_IMAGE_PROCESSOR binding added; production services null/site7ef38ff2 unchanged; R2 dev binding retained. Worker service environment=production is its default environment, not production website. Three local processor mock tests passed; live transform/EXIF behavior unverified. Upload routes/schema/UI still not implemented, bindings need subsequent Pages deployment. Do not claim photo feature complete. Preserve local member layout change; latest site remains79f9e7ca.

Latest local media implementation:0012 media references/cleanup queue/deletion triggers applied LOCAL ONLY; authenticated API GET/PUT/DELETE for own player/Owner-Coowner group cover,5MB bounded input, private processor output inspected for dimensions/EXIF/animation then stored, optimistic replacement and old-key cleanup. PhotoUpload controls added to Account/group.16 group/media tests+3 processor tests pass. MEDIA_UPLOADS_ENABLED remains unset remotely; actual IMAGES transform/metadata behavior still unverified. No media deployment/migration this turn. Cleanup backlog drains on media writes, no sweeper yet. Need live binding integration + race review before enabling upload. Build/browser checks running.

Media local verification complete: build passed; full unit suite passed (236 tests: prior231 +3 processor +2 media);17 group/account browser checks passed and optional photo upload/save/remove test passed separately. Initial photo browser fixture served404 after success; corrected valid image fixture passed. Local media feature not deployed;0012 pending remotely; MEDIA_UPLOADS_ENABLED unset. Live processor decode/re-encode and EXIF/animation verification still required. Known follow-ups: actual transform compatibility/metadata behavior; cleanup queue scheduling/orphan failure recovery review; member photo display beyond own-account not implemented. No remote media schema/site deployment this turn.

Latest approved Preview rollout:0012 applied to opencourts-dev only; media/member-layout build d02fb1eb deployed (index-C37aM5Kh.js), stable alias unchanged. MEDIA_UPLOADS_ENABLED remains unset: controls are reviewable but saving photos intentionally unavailable until actual private processor transform/metadata verification. Remote dev migrations0001-0012 applied. Production unchanged/no GitHub push. Next finish real image integration/cleanup validation before enabling uploads, then secure invitations, protected group games and guest capacity.

Latest local photo UI cleanup: single styled icon picker (native file input hidden), compact avatar/cover placeholder, bordered editor with aligned actions and explicit Unsaved preview badge, filename truncation and discard action; no false saved state. Responsive stacked mobile layout, smaller group placeholder; missing noneditable group cover hidden. Build/browser snapshots running. No API/schema/flag changes; Preview remains d02fb1eb, uploads disabled.

Photo cleanup validation complete: build and18 account/group browser tests passed, mobile account screenshot reviewed. Corrected a file-format separator rendering issue found in review; final rebuild run. Local only, no deployment or upload enablement; request Preview approval.

Latest requested photo interaction: local pencil overlay on avatar/group cover opens same picker for add/change; separate Choose photo button removed, Save/Discard remain for explicit unsaved selection.44px accessible pencil control, keyboard label, theme tokens and mobile single-column layout. Upload flag still disabled. Build/photo browser checks running; no deployment.

Latest local group location UI: MapPin icon alongside general-location text in group discovery/My Groups/detail, with wrapping and theme-aware inherited colors. No precise coordinates or private-address exposure added. Bundled with pending photo pencil/cleanup changes; no deployment. Build/group browser checks running.

Latest approved UI review build: Preview eb2f943b deployed, stable alias unchanged, index-B47lirXy.js. Includes compact photo editors, add/change pencil overlays, explicit unsaved preview/discard, group location MapPin and earlier member layout fixes. Build/8 group browser tests and photo interaction checks passed. No migrations this rollout; media saving remains disabled (MEDIA_UPLOADS_ENABLED unset) pending live transformation verification. Production unchanged/no GitHub push. Next real processor integration/cleanup checks, then enablement approval and invitations/group games/guests.

Media verification latest: actual Cloudflare Images remote binding successfully transformed EXIF-bearing JPEG to512-square avatar and1200x600 cover, WebP with no EXIF/XMP/ICC. Fixed MIME info bug(image/jpeg vs jpeg) in LOCAL processor source; deployed processor still old until approved redeploy.19 media/group tests passed/build passed. Temporary localhost check sessions stopped/config removed. Next approve private processor redeploy + Pages UI deploy + Preview-only MEDIA_UPLOADS_ENABLED=true. Current site eb2f943b/uploads disabled. No production writes/config changes.

Latest approved media enablement: private processor fix deployed version a55617d2-08b0-404d-8fff-513b240c4de5; MEDIA_UPLOADS_ENABLED=true set on Pages PREVIEW ONLY preserving existing vars; Preview643c7700 published. Stable alias unchanged. Remote dev0012 already applied. Production upload flag absent/deployment7ef38ff2 unchanged; processor no public targets. Real Cloudflare binding resize/metadata checks passed before rollout. User must now test real authenticated photo save/refresh/replace/remove and group Owner/Coowner cover. No fake user account/session created. Cleanup queue currently drained on authorized media writes; no scheduled sweeper. Invitations/group games/guests remain next.

Latest local header avatar request: AccountAvatar component loads signed-in player's saved private photo; used by shared community/account header and dev court-discovery header. Falls back to person icon for signed-out/missing/failed photo. Photo save/remove dispatch refresh event; header also refreshes on focus. No private/public media permission change. Build and4 photo/profile browser checks plus saved-header-photo/fallback test passed. Not deployed; Preview remains643c7700.

Latest: approved header-photo update deployed to Preview36c696b2 (index-DrmkPMDf.js), stable alias verified200/dev D1/prod7ef38ff2 unchanged. Continued next work locally: secure group invitations,0013 applied LOCAL ONLY. Owner/Coowner create/copy/revoke, token hashes only, fragment link, public-safe preview, expiry/creator-role validity, acceptance creates pending membership/idempotent redemption. See play-together-invitations.md. Build and18 group API checks pass;10 group browser checks run. No remote0013 or invitation deploy. Preserve existing photos/storage permissions. Next rollout approval then group games/guest capacity.

Invitation validation final: development build passed; full238 unit tests passed;10 group browser tests passed after fixtures supplied invitations:[] for new endpoint (earlier timeouts were fixture render failures). Existing18 group API tests include invitation hash/preview/pending dedup/revoke/expiry/role restrictions. Invitation UI/schema remains local; next request explicit dev0013 + Preview rollout approval.

Latest approved rollout: invitation0013 applied to opencourts-dev and Preview962fb2da published (index-CJSUEJ5t.js). Stable alias invitation route verified. Production7ef38ff2 unchanged. Group-only games next: shared groupGameAccess authorization foundation added LOCALLY,19 group tests pass. It denies outsiders/removed members; Owner/Coowner create/manage all, Organizer creates/manages own, ordinary Member/legacy Admin cannot create. No group game routes/UI enabled yet. User explicitly selected lifecycle: upcoming games transfer to primary Owner when Organizer leaves/loses role; departing member places must be released. Implement creation/list/detail/participation/notifications with those checks next; do not claim group games complete.

Latest local milestone group games/personal feed: shared group-capability gated creation/detail/participation, protected group and own public activity feed All/MyGames/MyGroups with25-item cursor pages; group upcoming list/create action. Approved members self-join, Owner/Coowner manage all, Organizer own; members/legacyAdmin cannot create. Local0014/0015 enforce membership participation and approved Organizer-departure transfer to primary Owner; remove/leave releases future place. Group private inbox/MyGames membership filtered. Build/full240 unit tests passed;31 game/group browser tests running. Remote Preview still962fb2da,0013. No group-game remote migrations/deploy. Guests remain next. See play-together-group-games.md.


November 17 - Responsive floating navigation: Play Together Header now includes the existing court-site dock style on phones/tablets up to 1100px. Courts uses the live List icon, Find Games uses Search, Groups uses UsersRound, with CalendarDays/My Games and Rss/My Feed. Current tab, accessible labels/focus, safe-area offset and content clearance included. Desktop retains header navigation. Development build passed; two browser tests cover light/dark at 320, 768, 1024 and desktop-hidden at 1440. Shared stylesheet visibility conflict corrected. Existing screenshot baselines may need review/update for the new dock. Local only, not deployed. Pending dev0014/0015 rollout and guest work unchanged.


Preview rollout November 17: user approved publication. Dev-only migrations 0014/0015 successfully applied to opencourts-dev (cae4849c-3e99-4945-9d70-bef7b48707ce). Build deployed directly to existing Pages project opencourts, feature/play-together branch, deployment 17d2fa6b-4ea2-47c8-8081-095644e85ee2. Stable URL https://feature-play-together.opencourts.pages.dev; immutable https://17d2fa6b.opencourts.pages.dev. Includes group games, personal feed and phone/tablet floating dock. Feed/groups/account returned HTTP200 with bundle index-LsELY3PS.js; public games/auth-me HTTP200. Preview/production D1 UUIDs confirmed separate. No GitHub push or production deployment. Real signed-in two-account acceptance remains manual; next guest-party requests/capacity. This supersedes all local-only/remote0013 checkpoints above.


Mobile follow-up November 17: phone headers (<=620px) hide hamburger on map and Play Together; account/notifications remain visible. Map floating dock now adds a UsersRound Play Together shortcut, labeled Play for narrow-screen fit and aria-label Play Together. Shortcut is gated by existing development/VITE_PLAY_TOGETHER flag so disabled builds cannot link to disabled features. All existing map/weather tabs retained. Three browser checks passed (light/dark phone-tablet dock and 320px map shortcut navigation); local only, not yet deployed. Previous hosted build remains17d2fa6b.


Preview publication November 17: approved phone header cleanup/map Play shortcut deployed to https://6dc50889.opencourts.pages.dev, stable https://feature-play-together.opencourts.pages.dev. HTTP200 with bundle index-BRekpr2f.js verified. No migrations, GitHub push or production changes. This supersedes prior local-only mobile follow-up note.


November 17 mobile spacing follow-up: phone-only <=620px hides direct page-level back links (bottom dock remains), reduces main top padding to14px and heading/title/copy spacing. Desktop/tablet back links unchanged; contextual links inside cards stay visible. Development build passed. Focused browser coverage includes light/dark phone title placement and desktop back-link visibility. Local only; Preview remains6dc50889 until approved publication.


November 17 community feed layout: local feed now follows approved Meetup reference structure while retaining OpenCourts theme/type. Compact Your Groups horizontal shortcuts (approved active memberships only), group covers with tennis fallback, Start a tennis group action, one-row pill filters, chronological date sections and dense event rows with court/time/group/host/count and View game. Group media uses existing public cover endpoint; no roster/photo privacy expansion. No fake Saved/Past/share controls added; those require future functionality. Seven responsive/browser checks and feed filter check passed, new light/dark visual baselines reviewed. Development build verified; pending Preview publication. Last hosted build remains6dc50889, remote dev migrations0015. Next product milestone remains guest-party approval/capacity.


Preview published: compact community feed and phone spacing now hosted at https://99dbfdcd.opencourts.pages.dev, alias https://feature-play-together.opencourts.pages.dev. Rebuilt successfully; feed HTTP200 and index-knwLHojQ.js verified. No new migrations or production changes. Previous attempt was not executed because automatic approval service usage limit; user requested retry and approved publication succeeded. This supersedes local-only feed notes.


November17 badge/avatar fix LOCAL ONLY: notification link inherited avatar overflow:hidden, clipping count badge. Explicit bell overflow:visible fixes it. Header portrait now object-fit:contain with78% inset inside round frame; player-photo editor contain. Private processor avatar transform preserves full source aspect ratio within512x512 without upscaling (cover output unchanged1200x600). Earlier stored square crops cannot be recovered; re-upload original AFTER processor update deploy. Four processor tests (portrait/landscape/small/cover/privacy bounds) and browser check at320/440/1440 passed; dev build passed. Publish BOTH private development media processor and Pages Preview before asking user to re-upload. No DB migration/resources/production changes needed. Last hosted Preview remains99dbfdcd and processor versiona55617d2.


November17 group shortcut refinement LOCAL: user disliked horizontal Tennis/Find Groups slider. Replaced carousel with responsive grid (three desktop columns, two tablet, full-width phone rows) preserving full names/covers and Find Groups action. No horizontal scrollbar/clipping. Two light/dark visual tests passed with explicit rail overflow/bounds checks. Includes pending badge/avatar fixes; no publication yet. Update processor and Preview together on approval; original headshot must be re-uploaded afterward.


November17 latest: approved fixes published to https://703d8689.opencourts.pages.dev and stable alias. Private processor c5e01912-6e84-4938-bf78-049d2096bd24 deployed. Feed HTTP200 with index-DJy8xIGV.js verified; production still7ef38ff2. User may re-upload original full headshot. Subsequent guest milestone implemented LOCAL ONLY:0016_game_guests.sql, game-guests.ts, GameGuests.tsx, shared capacity totals and private guest notifications. Full243 units passed; local0016 migration successful; remote remains0015. No guest deployment yet. See play-together-guests.md for behavior, limitations and next checks. Preserve all uncommitted/untracked work.


Guest Preview rollout approved and completed: migration0016 applied only to opencourts-dev cae4849c-3e99-4945-9d70-bef7b48707ce. New deployment https://6eec28c4.opencourts.pages.dev, alias https://feature-play-together.opencourts.pages.dev. Bundle index-3lPfxaLb.js verified; public games endpoint HTTP200. Production deployment remains7ef38ff2. No GitHub push or production mutation. Guest feature now ready for manual two-account acceptance (host approves player first for public games, then approves guests; approved group members self-join then request guests). This supersedes LOCAL ONLY/remote0015 guest notes. Next: Preview acceptance, then sharing/unlisted games and safety/discovery milestones.


November17 account photo polish LOCAL: removed nested player-photo card, added compact divider section/portrait frame and understated remove action; pencil offset outside frame. Image now lives in absolutely constrained inner clip wrapper so tall portrait intrinsic sizing cannot overflow the grid and cut off the face. Group editor keeps existing cover treatment. Three upload/pencil/header checks plus two light/dark portrait framing checks at320/393/1280 passed; visual baselines reviewed and dev build passed. Last hosted remains6eec28c4. No migration or processor change needed for this polish; Preview publication pending.


Approved account portrait polish published to https://0b10ef19.opencourts.pages.dev and stable feature alias. Account HTTP200 with index-CJikg5Ua.js verified. Remote dev schema remains0016, processor c5e01912. Production unchanged; no GitHub push. Supersedes local-only portrait editor checkpoint.


November17 header avatar refinement LOCAL: account photo now fills circular header control using object-fit:cover and object-position50%25% (face-focused), instead of78% contain postage-stamp rendering. Full portrait remains contain in profile editor; original asset untouched. Browser badge/avatar check at320/440/1440 passed. Preview publication pending, last hosted0b10ef19.


November17 approved avatar preview alignment LOCAL: player-photo editor is now circular with identical object-fit:cover/object-position50%25% as header avatar, including selected-file preview before saving. Original optimized portrait remains uncropped in storage so framing is presentation-only. Supersedes full-portrait-editor UI decision; group covers unchanged. Local visual tests updated for circular framing. Preview deployment pending; hosted remains0b10ef19.


Approved circular avatar alignment published: https://30bcd70e.opencourts.pages.dev, stable feature alias unchanged. Account HTTP200 with index-DUUW5bWl.js verified. Includes header full-circle face framing and same circular upload preview. Remote dev0016 and processor c5e01912 unchanged; production unchanged. Supersedes local-only avatar notes.


November17 avatar positioning editor implemented: selecting a player photo opens circular draggable preview, Zoom1-3x, horizontal/vertical keyboard-accessible sliders and Reset. Save generates512x512 PNG of chosen framing in browser; existing private processor validates/re-encodes bounded metadata-free WebP. Saved square framing matches header/editor circle. No schema/processor change. This supersedes fixed50%25% as the only framing choice; stored avatar is now the selected crop, so later reframing requires selecting source again. Original local source file is not uploaded/stored. Three existing photo lifecycle checks and two light/dark crop tests passed, including drag/keyboard/zoom and decoded uploaded pixels proving selected blue half was saved,512square. Development build and Preview publication recorded next.


Avatar crop editor published with explicit Preview approval to https://aabb4c22.opencourts.pages.dev and stable feature alias. Account HTTP200 with index-vcxdfgXf.js verified. Five focused photo checks and development build passed. No DB migration, processor deployment, GitHub push or production changes. To test: account pencil -> select original -> drag/use sliders -> Save photo -> header matches.


Crop controls layout fix LOCAL November17: crop preview spans both photo grid columns, but subsequent controls incorrectly fell into96px column. Added explicit cropping state class and full-width controls row, normal-width metadata, aligned save/discard actions and responsive button wrapping. Zoom/drag/crop math unchanged. Two browser crop tests pass at320/440/1280 in both themes with screenshot baselines and exact saved512square pixel check; build passed. Last hosted remainsaabb4c22; layout fix awaiting publication.


Approved crop-controls layout fix deployed to https://795ab8c7.opencourts.pages.dev and stable feature alias. Account HTTP200/index-CaoyvesW.js verified. No migration/processor/production changes. Supersedes local-only crop layout note; pending next product work remains sharing/unlisted games and safety/discovery after user acceptance.


November17 member directory refinement LOCAL: replaced separate padded member cards with compact continuous48px-min rows and subtle horizontal dividers; name left and understated role right. Existing manager actions remain44px touch targets and wrap separately on phones. No roster privacy/API changes. Light/dark directory browser checks at393/1280 with compact row height assertions plus revoked-membership and owner workflow checks; build recorded next. Last hosted795ab8c7, publication pending.


Final safeguard: block relationships are rechecked within participant approval SQL, not only before the batch. Concurrency regression inserts a block between the permission read and mutation and confirms no participant is inserted. Full251-unit suite passed afterward;76 complete browser checks passed for this unchanged interface. Final Preview65f4d761 successfully deployed, bundle unchanged index-CBW7dPXl.js; production remains7ef38ff2. Actual Preview synthetic26-check acceptance completed for this milestone with fixture cleanup. All current guides refreshed; real OAuth/physical-device and operational release gates remain in release checklist.


November17 follow-up LOCAL, not deployed: My Games now focuses on schedule only. Notification bell links to dedicated /play-together/notifications inbox; old my-games#host-notifications redirects there. Inbox has All/Unread,20-at-a-time UI rendering within existing latest100 API cap, empty/loading/sign-in states, existing inline Approve/Deny/read controls. Account auth/me returns connectedAccounts(provider,email) only for authenticated own account; public player DTO unchanged, signed-out accounts empty. Profile connected sign-in rows show private provider email or unavailable text, including Apple relay explanation. No migration/resources/production changes.30 auth unit tests and12 focused browser checks passed/recorded; build passed. Last hosted65f4d761 remains unchanged until Preview approval. Update deployment snapshot after publication.


Approved inbox/account-email follow-up published November17: https://10cf494a.opencourts.pages.dev and stable feature alias. Notifications/My Games/Account HTTP200 with index-BTKwqqVl.js verified. Bell opens dedicated inbox; schedule no longer renders notification cards; own connected-provider emails shown privately in Account.30 auth unit checks/12 focused browsers/build passed. No migration, production changes or GitHub push. Supersedes local-only inbox/email checkpoint.


November17 schedule-tabs update LOCAL ONLY: My Games defaults Upcoming, with Requests/Past/Cancelled. Server-side classification and50-item cursor pagination replace mixed100-row history. In-progress until ends_at, old pending requests expire into Cancelled, left/withdrawn/removed/declined statuses labeled. Existing cancellation/withdrawal records preserve own history; revoked group membership hides private history and reasons never enter schedule DTO.39 games+24 groups API tests/four browser checks/build passed. No migration/resources/production changes. Last hosted10cf494a; Preview publication pending. See play-together-schedule.md.


November17 player location search LOCAL ONLY: player lookup previously compared literal q with saved general_location, so22033 could not matchFairfax. New player-search-location helper uses existing geocode handler for US ZIP/ZIP+4, validates returned postcode/country, expands safe city/county labels (e.g22033 ->Fairfax County ->Fairfax), and supports city-state labels through existing cityStateQuery. Player names are never sent to geocoder; no profile addresses/coordinates stored or returned. Generic city/name text search remains. UI labels Name, city or ZIP code and displays resolved area, with readable skill labels. General-area matching, NOT precise ZIP boundaries, proximity radius or guaranteed disambiguation of free-text same-name cities. Existing opt-in/block/active filters and pagination retained. Lookup failures/malformed or wrong postcode return explicit errors.39 group/geocode API checks and two phone light/dark browser checks passed; build passed. No migration/resources/production changes. Schedule-tabs update remains local too; last hosted10cf494a. Publish both on next explicit Preview approval.


Approved schedule/ZIP-search review build published: https://b7d3bd1d.opencourts.pages.dev, stable feature alias unchanged. My Games/Players HTTP200 with index-Bw5A20Db.js verified. Includes Upcoming/Requests/Past/Cancelled server-filtered pagination and ZIP/city player matching. No migration, production changes or GitHub push. Supersedes local-only schedule/ZIP checkpoints.


November17 location autocomplete LOCAL ONLY: shared LocationAutocomplete now powers Players location search and Account General location. Player-name field separated to keep names out of external location suggestions. Reuses existing Photon/Nominatim client with300ms debounce, aborts, keyboard arrows/Enter/Escape, touch-friendly option rows and theme tokens. Suggest/geocode now supply generalLabel/general_label from city/locality/county + state, never street/house/POI, with cacheversion8. Selected addresses store/search only general label; no profile coordinates saved. Existing manual city/ZIP input remains available. Additional optional name filter is bound server-side.91 geocode/services/groups unit checks and four light/dark ZIP/autocomplete browser checks passed; profile payload assertion proves selected123MainStreet saves onlyFairfaxVirginia. Build passed. No migration/resources/deployment/production changes. Last hostedb7d3bd1d; publish on approval.


Approved location-autocomplete build published: https://3af45daf.opencourts.pages.dev, stable feature alias unchanged. Players/Account HTTP200/index-JralF0cq.js verified;22033 geocode returns general_label Fairfax CountyVirginia. Shared suggestions preserve general city/area on selection; separate name search. No migration/resources/production changes or GitHub push. Supersedes local-only autocomplete checkpoint.


Verification rerun November17 requested by user:257 units,84 complete Chrome browser checks, TypeScript/dev build and26 actual Preview synthetic API checks PASSED. Hosted3af45daf/index-JralF0cq.js verified; synthetic cleanup confirmed zero QA players; production7ef38ff2 unchanged. No deployment or app edits. Real provider Google/Apple and physical Safari/Android/TWA acceptance remain manual. See PLAY_TOGETHER_TEST_RESULTS.md and refreshed release checklist.

Local search-hardening validation: 257 unit tests (17 suites) and development build passed;
10 focused browser checks passed. This follow-up is not deployed in c17ef75c.


### Latest local styling - shared primary actions

User requested matching main-site and Play Together action buttons. Shared action tokens
now drive green/white primary buttons, hover, focus, radius and disabled opacity on both
sides. Court picker, group and member search actions use primary styling consistently.
Secondary actions retain their existing neutral treatment. Device theme remains automatic.
Four cross-site button tests passed: phone/desktop in light/dark, normal/hover/focus/disabled.
No deployment for this styling yet; hosted Preview remains c17ef75c. See button-consistency.spec.ts.


### Latest local design consistency pass - not deployed

User requested consistent controls across main court discovery and Play Together, including
light/dark, selected highlights and title hovers. `public/interactions.css` is the shared
interaction stylesheet, loaded by the React entry HTML and static informational page CSS.

- Primary actions: fixed brand green #123d32 with white labels/icons in both modes;
  hover #205646 and pressed #0d2f26.
- Selected tabs/filters/dock items/court selections: pale green #edf2e8, readable green
  text #264b39, hover #e0e9d7 and shared border. Selection remains distinct from submission.
- Secondary/icon button hover, autocomplete options and keyboard focus now follow the
  shared rules. Neutral unselected surfaces remain theme-aware.
- Group/game/court title links use a green hover cue without introducing underlines;
  inline prose/privacy links retain their existing persistent underline.
- Desktop community navigation now marks the current section instead of highlighting
  Play Together on every community page.

Verification: eight cross-site interaction tests passed on phone/desktop in light/dark,
including static Support. Development build passed. Fourteen audit matrix tests completed:
350 states, zero detected axe violations/page overflow/uncaught JS errors. This does not
replace real-device or screen-reader review. No deployment or production change in this pass;
Preview remains c17ef75c. Local search hardening and this styling await publication.


### Latest local correction - search focus and top navigation

User reported nested dark focus borders on Find games and a persistent filled top-bar
link. Fixed in shared interactions CSS: search wrappers now own one border/glow, their
inner inputs suppress duplicate borders/outlines/shadows, and standalone search/combobox
fields reuse court discovery focus tokens. Dark/light tokens match the main site.
Keyboard focus remains visible; forced-colors mode gets a single system-color outline.
Player-name search now explicitly uses type=search so the shared treatment applies.

Top-bar links retain aria-current semantics but have transparent backgrounds in normal,
hover and current states; hover changes text only. This supersedes the earlier top-nav
filled highlight. Actual selection controls (filters, tabs, mobile dock) retain their
selected states. No authorization or database change.

Regression: tests/search-focus.spec.ts covers nested and standalone search fields,
member search, light/dark, phone/desktop, navigation after clicking and keyboard focus.
Twelve combined focus/button/interaction checks and the development build passed.
LOCAL ONLY; hosted Preview remains 89a8ba19 until requested publication.


### Git preparation review

See GIT_READINESS.md for the concrete include/ignore/optional-cleanup review. Ignore rules
now cover environment variants, signing keys, SQLite files, logs and build caches while
keeping example templates. Initial candidate inventory: 214 changed/untracked files;
current referenced QA evidence retained (8.27 MiB) and test baselines must be committed.
No staging, commit, push, deletion or deployment was performed during this review.
Do not delete local D1 state or credentials as cleanup.


### Latest local correction - dark-mode floating search icon

Screenshot 1383 exposed a CSS specificity conflict: Play Together's dock icon background
used the dark theme text color while the shared glyph stayed white. Increased the shared
icon selector specificity so the circle always uses brand green with a white magnifier.
Regression checks cover selected/unselected navigation and live theme switching; the
375px iPhone SE width shown by the user is explicitly covered as well as 390/1440px.
Eight interaction/focus browser checks plus two iPhone SE checks and development build
passed. Local only; hosted Preview remains 89a8ba19 until publication is requested.


### Direct comparison with the main court page

User requested direct comparison, not just an isolated icon fix. New dock-comparison.spec.ts
compares actual computed styles on the main court page and Play Together in the same local
feature build: 375/390px, light/dark, normal/selected/keyboard-focused states. It records
size, border, offset, typography, label/glyph colors, shadow and focus in qa-evidence JSON.
The remaining mismatch was Play Together's theme-dependent shadow; the shared icon rule
now uses the main court page shadow. Four comparison tests pass with equal fingerprints
in all three states; development build passed. Labels/destinations and number of dock tabs
are intentionally page-specific and are not claimed to be identical. No production change,
no hosted preview publication; current hosted candidate remains 89a8ba19.


### November 18, 2026 - Flat mobile/tablet dock search tab (local)

Latest approved design supersedes the raised search-circle treatment: Search/Find games
is now a standard outline magnifier in the same row as the other dock destinations on
both court discovery and Play Together. Removed featured-circle markup and obsolete
special styling instead of adding another visual override. All dock icons use 21px,
1.9 stroke, no negative offset or circle/shadow, and at least 48px tall tab targets.
Selected-state and keyboard-focus behavior stays consistent with other tabs.

Ten comparison/alignment/theme checks passed (including 375px iPhone SE); fourteen
navigation/mobile checks passed; development build passed. Full-page visual baselines
are refreshed for the approved new row. One concurrent visual run lost its shared dev
server and was restarted independently; that interrupted run is not counted as a pass.
Changes remain local and uncommitted; no deployment, database change or production change.

Latest search-order verification: all 113 browser regression checks passed; approved
full-page baselines refreshed. Development build passed. No publication this milestone.

# Play Together: native iOS implementation blueprint

Verified November 18, 2026; Preview release 31bafac6, database migrations through 0023 on live Preview. Host queue and Waitlisted schedule APIs are published to Preview. This is a handoff for building Swift UI against the shared backend, not a claim that native authentication is implemented. Latest release entries supersede older decisions in the chronological documents.

## Read these first

- PLAY_TOGETHER.md: product decisions and development history.
- PLAY_TOGETHER_HANDOFF.md: current release, environment isolation and next tasks.
- PLAY_TOGETHER_TEST_RESULTS.md: test coverage, evidence and outstanding device checks.
- This file: current shared behavior and native integration gaps.
- functions/db/migrations/: authoritative incremental schema; never run from the iOS app.

## Shared account and source of truth

React/TypeScript/Vite web UI, Cloudflare Pages Functions APIs, D1 records and R2 media are already implemented. Native Swift screens should reuse the same backend/account IDs, not create an independent membership database. Google and Apple are the only identity providers. Explicitly linking a second provider while authenticated associates it with the same player; matching emails/names alone never merges accounts. Provider email is private account information, not public profile data.

Current authentication is browser OAuth plus seven-day HttpOnly cookie sessions, server-hashed tokens, Origin validation and CSRF tokens for writes. Read functions/lib/auth.ts and src/game-api.ts. GET /api/auth/me returns player, csrfToken and provider information; PATCH /api/auth/me updates profile. POST logout/logout-all and DELETE me support account lifecycle with recent-sign-in requirements for sensitive operations.

**Native authentication is not ready:** do not assume URLSession can call these endpoints with a provider token or a copied web cookie. Before native implementation, design/approve a native sign-in exchange, token validation/audience rules, refresh/revocation and Keychain storage; verify Apple App ID/Services ID subject association, native callback handling and explicit provider linking. Do not weaken Origin/CSRF rules to make Swift requests work. Web uses exact stable-origin validation. Authentication transport is the first native milestone.

Preview: https://feature-play-together.opencourts.pages.dev. Never point native development writes at OpenCourts.us or production D1. Preview resources and production resources are separate. Unique numbered deployment URLs are unsuitable for OAuth.

## Native screens and navigation

Use Feed as the signed-in community landing screen; provide Find Games, My Games, Groups and Players, plus Notifications and Account. Preserve a clear Courts destination and a return to Play Together. Match existing OpenCourts colors, typography, interaction hierarchy and system light/dark preference; translate web interactions into accessible Swift controls. No duplicate picker layers. Confirmation actions must stay visible on small screens. Photo framing should preview the final circular avatar.

## Shared product rules

| Area | Current behavior |
| --- | --- |
| Game visibility | Public discovery; unlisted authorized invitation access; group-event visibility follows current parent group: public events visible to everyone, private events restricted to approved members. |
| Group discovery | Both public/private groups have limited discoverable previews. Private-group events require approved membership. Public-group events appear in the All feed and discovery for nonmembers; member lists and other members-only content stay restricted in both group types. No hidden groups. |
| Roles | One permanent primary Owner, at most one active Co-owner and one Organizer. Only Owner assigns roles; others are Members. Co-owner manages group; Organizer creates/manages own games. Legacy Admin compatibility remains in existing records. |
| Role loss | Upcoming games of a departing/demoted Organizer transfer to primary Owner through server lifecycle rules. |
| Joining | Approved group members join directly when space is available. Nonmembers request host approval for public-group events; public/unlisted standalone games also require approval. Event approval never creates group membership. Host already occupies one place and cannot self-invite/join. |
| Capacity | Singles/doubles is per-court format; 1-16 courts planned, total attendance up to 128. Defaults 2 or 4 players per court; extra rotation allowed. Includes host and approved guests. Never a court reservation. |
| Guests | Confirmed participant requests up to three guest places; host approval required. Guests count toward attendance but gain no group membership/private access. |
| Cancellation | Players withdraw requests or leave confirmed games, optionally giving host a private reason; places/guests released and host notified. Host cancels the game. |
| Invitations | Ten distinct player invitees per game, no reserved capacity; self, blocked and unavailable accounts excluded. Direct unlisted access is recipient-specific, revocable and expires within seven days or at start. Shared links are not addressed to a named recipient and can be forwarded. |
| Weekly series | 2-12 weekly occurrences, including first, same local weekday/time, every date within 180 days. DST validation server-side. Each occurrence has independent invitations, attendance, guests, waitlist, edits/cancellation. No auto-enrollment. Series management supports single/future schedule edits and cancellations, published in 31bafac6/schema0023. |
| Waitlist | Group games only; signup order with deterministic tie-breaker. One-player offers reserve capacity for two hours or until start. Accept or leave. Expired offers advance on game/inbox refresh; no scheduled worker. Guests still need separate approval. |
| Notifications | In-app polling only; no push/email delivery. Recheck authorization before showing private content. |
| Player search | Opt-in discovery; city/name and ZIP-to-general-area matching. Not precise-distance matching; results are paginated/capped and exclude blocked/ineligible people. |
| Media | Profile photo currently account-private; group cover explicitly public even for private groups. Server resizes/processes images; do not infer public avatar access. |
| Pricing | First release free. No payments/subscription entitlement enforcement implemented. Future iOS purchases use Apple systems, with server-verified shared entitlements and restoration designed later. |

Never reproduce these authorization rules solely in Swift. Server responses and permissions are authoritative. Clear cached private content on logout, membership removal or access-denied responses.

## API map: existing web contracts

All paths below start with /api/. Consult implementation/types and tests for full payload fields, pagination, error codes and permissions; this is an endpoint map, not a versioned OpenAPI contract.

| Capability | Endpoints/source |
| --- | --- |
| Auth/profile | auth/me; auth/google/start and callback; auth/apple/start and callback; auth/logout, auth/logout-all. functions/lib/auth.ts |
| Games | GET/POST games; GET games/:id; GET games/feed; GET games/mine. functions/lib/games.ts, my-games.ts; src/game-api.ts |
| Court selection | GET games/courts; signed court selection token or validated manualCourt snapshot on game creation. functions/lib/games.ts |
| Attendance | GET games/:id/participation; POST join, leave; host approve/reject/remove/edit/cancel; GET participants/requests/cancellations. functions/lib/game-participation.ts |
| Guests | GET games/:id/guests; POST request-guests/cancel-guests/approve-guests/reject-guests. functions/lib/game-guests.ts |
| Waitlist | POST games/:id/join-waitlist, leave-waitlist, accept-waitlist. GET participation returns own waitlist status/position/expiry and availablePlaces. GET games/mine?view=waitlisted returns own eligible waiting/offered games (up to 100) with waitlistStatus, position and offerExpiresAt. GET games/:id/waitlist is host/authorized-manager-only and returns up to 200 queue entries with displayName, status and expiresAt. functions/lib/game-waitlist.ts |
| Notifications | GET games/notifications; POST games/notifications/read. Prefixes distinguish game/group/guest/player-invite/waitlist entries. functions/lib/game-participation.ts |
| Player invites | GET players/game-invitees?gameId=...&q=...; POST players/invite-game with gameId/playerId. Player-search picker uses GET players/invitable-games?playerId=... |
| Unlisted access | games/:id/share-links, revoke-link; games/invitation-accept. functions/lib/game-sharing.ts |
| Groups | GET/POST groups; GET groups/mine, groups/:id, members/requests; request/approve/reject/remove/role/leave/edit/archive actions. functions/lib/groups.ts |
| Group invitations | groups/:id/invitations, revoke-invitation; groups/invitation-preview, invitation-accept. functions/lib/group-invitations.ts |
| Discovery/safety | players search/blocks/block/unblock/report and authorized report review. functions/lib/players.ts |
| Images | Review functions/lib/media.ts and src/PhotoUpload.tsx for upload/replace/remove and access rules before designing a Swift uploader. |

### Game creation additions

`courtCount` is planned court count; `capacity` is total attendance; optional `repeatWeeks` is 1-12 (default 1). Include an idempotency `requestId`, format, selected location token or manualCourt, future local date/time, IANA timeZone, durationMinutes, skillPreference, notes and required acknowledgements. Group creation requires authorized groupId. Single-game requests without new fields remain compatible.

Response game includes courtCount, total capacity, and nullable seriesId/seriesWeek/seriesWeeks. Times in game responses are ISO timestamps; waitlist/notification dates use epoch milliseconds. Swift decoding must distinguish them. First occurrence ID identifies a weekly series; each occurrence still has a separate game ID. Show the individual date in invitation and attendance UI.

## Persistence and integrity

Player/auth identity/session tables hold platform-independent account identity. Group memberships and assigned roles are authoritative in D1. Games, participants, join requests, guest requests, invitation links/access and player invitations are separate records. Migration 0019 preserves legacy per-match capacity internally; APIs expose effective total attendance. Migration 0020 adds series fields. Migration 0021 adds waitlist and reservation triggers. Do not infer effective capacity from the legacy games.capacity column in a native client.

Capacity and guest/offer reservations are enforced transactionally in D1. Pending approval/invitations do not reserve places; active waitlist offers do. A full/expired response must update UI rather than silently claiming success. Retries must reuse requestId for game creation; do not retry non-idempotent operations without checking current state.

## Native development checklist and remaining gaps

1. Approve and implement native authentication transport, provider configuration and identity association first.
2. Produce a versioned API contract/Swift Codable models from current handlers and regression fixtures; no generated Swift client/OpenAPI specification exists yet.
3. Build account/profile, feed/discovery and navigation using isolated Preview APIs.
4. Add game creation, weekly occurrences, attendance/guests, groups/roles, invitations and waitlist with the same server rules.
5. Test two-account flows, access removal, blocked players, capacity races, DST, expired invitations/offers, network retries and empty/error states on real devices.
6. Add universal/deep links with authorization revalidation. Associated domains and native routing are not implemented by the web work.
7. Push delivery, background waitlist advancement and paid entitlements need separate implementation. Do not advertise them as available.

Account-deletion copy now correctly requires archiving owned groups; ownership transfer is disabled. Legacy Admin cleanup and pre-existing duplicate role audit remain separate operational checks.

Keep this blueprint updated whenever shared behavior changes, alongside the handoff and test results. Current code/tests override stale chronological entries; changes in approved product rules should be reconciled explicitly, not guessed by an iOS implementer.

## Time entry follow-up (published in 03fdacfb)

Web calendar now uses explicit hour/minute fields and AM/PM buttons instead of nested time dropdowns, after a physical-device selection report. Parent form stores 24-hour local HH:mm after Apply. Preserve equivalent persistence in Swift; submit startLocal plus IANA timeZone and rely on backend future/DST validation. Native UI may use a standard Swift date/time picker; the web widget is not an API requirement.

## Latest approved group visibility decision (published in 03fdacfb, November 18)

Group picker labels are Public and Private. Public-group events are publicly viewable, including anonymous discovery/details/All feed. My Groups filter still means actual memberships. Private-group events require current approved membership across feed/search/details/notifications. Other group content and member lists remain restricted in either case. Group event API retains visibility="group" and adds groupVisibility="public" or "private"; do not equate group kind with private access. Participation returns isGroupMember and viewer-specific joinPolicy: instant for approved members, approval for outsiders to public events. Waitlists remain approved-member-only. Public-group hosts can invite outsiders under existing per-event invitation limits.

Migration 0022 updates database participation guard to permit a nonmember only through host approval of a pending public-group event request. Changing Public to Private removes outsider requests and future attendance; API visibility checks immediately hide event content. Shared public group URLs must not bypass later privacy changes. These changes are published on Preview after approved development migration 0022. No native authentication change.

## Series management blueprint (published in 31bafac6, schema 0023)

GET /api/games/:id/series returns authorized occurrences (dates, status, version, individual exception, confirmed places/capacity). Single games use the same schedule screen. POST .../series/preview takes operation=reschedule|cancel, scope=single|future, preserveExceptions boolean and startLocal for rescheduling. Response lists affected oldStart/newStart in epoch milliseconds, skipped dates/reasons and planHash. POST .../series/apply sends the same input plus planHash and a fresh requestId UUID, reused for network retries. Every save rebuilds the plan, checks versions/permissions and applies all targets transactionally. A 409 requires a fresh preview, not an automatic overwrite. Native screens must present the affected dates before applying.

Future rescheduling applies the selected local calendar-day shift and wall time to future series weeks, using each occurrence's existing IANA zone/duration; DST/future/180-day validation applies to every target. Single-date edits set series_exception; future edits preserve exceptions by default except the explicitly selected anchor. Past/started/cancelled dates remain unchanged. Cancellation should set preserveExceptions=false for Cancel remaining series. Records/player IDs/invitations/requests/waitlists are not recreated. Active offer deadlines can shorten to an earlier new start but are never extended by rescheduling.

Schema 0023 adds series_exception, transactional change/target audit records and schedule-change notifications. POST apply uses server-validated cookie/CSRF transport currently; no native token endpoint exists. New notification kind schedule_changed includes oldStart, newStart and timeZone; read IDs use schedule: prefix. Cancellation notifies existing participants/pending requests and affected invited/waitlisted players. Current access restrictions still apply to notification responses. No push/email guarantee.

## Future email notification milestone - deferred November 18

Email notifications are roadmap-only and require separate implementation approval. The future shared backend should deliver the same notification categories across web, Android and iOS, with server-managed recipient preferences and authorized deep links. Swift should not send transactional emails or maintain a separate delivery queue. Existing in-app notifications remain available; email and native push are not implemented by this milestone. See the future email milestone in PLAY_TOGETHER.md for scope, privacy, tester isolation and rollout requirements.

## November 19 - Read-only group game rosters (local)

Approved group members can view confirmed players (including guest counts), the group-game waitlist and player cancellations. GET games/:id/participants, /waitlist and /cancellations allow current approved members as well as authorized managers. Member cancellation responses expose displayName/cancelledAt only, never private cancellation reasons. Pending join requests and all management writes remain restricted to authorized organizers/managers. Public-group nonmembers do not gain roster access; removed private-group members receive 404. No schema changes.

UI includes compact read-only lists for members, with no remove/approve/edit controls. Validation: all 35 group backend tests passed, including private-reason exclusion, forbidden management and revoked membership. Development build passed. Not published to Preview yet; physical-device visual review remains pending.


## November 19 - Current cancellations reflect rejoining and guest withdrawals (local)

Cancellation roster excludes players currently confirmed again; historical game_cancellations records remain stored. Guest cancellation notifications supply separately labelled sponsor name/guest-count/time rows; latest cancellation per sponsor is shown, hidden while a replacement guest request is pending or approved. Guest-only cancellation does not label the sponsor cancelled. Member responses omit private reasons; existing organizer-only reason access unchanged. No schema changes. All 36 group tests and development build passed. Not deployed; includes pending guest touch-button work for next Preview. Native clients should use optional kind (player/guests) and guestCount in cancellation rows, defaulting older responses to player.


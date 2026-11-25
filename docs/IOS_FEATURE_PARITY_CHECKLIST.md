# Website to native iOS feature checklist

## Backend content safety — November 24, 2026

- [x] Local backend gate: individual game, series, and group chat submissions are screened before persistence/push creation; duplicate successful client IDs skip repeat screening.
- [x] Local backend gate: group discussion post creation, comments and edits are screened before writes and their database notification triggers.
- [x] Existing report, block and moderator queue paths are preserved. Friendly rejection and retryable unavailable responses are returned to the current iOS client.
- [x] Local D1 quota accounting and cleanup added in migration `0041_content_moderation.sql`; provider requests/reservations are concurrency-safe within the application database.
- [x] Focused automated tests pass for tennis conversation, disguised profanity, AI-rejected messages not saved/not pushed, fallback, both providers failing, concurrent daily-budget cap, and group discussion posts/comments/edits.
- [ ] Deployment gate: selectively apply migration 0041; add `OPENAI_API_KEY` as a Cloudflare Pages secret; bind Workers AI as `AI`; verify provider access, configured limits, and account-wide AI spending protection. No remote config, migration, or deployment has been performed.
- [ ] Privacy/App Review gate: update/review privacy disclosures for moderation provider processing and audit remaining freeform UGC (profiles, game descriptions/notes, group descriptions) before claiming complete Guideline 1.2 coverage.
- [ ] Live acceptance: run provider failure/rate-limit/budget scenarios in isolated Preview with approved test accounts, verify no message/push on reject, and confirm appeal/report/block/dashboard behavior.

Backend-only moderation does not by itself require a new App Store Connect binary upload. A binary is needed only if client UI, privacy manifest, or other iOS code changes are made. Production deployment remains separately gated on owner approval.

## Current continuation — November 23, 2026

**Capacity and guest rules (owner clarification):** increasing capacity on a standalone public or unlisted game never approves pending join requests; each remains pending until host approval. If capacity is reduced below attendance, latest confirmed joiners move to pending host approval and are notified. For group games, reducing capacity moves latest joiners to the back of the waitlist; if a place opens, earlier existing waitlist requests get it first. Increasing group-game capacity confirms eligible active-member waitlist entries in original request-time order; legacy pending game-join requests are not auto-confirmed. Displaced group members receive an update when waitlisted and another if later confirmed. Reserved offers are protected. For group games, only group Owners, Co-owners and Organizers can add their own guests without approval when places are available; any of those roles can approve/reject other members’ guest requests. For standalone games, only the host can directly add guests or decide guest requests. Full capacity adds no guests and leaves approval requests pending. Guest-decision permission does not grant broader game management. Help/Terms/Privacy now document the distinctions and pending-capacity behavior. Role-scoped API is on feature Preview deployment f6939c04; production is unchanged. Native badge/alerts build locally; physical-device alert/focus acceptance remains open.

The owner reports that item 1 on the App Store readiness list—court discovery and game creation—works and has been tested. This records owner-reported acceptance of the primary flow, without claiming an independent reproduction or coverage of every edge case. The detailed G01–G04 permission, DST, retry, and account/archive-race gates remain individually tracked below until their scope is confirmed.

**Next development focus: Batch 4, game participation and management.** Use two accounts to verify join/request, withdraw/leave, host approve/reject, participant removal, attendance/capacity, and edit outcomes. Continue with guest handling, waitlist/place offers, invitations, and recurring-game lifecycle. Keep all remaining notification-specific acceptance for the final pass, as requested by the owner.

Court implementation context: international country routing, preferred-country address suggestions, facility grouping with aggregate court counts, three-day court caching (weather remains uncached), and current signed-selection-proof refresh are implemented. `/api/games/courts` reads the D1 catalog when populated, otherwise edge-cached court/Overpass data, then performs bounded context enrichment before grouping/signing. Earlier build/TypeScript verification is recorded in the worklist; the owner's latest message confirms item 1 works.

## Stability priority — November 22, 2026

Owner paused feature work after Edit Game returned to the main map and other actions opened unexpected screens. Simulator baseline reproduced Play Together → My Games → Saturday game → Edit game: editor flashed, then Map appeared; process stayed running. Treat as navigation/presentation failure, not a crash. Targeted changes retain NavigationLink source rows and presenting game/group state when covered by child screens; in-flight work is invalidated, while account changes and scene privacy clearing remain. My Games/My Groups retain explicit account-change clearing. The first lifecycle-only build still reproduced the collapse. Presentation ownership was then moved from transient AppHeader toolbar content to stable ContentView; toolbar buttons now use bindings. That build passed but both Edit and Invite still collapsed to Map in a freshly built simulator binary. Host dialogs were then consolidated into a single NativeGameHostAction item sheet on the parent game-detail List, capturing game/version independently of participation reloads. Edit stayed open and Cancel returned to the correct game in the simulator after this move. Owner then confirmed cancel/other game-detail actions shared the failure. All participation confirmation dialogs and the leave-place sheet were also moved to the parent List; the leave form now owns its draft/busy/error state, with existing guarded mutation callbacks. Account/scene changes clear parent presentations. Owner also requested predictable dialog placement. Destructive confirmations now use centered system alerts with action-specific labels; game tools/leave use explicit large sheets. Build passed (19:18:37). Simulator acceptance passed: Edit/Cancel, Invite/Done, Schedule/Done, centered Cancel Game alert/safe Cancel, Stop Playing/Keep my place, Courts→Map→reopen Play Together, and Account. No saves, invites, destructive confirmations or other server mutations were performed. Physical-device retest, actual edit/decision outcomes, scrolling refresh continuity, other routes and accessibility remain open. Do not mark the wider stability audit complete.

Owner separately confirmed **game request notifications work on the real iPhone**. Group request receipt/tap had already been confirmed. This confirms delivery only; remaining navigation, request decision and lifecycle acceptance stays open.


## Current group-game policy — November 21, 2026

User clarification supersedes historical public-group event exceptions (including migration 0022 and the November 18 public-event rollout notes): **all group games are members-only, in both public and private groups**. Public visibility exposes the limited group preview, never its games. A player requests group membership first; an active Owner, Co-owner or Organizer approves the request; only then can that approved active member view/join group games, subject to capacity and existing lifecycle rules. Pending, rejected, removed and signed-out players have no group-game access. Game-host approval, invitations and shared URLs cannot substitute for membership approval. Standalone public/unlisted games retain their separate host-approval rules. Organizers approve/reject membership requests but do not gain group metadata, role-assignment, archive or other managers' game powers. Legacy Admin compatibility remains existing behavior.

Local implementation: membership checks in details, discovery/feed, participation, chat, invitations, inbox and push delivery; migration `0036_members_only_group_games.sql` restores the database participant guard and includes Organizers in membership-request notifications. This migration and server changes have **not been applied remotely**. Previously deployed behavior remains until an approved server rollout. Review existing outsider attendance/requests for a separate explicit migration decision before rollout; this migration does not silently delete historic attendance. Native group membership approval UI is now implemented locally with a timestamp conflict guard (latest continuation); matching Preview backend rollout and enabled decision acceptance remain pending. Native request/leave and approved-member game navigation exist.

Updated November 21, 2026. Implementation tracker for the **existing** SwiftUI app.
This checklist is based on current website routes, components, API handlers and the
six Play Together documents listed below. New verified releases override historical
Preview-only, pending and superseded product entries. No item is release-approved.

Statuses: **Existing** = found in original Swift source, needs regression acceptance;
**Local** = new Swift source implemented, needs Xcode/simulator/device acceptance;
**Partial** = only some of the feature exists; **Pending** = not implemented.
The checkbox tracks implementation only. Testing is tracked separately; unchecked
items must not be described as working native functionality.

## App Store release gate — November 24, 2026

**Not ready to submit.** Current local Xcode BuildProject succeeds, but a signed
Release archive has not been validated with an App Store distribution profile.
`PrivacyInfo.xcprivacy` now declares name, email, coarse and precise location, messages,
photos/videos, user ID, device ID and other user content. Audit those entries
against actual collection, linked use, retention/sharing and App Store Connect
privacy answers; the manifest alone does not complete the privacy disclosure.
Production native-auth/APNs gates and Production deployment remain disabled or
unverified. Complete production service readiness, distribution signing,
privacy review, export-compliance/store metadata, final Release screenshots and
TestFlight acceptance before submission. Preview deployment and an ordinary
development build are not App Store release acceptance.

November 24 Release review: added the missing foreground location purpose string
and declared precise location because GPS coordinates are sent to discovery
services. A Release-only compile error caused by an unconditional reference to
the Debug-only screenshot helper was fixed by retaining mock sanitization only
under `#if DEBUG`. The code-signing-disabled Release simulator build and generic
iOS unsigned archive pass; the archive's privacy manifest and location string
were inspected, and the executable contains no screenshot fixture marker or
launch argument. Xcode BuildProject, plist lint and `git diff --check` pass. The
tree still has staged and unstaged work, and no signed distribution archive,
production rollout or TestFlight acceptance exists.

November 24 latest: confirmed-player chat access after capacity demotion is on
isolated Preview deployment `9784ab6d`; migration `0040_capacity_chat_access.sql`
is applied to development D1 only. Production remains unchanged. Repeat the
demotion/chat-access/removal flow with two accounts before closing the acceptance
gate. Xcode build passes; source warnings for locale API and actor isolation were
fixed. The generic recommended-settings warning remains for explicit review.

### Inbox screenshot mockups — November 24, 2026

- [x] Produced iPhone 18 Pro and iPad Pro 13-inch (M5) simulator Inbox mockups using `--app-store-screenshots` and local sample game/group data.
- [x] Temporary Inbox-only fixture, signed-out entry and footer suppression used for those captures were removed from source; a build passed after cleanup.
- [x] Release compile confirmed screenshot fixtures and response sanitization are Debug-only; Release uses live response bytes. A location purpose string is present and precise location is declared because GPS coordinates go to discovery APIs.
- [ ] Take final store captures from the reviewed, signed Release candidate; the preserved drafts contain sample data and must not be submitted as final captures.

Draft copies are in `ios-app/AppStoreScreenshots/Drafts/` (sample content; not submission assets). The captures do not validate live Inbox service availability. Follow-up diagnosis reproduced the error on a normal signed-in Preview run and identified malformed chat-unread SQL with one extra closing parenthesis; see “Inbox 503 root cause and Preview fix” in the iOS handover. The fix is deployed to code-only Preview deployment `6b0d828a`; Wrangler logs show authenticated `GET /api/games/notifications` returning `Ok`, and a normal-launch iPhone 18 Pro check displayed all 4 unread notifications without an error. Production was not changed. Evidence remains in Xcode ActionArtifacts.

## 1. Preserve court discovery, maps and weather

Source: `src/App.tsx`, `services.ts`, `CourtDetailSheet.tsx`, `WeatherOverview.tsx`,
`sun.ts`, `international-rain.ts`; native `ContentView`, `OpenCourtsStore`, `OpenCourtsAPI`.

- [x] C01 Existing: phone and expanded layouts, original palette/fonts/surfaces/navigation.
- [x] C02 Existing: selected city/area/ZIP search and location suggestions.
- [x] C03 Existing: GPS location permission, denied-location recovery and Settings.
- [x] C04 Existing: map/list court exploration, selection and court detail presentation.
- [x] C05 Existing: lighting/distance filters and nearest/lighted sorting.
- [x] C06 Existing: court amenities/access/surface/count/context/address/source details.
- [x] C07 Existing: Apple Maps directions and original external court actions.
- [x] C08 Existing: US weather, severe alerts and weather advisory presentation.
- [x] C09 Existing: US radar rainfall, dry-court scores/confidence and recommendations.
- [x] C10 Existing: forecast outlook, heat/winter caution and play-window presentation.
- [ ] C11 Local: explicit-country and GPS country routing now matches the website for
  Courts and Create Game; Create Game bypasses US-only catalog/context paths abroad.
  Build and Preview/device verification are pending.
- [x] C12 Existing: international weather attribution/time zones and forecast rain estimates.
- [x] C13 Existing: international stale-cache labeling and independent loading branches.
- [ ] C14 Partial: compare website solar/daylight planner with native play-window logic;
  reconcile differences without changing US behavior accidentally.
- [ ] C15 Pending: parity audit of website court-context refresh, data freshness, partial
  forecast/provider failures and exact search/filter choices against native behavior.
- [x] C16 Existing: value-use review prompting; preserve existing app/store identity.

## 2. Public community navigation and discovery

Source: `PlayTogether.tsx`, `PersonalFeed.tsx`, `Groups.tsx`, `GameDetails.tsx`,
`functions/lib/games.ts`, `groups.ts`, `src/main.tsx`.

- [x] D01 Local: Play Together entry in existing native header; return to original courts.
- [x] D02 Local: public upcoming game list and authorized detail refresh.
- [x] D03 Local: game location/all-locations search and existing selected-court location shortcut.
- [x] D04 Local: 5/10/25/50-mile distance, date, singles/doubles and skill filters/reset.
- [x] D05 Local: paginated results, deduplication, loading/empty/error/retry/refresh states.
- [x] D06 Local: ISO game times rendered in game's IANA zone; attendance/guests/capacity copy.
- [x] D07 Local: public/private group discovery previews, search and cursor pagination.
- [x] D08 Local: group preview details; member content stays inaccessible anonymously.
- [x] D09 Local: public All feed and protected approved-member group event feed with current access checks.
- [x] D10 Local: native share of public game/group URLs and court map/directions actions.
- [x] D11 Local: signed-in Feed includes the Your Groups rail and All / My Groups / My Games filters. The rail matches the website by showing active memberships in active groups only. iPhone 18 Pro simulator acceptance passed for rail visibility, all three filter selections, opening Reston Tennis group details and returning to Feed. Owner confirms Feed works on their phone. Membership-revocation acceptance remains open.
- [ ] D12 Pending: native destination navigation for all authenticated sections.

## 3. Native authentication and shared identity — next dependency

Source: `functions/lib/auth.ts`, `PlayerAccount.tsx`, `ProfileWelcome.tsx`.
A development-only native backend exchange is now prepared locally. It is disabled by default and forbidden on production. Web cookies are not native credentials.

- [x] A01 Local: secure browser/native authorization bridge with PKCE, one-use exchange,
  callback state/nonce checks and explicitly allowed callback destination.
- [ ] A02 Partial (browser bridge implemented; real-provider check pending): Google sign-in to existing issuer/subject identity and account ID.
- [ ] A03 Partial (existing web Apple identity via browser; device verification pending): Apple sign-in, verified audiences and native/web Apple subject association.
- [ ] A04 Partial (Keychain, expiry and sign-out implemented; reauthenticate at expiry, no refresh token): Keychain credentials, session expiry, renewal/revocation and account switching.
- [x] A05 Local: adult 18+ eligibility and current consent before account creation.
- [ ] A06 Partial: Account screen offers native Google/Apple linking; matching server route and migration `0038_native_provider_linking.sql` are deployed to isolated Preview (`feature-play-together`). Server binds the signed-in player and challenge to the same recent, CSRF-authenticated iOS session; rejects identities or providers owned elsewhere and never matches by email/name. Isolated two-account and conflict/session acceptance remains pending. Production unchanged.
- [x] A07 Local: preserve browser Origin/CSRF rules and native transport boundary.
- [x] A08 Local: logout and logout-all with private-state/notification ownership cleanup.
- [ ] A09 Partial (deletion/recent-auth error handling): recent-authentication recovery for linking/deletion and other sensitive actions; verify successful reauthentication and expiry handling on-device.
- [x] A10 Local: authenticated API isolation in development; no production development writes.
- [ ] A11 Partial local: optional Face ID/Touch ID session lock, system device-passcode fallback, explicit opt-in, and app lock on background/return implemented; Xcode build passes. Physical-device enrollment, enable/disable, relaunch/resume, cancellation/recovery, privacy of nested presentations, and accessibility acceptance remain open. Biometrics unlock the local saved session; Apple or Google remains the account identity provider.

## 4. Account, profile and optional photos

Source: `PlayerAccount`, `ProfileWelcome`, `PhotoUpload`, `AvatarCrop`, `PhotoVisibility`,
`PlayerAvatar`; `functions/lib/auth.ts`, `media.ts`.

- [x] P01 Local: profile welcome/edit display name, bio, general location and skill preference.
- [x] P02 Local: opt-in player discovery, private provider email and account status handling.
- [ ] P03 Partial local: native picker/crop sliders/reset/discard verified on current simulator build; 512px export fixtures pass. Save/replace/remove and uncertain-response recovery implemented; isolated mutation acceptance pending.
- [ ] P04 Partial local: single sharing choice uses current server settings/default-private contract; live acceptance pending.
- [ ] P05 Partial local: sharing requires confirmed saved photo; removal uses existing atomic server contract. Isolated acceptance pending.
- [ ] P06 Partial local: authorized owner-photo headers in Courts/Play Together, initials fallback and account/scene/revision invalidation implemented. Shared discovery/game-roster/group-directory avatars now implemented with server authorization and game context; live revocation/UI acceptance pending.
- [ ] P07 Partial local (provider list and logout/all sessions implemented; linking UI and authenticated server flow added): verify linked-provider display, conflict handling, session expiry and recent authentication after Preview migration rollout.
- [x] P08 Local: account deletion confirmation, recent auth, owned-group archival requirement
  and server lifecycle cleanup. No disabled ownership-transfer feature.
- [ ] P09 Partial (privacy/terms/help links implemented; photo/account policy presentation pending): current privacy, terms, Help & safety and support access from account.

## 5. Players and direct invitations

Source: `Players`, `InvitePlayer`, `PlayerSafetyActions`, `GamePlayerInvites`;
`players.ts`, `player-game-invitations.ts`, `player-search-location.ts`.

- [x] L01 Local: opt-in Players directory, name/city/ZIP-general-area search and pagination.
- [ ] L02 Partial (text details, three-dot menu and authorized discovery avatars implemented; populated UI/privacy acceptance pending): avatar/name/location/bio/skill presentation, compact wrapping and accessible menus.
- [ ] L03 Partial local: Players picker and host public/unlisted/group game-detail invitee search/count/duplicate/limit UI implemented. Group search and sending require current approved membership for host/recipient; eight native-bearer regressions pass. Preview backend rollout and host touch/two-account acceptance pending.
- [x] L04 Local: server-authorized eligible games/invitees, duplicate/limit/full/blocked handling.
- [ ] L05 Partial local: My Games invitation inbox with unread/current status, individual read marking and navigation to existing server-authorized request/approval flow; no place reserved. Empty inbox simulator route passes; populated/two-account/device acceptance pending.
- [x] L06 Local: Block/Report under three-dot menu; unblock/manage blocked list.

## 6. Personal feed and My Games

Source: `PersonalFeed`, `MyGames`, `my-games.ts`, `games.ts`.

- [ ] M01 Partial local: signed-in All / My Groups / My Games feed filters use the server's matching filter values; the Your Groups rail shows active memberships in active groups only. iPhone 18 Pro simulator acceptance confirmed each selection, Saturday game results for All and My Games, the empty upcoming-games state for My Groups, and group/back navigation. Owner confirms Feed works on their phone; revoked-membership acceptance remains open.
- [x] M02 Local: My Games Upcoming, Requests, Waitlisted, Past and Cancelled views.
- [ ] M03 Partial (basic status labels implemented; full status mapping pending): organizing/going/pending/rejected/removed/withdrawn/left/expired status labels.
- [x] M04 Local: correct pagination, refresh/resume and empty/error recovery for each view.
- [x] M05 Local: waitlist position/offered deadline, accept place and leave queue actions.

## 7. Game creation, participation and management

Source: `CreateGame`, `GameDetails`, `GameParticipation`, `GameGuests`, `GameSettings`,
`HostWaitlist`, `GameSharing`; current `game-*` backend handlers.

- [ ] G01 Partial local: native court search/picker uses server-signed selection tokens; stale search and account-change results are invalidated. Live authenticated court lookup, full-row selection, selected trait/checkmark and query invalidation passed simulator checks. Actual creation and eligible-access change acceptance remain open.
- [ ] G02 Partial local: native address geocoding, manual court name/address limits and access acknowledgement; no catalog insertion. Authenticated create/location acceptance remains open.
- [ ] G03 Partial local: title, public/unlisted visibility, court-zone date/time, every 15-minute duration from 30–240 minutes, format, court count, capacity, skill, notes and acknowledgements. Native group visibility/selection now uses active server-returned Owner/Co-owner/Organizer memberships and pre-submit refresh; final authorization remains in the games handler. End-to-end create, access-revocation and race acceptance remain open.
- [ ] G04 Partial local: exact request body/UUID retained across ambiguous retries, original-player retry guard, progress and uncertain-dismissal warning; server validation errors allow correction. Retry/DST/session/race acceptance remains open.
- [ ] G05 Pending: join/request, pending state, withdraw/leave with optional private host reason.
- [ ] G06 Partial: approved group members join directly; all outsiders must obtain group membership approval first. Local API regression coverage added; remote rollout/device acceptance pending.
- [ ] G07 Pending: participants, host requests/review/approve/reject/remove and cancellations.
- [ ] G08 Pending: host attendance independent of game continuation; current privileged controls.
- [ ] G09 Partial: native 1–3 guest request/withdraw/cancel and server-projected direct additions. Group Owner/Co-owner/Organizer can see and decide group guest requests; only the standalone game host can decide standalone requests. Authorized managers see a pending count. Capacity errors now have dedicated alerts that preserve the pending request and screen position. Xcode build passes; install/current-device alert and two-account role acceptance pending. Feature Preview role API is deployed; production unchanged.
- [ ] G10 Partial: native title/notes/format/court-count/capacity editor with server preview, capacity-demotion review, reserved offers and guest totals, version conflicts and ambiguous-save refresh. Standalone requests remain host-approved; group capacity fill is automatic for eligible FIFO waitlist members. Website uses the same server routes and previews affected players. Capacity-demotion backend published to Preview `6b9814ed` (stable feature alias); retry the four-to-two-place reduction on device and confirm the newest non-host party enters the waitlist before marking acceptance complete.
- [ ] G11 Partial local: approved-member waitlist join/confirmed leave, FIFO position, read-only member queue, offer deadlines/acceptance and expired-offer refresh; server capacity/eligibility authoritative. Capacity reduction demotions and confirmation notices are covered in backend regressions; touch/visual and two-account device acceptance pending.
- [ ] G12 Pending: host queue, offer acceptance/reserved-place errors and authoritative refresh.
- [ ] G13 Partial local: game tools/leave sheet and action-specific centered destructive alerts now presented from the stable game-detail List; current-authority mutation guards retained. Simulator passes Edit/Cancel, Invite/Done, Schedule/Done, centered cancellation alert/safe Cancel and Stop Playing/Keep my place. Physical touch, actual decisions/races and accessibility acceptance open.
- [ ] G14 Partial local: native unlisted link creation/system sharing, recipient-specific versus forwardable grants, expiry/revoke list/confirmation and signed-in pasted-link redemption with environment validation/server access revalidation. Public/group web addresses share through ShareLink. Universal/deep links/sign-in return and host/two-account/device acceptance pending.
- [ ] G15 Partial local: host public/unlisted/group eligible-player search, ten-invitation count/limit/duplicate states, mutation refresh and ambiguous-error guidance. Group picker excludes outsiders and non-active memberships; native-bearer access/race checks pass for both group visibilities. Preview backend rollout and touch/two-account/device acceptance pending.

November 21 group invitation continuation: local game-invitees endpoint and native host sheet now support both group visibilities with approved active membership for host/recipient; no outsider access or new manager invitation powers. Xcode build, 515/515 backend checks, backend TypeScript and whitespace checks pass. Eight added native-bearer cases cover member eligibility, membership/block/archive/account-state changes, capacity and revoked inbox/detail/join access. Simulator inbox regression passes; no hosted group game was available for picker acceptance. No remote writes/deployment. See the latest handover/worklist entry; next development is native membership-request management.

## 8. Groups, My Groups and permissions

Source: `Groups`, `GroupDetails`, `GroupFieldsForm`, `GroupInvitations`, `GroupInvitation`;
`groups.ts`, `group-invitations.ts`, `group-game-access.ts`.

- [x] R01 Local: My Groups active/pending membership, role and archived state. Group detail hierarchy is compacted into a group-title summary and role-gated member-tools card; visual/touch/dynamic-type acceptance for this layout remains pending.
- [ ] R02 Partial local: native Create Group and authorized Edit Group include name/public/member descriptions, general location, skill and public/private visibility; exact-body creation retries, versioned edit conflicts, visibility confirmation and account/scene/discard guards. Xcode build, 533 backend checks and Swift draft/payload/role fixtures pass. Read-only simulator create/private-public selection/discard and loaded unchanged owner edit pass; no live writes. Actual isolated Preview saves/retries/conflicts, two-account privacy and device/accessibility acceptance pending.
- [ ] R03 Partial local: public cover rendering and Owner/Co-owner PhotosPicker, bounded image validation/unsaved preview, explicit public publish/replacement confirmation and confirmed removal. Build, 588 backend checks and native image/role fixtures pass; simulator local selection/preview/publish-cancel/discard/dock clearance pass without writes. Actual isolated saved-cover upload/refresh/replace/remove, role/account/race, WebP/HEIC conversion and dark/device/accessibility acceptance remain open.
- [x] R04 Local: membership request/cancel/leave and owner-archive restrictions.
- [ ] R05 Partial local: native membership request review plus approved-member directory, name search/50-row cursor pagination and confirmed authorized removal implemented. Actor/query/scene/access guards clear private results. Xcode build, 546 backend checks and Swift permission/cursor fixtures pass; read-only simulator directory/search/query invalidation/empty refresh and removal confirmation dismissal pass. Matching request-timestamp rollout, enabled decision/removal, two-account pagination/revocation and device/accessibility acceptance remain pending.
- [ ] R06 Partial local: Owner-only native role review/confirmed Member, Organizer or Co-owner assignment; permanent Owner/self protection, explicit legacy Admin conversion, fresh authority/target checks and server-enforced single-role slots. Build, 556 backend checks and 30 Swift role fixtures pass; simulator current/selected states, full-row selection and readable confirmation/cancel pass in light appearance without live writes. Actual isolated saves/conflicts/demotion, legacy-account and multi-account/device/accessibility acceptance pending.
- [ ] R07 Partial local: fresh management/version preflight before native editor exposure/review/save and management mutations; stale management content cleared, denied/uncertain edit requires refresh. Current management authority is distinct from hosting identity. Build, 601 backend checks and Swift authority/route fixtures pass, including Organizer other-game denial and demotion/leave/removal transfer without automatic Owner attendance. No managed upcoming game on simulator account; authorized editor/race/multi-account/device acceptance remains pending.
- [ ] R08 Partial local: Owner/Co-owner native invitation expiry/create/system share/recent metadata/confirmed revoke, plus explicit pasted-link public preview/sign-in guidance/pending-membership request. Exact-environment URL validation and account/scene/error guards implemented. Build, 571 backend checks and Swift URL/role/expiry fixtures pass; actual isolated lifecycle/races and device/accessibility acceptance pending. Universal/deep links/sign-in return remain N09 work.
- [ ] R09 Partial local: Owner-only native archival with explicit irreversible alert/cancel, fail-closed private-content clearing before mutation and fresh archived-detail reload; account/scene/disappearance guards. Final Xcode build and 30 Swift permission fixtures pass; 573 full backend checks (121 group checks, including two new native archive cases) pass. Actual isolated archival/lost-response races, cross-account immediate invalidation and device/accessibility acceptance remain pending; no push-driven invalidation is claimed.
- [ ] R10 Partial local: account/scene-bound native group-event refresh clears old rows/cursors and rechecks approved membership before/after loading; detail responses bound to current actor, visibility alert explicit about public preview/cover and members-only games, edits preflight current authority/version. Build, 612 backend checks, 40 access fixtures and visibility payload fixtures pass; simulator empty-list refresh/back/reopen and unsaved Private→Public alert/cancel/discard pass without writes. Actual transitions, populated/error/account races, deployed membership-only enforcement and device/accessibility acceptance remain pending.
- [ ] R11 Partial (member description/count available; discussion screens pending): member-only group details/discussions distinct from discoverable previews.
- [ ] R12 Partial local: authorized Create group game from native group details opens a fixed-group form using the current app location; generic creation remains available. Owner/Co-owner/Organizer-only suggestions and fresh checks, exact-body/original-player retry guards and members-only copy for both visibilities. Build, 588 backend checks and 30 native role fixtures pass. Actual isolated submissions/lifecycle races and device/accessibility acceptance remain pending.

## 9. Recurring games and series management

Source: `ManageSeries`, `CreateGame`, `functions/lib/game-series.ts`.

- [ ] S01 Partial local: existing native creation supports 2–12 weekly dates and IANA/local time with server DST/180-day validation. Creation/real-device acceptance remains pending; not reimplemented by the schedule-management slice.
- [ ] S02 Partial local: native authorized occurrence list shows zone-specific dates, effective capacities/attendance, exceptions and cancelled/past/upcoming status. Build, 627 backend checks and light/dark row-preview fixtures pass; populated native runtime/accessibility/device acceptance pending.
- [ ] S03 Partial local: native single/future reschedule/cancel, IANA date picker, preserve-exceptions default and cancellation-includes-exceptions behavior wired to existing contract. Actual isolated apply, mixed-role/DST/180-day and device acceptance pending.
- [ ] S04 Partial local: explicit native review of affected old/new dates and skipped reasons, then confirm or keep schedule; immutable planHash/request UUID body and ok acknowledgement validation. Native date/payload fixtures pass; end-to-end confirmation acceptance pending.
- [ ] S05 Partial local: definitive conflict clears confirmation for refresh/new preview; ambiguous response offers explicit exact-body/original-actor retry or schedule check, with no automatic repeat. Native bearer tests cover idempotency, actor/CSRF, role/archive/version conflicts and unchanged attendance/IDs. Live retry/lifecycle acceptance pending.
- [ ] S06 Pending: independent invitations/requests/attendance/guests/waitlists per occurrence.

## 10. Game chat and shared series chat

Source: `GameChat`, `ChatDialog`, `ChatCases`; `game-chat.ts`, `series-chat.ts`,
`chat-moderation.ts`, migrations 0027–0030.

- [ ] H01 Partial local: native reader sheet, server-authorized audience and canonical game/group-series room implemented; populated standalone simulator check passed, other-role/series acceptance pending.
- [ ] H02 Partial local: latest50 chronological messages, authorized avatar fallback, own/system/moderated rows implemented; live shared-photo/series/large-history acceptance pending.
- [ ] H03 Partial local: bottom anchor, Latest action, earlier-page cursor loading, fresh retained-history rebuild and identity-based anchor restoration implemented; populated pagination/no-jump acceptance,
  send scroll behavior and keyboard avoidance.
- [ ] H04 Partial local: visible-end read cursor with settling delay and actor/room/generation guards, unread display, server-backed mute/unmute with fresh access and explicit recovery. Full648 backend checks and native payload/build checks pass; simulator mute/privacy layout, Latest/Refresh/Done checked in own-only read-only room without preference writes. Populated unread/earlier-history, live mute/series/access-race, accessibility/device and native inbox integration acceptance remain pending; see latest IOS_APP_HANDOVER.md.
- [ ] H05 Partial local: native text composer, fresh access check before each send, immutable body/clientId retry and explicit uncertain-send recovery implemented. UTF-16/empty/control-character Swift fixtures and two native-bearer retry/rate checks pass. Network-free simulator harness verifies eight-line internal scrolling and Send visibility in portrait/landscape; hardware keyboard mode means onscreen-keyboard avoidance is unverified. Full645 backend checks pass. Live writable-room send/lost-response, empty-draft UI, accessibility and lifecycle/access races remain open; see latest composer runtime entry in IOS_APP_HANDOVER.md.
- [ ] H06 Partial local: server access/expired states, 10s polling and actor/scene clearing implemented; live revocation/block/removal and send-state acceptance pending.
- [ ] H07 Partial local: server expiry/inactivity guidance and local expiry clearing; acceptance pending for game retention/send windows, series rolling retention/inactivity and staff
  exceptions from server responses; reading does not renew activity.
- [ ] H08 Partial local: eligible-message ellipsis and freshly authorized report sheet, five categories,1,000-unit details, confirmation, acknowledged/rejected/unconfirmed states with no automatic replay. Native fixtures, four native-bearer cases and full652 backend checks pass; network-free simulator form/confirmation checked. Live eligible-row/report/evidence/moderation, access/rate/uncertainty races and accessibility/device acceptance pending. See latest IOS_APP_HANDOVER.md.

## 11. Member-only group discussions

Source: `GroupDiscussions`, `ContentActions`, `ReportContent`; `group-discussions.ts`,
`GROUP_DISCUSSIONS.md`, migrations 0032–0033.

- [ ] T01 Partial local: separate Group details/Discussions controls and viewer-visible growing count badge; real empty-group simulator switch/refresh and dark/AX3 component layout verified. Populated/live count and accessibility/device acceptance pending.
- [ ] T02 Partial local: compact post excerpt/fulltext rows, authorized avatar fallback, timestamps and staff labels implemented. Backend role/count fixtures and dark/AX3 Owner-row preview pass; populated authorized-photo/list/thread acceptance pending.
- [ ] T03 Partial local: member-only reader and new-discussion composer with optional120-unit title/4,000-unit body, fresh access and immutable clientId retry implemented; group list/composer spacing refined with name-as-navigation-title, toolbar plus/Post actions, zero top scroll margin, inline title count and expanded post editor. Native draft/discard, model fixtures and full658 backend checks pass; live create/navigation/retry/access acceptance open. Own post edit/delete now implemented locally with original-version edit guard, fresh deletion review, confirmation and explicit conflict reload; populated/live acceptance pending.
- [ ] T04 Partial local: latest50 chronological replies, Earlier replies cursor paging and fresh retained-page rebuild implemented; native-bearer105-reply and Swift ordering fixtures pass. Populated scroll/position/back/refresh acceptance pending.
- [ ] T05 Partial local:2,000-unit reply composer and4,000-unit post validation, fresh member/unlocked-thread checks and exact actor/request retry implemented. Native/bearer boundary/idempotency/permission fixtures pass; own reply edit/delete implemented locally with fresh access/version checks. Actual reply/edit/delete/recovery/keyboard/device acceptance remains open.
- [ ] T06 Partial local: explicit-state like/unlike controls and counts on thread post/replies, fresh authorized target checks (including older replies), locked-thread restriction and server-refresh recovery implemented. Native payload/bearer idempotency tests and dark/AX3 component layout pass; populated/live/uncertain/access/UI acceptance pending.
- [ ] T07 Partial local: thread Follow replies/Following replies maps to explicit muted=false/true; remains available while locked and uses Groups preferences. Native-bearer default reply subscription/preserved explicit mute checks pass; real preference/delivery/accessibility acceptance pending.
- [ ] T08 Partial local: Owner/Co-owner foreign post/reply deletion and lock/unlock review/confirmation, fresh canManage/target/version preflight,30s revalidation and uncertain-write no-replay implemented. Native permission/payload fixtures and full664 backend checks pass; populated/live/race/device acceptance pending.
- [ ] T09 Partial local: accessible own post/reply ellipsis menus, unlocked-only edit and own delete implemented. Privileged deletion now implemented locally; managers cannot edit others. Explanation-required post/reply reporting now implemented locally with five categories,1,000-unit validation, fresh access/version review, confirmation and terminal acknowledged/rejected/unconfirmed outcomes. Native payload fixtures and full666 backend checks pass; populated/live report/access/evidence/device acceptance pending.
- [ ] T10 Partial local: actor/scene/disappearance/error clearing, generation guards, final membership/archive checks and30s authorized rebuild; deleted/blocked post distinguished from membership loss. This is refresh-based, not realtime revocation. Live races/full immediate-clearing acceptance pending.
- [ ] T11 Partial local: native account-wide Groups preference controls now reuse current server category; staff post announcements/reply notifications reuse current Groups preferences;
  ordinary posts/likes do not broadcast; native destinations revalidate access.

## 12. Notifications and native delivery

Source: `Notifications`, `NotificationBell`, `HostNotifications`, `PushSettings`,
`NOTIFICATION_ARCHITECTURE.md`, current push/inbox/sender handlers.

- [ ] N01 Partial local: native inbox, recent-100 unread count, individual non-chat read and current-authorized game/group details; shared toolbar badge, confirmed non-chat snapshot bulk read and direct discussion-post/chat destinations implemented. Inbox settings/filter and unread/bulk-read controls are compacted; notification cards combine sender/unread/time and destination/read actions in a single List row with controlled divider spacing; Play Together Inbox is full-screen to cover its persistent dock. Build and ownership/eligibility fixtures pass; mutation/race/device acceptance open.
- [ ] N02 Partial local: known game/group/member/guest/invitation/waitlist/chat/discussion events render with generic fallback; detailed schedule/status presentation and populated runtime acceptance pending.
- [ ] N03 Partial local: visible inbox polls every 30 seconds, refreshes on resume/account changes and clears on lifecycle/access errors; race and stale-destination runtime acceptance pending.
- [ ] N04 Partial local: account-wide push/Games/Groups draft toggles, explicit Save with fresh baseline check, registered-device list and confirmed owned-registration removal. Build, Swift wire fixtures and40 push contract checks pass; live mutation/race/accessibility/device acceptance pending. Native APNs remains separate.
- [ ] N05 Partial sandbox: migration0037 deployed only to dev; native client permission/token/Keychain/session ownership implemented. Push-enabled development build signed/profile-verified, installed and launched on real iPhone17 Pro Max; current sam test sandbox registration verified without token logging. Refresh/rebind/removal/race and full physical acceptance remain open.
- [ ] N06 Partial sandbox: dedicated allowlisted sender deployed with secret-only APNs key and minute cron; Workers redirect incompatibility fixed and110 targeted checks pass. Corrected hosted diagnostic received APNs200 for registered physical phone. Owner confirmed the diagnostic alert arrived; real group-request fanout/leased queue reached Apple on first attempt and owner confirmed renewed request delivered to phone; owner additionally confirmed game request notifications work on the phone. Broader lifecycle receipt acceptance remains open; production untouched.
- [ ] N07 Partial sandbox: capability-gated opt-in/client callbacks and notification-response delegate implemented. Owner completed phone Enable flow and live registration confirms token upload; precise prompt/denial/refresh/error/lifecycle acceptance remains open. Preview opt-in restricted to confirmed sam test.
- [ ] N08 Partial: generic lock-screen payload and in-memory registration/actor/session-bound tap routing implemented. Generic physical-phone diagnostic accepted by Apple and owner confirmed alert receipt on iPhone17 Pro Max. Physical tap initially crashed in async delegate completion; explicit MainActor completion fix built/installed and fresh test alerts accepted. Owner confirmed fresh game-request tap worked after fix and group-request tap opened Reston Tennis. Exact game title and request-management-sheet routing need separate confirmation. Terminated launch and deferred presentation remain pending.
- [ ] N09 Partial notification routing: authenticated current-authority notification destinations implemented locally; actual destination/account-switch/membership-loss acceptance and deep/universal-link association remain pending. Links never grant membership/access.

Web Push is implemented on the website; it is not APNs. Browser subscription keys/endpoints
must never be submitted as APNs device tokens. No email sender or paid entitlement feature
is currently implemented; neither is required as existing website parity.

## 13. Safety, moderation, policies and app behavior

Source: `SiteModeration`, `ReportContent`, `PlayerSafetyActions`, `ChatCases`,
`moderation.ts`, `chat-moderation.ts`, discussion handlers and current public policy pages.

- [ ] Q01 Partial (Players reporting implemented; other subject screens pending): reporting players/games/groups/chat/posts/replies with written explanation.
- [x] Q02 Local: blocked-player management and server-enforced bilateral visibility restrictions.
- [ ] Q03 Pending: authorized moderator case queue/detail/resolve and player/content actions.
- [ ] Q04 Pending: chat/discussion moderation and evidence preserve/release where authorized.
- [ ] Q05 Partial (current policy links and account deletion; detailed native policy copy pending): account lifecycle/retention/privacy/terms/help copy aligned with current site.
- [x] Q06 Local: current support/contact/privacy/terms/help destinations in community UI.
- [ ] Q07 Pending: native route handling for game/group/discussion/invitation/notification links.
- [ ] Q08 Pending: iOS equivalents of theme preference, accessibility and installation help;
  preserve existing native look rather than porting web CSS or browser install prompts.

## 14. Acceptance and release gates — independent of implementation

- [ ] V01 Mac: compatible Xcode project load, Debug simulator build and target membership.
- [ ] V02 Simulator: contract decoding, timestamp units, pagination and stale-request tests.
- [ ] V03 Simulator: all original courts/maps/weather functions regression tested.
- [ ] V04 Simulator: light/dark, 320/375pt, landscape/expanded layout and large Dynamic Type.
- [ ] V05 Simulator/device: VoiceOver order/labels, contrast and 44pt touch targets.
- [ ] V06 Two accounts: eligibility, private access, blocking, removal and session revocation.
- [ ] V07 Two accounts: capacity/guests/waitlist races and series DST/version-conflict recovery.
- [ ] V08 Physical iPhone: actual Google/Apple sign-in, linking, return-to-app and Keychain lifecycle.
- [ ] V09 Physical iPhone: image selection/HEIC/orientation/crop/upload/share/remove.
- [ ] V10 Physical iPhone: chat latest/earlier scrolling, keyboard avoidance and visible Send.
- [ ] V11 Physical iPhone: notification receipt with app closed, deny/re-enable, destinations and logout.
- [ ] V12 Review: no leaked private media/text/tokens; no production development writes.
- [ ] V13 Release: handover current, exact tested build and rollback recorded.
- [ ] V14 Approval: before provider/signing/bundle/store configuration changes or TestFlight/App Store upload.

## Evidence and execution log

- Baseline: public discovery only; authenticated features absent. Existing uncommitted
  Android/store/blueprint work preserved. See `IOS_UPGRADE_HANDOVER.md`.
- Current batch: D03/D04 search filter parity, D09 public feeds and signed-in filters, D10 native actions.
  Local source is not simulator acceptance. Authenticated items stay unchecked.
- Current follow-up: development PKCE/browser exchange, Keychain client, profile/deletion, Players search/invite/block/report, My Groups/membership and My Games/waitlist actions are implemented locally. 482 backend unit checks pass; real-provider/native acceptance remains open.
- Next: finish remaining A/P items, then L, M, G, R, S, H, T, N, Q in
  dependency order. Do not skip Players/My Games/My Groups or count placeholders as done.

Documentation reviewed: `PLAY_TOGETHER_IOS_BLUEPRINT.md`, `PLAY_TOGETHER_HANDOFF.md`,
`PLAY_TOGETHER_TEST_RESULTS.md`, `PLAY_TOGETHER_RELEASE_CHECKLIST.md`,
`NOTIFICATION_ARCHITECTURE.md`, `GROUP_DISCUSSIONS.md`. Current handlers and release
evidence take precedence over obsolete chronological paragraphs. Broader original
court/weather items require comparison, not assumptions that existing equals parity.

- Mac sign-in follow-up: separate provider choices and allowlisted browser selection implemented locally; Xcode build passed. Focused backend test added but not run (Node/npm unavailable). Provider branding, real-provider and simulator acceptance remain open.

November 21 Mac verification: Node/npm installed; focused native-auth suite passed 13/13, including provider selection. Cloudflare OAuth access verified and Pages project and development D1 listed read-only. No secrets read or changed, and no migration or deployment performed.

November 21 Create Game continuation: existing local form reviewed against current games handler. Xcode BuildProject passed with zero file diagnostics; existing backend games suite passed 57/57. No authenticated creation, ambiguous retry, group event or DST UI acceptance claimed. No shared-data write or deployment performed.

November 21 targeted simulator verification: Simulator checks on iPhone 18 Pro / iOS 27.2 confirmed the authenticated form opens, 105/135-minute duration choices are present, a 75-minute selection persists, manual entry exposes the expected fields, and incomplete creation stays disabled. No layout issue was observed in those targeted checks; no game was submitted.

Simulator search limitation: Fairfax, VA lookup showed loading then returned without rows or an explanatory message; court selection/invalidation was not verified. Lifecycle interruption now explicitly displays a retry message rather than silently discarding an in-flight lookup. That final message change built cleanly but was not rechecked in the simulator; the observed search issue remains open for diagnosis.

Profile-photo follow-up (P03–P06): replace the shared top account symbol in both Courts and Play Together with the authorized signed-in player photo, with initials/person fallback and refresh/cache clearing on edits, removal, account changes, sign-out and access revocation. Header implementation added November22: shared owner-photo badge and fallback with revision/account/scene guards. Shared discovery/game-roster/group-directory avatars added in the following slice. Live acceptance remains pending.

Group-create continuation validation: Xcode build and Create Game diagnostics passed, eight decoded native membership fixtures passed, and existing games/groups backend suites passed 103/103. These do not establish successful native group creation or two-account access/race acceptance.

Group-event simulator evidence: existing authenticated Preview account saw Public/Unlisted/Group event options; group picker listed Reston Tennis. Selecting it displayed private-group active-members-only guidance plus member-direct-join/access-recheck guidance. Incomplete Create remained disabled and no layout overlap was observed. No game was submitted. Empty-membership behavior was covered by fixtures/source only, not account mutation.

Final group-event UI check: Refresh groups preserved the eligible selection; switching back to Public removed group controls and restored approval/unlisted guidance. Empty/revoked-role branches were not exercised on device. No submissions or account changes. Continue with remaining batch-3 acceptance/court-search diagnosis before treating G01–G04 as fully verified; then batch 4 join/manage games.

November 21 court-search diagnosis: reproduced timeout text hidden at bottom of long Create Game form. Moved lookup failures/empty/interruption messages beside the court controls; only games/courts now has an explicit 45-second native timeout (other native requests retain 20 seconds). Xcode build and changed-file diagnostics passed. Added eight local native-bearer create/retry/visibility/revocation/CSRF/account/DST contract cases; games/groups/native-auth suites passed 125/125 against in-memory DB. Actual simulator submission, lost-response and mid-request races remain open. No remote writes/deployment. See ios-app/IOS_APP_HANDOVER.md current-continuation section.

Live court-search fix verification: Fairfax, VA returned court rows within a 25-second simulator wait; editing the query cleared results immediately. Invalid place input showed the geocode error directly below Find courts, fully visible without scrolling. Court selection marker is being checked separately; no submission was made.

Court-selection follow-up: simulator center-of-row taps on Carney Park failed twice with keyboard focus absent. The plain button label included an unfilled Spacer hit area. Added an explicit full-width, minimum-44-point rectangular content shape and selected accessibility trait; Xcode build and file diagnostics passed. Final tap verification passed as recorded below. This is a UI interaction fix; no server or shared-data change.

Final court-selection verification: center-row tap on Carney Park selected on the first attempt after the hit-area fix; both visible checkmark and accessibility Selected trait were confirmed. Editing the query cleared results and selection. Session ended with no game submission. Evidence: DeviceInteractionSynthesize/Verify Court Hit Area-23_10_16_586-screenshot.png and matching hierarchy in this session’s Xcode ActionArtifacts.

November 21 native invitations/sharing: added `NativeGameInvitations.swift`, authorized public/unlisted host player search/count/limit/duplicate states, unlisted forwardable-link creation/system sharing and confirmed revocation with recipient/expiry distinctions. My Games now opens a recent invitation inbox and signed-in pasted-link validation/redemption; existing detail/participation handles server-authorized requests/approval. Group web sharing explicitly requires approved membership; group game-detail invite search remains pending because current endpoint excludes groups. Xcode BuildProject succeeded; 507/507 local backend checks across 33 files (22/22 invitation checks), backend TypeScript, nine native URL fixtures and mixed-inbox decoding passed. Read-only simulator checks verified inbox navigation/empty state and invalid/empty link rejection at 402×874 in light appearance. No live send/revoke/redemption, migrations or deployment. Host/populated-inbox, two-account races, universal/deep links/sign-in return and device/accessibility acceptance remain open; L03/L05/G14/G15 stay Partial. See latest handover/worklist entry for exact next steps.

Photo acceptance audit November22: actionable recovery messages and local bearer checks added (637 total passing). Simulator installed binary lacks Your photo; current runtime acceptance remains open. Explicit simulator install failed due CoreSimulatorService connection refusal; no phone install. See latest handover.

Current simulator verification November22 supersedes stale-binary blocker: explicit workspace simulator session plus keyed InstallAndRun succeeded. Picker, local crop/sliders/reset/discard and disabled no-photo sharing passed; no backend writes. See latest handover. Next development batch9 chat, preserving outstanding photo acceptance.


## Native notification inbox foundation — November 22, 2026

Following the latest T11/batch 11 queue, added `ios-app/NativeNotifications.swift` and a signed-in Inbox bell in the shared Play Together toolbar (`PlayTogetherView.swift`). Native inbox uses existing authenticated `GET games/notifications`, stable server IDs/deduplication, Active/Unread/History filters, recent-100 unread count, timestamps, event-specific copy, guest counts/reasons, loading/empty/error/refresh states and individual explicit read actions. All currently known event kinds render; unknown kinds retain a generic fallback. Game/group links use existing CommunityDetailView and fetch current server-authorized content, rather than trusting notification payload permissions. No inline approval/join mutation was added.

The visible inbox refreshes every 30 seconds and on foreground/account changes. Account/scene/disappearance invalidates pending generations and clears private rows; failed refresh clears rows. Individual non-chat read sends the existing CSRF-protected endpoint and requires `ok:true`, followed by server reload. An uncertain acknowledgement shows refresh guidance, with no automatic mutation replay. Chat notifications deliberately offer navigation guidance instead of inbox read marking: the server's `chat:` read endpoint advances through the entire room, so existing visible-message chat cursor logic remains responsible. The count is for the latest 100 records, not a global unread total. Toolbar bell currently has no badge.

Validation: Xcode BuildProject passed (7.058 seconds; build log `BuildProject-Log-20261122-153745.txt`). RunCodeSnippet passed five mixed notification fixtures including group, archived invitation, chat, read discussion and unknown event, with unread excluding archived/read rows. Fast file diagnostics were unavailable (SourceEditorCallableDiagnosticError error 2); successful full build is the compilation evidence. Targeted whitespace check passed. No simulator visual/touch or live inbox mutation acceptance was performed, and no backend code/schema, deployment, production data, signing or settings changed.

N01–N03 remain Partial. T11 remains Pending: this slice renders discussion events and links to the group but does not implement group notification preferences or exact post navigation. Next: verify inbox toolbar/layout, filters and read actions on simulator with isolated accounts; add shared unread badge, explicit bulk-read semantics, exact discussion/chat destinations and stale/access-denied recovery. Then notification preferences/device management and APNs. Preserve all earlier acceptance gaps, including populated discussions, two-account access races, accessibility and physical-device checks. Keep all handovers/worklist/checklist updated after each slice.


## Notification badge, direct destinations and bulk updates — November 22, 2026

Continued batch 11 in `ios-app/NativeNotifications.swift` and `ios-app/PlayTogetherView.swift`. A root-owned Observable notification summary supplies the shared Play Together toolbar bell with a capped numeric badge and readable unread accessibility label. It counts unread non-archived records among the latest 100, not a global total. Active-scene/account tasks refresh every 30 seconds; actor/generation checks prevent obsolete results and clear unknown/error/account/background state. Inbox fetch/read refreshes update the shared count. Courts toolbar integration is not included in this slice.

Notification payload now retains postId. Chat opens NativeGameChatView directly; discussion announcements/replies open the existing NativeGroupDiscussionsView at that post with a session-local submission store. Each reader freshly authorizes access with its existing account/lifecycle guards. Other events open current game/group details. No cached notification grants access, no auto-join/approval occurs, and notification links do not implement universal/deep links. Exact reply highlighting is not implemented.

Added explicit confirmed “Mark all updates as read”: snapshots unread non-chat IDs when review opens, excludes newly arriving events and chat cursors, and sequentially acknowledges existing individual read calls because no atomic bulk API exists. Stops on an uncertain acknowledgement with confirmed-count/refresh guidance; no automatic mutation retry. Inbox polling pauses during confirmation/mutation. Individual chat read remains exclusively in the existing visible-message reader. Failed inbox refresh clears rows and shared summary. Bulk mutation/account/scene and partial-response runtime acceptance remain open.

Validation: final BuildProject passed (7.147 seconds, BuildProject-Log-20261122-154307.txt). RunCodeSnippet passed mixed decode/post ID, non-chat bulk eligibility, summary actor replacement and clearing fixtures. Targeted whitespace check passed. Device-interaction verification is recorded in the following evidence entry. No backend/schema/deployment/signing/production modifications or live notification mutation was performed by this implementation. Existing source changes preserved.

N01–N03 remain Partial pending live acknowledged/uncertain reads, account/revocation races, refresh timing, dark/Dynamic Type/VoiceOver and physical-device acceptance. T11 preferences remain Pending. Next: complete detailed schedule/request/invitation status presentation and native Games/Groups notification preference semantics (inspect current GET/update handlers first), then device ownership/unregister and APNs infrastructure. Keep all handovers and checklist current; preserve earlier populated discussion/photo/chat/group and release acceptance gaps.


Simulator evidence for inbox continuation: device-interaction skill verified explicit simulator B0DF137B-1CF1-4D65-B682-3C70FC66192F (`deviceIsSimulator:true`), normal app arguments [], final 15:43:07 implementation installed (PID65419). Feed bell exposed 3 unread; populated Inbox, Active/Unread/History, refresh, bulk confirmation dismissal with unchanged unread count, Open game → Friday evening → Back → Inbox → Feed passed. No read mutation, account change or chat opening performed; session closed. Root reviewed populated screenshot `DeviceInteractionSynthesize/Verify Native Inbox-15_42_28_613-screenshot.png` under ActionArtifacts/41DEB671-8A53-471F-9B91-2251469AFFFC. Final navigation screenshot `Verify Native Inbox-15_44_23_960-screenshot.png`. Confirmation uses system popover outside-dismiss behavior; an explicit Cancel is not visible on this simulator.

The check found filter row-center taps did not open the trailing menu. Replaced it with a full-width 44-point Menu label and explicit accessibility label/value. Added bottom content margin using shared communityDockHeight so final guidance scrolls above the floating dock. Final correction BuildProject passed (6.535 seconds; BuildProject-Log-20261122-154502.txt); focused runtime recheck follows. These observations do not establish dark/Dynamic Type/VoiceOver, mutation acknowledgement, exact discussion/chat routing or race acceptance.

Final layout recheck: device-interaction skill reinstalled 15:45:02 build with normal [] arguments on the same confirmed simulator. Filter center hitPoint {201,188} now opens the menu; Unread/History/Active selections and accessibility value updates pass. At 100% scroll, final guidance is fully readable above the floating dock. No mutation/chat interactions; session closed. Screenshot: `ActionArtifacts/41DEB671-8A53-471F-9B91-2251469AFFFC/DeviceInteractionSynthesize/Verify Inbox Layout Fix-15_46_22_082-screenshot.png`. Remaining acceptance and next tasks are unchanged from the continuation above.


## Native notification preferences and registered devices — November 22, 2026

Added `ios-app/NativeNotificationSettings.swift`, linked from Inbox in `NativeNotifications.swift`. Uses existing authenticated `GET push/settings`, `PATCH push/preferences` and `DELETE push/devices` through native bearer/CSRF transport. Native account preferences expose explicit draft toggles for global push, Games and Groups (including discussions), with Save. All three request fields encode as booleans; server response flags decode strictly as integers 0/1. Unavailable responses do not fabricate preferences. Available responses require preferences and a bounded, unique, UUID-keyed device list; endpoint/key fields are neither decoded nor displayed. Registered browser/device rows show transport label, short registration suffix, update date and current-session indicator.

Save freshly reads current settings and compares with the reviewed baseline. Changed/disabled server settings replace the draft with an explicit review message before any PATCH. Acknowledged writes are reread and displayed from current server state. Uncertain saves/removals clear editable state and require reload, without automatic mutation replay. This is a client preflight, not atomic compare-and-set: the existing API has no version field and cannot prevent a concurrent change between final GET and PATCH. Existing server session, account ownership and category/delivery authorization remain authoritative.

Device removal requires confirmation, a fresh owned-registration check, explicit DELETE, `ok:true` and a verifying read. An already absent registration causes no DELETE. Unsaved preference edits disable removal/refresh; custom Back requires discard confirmation, and busy writes disable leaving through supplied controls. Account/scene/disappearance invalidates generations and clears settings/drafts. Drafts are session-local and not restored after scene loss. View uses the shared bottom dock content margin. Future server notifications already handed to a provider cannot be recalled by unregistering.

The screen explicitly states native iPhone push is unavailable and that saving these account-wide choices does not register this iPhone. Existing settings availability is gated by web-push environment/VAPID configuration; this is not evidence of APNs support. No OS permission prompt, native token registration, APNs transport/schema/sender/signing/credentials/capability or remote deployment was added or modified. No browser registration is created by this native view. Backend production code/schema unchanged.

Validation: final BuildProject passed (7.146 seconds; BuildProject-Log-20261122-155044.txt). Swift RunCodeSnippet passed numeric response flags, Boolean PATCH body, unavailable response and four malformed-response fixtures. Added two isolated in-memory native-bearer regressions to `tests/push.test.ts`: preference/read/removal auth, Origin/CSRF, malformed body, revoked session, cross-account device/pref isolation, native/web credential separation and disabled-service denial. All40 push checks passed. Whitespace clean. Simulator evidence follows; live preference-save/removal acknowledgements, uncertain responses, concurrent settings/account/lifecycle races, accessibility and physical-device acceptance remain open.

N04 and T11 now Partial local. Preserve all prior inbox/chat/discussion/photo/group release gaps. Next: implement local native APNs registration/session ownership and sender infrastructure (N05–N08), with a distinct native transport contract, current authorization and generic lock-screen payloads; do not reuse browser subscriptions or claim delivery from web push. Existing environment/secret/signing/release safeguards still apply. Also finish detailed schedule/request/invitation inbox presentation and remaining mutation/device acceptance. Continue updating both handovers, worklist and parity checklist after each slice.

Notification settings simulator evidence: device-interaction skill confirmed simulator B0DF137B-1CF1-4D65-B682-3C70FC66192F (`deviceIsSimulator:true`), installed final15:50:44 build with normal [] arguments and closed session. GET settings was available with three enabled preferences and one browser registration. Initial Save disabled; local Game-toggle edit enabled Save; Back prompted discard; outside-dismiss kept the draft; Back → Discard returned Inbox. Reopened settings retained the original server preference. Removal confirmation opened and was dismissed with registration unchanged. Bottom guidance fully readable above floating dock at100% scroll; no clipping/overlap/crash observed. No live saves/removals, unavailable/error-response UI or delivery acceptance performed. System popovers omit explicit Cancel/Keep editing buttons; outside-dismiss provides cancellation.

Root reviewed initial and final screenshots under ActionArtifacts/41DEB671-8A53-471F-9B91-2251469AFFFC/DeviceInteractionSynthesize: `Verify Notification Settings-15_50_31_518-screenshot.png` and `Verify Notification Settings-15_51_41_927-screenshot.png`. Fast Xcode file diagnostics timed out; successful full BuildProject is compilation evidence. Final whitespace check clean. Next remains distinct native APNs registration/session ownership and sender work; preserve the acceptance gaps above.


## Native APNs registration backend foundation — November 22, 2026

Implemented local `functions/lib/native-push.ts`, routed through existing `functions/lib/push.ts` as `/api/push/native/settings` (GET), `/native/devices` (POST/DELETE), and `/native/preferences` (PATCH). New migration `0037_native_push_registration.sql` adds hashed installation metadata linked to the existing APNs-capable notification_devices table and immediate native registration/queue cleanup when a session is revoked. Existing event fanout already supports channel=apns; existing web sender still processes webpush only. `push-worker.ts` additionally cleans expired native registrations independently of VAPID readiness, with a schema guard for unupgraded databases.

Registration is disabled by default, restricted to the exact isolated feature Preview or HTTP loopback, nonproduction/main configuration, explicit NATIVE_PUSH_DEVELOPMENT_ENABLED=true, APNS_ENVIRONMENT=sandbox and existing bundle identity APNS_TOPIC=us.opencourts.ios. Missing native migration returns unavailable, not a schema failure. Production native auth/registration remains disabled. These are new local contract names, not remotely configured settings. No remote migration, deployment, secrets, credentials, signing, entitlements, capabilities or store changes were made.

Native bearer sessions are mandatory; web credentials cannot register. Origin and current-session CSRF protect mutations. POST accepts bounded even-length hex deviceToken, a 64-lowercase-hex installationId secret, sandbox environment, matching topic and Boolean consent. Tokens are normalized without assuming a fixed APNs byte length; installation secrets are hashed and never returned. Device tokens reside only in the existing private endpoint column; web encryption fields are empty for APNs, with no fabricated browser subscription. Settings omit token/installation/endpoint hashes and expose only registration metadata/preferences. This establishes authenticated installation-secret possession, not device attestation or proof APNs has accepted the token.

consent=true is explicit opt-in and enables account-wide push while preserving Games/Groups choices. consent=false only refreshes an already registered installation in the same account AND session, and never re-enables push. New account/session registration requires explicit opt-in. Idempotent same-token retries retain one device and do not replay old events. Token rotation or account/session rebinding replaces the registration and cascades old queued deliveries. A token bound to another installation fails409 instead of silently transferring. Shared ten-registration cap includes web devices. Atomic registration batch repeats current ios-session, active-account and cap checks; revoked-between-check-and-batch cannot register or opt in. DELETE affects only the actor's APNs registrations; session revocation/suspension/account deletion and expiry cleanup cascade metadata/queued work.

Native preference PATCH uses the shared three-Boolean enabled/games/groups contract, independent of browser VAPID readiness, and repeats current native-session authority in its write. The existing Swift settings screen still uses the browser-compatible endpoints; native capability/client integration is the next slice.

All native settings and successful registration responses explicitly return deliveryAvailable=false. This continuation supplies NO native Swift registration/permission/delegate flow and NO APNs provider sender or delivery claim. Pending APNs queues are retained under existing event expiry; the web sender does not attempt them. Gate activation alone cannot enable delivery.

Validation: initial full backend suite676/676 and Xcode BuildProject passed (3.255 seconds; BuildProject-Log-20261122-155727.txt); subsequent opt-out-preserving refresh checks passed49/49 targeted push checks. Final full-suite/TypeScript evidence follows. New isolated in-memory cases cover gate/schema/production boundaries, bearer/Origin/CSRF/consent/token validation, idempotency/privacy/category preservation, rotation/no replay/web-sender exclusion, account/device isolation, logout/suspension/deletion/expiry, shared cap and mid-request session revocation. No live APNs token, permission request, device registration or push was attempted. No Swift/UI changes in this backend slice, so simulator UI acceptance is not claimed.

N05 now Partial local backend only; N06–N09 remain Pending. Next: native Swift opt-in/permission and UIApplicationDelegate token callbacks, Keychain installation identity (tokens never persisted), same-session consent=false token refresh, explicit re-enable on new sign-in, disable/unregister and account/lifecycle invalidation. Fetch native capability before offering opt-in and distinguish registration readiness from delivery readiness. Then implement the APNs sender using shared event authorization/category/session checks, privacy-safe allowlisted payloads, bounded retries/token invalidation and authorized tap routing. Keep signing/capability/secret changes and remote activation behind existing explicit authorization safeguards; only seek approval once concrete rollout artifacts are reviewable. Maintain all handovers/checklist and earlier release acceptance gaps.

Native registration race/retry refinement: POST also accepts expectedRegistrationId (null/omitted for first registration). Token rotation or account/session rebinding must reference the reviewed current registration ID. A delayed old-token or old-account request fails409 after a newer binding; matching current actor/session/token retries can recover the accepted registration ID even after a lost response. Tests verify stale-token/account denial and exact rotated-body recovery. The Swift client must keep the last acknowledged registration ID alongside the installation secret (not the APNs token), refresh capability/metadata before a new explicit enable and reconcile409 without blindly retrying. This is a registration-ID precondition, separate from the preferences API's non-atomic GET/PATCH limitation.

Final validation evidence: full local backend suite678/678 across33 files passed after native preference support; final registration-precondition/retry refinement then passed50/50 targeted push checks. Backend TypeScript check passed after precondition addition. Xcode BuildProject passed as above; Swift/UI unchanged. Final whitespace check clean. No remote/live mutations or deployment, no APNs client/sender or delivery acceptance. Next remains native Swift permission/token/installation/session lifecycle integration, followed by APNs sender and authorized tap routing.


## Native iPhone permission and token client — November 22, 2026

Added `ios-app/NativePushRegistration.swift`: native capability/review/request models, origin-separated Keychain installation identity/receipt, app-level Observable coordinator, UIApplicationDelegate APNs success/failure callbacks and This iPhone status/opt-in/removal screen. `MyApp.swift` installs the delegate and scene lifecycle forwarding while preserving Google URL handling. Notification settings links to This iPhone. `NativeAccount.swift` informs the coordinator of account changes and adds a SHA256 session fingerprint plus optional expectedSessionFingerprint transport guard. The guard rejects a changed credential before URLRequest/network construction and existing token equality checks still protect responses; raw session credentials are not exposed to the coordinator.

Backend `native-push.ts` now supplies playerId in available native capability responses; Swift requires it to match the captured visible actor. Added CSRF-protected POST `/api/push/native/installation` to review a possessed installation secret's current registration ID/current-session flag without exposing tokens or another player's identity. This supports fresh expectedRegistrationId preconditions and lost-acknowledgement/account-switch reconciliation without guessing from a device list. One new isolated native-bearer test covers absent/current/unknown/cross-session review and CSRF; existing registration/privacy checks now assert actor identity.

Enable remains offered only when BOTH native registration and delivery capability are available, the response is actor-bound and the bundle is the existing us.opencourts.ios. Current local backend deliberately returns deliveryAvailable=false and deployed native endpoints are not activated; no permission prompt or registration upload runs in this state. Once approved infrastructure is ready, a direct Enable tap freshly verifies capability/session/version, reads or creates a 32-byte CSPRNG installation secret in WhenUnlockedThisDeviceOnly Keychain, requests alert/badge/sound permission if not determined and asks UIKit for a current APNs token. Denied permission offers an explicit iPhone Settings link. A successful delegate callback uploads bounded variable-length token hex under the original session fingerprint and saves only installation secret plus acknowledged registration ID/actor/session digest. APNs tokens remain in memory and are never stored in Keychain/UserDefaults or logged. Provider errors use generic user copy, not raw diagnostics.

Launch/account/foreground refresh re-requests a token only for an acknowledged receipt matching current actor AND session, authorized OS permission and ready capability. It uses consent=false, preserving account-wide opt-out. New sessions/accounts require explicit enable. Foreground token callbacks can wait through temporary inactivity in memory; background/account changes invalidate generations, pending callbacks/timers and displayed metadata. Account changes best-effort clear the previous receipt while retaining the installation identity; receipt actor/session checks remain mandatory even if Keychain cleanup fails. A 20-second APNs-callback deadline and generic failure recovery are present. Busy state releases after interrupted permission/network awaits; uncertain uploads do not automatically replay and require fresh status/explicit action.

Confirmed removal freshly reviews matching current-session ownership, sends a pinned DELETE, requires ok:true, unregisters UIKit callbacks, clears receipt and verifies server metadata. OS permission and other registrations are unchanged. Existing server session-revocation/suspension/expiry guards remain authoritative. No UNUserNotificationCenter notification-response delegate, closed-app tap routing, APNs sender, signing/capability/entitlement change, secret/configuration change, remote migration/deployment or actual push delivery was added. Migration0037 and native handlers remain local. Current generic account preference screen still uses its existing browser-compatible endpoints; future native-preference fallback integration remains open.

Validation: final BuildProject passed (6.935 seconds; BuildProject-Log-20261122-161041.txt). Push/native-auth suites65/65 pass; backend TypeScript check passes. Swift fixtures pass unavailable/prepared and contradictory capability, actor mismatch, token hex/consent/version body, review validation and token-free metadata encoding. A transient fixture initially put throwing decode inside precondition's nonthrowing autoclosure; corrected fixture passed; app source built throughout. Separate transport fixture using only synthetic in-memory credentials verified changed-session pin rejection before networking, without Keychain/real credentials or server requests. Whitespace clean. No live permission, token registration, unregister or notification mutations performed.

Simulator (device-interaction skill): explicit B0DF137B-1CF1-4D65-B682-3C70FC66192F simulator=true, normal args[], initial16:06:33 build: Feed→Inbox→Notification settings→This iPhone, permission Not requested, unavailable explanation, Refresh and Back pass; no Enable, OS prompt or false Registration saved. Deployed endpoint produced a recoverable generic status error as well as unavailable copy; HTTP status was not captured and must not be claimed as a verified404. Non404 authorization/server failures intentionally remain visible rather than being masked. Root reviewed `ActionArtifacts/41DEB671-8A53-471F-9B91-2251469AFFFC/DeviceInteractionSynthesize/Verify Native Push Device-16_07_34_000-screenshot.png`; content clears dock. Final duplicate-heading removal/actor guard recheck follows.

N05/N07 now Partial local. N06 sender and N08/N09 receipt/tap/deep-link flows remain Pending. Enabled-path actual permission/callback/Keychain upload/removal, timeout/error/account/lifecycle races, dark/Dynamic Type/VoiceOver and physical iPhone acceptance remain open. Next: implement gated APNs sender with current event/session/category/access revalidation, allowlisted privacy-safe payloads, token invalidation and bounded retry/lease outcomes; only then expose delivery readiness and complete authorized notification taps. Before remote activation prepare reviewable migration/server/signing/capability/configuration steps and obtain the existing required approval; do not modify existing secrets. Continue updating both handovers/worklist/checklist and preserve prior acceptance gaps.

Final native push screen recheck: device-interaction skill installed16:10:41 build on the same explicit confirmed simulator with normal[] arguments, then closed session. One This iPhone title, Not requested permission, unavailable and recoverable-error states, Refresh, Back and dock clearance pass. No Enable/prompt/saved-registration claim, clipping, remote writes or permission changes. Evidence: `ActionArtifacts/41DEB671-8A53-471F-9B91-2251469AFFFC/DeviceInteractionSynthesize/Verify Final Push Screen-16_11_26_350-screenshot.png` and matching hierarchy. Enabled-path gates remain open; next is the gated APNs sender, then authorized receipt/tap routing.


## Local APNs provider and delivery queue — November 22, 2026

Implemented `functions/lib/apns-provider.ts` and `apns-delivery.ts`. Existing `push-worker.ts` invokes the native drain after the web drain, with native cleanup still in finally; web sender behavior is unchanged. `push-delivery.ts` exports only its Delivery type so the native adapter can reuse eventStillVisible for current membership, blocks, group/game lifecycle, invitation/waitlist, chat and discussion rules. Native drain independently checks ios-session/player/registration/token ownership, category preferences, sandbox/topic metadata and current lease, then rechecks authority after JWT/payload work immediately before provider egress. If recurring-chat authorization retargets the destination during final checks, the older payload is skipped. A DB/external-send race cannot be made atomic: already accepted messages cannot be recalled, so tap handling must freshly authorize access.

Sender is disabled by default and sandbox/development only. It requires existing native registration gates plus APNS_SENDER_ENABLED=true, APNS_TEAM_ID/APNS_KEY_ID (10 uppercase alphanumeric characters), APNS_TOPIC=us.opencourts.ios and owner-provided APNS_PRIVATE_KEY in the sender environment. Browser VAPID credentials are independent and not required for native delivery. These are local names/contracts, not remotely configured keys. The signing key must remain sender-only; do not place it in the iOS app or Pages settings. Existing authentication secrets are neither read, reused, changed nor rotated by this work. No remote flags, migrations, deployment, signing, capabilities or entitlements were changed. Production native transport remains forbidden.

Provider uses ES256 iss/iat/kid authentication, warm-run JWT caching for50 minutes (with config/clock-change invalidation), fixed sandbox host/topic, no redirects, five-second transport timeout, alert push type, bounded expiration, deterministic apns-id and hashed event collapse ID. Payloads contain only fixed OpenCourts title,22 allowlisted generic event messages (unknown kinds use safe fallback), version/kind/opaque tag, optional UUID-only game/group/post destination and UUID registrationId. No private names, reasons, locations, meeting times, text, invite/session/device tokens or arbitrary URLs enter the payload. No inaccurate global unread badge is sent. registrationId is for the next client's account-safe tap gate: require the current acknowledged receipt, actor and session before honoring the target; otherwise open a neutral inbox/sign-in flow. Token refresh can conservatively cause an old alert to fall back to Inbox.

Queue claims use two-minute leases, at most10 jobs/run and five attempts. Signing preflight failure leaves work/attempts untouched. APNs200 records provider acceptance (`sent`), not device receipt. Network/timeouts and429/5xx have bounded retry/backoff and stop when event expiry leaves no retry window;5xx waits at least15 minutes. Provider authentication failures stop the batch without deleting devices or consuming untouched jobs. Only recognized invalid-token responses can remove a matching registration, and old410 timestamps, refreshed registration times and superseded leases prevent a stale response from deleting newer state. Exhausted abandoned native leases become failed. Error storage is restricted to generic codes; response bodies/provider exceptions are never logged or persisted. Retry after an ambiguous accepted response can duplicate delivery; stable request/collapse IDs reduce duplication but do not guarantee exactly once. Native-only drains also advance waitlists/expiry without browser credentials.

Apple references: [token authentication](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns), [request headers/expiration](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns), [response handling](https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns). APNs requires HTTP/2; local workerd transport may differ from hosted Cloudflare proxy behavior, as documented in the [Cloudflare runtime issue](https://github.com/cloudflare/workerd/issues/4841). This adapter uses injected fetch for local verification. Hosted HTTP/2 connectivity, fleet-wide JWT cache/connection behavior and actual APNs responses require isolated hosted acceptance; no local mock establishes these.

Validation: added `tests/apns-provider.test.ts` with ephemeral synthetic signing keys and injected transport (no Apple requests), plus native queue/access/lease cases in `tests/push.test.ts`. Coverage includes JWT verification/cache, fixed headers/IDs/expiration,22 event templates and unknown/prototype kinds, token-free payload/registration binding, response classes/retry-after/oversized bodies, authorization-after-signing, category/access/read/revocation/expiry denial, overlap/lease takeover, retries/attempt limits, token invalidation freshness, provider-auth batch stop and sanitized errors. Initial three failures were fixture assumptions: membership removal/archive correctly generate generic outcome notices, and an unscoped status query selected a new pending notice. Fixtures now isolate the private game event and query the original source; shared policy was preserved. First full715/715 passed; final registration-ID payload run/TypeScript evidence follows. Xcode BuildProject passed (3.026 seconds; BuildProject-Log-20261122-161936.txt). Swift/UI unchanged in this slice; no new simulator/device-delivery claim.

N06 now Partial local. Native capability and registration responses STILL return deliveryAvailable=false; implementing a sender does not activate the client or certify delivery. Migration0037 and all new server/native work remain undeployed. Next: UNUserNotificationCenter foreground/response delegate plus closed-app receipt and registration/actor/session-bound authorized tap routing (N08/N09), preserving Google URL handling and clearing stale account routes. Then prepare reviewable isolated migration/deployment/signing/credential/readiness steps for the existing required approval and complete physical-iPhone/hosted sandbox acceptance. Do not flip delivery readiness merely because local mocks pass. Rollback distinction: APNS_SENDER_ENABLED controls APNs independently of browser PUSH_ENABLED; registration gate controls native endpoints too. Preserve all earlier inbox/profile/group/chat/discussion/release acceptance gaps and continue updating handovers/worklist/checklist.

Final APNs sender validation: registration-ID payload refinement passed the complete715/715 backend checks across34 files; backend TypeScript passed. Final targeted whitespace check clean. All provider requests in verification used injected transport and ephemeral synthetic keys; no Apple request, device push, remote mutation or deployment occurred. Build evidence remains BuildProject-Log-20261122-161936.txt (Swift/UI unchanged). Next remains registration/actor/session-bound receipt/tap routing, followed by approved hosted and physical-device acceptance; deliveryAvailable is still false.


## Native notification receipt and tap routing — November 22, 2026

Continued under the user's standing instruction to act as senior iOS developer and UI/UX designer, develop the app from the checklist, and keep handover documents current for the next agent.

NativePushAppDelegate now installs UNUserNotificationCenterDelegate before launch finishes, as required by Apple's delegate documentation. Foreground callbacks suppress OS banners/sound; existing visible inbox/summary polling remains responsible for refresh (no immediate foreground refresh claim). Only the default notification-open action queues navigation; dismiss/custom actions perform no mutation. No notification is marked read by the delegate.

New NativePushRouting.swift parses version1 numeric (not Boolean/string), UUID registration, one of22 fixed event kinds and matching game/group UUID destinations, plus optional valid group post UUID. Unknown/malformed payloads use a neutral Inbox/sign-in fallback. APS text, arbitrary URLs, names and extra fields are never used for navigation or displayed by this code. One pending tap is held only in memory; newer taps replace it. No notification payload/token is persisted. AppHeader waits for the active scene and existing Account/Play Together presentation dismissal before consuming the tap into the shared account sheet, avoiding interruption of an open edit. Google URL handling is unchanged.

NativePushOpenedView restores the account before resolving a destination. NativePushCoordinator requires the acknowledged Keychain receipt's registration UUID, actor and session fingerprint, then fresh actor-validated native capability/device membership and possessed-installation current-session review. The API pins the captured session; final generation/active/account/session checks discard interrupted resolutions. Unverifiable/rotated/revoked/stale registrations fall back to the current Inbox or account flow. Background/account changes clear resolved destinations; old queued targets are dropped on an established-account change. Account sign-in after fallback does not replay an old destination. Existing chat/discussion/detail readers still fetch current authorization; receipt validation grants no content access and does not make notification delivery proof of authorization. Only the existing visible chat reader may advance its read cursor.

Validation: BuildProject passed after final source changes (1.525 seconds, BuildProject-Log-20261122-163944.txt). RunCodeSnippet fixtures passed all22 kinds, cross-target denial, malformed versions/missing fields/invalid post UUID/unknown kinds, one-shot queue consumption and neutral fallback. Separate pure fixtures accepted matching receipt and rejected other actor, changed session, rotated registration and corrupt receipt without network or Keychain writes. Simulator device-interaction skill installed the routing UI build on explicit confirmed simulator B0DF137B-1CF1-4D65-B682-3C70FC66192F with normal[] arguments; root Map → Account → Done → Play Together → Courts → Account reopen → Done passed, without overlap/clipping/crash. Evidence: ActionArtifacts/41DEB671-8A53-471F-9B91-2251469AFFFC/DeviceInteractionSynthesize/Verify Routing Navigation-16_34_09_139-screenshot.png and16_34_11_114,16_34_21_282,16_34_35_698 with matching hierarchies. Session closed. Final receipt helper refinement was compiled/snippet-checked after that UI check. No incoming APNs/tap simulation, permission changes, registration, live chat/read writes or Apple request occurred. Backend unchanged; prior715/715 backend result remains the latest backend evidence.

N07/N08/N09 now include partial local delegate/tap navigation implementation; these entries do not close physical receipt, terminated-launch, actual foreground delivery, stale live notification, modal-deferred tap, membership-loss or session-switch acceptance. Universal/associated links remain pending; no Associated Domains, entitlements, capabilities, signing, secrets, deployment or remote migrations changed. deliveryAvailable remains false. Next: add controlled receipt/tap UI acceptance (including cold launch, pending edit dismissal, fallback and account/session changes), then prepare concrete isolated hosted/sandbox migration37, HTTP/2/provider, signing and physical-iPhone rollout artifacts for required approval. Do not enable readiness based on local fixtures. Preserve all prior release gaps and continue updating every handover/checklist.


## Sandbox activation preparation — November 22, 2026

Owner requested use of connected iPhone17 Pro Max, reports app installed and This iPhone status Not requested (this supersedes earlier statement that notifications were enabled). Assistant workspace device discovery still lists simulators only; CoreDevice fallback timed out and xcdevice fallback could not connect services. Do not claim physical installation/permission/receipt was independently verified. Owner is obtaining an APNs key; instructions supplied from Apple's current key-creation documentation. Never request private-key contents in chat.

Added docs/IOS_APNS_SANDBOX_ROLLOUT.md with reviewed environment/database identity, ordered migration/profile/Preview/worker/readiness steps, physical acceptance matrix and independent rollback. New development/wrangler.apns-sandbox.example.json is a dedicated sender template with native flags false, empty tester list and Apple identifiers, browser push false and no private key. Current checked-in entitlements have Sign in with Apple only, no aps-environment; actual installed provisioning remains unverified. No entitlement/signing/project capability or remote configuration was changed.

Replaced permanently hardcoded native deliveryAvailable=false with a default-off operator assertion NATIVE_PUSH_SANDBOX_READY=true plus an exact comma-separated NATIVE_PUSH_ALLOWED_PLAYER_IDS match, still within existing sandbox/Preview/schema/native-session gates. This allows controlled opt-in once hosted sender configuration is actually reviewed; the assertion does not certify device receipt. Pages needs no Apple key. Sender also requires exact native tester-list membership and rechecks it immediately before provider egress; empty/unset lists permit nobody. Existing APNS_SENDER_ENABLED/provider gates remain independent. Configure matching tester lists in Preview and sender; deployments are not atomic. Existing browser tester behavior is unchanged. No flags are activated by these local edits; the installed app still cannot enable until the remote setup is performed.

Validation: full backend719/719 across34 files passed; backend TypeScript passed; git diff --check clean. Four new cases cover default-off/exact-listed readiness, response parity and production denial, empty/other tester denial and tester removal at final egress. One initial fixture expected an unavailable response on main, but existing outer auth gate correctly returns404; assertion corrected, gate preserved. No Apple requests or configured signing keys used (synthetic/injected transport only). Swift/UI unchanged this slice; previous BuildProject and simulator evidence remain applicable, no new device acceptance claim.

Next: owner supplies secure local APNs .p8 path, Key ID and Developer Team ID; identify actual Preview tester player ID and confirm development App ID/profile. Follow IOS_APNS_SANDBOX_ROLLOUT.md for concrete isolated activation review, migration status/backup, hosted provider validation and physical permission/token/delivery/tap acceptance. Do not use existing authentication secrets for APNs, enable production, blindly apply unrelated pending migrations or mark N05–N09 complete. Continue all handover updates under standing senior iOS/UI/UX implementation instructions.


APNs key follow-up (November22): owner says APNs was enabled on the existing Sign in with Apple key, Key ID PL878X442V, Team ID D8Z42UUJXX. Owner explicitly forbids any Preview/production changes and authorizes examining the matching key in Downloads while ignoring other tokens. Located only the matching .p8 via filename search. File contains one complete PKCS8 block plus surrounding text; whole-file import fails, but extracting that single block in memory successfully imports/signs an ES256 JWT locally. No file was rewritten/copied, no key/JWT or surrounding contents printed, no other token files opened, no Apple request or remote/settings/secret change made. This proves local signing only, not Apple key identity, enabled APNs scopes or provider acceptance. Initial OpenSSL command lacked platform support for -check; switched to local jose validation. Preserve existing Apple sign-in configuration. Remote activation remains prohibited under the owner's latest instruction; continue local work or seek a specific authorized alternative before any hosted secret/configuration/deployment action.


November 22 key-path continuation: reconfirmed matching Downloads filename at `/Users/bigdataanalalytica/Downloads/opencourt-AuthKey_PL878X442V.p8`; owner supplied Team D8Z42UUJXX / Key PL878X442V. Updated IOS_APNS_SANDBOX_ROLLOUT.md with the concrete path, prior whole-file-import caveat, safe future in-memory extraction requirement and remaining tester/profile/device prerequisites. No key contents read or copied in this continuation. Preserve the latest recorded prohibition on Preview/production changes; no remote activation is authorized by supplying a path. Physical notification acceptance remains pending.


## Notification tap acceptance continuation — November 22, 2026

Continued the next local N07–N09 acceptance item without activating APNs. BuildProject passed in 1.038 seconds (BuildProject-Log-20261122-173240.txt). RunCodeSnippet checks passed malformed versions (Boolean/string/0/2/1.5), crossed game/group destination rejection, newest-tap replacement with neutral fallback, one-shot consumption, matching receipt and denial for changed actor/session, rotated registration and corrupt registration. Receipt fixtures used synthetic values only, without network or Keychain access. No Swift changes were required by these checks.

Device-interaction skill installed the current build with normal launch arguments on explicit confirmed simulator B0DF137B-1CF1-4D65-B682-3C70FC66192F. Account opened and survived background/foreground without observed layout defects or crash. Synthetic simctl push failed before delivery: CoreSimulatorService connection invalid / NSPOSIXErrorDomain Code61 connection refused (exit1). No notification appeared. This is an injection infrastructure limitation, not evidence that tap routing passed or failed. Cold launch, default-action callback, deferred presentation while editing, actual fallback UI and account/session-switch UI acceptance remain open. Session closed; no account/permission/server/key changes.

Evidence: ActionArtifacts/1762360B-A4C3-4C07-8079-CD1BD191E271/DeviceInteractionSynthesize/Verify Local Push Routing-17_32_28_287 (map),17_32_45_481 (Account),17_33_05_922 (background),17_33_14_422 (restored Account), each with hierarchy.txt/screenshot.png. Build log shares the same artifact root. No physical-device or Apple delivery claim. Next: restore simulator injection connectivity or use an authorized physical/hosted sandbox acceptance path, then complete cold-launch/deferred/fallback/account-switch matrix. Existing prohibition on Preview/production changes and all N05–N09 release gaps remain in force; do not enable readiness from local checks.


## Simulator restart and injection diagnosis — November 22, 2026

Owner restarted Simulator and reiterated keeping checklist/handovers current. Confirmed xcode-select uses /Applications/Xcode.app/Contents/Developer. Normal sandbox simctl still fails CoreSimulator connection with Code61, but the same read outside the command sandbox succeeds and identifies B0DF137B-1CF1-4D65-B682-3C70FC66192F as Booted iPhone18 Pro / iOS27.2. Therefore the earlier connection failure is assistant shell sandbox access, not proof that the simulator service needs another restart.

Device-interaction skill installed/ran the current app normally on the explicit confirmed simulator. Synthetic push outside the shell sandbox reached the simulator but failed exit211, UNErrorDomain code2003: Repository could not save notification; Source is not authorized. This is a separate notification-authorization blocker; no alert/tap was delivered, so cold-launch/deferred/fallback UI acceptance remains pending. Existing latest evidence says permission Not requested. Do not infer permission success from simctl connectivity. No permission, account, signing, server, Apple key, Preview or production changes were made.

Added development/ios-notification-routing.apns as a reusable local synthetic fixture with Simulator Target Bundle us.opencourts.ios, version1, generic alert and synthetic registration/game UUIDs. JSON and UUID validation passed. It contains no real device token, account/session credentials or APNs key. It must fall back safely rather than authorize game access. Next: establish notification authorization on the test simulator through a reviewed local test path, then retry this fixture using simulator-service access outside the command sandbox. Native in-app Enable remains gated by unavailable remote readiness; do not enable Preview or bypass authorization to claim success. Physical/hosted APNs acceptance and all prior N05–N09 gaps remain open.

Retry evidence: ActionArtifacts/1762360B-A4C3-4C07-8079-CD1BD191E271/DeviceInteractionSynthesize/Retry Local Push Routing-17_40_17_206 (background after rejected push) and17_40_26_287 (restored map), each hierarchy.txt/screenshot.png. App ran as PID78239; interaction session closed.


## Physical iPhone target correction — November 22, 2026

Owner explicitly requested notifications on real iPhone17 Pro Max. XcodeListRunDestinations now confirms eligible physical Devices iPhone17 Pro Max on iOS27.0.1 (isSimulator=false); XcodeSwitchRunDestination selected it successfully. Outside shell sandbox, devicectl list devices independently confirms connected physical iPhone17 Pro Max. Supersedes prior physical-discovery-unavailable statements. No device identifier/token is needed in public notification payloads.

Device Interaction cannot inspect this phone: current tool explicitly supports iOS Simulator27.0+ only, and rejects physical selection by name/UDID/current destination. No interaction session opened or installation performed. Therefore phone OS permission, installed entitlements and current APNs registration remain unverified. Source ios-app.entitlements still contains Sign in with Apple only, no aps-environment. Checked-in dedicated sender template remains disabled. No Apple request or real notification was sent. Simulator injection does not target this phone.

Next: review/authorize the isolated sandbox activation in docs/IOS_APNS_SANDBOX_ROLLOUT.md, preserving existing auth secrets and production. Required steps include correct development push capability/profile, reviewed migration0037 prerequisites, dedicated sender-only APNs key configuration, exact Preview tester allowlist/readiness and phone permission/token registration. The request authorizes a phone test send; do not silently treat it as permission for previously forbidden Preview deployment/configuration changes. Resolve that scope before remote activation. After registration, send one controlled generic sandbox notification and separately record Apple acceptance and owner-observed receipt/tap. Continue keeping checklist and both handovers current.


## Authorized physical-phone sandbox activation — November 22, 2026

Owner explicitly answered yes to completing isolated Preview/APNs sandbox setup for real iPhone17 Pro Max while leaving production and existing authentication secrets unchanged. This supersedes the earlier prohibition only for the reviewed isolated sandbox scope; no repeated activation approval is needed within that scope. Keep production and existing auth/provider credentials unchanged.

Added aps-environment=development with Xcode AddEntitlement. BuildProject for selected physical iPhone passed11.918 seconds (BuildProject-Log-20261122-174409.txt). Independently verified signed app aps-environment=development and application identifier D8Z42UUJXX.us.opencourts.ios; embedded profile grants development push, includes connected phone and expires November22,2027. devicectl successfully installed the built app on the real phone and launched us.opencourts.ios. This establishes installation/signing only, not notification permission/token/receipt.

Prepared development/wrangler.apns-sandbox.json with owner Team/Key IDs, all activation flags false, tester list empty and cron empty. No private key in config. Cloudflare whoami in bounded noninteractive mode reports saved OAuth login expired and unable to refresh; ordinary interactive refresh had stalled. Started wrangler login browser flow; awaiting owner approval. No remote database/Preview/worker/secret mutation has occurred. Also requested intended phone Preview profile name/email to resolve exact tester UUID; do not guess among existing players. Existing key contents have not been read/uploaded in this activation continuation. Next: finish Cloudflare login and identify tester, then review exact isolated migration status/backup and deployment artifacts before remote writes, configure dedicated sender-only key and verify hosted sandbox transport, enable exact tester and complete phone consent/registration and one controlled send. Keep N05–N09 partial until actual acceptance.

Activation preflight validation: targeted APNs provider/push/native-auth suites105/105 passed across3 files; backend TypeScript no-emit check passed; scoped whitespace check clean. These are local checks, not delivery evidence. Browser Cloudflare OAuth approval and exact phone tester identity still pending.


Cloudflare login follow-up (November22): owner approved browser flow but reported still authorizing. CLI saved-login expiry remained unchanged; callback port8976 was listening on IPv6 localhost but HTTP probe timed out. Stopped only the identified stuck login process and switched to documented wrangler login --device (no local callback). New device authorization pending owner approval; do not store its temporary code or tokens in documentation. Reference: https://developers.cloudflare.com/workers/wrangler/commands/general/#use-wrangler-login-without-a-local-callback-server . Exact phone Preview tester identity also pending. No remote configuration/database/secret changes or Apple notification sends have occurred; approved sandbox setup remains the active task.


Cloudflare approval verification follow-up (November22): owner reports device authorization done, but CLI session has not completed and bounded CI whoami still reports expired/unrefreshable saved login. No success or remote change claimed. Inspected installed Wrangler implementation: device flow awaits automatic browser opener before polling; pending flow printed browser-open line without subsequent token-poll diagnostics. Retried login --device --browser=false to eliminate that helper; this attempt stalls requesting device authorization before printing a code. Thus browser approval alone has not restored CLI credentials. Next recovery: run Wrangler device login in owner's normal Terminal outside assistant execution environment, then reverify whoami before any remote write. Avoid asking owner to repeatedly approve unverified login flows. Phone push-enabled build remains installed; exact Preview tester identity still needed. All prior sandbox authorization persists.


## Hosted sandbox activation progress — November22,2026

Owner completed login in normal Terminal; bounded CI whoami now verifies Cloudflare OAuth. Explicit CLOUDFLARE_ACCOUNT_ID avoids a stalled automatic memberships lookup. Verified opencourts Preview COURTS_DB is isolated opencourts-dev (cae4849c-3e99-4945-9d70-bef7b48707ce). Secure development backup exported to /private/tmp/opencourts-dev-before-apns-20261122.sql (mode600); do not display/import its credentials or data. Secure pre-change Pages config snapshot at /private/tmp/opencourts-pages-before-apns-20261122.json (mode600), not repository content.

Applied only0037_native_push_registration.sql plus migration ledger entry to isolated development D1; import3 queries succeeded. Re-list confirms0036_members_only_group_games.sql remains pending, deliberately outside push activation. No production DB change. Updated only five Preview nonsecret native variables: registration enabled, sandbox, existing topic, readiness false and empty exact-tester list. Before/after API checks verified production configuration and every preexisting Preview variable unchanged; no auth or Apple private key secret changed/uploaded.

Only active native-session player candidate is sam test; asked owner to confirm this is the phone account before allowlisting. Staged artifact /private/tmp/opencourts-apns-preview-20261122 uses deployed commit metadata22c0e9f plus six reviewed auth/native-provider/push source files, preserving native-provider sign-in and excluding unrelated frontend/group-policy working-tree changes. Added migration files only to staging fixtures (not applied remotely except0037). Staged build:dev passed; native-auth/provider plus baseline web-push tests56/56 passed across5 files. Initial staging tests lacked migration0035 fixture and attempted to import sender files excluded from Pages; corrected fixture inputs/baseline web tests, then passed. Root full-feature targeted APNs/native tests105/105 remain passing. Preview deployment and sender bundle attempts started; success/activation not yet established. Delivery readiness remains false and no phone APNs send occurred. Next: verify staged Preview deployment, configure/validate dedicated sender-only key and hosted sandbox transport, confirm exact tester, then consent/token registration and controlled delivery. Prior release gaps remain open.


## Preview and dedicated sender deployed, delivery still gated — November22,2026

Isolated staged Preview deployment succeeded:4ddd7f6f-7499-4efb-a819-d1c2e1b74607 at https://4ddd7f6f.opencourts.pages.dev with existing feature alias https://feature-play-together.opencourts.pages.dev . The artifact uses base22c0e9f and reviewed native-auth/push overlays, not the whole dirty tree. Staged build and56/56 checks passed. Unauthenticated GET /api/push/native/settings returns401, preserving access denial; no authenticated capability/readiness acceptance yet. Migration0037 applied only to dev;0036 remains pending.

Wrangler worker deploy/dry-run commands stalled, including direct Node entry. Used esbuild directly to bundle functions/push-worker.ts successfully, then documented Cloudflare multipart Workers API to create ONLY opencourts-apns-sandbox. Existing-worker preflight established it did not already exist. Config pins account and development D1, no cron, all native sender/registration flags false and empty tester list; browser sender false. Extracted exactly one PKCS8 block from owner-supplied Downloads file IN MEMORY and verified ES256 signing; stored as new APNS_PRIVATE_KEY secret only on dedicated worker. Original key file unchanged, no copy/key/JWT printed, no existing worker/auth/provider secret modified. API verification confirms secret_text binding and correct development D1/gates. Config is development/wrangler.apns-sandbox.json (no private material).

Attempted hosted signing/Apple sandbox connectivity through a temporary high-entropy guarded fetch handler on dedicated worker only. Received unexpected HTML at temporary workers.dev URL before JSON verification; HTTP status was not captured and must not be invented. Therefore hosted signing/connectivity/provider acceptance is NOT verified. Finally cleanup succeeded: original disabled sender restored with key binding preserved; workers.dev and preview URLs disabled. Temporary handler removed; no cron or device notification send occurred. Need investigate workers.dev route propagation/HTML response with sanitized status before claiming hosted readiness. Actual APNs HTTP/2, key identity/scope and device-token acceptance remain open.

After deployment, direct API comparison reconfirmed production deployment configuration identical to secure before snapshot. Existing Preview variables/auth secrets preserved. Owner confirmation of sole native-session candidate sam test (a291c59c-5497-4d94-b353-2a75e0348b92) remains pending; do not allowlist another account or bypass ownership to finish. Next: confirm phone tester, finish hosted provider preflight, configure matching exact tester lists and native sender gates, publish readiness only after reviewed hosted setup, then owner taps Enable on physical phone and accepts iOS prompt. Verify registration without printing token; send one controlled generic event and record Apple acceptance separately from owner-observed receipt/tap. N05–N09 remain partial and all prior acceptance gaps remain open. Sandbox authorization continues; no repeated approval needed within it.


## Confirmed tester and hosted sandbox enabled — November22,2026

Owner confirmed sam test is the real-phone account. Exact allowlist is a291c59c-5497-4d94-b353-2a75e0348b92 only. Hosted preflight retry initially returned404 HTML (workers.dev route propagation), then200 JSON with signing=true and sandboxHTTPStatus405 from GET https://api.sandbox.push.apple.com/ . This verifies hosted ES256 import/signing and reachability only; it does NOT establish Apple provider authentication, token/topic acceptance, actual device receipt or HTTP/2 compatibility for a notification POST. Temporary guarded fetch removed; original sender restored, workers.dev and preview endpoints disabled, secret binding preserved.

Activated ONLY dedicated opencourts-apns-sandbox: native registration and APNS_SENDER_ENABLED=true, exact tester allowlist, sandbox/topic and owner Team/Key, browser PUSH_ENABLED=false, minute cron. Set Preview exact tester allowlist and NATIVE_PUSH_SANDBOX_READY=true as operator readiness assertion after hosted setup; no receipt claim. Production and unrelated Preview values unchanged by verified API comparison. Redeployed SAME isolated artifact as6b60228a (https://6b60228a.opencourts.pages.dev; existing feature alias). Existing auth secrets untouched.

Token-free development DB query after deployment found NO native registration and no currently unexpired notification events for sam test. Asked owner on phone to navigate Play Together→Inbox→Notification settings→This iPhone, Refresh→Enable and accept iOS prompt, then report registered/error/unavailable. Physical UI automation remains unsupported; do not manufacture consent/token/receipt. Next: verify live registration metadata without exposing endpoint/token, perform one authorized controlled generic sandbox notification (no private content/destination; safe Inbox fallback), record sanitized APNs POST result and owner-observed receipt. If provider fails, return Preview readiness false and correct configuration before retry. Existing N05–N09 and physical/background/terminated/modal/account-switch acceptance gaps remain open.


Physical registration verified (November22): after owner reported Enable done, live token-free dev query confirms ONE current sandbox/us.opencourts.ios native registration357c90de-4c26-4be7-aece-1931e37dcf39 for confirmed sam test, bound to a live iOS session. No endpoint/token read or printed. Owner requested background/lock readiness before one test, because foreground delegate intentionally suppresses banners. Prepared syntax-checked local-only guarded hosted diagnostic script /private/tmp/opencourts-send-phone-test.mjs; no private key/token embedded. It requires exactly one current owned opted-in registration and revalidates actor/session/device/consent immediately before using existing provider client, emits generic activity with no content destination (neutral Inbox fallback), attempts exactly one POST with no ambiguous retry, and restores original sender/disables temporary public endpoint in finally. This diagnostic is not the event queue acceptance test. No notification POST has yet occurred in this registration verification. Next: owner background/lock readiness, send once and record sanitized provider result separately from visible delivery/tap. Keep all release gaps open.


## Accepted physical-phone APNs test and Workers transport fix — November22,2026

Owner confirmed phone closed/backgrounded. First guarded hosted phone diagnostic returned retry/delivery_error without Apple response. Rolled Preview readiness false, redeployed9fafb73e, disabled sender and removed cron; did not automatically repeat an ambiguous real-device request. Synthetic-only hosted probe reproduced TypeError before a provider response. Root cause: functions/lib/apns-provider.ts used redirect:error, unsupported by Cloudflare Workers before network I/O (official Request docs: https://developers.cloudflare.com/workers/runtime-apis/request/ ). Fixed to redirect:manual and explicitly fail/stop batch on3xx without following redirects or deleting registrations. Added five regression cases301/302/303/307/308 and updated transport contract assertion. Targeted APNs/push/native-auth110/110 passed; backend TypeScript and scoped whitespace checks passed. No unrelated source changes.

Rebuilt sender with esbuild. Synthetic hosted probe after fix returned invalid_token/provider_400, transportFailure=null, as expected for all-zero test token; this establishes actual hosted notification POST response handling. One intermediate synthetic probe hit non-JSON route propagation response; readiness probe now requires unique handler marker before POST, not generic404. No additional real-device POST was made during diagnosis.

Then one corrected real-phone diagnostic sent through the SAME hosted provider client, requiring exactly one current sam test registration, active original iOS session/player and explicit push opt-in; immediately revalidated before egress. Result diagnosticHTTPStatus200/status=accepted/code=null means Apple returned200 for physical registration357c90de-4c26-4be7-aece-1931e37dcf39. Payload uses fixed generic You have an OpenCourts update, activity kind, registration binding and no destination/private data, so tap should fall back to Inbox. No raw token/key/JWT/provider exception printed. This is a direct guarded diagnostic, NOT evidence that event fanout/leased queue delivery has passed. Owner-visible receipt and tap requested separately and still pending at this entry.

Temporary diagnostic removed in finally; original corrected sender restored; workers.dev and preview URLs disabled. Verified worker native gates and single tester list; restored minute cron and Preview readiness true, preserving all unrelated Preview values and production configuration (compared with preactivation snapshot). Redeployed reviewed isolated Pages artifact91e70294 (https://91e70294.opencourts.pages.dev, same feature alias). Key remains secret_text on dedicated sender only; no existing auth/provider secrets or production changes. Local config matches active sandbox state. N05–N09 stay partial. Next: record owner-visible background receipt and tap fallback, then controlled real event fanout/queue and authorized destination, terminated-launch/modal/account/session/membership-loss acceptance, accessibility and removal. Keep prior release gaps; APNs200 alone never marks complete.


## Owner-confirmed physical notification receipt — November22,2026

Owner explicitly confirmed receiving the generic You have an OpenCourts update alert on the real iPhone17 Pro Max after reporting the phone closed/backgrounded. Together with the hosted provider status accepted (APNs200), this passes the targeted sandbox physical alert-receipt check for confirmed sam test. It does not establish exact lock-screen versus background presentation independently, tap behavior, terminated launch, normal event fanout/leased queue, authorized entity destinations, account/session switches, membership-loss behavior, removal or full release acceptance. No additional notification was sent after this confirmation.

Next concrete acceptance: tap this generic activity notification and verify neutral Inbox fallback under the current signed-in account; then exercise a controlled existing authorized event through normal fanout/queue and verify its current-authorized destination, followed by terminated launch/modal/account-switch and removal checks. Continue sandbox only for sam test; production and existing authentication secrets remain unchanged. Keep N05–N09 Partial. Existing corrected sender, minute cron and exact tester opt-in remain active; no further configuration changes in this receipt-recording continuation.


## Game and group request routing-test sends — November22,2026

Owner requested specific game-request/group-request notifications to tap. Read-only dev checks identified sam test's future scheduled public Saturday game (a66f4fe0-9f57-4618-865e-80784db88ac5) and owned active Reston Tennis group (78ac937c-03b6-4977-9f68-4d1cc60be07c). No pending request exists for that game; group has an existing pending member. These are explicitly routing-test alerts, not newly submitted membership/game requests. No attendance, membership, requester identity, source inbox or event/queue records created/modified.

Used temporary high-entropy guarded hosted diagnostic with exactly one current native registration and consent/category/session/player checks; freshly rechecked host authority for future scheduled game and active group manager authority immediately before each send. Existing provider client produced normal fixed templates and version1 registered destination payloads: requested→game UUID; group_requested→group UUID. Each received status=accepted/code=null (Apple200). Two distinct event/collapse IDs preserve separate alerts. No token/key/JWT/private text logged. No automatic retry. Finally restored original corrected sender and disabled temporary public endpoints; existing cron/config unchanged.

Owner instructed to tap one at a time: game alert should open Saturday game; group alert should open Reston Tennis. Both specific receipt/tap destinations remain pending owner observation. These sends bypass event fanout/leased queue and do not close that acceptance gate. Current native routing goes to authorized entity detail, not directly to its request-management sheet; request-specific management destination polish is a separate possible follow-up. Existing generic alert physical receipt remains passed. Next: capture owner-reported actual destinations, fallback/errors/modal behavior and fix observed issues; then controlled real source-event/queue acceptance. Keep N05–N09 Partial and all earlier lifecycle/accessibility/removal/release gaps open.


## Physical tap crash diagnosed and callback fix built — November22,2026

Owner reported tapping specific request notification did not open app. Real-device process query found no OpenCourts process. Retrieved ONLY app crash reports ios-app-2026-11-22-180952.ips and181339.ips to /private/tmp/opencourts-tap-180952.ips and181339.ips. Both SIGABRT/NSAssertionHandler failures show UIApplication _performBlockAfterCATransactionCommitSynchronizes→snapshot/state restoration called by synthesized @objc closure in NativePushAppDelegate.userNotificationCenter(_:didReceive:) on non-main threads1/4. This is a verified app crash during notification response completion, not lack of APNs delivery or proof that default-action callback never fired.

Changed only delegate callbacks in ios-app/NativePushRegistration.swift from async imports to explicit completion-handler forms. Parse Sendable payload before hop, then queue default-open tap and invoke completionHandler on MainActor. Dismiss/custom actions still complete exactly once without queueing. Foreground suppression completion also runs on MainActor. Existing receipt/session/access checks, Google URL handling and payload privacy remain intact. File diagnostics clear; physical-target BuildProject passed28.498 seconds (BuildProject-Log-20261122-181555.txt). Installing corrected build; physical tap retest still required and not claimed fixed from compilation. No backend/provider/config changes in this crash-fix slice. Update N08 evidence to crash-reproduced/fix-built until owner retest and process/crash checks pass.


Tap-fix installation/retest (November22): devicectl successfully installed corrected signed build on real iPhone17 Pro Max (same bundle/account, app installation replaced without deleting data). Resent exactly two guarded routing tests requested/game and group_requested/group; both returned Apple accepted. Temporary handler removed and normal sender restored, public endpoints disabled. Asked owner to tap fresh GAME alert first and distinguish Saturday game vs app/Inbox vs still no open. Live physical pass remains pending; do not mark crash resolved from build/install/provider acceptance. Source whitespace clean. Next inspect new crash/process state and owner destination result, then verify second group tap.


## Owner-confirmed notification tap after callback fix — November22,2026

After installation of the explicit MainActor completion-handler delegate fix and fresh accepted game/group alerts, owner replied it worked to the instruction to tap the new game-request alert first. Record physical notification-tap success/no reported repeat crash for that game test. Owner did not separately name the visible screen, so do not expand this into independently confirmed Saturday-game detail, request-management-sheet or universal-link acceptance. Generic alert physical receipt was already confirmed. Group-request tap remains a separate next check: ask owner to tap group alert and verify Reston Tennis. No additional notification or remote mutation performed in this confirmation continuation. Normal event fanout/leased-queue, terminated launch distinction, deferred modal, account/session/membership-loss, accessibility and removal gates remain open; N05–N09 stay Partial.


## Owner-confirmed group-request destination — November22,2026

Owner explicitly confirmed that tapping the group-request test notification took them to Reston Tennis. This passes the targeted physical group-request notification→expected group detail check on real iPhone17 Pro Max after the MainActor completion fix. Together with prior generic receipt and game-tap worked confirmation, these are diagnostic tap successes, not a full event-fanout/leased-queue or release pass. Game exact displayed title/request-management sheet was not separately confirmed. No further send or remote configuration changes in this confirmation continuation.

Next concrete work: controlled real source-event→fanout→leased APNs queue→physical notification→fresh authorized destination acceptance; then repeat from terminated app and while editing, and verify account/session/membership-loss and removal. Group source/request-management navigation, stale notification fallback, accessibility and all other prior release gaps remain tracked. N05–N09 remain Partial. Existing isolated sandbox sender and sam test-only opt-in remain active; production/authentication secrets unchanged.


## Real group-request queue accepted; owner reports no visible alert — November22,2026

Owner submitted Preview request then reported no phone notification. Read-only dev evidence identifies actual new Reston Tennis group_requested event c17ad7226ad6662a49b80a1465cc3cd1 from source group_notifications/904b4ede7b9f30f5f5551f8e70eaafea at2026-11-22T23:23:00Z. Real fanout produced web and APNs deliveries. APNs434a98494aec3363c84333b488e582bb is sent, attempts1, last_error null, sent_at2026-11-22T23:23:49Z (18:23:49 Eastern). This is normal event→fanout→leased queue→Apple acceptance, distinct from earlier direct diagnostics. It is NOT proof of physical display; owner explicitly says none observed.

Verified delivery targets the same known phone registration357c90de-4c26-4be7-aece-1931e37dcf39, sandbox/us.opencourts.ios, active unrevoked/unexpired iOS session and opted-in Games/Groups preferences. Source read_at remains null. No game request exists for Saturday game in the checked result. App process is currently running; process existence does not establish foreground state at send time. Current delegate deliberately suppresses all foreground OS banners. Asked whether OpenCourts was open versus phone locked/other app when request submitted; awaiting answer, do not assume cause from running process alone. No duplicate notification, queue retry/reset, read mutation, permission or configuration changes performed during diagnosis.

Next: resolve phone foreground/background state. If foreground, distinguish expected suppression from missing transport; repeat a controlled background source-event check or design explicit safe foreground presentation per owner preference. If background/locked, inspect Notification Center/Focus/notification permission and capture device-side delivery evidence without claiming receipt from APNs200. Preserve event/lease/access rules and all existing release gaps.


Renewed real request (November22): owner confirmed prior missing alert occurred with OpenCourts foreground, consistent with deliberate foreground suppression. Owner then withdrew and requested again. Read-only queue check confirms fresh group_requested event253fd85022115e5260fcc4ec3c3e0945/source86cbc51595e1444ad18f31b74b148f1c created23:25:28Z; APNs delivery sent on first attempt with no error at23:25:49Z (18:25:49 Eastern). A distinct event was created, not replay of old alert. Renewed physical display/tap and phone background state remain to be confirmed by owner; no duplicate diagnostic send or remote mutation by assistant. Web channel is pending at this snapshot; browser sender behavior outside this native test is not claimed passed. Next record owner receipt/tap for renewed normal queue event. No foreground banner policy changes requested/applied.


## Owner-confirmed real group-request queue receipt — November22,2026

Owner replied It worked after withdrawal/re-request and verification of fresh group_requested event253fd85022115e5260fcc4ec3c3e0945 and first-attempt APNs acceptance23:25:49Z. Record targeted real Preview group request→event fanout→leased APNs queue→owner-confirmed physical receipt pass for sam test on iPhone17 Pro Max. Prior diagnostic group-request tap was separately confirmed to open Reston Tennis; this final reply does not independently specify renewed alert tap destination or exact lock-screen state, so preserve that distinction. No new assistant send/mutation in this confirmation.

Prior missing visible alert with app open was owner-confirmed foreground suppression, not missing server queue event. Current foreground policy remains no OS banners. Next: normal GAME request queue/receipt/tap acceptance, then terminated launch, modal defer, account/session/membership revocation, opt-out/removal and accessibility checks. Group-request targeted pass does not close full N05–N09 or release acceptance. Isolated sam test sandbox remains enabled; production and existing auth secrets unchanged.


## Native membership decision compatibility deployed — November22,2026

Owner could not accept/reject membership request after real group alert. Identified exact contract mismatch: NativeGroupRequestsView disables decisions when player.updatedAt is absent, while intentionally isolated push-only Preview artifact retained baseline groups.ts without timestamp projection/stale-decision guard. Earlier source implementation existed locally but was excluded from that deployment; disabled controls were safety behavior, not evidence that role authorization should be bypassed.

Added ONLY current functions/lib/groups.ts to isolated staging overlay manifest: request response updatedAt, atomic requestUpdatedAt guard and Organizer request-review/approve/reject authority (no metadata/archive/role powers). No new app source changes/reinstall and no membership decision made on owner's behalf. Migration0036 remains pending; no new database migration applied. Fixture0036 copied into staging for existing local tests only. Selected staged group contracts18/18 passed (182 unrelated cases skipped), covering Owner/Co-owner/Organizer/legacy Admin decisions, CSRF, role/session/archive denial, disabled applicant, withdrawn/replaced timestamps and atomic mid-decision race; staged backend TypeScript passed. No full200-test pass claimed. Existing prior local suites/build evidence retained.

Deployed isolated feature Preview48a4ea06 (https://48a4ea06.opencourts.pages.dev, existing feature alias) with unchanged frontend and existing native auth/push overlays; no production deploy/config or existing secret changes. Owner should open Reston Tennis→Membership & member details→Membership requests→Refresh requests, then use Approve or Reject and confirm. Live UI enabled-control and actual owner-chosen decision acceptance remain pending; do not claim completion solely from deployment. Request notification currently opens group detail, requiring navigation to request list. Next: owner refresh and confirmed decision, verify resulting state/outcome notification using normal APIs; retain race/lifecycle/account/accessibility/release gaps and all N05–N09 partial status.

### Game-detail stability verification — November 22, 2026

Changed `ios-app/ContentView.swift`, `ios-app/PlayTogetherView.swift`, `ios-app/NativeGameParticipation.swift` and `ios-app/NativeCommunityLists.swift`. Root presentation state is owned outside toolbar content; My Games/My Groups navigation rows remain while covered and are cleared on account/scene changes. All game participation dialogs now present from the game-detail List; host tools share one selected item with immutable game/version, and destructive alerts are centered with descriptive action labels. Guarded server mutations are unchanged.

Final simulator build `BuildProject-Log-20261122-191921.txt` passed. Explicit simulator B0DF137B-1CF1-4D65-B682-3C70FC66192F session closed. Evidence in ActionArtifacts/1762360B-A4C3-4C07-8079-CD1BD191E271/DeviceInteractionSynthesize, `Verify Host Action Presenter` timestamps: Edit19_15_08_273, Invite19_18_21_978, Schedule19_18_56_847, centered cancellation alert19_20_28_922, playing-place sheet19_20_55_322, Account19_21_33_021. Edit/Invite/Schedule passed before final alert-placement-only revision; final build verified cancellation/leave, Courts/reopen and Account. No server writes were performed. Physical iPhone 17 Pro Max BuildProject passed64.756 seconds (`BuildProject-Log-20261122-192251.txt`), and devicectl successfully installed the updated `us.opencourts.ios` app. Owner physical retest remains required. Do not resume feature work or mark broader stability/release acceptance complete from these targeted passes.

### Discussion detail layout follow-up — November 22, 2026

Compact thread presentation in `NativeGroupDiscussions.swift` and `NativeDiscussionReactions.swift`: post/reply content and controls are grouped, Like/Follow share a row, lock/reply actions are grouped, and scroll clearance includes the floating dock plus 24 points. BuildProject passed (4.823 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-223550.txt`). This is source/build validation only; device visual, accessibility and interaction acceptance remains pending. T01–T05 remain Partial; do not change feature parity status until their existing service, authorization, lifecycle and device gates pass.

### Group detail interaction correction — November 22, 2026

Group Member details actions now occupy direct List rows instead of sharing a custom cell; each navigation destination and sheet button has its own native hit target. This is the source fix for reported misrouting to Edit group; on-device route confirmation is still pending. Group name and state/role labels share a `ViewThatFits` line with narrow-width fallback. BuildProject passed (4.495 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-223939.txt`). Keep group parity Partial until each action is tapped and verified on device.

### Discussion detail action placement — November 22, 2026

Reply now sits between the post body and Like/Follow and opens the existing composer; overflow is on the author line; authorized Lock/Unlock moved into overflow; List section spacing is compact. BuildProject passed (4.589 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-224257.txt`). On-device visual/action verification remains pending. T01–T05 remain Partial pending their existing authorization, lifecycle and device acceptance.

### Feed spacing polish — November 22, 2026

Feed group actions now sit in the Your groups header; group tiles are shorter and the standalone Find groups row is removed. The court-reservation note now shares the Upcoming games heading. BuildProject passed (4.976 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-224508.txt`). Device layout, accessibility and tap acceptance pending; parity status remains Partial.

### Discussion inline reply and card spacing — November 22, 2026

Discussion list overflow is on the author line; extra action row/section and top inset were removed. Reply expands inline beneath the post and reuses existing authorized/validated safe submission handling. Follow applies to a single post’s replies; Groups notification settings govern delivery. BuildProject passed (5.184 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-225129.txt`). Device/keyboard/accessibility acceptance pending; T01–T05 remain Partial.

### Discussion surface balance — November 22, 2026

Post/reply white surfaces remain to preserve clear separation between discussion content and the background; row insets are tighter. Inline reply input is taller (4–8 lines) and subtly tinted without an extra outer card. BuildProject passed (4.517 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-225638.txt`). Visual and keyboard acceptance pending.

### Discussion list surface polish — November 22, 2026

Discussion list now uses a white canvas with fine native dividers instead of a single rounded block. Generated titles are hidden when identical to the beginning-derived title, preventing repeated body text; custom titles remain. BuildProject passed (5.411 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-230031.txt`). Device visual acceptance pending; parity remains Partial.

### Plain discussion List — November 22, 2026

Explicit `.plain` List style replaces the still-visible grouped rounded block with a white canvas and native row separators. BuildProject passed (5.020 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-230226.txt`). Verify visually on device; parity remains Partial.

### Feed groups header — November 22, 2026

Removed the custom chevron from “See all”; the native NavigationLink indicator remains so the header no longer shows two chevrons. The Find and See all destinations are unchanged. BuildProject passed in 4.747 seconds (log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-230457.txt`). Verify spacing and taps on-device.

### Feed groups header actions — November 22, 2026

Removed the redundant Find action from Feed’s Your groups header; group discovery remains available in the Groups tab, and See all still opens My Groups. The Groups screen’s organization is a separate follow-up. BuildProject passed in 4.843 seconds (log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-230645.txt`). Verify on-device.

### Groups, My Games and Players compact layout — November 22, 2026

Groups discovery controls now share a compact panel with adjacent My Groups and Invitations links; group search/result semantics are unchanged. My Games uses zero section spacing between filters and game content. Players rows have reduced stack spacing and insets with existing 44-point action targets preserved. BuildProject passed (4.728 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-231228.txt`). Device layout and tap verification pending.

### Inbox confirmation and return path — November 22, 2026

Mark-all-read now uses a concise standard alert; the same unread non-chat loaded IDs are marked, excluding newly arriving updates and chat. Inbox opened from Play Together has a visible Back control to return to its prior tab. BuildProject passed (4.489 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-231538.txt`). Verify on-device; parity remains Partial pending visual/interaction acceptance.

### Inbox top inset — November 22, 2026

Set Inbox List top scroll margin to zero to reduce the gap below the navigation bar. BuildProject passed (4.768 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-231718.txt`). Confirm visual clearance on-device.

### Player discovery profile detail — November 22, 2026

Player invite action is now explicitly labeled. Selecting the player identity opens a profile detail showing the full bio and available shared location/skill from the authorized discovery response; row preview stays compact and safety/invite actions remain separate. BuildProject passed (5.679 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-232118.txt`). Verify on-device with long bio and action taps.

### My Games title fit — November 22, 2026

Added a single-line scaling principal title to keep “My Games” readable with the current toolbar controls. BuildProject passed (4.773 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-232246.txt`). Check smaller widths and Dynamic Type on-device.

### Players row and community toolbar polish — November 22, 2026

Removed redundant profile-row chevrons and changed the profile target to an explicit Button/navigation destination; Invite is text-only to reduce row crowding. Find Games and My Games now use single-line principal titles with tighter scaling. BuildProject passed (4.919 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-232624.txt`). Verify title legibility and independent profile/Invite/overflow taps on-device; no tests or backend mutations.

### Groups shortcut arrow cleanup — November 22, 2026

My Groups and Invitations shortcuts now use explicit buttons/navigation destinations to retain both routes without disclosure arrows crowding the labels. BuildProject passed (4.695 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-232728.txt`). Confirm both destinations and arrow-free appearance on-device; no tests or backend mutations.

### Groups discovery panel visual alignment — November 22, 2026

Replaced oversized filled search/shortcut controls with a compact bordered search field and integrated magnifying-glass action, then plain green icon/text shortcuts divided by subtle rules. Search and navigation behavior are unchanged. BuildProject passed (4.741 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-233000.txt`). Verify visual hierarchy and touch targets on-device; no tests or backend mutations.

### Group details row spacing — November 22, 2026

Reduced Member details action/metadata rows to 44-point minimum height and removed excess vertical List insets; removed extra padding around Create group game. BuildProject passed (4.833 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-233257.txt`). Verify spacing, row routes and accessible tap targets on-device; no tests or backend mutations.

### Group result title/category alignment — November 22, 2026

Kept the Private/Public badge adjacent to the group name rather than pushed to the far side of the result row. Long names scale on the single title line; the disclosure stays trailing. BuildProject passed (4.794 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-233354.txt`). Verify long names on-device; no backend changes or tests.

### Public group detail cohesion and scrolling — November 22, 2026

Consolidated public group preview information/actions into one compact native card and use the loaded group name in the navigation title. Group detail now reserves bottom scroll clearance for the floating dock, so final copy can scroll above it. BuildProject passed (8.962 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-233733.txt`). Verify appearance, scrolling and action destinations on-device; no backend changes or tests.

### Group member action routing and density — November 22, 2026

Membership and Share now occupy separate direct List rows with independent tap targets; owner screenshot confirmed that the membership destination displays Group members. The directory search has a trailing magnifier integrated into its bordered field, and member rows are compacted to 44-point minimum height with zero vertical insets. BuildProject passed (4.439 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-234134.txt`). Verify search and row taps on-device; no tests or backend mutations.

### My Games toolbar cleanup — November 22, 2026

Corrected the My Games toolbar so its game-invitations envelope is removed while the Inbox bell and account avatar remain. Shared header controls are grouped with tighter spacing; the create (+) action is placed before Courts. My Games and Find Games use their standard centered inline navigation titles. BuildProject passed (4.920 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-234911.txt`). Physical-device spacing/title confirmation pending.

### Play Together Courts return destination — November 22, 2026

The Courts toolbar action now resets the main Courts destination to Map and clears selected-court/details/search state before dismissing Play Together. The shared leading controls place create (+) before Courts. BuildProject passed (6.189 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261122-235236.txt`). Verify on-device.
### Profile editor field clarity — November 23, 2026

Expanded the multiline Bio field to reserve four lines and grow up to eight, and added a location pin beside General location. The location value and save behavior are unchanged. BuildProject passed (5.785 seconds; log `ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261123-073731.txt`). Visual confirmation pending.

### Account and photo screen hierarchy/scrolling — November 23, 2026

Account now presents the player identity separately from Security and OpenCourts links, with clearer icons and section hierarchy. Account and Your photo Forms reserve bottom scroll clearance for the floating tab bar to reveal their final copy/actions. BuildProject passed in 6.239 seconds (`ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261123-074046.txt`). Verify scrolling above the dock and visual balance on-device.

### Court location autocomplete coverage — November 23, 2026

Autocomplete is available in main Courts search (sheet and split-screen panel), Create Game court-location search, and Create Game manual court address. The Create Game forms use selected suggestion coordinates for nearby court discovery or manual location submission. Native country inference now covers ISO region labels/codes, and the suggest endpoint searches globally when no country filter is supplied. BuildProject passed in 4.549 seconds (`ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261123-074951.txt`). Confirm live international results on-device; no deployment performed.

### Community location autocomplete — November 23, 2026

Added location suggestions to Groups name/location, Find Games city/area, and Players city/area/ZIP. Groups search uses the selected general-area text; Find Games uses resolved coordinates and displays the selected label; Players uses the generalized city/area label and includes the country for international suggestions. Three-character debounce and stale-response checks are applied. BuildProject passed in 4.642 seconds (`ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261123-075514.txt`). Device/backend acceptance pending.

Follow-up checklist: deploy the global-default behavior for `/api/suggest` from `functions/api/suggest.ts`, then verify international city/area and postal-code suggestions across Courts, Create Game, Groups, Find Games and Players. The backend change has not been deployed.

### Signed-out Feed, My Games and Players entry states — November 23, 2026

Added one shared branded sign-in card with contextual copy and a prominent Account destination to Feed, My Games and Players. Feed remains browsable while signed out; copy makes the benefits of signing in clear. BuildProject passed in 25.475 seconds (`ActionArtifacts/369F2DB9-4AC4-4F42-8D0A-E71AEBFA507E/BuildProject/BuildProject-Log-20261123-082742.txt`). On-device visual, navigation, Dynamic Type and VoiceOver acceptance remains open; no backend changes or tests.

### Signed-in Feed membership rail parity — November 23, 2026

The native Your Groups rail now filters `/groups/mine` to active memberships in active groups, matching the website and excluding pending requests and archived groups. All / My Groups / My Games already map to the server's `all` / `groups` / `mine` filter contract; selection clears stale results before reload, pagination is deduplicated, and group destinations revalidate access. Xcode build and physical-device acceptance are pending; no API/backend behavior changed and no tests were run.

### Native Apple sign-in status — November 23, 2026

Apple sign-in/link acceptance remains **Partial / blocked by provider authorization evidence**. Owner reports fresh-account sign-in fails. Simulator callback logs show Apple system authorization errors before the app receives a credential (`AKAuthenticationError -7034`, AuthenticationServices `AuthorizationError 1000`); Google remained connected and Apple remained unlinked. One separate linking attempt was blocked because the Google session had aged beyond the server's recent-auth window. The iOS app now normalizes generic Apple callback failures and preserves the current session through transient refresh cancellation; BuildProject passed (`BuildProject-Log-20261123-105037.txt`). Re-run standalone Apple sign-in and Google→Apple linking on latest build after verifying Apple Account and refreshing the Google session. No provider mutation, account deletion, or production deployment occurred.

### Apple authorization and app biometric lock follow-up — November 23, 2026

Owner reports physical iPhone Apple sign-in fails verification and an app Face ID prompt appears during Apple linking while signed in with Google. Native app lock previously activated for every non-active lifecycle phase, including transient `.inactive`. Updated to lock only when the scene enters `.background` and to suppress lock during provider authorization. BuildProject passed (`BuildProject-Log-20261123-105413.txt`). **Acceptance remains Partial** pending install and same-player Apple sign-in/link verification on the physical device with biometric lock enabled; no account mutation or deployment has been made.

Physical-device installation attempt was blocked by Xcode device interaction: iPhone 17 Pro Max was rejected as non-selectable, with only simulators available. The lifecycle fix remains build-verified only; physical acceptance is still open.

### Apple-only sign-in versus linked identity — November 23, 2026

Owner confirms the Google player's Account screen lists both Google and Apple, but signing out and signing in with Apple alone returns “Sign-in could not be verified.” The exact Preview message comes from server-side Apple ID token verification, before account-link session/ownership checks; linked identity and independent Apple sign-in therefore have different acceptance outcomes. Added local safe diagnostics for verifier code/claim only; TypeScript check passed. Diagnostics are not deployed. Next: deploy on isolated Preview, inspect the failure category and fix; verify Apple-only login resolves to the same player. Biometric lifecycle changes have only passed build; physical device acceptance remains open.

The isolated Preview now has safe Apple token-verification diagnostics deployed (`0c997621.opencourts.pages.dev`, stable alias unchanged). A filtered Wrangler tail is active to capture the verifier error code/claim on the owner's next Apple-only attempt. Production is unchanged. Physical iPhone validation of the lifecycle fix remains blocked by Xcode device selection.

Owner retried Apple-only sign-in after the Preview diagnostic deploy; error persisted. No matching verifier log was captured in that tail. The latest local iOS build uses a distinct Apple callback-guard message to separate missing/mismatched credential data from server token rejection. Build passed; physical device install/retest is pending.

Latest callback-diagnostic build was installed/launched on the physical iPhone 17 Pro Max through Xcode RunProject (no build errors; log `RunProject-Log-20261123-110759.txt`). No account/auth interaction or visual inspection occurred. Retest Apple-only sign-in and record exact error copy; physical behavior remains Partial.

Owner reports the latest distinct local callback message, confirming Apple callback validation fails before the Preview worker. The local checks now report separate missing credential/challenge, state mismatch, missing identity token, or missing authorization code conditions. Build passed; physical install and exact-case verification pending.

Fine-grained callback diagnostic build is now installed/launched on physical iPhone 17 Pro Max via Xcode; no account/auth interaction was made. Awaiting one owner retry to capture the exact local guard result.

Apple callback challenge race: owner observed “Apple sign in expired before it could be verified,” matching the local missing-challenge guard before server verification. Updated the app to hold the challenge across Apple authorization and suppress challenge refresh during provider authorization/scene reactivation. Build passed (`BuildProject-Log-20261123-111402.txt`) and was installed/launched on physical iPhone 17 Pro Max (`RunProject-Log-20261123-111412.txt`). Acceptance awaits owner retry and confirmation Apple-only login resolves to the intended existing player. Production unchanged.

Follow-up to challenge-retention acceptance: the owner still saw “Apple sign-in request is no longer available” on the first installed fix. Moved pending Apple challenge retention into the long-lived account store and made the callback consume it before view-state fallbacks. Build passed (`BuildProject-Log-20261123-111600.txt`) and was installed/launched on iPhone 17 Pro Max (`RunProject-Log-20261123-111605.txt`). Acceptance remains pending one retry; production unchanged.

The owner still sees the local missing-challenge message after retaining the callback challenge in `NativeAccountStore`. Added temporary presence-only `[AppleAuth]` diagnostics to identify whether the challenge is missing at request creation or callback. Build passed (`BuildProject-Log-20261123-111941.txt`) and installed/launched on the physical iPhone (`RunProject-Log-20261123-112002.txt`). Acceptance remains pending one retry and inspection of those logs; remove diagnostics afterward. Production unchanged.

Latest investigation: owner still saw the missing-challenge message. Physical-device Xcode console did not capture the temporary Swift `print` diagnostics. Source review found the signed-out screen constructed Apple's authorization button with an optional challenge and relied on `.disabled` when nil. The button now exists only when a non-optional challenge is available; request/callback use the captured challenge. Temporary prints removed. Build passed (`BuildProject-Log-20261123-112333.txt`) and installed/launched on iPhone 17 Pro Max (`RunProject-Log-20261123-112341.txt`). Acceptance pending owner retry on this build. If the same local copy persists, instrument with OSLog or migrate to explicit `ASAuthorizationController`. Production unchanged.

Owner confirms native Apple sign-in now works on the physical iPhone after the signed-out Apple button was gated on a non-nil challenge and now captures it non-optionally. Face ID review: automatic locking is tied to scene `.background` only; `.inactive` does not lock during system authorization. On `.active`, refresh prompts for `.deviceOwnerAuthentication` only for an enabled lock with a stored session, with device-passcode fallback. If background occurs during provider auth, the lock request is now deferred until that flow ends. Build passed (`BuildProject-Log-20261123-113915.txt`); simulator Face ID review is in progress and physical-device Face ID timing acceptance remains open. Production and account data unchanged. Next implementation batch after completing batch 1 acceptance: Personal Feed and navigation (membership-revocation and destination-navigation checks).

Simulator Face ID review on iPhone 17 was inconclusive: an existing Google authorization sheet appeared and there was no signed-in test session to inspect Account → Security. No credentials/provider authorization were completed and no account data changed. Closing the sheet caused DeviceInteraction to report `Crashed`, without an app exception/termination signature. Do not count as biometric acceptance; repeat with a signed-in Preview session or on physical iPhone. Verify setup prompt, background→active unlock prompt, passcode fallback, no interruption during provider authorization, and deferred locking if auth backgrounds. Batch 1 still needs provider-link two-account acceptance and biometric acceptance. Next numbered batch: 2, Personal Feed and navigation, starting with membership-revocation and broader route verification.

## Native game start reminders — November 23, 2026

Implemented locally: games created more than 24 hours before start queue a generic
24-hour reminder; games created more than 3 hours before start queue a generic
3-hour reminder. Only confirmed participants and the host are recipients. Existing
Games push preference, active device/session and transport gates apply. The
worker's 30-minute catch-up window avoids missing a reminder on a short scheduler
delay; delivery revalidates start time and attendance after queueing. Tap target
is the game. No migration, live write or deployment was made.

Focused push/APNs-worker/games/groups regression: **363/363 passed**. Backend and
web build passed; Xcode BuildProject passed. Physical-device delivery, tap,
timing, cancellation/reschedule, opt-out, and Preview acceptance remain pending;
existing native APNs readiness is not enabled by this code change. Related next
step: finish current simulator checks for notification settings/navigation,
compact game details and chat composer, then run the reminder acceptance matrix
once Preview/native push is authorized and ready.
### iOS contextual notification opt-in — November 23, 2026

Shared inline opt-in implemented in confirmed game, pending game-request and pending group-membership-request states. One dismissal per account, category opt-outs respected, permission requested only on explicit tap, no participation gate. Suppressed when account/category preferences, iPhone authorization and its APNs registration are all enabled; hidden if native delivery is unavailable. Build passed. Initial joined-game screen confirmed on iPhone 18 Pro; after the shared request-flow expansion, recheck current build for game/group requests and already-enabled suppression. Physical permission and reminder receipt/tap remain pending. See `ios-app/IOS_APP_HANDOVER.md`.
Current simulator build displays the opt-in in a joined game and pending game request. Group-request and waitlist prompts are implemented but not directly reviewed. Already-enabled suppression and physical iPhone permission/receipt remain unverified.

The shared opt-in also appears in game/series chat and group discussions; latest build passed Xcode compilation. Review those placements in the current simulator build.

### Capacity reduction correction — November 24, 2026

Preview retry exposed two unapplied-migration dependencies: `party_size` was missing, and the existing `game_notifications` CHECK constraint rejected new `waitlisted`/`confirmed` kinds. The atomic save now validates remaining attendance and active reserved offers after demotion using the base schema, and gates new notices on schema support. A clean base deployment also omitted the uncommitted native provider sign-in implementation; its required backend files were restored into the isolated Preview build. Latest feature Preview `88c8dbbf` is live; `npm run build:dev` passed and the native authorize route returns its expected expired-grant response (HTTP 400), confirming the handler is enabled. Until migration 0039 is installed, capacity edits save without the new capacity-change inbox notice. Physical-device acceptance remains open: retry native sign-in, then reduce a 4-place game with 3 occupied to 2; confirm the newest non-host attendee moves to waitlist and host/reserved offers remain. No Production deployment or migration.


### Guest-request roles and capacity alerts — November 23, 2026

See the worklist and latest `IOS_APP_HANDOVER.md` entry for implementation details. Backend guest-request access is live on feature Preview only (deployment `f6939c04`). Native pending count and capacity alerts compile successfully; physical-device verification of the alert and preserved scroll position is still pending. Current owner policy is group Owner/Co-owner/Organizer for group games and host-only for standalone games.
### Additional native Preview notification testers — November 24, 2026

Owner requested native sandbox notification eligibility for `How Tech`
(`44c2b9bd-23e2-49b8-9e6c-e452952f4e60`) and `Big Data Analalytica`
(`aa1ad2d4-e948-4a5e-9af5-e846facf6681`), retaining existing `sam test`. The
exact player IDs are configured on Preview Pages and the dedicated APNs sender;
Preview readiness is true, browser push and Production remain unchanged. Preview
deployment `49729ffc` and sender version `59ba2c83-32f9-44ea-90fd-9be8528a4af9`
are active. This enables the existing iOS sandbox opt-in path only; it does not
grant OS permission or register a device. Each account's phone opt-in, token
registration, receipt and tap remain unverified. No notification was sent.

### Capacity-demotion notice and request timestamps — November 24, 2026

Owner reports that a standalone player moved from confirmed attendance to pending Join requests after capacity reduction did not receive a notice. Preview D1 migrations `0036_members_only_group_games.sql` and `0039_game_capacity_notifications.sql` are now applied; the expanded notification constraint and push-event trigger were verified, with no migrations remaining. Code is live on the feature Preview as `c27ca0df`; Production is unchanged. The missed prior notice was not backfilled. Pending join and guest request APIs carry `requestedAt`, displayed in native and website host lists. Capacity-demoted standalone players get a fresh request time at demotion. Xcode BuildProject and `npm run build:dev` passed. Verify a future in-app notice with two accounts; verify APNs separately with authorized/registered iOS notifications.

Follow-up: standalone participation now returns authoritative available places, matching group games (where reserved waitlist offers are subtracted). Approval is idempotent after a completed approval and reports a conflict when the request is stale/non-pending or no update applied; native approve/reject keeps the request section visible while the action runs. Standalone and group waitlist APIs include `requestedAt`, displayed in native rows alongside the existing join/guest request timestamps. BuildProject and `npm run build:dev` passed; Preview `05bf7a71` is live at the stable feature alias, Production unchanged. **Still pending:** device/two-account retest for capacity-restored approval and request timestamps/order across standalone and group waitlists/join requests.

Group capacity reduction code audit confirms: newest non-host confirmed player parties are selected first; active reserved offers are included in the capacity floor; displaced group players are moved to the group waitlist atomically and each receives a `waitlisted` game notification. Migration 0039 creates the in-app/push event, and the APNs template is defined. Only active group members remain eligible to see/use the group waitlist. Owner/Co-owner can manage group games; Organizer can manage their own organized game. Preview schema includes migration 0039. Mark implementation as verified; retain two-account physical-device acceptance for queue placement and notice delivery (including iOS permission/registration prerequisites).

### Feed game-card host attribution — November 24, 2026

Native feed cards now display the organizer's avatar beside the attribution text: standalone “Hosted by [organizer name]”; group “By [group name]” with the organizer's avatar. Feed DTO includes organizer ID; avatar bytes remain behind existing authenticated and game-scoped media authorization, falling back to initials when no shared/authorized photo exists. Xcode BuildProject and `npm run build:dev` passed. Preview `1a7d4e00` is live at the stable feature alias. Device visual/accessibility review pending; Production unchanged.

Screenshot follow-up: corrected the avatar badge's internal fixed 30-point frame so it honors the smaller chip size; initials scale with that size. Xcode BuildProject passed (`BuildProject-Log-20261124-094559.txt`). Confirm final fit on device.

### Notification status and persistence investigation — November 24, 2026

The iPhone status GET returned HTTP 403 (`Please refresh and try again.`), the API CSRF rejection. Preview had the older generic push handler; corrected route deployed as `5f868e73` to the feature alias. No app reinstall is required for this server fix. No timed/background code resets account `push_enabled`; only explicit preference changes write it off. APNs registrations are session-bound, and iOS sessions expire after seven days. Logout/revocation and APNs invalid-token feedback also delete registrations. Delivery can stop while account opt-in remains true. The phone screenshot shows OS permission `Not requested`; device permission and token registration therefore have not completed. Keep account preference, OS permission and device registration as separate checklist states. No notification was sent.

### Series-chat unread badge and outgoing label contrast — November 24, 2026

Group-details Series chat now highlights unread activity using a filled chat icon, red dot, semibold title and high-contrast count badge; VoiceOver announces the unread message count. Outgoing chat author label “You” is explicitly white for contrast on the dark green outgoing bubble in light mode. Build after the latest contrast change and device visual/read-state acceptance are pending.

Xcode BuildProject passed after both UI changes (`BuildProject-Log-20261124-094954.txt`); device visual acceptance remains pending.

### Chat sender avatar size — November 24, 2026

Incoming chat sender avatars now render at 24 points and the nested badge honors the requested size. Xcode BuildProject passed (`BuildProject-Log-20261124-095308.txt`); physical-device visual check pending.

### Chat unread and discussion activity indicators — November 24, 2026

Implemented native unread emphasis across group Series chat and standalone game chat entries, plus an inbox “NEW CHAT MESSAGE” capsule. The count badge uses white text in light mode and black in dark mode on the lime background. Group Discussions selector shows a red dot when the current member has unread group `discussion_post` notifications and marks those announcements read when the tab is selected. Total post count remains independent. Xcode BuildProject passed (`BuildProject-Log-20261124-100645.txt`); physical-device visual and read-state acceptance remains pending. No server changes.

Chat avatar visual follow-up (November 24): reduced incoming sender avatar size from 24 pt to 20 pt. BuildProject passed (`BuildProject-Log-20261124-101154.txt`); physical-device visual check remains pending.

Owner acceptance update (November 24, 2026): owner reports that everything in the current validation round works fine. The outstanding on-device checks for unread chat/discussion indicators and clearing, reduced chat avatar scale, capacity/waitlist behavior, and notification flows are accepted as owner-tested. This is owner-reported evidence; no automated test run or separate instrumented two-account verification is implied.
# Capacity demotion and chat access (November 24, 2026)

- [x] A capacity-driven move from confirmed attendance to waitlist/approval does not revoke game or group-series chat access.
- [x] Explicit leave/reject/host removal still revokes the capacity-preserved grant.
- [x] Functions TypeScript check passes.
- [ ] Preview migration 0040 and two-account end-to-end acceptance remain pending.

## Production release setup — November 24, 2026

- [x] Local native sign-in/APNs production code paths exist behind explicit default-off gates; Xcode build and Functions type check pass.
- [ ] Release signing remains development-only in the current Xcode target; verify an App Store distribution archive and production APNs entitlement.
- [ ] Production service flags/credentials and server migrations/deployment remain unconfigured and undeployed.
- [ ] Reconcile the privacy manifest and App Store privacy answers with the app's data handling; complete store metadata and TestFlight acceptance.

### Latest local verification — November 24, 2026

The feature branch passes `npm test` (733/733 across 34 files), `npm run build:dev`, and Xcode BuildProject (`BuildProject-Log-20261124-150103.txt`). Release screenshot fixtures are Debug-only and the shared scheme has no screenshot launch argument. No signed distribution archive was produced. Do not merge or deploy these changes to Production: App Store signing/APNs entitlement, production auth/APNs configuration and migrations, privacy/store metadata, final full-app screenshots, and TestFlight acceptance remain release gates.

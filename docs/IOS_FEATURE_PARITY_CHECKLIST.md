# Website to native iOS feature checklist

Updated November 21, 2026. Implementation tracker for the **existing** SwiftUI app.
This checklist is based on current website routes, components, API handlers and the
six Play Together documents listed below. New verified releases override historical
Preview-only, pending and superseded product entries. No item is release-approved.

Statuses: **Existing** = found in original Swift source, needs regression acceptance;
**Local** = new Swift source implemented, needs Xcode/simulator/device acceptance;
**Partial** = only some of the feature exists; **Pending** = not implemented.
The checkbox tracks implementation only. Testing is tracked separately; unchecked
items must not be described as working native functionality.

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
- [x] C11 Existing: country metadata, international court/provider routing and string IDs.
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
- [x] D09 Local: public All feed and public-group event feed with current access checks.
- [x] D10 Local: native share of public game/group URLs and court map/directions actions.
- [ ] D11 Pending: signed-in community landing with Your Groups rail and membership filters.
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
- [ ] A06 Pending: explicit provider linking; never merge accounts by email/name.
- [x] A07 Local: preserve browser Origin/CSRF rules and native transport boundary.
- [x] A08 Local: logout and logout-all with private-state/notification ownership cleanup.
- [ ] A09 Partial (deletion/recent-auth error handling; provider-linking UI pending): recent-authentication recovery for linking/deletion and other sensitive actions.
- [x] A10 Local: authenticated API isolation in development; no production development writes.

## 4. Account, profile and optional photos

Source: `PlayerAccount`, `ProfileWelcome`, `PhotoUpload`, `AvatarCrop`, `PhotoVisibility`,
`PlayerAvatar`; `functions/lib/auth.ts`, `media.ts`.

- [x] P01 Local: profile welcome/edit display name, bio, general location and skill preference.
- [x] P02 Local: opt-in player discovery, private provider email and account status handling.
- [ ] P03 Pending: native image picker, circular crop preview, save/retry/replace/remove.
- [ ] P04 Pending: single sharing choice across Players/games/groups; default private.
- [ ] P05 Pending: require saved photo before sharing; removal disables sharing atomically.
- [ ] P06 Pending: authorized private avatar loading, initials fallback and cache revocation.
- [ ] P07 Partial (provider list and logout/all sessions implemented; linking UI pending): linked providers, logout/all sessions and reauthentication controls.
- [x] P08 Local: account deletion confirmation, recent auth, owned-group archival requirement
  and server lifecycle cleanup. No disabled ownership-transfer feature.
- [ ] P09 Partial (privacy/terms/help links implemented; photo/account policy presentation pending): current privacy, terms, Help & safety and support access from account.

## 5. Players and direct invitations

Source: `Players`, `InvitePlayer`, `PlayerSafetyActions`, `GamePlayerInvites`;
`players.ts`, `player-game-invitations.ts`, `player-search-location.ts`.

- [x] L01 Local: opt-in Players directory, name/city/ZIP-general-area search and pagination.
- [ ] L02 Partial (text details and three-dot menu; authorized avatars pending): avatar/name/location/bio/skill presentation, compact wrapping and accessible menus.
- [ ] L03 Partial (Players invitation picker implemented; game-detail picker pending): Invite to game picker from player result and from game detail.
- [x] L04 Local: server-authorized eligible games/invitees, duplicate/limit/full/blocked handling.
- [ ] L05 Pending: recipient invitation inbox, request place and host approval (no capacity reserved).
- [x] L06 Local: Block/Report under three-dot menu; unblock/manage blocked list.

## 6. Personal feed and My Games

Source: `PersonalFeed`, `MyGames`, `my-games.ts`, `games.ts`.

- [ ] M01 Partial (signed-in feed filters implemented; Your Groups rail pending): signed-in All / My Groups / My Games feed filters and Your Groups rail.
- [x] M02 Local: My Games Upcoming, Requests, Waitlisted, Past and Cancelled views.
- [ ] M03 Partial (basic status labels implemented; full status mapping pending): organizing/going/pending/rejected/removed/withdrawn/left/expired status labels.
- [x] M04 Local: correct pagination, refresh/resume and empty/error recovery for each view.
- [x] M05 Local: waitlist position/offered deadline, accept place and leave queue actions.

## 7. Game creation, participation and management

Source: `CreateGame`, `GameDetails`, `GameParticipation`, `GameGuests`, `GameSettings`,
`HostWaitlist`, `GameSharing`; current `game-*` backend handlers.

- [ ] G01 Pending: existing court picker with signed selection token and eligible access rules.
- [ ] G02 Pending: validated manual-court location without adding to court catalog.
- [ ] G03 Pending: title, public/unlisted/group visibility, date/time/IANA zone, duration,
  format, court count, effective capacity, skill preference, notes and acknowledgements.
- [ ] G04 Pending: stable create request UUID across ambiguous retries; future/DST error recovery.
- [ ] G05 Pending: join/request, pending state, withdraw/leave with optional private host reason.
- [ ] G06 Pending: current group member instant join vs public outsider host approval rules.
- [ ] G07 Pending: participants, host requests/review/approve/reject/remove and cancellations.
- [ ] G08 Pending: host attendance independent of game continuation; current privileged controls.
- [ ] G09 Pending: guest request/cancel, independent approve/reject and current privileged guest rules.
- [ ] G10 Pending: capacity edits with current reservations, guest totals, conflicts and refresh.
- [ ] G11 Pending: approved-member group waitlist join/leave, FIFO positions and expiring offers.
- [ ] G12 Pending: host queue, offer acceptance/reserved-place errors and authoritative refresh.
- [ ] G13 Pending: game edit/cancel confirmations and currently authorized manager controls.
- [ ] G14 Pending: unlisted links, revoke/share, recipient-specific/forwardable distinction,
  expiry and sign-in return with server access revalidation.
- [ ] G15 Pending: direct invitations and available invitation limit/count/error states.

## 8. Groups, My Groups and permissions

Source: `Groups`, `GroupDetails`, `GroupFieldsForm`, `GroupInvitations`, `GroupInvitation`;
`groups.ts`, `group-invitations.ts`, `group-game-access.ts`.

- [x] R01 Local: My Groups active/pending membership, role and archived state.
- [ ] R02 Pending: create/edit name, public description, member description, location, skill,
  public/private visibility and optimistic version.
- [ ] R03 Pending: public group cover upload/replace/remove with explicit public-photo semantics.
- [x] R04 Local: membership request/cancel/leave and owner-archive restrictions.
- [ ] R05 Pending: member search/pagination and staff membership request approve/reject/remove.
- [ ] R06 Pending: permanent Owner, one Co-owner, one Organizer, legacy role compatibility;
  only server-authorized assignments and manager controls.
- [ ] R07 Pending: Organizer own-game authority, role loss/departure and transferred game handling.
- [ ] R08 Pending: group invitations/link preview/accept/revoke with expiration/error states.
- [ ] R09 Pending: archive confirmation and immediate private-content revocation.
- [ ] R10 Pending: public-to-private transition hides outsider event data/participation on refresh.
- [ ] R11 Partial (member description/count available; discussion screens pending): member-only group details/discussions distinct from discoverable previews.
- [ ] R12 Pending: create group game using current permission and visibility contracts.

## 9. Recurring games and series management

Source: `ManageSeries`, `CreateGame`, `functions/lib/game-series.ts`.

- [ ] S01 Pending: 2–12 weekly occurrences, local wall time, IANA/DST and 180-day constraints.
- [ ] S02 Pending: occurrence list with individual dates, capacities, exceptions and status.
- [ ] S03 Pending: single/future reschedule or cancellation, preserve-exceptions controls.
- [ ] S04 Pending: preview affected dates/skips before applying with planHash and request UUID.
- [ ] S05 Pending: conflict requires new preview; never recreate memberships/invitations/attendance.
- [ ] S06 Pending: independent invitations/requests/attendance/guests/waitlists per occurrence.

## 10. Game chat and shared series chat

Source: `GameChat`, `ChatDialog`, `ChatCases`; `game-chat.ts`, `series-chat.ts`,
`chat-moderation.ts`, migrations 0027–0030.

- [ ] H01 Pending: native dialog, authorized participants/invitees and shared group-series rooms.
- [ ] H02 Pending: chronological text/avatar/initials, current user/system-message distinctions.
- [ ] H03 Pending: initial latest-message positioning, earlier-message pagination without jumps,
  send scroll behavior and keyboard avoidance.
- [ ] H04 Pending: unread indicator, read cursor, mute/unmute and inbox integration.
- [ ] H05 Pending: stable message clientId for retries, rate errors and empty/offline recovery.
- [ ] H06 Pending: live access revocation/block/removal, canSend and expired/read-only state.
- [ ] H07 Pending: game retention/send windows, series rolling retention/inactivity and staff
  exceptions from server responses; reading does not renew activity.
- [ ] H08 Pending: three-dot report actions and authorized moderation/evidence states.

## 11. Member-only group discussions

Source: `GroupDiscussions`, `ContentActions`, `ReportContent`; `group-discussions.ts`,
`GROUP_DISCUSSIONS.md`, migrations 0032–0033.

- [ ] T01 Pending: separate Discussions tab and viewer-visible count with growing badge.
- [ ] T02 Pending: compact posts, avatars/time and Owner/Co-owner/Organizer labels.
- [ ] T03 Pending: create/read/full-text/edit/delete own post with version conflict recovery.
- [ ] T04 Pending: one chronological reply level, recent-first loading and earlier pagination.
- [ ] T05 Pending: create/edit/delete own replies; post/reply length limits.
- [ ] T06 Pending: idempotent like/unlike on posts/replies; locked-thread restrictions.
- [ ] T07 Pending: per-thread follow/unfollow and default reply subscription behavior.
- [ ] T08 Pending: Owner/Co-owner content deletion and discussion lock/unlock.
- [ ] T09 Pending: three-dot own/other/privileged menus and explanation-required reporting.
- [ ] T10 Pending: membership/block/archive/deletion access changes clear content immediately.
- [ ] T11 Pending: staff post announcements/reply notifications reuse current Groups preferences;
  ordinary posts/likes do not broadcast; native destinations revalidate access.

## 12. Notifications and native delivery

Source: `Notifications`, `NotificationBell`, `HostNotifications`, `PushSettings`,
`NOTIFICATION_ARCHITECTURE.md`, current push/inbox/sender handlers.

- [ ] N01 Pending: in-app inbox/unread badge, read/read-all and authorized destinations.
- [ ] N02 Pending: game/group/member/guest/invitation/waitlist/chat/discussion event rendering.
- [ ] N03 Pending: foreground/resume polling, access-denied/removal and stale notification recovery.
- [ ] N04 Pending: shared Games/Groups preference semantics, device list and unregister controls.
- [ ] N05 Pending: native APNs registration endpoint, per-install/session ownership and lifecycle.
- [ ] N06 Pending: server APNs sender adapter using existing events/queue/outcome semantics.
- [ ] N07 Pending: permission prompt from user action, denial/settings and notification delegate.
- [ ] N08 Pending: generic lock-screen copy, closed-app receipt, tap routing and account switch cleanup.
- [ ] N09 Pending: authenticated native deep/universal links; links never grant membership/access.

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

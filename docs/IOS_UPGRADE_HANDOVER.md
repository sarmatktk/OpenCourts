# Existing iOS app upgrade — November 21, 2026

Status: **partial local implementation; not ready for release**. Website parity is
not complete. No Xcode build, simulator run, native sign-in or APNs delivery verified.

## Latest local implementation batch

Use [IOS_FEATURE_PARITY_CHECKLIST.md](IOS_FEATURE_PARITY_CHECKLIST.md) as the
feature-by-feature implementation tracker. Its checked Local items indicate source
implementation only; every Xcode/simulator/iPhone acceptance gate remains open.
Earlier work was performed without a Mac/Xcode. The user is now moving continuation
to a MacBook; establish the first real Xcode build and simulator baseline there.

New source in this batch extends the existing app with:

- Game search: all locations or city/area/ZIP/current selected court-search location,
  5/10/25/50 miles, device-calendar date, singles/doubles and skill filters/reset.
  Applied filter snapshots persist through pagination; search edits do not silently
  change a cursor's meaning. DST date boundaries use calendar days, not 24-hour arithmetic.
- All feed, signed-in My Groups/My Games feed filters, public-group event lists,
  native sharing of public URLs, Apple Maps display and directions. Private group
  previews never expose member lists/discussions anonymously.
- Development native sign-in via the existing web Google/Apple OAuth flow inside
  Apple's authentication browser, followed by a PKCE-bound one-use code exchange.
  The app never copies the browser's cookie or accepts an unverified provider token.
  Implementation follows Apple's [authentication browser guidance](https://developer.apple.com/documentation/authenticationservices/authenticating-a-user-through-a-web-service)
  and [SwiftUI authentication session API](https://developer.apple.com/documentation/authenticationservices/webauthenticationsession/).
- Native sessions reuse `auth_sessions` with `client_type=ios` and the same player
  IDs. Browser identity issuer/subject validation is reused, so no native provider
  App ID/audience remapping was invented. Direct native Apple credential sign-in and
  explicit provider-linking UI are still absent. Real Google/Apple sign-in is unverified.
- Keychain storage with WhenUnlockedThisDeviceOnly, ephemeral cookie-free native
  networking, expiry checks, logout/logout-all and recent-auth account deletion.
  There is no refresh-token protocol: expiry requires sign-in again. Native session
  expiry/sign-in age inherit the source session, preserving recent-auth restrictions.
- Native account/profile editing: display name, bio, general location, skill and
  discoverability; connected provider list and current privacy/terms/help/support links.
- Players: name/location/skill search, pagination, game-invitation picker/send,
  three-dot Block/Report, written report reasons, blocked list/unblock. Authorized
  avatar rendering/photo upload and moderator screens remain pending.
- My Groups: current memberships/requests/role/archive labels, authorized member
  description and discussion count, request/withdraw/leave controls. Full group
  creation/management/roles/invitations/discussions are still pending.
- My Games: Upcoming/Requests/Waitlisted/Past/Cancelled, paging, offer deadline/
  position, accept offer/leave waitlist. Full status-label mapping and game creation,
  participation, host management, guests and series management are still pending.
- Authenticated discovery uses the native credential rather than silently reading
  anonymously. Invalid/expired native credentials fail closed. Private lists clear
  on background/disappearance; generation/token checks reject obsolete responses.

### Native development backend preparation

`functions/lib/native-auth.ts` and local-only migration
`0034_native_auth_development.sql` are prepared, **not remotely applied or deployed**.
They add expiring grant records referencing shared sessions, not separate accounts.
The authorize page has fixed callback `opencourts-ios://auth/complete`, browser binding,
exact Origin/CSRF checks, CSP/no-referrer/no-store and bounded creation. Only a random
short-lived code appears in the callback URL; bearer credentials appear only in the
PKCE exchange response. Exchange inserts/consumes atomically, rejects replay, verifies
active source session/account, and preserves the original sign-in time and expiry.

Issuance requires `NATIVE_AUTH_DEVELOPMENT_ENABLED=true`, current community environment
guards and localhost HTTP or the exact stable feature Preview origin. Production/main
are unconditionally rejected. The flag is not configured anywhere in this change.
Existing browser auth remains cookie/CSRF based; web tokens cannot be used as native
bearer credentials and native tokens cannot be used as browser cookies. Native bearer
reads/writes still use shared authorization and CSRF checks.

Debug defaults to isolated stable Preview. An Xcode scheme environment variable
`OPENCOURTS_NATIVE_API_ORIGIN` may select HTTP localhost/127.0.0.1 with a port; production
and arbitrary remote origins are rejected. Native sign-in/writes are compiled out of
Release during integration. No signing, URL-type registration, entitlements, bundle
identifier or store configuration was changed. The authentication browser captures
its callback; general native deep-link routing remains pending.

Local preparation when a Mac/backend is available: inspect the local migration runner,
apply migrations to local development SQLite only, enable the native development flag
in an ignored local environment, run the development backend and select its loopback
origin in the Debug scheme. Verify the actual binding before any remote activation.
App Transport Security and physical-phone networking require Mac/device review; this
change adds no global insecure-load exception. Stable Preview remains disabled until a
separately reviewed development migration/configuration/deployment is authorized.

### Latest verification

- Full unit suite: **482/482 passed across 30 suites**, including 12 native-auth
  security tests with real SQLite transactions/migrations and shared-auth regressions.
- Production website/backend build passed; existing bundle-size warning remains.
- Swift frontend syntax parsing passed for all five new/changed native Swift files.
  This does not type-check SwiftUI/Security/AuthenticationServices or prove an iOS build.
- `git diff --check` passed. No production/user-account write or real provider
  sign-in occurred. Prior Android/store/blueprint work remains untouched.
- No simulator/UI/native contract execution, photo uploads, APNs receipt, keyboard,
  theme, accessibility or physical-device checks were performed. All remain release gates.

The baseline/initial sequence below is historical. In particular its statements that
there is no native source/endpoint describe the original checkout, not this local batch.

## Repository and preservation baseline

- Native source is `ios-app/` in the website repository, branch
  `feature/play-together`, tracking `origin/feature/play-together`.
- Initial intentional changes: Android README, Gradle source, release AAB, device
  acceptance document, store assets, screenshot script, and
  `docs/PLAY_TOGETHER_IOS_BLUEPRINT.md`. These were left untouched.
- No AGENTS.md found in the repository inventory. No separate iOS checkout found
  among sibling projects. Verify the Mac working tree before bringing these changes over.
- SwiftUI root: `ios-app/ios-app/MyApp.swift` -> `ContentView`. Existing responsive
  phone/expanded layouts, header, floating court-search navigation, system fonts,
  brand palette and light/dark surfaces are retained.
- `OpenCourtsStore.swift`: Observation/MainActor store, Core Location, MapKit,
  court/weather/rain loading and caching. `OpenCourtsAPI.swift`: existing actor and
  URLSession networking. Models include international country/weather metadata;
  the older international README describes some gaps already implemented in source.
- No native authentication, Keychain session, account screens, community screens,
  notification delegate, APNs entitlement/registration, or native deep-link router
  was present before this change. StoreKit usage is review prompting, not memberships.
- Shared Xcode scheme: `ios-app`; project uses `project.xcproj`, not a conventional
  project.pbxproj. Its folder entry assigns `ios-app/` to the target. New Swift
  files are in that folder; confirm actual target membership in Xcode.
- Target has iOS 17 deployment minimum; project-level defaults and scheme metadata
  were authored by a newer Xcode. Discover installed Xcode compatibility on Mac.
  The Run action currently selects **Release**: choose Debug explicitly for Preview.
  Signing, team, bundle ID `us.opencourts.ios`, versions and store settings unchanged.

## Gap assessment and implementation order

1. Public discovery: first local slice implemented below; validate on Mac.
2. Native identity transport: required before authenticated Swift requests. Design
   an authorization-code/PKCE exchange, single-use callback, provider audience/nonce
   validation, Apple subject association, explicit provider linking, session expiry,
   refresh/revocation and Keychain storage against the existing account IDs. Current
   browser cookies are not a native token exchange. No endpoint has been invented
   or security checks relaxed. Provider/signing configuration changes require approval.
3. Account: adult eligibility, current terms/privacy consent, profile, saved-photo
   upload/crop/removal, single explicit sharing preference, provider linking,
   logout/all sessions, deletion with recent authentication and owned-group checks.
4. Games: signed-in feed/search/My Games/Waitlisted, creation/court selection,
   invitations/unlisted access, participation/requests, organizer attendance,
   guests/separate approval, capacity, queue/offers and cancellations. Use current
   server permissions and reservations; keep request UUIDs across ambiguous retries.
5. Groups: previews vs member access, membership requests/invitations, permanent
   Owner and assigned Co-owner/Organizer permissions, archive, weekly series and
   preview/apply schedule editing. Present affected dates and recover from 409 with
   a new preview. Do not create local memberships or auto-enroll series attendees.
6. Chat/discussions/safety: server-authorized rooms, pagination, unread/read/mute,
   system messages, retention/inactivity, member-only posts/replies/likes/follow,
   current role labels and native three-dot menus. Add reporting with explanations,
   blocking and server-authorized moderation. No local role inference grants authority.
7. Notifications: authenticated native inbox/destination routing, then APNs
   registration and server sender adapter using existing events/preferences. Native
   APNs is absent; current Web Push delivery is not native delivery evidence.
8. Full simulator, two-account and physical-device acceptance; release review.

## Changes implemented locally

- Existing header adds a 44pt accessible Play Together icon, used by phone and
  expanded layouts. Opens a dismissible SwiftUI navigation sheet with inherited
  accent/system fonts/surfaces. Existing court navigation is unchanged.
- `ios-app/ios-app/CommunityAPI.swift`: typed public game/group contracts, GET-only
  actor, ephemeral URLSession without shared cookies or persistent cache, timeout,
  sanitized errors, opaque cursor encoding and validated detail UUIDs.
- Debug calls stable isolated Preview; Release uses existing production domain for
  anonymous reads only. There are no community write methods or provider secrets.
- `PlayTogetherView.swift`: upcoming games within 25 miles of current selected court
  search location, group search by name/location, explicit pagination/deduplication,
  loading/empty/error/retry/refresh, game details and limited group previews.
- API detail reads recheck access; navigation does not simply trust a cached row.
  Lists/details clear on background and refresh on return; request generations prevent
  older results replacing newer results. No private media is fetched or cached.
- Game dates decode fractional or whole-second ISO instants and render in the
  game's IANA zone. Capacity is the effective API value, never calculated from
  format/court count. No assertion that capacity guarantees a place/reservation.
- Authenticated features are explicitly described as unavailable in this build;
  there are no simulated join/member/chat/push actions or embedded website replacement.

## Current backend dependencies and source of truth

Read all six requested documents together with current source. Latest November 21
entries supersede older Preview-only/pending entries, including entries appended
later in files whose newest release information is at the top. Shared production
schema is through 0033. This local work did not inspect or mutate remote resources.

| Area | Current dependency |
| --- | --- |
| Implemented game discovery | GET `/api/games?lat=&lon=&radius=25&cursor=` -> games/nextCursor; GET `/api/games/:id` -> game. `functions/lib/games.ts`, `src/game-api.ts`. Standalone public and public-group events are discoverable. |
| Implemented group previews | GET `/api/groups?q=&before=` -> groups/next; GET `/api/groups/:id` -> group/archived. `functions/lib/groups.ts`. Both private/public groups expose only permitted previews; member content is distinct. |
| Identity/account | `functions/lib/auth.ts`, current account/media handlers. Exact Origin/CSRF and active-session checks; provider identity matching is issuer+subject, never email matching. |
| Attendance/guests | `game-participation.ts`, `game-guests.ts`, `game-waitlist.ts`; current server rules include independent host attendance, privileged guests and reserved offers. |
| Groups/series | `groups.ts`, `game-series.ts`, `group-invitations.ts`; inspect actual exported payloads before Swift models are added. |
| Chat | `game-chat.ts`, `series-chat.ts`, migrations 0027–0030 and `game_chat_context`. Group series routes share one room; standalone game rooms are separate. |
| Discussions/photos | `group-discussions.ts`, `media.ts`, migrations 0032–0033; current `GROUP_DISCUSSIONS.md` plus newest photo-sharing handoff entries. |
| Inbox/push/moderation | `NOTIFICATION_ARCHITECTURE.md`, current notification/push handlers, `chat-moderation.ts` and discussion moderation handlers. |

Important current contracts for subsequent implementation:

- Games use ISO timestamps; chat/inbox/offer expiry use epoch milliseconds.
- Chat access is richer than confirmed attendance: valid invitees can access eligible
  single-game rooms; rejections/removal/blocks can revoke it. Single-game sending
  closes after the applicable end window; take canSend/expiresAt from responses.
- Group series chat requires active group membership; staff exceptions are evaluated
  live. Ordinary participant inactivity is 30 days based on join/message/qualifying
  attendance; reading/muting does not renew activity. Series messages have a rolling
  30-day window subject to evidence holds. System messages are distinct from user text
  and must not create fabricated unread counts. Never implement cleanup in Swift.
- Discussions require active membership even for public groups. Posts allow 4000
  characters, replies 2000; optimistic versions, locked state, permissions and likes
  remain server-authoritative. Owner/Co-owner moderation is distinct from Organizer.
- Photo sharing is one optional choice across Players/games/groups; saved photo is
  required, removal disables it, and authorization/blocks apply to each private read.
- Staff post announcements reuse Groups preferences; ordinary posts and likes do
  not broadcast. Current push receipt evidence does not establish APNs support.
- Adult-only account creation, recent-auth deletion and owned-group archival rules
  must be implemented from current handlers, not historical transfer-ownership copy.

## Validation and remaining release gates

Completed here: Swift frontend syntax parsing of the new API/view and changed
ContentView; `git diff --check`. Syntax parsing does not resolve SwiftUI types or
prove a working iOS build. Windows Swift type-check attempt fails before source
checking because its C runtime SDK cannot find stdlib.h/SwiftShims. No simulator,
Apple SDK or Xcode is available on this Windows host. No native UI tests passed here.

On Mac, inspect status and local instructions before applying changes. Discover
actual destinations rather than assuming a simulator name:

```sh
xcodebuild -list -project ios-app/ios-app.xcodeproj
xcodebuild -showdestinations -project ios-app/ios-app.xcodeproj -scheme ios-app
xcrun simctl list devices available
# Substitute an available simulator UUID after inspecting the commands above:
xcodebuild -project ios-app/ios-app.xcodeproj -scheme ios-app -configuration Debug \
  -destination 'platform=iOS Simulator,id=<available-uuid>' CODE_SIGNING_ALLOWED=NO build
```

If installed Xcode cannot read project.xcproj, use a compatible Xcode/project export
workflow while preserving target settings; do not replace the app or signing identity.
No test target exists yet; add meaningful contract/state and UI tests on Mac when
native authentication and authenticated screens are implemented.

Simulator acceptance still required:

- Existing Map/Courts/Dry Courts/Weather/search/filter/directions baseline, US and
  international locations, selected location retained after closing community sheet.
- Public games/groups/details, private-group preview boundaries, cancelled/archived
  items, pagination/empty/malformed/503/timeouts, access-change errors, rapid switches,
  background/resume, stale request cancellation, game/device time-zone differences.
- Light/dark, 320/375pt small screens, large Dynamic Type, VoiceOver labels/order,
  44pt actions, modal dismissal and keyboard search. Inspect actual rendered UI.
- After authenticated implementation: two-account membership removal/block/revocation,
  capacity races/guests/waitlist expiry, DST series preview/apply conflicts and access
  removal clearing all private state. No production QA writes are authorized.

Physical iPhone gates (not performed): real Apple/Google sign-in and return routing,
account switching/revocation/deletion recent-auth, photo picker/HEIC/orientation/crop/
upload/sharing removal, APNs allow/deny and receipt with app closed, notification taps
after access revocation/logout, unread sync, chat latest/earlier scrolling and keyboard
avoidance/send control visibility, VoiceOver and smallest supported screen in both themes.

Release steps: finish unchecked/partial checklist items, build/run/accept on Mac and physical iPhone, verify isolated
development backend and native provider mapping, approve any required provider/APNs/
association configuration separately, review security/privacy/retention, document rollback
and exact tested build. **Ask before TestFlight/App Store upload.** No deployment or remote database
migration occurred. Secrets, signing identities, bundle identifiers and store configuration are unchanged.

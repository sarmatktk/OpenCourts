# OpenCourts: continue the existing iOS upgrade on Mac

Handoff prepared November 21, 2026. Read this first in the Mac checkout.

## Instruction from the owner: delete this README after reading

**Mac assistant: after reading this file and the durable tracking documents below,
delete only `README_MAC_XCODE_CONTINUE.md` from the Mac working tree, then continue
the upgrade.** The owner explicitly requested this deletion; no further permission
is needed. Do not delete it in the Windows checkout before the handoff is pushed.
Keep the feature checklist and handover documents; update those as work proceeds.
Include this temporary README's deletion in a subsequent normal commit when ready.

## Goal and constraints

Extend the existing native SwiftUI OpenCourts app to match the website's current
functionality, including Play Together. Preserve its appearance, palette, themes,
typography, existing navigation, court search/maps/weather, account identity and
other features. Add native screens/controls that fit the current app. Do not replace
it with an Expo/React Native scaffold, web wrapper or redesigned application.

Work through **all unchecked and Partial items** in the feature checklist one by
one. Source implementation and verified acceptance are separate. Do not mark a
screen complete merely because it exists, builds or displays placeholder controls.

Preserve intentional uncommitted changes in the Mac checkout. Never change
production databases, Cloudflare secrets, signing identities, bundle identifiers
or store configuration without explicit approval. Never request secrets in chat.
Ask before uploading to TestFlight or the App Store. The owner chose to continue
on a Mac; Expo setup is not required or implemented.

## Retrieve and inspect the branch

Repository: `https://github.com/sarmatktk/OpenCourts.git`

Continuation branch: **`feature/play-together`**, not `main`.

In an existing checkout, inspect before switching or pulling:

```sh
git status --short --branch
git remote -v
git branch --show-current
git fetch origin
```

With a clean/compatible working tree, switch to `feature/play-together` and use
`git pull --ff-only origin feature/play-together`. If that local branch does not
exist, create it tracking `origin/feature/play-together`. Resolve local divergence
without `reset --hard`, `clean`, or discarding work. A fresh clone can select the
branch directly:

```sh
git clone --branch feature/play-together https://github.com/sarmatktk/OpenCourts.git
cd OpenCourts
```

Read applicable `AGENTS.md` instructions if present in the Mac checkout. The Windows
checkout also has intentional Android Gradle/AAB/store-assets/screenshot changes;
they are outside this iOS handoff commit and must not be discarded or reconstructed.

## Read durable context before deleting this file

1. `docs/IOS_FEATURE_PARITY_CHECKLIST.md` — complete feature inventory/status and
   separate simulator/device/release gates. This is the ongoing work queue.
2. `docs/IOS_UPGRADE_HANDOVER.md` — latest local implementation, architecture,
   authentication contract, isolation, evidence and known limitations.
3. `ios-app/README.md` — native entry point and historical international handoff.
4. The six website references: `docs/PLAY_TOGETHER_IOS_BLUEPRINT.md`,
   `docs/PLAY_TOGETHER_HANDOFF.md`, `docs/PLAY_TOGETHER_TEST_RESULTS.md`,
   `docs/PLAY_TOGETHER_RELEASE_CHECKLIST.md`, `docs/NOTIFICATION_ARCHITECTURE.md`,
   and `docs/GROUP_DISCUSSIONS.md`.

Chronological files are not uniformly sorted. Current code and newest verified
release evidence supersede historical Preview-only/pending entries. Website schema
through 0033 is documented as released; **0034 is new local preparation only**.
No native-auth development activation, remote migration or production rollout was
performed for this upgrade. Do not treat a Git push as proof of backend activation.

## First Mac task: establish a real Xcode build

```sh
xcodebuild -version
xcode-select -p
xcodebuild -list -project ios-app/ios-app.xcodeproj
xcodebuild -showdestinations -project ios-app/ios-app.xcodeproj -scheme ios-app
xcrun simctl list devices available
open ios-app/ios-app.xcodeproj
```

Use an available compatible simulator destination, not a guessed model/OS:

```sh
xcodebuild -project ios-app/ios-app.xcodeproj -scheme ios-app \
  -configuration Debug \
  -destination 'platform=iOS Simulator,id=<discovered-simulator-uuid>' \
  -derivedDataPath /tmp/opencourts-ios-derived-data \
  CODE_SIGNING_ALLOWED=NO build
```

The shared scheme is `ios-app`. **Its Run action currently selects Release**;
choose Debug in Xcode's Edit Scheme > Run for development. The existing project
contains `project.xcproj` rather than conventional `project.pbxproj` and was authored
by a newer Xcode. Verify actual Xcode compatibility/project parsing. If necessary,
repair/export the project while preserving target settings and source; do not
rebuild the application or silently change its signing identity.

The target's iOS deployment minimum is 17; newer project-level defaults also exist.
Keep bundle ID `us.opencourts.ios`, team/signing settings, versions and store identity.
The `ios-app/` folder entry should include the new Swift files automatically; verify
target membership in Xcode. Fix SwiftUI/Concurrency/AuthenticationServices/Security
compile errors before implementing more unvalidated screens. Run in the simulator
and inspect actual UI; Windows syntax parsing did not type-check these frameworks.

## Current implementation and source map

- `ios-app/ios-app/MyApp.swift` -> `ContentView.swift`: original responsive court app.
  Header now opens Play Together; original court navigation remains.
- `ios-app/OpenCourtsStore.swift`, `OpenCourtsAPI.swift`, `Models.swift`: existing
  location/court/weather/rain behavior, including international metadata/routing.
- `ios-app/ios-app/CommunityAPI.swift`: public game/group models, filter contracts,
  public GET transport and native-auth routing when signed in.
- `PlayTogetherView.swift`: public/filtered discovery, feed filters, group previews/
  events, details, native sharing and Apple Maps actions.
- `NativeAccount.swift`: development authentication-browser + PKCE code exchange,
  Keychain sessions, account/profile editing, logout/all and account deletion.
- `NativeCommunityLists.swift`: Players search/invite/block/report, My Groups and
  request/leave/member details, My Games views and accept/leave waitlist actions.
- `functions/lib/native-auth.ts`, modifications in `auth.ts`, and
  `functions/db/migrations/0034_native_auth_development.sql`: development-only shared
  identity/session exchange; `tests/native-auth.test.ts` verifies the security boundary.

Full game creation/participation/host/guest controls, group administration/roles/
invitations, series management, avatar/photo upload/sharing, chats, discussions,
inbox/moderation/APNs and remaining account/linking work are **not finished**.
Follow the checklist rather than assuming the named screens provide full parity.

## Authentication and development environment

Never test development writes against `https://opencourts.us`.

Debug defaults to stable isolated Preview:
`https://feature-play-together.opencourts.pages.dev`.
Native endpoints there remain unavailable until the new source/schema/flag have
been explicitly configured in development. No production native authentication
support is enabled; native writes/sign-in are compiled out of Release.

The new native exchange requires `NATIVE_AUTH_DEVELOPMENT_ENABLED=true`, existing
community environment guards and localhost HTTP or the exact stable Preview
origin. Production/main are explicitly forbidden. It reuses browser-verified
Google/Apple issuer/subject identities and shared `auth_sessions` with
`client_type=ios`. Do not introduce duplicate memberships/conversations/accounts.

Browser authorization uses a bound expiring grant and fixed callback
`opencourts-ios://auth/complete`. The app validates callback state and redeems the
one-use code with its PKCE verifier. Tokens remain in Keychain, never URL parameters,
UserDefaults, logs, Git or chat. Existing exact Origin/CSRF and access checks remain.
Expiry requires signing in again; no refresh-token protocol exists. Direct native
provider-token sign-in, provider-linking UI and general deep-link routing are pending.

For local backend work, use the guarded commands from the repository root:

```sh
npm ci
npm run dev:db:migrate
npm run build:dev
npm run dev:pages
```

Inspect `scripts/dev-environment.mjs` and `development/wrangler.local.json` first.
The runner applies migrations **locally** to `.wrangler/play-together-local` using
placeholder database ID `00000000-0000-0000-0000-000000000001`; never append `--remote`.
It currently does not bind the new native-development flag: add an explicit local-only
binding/configuration when implementing local native-auth testing, rather than
assuming an exported shell variable enables Pages Functions. Keep credentials in
ignored local configuration and use approved provider callback origins.

For simulator-local API access, add Debug scheme environment variable
`OPENCOURTS_NATIVE_API_ORIGIN=http://127.0.0.1:8788`. The native client accepts only
loopback HTTP or stable feature Preview as development origins. Inspect ATS behavior
and use narrowly scoped development configuration if necessary; do not add a global
insecure-load exception. `OpenCourtsAPI` still uses the existing public hosted
court/weather services for anonymous reads. Native community reads/writes use the
selected isolated development origin.

Apple sign-in requires HTTPS; provider configuration/callback availability must be
verified. A physical iPhone's localhost is the phone, not the Mac. Plan an explicitly
isolated HTTPS development route for device authentication; changing production
settings or silently weakening allowed origins is not a solution. Obtain approval
before remote development migration/config/deployment or signing/provider changes.

## Existing evidence and required new testing

Last verified on Windows: **482/482 unit tests across 30 suites**, including 12
native-auth SQLite/security tests; production website/backend build passed; Swift
frontend syntax parsing and `git diff --check` passed. Existing bundle-size warning
remains. Windows Swift type-checking failed on missing C runtime SDK/SwiftShims.
**No iOS compilation, simulator or physical-iPhone pass exists yet.**

After relevant changes on Mac:

```sh
npm test -- --run
npm run build
git diff --check
```

Add meaningful native contract/state/UI tests and record actual simulator results.
Verify both themes, small screens, Dynamic Type, VoiceOver and touch targets. Keep
original US/international court search, maps, filters, directions, weather, alerts,
rain estimates, caching and background/resume behavior working.

Use isolated synthetic accounts for shared-product acceptance: capacity/guest races,
group membership/role removal, blocking, series DST/conflicts, offer expiry and
private-state clearing on access/session changes. Backend permissions are authoritative.

Physical iPhone gates: real Google/Apple sign-in/linking/return routing; photo
picker/crop/upload/sharing/removal; chat latest/earlier scrolling and keyboard/send
visibility; permission handling and notifications with the app closed; notification
destinations after logout/revocation; light/dark/small-screen/VoiceOver review.
Website Web Push is not native APNs; the APNs adapter/registration remains pending.

## Continue now

Read the durable documents, **delete this temporary README on the Mac**, build the
existing app in Debug, fix compile/runtime issues, and continue unchecked/Partial
features in dependency order. Update the checklist and handover after every batch
with changes, API dependencies, actual tests, remaining gaps and release steps.
Do not stop at discovery screens or describe website parity as complete prematurely.

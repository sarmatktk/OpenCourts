# Phase 1: Google and Apple authentication

> **Historical feature record.** The Preview-only status below is from the
> original implementation period and is superseded: the owner confirmed Google
> and Apple sign-in work on the Production website and native iOS app. Preview's
> full provider callback was not separately confirmed. Follow
> [`DEPLOYMENT_ARCHITECTURE.md`](DEPLOYMENT_ARCHITECTURE.md) and
> [`DEPLOYMENT_WORKFLOW.md`](DEPLOYMENT_WORKFLOW.md) for current deployment
> instructions; keep the dated implementation and test evidence below as history.

Approved scope: Google and Apple only; no passwords, email login or payments.
Implementation is deployed to the isolated development preview. Provider configuration
and start endpoints are verified; both actual Google and Apple logins are user-confirmed.
This is not a production release or native integration.
Read [the central reference](PLAY_TOGETHER.md) before changing behavior.

## Run locally

Use Node 24 (the auth SQL tests use built-in `node:sqlite`). PowerShell users may
need `npm.cmd` rather than `npm` because of script execution policy:

```powershell
npm.cmd run dev:db:migrate
npm.cmd run build:dev
npm.cmd run dev:pages
```

Visit http://127.0.0.1:8788/account. Without provider credentials, both options
are visibly unavailable; no fake login, developer account or authorization bypass
is shipped. Fast Vite mode can render the screen, but `/api/auth/*` explicitly tells
you to use Pages; it never forwards to a live API. Existing court browsing still works.

Local navigation update: `/play-together` is the community home, and the right-hand
account icon opens `/account`. All new sign-in/linking callbacks return to `/account`.
Both static HTML routes are exported by `build:dev`. This navigation change and
automatic-device-theme-only behavior are now deployed and browser-verified on Preview.

`build:dev` adds the Vite feature flag and emits `dist/play-together.html` and `dist/account.html`, since
the existing custom 404 disables Pages' automatic SPA fallback. Normal production
builds do not enable/export the account route. No root redirects were changed.

## Implementation

- `functions/db/migrations/0002_player_auth.sql`: four tables (`players`,
  `auth_identities`, `auth_sessions`, `auth_login_attempts`). Applied locally and,
  with explicit approval, to remote `opencourts-dev` only.
- `functions/api/auth/[[path]].ts` delegates to `functions/lib/auth.ts`.
- `oauth4webapi` handles OAuth response/code processing and signature/claim
  validation. `jose` signs Apple's short-lived ES256 client secret and encrypts
  Apple refresh credentials using authenticated encryption (A256GCM).
- Arctic was evaluated and removed when its July 2026 deprecation was discovered:
  https://arctic.pilcrowonpaper.com/ . It is not a runtime dependency.
- Session and state tokens are hashed in D1. OAuth state is atomically consumed,
  provider and browser bound, short-lived, nonce protected; Google additionally
  uses PKCE. Apple's HTTPS form_post uses a short-lived SameSite=None browser
  binding; the normal session cookie stays host-only HttpOnly/Secure/Lax.
- Seven-day sessions; sensitive linking/deletion requires a session established
  in the preceding 15 minutes. Logout and logout-all revoke server records.
- Discovery defaults off. Display name is required when completing a profile;
  bio, general area and self-reported skill are optional. Emails never appear in
  profile API projections. There is no public player-discovery endpoint yet.
- Provider linking requires an authenticated, CSRF-protected start and rechecks
  the exact initiating session on callback. It never merges by email, never moves
  an identity owned by someone else, and supports one identity per provider/player.
- Google recovery relies on Google; Apple recovery relies on Apple. Linking the
  second provider offers another way into the same account. No manual email-based
  recovery/merge or unlinking is implemented. A previously created duplicate
  account cannot currently be merged through the UI.
- Deletion requires typing DELETE plus recent authentication. Profile, identities,
  sessions and linked attempts cascade. Apple credentials are revoked before local
  deletion. If revocation cannot complete, deletion reports failure rather than
  silently claiming success. Future group/game schemas must extend deletion to
  transfer ownership/anonymize retained records before enabling those features.
- Expired/consumed login attempts and expired/revoked sessions are cleaned during
  sign-in starts. Consumed attempts remain briefly to enforce database-backed
  limits: 5 starts/browser/minute, 30 starts/requester/5 minutes. Requester IPs are
  hashed with a server secret, not stored raw. Shared IPs may encounter throttling.
  Production-grade edge limits and provider abuse handling need review before rollout.
- All private JSON is no-store, without wildcard CORS. Mutations require exact
  Origin and session CSRF tokens. No group/Pro roles are embedded in sessions.

## Implemented endpoints

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/auth/me` | Signed-out state or current own profile/CSRF/connected-provider names; never email/subject/hash |
| POST | `/api/auth/google/start`, `/api/auth/apple/start` | Same Origin; linking also requires current session/CSRF; returns provider URL |
| GET | `/api/auth/google/callback` | Valid state, binding cookie and signed token |
| POST | `/api/auth/apple/callback` | Same flow checks, form_post; main Lax cookie intentionally not required |
| PATCH | `/api/auth/me` | Current session, Origin and CSRF; profile allowlist only |
| POST | `/api/auth/logout`, `/api/auth/logout-all` | Current session, Origin and CSRF |
| DELETE | `/api/auth/me` | Current/recent session, Origin, CSRF, explicit confirmation; Apple revocation if applicable |

## Environment gates

API requires all of:

- `PLAY_TOGETHER_ENABLED=true`
- Local/development `COURTS_DB` binding
- `AUTH_ORIGIN` exactly equal to the request origin
- Local HTTP localhost/127.0.0.1 **or** HTTPS
  `feature-play-together.opencourts.pages.dev`
- Branch must not be `main`

The production apex and production Pages URL are rejected regardless of feature
flag. Immutable preview URLs are deliberately not login origins; use the stable
branch alias for callbacks and sign-in. Binding isolation must still be verified;
environment gates cannot inspect the database UUID through a D1 binding object.
Keep production credentials/configuration untouched.

## Provider setup procedure (completed for Preview; reference only)

The user configured provider resources and Preview secrets, then approved the remote
development migration and deployment. Both are completed; do not repeat setup or
rotate encryption keys unnecessarily. Future remote changes still need approval.
The preview-only setup procedure is retained below for reference:

1. Apply `0002_player_auth.sql` through the verified development-only config:

   ```powershell
   npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.remote.json
   ```

2. Google: register a development Web OAuth client and configure consent/test users
   as needed. Register exact callbacks:
   - `http://127.0.0.1:8788/api/auth/google/callback` for local testing.
   - `https://feature-play-together.opencourts.pages.dev/api/auth/google/callback`.
3. Apple: associate a web Services ID with the existing app's primary App ID under
   the same Apple developer team, enable Sign in with Apple and register the preview
   domain and exact return URL:
   `https://feature-play-together.opencourts.pages.dev/api/auth/apple/callback`.
   Create a scoped sign-in key, record Team ID/Key ID, and retain its PKCS#8 PEM
   securely. Apple sign-in is unavailable on local HTTP.
4. Set Preview-only variables `PLAY_TOGETHER_ENABLED=true`,
   `AUTH_ORIGIN=https://feature-play-together.opencourts.pages.dev` and the build
   variable `VITE_PLAY_TOGETHER=true`. Use `npm run build:dev` for the account HTML
   export. Review any preview-only build command change before saving it.
5. Set Preview-only Google/Apple secrets named in
   `development/auth.dev.vars.example`, plus `AUTH_RATE_LIMIT_SECRET`.
   Generate independent random server secrets; never reuse production secrets.
   `APPLE_TOKEN_ENCRYPTION_KEY` is 64 hex characters representing 32 random bytes.
   Keep this key backed up; changing it without re-encrypting stored credentials
   prevents Apple revocation until the player signs in with Apple again.
6. Reverify preview `COURTS_DB` UUID, then obtain deployment approval. Test both real
   providers, cancellation/errors, linking, logout/deletion and TWA browser return.

For local Google credentials only, copy `development/auth.dev.vars.example` to
ignored `.dev.vars` and fill it privately. Never put secrets in a `VITE_` variable.
Never paste the Apple private key or OAuth secrets into chat or tracked files.

## Cross-platform identity

OpenCourts player IDs are permanent account keys. Future group memberships and
subscription entitlements refer to that ID. Native iOS will verify provider proofs
on this backend, resolve the same identities and store device credentials in
Keychain; no native exchange/refresh endpoint is implemented in Phase 1.
Correctly group Apple web/native identifiers before launch. Google/Apple accounts
with different identifiers remain separate until explicitly linked while signed in.
Browser sessions are not shared with Swift automatically. Apple payments remain
entirely separate from sign-in and are not implemented.

## Validation and outstanding release work

- Real migration SQL, constraints and cascades exercised with local SQLite.
- Signed synthetic Google/Apple tokens exercise callback processing and signatures;
  provider HTTP requests are intercepted only in tests.
- Tests cover environment/Origin/CSRF, nonce/state/replay/browser binding, wrong
  signatures/issuer/audience/expiration, privacy projections, expiry/revocation,
  profile validation, duplicate-identity rollback, throttling, linking and deletion.
- Playwright covers both themes, profile edits, small layouts, unavailable providers,
  deletion confirmation, live theme switching and clearing an expired account.
  Four Windows/Chrome visual baselines are stored next to the browser test.
- New UI uses existing tokens/components. The tennis-ball mark is extracted unchanged
  for reuse. Theme state is centralized in `src/useTheme.ts`, retaining system mode
  and automatically following live device preferences. Manual theme controls and
  persisted overrides were subsequently removed at the user's request.
  The account page derives muted text from existing text/surface tokens to improve
  small-text contrast without changing the court page's palette.

Verified November 17, 2026: remote `0002_player_auth.sql` applied; deployment
`https://b6ce4ae4.opencourts.pages.dev` succeeded. Stable alias account page and
`GET /api/auth/me` return HTTP 200; both providers are available, and both POST start
routes return their expected provider hosts/exact callback URLs. Encryption-key
parsing now accepts surrounding clipboard whitespace; the Apple encrypted-token
test covers a trailing CRLF. Production deployment and D1 binding unchanged.

Test at https://feature-play-together.opencourts.pages.dev/account .
Pending: actual Google/Apple login with credentials; native/installed TWA and Mobile
Safari device tests; independent security/accessibility review; provider account
change notifications; production privacy-policy update before collecting live user
data; additional abuse protection before public rollout. No production rollout is
approved. Dependency audit also reported an existing critical MapLibre sanitizer
advisory (`GHSA-jrc7-96c5-q579`, installed 5.x); fix requires separate assessment of
a major map-library upgrade before public account rollout. New auth packages had
no runtime advisories in that audit. No unrelated dependency upgrade was attempted.

References:
- https://github.com/panva/oauth4webapi
- https://github.com/panva/jose
- https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/
- https://developer.apple.com/support/offering-account-deletion-in-your-app/

Latest preview: https://36f69d2d.opencourts.pages.dev (November 17, 2026).
Community home is `/play-together`; accounts are `/account`. Safe callback failure
categories are deployed; Google is user-verified, Apple retry/diagnosis remains open.

Signing troubleshooting: Apple start now preflights PEM import and ES256 signing.
Raw, quoted, escaped CRLF and flattened PEM are normalized; malformed input is
rejected with a safe category. Preview b66fdceb still reports apple-key-format;
actual secret contents were not inspected. Correct .p8 secret configuration and
subsequent redeployment are needed before another real Apple login test.

Latest correction: preview 6a6270c8 now passes live Apple key import/signing
preflight after user saved the full PEM. The key-format blocker is resolved;
actual user login/token exchange still requires a new Apple sign-in attempt.

User confirmed full Apple sign-in succeeded on November 17, 2026. Google was
already confirmed working. Remaining manual checks include profile persistence,
provider linking, logout/all-device revocation and deletion on Preview.


November17 follow-up LOCAL, not deployed: My Games now focuses on schedule only. Notification bell links to dedicated /play-together/notifications inbox; old my-games#host-notifications redirects there. Inbox has All/Unread,20-at-a-time UI rendering within existing latest100 API cap, empty/loading/sign-in states, existing inline Approve/Deny/read controls. Account auth/me returns connectedAccounts(provider,email) only for authenticated own account; public player DTO unchanged, signed-out accounts empty. Profile connected sign-in rows show private provider email or unavailable text, including Apple relay explanation. No migration/resources/production changes.30 auth unit tests and12 focused browser checks passed/recorded; build passed. Last hosted65f4d761 remains unchanged until Preview approval. Update deployment snapshot after publication.


Approved inbox/account-email follow-up published November17: https://10cf494a.opencourts.pages.dev and stable feature alias. Notifications/My Games/Account HTTP200 with index-BTKwqqVl.js verified. Bell opens dedicated inbox; schedule no longer renders notification cards; own connected-provider emails shown privately in Account.30 auth unit checks/12 focused browsers/build passed. No migration, production changes or GitHub push. Supersedes local-only inbox/email checkpoint.


November17 location autocomplete LOCAL ONLY: shared LocationAutocomplete now powers Players location search and Account General location. Player-name field separated to keep names out of external location suggestions. Reuses existing Photon/Nominatim client with300ms debounce, aborts, keyboard arrows/Enter/Escape, touch-friendly option rows and theme tokens. Suggest/geocode now supply generalLabel/general_label from city/locality/county + state, never street/house/POI, with cacheversion8. Selected addresses store/search only general label; no profile coordinates saved. Existing manual city/ZIP input remains available. Additional optional name filter is bound server-side.91 geocode/services/groups unit checks and four light/dark ZIP/autocomplete browser checks passed; profile payload assertion proves selected123MainStreet saves onlyFairfaxVirginia. Build passed. No migration/resources/deployment/production changes. Last hostedb7d3bd1d; publish on approval.


Approved location-autocomplete build published: https://3af45daf.opencourts.pages.dev, stable feature alias unchanged. Players/Account HTTP200/index-JralF0cq.js verified;22033 geocode returns general_label Fairfax CountyVirginia. Shared suggestions preserve general city/area on selection; separate name search. No migration/resources/production changes or GitHub push. Supersedes local-only autocomplete checkpoint.

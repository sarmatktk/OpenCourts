# OpenCourts Play Together

For agent continuity, first read [the development handoff](PLAY_TOGETHER_HANDOFF.md).

Central product and engineering reference. Last updated: November 17, 2026.
Current deployment: isolated Preview65f4d761, development migrations through0017.
Accounts/profiles, three game audiences, groups/roles/invitations, guest capacity,
feeds/notifications, sharing, opt-in discovery, blocking and reporting are implemented.
See [current handoff](PLAY_TOGETHER_HANDOFF.md),
[sharing/safety architecture](play-together-sharing-safety.md), and
[release acceptance checklist](PLAY_TOGETHER_RELEASE_CHECKLIST.md).
Owner/Co-owner/Organizer/Member roles ARE deployed; legacy Admin mapping is preserved.
All first-release features are free. Production, payments and native Swift remain untouched.
Real-device/provider acceptance and operational release gates are still pending.

Earlier proposals and chronological checkpoints below are historical; the handoff
and latest decision log supersede them.

## 1. Product vision

Play Together is a tennis-focused community platform within OpenCourts. Players
will find games, organize matches, and join tennis groups at existing OpenCourts
locations. Recurring games, leagues, and tournaments are future extensions.
Creating a game does not reserve a court or guarantee court availability.

Release one must support public games, invitation-shared unlisted games with
explicit joining permission, and private groups with member-only games. Private
groups are required, not deferred. Both public and private groups are discoverable
in release one. Private means private content, not hidden existence. No hidden or
unlisted group type is approved; unlisted games remain a separate supported concept.

## 2. Platform strategy

- Build the website first, supporting desktop and mobile browsers.
- Android currently displays the website through a Trusted Web Activity (TWA).
- Native Swift iOS integration comes later; design account identity and APIs for it now.
- All platforms share the same OpenCourts account, group memberships, roles and
  server-verified subscription entitlements. A platform purchase is linked to that
  account; do not create unrelated accounts or group lists per device/store.
- Cloudflare Pages Functions and D1 remain the backend. No Firebase or Supabase.
- Existing Android release and Swift code remain untouched during web development.

## 3. Membership and business model

| Concept | Product rule | Status |
| --- | --- | --- |
| Player account | Free account for identity, profile and participation | Implemented and deployed to Preview; both logins user-verified |
| Group membership | Free membership governed by group permissions and approval | Decided; not implemented |
| Basic organizer | Free ability to organize games/groups; limits unresolved | Decided; not implemented |
| Organizer Pro | Future optional paid organizer capabilities | Planned; entitlements unresolved |
| Pro pricing | Tentative $29.99/year | Provisional, not a published commitment |

**All first-release features are free.** Ordinary players should not have to pay
to join games or groups. There are no paid individual group memberships in the
current scope. Do not introduce paywalls, purchase prompts, checkout, or payment
dependencies during release one. Free organizer limits and future Pro benefits
must be approved before enforcement. Group membership and paid subscription
membership are separate concepts and records. Payment never bypasses group approval.

## 4. Group privacy and permissions

### Group visibility

**Latest approved rule: both public and private groups appear in discovery/search.**
Every private group has a discoverable preview in release one. Nonmembers may see
only its name, optional explicitly public description, general location, private
badge and Request to Join action (plus routing identity needed to open that preview).
Never expose a precise private address or infer one from search coordinates.
Skill preferences may exist internally but are not an approved private-preview field.

Nonmembers must not see member names/profiles, games/schedules, court locations,
meeting times, participant lists/RSVPs, discussions/announcements, invitations or
membership-management information. Pending, rejected, removed and former members
receive only the same public preview, not private access. A forwarded group or game
URL grants no additional access. Group-only games remain excluded from public game
search even though their parent group's preview is discoverable.

Public groups are discoverable and may display a more detailed public description
and other explicitly approved public fields. Their member lists and members-only
activities remain restricted to approved active members. Additional public fields
must be deliberately allowlisted, never obtained by returning whole database rows.
Public group joining policy remains to be confirmed; public visibility is not
automatic membership or permission to view members-only content.

Removal revokes authorization on requests after it commits. Already seen content
or screenshots cannot be withdrawn. No hidden/unlisted group option may be added
without later approval. This decision supersedes the earlier hidden-private-group
rule and resolves the previous public-group discovery scope question.

Group fields: name, separate public/members-only descriptions, general location and optional skill preference.

### Latest approved roles (November 17, 2026)

**Approved design, NOT implemented yet:** Owner, Co-owner, Organizer and Member.
This supersedes the earlier owner/admin/member target model and the rule allowing
every member to create group games. All first-release roles remain free.

There is exactly one primary Owner. Only that Owner may transfer ownership,
appoint/remove Co-owners or archive the group. A Co-owner otherwise helps manage
the group, memberships, ordinary member/Organizer roles and all group events.
Co-owners cannot remove/demote each other or the primary Owner. An Organizer may
create group events and manage participation/guest requests for THEIR OWN events;
they cannot approve group membership, manage group roles/settings, or control
another Organizer's events. Members participate but cannot create group events.
All authority requires active approved membership and must be enforced server-side.

| Action | Owner | Co-owner | Organizer | Member |
| --- | --- | --- | --- | --- |
| View members-only content / join group games | Yes | Yes | Yes | Yes |
| Edit group settings / approve group membership | Yes | Yes | No | No |
| Remove ordinary members or Organizers | Yes | Yes | No | No |
| Assign/demote Organizer roles | Yes | Yes | No | No |
| Appoint/remove Co-owners | Yes | No | No | No |
| Transfer primary ownership / archive group | Yes | No | No | No |
| Create group events | Yes | Yes | Yes | No |
| Edit/cancel events / approve event or guest requests | All group events | All group events | Own events only | No |
| Leave group | Transfer ownership first | Yes | Yes | Yes |

**Currently deployed:** one Owner, legacy Admin and Member. Co-owner/Organizer roles
and group events DO NOT exist in current schema/UI. Do not describe them as deployed.
Legacy Admins cannot manage peer Admins or promote themselves. Define and review a
migration before changing roles: do not silently grant existing Admins Co-owner
powers or automatically make ordinary Members Organizers. Existing membership
approvals/removal/privacy must keep working during that transition.

Group-only games, invitation management and role-change/event ownership lifecycle
are the next implementation work. On member removal/departure, future work must
atomically release their member-plus-guest places and revoke private game access.
Decide whether their upcoming organized events transfer to the Owner or cancel;
do not silently choose ownership behavior without documenting the plan. Owner
account deletion currently requires transfer/archive; owned archived groups are
deleted with the account as disclosed in the UI.

### Membership request and approval workflow

1. Visitor discovers either group type. A private-group result contains only its
   approved public preview. Request to Join prompts sign-in when necessary.
2. A signed-in player submits a membership request. Create at most one current
   membership record per group/player; retries do not duplicate requests.
3. Pending status grants no access to private content. The requester may receive
   a separate minimal acknowledgement of their own request, not the request queue,
   invite state, admin identities or other membership-management information.
4. An active group owner/authorized admin reviews and approves or rejects requests.
   Approval, not possession of a link, transitions the player to active membership.
5. Direct invitations permit the same request workflow and never bypass approval.
   Revalidate token validity, revocation/expiry and inviter permission server-side.
6. Rejection grants no access. Removal revokes active access immediately on subsequent
   requests, including shared links and game participation; a fresh approval is
   required for readmission. Clear revoked private content from the client UI.

Public-group request/approval behavior is provisionally the same safe workflow;
any open-join option requires an explicit product decision before implementation.

### Game permission matrix (planned)

Eligibility always includes account status, blocks, game status/time, capacity,
and any explicit skill requirement. Skill preferences alone are advisory.

| Action | Public game | Unlisted game | Group-only game |
| --- | --- | --- | --- |
| Discover | Public search | Never public search | Active members' group views only |
| View details | Safe public details | Organizer/approved participants; valid invite shows limited summary only | Approved active group members only |
| View participants | Proposed authenticated eligible viewers, limited profile fields | Organizer/approved participants | Approved active group members |
| Create | Signed-in player | Signed-in player | Approved active member |
| Join | Eligible signed-in player | Invitation request plus explicit organizer approval | Eligible approved active member |
| Leave | Self | Self | Self while active; removal also revokes participation |
| Edit/cancel/manage participants | Organizer | Organizer | Organizer for own events while active, group Owner/Co-owner for all group events |

My Games and profile activity must filter through current access, including old
participation. Do not expose private affiliations, emails, identity subjects,
invitation secrets or exact home locations in API responses. Only minimal display
name/skill projections may be returned when authorized.

### Invitations, authorization and integrity

- Enforce every read and mutation server-side using authoritative account,
  membership and role data. Hidden controls and client role claims are insufficient.
- Enforce the private/public preview boundary in Cloudflare Pages Functions. Use
  separate allowlisted preview and member-content projections, with authorization
  before querying/serializing private fields. Search must not leak private content
  through filters, snippets, sort keys, counts, metadata or error messages.
- Shared links/social previews, API responses and notifications must respect the
  same boundary. Notifications to nonmembers contain no private content. Queued
  private notifications must recheck active membership before dispatch so removal
  revokes delivery as well as API access. Do not include private payloads in push
  previews or third-party notification services without a separately approved design.
- Search/preview caches, if used, may contain only the approved public projection.
  Member-only content must never enter those responses or caches. Add tests using
  private sentinel values across search, previews, shared links and notifications.
- Invitations must be difficult to guess, revocable and optionally expiring.
  Proposed design: at least 256 random bits, hash-only storage, default expiration,
  bounded uses, and replay-safe redemption. A group invitation permits requesting
  membership, not approval. Rejoining after removal needs a fresh admin decision.
- Proposed transport: URL fragment -> POST exchange, then clear the token from the
  address bar. No secret URLs/bodies in analytics or logs; no-referrer invitation
  landing page. GET/prefetch must never consume an invite or approve membership.
- Check membership inside protected reads/mutations; use authoritative consistency
  for revocation. Never serve private content from stale edge/browser caches.
  Private/personalized responses use `private, no-store`; clear private UI on access loss.
- Unique membership and participation keys prevent duplicates. Atomic conditional
  operations plus database invariants prevent overbooking and approval races.
- Owner transfer, member removal, invitation consumption and related game cleanup
  must be atomic. Test actual local D1/SQLite behavior, not only mocks.
- Session cookies, CSRF/Origin validation, rate limits, bounded queries and input
  validation are required. No wildcard CORS on private APIs.
- Blocking/reporting are release requirements. Their detailed effects on existing
  shared groups/games and the site moderation process remain provisional.

## 5. Cross-platform subscriptions (future, not implemented)

Use Apple StoreKit 2 for applicable native iOS subscriptions, Google Play-compliant
payments for Android, and a future web payment provider. Android TWA payment
integration and applicable store rules must be reviewed when implementing billing;
do not assume a generic web checkout is suitable. No payment provider is selected
or provisioned. Recheck current store policies and official APIs at implementation.

Proposed architecture:

- Account-linked subscription records identify provider, product, subscription
  reference, verified status, validity period and cancellation/renewal information.
- Server verifies purchases and signed provider events; clients cannot grant Pro.
- Deduplicated provider events handle renewals, refunds, revocations, expiration
  and reconciliation. Cancellation may stop renewal without immediately ending
  already paid access; derive access from verified provider state.
- Restore purchases and link them safely to the correct OpenCourts account.
  Prevent the same store purchase being claimed by multiple accounts; define
  recovery/transfer procedures before implementing them.
- Central entitlement checks provide consistent access on all supported platforms,
  subject to applicable store policies. Never cache permanent Pro flags in clients.
- Handle grace periods, billing retry, overlapping subscriptions and product mapping
  explicitly. Final entitlements and provider lifecycle rules remain undecided.

No billing schema migrations or purchase code are authorized by this documentation.

## 6. Technical architecture

### Existing and verified

| Area | Current repository evidence |
| --- | --- |
| Frontend | React 18, TypeScript, Vite; `src/App.tsx`, `src/services.ts`, `src/styles.css`; MapLibre and Lucide |
| Backend | Pages handlers in `functions/api/`, provider/catalog helpers in `functions/lib/` |
| D1 | `COURTS_DB`; `tennis_courts` with OSM type/ID, coordinates, tags JSON and coordinate index |
| Migration | `0001_create_tennis_courts.sql`; `0002_player_auth.sql` applied locally and, with approval, to remote `opencourts-dev` only |
| Existing API | Courts, court context, geocoding, suggestions, rain, weather and weather alerts |
| Authentication | Google/Apple OAuth and D1 sessions deployed to Preview; both provider starts and real user logins verified |
| Tests | Vitest, real SQLite auth tests, Playwright account tests and light/dark visual baselines |
| Android | `android-app/` TWA launches `https://opencourts.us/` |
| iOS | Native project in `ios-app/`; Play Together integration not implemented |

Production Pages project: `opencourts`, production branch `main`; production
`COURTS_DB` points to `opencourts-courts` (`56c414b7-aca5-429b-acfa-b9e8e87b052b`).
Preview branch `feature/play-together` binds `COURTS_DB` to `opencourts-dev`
(`cae4849c-3e99-4945-9d70-bef7b48707ce`). Verified preview:
https://6a6270c8.opencourts.pages.dev, alias
https://feature-play-together.opencourts.pages.dev.

Local tooling in `scripts/dev-environment.mjs` forces local migration/seed targets
and rejects additional CLI flags. SQLite persists under `.wrangler/play-together-local`.
Both Vite production API fallbacks were removed. Fast Vite mode has no D1 binding;
use `npm run dev:pages` for database testing. Public upstream services may still
be called. No game/account write may fall back to production.

### Proposed application architecture

Pages handlers delegate to shared identity, policy, validation, group and game
services. One game model and service support all three audiences. Use same-origin
web API calls and explicit response projections. Missing bindings fail closed.
Phase 1 adds explicit feature flag/origin/host/branch gates. Production settings
remain untouched; the API denies production hosts and the main branch.

**Approved providers: Google and Apple only.** No email/password login. OAuth
processing uses maintained `oauth4webapi`; `jose` handles Apple credential signing
and encrypted revocation tokens. Arctic was removed after its deprecation was found.
Web sessions use hashed opaque tokens and host-only HttpOnly cookies (Secure on
HTTPS), with a seven-day lifetime. Explicit recent-session linking connects both
providers to one player ID; email matches never merge accounts. Recovery relies
on the provider or a linked second provider. Native endpoints remain future work;
never ship OAuth client secrets inside native apps.

See [Phase 1 implementation and provider setup](play-together-authentication.md)
for exact endpoints, environment variables, migration and validation limits.

### Tables and relationships

Phase 1 auth tables and Phase 2 `games`/`game_participants` are implemented locally and in isolated development D1. Group, safety, subscription and native tables/routes remain proposed. See [Phase 2 implementation](play-together-games.md).

| Tables | Purpose/relationships |
| --- | --- |
| `players`, `auth_identities`, `auth_sessions`, `auth_login_attempts` | Implemented in `0002_player_auth.sql`: private identities, revocable sessions, expiring browser-bound OAuth flows and throttling; unique issuer/subject and token hashes; encrypted Apple revocation credential |
| `tennis_groups`, `group_memberships`, `group_notifications` | Implemented locally in0009/0010: group ownership, public previews, member/admin approval states and private notifications; unique group/player |
| Implemented `games`, `game_participants`; proposed `game_join_requests` | Shared visibility model, organizer, nullable group, location snapshot, UTC time plus IANA zone, capacity, status; unique game/player participation and requests |
| `group_invitations`, `game_invitations`, `invitation_redemptions` | Hashed revocable tokens, expiration/use limits and replay-safe per-account redemption |
| `player_blocks`, `reports`, `activity_audit` | Safety, restricted moderation, minimal audit events |
| Future `subscriptions`, `subscription_events`, entitlement mapping | Verified provider state linked to player; unique provider subscription/event references; final schema deferred |

Foreign keys, CHECK constraints, unique keys, conditional writes and indexes enforce
integrity. Group ID is required exactly for group-only games. Query indexes cover
game visibility/status/start time, group/time, memberships/player/state and tokens.
Snapshot court identity/name/coordinates server-side from validated OpenCourts
locations; avoid destructive foreign-key coupling to the refreshable court catalog.
No existing court records/schema changes are required for this planning task.

### API areas (Phases 1 and 2 implemented; later areas proposed)

| API area | Intended endpoints/authorization |
| --- | --- |
| Auth/profile | Implemented `/api/auth/{google,apple}/start` and callback, GET/PATCH/DELETE `/api/auth/me`, POST logout/logout-all; private own-profile projection. Public player profiles/discovery are later work |
| Public games | Implemented GET/POST `/api/games`, GET `/api/games/courts` and GET `/api/games/:id`; public-only reads, authenticated CSRF-protected creation with signed court proofs |
| Individual games | Authorized GET/PATCH `/api/games/:id`, cancellation, self join/leave; same policy service for all audiences |
| My Games | `/api/me/games`, filtered by current access |
| Groups | Public search/previews for both group types; `/api/me/groups`, authorized private detail/create/edit/archive/ownership transfer; only allowlisted preview fields to nonmembers |
| Members | Authorized member list, own membership request/leave, admin approve/reject/remove, owner role changes |
| Group games | `/api/groups/:id/games`, active members only, delegates to common game service |
| Invitations | Authorized issue/revoke, POST preview/redemption, unlisted join-request review |
| Safety | Opt-in player search, own blocks, reports and restricted moderator review |
| Future billing | Provider verification/notifications/restore and entitlement reads; paths undecided |

See [implementation design](play-together-implementation-plan.md) for the earlier
detailed proposal and [development guide](play-together-development.md) for setup.
This central reference records subsequent free-tier, subscription and roadmap
decisions; provisional details in either document must not be treated as approved.

## 7. Design requirements

Extend existing OpenCourts design, without a new palette or UI framework. Inspect
the final CSS cascade and existing components before building UI. Reuse CSS
variables (`--bg`, `--surface`, `--text`, `--muted`, `--line`, `--green`, `--lime`),
fonts, buttons, cards, forms, icons, radii, shadows, spacing and interaction styles.

Theme state is now shared through `src/useTheme.ts` by `App.tsx` and
`PlayerAccount.tsx`, under the existing `.app`/`.app.dark` variables. System mode
tracks device changes automatically on every page. Manual theme buttons and
overrides were removed at the user's request; the old `opencourts-theme` key is
cleared. Device preference remains authoritative across reload/navigation.
The existing tennis-ball mark was extracted unchanged for reuse. Account helper
text derives its muted color from existing tokens to meet small-text contrast;
unrelated court styling is unchanged.

All screens, dialogs and loading/empty/success/error/denied states need light/dark
contrast, keyboard/focus support and touch-friendly responsive layouts. Preserve
the existing mobile navigation style; test desktop, Mobile Safari, Mobile Chrome
and Android TWA. Add visual regression coverage for both themes where practical.
Small necessary style extensions must be explained; do not redesign unrelated UI.

## 8. Development roadmap

| Phase | Scope | Release |
| --- | --- | --- |
| 1 | Authentication and basic player profiles; cross-platform account identity | First release |
| 2 | Public game discovery, creation and details; shared audience-aware schema | First release |
| 3 | Join/leave, capacity safeguards, My Games and organizer controls | First release |
| 4 | Discoverable groups, safe previews, My Groups, legacy owner/admin membership controls and notifications | Deployed to isolated Preview; manual acceptance open |
| 5 | Approved Owner/Co-owner/Organizer/Member roles, safe migration, secure invitations, protected group games and member-brought guests | Next; required first release |
| 6 | Sharing, unlisted games/approvals, privacy, player discovery, blocking/reporting | First release |
| 7 | Final testing, accessibility, security and Android compatibility | First release gate |
| 8 | Recurring events first; advanced organizer features, leagues/tournaments later | After first release |
| 9 | Approved Organizer Pro limits/pricing, billing and verified cross-platform entitlements | Future |
| 10 | Native Swift Play Together integration, including applicable StoreKit 2 purchases | Later; billing/integration dependencies reviewed together |

Testing accompanies every phase. First release cannot omit private groups or their
authorization tests. Implement one reviewed milestone at a time. Plan approval is
not approval for production deployment, remote migrations, pushes or billing setup.

## 9. Implementation progress

Allowed statuses: **Not started**, **In progress**, **Completed**, **Blocked**.
Completed requires implementation and verification, not a proposal. No feature is
marked Blocked merely because it awaits ordinary planning/approval.

| Status | Milestone | Evidence / remaining work |
| --- | --- | --- |
| Completed | Repository and branch inspection | OpenCourts remote, `feature/play-together`, React/Pages/D1 files inspected |
| Completed | Local isolation tooling | `scripts/dev-environment.mjs`, `development/wrangler.local.json`, `vite.config.ts`; local migration/seed/query/API passed; remote flag override rejected |
| Completed | Dev database and Preview D1 separation | Verified distinct UUIDs above; preview metadata confirmed `preview` environment and dev binding; production deployment/binding unchanged |
| Completed | Court-only dev schema and seed | `0001_create_tennis_courts.sql`, `development/courts.seed.sql`; remote count 3; preview API returned `way/40881080` |
| Completed | Baseline build/unit checks | Build passed with bundle-size warning; 155 existing tests passed on November 17, 2026; these do not prove new feature correctness |
| Completed | Central planning documentation | This file, README link, related design/setup notes; reviewed against repository and session evidence; documentation diff checks passed |
| In progress | Phase 1 end-to-end authentication | Schema/API/UI implemented; remote dev migration and preview deployment approved/completed. Both provider starts verified; both Google and Apple login confirmed by user. Profile save/link/logout/deletion manual checks remain open |
| Completed | Phase 1/2 automated verification | Full unit suite: 199 passed; full browser suite: 26 passed, including theme/mobile visual checks; development build and local Pages smoke checks pass |
| Completed | Phase 2 implementation and development rollout | Public discovery, creation and details; 0003 applied only to local/dev D1; Preview deployed with user approval November 17, 2026. User game-creation verification pending |
| Completed | Phase 3 implementation and automated acceptance | Deployed Preview b5f880ff; migrations0004-0008 applied to dev. 216 unit /36 browser tests pass. Real provider/device manual acceptance remains open |
| Completed | Phase 4 core implementation/development rollout | Groups and legacy owner/admin membership controls deployed to Preview a9127653; dev0009/0010 applied. Real device/two-account acceptance remains open |
| Not started | Phases 5-7 | Invitations, group games/guests and remaining release features follow |
| In progress | Feature browser/device/visual/security verification | Local Chrome coverage exists; native/TWA, Mobile Safari, privacy-policy/security review, real profile lifecycle and remote write-isolation checks pending |
| Not started | Phase 8 recurrence and advanced tools | No scheduler/series schema |
| Not started | Phase 9 subscriptions | No payments, entitlements or provider provisioning |
| Not started | Phase 10 native integration | No Play Together Swift changes |

`development/games.fixture.json` is synthetic planning data only, not a feature
implementation or loaded game schema. Local changes remain uncommitted;
direct Preview deployments did not push to GitHub. Shared KV/other optional bindings,
browser network isolation and remaining checklist items are not certified by the
D1 binding checks. No production database mutation has been performed.

## 10. Decision log

Dates below record this session's November 17, 2026 decisions, not future launches.

| Date | Decision | Reason / alternatives | Status |
| --- | --- | --- | --- |
| 2026-11-17 | Preserve React/Pages/D1 and isolate dev | Reuse code/infrastructure; Firebase/Supabase excluded | Final constraint |
| 2026-11-17 | Web first, Android TWA, native iOS later | Deliver through existing website; separate native rewrite deferred | Final sequence |
| 2026-11-17 | Private groups in first release | Required private tennis organization; earlier later-phase placement rejected | Final |
| 2026-11-17 | Public/unlisted/group-only games share management logic | Avoid duplicated capacity/permission behavior; separate game implementations rejected | Final architecture requirement |
| 2026-11-17 | Server authorization for private content | Forwarded URLs must not bypass membership; link secrecy/client-only gates rejected | Final |
| 2026-11-17 | Match existing design and theme | Natural website extension; independent theme/framework rejected | Final constraint |
| 2026-11-17 | Shared identity, memberships and future entitlements | Cross-device/platform continuity; per-platform siloed accounts rejected | Final requirement |
| 2026-11-17 | Free players/groups/basic organizers; release one free | Avoid participation payment barriers; paid group entry excluded from scope | Final first-release rule |
| 2026-11-17 | Future Organizer Pro at tentative $29.99/year | Possible organizer business model; final price/limits/benefits not selected | Provisional |
| 2026-11-17 | Apple StoreKit 2, compliant Android billing, future web provider | Platform-compatible future purchases; no payment processing now | Direction decided; implementation/providers pending |
| 2026-11-17 | Public groups added to requested roadmap | Earlier draft was private-only; public metadata and join behavior required confirmation | Discovery question resolved by latest decision below; joining policy open |
| 2026-11-17 | Google OIDC and hashed web sessions proposed | Avoid password/email-delivery complexity; alternative providers/account recovery undecided | Superseded by approved Google + Apple decision below |
| 2026-11-17 | Ten documentation milestones | Explicitly separates group setup, invites, release validation and future business/native work | Current requested roadmap |
| 2026-11-17 (latest) | Both public and private groups discoverable; private means private content | Allow players to find groups while limiting private previews to name, optional public description, general location, private badge and Request to Join. Supersedes earlier hidden-private-group rule; no hidden/unlisted groups in release one | Approved; replaces earlier visibility policy |
| 2026-11-17 (latest) | Private membership always requires owner/authorized admin approval, including invitations | Discoverability and forwarded links must not grant access; enforce previews, private data, removal and notifications server-side | Approved; all first-release features remain free |
| 2026-11-17 | Google and Apple only for Phase 1 | User approved cross-platform social sign-in; password/email login excluded; explicit linking instead of email matching | Approved; deployed to Preview, both provider logins user-verified |
| 2026-11-17 | oauth4webapi plus jose | Arctic was discovered deprecated; use maintained WebCrypto-compatible protocol/signature libraries, D1-owned identities and sessions | Implemented locally |
| 2026-11-17 | Phase 1 privacy/session lifecycle | Seven-day hashed sessions, recent-auth linking/deletion, encrypted Apple revocation credential and CSRF/Origin checks; no paid access fields | Implemented and locally tested |
| 2026-11-17 | Phase 1 development rollout approved | User configured Preview secrets; applied 0002 only to opencourts-dev and deployed feature branch. Both provider starts verified; production deployment/database binding unchanged | Completed; both provider logins subsequently user-verified |
| 2026-11-17 | Automatic device theme only | User requested removing the header theme button; shared matchMedia listener follows live device changes and ignores/removes old manual overrides | Approved; deployed and verified on Preview |
| 2026-11-17 | Separate community home from account settings | Play Together must lead to games/groups; move account/profile controls to a right-hand icon and `/account`, with shared responsive navigation | Approved; deployed and verified on Preview |
| 2026-11-17 | User reports preview sign-in working | Records user verification without assuming both providers or other account actions were tested | Verified by user; provider unspecified |

## 11. Open questions

- Confirm public-group joining policy (approval-required proposed; no open join
  approved) and any public fields beyond description/general location. Both group
  types' discovery, private previews and protected member content are now decided.
- Verify real Google/Apple callbacks and native/web Apple identity association,
  provider account-change handling and later native
  exchange/purchase restoration. Provider selection is resolved; native endpoints
  and recovery beyond the providers/explicit linking are deferred.
- Approve detailed permission defaults: public participant visibility, unlisted
  summary fields, ownership transfer/organizer departure and blocking consequences.
- Define free organizer limits, group-size/invitation limits and abuse limits without
  contradicting free first-release participation.
- Finalize Organizer Pro price, premium entitlements, currencies, trials/grace
  behavior and overlapping cross-platform subscriptions.
- Select Android purchase integration and future web provider; review current store
  requirements before implementation, not from this planning document alone.
- Decide notifications, moderation staffing/tools, retention/privacy policy,
  account deletion effects and any minimum-age rules before public release.
- Define recurrence/league/tournament scope after release one, and exact timing of
  native iOS relative to paid subscriptions.
- Resolve existing MapLibre critical sanitizer advisory before public account
  rollout; assess a major-version upgrade separately. Update production privacy
  disclosures before collecting real accounts; do not silently change production.

## Maintenance contract

Before coding any Play Together change, read this document and follow its business,
privacy and permission rules. After implementing, update affected sections, progress,
decision log, migrations/endpoints, tests performed and outstanding issues. Keep
existing/proposed labels accurate. Do not mark milestones complete without evidence.

If a new instruction conflicts with a recorded decision, flag it and ask for
clarification rather than silently changing business logic. New ideas are provisional
until approved. Keep related implementation/setup documents aligned. Work on
`feature/play-together`; do not change production resources/settings for this work.

Latest preview verification (November 17, 2026): deployment `36f69d2d` is Preview on
`feature/play-together`, bound to development D1. Fresh Chrome verified community
and account routes, right-hand account icon, no theme toggle and live system-theme
changes. Both providers remain enabled; production deployment and binding unchanged.
Safe diagnostics pass 27 local auth tests; actual Apple callback diagnosis awaits retry.

Apple troubleshooting update: user replaced APPLE_PRIVATE_KEY but had not redeployed.
Refreshed the same approved preview build as deployment `e8da7031` to load the
updated secret. Real Apple callback/signing verification still requires a fresh
user sign-in attempt; do not mark Apple working based only on provider readiness.

Apple signing diagnosis: preview `b66fdceb` now validates key import/signing before
redirecting. It accepts raw/quoted/escaped/flattened PEM, with 29 auth tests passing.
Safe remote preflight still reports apple-key-format: configured APPLE_PRIVATE_KEY
does not match a complete PEM envelope/base64 body. Actual contents were never read
or exposed. User must replace Preview secret with the actual full Apple .p8 text;
key format, rather than Apple authorization or account linking, is the current blocker.

Apple signing follow-up: user saved full PEM including header/footer. Preview
`6a6270c8` loaded the corrected secret; live Apple start returned HTTP 200 and
passed actual key import/ES256 signing preflight. Production deployment and D1
binding unchanged. Full Apple user authorization/token callback remains to test.

User verification (November 17, 2026): Apple login completed successfully after
the signing-key correction. Both approved sign-in providers are now user-verified.

### November 17, 2026: Phase 2 preview rollout

User approved development migration and Preview deployment. Only `0003_public_games.sql` was pending and applied to `opencourts-dev`. No production migration, GitHub push or remote demo seed was performed. Joining remains Phase 3.

### Court label decision: November 17, 2026
Use an actual mapped court name when available. For generic court names, use the associated park or school name; otherwise use a nearby street labeled Near. Do not invent exact addresses or infer association from an arbitrary distant venue. Local implementation pending Preview deployment and user verification.

Profile UX clarification: user confirmed saved fields persist. Save button now reflects unchanged saved state locally; Preview deployment pending approval.

Profile persistence report resolved by user: different browser/session. Save-state UX improved locally to show saved/edited/saving states; hosted deployment pending approval.

Profile saved-state UX and paired game-control alignment deployed to development Preview `784ae071` with approval November 17, 2026. Build and focused browser checks passed.

### Latest joining decision: November 17, 2026

Public games require organizer approval. Approved group members may join group games immediately; guests require approval. Guest support belongs to group implementation and must not bypass private membership/content rules. Public approval and Phase 3 controls are implemented locally; see [participation guide](play-together-participation.md). First release remains free.

### Member-brought guests and cancellation decision: November 17, 2026

Members may bring guests attached to their own participation: Sam plus Tom + 1 guest uses 3 places. A guest is not necessarily another account. Member self-joining is immediate for approved group members; guest additions require approval and atomic capacity checks. Guests gain no automatic group membership/private content access. Group-phase counts must sum members plus confirmed guests. Leaving releases the member and all attached guests. Pending and approved participants can cancel; approved cancellation prompts for an OPTIONAL reason. See participation guide for schema/workflow details.

Host notification decision: notify the host in-app when a player withdraws or cancels, with optional reason and released places. In-app inbox implemented locally; email/push delivery remains unimplemented.

### Phase 3 development rollout: November 17, 2026

User approved dev migrations 0004-0006 and Preview deployment cf3d2b64. Public approval requests, organizer management, My Games, optional cancellation reasons and private in-app host notifications are available for two-account acceptance testing. Production deployment/database unchanged. Group guests remain later.

Phase 3 follow-up: organizers cannot request their own games (server-side account-ID check). Notify hosts for new requests as well as withdrawal/cancellation, with a shared header bell and unread count. Local implementation and0007 migration pending Preview approval.

Requester notifications implemented locally: approved/rejected/removed/game cancelled events join host request/withdraw/cancel events in a private recipient-scoped inbox and header bell. Migrations0007/0008 and Preview rollout pending approval.

Host/requester notifications and header bell deployed to isolated Preview b5f880ff with approval; dev migrations0007/0008 applied. Pending statements above are historical. Two-account user acceptance next; no production operations.

### Phase 3 automated acceptance checkpoint

Combined two-account SQLite/API lifecycle and notification migration preservation passed. Full unit suite216 and browser suite36 pass. No additional application fixes or deployment needed. Real two-browser Google/Apple flows and physical Android TWA/mobile Safari remain manual checks; do not report those as verified. Group work is next, not implemented.

### Phase 4 local implementation checkpoint

Public/private group discovery/creation, My Groups, approval-based memberships, owner/admin management, transfer/archive and private group notifications are implemented locally. Private previews exclude skill/member information; active members alone see private description/skill/roster. Removal immediately revokes API access. Both group types use approval as the safe provisional public-group policy. Removed/rejected users may request fresh approval. Account deletion requires active ownership resolution and deletes owned archived groups. See [group implementation guide](play-together-groups.md). No remote group migrations/deployments yet.

Phase 4 final local validation: development build/full227-unit/43-browser suites passed, plus final12 group API and7 group browser checks. Pending migrations0009/0010 and Preview rollout need approval. No production changes.

Inbox UX follow-up implemented locally: organized notification cards and direct Approve/Deny for authorized pending game/group requests, reusing server permission/capacity checks. Resolved requests expose no actionable target. Pending dev0009/0010 and Preview deployment still need approval.

### Phase 4 Preview rollout completed

Approved dev migrations0009/0010 succeeded and Preview14cd548b deployed with groups, membership notifications and organized inline Approve/Deny inbox cards. Group routes/public discovery and signed-out privacy smoke checks passed. Production deployment/D1 unchanged. Real two-account acceptance pending; invitations/group games/guest parties remain Phase5.

Play Together action styling: reuse shared primary/secondary button classes for prominent actions, existing theme variables and icons; consistent keyboard focus, hover, disabled states and touch-friendly controls. Navigation buttons and compact inbox refinements are implemented locally, not yet deployed. No new design system or paid features.

UI review build a9127653 published to isolated Preview with user approval: polished shared/group navigation buttons and compact inbox. Build/36 browser checks passed. No production changes.

### Decision log: approved role model supersedes earlier rules

November 17, 2026: user approved one primary Owner, Co-owners, Organizers and Members. Primary Owner alone transfers ownership, appoints/removes Co-owners and archives the group. Organizers create/manage only their own group events, including event/guest approvals, with no group-membership authority. Members no longer create group events under the target design. This is approved planning only; deployed code remains Owner/legacy Admin/Member. First-release roles stay free. Next phase must specify safe legacy-role migration without automatic privilege escalation. Documentation-only update requested before further coding.

Phase5A transition proposal prepared: see play-together-roles.md. Recommended preserve legacy Admins with existing permissions temporarily and let primary Owner explicitly assign new roles. This mapping is proposed, not approved or implemented. No automatic Co-owner promotion or Member-to-Organizer conversion.

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

Optional media milestone approved: one player photo and one public group-preview cover, group upload controlled by Owner/Co-owner. Setup/security plan in play-together-media.md; not implemented. No R2 binding found; account inspection403, resources/cost unconfirmed. No storage created; no upload endpoints enabled.

Latest approved Preview rollout:0012 applied to opencourts-dev only; media/member-layout build d02fb1eb deployed (index-C37aM5Kh.js), stable alias unchanged. MEDIA_UPLOADS_ENABLED remains unset: controls are reviewable but saving photos intentionally unavailable until actual private processor transform/metadata verification. Remote dev migrations0001-0012 applied. Production unchanged/no GitHub push. Next finish real image integration/cleanup validation before enabling uploads, then secure invitations, protected group games and guest capacity.

Latest approved UI review build: Preview eb2f943b deployed, stable alias unchanged, index-B47lirXy.js. Includes compact photo editors, add/change pencil overlays, explicit unsaved preview/discard, group location MapPin and earlier member layout fixes. Build/8 group browser tests and photo interaction checks passed. No migrations this rollout; media saving remains disabled (MEDIA_UPLOADS_ENABLED unset) pending live transformation verification. Production unchanged/no GitHub push. Next real processor integration/cleanup checks, then enablement approval and invitations/group games/guests.

Latest approved media enablement: private processor fix deployed version a55617d2-08b0-404d-8fff-513b240c4de5; MEDIA_UPLOADS_ENABLED=true set on Pages PREVIEW ONLY preserving existing vars; Preview643c7700 published. Stable alias unchanged. Remote dev0012 already applied. Production upload flag absent/deployment7ef38ff2 unchanged; processor no public targets. Real Cloudflare binding resize/metadata checks passed before rollout. User must now test real authenticated photo save/refresh/replace/remove and group Owner/Coowner cover. No fake user account/session created. Cleanup queue currently drained on authorized media writes; no scheduled sweeper. Invitations/group games/guests remain next.

Phase5B secure invitations implemented locally: Owner/Coowner only, hashed random tokens, optional expiry/revocation, approval-preserving acceptance and safe discoverable previews. Migration0013 local only; see play-together-invitations.md. Header avatar published to Preview36c696b2; production unchanged. Invitation rollout pending approval.

Latest approved rollout: invitation0013 applied to opencourts-dev and Preview962fb2da published (index-CJSUEJ5t.js). Stable alias invitation route verified. Production7ef38ff2 unchanged. Group-only games next: shared groupGameAccess authorization foundation added LOCALLY,19 group tests pass. It denies outsiders/removed members; Owner/Coowner create/manage all, Organizer creates/manages own, ordinary Member/legacy Admin cannot create. No group game routes/UI enabled yet. User explicitly selected lifecycle: upcoming games transfer to primary Owner when Organizer leaves/loses role; departing member places must be released. Implement creation/list/detail/participation/notifications with those checks next; do not claim group games complete.

Personal feed requirement implemented locally with group-only games: upcoming member-group games and own involved public games, All/MyGames/MyGroups filters and participation states; current membership filters every private read. Group creation/joining/lifecycle local0014/0015; upcoming Organizer events transfer to primary Owner after departure/demotion as approved. Group-game milestone pending Preview approval; guest places remain next.


Latest local checkpoint (November 17, 2026): group-only games and personal member-group feed are implemented locally. Full 240 unit tests and 31 focused browser checks passed. Development migrations 0014/0015 are LOCAL ONLY; hosted Preview remains 962fb2da with migrations through 0013. See PLAY_TOGETHER_HANDOFF.md and play-together-group-games.md for lifecycle, permissions and rollout. Next: approved dev migrations/Preview review, then guest requests and atomic party capacity. No production changes.


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


Latest approved decisions November17: user authorized remaining web milestones and Preview rollout; explicitly selected Sam owner of Tennis as Preview safety-report moderator. Public/group share and protected unlisted invitations, opt-in discovery, symmetric discovery/new-hosted-join blocking, reports/moderator queue and roster search/pagination now deployed.251 units/76 browsers/26 live synthetic checks passed; real OAuth/device acceptance remains pending. See release checklist.


Final safeguard: block relationships are rechecked within participant approval SQL, not only before the batch. Concurrency regression inserts a block between the permission read and mutation and confirms no participant is inserted. Full251-unit suite passed afterward;76 complete browser checks passed for this unchanged interface. Final Preview65f4d761 successfully deployed, bundle unchanged index-CBW7dPXl.js; production remains7ef38ff2. Actual Preview synthetic26-check acceptance completed for this milestone with fixture cleanup. All current guides refreshed; real OAuth/physical-device and operational release gates remain in release checklist.


November17 follow-up LOCAL, not deployed: My Games now focuses on schedule only. Notification bell links to dedicated /play-together/notifications inbox; old my-games#host-notifications redirects there. Inbox has All/Unread,20-at-a-time UI rendering within existing latest100 API cap, empty/loading/sign-in states, existing inline Approve/Deny/read controls. Account auth/me returns connectedAccounts(provider,email) only for authenticated own account; public player DTO unchanged, signed-out accounts empty. Profile connected sign-in rows show private provider email or unavailable text, including Apple relay explanation. No migration/resources/production changes.30 auth unit tests and12 focused browser checks passed/recorded; build passed. Last hosted65f4d761 remains unchanged until Preview approval. Update deployment snapshot after publication.


Approved inbox/account-email follow-up published November17: https://10cf494a.opencourts.pages.dev and stable feature alias. Notifications/My Games/Account HTTP200 with index-BTKwqqVl.js verified. Bell opens dedicated inbox; schedule no longer renders notification cards; own connected-provider emails shown privately in Account.30 auth unit checks/12 focused browsers/build passed. No migration, production changes or GitHub push. Supersedes local-only inbox/email checkpoint.


November17 schedule-tabs update LOCAL ONLY: My Games defaults Upcoming, with Requests/Past/Cancelled. Server-side classification and50-item cursor pagination replace mixed100-row history. In-progress until ends_at, old pending requests expire into Cancelled, left/withdrawn/removed/declined statuses labeled. Existing cancellation/withdrawal records preserve own history; revoked group membership hides private history and reasons never enter schedule DTO.39 games+24 groups API tests/four browser checks/build passed. No migration/resources/production changes. Last hosted10cf494a; Preview publication pending. See play-together-schedule.md.


November17 player location search LOCAL ONLY: player lookup previously compared literal q with saved general_location, so22033 could not matchFairfax. New player-search-location helper uses existing geocode handler for US ZIP/ZIP+4, validates returned postcode/country, expands safe city/county labels (e.g22033 ->Fairfax County ->Fairfax), and supports city-state labels through existing cityStateQuery. Player names are never sent to geocoder; no profile addresses/coordinates stored or returned. Generic city/name text search remains. UI labels Name, city or ZIP code and displays resolved area, with readable skill labels. General-area matching, NOT precise ZIP boundaries, proximity radius or guaranteed disambiguation of free-text same-name cities. Existing opt-in/block/active filters and pagination retained. Lookup failures/malformed or wrong postcode return explicit errors.39 group/geocode API checks and two phone light/dark browser checks passed; build passed. No migration/resources/production changes. Schedule-tabs update remains local too; last hosted10cf494a. Publish both on next explicit Preview approval.


Approved schedule/ZIP-search review build published: https://b7d3bd1d.opencourts.pages.dev, stable feature alias unchanged. My Games/Players HTTP200 with index-Bw5A20Db.js verified. Includes Upcoming/Requests/Past/Cancelled server-filtered pagination and ZIP/city player matching. No migration, production changes or GitHub push. Supersedes local-only schedule/ZIP checkpoints.


November17 location autocomplete LOCAL ONLY: shared LocationAutocomplete now powers Players location search and Account General location. Player-name field separated to keep names out of external location suggestions. Reuses existing Photon/Nominatim client with300ms debounce, aborts, keyboard arrows/Enter/Escape, touch-friendly option rows and theme tokens. Suggest/geocode now supply generalLabel/general_label from city/locality/county + state, never street/house/POI, with cacheversion8. Selected addresses store/search only general label; no profile coordinates saved. Existing manual city/ZIP input remains available. Additional optional name filter is bound server-side.91 geocode/services/groups unit checks and four light/dark ZIP/autocomplete browser checks passed; profile payload assertion proves selected123MainStreet saves onlyFairfaxVirginia. Build passed. No migration/resources/deployment/production changes. Last hostedb7d3bd1d; publish on approval.


Approved location-autocomplete build published: https://3af45daf.opencourts.pages.dev, stable feature alias unchanged. Players/Account HTTP200/index-JralF0cq.js verified;22033 geocode returns general_label Fairfax CountyVirginia. Shared suggestions preserve general city/area on selection; separate name search. No migration/resources/production changes or GitHub push. Supersedes local-only autocomplete checkpoint.


Verification rerun November17 requested by user:257 units,84 complete Chrome browser checks, TypeScript/dev build and26 actual Preview synthetic API checks PASSED. Hosted3af45daf/index-JralF0cq.js verified; synthetic cleanup confirmed zero QA players; production7ef38ff2 unchanged. No deployment or app edits. Real provider Google/Apple and physical Safari/Android/TWA acceptance remain manual. See PLAY_TOGETHER_TEST_RESULTS.md and refreshed release checklist.


### November 17, 2026 - Approved QA remediation (local)

All eight findings in [QA_AUDIT.md](QA_AUDIT.md) fixed locally: protected-game state
revalidation, readable contrast, court autocomplete semantics, accessible inline confirmations,
compact owner member actions, metadata separator, page titles and search announcements.
257 unit tests, 85 browser workflows, the dynamic checks and development build passed;
latest 350-state audit captures have no detected axe violations or page overflow.
Not deployed. Physical-device and screen-reader checks remain release follow-ups.


### November 17 - Preview publication and release-hardening continuation

Eight audit fixes published to https://c17ef75c.opencourts.pages.dev and the stable
feature-play-together alias, bundle index-BxFx9CTz.js. Preview D1 verified isolated;
production deployment/binding unchanged. No migrations or GitHub push.
Subsequent LOCAL ONLY player-search race fix has a failing-before/passing-after stress
regression, 10 focused browser passes, 257 unit passes and successful development build.
Current implementation plan rewritten to remove contradictory old status snapshots.
Next: physical-device/provider/screen-reader acceptance and release operational review;
recurring events remain after first release. All first-release features remain free.


### Approved design decision - primary action consistency

Main court search and all Play Together primary actions share green backgrounds, white
labels/icons, hover/focus treatment, corner radius and disabled opacity through shared
site tokens. Search actions in court selection, groups and member directory use that same
primary emphasis. Verified on phone/desktop in both themes with four browser checks.
Local only; current hosted candidate is c17ef75c. No production change.


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

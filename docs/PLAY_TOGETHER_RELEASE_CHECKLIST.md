# Play Together - release acceptance checklist

Preview candidate:e303ef23, development schema0017. November17,2026.
This is a development candidate, not approval to release to production.

## Automated and live-development checks completed

- [x] Build/TypeScript and257 unit tests.
- [x] Complete85-browser suite: court discovery/weather, responsive layouts, theme switching,
  profile/media, roles/groups, invitations, guest counts and cancellations, inbox, sharing/safety.
- [x] SQLite tests: duplicate participation/membership, overbooking rollback, current membership
  and manager roles, outsider denied, invitation expiry/revocation, private API projection,
  CSRF, opt-in discovery, symmetric blocking, moderator-only reports, roster pagination.
- [x] Real Preview/D1:26 synthetic-account API checks; fixture cleanup confirmed.
- [x] Preview COURTS_DB is devUUID; production binding/config/deployment kept unchanged.
- [x] MapLibre5.24.1 patched sanitizer regression tested. Audit discrepancy documented separately.
- [x] Theme/mobile screenshots and basic keyboard/contrast tests;44px important action targets.

## User/device checks still required

- [ ] Real Google sign-in, sign-out, refresh and reconnect in two browsers after latest deployment.
- [ ] Real Apple sign-in/callback, linking and return-to-app behavior.
- [ ] On physical iPhone Safari and Android Chrome: create game, join/request, host approve,
  guests/capacity/cancel/reason/notifications; use account crop via touch and save.
- [ ] Actual Android TWA: login transitions, back/navigation, safe-area dock, external directions/share.
  Existing Android package/domain remains production; do not change app association or publish
  an app just to test Preview. Use mobile Chrome for Preview where TWA isn't configured for it.
- [ ] Private group with separate real accounts: preview reveals only approved public fields;
  forwarded group game denies outsider; removal closes subsequent API access and clears next refresh.
- [ ] Sam account: Players -> Report review; see submitted test report, resolve it. Other accounts
  cannot read queue. Test reporting with synthetic content only.
- [ ] Unlisted: create/revoke invitation, open after sign-in, request approval, test expired link.
- [ ] Opt-in profile appears, opt-out disappears, block/unblock updates discovery/new join permissions.
- [ ] Screen reader/VoiceOver/TalkBack and keyboard review on actual devices; detailed contrast audit.

## Remaining release operations

- [ ] Reconcile npm advisory metadata that flags the officially patched MapLibre5.x backport and
  review dev-tool audit findings. Do not describe npm audit as clean.
- [ ] Agree report triage/enforcement/retention responsibilities and support response process.
- [ ] Review notification retention and pending-membership request review bound (200 entries).
- [ ] Separately approve production migration/config/domain rollout and backup/rollback plan.
  Never point preview at production or copy synthetic user records into production.

Next product milestone after free first release: recurring/series games. Payments/entitlements
and native Swift integration remain later and require their own design/approval.

Latest rerun November17:257 units/84 browsers/build/26 live synthetic checks passed. See PLAY_TOGETHER_TEST_RESULTS.md. Real-provider and physical-device items above remain manual; no production release approved.


Audit fixes published November 17: candidate c17ef75c, bundle index-BxFx9CTz.js.
350 local responsive/theme states have no detected axe violations or page overflow;
physical-device/screen-reader gates above remain open. Production unchanged.
Subsequent player-search race hardening is local only, with a red/green regression
and 10 focused browser passes. See current handoff before publishing another build.


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

# Play Together verification - November 17, 2026

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

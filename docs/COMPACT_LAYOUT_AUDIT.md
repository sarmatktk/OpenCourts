# Compact layout audit — November 19, 2026

Scope: feature/play-together Preview. Preserve the existing brand, readable text,
clear groups, private access rules and comfortable controls. This is a spacing and
layout review, not a production rollout or store approval.

## Coverage and method

The before capture covers 30 routes at 320, 390 and 1440 pixels in both themes
(180 states). The final pass adds tablet breakpoints at 768/1024 and the signed-out
community welcome page: 31 routes across five widths and both themes (310 states).
The reproducible fixture and measurements are in tests/qa-audit.spec.ts; density
mode keeps screenshots and detailed measurements under ignored qa-audit folders.
No real accounts, messages, credentials, private photos or databases are fixtures.

Routes cover court search/map/weather on the court page, community discovery/feed,
game search/create/host/member/schedule/invitations, account/sign-in, group search/
my groups/create/owner/preview/invitations, players/moderation, About/Contact/Support,
Privacy/Terms/Help/Delete Account and three public court/weather guides. Additional
behavior tests cover expanded forms, pickers, dialogs, sharing, reporting, private
access and unread chat. Browser emulation is not physical phone acceptance.

Before/after full-page images were inspected for representative account, group,
player search, court map and light/dark layouts. Pixel height is a comparison tool,
not a target to minimize: a shorter page is useful only when it stays understandable.

## Findings and changes

| Finding | Change | Safeguard |
| --- | --- | --- |
| Repeated large card/form gaps | Standardize community panels to 24px desktop / 20px vertical and 16px horizontal mobile; form gaps to 16px | Body text, field heights and the compact chat overrides are preserved |
| Sign-out actions each consume a full row | Wrap related account actions beside each other where they fit | Account deletion stays separated with its confirmation and warning |
| Group editing/archiving and save/cancel actions stack unnecessarily | Explicit wrapping action groups | Archive still requires its irreversible-action confirmation |
| Invitation expiry field and creation button stretch across desktop | Inline responsive field/action row | Small screens wrap rather than squeeze the field |
| Invitation ellipsis appears below its row | Apply popup positioning only to the popup button, not the trigger | Trigger stays 44px; existing revoke confirmation remains |
| Desktop player search is a long vertical form | Responsive two/four-column search, with labels/inputs aligned and help below location | Logical DOM/tab order and autocomplete semantics remain |
| Player actions always start another row | Keep player details and actions together on wide screens; wrap on narrow screens | Invite/block/report remain visible and keyboard accessible |
| Game/group summary cards over-emphasize padding and title size | Tighter card padding, paragraph margins and a consistent 22px card title | Long titles wrap; body copy stays readable |
| Group report link has a dedicated row | Place it alongside the location metadata | Public preview and private membership checks do not change |
| Community footer has two floating-dock reserves | Remove the app-shell reserve where community main already reserves 110px plus safe area | Footer clearance is verified; court-page dock behavior is unchanged |

## Deliberately retained

- Court map area and weather visualization space support interaction and comparison.
- Long-form policy/help text keeps its existing font sizes, line length, paragraph
  spacing and section navigation. Important disclosure text is not deleted.
- Form labels, validation, optional-field guidance and safety/report context remain.
- Primary game/group actions, destructive confirmation and identity/privacy controls
  keep their hierarchy. Compactness does not mean hiding essential controls.
- Action buttons retain at least 44px targets; narrow layouts may legitimately wrap.
- Existing header/footer logos, theme colors and installed-app dock position remain.

## Evidence and release status

Verification and publication details are recorded in APP_TESTING_CHECKLIST.md and
PLAY_TOGETHER_TEST_RESULTS.md as the audit completes. Machine-readable comparison
will be retained in docs/qa-evidence/compact-layout-audit.json. Raw logs/screenshots
stay in ignored .wrangler/qa-audit/density-* folders. Snapshot baselines are not
updated by this audit; reviewed intentional visual differences must be distinguished
from behavioral/accessibility failures. Production/main, environment secrets,
production D1 and store uploads remain outside this work.

## Final results

Preview [753893ed](https://feature-play-together.opencourts.pages.dev), bundle
index-DUFTZfF7.js. Final310 states have zero runtime/axe/overflow issues. Units392/392
pass; all291 unique non-matrix browser cases completed functional assertions across
an initial265-pass run and corrected/completed targeted checks. Twenty old visual
baselines remain different and were not overwritten. Final40 targeted checks pass,
with snapshot assertions ignored only to finish flows blocked by those old images.
See APP_TESTING_CHECKLIST.md for the exact sequence, failures and limitations.

| Sample view, light theme | Before height | After height | Reduction |
| --- | ---: | ---: | ---: |
| Account,390px | 2744px | 2512px | 232px |
| Group owner,390px | 2948px | 2712px | 236px |
| Group owner,1440px | 2511px | 2300px | 211px |
| Players/moderator,1440px | 2218px | 1872px | 346px |
| Groups,390px | 1195px | 1083px | 112px |

These are synthetic-fixture measurements, not a target to force on different content.
Policy and court-page reading/map space remains unchanged. The narrow invitation
form deliberately stacks when needed: readable selected values take precedence
over squeezing a field and button onto one row. Physical Android acceptance and
reviewed visual-baseline refresh are still pending. Production remains untouched.

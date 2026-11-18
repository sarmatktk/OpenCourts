# OpenCourts UI/UX and QA audit

Audit date: November 17, 2026. Branch: `feature/play-together`.

## Approved remediation update - November 17, 2026

The user approved fixing the eight findings after reviewing the audit. Changes are local on
`feature/play-together`; no deployment, database migration, production setting or server
permission change was made. The initial assessment below records the pre-fix findings.
Current verification results are recorded at the end of this report.

Implemented in audit order:

1. Revalidate game access on focus, visibility return and a 30-second visible-page interval;
   clear private details on failure and prevent outdated responses from restoring them.
   Participation controls also refresh when the game is revalidated and discard stale
   organizer/member state, including responses arriving after unmount.
2. Darken existing light-mode secondary text tokens and weather labels; lighten dark weather
   and mobile-search labels. Static informational pages share the corrected muted token.
   No new palette or theme system was introduced.
3. Correct the court search input to a combobox with listbox popup semantics; retain its
   existing keyboard selection and active-option handling.
4. Reuse a focused inline confirmation panel for game cancellation and group destructive
   actions. It scrolls into reach, focuses the announced region, and restores the trigger
   when closed if appropriate. It is not a modal and does not trap keyboard focus.
5. Collapse member management controls behind a labelled three-dot disclosure. Controls
   expand in document flow, avoiding narrow-screen popover clipping; roles and safety
   actions remain available. Closed owner rows have a regression check for compact height.
6. Replace the malformed location/skill separator with a middle dot.
7. Give community routes distinct browser titles with OpenCourts branding.
8. Announce player search progress, result count and failure through a polite status region.

## Assessment and scope

The development application has substantial functional coverage and passed the regression and isolated preview acceptance checks below. It is ready for continued preview testing, but this audit is not a production release approval or a WCAG conformance certification. Confirmed accessibility and interaction defects remain open. No critical security defect was demonstrated.

During the initial reporting-only audit, no application files, production settings, production records, deployments, or business rules were changed. New audit tests and evidence are included. Existing uncommitted feature work was preserved.

Preview inspected: `https://feature-play-together.opencourts.pages.dev`, deployment `3af45daf`. Local browser tests exercise the current React application with synthetic API fixtures. Live API acceptance exercises isolated development D1, creates synthetic records, and removes them afterward. Browser fixtures are not evidence that real OAuth, external geocoding, weather providers, or physical devices work in every condition.

Development database: `opencourts-dev` / `cae4849c-3e99-4945-9d70-bef7b48707ce`. Production database remains `opencourts-courts` / `56c414b7-aca5-429b-acfa-b9e8e87b052b`. Production was not used for test writes.

Inspected screens: existing court discovery/map/weather UI; public game discovery; personal feed; game creation; host/member game details; schedule; notifications; account and signed-out account; group discovery, My Groups, creation, owner details and nonmember preview; group/game invitations; players and moderator controls; About, Support, Privacy, Contact, Fairfax guide, rain guide, and timing guide. Existing functional suites cover additional interactive states.

## Executed tests and evidence

| Check | Observed result | Limits |
| --- | --- | --- |
| Vitest | 257 tests passed across 17 suites | Unit fixtures, not external identity providers |
| Development build | Passed TypeScript checks and Vite build | Build success does not establish usability |
| Existing Playwright regression suite | 84 passed, 47.6 seconds | Installed desktop Chrome; local fixture APIs |
| Responsive/theme audit | 14 tests completed; 25 screens × 7 widths × 2 themes = 350 states | Report-generating scans; completion does not mean accessibility passed |
| Exploratory dynamic audit | 1 completed; captured confirmations, revoked-access stale view, missing game and loading state | Deliberately records defects instead of asserting their absence |
| Live preview acceptance | 26 API checks passed; synthetic records removed from development D1 | Synthetic sessions; does not test real Google/Apple browser consent |

Widths: **320, 375, 390, 430, 768, 1024, 1440 CSS pixels**; both light and dark device preferences. No horizontal **page** overflow or uncaught JavaScript exceptions were detected in those 350 captured states. This does not exclude internal scrolling, overlapping controls in untested states, or device-specific problems.

Automated accessibility engine: axe-core 4.10.3, WCAG 2 A/AA, 2.1 AA and 2.2 AA rule tags. Contrast violations occurred in **137 states**; invalid ARIA attributes occurred in **14 states**. These overlap. Axe's rule-impact labels are not the security severity classification used below. Incomplete axe checks require manual review.

Evidence: [aggregate findings](qa-evidence/summary.json), [dynamic states](qa-evidence/dynamic-states.json), and `qa-evidence/matrix-{width}-{theme}.json`. Screenshots are synthetic and contain no real account credentials. Representative captures: [mobile account](qa-evidence/account-390-light.png), [dark account](qa-evidence/account-390-dark.png), [mobile group management](qa-evidence/group-owner-390-light.png), [desktop players](qa-evidence/players-moderator-1440-light.png), [game cancellation](qa-evidence/game-cancellation-confirm-390.png), [member removal](qa-evidence/group-member-removal-confirm-390.png).

## Prioritized confirmed issues

### QA-01 — Previously loaded private game content persists after access revocation

Severity: **Medium**. Status: **Verified** (local automated checks; physical-device review remains). Privacy-related UI behavior; not a demonstrated server authorization bypass.

Reproduce: open a member-only game as an approved member; remove that membership in another session; return focus to the already-open game page. The dynamic test switches the subsequent detail response to denial and dispatches focus.

Expected: revalidate access on return and clear private detail/participant state when access is denied. Actual: previously loaded private title remains visible; zero detail reads occur on focus. Evidence: `dynamic-states.json` (`stale`). Already-seen content cannot be retroactively made unknown, but the UI should not continue presenting it as accessible.

Recommended fix: revalidate protected views on focus/visibility changes and clear their state on 401/403/404; review account changes similarly. Requires approved application behavior changes and regression tests. Server permission checks must remain authoritative.

### QA-02 — Insufficient text contrast in both themes

Severity: **High** (accessibility). Status: **Verified** (local automated checks; physical-device review remains).

Reproduce: open court discovery and community screens in light mode; inspect secondary text, footer/dock labels and section kickers. Inspect weather summary labels in dark mode.

Expected: normal-sized text meets 4.5:1 contrast. Actual examples: muted `#7b8580` is approximately 3.81:1 on white and 3.44:1 on `#f2f3f8`; dark weather accent text is approximately 3.81:1 on `#17231e`. See the `color-contrast` entries in matrix evidence for exact elements and backgrounds. Not every secondary label fails, and exemptions must be assessed by text size/state.

Recommended fix: smallest shared-token adjustments plus scoped weather label fixes; preserve the established palette and rerun both themes. Avoid a redesign.

### QA-03 — Court search autocomplete has invalid expanded-state semantics

Severity: **Medium** (accessibility). Status: **Verified** (local automated checks; physical-device review remains).

Reproduce: load court discovery at any audited width and inspect the search input. Actual: `type="search"` has `aria-expanded` without a compatible combobox role; axe reports `aria-allowed-attr` in all 14 court states.

Expected: a consistent accessible autocomplete pattern exposing expanded state, suggestions and keyboard selection. Recommended fix: align input role, popup relationship, active option and keyboard handling with the combobox pattern; verify with keyboard and screen reader. Do not simply remove useful semantics to silence the scanner.

### QA-04 — Destructive confirmation appears without focus or navigation assistance

Severity: **Medium**. Status: **Verified** (local automated checks; physical-device review remains).

Reproduce: on a narrow host game page activate Cancel game; on a long group management page activate Remove member. Actual: an inline confirmation appears, focus stays on the initiating button, and no dialog is present. Confirmation may be far from the trigger in long content. Evidence: dynamic JSON and linked confirmation screenshots.

Expected: users can readily find and operate the confirmation with keyboard and touch. Recommended fix: focus/scroll a clearly labelled inline confirmation region, or use an accessible dialog with appropriate focus management. Inline confirmations do not inherently require a modal focus trap.

### QA-05 — Group manager member rows remain excessively tall

Severity: **Medium** (mobile usability). Status: **Verified** (local automated checks; physical-device review remains).

Reproduce: view a group as Owner at 390px. Actual: removal, role selection and ownership controls stack on every manageable member, producing tall rows; a large group would take substantial scrolling. Standard member rows are more compact.

Expected: a compact contacts-style directory with usable management actions. Recommended fix: retain name/role in the row and place secondary controls behind a per-member action menu; preserve touch targets, confirmation and server permissions. Evidence: mobile group management capture. This is a scoped UI change needing review.

### QA-06 — Player results contain a replacement-character separator

Severity: **Low**. Status: **Verified** (local automated checks; physical-device review remains).

Reproduce: search players with a result containing location and skill. Actual: the separator displays a replacement glyph (U+FFFD); also present in `src/Players.tsx`. Expected: readable location/skill metadata. Recommended fix: replace the malformed literal with the intended separator. Evidence: desktop players screenshot.

### QA-07 — Community routes retain the generic court-discovery document title

Severity: **Low** (orientation/accessibility). Status: **Verified** (local automated checks; physical-device review remains).

Reproduce: navigate among Account, Groups, Feed and Schedule and inspect the browser tab title. Actual: community pages retain the court-discovery title. Expected: route-specific title with OpenCourts branding. Recommended fix: update titles through shared route/page handling; verify back navigation.

### QA-08 — Player search loading lacks a live status announcement

Severity: **Low** (accessibility). Status: **Verified** (local automated checks; physical-device review remains).

Reproduce: delay a player search response. Actual: Find players becomes disabled, but the dynamic capture finds no `role="status"` region. Expected: a concise announced loading/result status without moving focus. Recommended fix: add a polite status region and verify results/error announcements. Evidence: `searchLoading` in dynamic JSON.

## Security, functionality and design findings

The executed unit/regression/live API checks cover authorization, private group access, requests/approvals, guest capacity, invitation revocation, blocking and report workflows. No private content exposure through the tested unauthorized requests was demonstrated. This is bounded evidence, not a penetration-test guarantee. Moderator access is explicitly assigned to the development Sam account; group ownership alone does not grant site moderation.

Real Apple/Google sign-in, provider linking consent and account recovery were not automated during this audit. Their previous manual success is not counted as a new audit pass. No real invitations, payments or production writes were sent.

UI generally reuses existing OpenCourts colors, typography, cards, icons and the system theme. Both themes rendered across the audited routes. The manager directory, contrast, metadata separator and confirmation flow are the most actionable consistency issues. Measured small footer targets need manual assessment of spacing/target-size exceptions; small text bounds alone do not prove a WCAG target-size failure.

Bundle-size review warrants a later performance pass: the map bundle is roughly 1.06 MB uncompressed, 285 KB gzip; main JavaScript roughly 373 KB/112 KB gzip; CSS roughly 187 KB/32 KB gzip. These are build sizes, not measured load times or Core Web Vitals. Do not remove map functionality or change dependencies solely on this evidence.

## Untested / follow-up checks

Status: **Blocked** for physical-device and real-account checks until an appropriate test session/device is available; these are coverage limitations, not confirmed defects.

- Actual iPhone Safari, Android Chrome/TWA and tablet testing, including file picker/crop gestures, safe areas, keyboard and back navigation.
- VoiceOver/TalkBack/NVDA, keyboard-only end-to-end autocomplete/dialog flows, 200–400% zoom and forced-colors checks. Automated axe scans do not replace these.
- Real OAuth login/logout/linking and cross-platform account identity using test accounts.
- External geocoding/weather failure and rate-limit behavior on real networks; slow-network performance and measured Core Web Vitals.
- Long real-world rosters/inbox/feed pagination, simultaneous last-place joining and revocation while multiple tabs are active beyond existing synthetic coverage.
- Comprehensive dependency advisory reconciliation and penetration testing. No claim of zero vulnerable dependencies is made by this audit.

Potential concerns requiring reproduction before being called defects: stale/out-of-order player search results under rapid requests; repeated account reads across header/page components; lengthy historical documentation with superseded decisions. Do not treat development StrictMode request counts as production traffic measurements.

## Repeat and fix plan

Run `npm.cmd test`, `npm.cmd run build:dev`, and `npx.cmd playwright test --grep-invert "audit matrix|audit dynamic" --workers=4` with `OPENCOURTS_CHROME_PATH` pointing to installed Chrome as needed. Audit-specific commands: `npx.cmd playwright test tests/qa-audit.spec.ts tests/qa-dynamic-audit.spec.ts --workers=4`. The matrix requires axe-core 4.10.3's `axe.min.js` at ignored `.wrangler/qa-audit/axe.min.js` (downloaded from the pinned axe-core CDN distribution for this audit); it skips explicitly if absent. No package dependency was added. Regenerating evidence overwrites captures.

Live checks use `scripts/preview-acceptance.ps1 -RunPreviewAcceptance`; inspect its development-only guards and ensure preview credentials are available before running. Never substitute production database IDs.

Review this report before changes. Suggested order: QA-01 privacy-state handling; QA-02/03 accessibility; QA-04/05 interaction and mobile layout; QA-06/07/08 polish and announcements. After each approved fix, add relevant regression coverage, rerun affected checks and change its status to Fixed then Verified only with evidence. Physical-device review remains a release gate. The initial audit made no fixes; see the approved remediation update and verification below for current status.


## Remediation verification results

All eight confirmed findings have been fixed and verified within the local automated scope.
Initial reproduction instructions above are retained as history; they describe the pre-fix
behavior, not current behavior. Linked screenshots and matrix files have been regenerated
for verification. Original aggregate findings remain in `qa-evidence/baseline-summary.json`.

- 257 unit tests passed (17 suites).
- 85 browser workflow tests passed, including new assertions for revoked-content removal,
  confirmation focus, compact owner rows, search status and page title. Final dynamic test
  was also rerun after the last display-text corrections and passed.
- Latest 350-state evidence: zero detected page overflow, zero uncaught JavaScript errors,
  zero axe violations in the captured states. All seven light-mode and all seven dark-mode matrix tests passed in clean final runs
  (350 states total) after the final label corrections. This is still not a screen-reader or WCAG certification.
- Final development build passed TypeScript and Vite. Existing large-map-chunk warning remains.
- Live preview API checks were not rerun for these frontend-only fixes; the 26 earlier
  acceptance passes apply to the unchanged deployed preview, not the new local UI.
- No migration, push or deployment. Preview remains on `3af45daf` until explicitly published.

Changed behavior is covered by `tests/qa-dynamic-audit.spec.ts`; the matrix now explicitly
fails on contrast or invalid-ARIA regressions. Existing search tests use the corrected
combobox role; status tests identify the appropriate announcement rather than assuming
there can only be one status region. No screenshot baselines were blindly updated.

Next: publish to the isolated preview when requested, then manually verify the member
menu, cancellation/removal confirmations, revoked access, search and themes on real phones
and with a screen reader. Production remains untouched.


## Publication and follow-up QA-09 - player search race

Eight audit fixes published with user approval to c17ef75c on November 17, 2026;
stable Preview serves index-BxFx9CTz.js and HTTP 200. Production deployment and D1 binding
verified unchanged. Later local work is not part of that deployed bundle.

QA-09 severity: Low; status: Verified locally, not deployed. A synthetic overlapping-form
submission stress test demonstrated that an older response could overwrite the latest
player results and count. This deliberately exercises concurrent submissions; normal UI
buttons are disabled while loading, so it is not a claim that every rapid tap reproduces it.

Fix: abort superseded player-search fetches, use a generation guard for results/errors/busy
state, clear stale pagination on failure, and invalidate requests on unmount. No backend,
permission or schema change. Regression failed before, passed after; 10 focused browser
checks passed across discovery, blocking/reporting, city/ZIP and location suggestions.
Evidence: tests/player-search-race.spec.ts; local logs search-race-before.log and
search-race-after.log under ignored .wrangler/qa-audit. Manual device checks remain open.

Local search-hardening validation: 257 unit tests (17 suites) and development build passed;
10 focused browser checks passed. This follow-up is not deployed in c17ef75c.


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

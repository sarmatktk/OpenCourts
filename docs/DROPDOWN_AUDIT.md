# Dropdown and date/time audit - November 18, 2026

Latest Preview: https://fc5d3849.opencourts.pages.dev
Stable: https://feature-play-together.opencourts.pages.dev

## Findings and resolution
The earlier width-only and appearance:base-select fixes did not provide consistent menus across browser versions and did not cover the native datetime popup. They are superseded by SiteSelect and SiteDateField, using existing OpenCourts theme/interaction tokens and Lucide icons. No new UI framework or backend/schema changes.

| Area | Audited controls |
| --- | --- |
| Court discovery | Sorting, distance, surface |
| Game discovery | Distance, format, skill, date |
| Create game | Visibility, time zone, duration, format, skill, date/time |
| Account and players | Profile skill, player skill filter |
| Group creation/editing | Visibility, skill |
| Group management | Member role, invitation expiry |
| Game invitations | Hosted-game picker, long titles |
| Guests | Guest-count selection |
| Reporting | Report category |
| Calendar | Hour and minute |

All 20 existing select usages plus calendar hour/minute use SiteSelect; raw select exists only inside the shared implementation. Native select state, form validation and change handling remain; pointer and keyboard activation open a site-rendered listbox. Fixed positioning uses the visible viewport, flips above when needed, wraps long labels, limits height and scrolls options. Escape, outside interaction and Tab close the menu. Arrow/Home/End/typeahead navigate; Enter selects. Labels/active option/selected/disabled states are exposed. Menus inside the modal calendar render within the dialog top layer.

Both date usages now use SiteDateField. Its native modal dialog fits the viewport, traps focus and restores the calendar trigger on close. It contains month navigation, a calendar, optional hour/minute pickers, Clear and Apply. Manual ISO date/time entry remains possible; existing server time-zone and date validation remain authoritative. The time-zone datalist is now the same SiteSelect as other controls.

Address suggestions and expandable filter/action panels already use site-rendered styling and were retained; they are not OS option menus. Reviewed styling is inherited from the existing components. Date-dialog and open-menu screenshots were inspected in dark mode; screenshot artifacts stay under ignored .wrangler/qa-audit.

## Validation and limits
Final 52 browser checks passed: 320/375/440/768/1440 open-menu geometry, long options, keyboard and Escape; calendar selection, focus restoration, nested time menu, both themes; game flows and shared interaction colors. Earlier 23 focused court fallback/invitation/menu checks passed; group/profile/navigation regressions also passed during the broader audit. TypeScript/development build and whitespace checks passed. Affected approved screenshot baselines refreshed. Native-menu assumptions in tests were replaced by assertions on the actual rendered listbox and date dialog.

Chrome on Windows with responsive viewports was tested. Physical iOS Safari, Android Chrome/TWA, tablet touch and screen-reader verification remain release checks; do not claim those were run. The controls no longer depend on browser support for customizable select CSS. The standard dialog API is used.

Production deployment and D1 bindings were checked before publication and unchanged. No production or database changes and no Git push. Next: user review of menus and date/time dialog on stable Preview, then physical-device release testing.


### November 18 - Dropdown selection-value audit and direct callbacks published

Latest Preview 8019d3ea: https://feature-play-together.opencourts.pages.dev. User reported iPhone selections reverting in player skills, game format and member roles. Initial Chrome touch/desktop request tests did not reproduce the original failure; do NOT claim a physical Safari reproduction. Replaced SiteSelect's imperative hidden-select synthetic change dispatch with direct onValueChange(string) callbacks across all 22 usages (main sort/distance/surface; creation visibility/time-zone/duration/format/skill; guest count; member role; group visibility/skill; group-invite expiry; game-invite picker; profile/player/discovery skills; discovery radius/format; report category; calendar hour/minute). Hidden native select stays for form values/validation and cannot open a native picker. Trigger blur with null relatedTarget no longer immediately discards option clicks; option click prevents label/default bubbling. Group role confirmation text now maps chosen role instead of reading event.target.selectedIndex.
Validation: six payload-level browser cases passed on touch and desktop: three successive player skills reach search URL and retain selected state on reopening; singles persists across duration/skill/title edits and submits format=singles/capacity=2/duration=90/skill=advanced; Organizer reaches role confirmation then role API and refreshed membership display. Ten existing cross-device touch/desktop cases each passed in the combined run (that run was interrupted because new payload test fixtures needed corrections; final six-case run passed). TypeScript/development build and whitespace check passed. Google and Apple true after deploy. No production/config/database changes, no Git push. Existing physical-device retest is still required. Role dropdown intentionally shows current persisted role until confirmation/refetch; cancellation leaves role unchanged.
Next: user iPhone check for actual value persistence and role confirmation. Broader old specs that use native selectOption must be migrated to real button/listbox actions before full release-suite claims. Docs/DROPDOWN_AUDIT.md contains additional audit record.


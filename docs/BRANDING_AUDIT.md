November19 spacing follow-up: see [COMPACT_LAYOUT_AUDIT.md](COMPACT_LAYOUT_AUDIT.md). Shared brand assets and light/dark tokens are preserved; density improvements are scoped to community panels, forms and action groups.

# Shared logo audit - November 19, 2026

Reference: the existing main court page header and footer. Their corresponding
desktop sizes, tennis-ball geometry, Manrope wordmark and adaptive colors are used
across the site. Header and footer retain the main page's size hierarchy.

| Desktop property | Header | Footer |
| --- | --- | --- |
| Wordmark | 22px, open 800 / courts 500 | 16px, same weights |
| Mark diameter | 36px | 26px |
| Tennis-ball glyph | 20px | 18px |
| Spacing | 9px gap, -0.8px letter spacing | Same |
| Light theme | Dark green mark, dark text, muted courts | Same |
| Dark theme | Pale green mark, light text, muted courts | Same |

Mobile follows the main page's existing icon sizing and compact header treatment;
footer wordmarks remain visible. Keyboard focus and 44px minimum link targets are
shared. Logos retain their colors on hover and follow live device-theme changes.

Implementation: `public/brand.css` is the shared style source, loaded by index.html
and pages.css. `src/SiteBrand.tsx` supplies React logo markup using TennisBall.
Legacy logo overrides were removed from application, information, Support and landing
styles. Static SVGs are checked against the same geometry. Community and Account
footers now include the matching footer logo. The 404 page has matching header/footer
branding too. Existing links, page content, accounts and permissions are retained.

Audit coverage: 30 page/view states, 390/768/1440px, light/dark: main courts; Privacy,
About, Contact, Support, Help; all seven guide pages; 404; Account; community home,
search, Feed, Create game, My Games, Groups, My Groups, Create group, Players, inbox,
game/group details, Manage series and both invitation views. These chrome comparisons
use signed-out/unavailable fixtures, not real private records. Signed-in account,
group, game and navigation behavior is also covered by the scoped regression run.

The automated audit compares computed header/footer typography, dimensions, colors,
spacing, borders and SVG geometry against the main page, plus hover, focus, home-link
semantics and live theme switching. Six matrix reports represent 180 page visits /
360 header/footer logo comparisons. Reports and review crops remain ignored under
`.wrangler/qa-audit/branding-*`. See APP_TESTING_CHECKLIST.md for final publication
and verification evidence; physical-device/store acceptance remains separate.

Final 90-test scoped run passed (1.9m), no snapshot updates; build and Functions
compilation passed. Published Preview 3cccd5df. Sixteen intended full-page baselines
updated in a separate 15-test pass. Contact email also changed to support@opencourts.us
in live sources; historical QA captures preserved. Production 7ef38ff2 unchanged.

Launch-readiness full audit follow-up: light-theme muted wordmark darkened from
#748078 to #59685f after axe detected contrast below 4.5 on tablet/desktop backgrounds.
All three affected matrices passed after correction. Shared geometry/size hierarchy
and dark palette retained; current launch validation is in APP_TESTING_CHECKLIST.md.

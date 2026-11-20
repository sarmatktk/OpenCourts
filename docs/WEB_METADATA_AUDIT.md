## Metadata and analytics published - November 20, 2026

Production **c8272ecf** is live from Git commit **023e078**. New premium versioned
social artwork, consistent browser/Apple/install icons and a single shared Google
Analytics loader are published across public and generated community pages.
Owner confirmed Enhanced measurement is off. Explicit page views use approved
paths/generic titles and suppress query strings, fragments and referrers; Preview
hosts do not load the Google tag. Privacy disclosure is updated. Keep Enhanced
measurement off. Actual GA dashboard receipt has not been verified.

435 unit tests, production build and seven stubbed-network browser checks passed.
Published production verification passed 30 routes and six assets. Per owner
instruction, did not wait for or run additional Preview acceptance. No snapshots
updated, SQL changed/applied, secrets changed, Android bundle published or Google
Play upload performed. Android/store-asset work remains preserved separately.
See WEB_METADATA_AUDIT.md and qa-evidence/site-metadata-production.json.

# Social previews, icons and analytics â€” November 20, 2026

Shared website/social image: `public/social-preview-v2.png` (1200 x 630, opaque
PNG, 358986 bytes). The original remains available. Main, information, policy
and generated community pages use the versioned URL to avoid stale image caches.
City/weather guides retain their distinct topic images. Shared image alt text now
describes courts, weather, games, groups and game chat accurately.

Every static HTML page and generated community route has ICO and SVG favicons,
an Apple touch icon and the web manifest. Existing icon designs and installed-app
associations remain unchanged. Private activity routes remain noindex and are not
added to the public sitemap.

All pages load `public/site-analytics.js` once. It uses the existing measurement
ID and runs only on production hosts. Explicit page views use approved paths and
generic page titles, without queries, fragments, player names, email addresses,
game/group IDs or invitation tokens. Unknown paths map to `/404`. No analytics
events are attached to chat, report forms or account fields. Existing landing CTA
destinations now strip queries/fragments. Referrer and advertising-signal settings
are restricted in the tag configuration. Privacy policy disclosure was updated.

Owner confirmed GA Enhanced measurement is OFF on November 20. Keep it off,
including history, form and site-search tracking; enabling it bypasses the site's
explicit-event-only design. No Analytics property credentials were accessed and
no dashboard receipt/realtime confirmation is claimed.

Verification: 435 unit tests passed. Production branch-aware build passed. Seven
browser checks passed against the built pages with Google requests stubbed: home,
privacy, community, game, invitation, account and a Preview-host case. Confirmed
one production tag initialization/page view, no sensitive URL values, no Preview
measurement, four icon/manifest declarations and no JavaScript errors. No real
analytics events were sent during these checks. Evidence:
`qa-evidence/site-metadata-browser.json`.

The first unit run reported 434 passes and one migration checksum failure after
Windows checkout altered line endings. Compared all SQL to the frozen release:
normalized contents match for all 31. Preserved original byte hashes and added
normalized hashes; verification now checks canonical line endings without changing
SQL or database state. No migration was applied.

Image made with built-in imagegen, referencing the original social card. Prompt:
premium deep forest-green OpenCourts banner, golden-hour court/net/tennis ball,
existing tennis-ball wordmark, refined white serif headline "Find your court.
Play together.", subtitle "Courts. Weather. Games. Groups.", three outlined chips
"Find courts", "Join games", "Game chat", and "OPENCOURTS.US". Generous safe
margins, lime accents, no ratings, people, download buttons or clutter. Final edit
changed only the third chip from "Group chat" to "Game chat" for feature accuracy.
Exported with Sharp to the social-card size and optimized palette PNG.

This audit does not publish Android artifacts or upload anything to Google Play.

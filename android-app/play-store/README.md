# Play Store feature graphic

## Tablet screenshots (courts, weather and Play Together)

Seven screenshots per category, in matching upload order:

| File | Screen |
| --- | --- |
| 01-court-discovery.png | Main OpenCourts introduction, court list and map |
| 02-court-map.png | Nearby court locations, lighting and court details |
| 03-weather.png | Seven-day weather and recommended playing windows |
| 04-find-games.png | Public game discovery |
| 05-game-details.png | Schedule, venue, attendance and chat entry |
| 06-tennis-groups.png | Local tennis communities |
| 07-game-chat.png | Game coordination in dark mode |

- `tablet-7-inch/`: portrait 1200 x 1920 PNGs, captured at 800 x 1280 CSS pixels.
- `tablet-10-inch/`: landscape 2560 x 1600 PNGs, captured at 1280 x 800 CSS pixels.

Use each folder in its matching Play Console tablet screenshot section. These
are tablet viewport captures of the actual production web UI used by the TWA,
not captures from installed tablet hardware. Courts/map/weather use public live
data; community content uses fictional browser-local fixtures. No private player
data, credentials or real messages appear. Weather is a dated capture, not a
promise of future conditions. No UI styles were changed for these images.

Regenerate in PowerShell with `$env:STORE_CAPTURE_PROFILE='tablet-7-inch'` or
`'tablet-10-inch'`, then `node scripts/capture-store-screenshots.cjs`. Unset that
variable to regenerate phone captures. Each folder includes its capture manifest.
Both sets were visually reviewed; PNG dimensions, opacity, page overflow and
JavaScript errors were checked. No Play Console upload was performed.

Tablet dimension guidance:
https://developer.android.com/google/play/requirements/screenshots-android-cli

## Play Together phone screenshots

Upload the PNGs in `screenshots/` as phone screenshots, in this order:

1. `01-find-games.png` — upcoming public doubles and singles games.
2. `02-game-details.png` — schedule, venue, capacity and game chat entry.
3. `03-tennis-groups.png` — finding and joining a tennis community.
4. `04-game-chat.png` — private game coordination in dark mode.

Each is 1080 x 2160. These are browser captures of the actual production app
interface with locally intercepted sample data, not AI-generated UI. Names and
conversations are fictional. No production records were created and no real
private conversations or player photos were captured. No application styles were
changed for the screenshots. They show the web interface used by the Android TWA;
they are not evidence of an installed Google Play bundle acceptance test.

Regenerate with `node scripts/capture-store-screenshots.cjs` (Chrome and project
development dependencies required). `capture-manifest.json` records routes,
dimensions and themes. No store upload has been performed.

## Feature graphic

Use `feature-graphic-v2.png` for the Play Together release: 1024 x 500, RGB PNG,
no alpha. Visually reviewed after export. Original `feature-graphic.png` is
preserved; `feature-graphic-v2-master.png` is the generated higher-resolution master.
No Play Console upload was performed.

Highlights: courts/weather, finding games, joining groups, game/series chat and
notification alerts. The illustrated cards communicate features rather than
presenting captured application screenshots.

Created with the built-in imagegen tool, using the original banner as edit input.
Production prompt: Update the OpenCourts Google Play feature graphic for Play
Together. Preserve the tennis-ball logo/wordmark, cream background, deep forest
green and tennis-lime palette, curved baseline and corner texture. Use headline
"Find your court. Play together." and supporting copy "Courts & weather · Games
& groups · Chat & alerts". Show overlapping court-map/weather and Play Together
cards with "Find games", "Join groups", "Game & series chat", calendar/people/chat
icons and a bell. Premium typography and readable hierarchy, with essential content
inset from edges. No ratings, awards, prices, booking guarantees, download buttons,
Apple branding, personal data or version numbers. Opaque landscape composition.
Exported to the required store dimensions with Sharp after image generation.

Specification reference:
https://support.google.com/googleplay/android-developer/answer/9866151

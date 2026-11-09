# iOS handoff: international courts, weather, and dry-court estimates

Prepared November 8, 2026. Read this before implementing international support on Mac.

## Required scope

**Keep everything in the US working exactly as it currently does.** The user explicitly repeated this requirement. Preserve US court discovery, filtering, caching, NWS weather and alerts, NOAA/MRMS rain requests, radar scores, recommendation rules, and UI behavior. Add explicit international branches instead of replacing shared behavior globally.

The requested iOS work is to bring the international experience into line with the web changes: faster court loading, usable international weather, and an honestly labeled forecast-based rain estimate near courts.

This README is a handoff, not a claim that the Swift implementation is complete. No Swift files were changed during the web work. Inspect the current checkout before editing; a newer Mac checkout may contain additional changes.

## Important deployment distinction

The Swift API client currently uses `https://opencourts.us`. The web/backend changes described here were implemented and tested locally on Windows, **not deployed during this work**. Pulling Git changes onto Mac does not update that hosted API.

Before testing iOS, verify which backend version the app is calling. Use the updated local backend through a development-only base URL, or coordinate deployment of the updated Pages Functions. Preserve the production base URL for release builds. Never bundle provider API keys into the iOS app.

The files must be committed and pushed from the Windows checkout before they can arrive through `git pull` on Mac. This handoff does not imply that commit, push, or deployment has happened.

## What changed on the web/backend

| Area | Current implementation to consult |
| --- | --- |
| International weather routing, normalization, and cache | [`../functions/api/weather.ts`](../functions/api/weather.ts) |
| International court provider requests and edge cache | [`../functions/api/courts.ts`](../functions/api/courts.ts) |
| Country inference, request parameters, and browser court caches | [`../src/services.ts`](../src/services.ts) |
| Six-hour area forecast estimate | [`../src/international-rain.ts`](../src/international-rain.ts) |
| Country-specific orchestration and UI | [`../src/App.tsx`](../src/App.tsx), [`../src/DryCourtCard.tsx`](../src/DryCourtCard.tsx), [`../src/CourtDetailSheet.tsx`](../src/CourtDetailSheet.tsx), [`../src/court-condition.ts`](../src/court-condition.ts) |
| International solar date correction | [`../src/sun.ts`](../src/sun.ts) and `weeklyPlayWindows` in `src/services.ts` |
| API model fields | [`../src/types.ts`](../src/types.ts) |
| Local-only server fallbacks, keys, and memory cache | [`../vite.config.ts`](../vite.config.ts), [`../.env.example`](../.env.example) |

### Weather

International requests use `/api/weather?lat=...&lon=...&provider=met`. The `provider=met` parameter is a historical international routing switch; **it does not guarantee that MET Norway is the returned provider**.

The current international server order is:

1. WeatherAPI when `WEATHERAPI_KEY` is configured. The request uses three days; do not promise seven days for every response.
2. Open-Meteo, requesting seven days, local time-zone metadata, Unix timestamps, Fahrenheit, mph, humidity, and hourly precipitation probability.
3. MET Norway as an outage fallback. Its global data may lack precipitation probabilities and local time-zone metadata.

Successful international responses have a 30-minute edge-cache lifetime. WeatherAPI timestamps are normalized using `time_epoch`; Open-Meteo uses `timeformat=unixtime`. Both become ISO 8601 UTC instants. MET Celsius and m/s values are converted to Fahrenheit and mph server-side. **Do not convert these normalized response values again in Swift.**

Responses include `periods`, `outlook`, `timeZone`, and optional `source`/`attributionUrl`. Each forecast can include `precipKnown`. When it is false, the numeric precipitation placeholder must not be treated as a known zero-rain probability when making international estimates. Display attribution for the actual returned source.

US requests omit the international switch and retain the existing NWS implementation.

### Courts and loading

International requests use `/api/courts?lat=...&lon=...&country=jp` (or another lowercase two-letter code). US requests keep their existing shape.

The international backend races public Overpass requests and, when configured, a Geoapify tennis lookup. Successful listings are edge-cached for six hours. Public providers can still time out or return 429, 502, or 504; this work does not eliminate provider outages or guarantee complete coverage.

The web client now caches successful international listings even when addresses are sparse. Its international browser key was bumped to `opencourts-courts-v22-...`; the US key remains unchanged. Browser-specific session/local storage code is a reference, not something to copy literally into Swift.

Vite local development now tries the local international court handler first and uses the deployed court API only if that handler fails. It also keeps international court responses in memory for six hours and weather for 30 minutes, and reads optional international provider keys from `.env`. This is **development middleware**, not an iOS or production-server feature. Do not copy its proxy loop into the production `/api/courts` handler. When forwarding an already decompressed response, do not forward obsolete `Content-Encoding` or `Content-Length` headers.

### International rain estimate: exact meaning

There is no new international radar or court-surface observation service. The implemented feature is **an area forecast estimate**, not a model of elapsed drying time after rain.

Port `src/international-rain.ts` rather than the earlier chat's naive `slice(0, 6)` approach:

1. Select forecast intervals overlapping `[now, now + 6 hours)`, including the remaining part of the current hour. Exclude elapsed hours, invalid probabilities, and intervals with `precipKnown == false`.
2. Sort by start time. Require continuous coverage of the entire six-hour window; missing coverage means unavailable, not a perfect score. Use an explicit end time or one hour after start. Avoid double-counting overlaps.
3. Compute the duration-weighted mean hourly rain chance, then round to the nearest integer.
4. Set `score = 100 - averageChance`.
5. Reuse that same area estimate for nearby courts. Keep `rain1h`, `rain3h`, and `rain6h` nil. Mark the result as `source: "forecast"`, with `forecastRainChance` and `confidence: "Moderate"`.
6. Show eligible nearby courts by distance when they share that estimate. Do not imply measured differences between their surfaces.

Suggested copy: “20% average hourly rain chance over the next 6 hours” and “Area forecast estimate. Courts may still be wet after rain; check the surface.”

Do not label these results NOAA, radar, recent rainfall, measured dryness, inches of rain, or a probability that a court is dry. Hide the radar 1H/3H/6H rainfall timeline internationally. Do not require `High` radar confidence to display international forecast recommendations. Keep existing winter and heat cautions visible.

### Time zones and daylight

The live Tokyo browser received weather successfully but displayed no daylight windows. An existing solar calculation applied a US sunset date adjustment internationally. The fix adds an **opt-in international argument** to the solar helpers and daylight planner; the default US calculation is preserved.

For international solar events, normalize the UTC hour, then adjust the result onto the intended calendar date in the location's time zone. See the code and tests for Tokyo, London, Sydney, and Auckland. Use the forecast location's time zone when grouping days and formatting times, rather than the device's time zone.

The current Swift weather screen uses a fixed local 08:00–18:00 filter. Inspect that behavior before deciding how to bring international daylight planning into parity. Do not silently replace the US planner. Also select the current forecast interval by its timestamp; Open-Meteo's first hour can be midnight, not the current hour.

## Swift files and specific work remaining

| File | Findings and work to do |
| --- | --- |
| [`Models.swift`](Models.swift) | `Place` and `PlaceSuggestion` have no country code. Add backward-compatible optional country metadata; preserve it through suggestions, selected places, and persisted data. Add optional `Forecast.precipKnown`, weather source/attribution, and forecast assessment metadata. Review all memberwise initializers and copies when adding fields. |
| [`OpenCourtsAPI.swift`](OpenCourtsAPI.swift) | `courts` and `weather` currently omit international routing parameters. `alerts` and `rain` are US service calls. Preserve the current US methods/branches; pass country/provider parameters internationally and skip US-only requests there. Mirror the web's international geocode/suggest parameters without changing US search. |
| [`OpenCourtsAPI.swift`](OpenCourtsAPI.swift), private response models | `OSMElement.id` currently decodes only `Int`, but Geoapify-backed international results contain IDs such as `"geo-0"`. Decode both numeric and string IDs without breaking US IDs. Synthetic provider IDs are not real OSM object IDs; do not fabricate an OSM object link for them. The geocode response model currently drops country metadata. |
| [`OpenCourtsStore.swift`](OpenCourtsStore.swift) | `load` currently awaits courts, weather, and US alerts together, then requests radar rain. Add an international path with independent court/weather completion and errors; an alert or court outage must not suppress successful weather. Build forecast estimates locally from returned weather. Cancel or ignore obsolete search results, prevent data from different cities mixing, and clear old US alerts/radar results when switching internationally. |
| [`OpenCourtsStore.swift`](OpenCourtsStore.swift), cache | Preserve existing US cache behavior. Add location/country-aware international cache keys and freshness checks; avoid treating an empty result or a provider failure as proof that no courts exist. Do not display an old city's courts as fresh data for a new search. |
| [`ios-app/ContentView.swift`](ios-app/ContentView.swift) | Inspect `CourtRainCard`, `RainPlannerSection`, recommendation cards, `RainfallTimeline`, `WeatherSection`, and `ForecastDate`. Add international copy and attribution, suppress radar labels/timelines internationally, and render partial weather coverage honestly. Preserve all US UI branches. |
| [`ios-app.xcodeproj`](ios-app.xcodeproj) | Check target membership and build settings for any new Swift files on Mac. |

Country routing must use actual location metadata, not the device locale or a coordinate bounding box. Existing cached places will lack the new optional field. For a “Your location” GPS result, resolve its country before choosing the international provider; the web's label-based inference cannot classify that label by itself. Preserve known US behavior while handling this explicitly.

## Mac implementation and validation checklist

1. Read this file, applicable repository instructions, and the current Swift source. Capture a US baseline before editing.
2. Confirm the updated backend is reachable from the chosen simulator/device. `localhost` on a physical iPhone is the phone itself; a Mac development URL needs suitable network reachability. Keep development URL/security settings out of release behavior.
3. Extend models with backward-compatible decoding and international country routing. Verify numeric and string court IDs using representative JSON fixtures.
4. Implement international request orchestration, caching, and forecast estimates. Keep the US path intact.
5. Update international views and local-time/daylight handling. Test a device time zone different from the searched city's time zone.
6. Build with Xcode and run simulator tests. Discover the actual project schemes and available simulator destinations rather than assuming a scheme or device name.
7. Test Tokyo and London end to end: court list/map, current weather, available forecast days, recommendation cards, attribution, selection, and directions. Verify no `/api/rain` or `/api/weather-alerts` requests are issued for those locations.
8. Test Sydney/Auckland dates and sunrise/sunset ordering, stale forecasts, gaps in six-hour coverage, `precipKnown: false`, WeatherAPI's shorter horizon, provider timeouts/429 responses, and rapid city changes.
9. Test Fairfax and another US location against the baseline. Preserve US request parameters, NWS alerts/forecast, NOAA rain amounts, scores, ordering, filters, cache behavior, and labels.

Reference tests: [`../tests/international-rain.test.ts`](../tests/international-rain.test.ts), [`../tests/international.spec.ts`](../tests/international.spec.ts), [`../tests/overpass.test.ts`](../tests/overpass.test.ts), plus the existing US service, catalog, and browser tests.

Web checks last passed: production build, 115 unit tests, and Tokyo/US mocked browser checks. Separate live local browser checks showed seven forecast days for Tokyo and London, one Tokyo court venue, and six London venues, using the deployed court fallback during Overpass failures. These counts are observations, not expected results or completeness guarantees. **No Xcode build or native iOS validation was performed on Windows.**

## Prompt to give the new Mac chat

> Read `ios-app/README.md` and inspect the current Swift files. Implement the international court, weather, and forecast-based rain-estimate parity described there. Keep all US behavior exactly as it is. Verify the backend version before testing, handle country codes and string court IDs, keep court/weather failures independent, and test on the iOS simulator. Report what changed, what was validated, and remaining provider or deployment limitations. Do not treat the README as evidence that the native work or backend deployment is already complete.

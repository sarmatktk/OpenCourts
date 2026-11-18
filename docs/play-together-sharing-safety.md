# Sharing, discovery and safety - development milestone

Deployed to isolated Preview on November17,2026: https://65f4d761.opencourts.pages.dev
Stable: https://feature-play-together.opencourts.pages.dev
Remote development migration0017_sharing_safety.sql applied to opencourts-dev only.

## Game audiences and sharing

Public games remain searchable and require host approval. Group games remain visible only
to approved current group members, with member self-join and separately approved guests.
New unlisted games stay out of public discovery and require signed-in invitation access.
Create Game offers Public/Unlisted; approved group creation uses the same shared service.

Public/group games have native Share/copy controls; forwarding a group URL never bypasses
membership. Unlisted host creates a7-day invitation in the UI (API accepts1-30 days) or revokes
it. Raw256-bit token is returned only at creation, stored hashed, placed in URL fragment and
removed from the address before redemption. No localStorage/token in query strings. Sign-in
is required, and signed-out users reopen the original invitation after signing in.

Redemption grants viewing/requesting only. It does not join/reserve a place. Revoked/expired
links stop granting access to unconfirmed invitees. Confirmed participants and host retain
access independent of invitation validity. Revocation does not automatically withdraw a
pending request; the host may still explicitly approve it. Non-hosts cannot issue links.
Unlisted content is protected in details, participation, feeds, My Games and notifications.

## Player discovery and safety

/play-together/players requires sign-in and lists only opted-in active players: display name,
general location, self-reported skill and bio. No email/provider ID/private group activity,
private address or other-account photos. Account discoverability checkbox is off by default.
Search by name/general location and skill;25-item cursor pages. Opt-out removes future results.

Block is symmetric in discovery and prevents new join requests/approvals to either player's
hosted games. Existing participants/group memberships remain; blocking is not an eviction
or a promise that shared public/group content becomes invisible. Group-member rows expose
collapsed Safety options; block list/unblock lives on Players. Group managers still handle
membership concerns. No messaging system was introduced.

Report player, game or group: category and optional1000-character plain-text details. Only
accessible content can be reported; group preview is reportable but private game content is
not inferable. Reports are private, authenticated, CSRF-protected, hourly-limited and
one-open-report per subject/reporter. Reporting does not auto-remove content.

Only server-configured MODERATOR_PLAYER_IDS may read/review the queue. User explicitly chose
Sam who owns Tennis:87be695a-f00f-4689-b0c7-16ad9a50346d. Configured Preview only; other Owners,
Co-owners/Organizers are not site moderators. Sam sees Report review on Players and may mark
reports resolved. Queue exposes submitted report text/references, not automatic private-group
content access. Human triage and enforcement remain operational responsibilities.

## Roster and testing

Member directory is compact, with search and50-item cursor pages; no old200-member truncation.
Membership requests retain their existing200-row review bound. No private roster access for
outsiders. Sensitive API responses are private/no-store with existing Origin/CSRF/session checks.

251 unit tests and76 browser tests passed. Full browser suite covers existing maps/courts/weather,
themes, phone/tablet widths, account/media, groups/roles/invitations, participation/guests,
unlisted links, discovery and safety. Visual tolerance60pixels covers Windows font anti-aliasing;
layout/privacy/capacity assertions remain explicit. Vite now ignores .wrangler/test artifacts so
local tool writes cannot crash its file watcher. No production proxy for new player APIs.

Live acceptance:26 requests using temporary synthetic accounts on actual Preview/D1 passed:
group approval, member self-join, host+member+guest=3, guest cancel=2, member leave=1,
host/requester notifications, outsider denial, unlisted invite access/revocation, block filtering,
report creation and non-moderator denial. Synthetic accounts/groups/games/sessions/reports were
removed afterward. scripts/preview-acceptance.ps1 requires explicit switch and hard-checks devUUID.
This exercises real backend/session logic but does NOT verify provider sign-in or physical devices.

## Dependency audit

Updated maplibre-gl within5.x to5.24.1. Maintainers list it as patched for GHSA-jrc7-96c5-q579:
https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579
Inspected installed allow-list sanitizer and added a browser regression for consecutive unsafe
attributes. npm audit metadata still uses an overbroad<=6.4.0 range and flags this patched5.x
backport; do not claim zero audit findings. Resolve/reconcile this discrepancy before production
approval. Development-tool audit findings also remain to triage separately; no npm audit fix --force.

Real OAuth/device acceptance and the production release decision remain pending. No payments,
recurrence, native Swift work, GitHub push/main merge or production changes were performed.


November17 player location search LOCAL ONLY: player lookup previously compared literal q with saved general_location, so22033 could not matchFairfax. New player-search-location helper uses existing geocode handler for US ZIP/ZIP+4, validates returned postcode/country, expands safe city/county labels (e.g22033 ->Fairfax County ->Fairfax), and supports city-state labels through existing cityStateQuery. Player names are never sent to geocoder; no profile addresses/coordinates stored or returned. Generic city/name text search remains. UI labels Name, city or ZIP code and displays resolved area, with readable skill labels. General-area matching, NOT precise ZIP boundaries, proximity radius or guaranteed disambiguation of free-text same-name cities. Existing opt-in/block/active filters and pagination retained. Lookup failures/malformed or wrong postcode return explicit errors.39 group/geocode API checks and two phone light/dark browser checks passed; build passed. No migration/resources/production changes. Schedule-tabs update remains local too; last hosted10cf494a. Publish both on next explicit Preview approval.


Approved schedule/ZIP-search review build published: https://b7d3bd1d.opencourts.pages.dev, stable feature alias unchanged. My Games/Players HTTP200 with index-Bw5A20Db.js verified. Includes Upcoming/Requests/Past/Cancelled server-filtered pagination and ZIP/city player matching. No migration, production changes or GitHub push. Supersedes local-only schedule/ZIP checkpoints.


November17 location autocomplete LOCAL ONLY: shared LocationAutocomplete now powers Players location search and Account General location. Player-name field separated to keep names out of external location suggestions. Reuses existing Photon/Nominatim client with300ms debounce, aborts, keyboard arrows/Enter/Escape, touch-friendly option rows and theme tokens. Suggest/geocode now supply generalLabel/general_label from city/locality/county + state, never street/house/POI, with cacheversion8. Selected addresses store/search only general label; no profile coordinates saved. Existing manual city/ZIP input remains available. Additional optional name filter is bound server-side.91 geocode/services/groups unit checks and four light/dark ZIP/autocomplete browser checks passed; profile payload assertion proves selected123MainStreet saves onlyFairfaxVirginia. Build passed. No migration/resources/deployment/production changes. Last hostedb7d3bd1d; publish on approval.


Approved location-autocomplete build published: https://3af45daf.opencourts.pages.dev, stable feature alias unchanged. Players/Account HTTP200/index-JralF0cq.js verified;22033 geocode returns general_label Fairfax CountyVirginia. Shared suggestions preserve general city/area on selection; separate name search. No migration/resources/production changes or GitHub push. Supersedes local-only autocomplete checkpoint.

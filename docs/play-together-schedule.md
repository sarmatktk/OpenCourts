# My Games schedule views

Local update November17,2026. Preview publication pending; no schema migration.

- Upcoming (default): scheduled games the player organizes or has confirmed participation in;
  nearest first. In-progress games remain here until ends_at, labeled In progress.
- Requests: unconfirmed pending game requests before start time, nearest first.
- Past: ended scheduled games organized/attended by this player, newest first.
- Cancelled: host-cancelled games, removed/declined participation, voluntary departures,
  withdrawn requests and expired unconfirmed requests. Clear status labels distinguish them.

Server classifies/filter BEFORE50-row pagination; history cannot consume an overall100-row
limit and hide upcoming matches. Cursor follows starts_at+id, ascending for Upcoming/Requests,
descending for history. API /api/games/mine?view=... returns nextCursor. Missing view retains
all for existing clients; My Games always sends explicit view. Own left/withdrawn history
uses existing cancellation/withdrawal records; no migration or new personal data needed.

Current membership is required for all group-game history. Removed/left members cannot read
private titles, court, times or status via schedule; same permission checks cover details.
Unlisted history retains existing invitation/confirmed-player access checks. Cancellation
reasons are not returned in schedule responses. Notifications remain a separate inbox.

My Games refreshes on focus/visible30-second polling; aborted or unauthorized reads clear
stale data. Tabs use existing pill styling/theme, scroll on narrow phones, and don't reset
current tab contents when clicked again. Empty states are specific to each view.

Verification:39 game API tests and24 group API tests passed, including classification,
pagination and revoked-membership cancellation-history denial. Four focused browser checks
passed including schedule/inbox separation, both themes, tab switching, active-tab repeat,
and320px width. Development build passed. Real-account/device acceptance remains in release checklist.


Approved schedule/ZIP-search review build published: https://b7d3bd1d.opencourts.pages.dev, stable feature alias unchanged. My Games/Players HTTP200 with index-Bw5A20Db.js verified. Includes Upcoming/Requests/Past/Cancelled server-filtered pagination and ZIP/city player matching. No migration, production changes or GitHub push. Supersedes local-only schedule/ZIP checkpoints.

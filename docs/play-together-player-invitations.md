# Player discovery and direct public-game invitations

Approved November 18, 2026: discovered players may receive an in-app invitation to a
public game organized by the sender. Accepting submits a normal approval request;
an invitation does not reserve a place. First release remains free.

## User flow

- On phones/tablets, Play Together's bottom dock includes **Players**, using the same
  outline icon style as the other six destinations. Desktop retains its Players link.
- Discover opted-in players by name, city/area/ZIP and skill.
- Expand **Invite to game** on a result. The picker loads only when opened and shows
  the sender's first 50 eligible upcoming public games, ordered by start time.
- Choose a game and **Send invitation**. Existing invitations cannot be resent to
  create repeated notifications. Empty/error states explain the next action.
- The recipient's existing bell/inbox shows the invitation. **View game** opens public
  details; **Request a place** uses the existing join endpoint and host approval flow.
  The badge then shows Awaiting approval or Going. Mark as read provides dismissal
  from the unread view. No direct message, email or push notification is sent.
- Existing host/requester notifications handle join requests and approval/denial.

## Permissions and privacy

Server-side checks apply both to the picker and atomic send, independently of React:

- Authenticated active host must be the game's current organizer. No role claims from
  the request are accepted. Public games only; private-group and unlisted games are excluded.
- Target must be active, opted into player discovery, and someone other than the host.
- Either-direction blocks prevent new invitations and hide existing invitations in the inbox.
- Game must be scheduled, in the future, and have capacity based on SUM(1 + guest_count).
- Existing participants or players with an existing request/decision are not invited.
- Inbox returns only the recipient's public-game invitation projection and suppresses
  entries if the sender is inactive, the game becomes nonpublic, or its organizer changes.
- No email, private group membership, roster, private location or profile-photo access is added.
- Opting out prevents new invitations; it does not erase previously received public invitations.

## Data, API and consistency

New additive migration: `0018_player_game_invitations.sql` creates a separate table with
game/sender/recipient foreign keys, creation/read timestamps and unique(game_id, recipient_id).
Account/game deletion cascades. Existing notification tables and applied migrations are unchanged.

- `GET /api/players/invitable-games?playerId=...`: host-only eligible picker, no private game data.
- `POST /api/players/invite-game`: session/origin/CSRF protected; body contains only playerId/gameId.
- Existing `GET /api/games/notifications` includes `game_invited` entries with an `invite:` ID prefix.
- Existing notification-read endpoint updates invitation read state only for its recipient.
- Existing `POST /api/games/:id/join` submits the request; existing approval endpoint confirms it.

Insertion rechecks eligibility in SQL and is unique per game/recipient. New sends are capped
at 20 per sender/hour and 30 per recipient/day. Repeating an already-sent eligible invitation
does not create a new row. Concurrent duplicates cannot create duplicate notifications.

Invitations do not alter participation or capacity. If a game fills after sending, the
invitation shows Closed. A direct call to the normal public join API can still create a
pending request under its existing rules; it cannot reserve or overbook places. Host approval
retains its atomic capacity check. Invitation functionality does not change that behavior.

## Verification and rollout status

- 268 unit tests passed across 18 suites, including 11 new SQLite/API security cases.
- 107 browser tests passed, including host invite/recipient request, empty/error states,
  light/dark phone rendering and six-tab navigation on 320/375/390/768/1024px screens.
- Development build passed. Reviewed visual baselines updated for the new Players tab.
- Migration 0018 applied **only to guarded local SQLite** with `npm.cmd run dev:db:migrate`.
- No real invitations sent, remote database changes, deployment, or Git push in this milestone.

Hosted Preview remains schema 0017 and candidate b7c07c08. **Do not deploy this backend before
applying 0018 to isolated development D1**: the inbox now reads the new table. Never apply this
as a production change without separately approved production rollout.

For a later authorized Preview rollout, inspect `development/wrangler.remote.json` and verify
its sole binding is opencourts-dev / cae4849c-3e99-4945-9d70-bef7b48707ce. Then list pending
migrations, review the new SQL and apply only the approved pending development migration:

```cmd
npx.cmd wrangler d1 migrations list opencourts-dev --remote --config development/wrangler.remote.json
npx.cmd wrangler d1 migrations apply opencourts-dev --remote --config development/wrangler.remote.json
```

The apply command is a next-step instruction, not a command executed during implementation.
After migration, publish only feature/play-together Preview and perform synthetic two-account
acceptance. Rollback may redeploy the previous backend; leave the additive table in place
rather than deleting invitation data. Production D1 and existing mobile app domains stay unchanged.


## Invitation lifecycle
Unanswered and pending invitations expire when the game starts. Confirmed participants see Going until the game ends, then Completed. Cancelled games show Cancelled. These invitations remain in History, leave Active/Unread and do not count toward the bell badge. State is derived server-side from current game and participation data, with no scheduled job or deletion. Existing server checks prevent joining after start, regardless of an old link. Inbox history remains bounded by its existing latest-100 limit.

Published November 18: preview 741b0103, bundle index-diXCyBuI.js, remote development schema 0018. Production unchanged. See handoff for validation and remaining device checks.

Approved and published November 18: maximum 10 distinct invitees total per game, atomically enforced. Repeated sends are deduplicated; no places reserved. Preview b2743afe. See latest handoff for validation.

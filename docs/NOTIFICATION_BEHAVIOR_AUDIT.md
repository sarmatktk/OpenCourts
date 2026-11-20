# Notification behavior audit - November 19, 2026

Policy: a player's explicit action gets an on-screen confirmation, not an inbox or
push notification to that same player. Other affected players still receive the
existing notifications. The actor is the authenticated person performing the action,
which can differ from the game's organizer or group's primary Owner.

| Behavior | Recipient policy |
| --- | --- |
| Organizer releases/reclaims their playing place | No self-action notification; game continues and management access remains. A released group place can generate the existing automatic waitlist offer for another player |
| Schedule change, single/future series | Creator, confirmed players, pending requesters, invitees and waitlisted players, excluding the person editing |
| Game cancellation, single/future series/group archival | Affected creator/participants/requesters/invitees/waitlisted players, excluding the person cancelling or archiving |
| Join request / withdrawal / player leaving | Organizer receives another player's action; actor receives no copy |
| Join approval / rejection / removal | Affected player receives the manager's action; acting manager receives no copy |
| Guest request / cancellation | Organizer receives the participating player's action; actor receives no copy |
| Guest approval / rejection | Affected player receives another manager's decision; self-decisions by an eligible manager generate no self-notification |
| Group membership request | Current managers receive another player's request |
| Group approval / rejection / removal | Affected player receives another manager's decision |
| Group archival | Other pending/active members receive the archival; acting Owner receives no copy |
| Player game invitation | Sender and recipient must differ (existing database constraint/API validation) |
| Share-link creation/revocation, role changes, profile edits, sign-in, notification settings/read | No new activity notification is introduced by these actions |
| Waitlist offer | Retained: an automatic availability outcome, not a copy of the player's request/accept/leave action. Refreshing the queue must not hide a genuine offer |

Migration 0025 adds a transaction-scoped actor context and schedule actor metadata.
Mutation batches insert the actor, execute the existing authorized writes, then remove
the context in one atomic transaction. Rollback removes the context too. No session,
role, capacity or privacy checks are relaxed. BEFORE INSERT guards suppress self inbox
records before push-event/delivery fanout; AFTER INSERT attribution uses the actual
actor for the remaining game/group/guest records. The separate push sender does not
need a configuration or secret change for this source-level policy.

Schedule actors are backfilled only when the existing series audit identifies a single
actor for that game/time/change. Identifiable historical self inbox rows and their
push events/queued deliveries are removed. Unknown historical actors are preserved.
Already displayed OS notifications cannot be recalled by this cleanup.

Verified: 348 units, 76 focused browsers, final 85-unit historical/rollback-focused
pass, dev build and Functions compilation. Published Preview 6ab4bcc2 with migration
0025 on opencourts-dev only. Aggregate post-check: zero identifiable self notification
rows and zero active actor-context rows; no pending dev migrations. Production 7ef38ff2
unchanged. See APP_TESTING_CHECKLIST.md and PLAY_TOGETHER_TEST_RESULTS.md. No sender
settings/secrets, production migration, store release or Git push included.

# Member discussions and compact content actions

Local candidate, November 20, 2026. Production is not updated by this document.

## Experience

Group overview includes a Discussions count, two recent posts and See all. The
full feed uses the owner's reference: avatar rail, name and relative time,
three-dot menu, open text rows and inline Like/Reply. No large boxed post cards.
Threads keep one chronological level of comments; recent comments open first,
with Earlier replies pagination. Long post previews can open in full.

Members can post text (4000 characters), reply (2000), edit their own content with
version checks, and delete their own content after confirmation. Titles are
optional in the UI and default to a short body excerpt for routing/accessibility.
Owners/co-owners can delete others' content and lock/unlock discussions. Locked
threads stay readable but disallow replies, edits and new likes. Likes are
idempotent, one per player per post/comment; unlike is supported. Likes do not
send notifications.

Three-dot menus replace direct reporting flags on chat messages, players, games,
groups, posts and comments. Native top-layer popovers work inside chat dialogs
without clipping, with arrow navigation, Escape, outside dismissal, 44px targets
and focus restoration. Existing report forms still require a written explanation.

## Access and photos

Read/write APIs require a valid active session and active membership in an active
group, even when the group is public. Write statements recheck membership/session
inside the database mutation. Pending, removed, archived and signed-out access is
denied. Blocks hide the other account's discussion content. Text is rendered as
text, not HTML. Bounded pagination, payloads, posting and reporting rates apply.

28px chat avatars and 36px discussion avatars fall back to initials. Existing
uploaded photos remain private. Account has a separate optional sharing checkbox,
off by default, independent of player discoverability. Reads require explicit
sharing, an active subject account, no bilateral block, and either active shared
group membership or current game-chat access for both people. Images remain
private/no-store. Sharing does not publish an avatar on an anonymous public URL.

## Notifications and safety

Post authors and commenters follow future replies by default. A member can
follow/unfollow through the per-thread bell. New reply notifications exclude the
sender, muted subscriptions, nonmembers and blocked accounts. Push also respects
the existing group/device preferences and rechecks membership, content existence,
blocking and mute state at delivery. In-site notifications and push deep-link to
the group discussion. No message text enters notification routing payloads or GA.

Site moderation includes discussion cases and reported-text snapshots. Moderators
can remove reported content, resolve cases and preserve/release evidence. Ordinary
posts/comments remain until deleted; deleting posts cascades comments/likes.
Deleting an account removes its posts, comments, likes and subscriptions. Deleting
a group removes live discussions. Archival ends access.

Report snapshots survive live-content deletion: open cases remain until resolved;
resolved evidence expires after 90 days unless preserved. Discussion action audit
records expire after 90 days, except those associated with held evidence.
Notification history expires after 30 days. The scheduled Worker performs cleanup
even when push sending is disabled. Privacy, Terms and Help describe these rules.

## Rollout gate

New additive migration: `functions/db/migrations/0032_group_discussions.sql`.
Creates discussion, comment, like, subscription, notification, report, audit and
photo-preference tables plus notification triggers. Does not update existing
players or publish existing avatars. Original migration hashes remain preserved;
the release inventory includes this new migration with portable normalized hash.

Before production: obtain owner approval for this new production D1 migration,
take and verify a fresh private backup, confirm target database is
`opencourts-courts` (`56c414b7-aca5-429b-acfa-b9e8e87b052b`) and ledger is through
0031. Use the existing production migrations configuration, apply only pending
0032, and verify foreign keys and existing catalog counts. Then publish the
reviewed Pages source and update the production sender Worker with --keep-vars.
Never read, replace or rotate existing Cloudflare secrets. Keep Preview separate.

Rollback: restore the previous Pages/Worker versions and leave the additive tables
in place. Do not drop new user discussions or blindly restore the whole database.
No Google Play upload is part of this feature.

## Verification

Checks and exact final results are recorded in APP_TESTING_CHECKLIST.md and
PLAY_TOGETHER_HANDOFF.md. Database tests use real SQLite migrations, including an
upgrade from an existing 31-migration database with existing private photo data.
Browser tests exercise 320/390/1440px, both themes, accessibility, menus in modal
chat, author edit/delete, likes, reply submission and photo preferences. No
snapshots were refreshed. Reviewed screenshots contain synthetic people/content.

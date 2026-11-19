# Play Together release review - November 18, 2026

## Current assessment

Waitlist polish is implemented and verified against schema 0021. Published to Preview as 056fd9a9 after user approval. No migration required. No new migration is required. This is a technical readiness review, not approval to deploy production.

## Completed in this review

- Host/authorized manager queue: compact named rows, waiting order, reserved-offer deadline, empty/error/loading states; refreshes every 30 seconds while visible and on focus. Up to 200 entries are explicitly disclosed.
- My Games: separate Waitlisted view, own eligible group games, queue position, offer deadline, Accept/Leave buttons, loading/error/empty/success states and 30-second refresh. Up to 100 games disclosed. Schedule filters wrap on small screens so Past/Cancelled are not hidden.
- Server access checks prevent ordinary participants reading the host queue and removed members retrieving private waitlisted games. Responses never include emails or provider credentials. Stale expired offers are excluded from schedule results.
- Existing offer reservations and guest counting preserved; accept/withdraw use CSRF-protected actions and server validation. Native blueprint updated with endpoints/limits.
- Account deletion message/help/privacy now require archive of owned groups; obsolete ownership-transfer instructions removed. Group-role help reflects one permanent Owner and at most one Co-owner/Organizer.
- Privacy hardening: Google tag does not load on Account/Play Together routes. Court tag initialization removes query/fragment and suppresses referrer. Analytics cookies may still exist after court use. No consent manager introduced.
- Uses existing theme tokens and touch target sizes; visible labels, pressed filter states, semantic host queue region, status/error messages and native confirmation dialogs. Light/dark visual evidence stored under ignored .wrangler/qa-audit.

## Automated evidence

- Full backend suite: 289 tests passed in 18 files (waitlist-polish-regression.log). Includes independent synthetic account sessions, offer expiry, guests/capacity reservations, duplicate acceptance, membership removal, host authorization and schedule privacy.
- Final group privacy checks after stale-offer filtering: waitlist-polish-privacy-final.log.
- Nineteen browser checks passed (waitlist-polish-browser-final.log): waitlist interaction, My Games actions in phone/desktop light/dark, host compact rows, community analytics exclusion and sanitized court analytics; dropdown/device regressions for iPhone-sized, Pixel 7, Galaxy S9, tablet and desktop. All use Chromium; device profiles do not prove Safari/WebKit or real Android behavior.
- Six visual captures/checks passed (waitlist-polish-visual.log). Inspected phone dark Waitlisted schedule and phone host queue. Visual review prompted wrapping schedule tabs; current build includes this follow-up.
- Build log: waitlist-polish-release-build.log. Existing bundle-size advisory remains; not a type/build failure.

## Physical-device and two-person acceptance checklist (not yet executed)

Use isolated Preview and synthetic/private test activities after publishing. Do not use production data.

1. On real iPhone Safari/Chrome and Android Chrome/TWA, sign in with two distinct test accounts. Check system light/dark, small portrait and landscape, large text, VoiceOver/TalkBack, keyboard focus and background/foreground refresh.
2. Fill a group game; second account joins waitlist. Confirm position in My Games, no appearance as confirmed, and no duplicate entry after repeat tap.
3. Host releases a place; queued account receives in-app offer, sees deadline and can accept in My Games. Host sees offered/confirmed changes. A third player or added guests must not take a reserved place.
4. Withdraw a waiting entry and decline an offer by leaving the queue. Verify next eligible player advances. Test expiry using controlled development fixtures, not by changing real production rows. Current advancement is refresh-driven, not push/background.
5. Remove a member or block the offered player; verify private queue/notifications disappear, acceptance denied, and capacity is released on refresh.
6. Each weekly occurrence must keep separate queues and invitations. Confirm pending/expired/cancelled game transitions and existing court/weather discovery still work.
7. On a small phone, assign Organizer and confirm in the top-layer dialog. Verify cancel/keep restores focus and no duplicate picker appears.

## Production gates still open

- Physical-device and assistive-technology acceptance above; full real-provider account deletion/Apple revocation and failed media cleanup path review.
- Operator-defined retention/backups/log policies, age/audience policy, contact verification and analytics-consent requirements for intended launch regions. These cannot be established by changing UI wording alone.
- Review legacy Admin/duplicate leadership records and current media cleanup operations before any production migration.
- Explicit production rollout plan, backup/recovery and migration review, provider production redirect configuration, monitoring and user approval. Production website/D1 remains untouched.

## Known scope limits

Offers reserve one player, not a guest party. In-app polling only; no email/push or scheduled expiry worker. Group queues only. Owner cannot self-waitlist. Series management (single/future reschedule/cancel) is published in Preview 31bafac6/schema0023; no match brackets, native authentication exchange or Apple payments. Do not represent these as completed. Waitlisted/host queue listings have disclosed limits and no new pagination in this milestone.

## Series management follow-up (Preview 31bafac6, migration 0023)

Backend transaction/version/session/role checks and notification privacy tested; phone/desktop light/dark previews tested and mobile dark dialog inspected. Physical-device acceptance should include changing one week, preserving an exception in a future edit, cancelling only one date, and checking retained attendance plus old/new time notification on another account. Approved development migration 0023 and Preview deployment completed. Current production remains unchanged.

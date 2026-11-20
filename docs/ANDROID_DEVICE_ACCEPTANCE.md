## Production notification receipt/tap confirmed and test removed - November 20, 2026

Owner replied done after being asked to verify the requested notification arrived
and opened its test destination. Record receipt and tap as owner-confirmed, alongside
the sender's first-attempt/provider-accepted evidence. The exact phone platform,
OS, installed package/build and closed-app condition were not separately described;
this is not a new platform-specific Android/TWA or Play-installed bundle pass.

Removed only the synthetic unlisted test game, synthetic host, invitation, event,
deliveries and chat room after confirmation. Verified all scoped fixture counts
are zero and the real receiving account remains active. Real profile/device
preferences, other notifications, secrets and production settings were unchanged.
Evidence: qa-evidence/production-requested-test-notification-cleanup.json.

Production 33ba5db1 and push remain live. Next store milestone is the existing
us.opencourts.app internal-test bundle, code 3 / 1.1.0, with the existing upload key
and Play App Signing setup. Android README instructions were corrected to preserve
the existing app/signing identity; no package, certificate, Gradle source, signed
bundle, Git main or Play upload was changed. Actual Apple sign-in and store-specific
acceptance remain distinct checks. No broad tests or snapshot updates were run.

## Owner-requested production notification sent - November 20, 2026

At the owner's explicit request, queued exactly one test invitation event for the
owner's active production subscription. Scheduled sender marked it sent on its
first attempt, with no provider error. This confirms provider acceptance, not yet
phone receipt or tap. Real-device delivery acceptance remains pending owner reply.

The target is a clearly labeled unlisted game, Notification test - no actual game,
with a nondiscoverable synthetic host and recipient-specific access. No real
attendance or venue booking is intended. A two-hour invitation-access window keeps
the target usable for tapping. No real account/profile/preferences were altered.
Only the explicitly requesting owner was targeted; one device was eligible.

**Cleanup pending after receipt/tap confirmation:** remove only this synthetic
host/game/invitation and its event/room records. Scoped identifiers are in the
private ignored .wrangler/qa-audit/production-test-notification.json. Do not remove
the test destination before tapping has been verified. The sender helper refuses
a duplicate while that record exists. Do not modify other games, notifications,
player records, device registrations or secrets. Sanitized evidence:
qa-evidence/production-requested-test-notification.json.

## Production phone opt-in confirmed; delivery still pending - November 20, 2026

Owner clarified that notifications were enabled, but receipt/tap had not yet been
tested. Read-only account-scoped metadata confirms production opt-in and one active
session-owned device subscription. No endpoint, encryption key or session token
was inspected. Do not mark closed-app delivery or tap acceptance as passed yet.
Next: another account sends a message in a shared game while the receiving phone
app/chat is closed; verify receipt and the tapped game/chat destination. Evidence:
qa-evidence/production-owner-push-opt-in.json. No notification was sent by this check.
Google Play signed bundle/internal upload remain subsequent work, with existing
package/signing identity preserved and explicit approval required before upload.

## Production push and moderator settings published - November 20, 2026

**Current live production: https://opencourts.us, deployment 33ba5db1.** This
supersedes 0edd7fe3 for runtime configuration; reviewed application source and
static artifact are unchanged. Preview 50d37245 remains separate and unchanged.

Owner corrected key placement: PUSH_VAPID_PRIVATE_KEY now exists as secret_text
on Worker opencourts-push-production and is absent from Pages Production. Verified
names/types only, without reading key values. The owner-managed secret survived
--keep-vars deployment. Sender version ef0ed442-4765-4f69-b59c-53fe09435d32 runs
minute cleanup and push delivery. PUSH_ENABLED is now true on sender and Pages.
The matching fresh production public key is published; no private key is included
in the Pages environment or client artifact. Existing unrelated variables/secrets
and Preview settings were preserved.

The uniquely identified owner Google production player is included in the live
MODERATOR_PLAYER_IDS list, preserving prior IDs. The agent did not impersonate the
owner's session. Owner should refresh Players/Account to confirm Site moderation.

Post-publish synthetic check passed: an ordinary signed-in production account gets
push available:true and the expected public key, stays nonmoderator, and can delete
its account. Temporary QA account count returned to zero. No real-device test
notification was sent, and **physical production push delivery/tap is not yet
verified**. Prior production API/browser/schema/media/cleanup acceptance remains
recorded below; this settings publication did not repeat broad tests or update
snapshots. Evidence: qa-evidence/production-push-enabled-check.json.

Next owner action: on a phone, open opencourts.us/account, refresh, choose Enable
on this device and allow OS permission. On iPhone use the production site's Home
Screen app. Preview/debug-app subscriptions do not migrate. Verify a notification
from another account with the receiving app/chat closed, then tap the destination
and verify mute/category/sign-out controls. Do not claim receipt merely because
the sender is enabled. Actual Apple account sign-in remains a separate pending
owner check; Google sign-in was reported and matched a production identity.

If notification acceptance fails, disable push on both production components while
investigating; do not rotate keys, erase user data or restore the database blindly.
Website features, production media, schema 0031 and scheduled cleanup are live.
Source remains on feature/play-together with intentional uncommitted work, private
frozen release snapshot and rollback records. Git main was not merged/pushed, and
Google Play has not been uploaded.

## Production follow-up (November 20, 2026)

Website is live on opencourts.us, deployment 0edd7fe3. Push activation is pending
correct production sender-secret setup; do not count Preview delivery as production
acceptance. After activation, sign in on opencourts.us, enable this device, close
the app and verify a message from another account arrives and opens its allowed
game/series. Repeat opt-out/sign-out behavior. Apple real-account sign-in and latest
phone UI checks remain pending; owner Google sign-in has been reported. No Play
bundle/upload was performed. See current APP_TESTING_CHECKLIST.md for setup status.

## Direct guest follow-up (Preview 1019f776)

With a confirmed playing place, test Add guest places as a public-game host and
as a group owner, co-owner and assigned organizer. Verify immediate confirmation,
capacity/reserved-place denial and cancellation. An ordinary member should see
Request guest places and stay pending until approved. Browser/API tests are
separate from this pending physical-device review.

## Added physical review for Preview ef0ceaad

On a physical phone, edit a full singles game to doubles/more total places,
review the automatic-confirmation choice, save and verify waiting-player order.
Check that pending guests still require separate approval; repeat on a group date
and verify other dates stay unchanged. In an open chat, approve/remove a second
account and verify the quiet notice appears and a removed standalone participant
cannot read or send. Confirm series staff retain access and group departure
revokes it. Check both themes and the phone keyboard. Browser/hosted synthetic
checks passed; physical acceptance for these new changes remains pending.

## Staff series-chat acceptance - Preview 31411e87

With active owner, co-owner and organizer test accounts that have not joined a
series date, open Series chat from any occurrence and verify access and role labels.
Confirm mute/unread preferences remain independent for each person. On a disposable
fixture, remove the role and verify role-only access ends on refresh; ordinary
eligibility may remain. Leaving the group/archiving must revoke access. Staff
confirming a game must not show an inactivity departure. Repeat phone dialog,
keyboard and closed-app push/tap checks. Physical acceptance for this addition is
pending; synthetic hosted checks and browser emulation are recorded separately.

## New dialog and group-series checks - Preview 4dd76fd5

Earlier owner-reported phone acceptance predates this feature. On physical Android
Chrome and the installed development app, test opening/closing chat, page position
and draft preservation, initial latest messages, reading older history, keyboard
show/hide, rotation, large font, composer/gesture clearance, report picker, nested
Escape/Back, and correct focus return. Test both themes and both standalone/series.
With two accounts in a private group, confirm one date and open chat from another:
messages, unread and mute must be shared. Group removal must close access; new
confirmed participation can rejoin after expiry/removal. A recent message OR a
recent/upcoming confirmed game must retain access. Exercise 30-day boundaries in
synthetic local fixtures rather than aging real user records. Observe quiet join/
left notices and no corresponding push. Test a normal message push with the app
closed and tap into the shared dialog, then mute/sign-out and verify suppression.
Status: NOT TESTED physically for this new feature. Hosted synthetic and automated
results are recorded separately; they do not claim a provider/phone acceptance pass.

## Owner-confirmed physical Android acceptance - November 20, 2026

Owner answered "Yes - all passed on physical Android" for sign-in, joining a
game with a second account, chat, and receiving/tapping a notification with the
app closed. Record these core checks as owner-reported PASS, superseding older
notes that only emulator/iPhone push had been tested. The agent did not observe
these tests. Phone model, Android/Chrome versions, installed build and detailed
procedure were not supplied. This confirmation does not claim every procedure
below, both provider callbacks, all permission-denial cases, or a Play-installed
signed release has been tested.

# Physical Android acceptance - Google Play internal testing

Use only the isolated development website and the development app for the checks below. Do not change the live app, production database or authentication secrets. Browser device emulation does not complete this checklist.

Current sideload artifact: `android-app/app/build/outputs/apk/debug/app-debug.apk`. Package: `us.opencourts.app.dev`. This is a development companion, not a signed update for the existing Play app. The eventual Play-installed internal-test build must be tested separately with its real signing certificate and approved destination.

Record Android version, phone model, Chrome version, app version and test date. Use two separate accounts (host and member) and synthetic games.

1. Install the development APK on a test phone and open it. Confirm the development site opens, never the production site. If browser chrome appears, record the Digital Asset Links/trust failure rather than treating it as a verified TWA.
2. Sign in with Google, return to the app and refresh. Repeat Apple sign-in if offered. Verify logout and switching accounts do not expose the previous account's private content.
3. Switch device light/dark mode without restarting. Check text, button contrast, focus, safe areas and enlarged Android font settings.
4. Navigate Feed, Find games, My Games, Groups, Players and the Courts header switch. Return from court discovery to Play Together. Check Android Back and external directions/share.
5. On player search, choose each skill, search city/ZIP, reopen the picker and confirm selection persists. Test game format, court count, guest count, visibility and duration; exactly one picker should open per tap.
6. Create a future game. Set date, hour, minute and AM/PM; reopen and verify exact values. Past times must not submit. Confirm capacity and court count in saved details.
7. As a second player, request a public-game place. Host approves/denies from the inbox. Confirm requester notification and correct schedule section; host cannot invite or request themselves.
8. Request guests, approve them and confirm total capacity includes guests. Withdraw player/guests; verify released capacity and host notification. Rejoin and ensure current cancellation display is consistent.
9. Fill a group game and join its waitlist with another approved member. Release a place, check offer deadline, accept it and leave the queue. Do not change production records to create fixtures.
10. Create a private group. Outsider sees only its public preview. Forward a private game URL; outsider cannot access the roster or details. Approve membership, confirm access, then remove it and verify subsequent requests deny access.
11. Assign Organizer/Co-owner from member management and confirm on a small screen. Verify one-per-role limits and organizer permissions. Removing/demoting an organizer transfers upcoming games to the primary Owner.
12. Create a short weekly series. Verify each date has separate attendance. Change/cancel one occurrence; others stay unchanged. Review and change future occurrences while preserving selected exceptions.
13. Upload/reframe a photo, save, refresh and check the header crop. Remove it. Check group cover public visibility does not expose private member photos.
14. Enable push after an explicit action. Test permission denial, enabling in Android/browser settings, delivery with app closed and tapping to the exact activity. Disable a category/device and sign out; future sends for that session should stop. Never share subscription keys or session tokens in test reports.
15. Test a network interruption: error and retry remain usable, private data is not displayed to another account, and reconnecting does not duplicate joins/invitations.
16. Test report/block/unblock and account deletion using a disposable account. Archive active owned groups before deletion. Verify the account's private data and subscriptions are no longer accessible.

17. As organizer, test both a non-group game and a group game: Your attendance > I'm not playing > Keep my place leaves attendance unchanged; repeat and choose Release my place. Confirm only your playing place is removed, other players remain, the game stays scheduled and request/schedule management still works. Game details show the organizer is not playing. Join as a player restores attendance only with available capacity; it must not take a reserved waitlist offer. Test an empty game and one weekly occurrence. Cancel game must remain a separate whole-game action. No self-action inbox/push is expected.

Record each case as PASS / FAIL / NOT TESTED with steps and expected/actual behavior. Redact email addresses, cookies, keys, invitation tokens and private member information from screenshots. Repeat core checks on a Play-installed internal-test build after packaging/signing is approved.

18. On Preview bfe49755 or later, sign in with a blank-name test account. Verify welcome keyboard/focus at enlarged font size; save name, optionally crop/upload photo, and return to the activity. Named accounts must not be prompted. Browse for now/Escape must allow browsing while community writes retain their name requirement. Photo remains private to the account. Pending physical verification.
19. On a fresh mobile browser, verify city/ZIP and location choices with no automatic permission request. Test location allow/deny/timeout, successful manual search, map/list switching, slow/failed court lookup, saved area reopening after quitting and cache expiry (24h). Retain manual search and cached courts on failed refresh. Pending physical verification.

20. In Account on a phone, attempt deletion with an owned active test group. Verify the archive-groups message appears beside Permanently delete, is focused/visible without scrolling to the page top, and offers Manage my groups. Verify sign-in/deletion failures use the same area and Keep my account clears feedback. Pending physical verification.

21. In installed TWA/Home Screen mode, verify both Courts and Play Together floating navigation leave a comfortable gap above the system gesture area (12px plus reported bottom safe area, installed standalone/fullscreen only; browser gaps stay 5/8px). Check portrait/landscape, enlarged font and the page bottom; no final action or review prompt should be hidden behind the bar. Pending physical verification.

November 19 production candidate: owner confirmed iPhone push and Android emulator testing; physical Android remains pending. Isolated local debug verification APK is .wrangler/android-production-check/app/outputs/apk/debug/app-debug.apk (us.opencourts.app.dev, code 3, 1.1.0-dev); previous default APK was preserved because packaging found locked output files. Check 18+ confirmation before sign-in and Terms/Privacy/Delete Account help links. No signed AAB or Play-installed code-3 acceptance yet.

22. On Preview schema 0026+, verify Site moderation is visible near the top only for staff. Using an approved ordinary synthetic account, test report reasons/filters, suspend/reason/audit, immediate session and push-subscription revocation, failed re-login, support appeal guidance, restore and fresh login. Confirm existing game/group records remain and staff cannot suspend themselves/another configured moderator. Test modal keyboard/scroll/dropdown, Cancel/Escape/focus return, and required multiline explanations for player/game/group reports. No physical-device result is claimed yet.

23. Game chat (schema 0027+): on two real Android accounts, open a public, unlisted and private-group game as organizer, invitee and confirmed player. Check text send/retry, keyboard/floating-dock clearance, long messages/names, unread clearing, mute/unmute, and generic push with the installed app closed. Tap must open #chat with current-access checks. Sender must not receive their own message alert. Verify leaving/removal, revoked invitations, blocking, group removal/archive and suspension close appropriate access. Test message reports with required explanation; staff limited evidence/hide/resolve/preservation/release. Cancellation is read-only; end+24h is read-only; end/cancel+30d expires (use synthetic clocks in local tests, never change real records to prove expiry). Each weekly occurrence is separate. Physical Android chat acceptance remains NOT TESTED.

24. Compactness audit Preview753893ed+: test Account sign-out rows, Group Edit/Archive,
invitation expiry/create/revoke menu, player search/actions, game actions and footer
clearance at enlarged font sizes and in portrait/landscape. Small screens should
wrap instead of compressing controls; invitation values must stay readable. Check
keyboard focus and dropdown positioning, installed safe area and the final page
content above the floating navigation. Browser geometry passes are not a physical
Android result. Production app/package/destination and store approval are unchanged.

25. Preview ac818aea+ allows all accounts to opt in; no tester ID entry is needed.
On each supported phone/browser, sign in, open Account and Enable on this device,
then allow OS/browser notifications. Test a new relevant action from another
account with the app closed; verify tap/current-access checks, category/chat mute,
permission denial, sign-out and re-enable after sign-in. Old inbox items are not
backfilled as pushes. This rollout did not register devices remotely or prove
real-device delivery. Production and Google Play remain separate approvals.

### Long chat scrolling (Preview 89a9dfa5)

On a physical Android Chrome and installed development app, open a synthetic
conversation with more than 50 messages: verify newest messages show first,
scroll back and load Older messages without a jump, wait through a refresh and
receive another account's message without losing the reading position. Tap
Latest messages, rotate/resize, send, and close/reopen. Repeat for a group game.
Pending physical verification; synthetic desktop/phone browser checks passed.

# Launch public-page review

Reviewed November 20, 2026. Published to feature Preview 50d37245. Feature branch: feature/play-together. Production has
not been deployed by this review. Existing uncommitted work is preserved.

The public content has been compared with the implemented authentication,
guest/capacity, chat, notification, moderation and deletion behavior. Big Data
Analytica LLC (Virginia, United States), support@opencourts.us, the 18+ account
rule and free Play Together access are consistent with the owner's confirmations.
Support-mailbox operation and monitoring were owner-confirmed earlier; no email
was sent during this review.

| Page | Review and resulting update |
| --- | --- |
| Privacy | Added operator location to the introduction; explained counted guest records, staff direct confirmation, automatic waiting-player confirmation and resulting chat eligibility. Clarified both 30-day activity clocks, upcoming/recent confirmed games, role-based return and no verified physical attendance. Explained compatible iPhone Home Screen browser push and no self-action notifications. Added notification/age section links and reinforced the guest age rule. |
| Terms | Added chat navigation, separated long access/retention/control paragraphs, placed the guest policy under games, and explained capacity edits/FIFO/one-date changes and guest limits. |
| Help and safety | Added chat navigation and clarified ordinary-member inactivity, staff exemptions, standalone organizer access and guest/capacity rules. |
| Delete account | Added the revision date, ordinary chat/message-notice removal, push-subscription removal and explicit safety-evidence/hold/backup exceptions, with a direct privacy link. Website/email request options and recent-sign-in/group-archive requirements remain. |
| About | Removed environment wording; added adult accounts, game/series chat, retention and optional phone notifications. App-version limits remain explicit. |
| Contact | Included chat-message reporting with an explanation and limited context, while preserving the support address, ownership verification and emergency-channel limits. |
| Support | Reviewed existing free-access, optional-contribution, external-payment and account-help wording; no change needed. |
| Court guides and shared footer | No Play Together policy promises to change; browser checks cover navigation and layout of the seven existing court/weather guides. |

Privacy already covered provider sign-in, profile/media visibility, public/private
and unlisted access, court-search location/cache storage, Google Analytics,
Cloudflare hosting, message-report evidence, 30-day messages, 90-day resolved-case
evidence, documented holds and account deletion. Those disclosures were preserved.
No blanket erasure guarantee, end-to-end encryption claim, guaranteed push delivery
or native iOS Play Together release promise was introduced. Existing court-page
store prompts remain unchanged, as requested earlier.

The policy now describes the exact ordinary series-access implementation: recent
confirmation OR a recent message OR an upcoming/recently ended confirmed game
retains access; both activity clocks must expire with no qualifying game before
ordinary inactivity removal. Cancelled games do not count as upcoming/recent games.
Authorized active group staff retain their role exemption. Pending join requests
alone never grant series access, and counted guests do not gain chat access.

Public canonical URLs remain on opencourts.us. Sitemap dates were updated for the
changed public pages and current app entry points. All 17 sitemap entries are
canonical public URLs; account pages, per-game/private detail URLs, tokens and
query strings remain excluded. Preview remains noindex through its existing
build preparation; the local production artifact retains production metadata.

## Verification

- 15 fresh-server Chrome browser checks passed (39.7s): 320/390/768/1440px, both
  themes, Terms/deletion coverage, section links, keyboard navigation, enlarged
  text, accessibility and seven guide/footer layouts. No snapshot updates.
- 27 metadata/release-configuration tests passed across three files (0.501s).
  This scoped run does not claim a new complete 432-test run.
- Static review of six changed public pages found zero duplicate IDs, broken
  known local fragment links, replacement characters or scanned staging phrases.
- Development and local production-candidate builds passed (Vite 8.03s / 8.14s).
  Existing chunk-size warnings remain.
- All six hosted pages returned HTTP 200 and matched the reviewed build.
- QA evidence: qa-evidence/launch-policy-links.json and launch-policy-hosted.json. Build/raw test logs remain
  private and ignored under .wrangler/qa-audit.

The existing full-site visual-baseline reconciliation, final production binding/
ledger/backup/rollout checks and physical review of the newest UI remain separate
release gates. This content review does not inspect or change Play Console Data
safety declarations. No production database, main, worker, secrets, store upload,
Git staging/commit or push was changed.

## Primary guidance checked

- Google Play User Data: https://support.google.com/googleplay/android-developer/answer/10144311?hl=en
- Google Play account deletion: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
- Cloudflare D1 data security: https://developers.cloudflare.com/d1/reference/data-security/
- Cloudflare R2 data security: https://developers.cloudflare.com/r2/reference/data-security/

The public identity, website deletion route, help/contact paths and retained-data
disclosures were checked against that guidance. Store declarations and actual
production configuration still need their own release verification.

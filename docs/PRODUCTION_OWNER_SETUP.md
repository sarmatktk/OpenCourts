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

## Production website launched - November 20, 2026

**Live production: https://opencourts.us, deployment 0edd7fe3.** This supersedes
earlier statements that production is unchanged/not deployed. Feature Preview
50d37245 remains separate and unchanged. Google Play has not been uploaded.

Fresh private production backup production-pre-play-together-20261120-175644.sql
restored successfully in isolation. All 31 migrations through 0031 then applied
to opencourts-courts, preserving 201,799 court rows and 100,750 staging rows with
zero foreign-key errors. No Preview account data was copied. A private ignored
source/artifact snapshot preserves the exact released 224-file source manifest;
source revision a0d245ab plus intentional uncommitted work. Git main, branch
checkout, staging/commits and pushes were not changed. Future Git-triggered main
releases must first include the reviewed feature source to avoid replacing this
manual release with old code. Rollback artifact: prior production deployment
7ef38ff2-91e0-4505-a215-fa16edcfa0bc. Do not blindly restore the database after users
start writing; disable the feature/restore an artifact under a controlled plan.

Production resources: private bucket opencourts-media; image processor
opencourts-media-processor (f70f5575-1cb9-432b-9527-56d2ebfb0b54); scheduled
maintenance/push Worker opencourts-push-production (latest agent version
d450d70a-fcdc-4514-88f9-4c3309ac7bab), minute cron. Actual Pages D1/R2/service
bindings were verified. Feature and media flags are true. **Push remains false.**
Cleanup cron is running; recorded age 20 seconds, no pending media cleanup and
zero FK errors. The owner-managed private push key is not yet on the sender.

Acceptance completed: 13 public-route/API checks; four age/origin/OAuth-start
checks including server-side Apple signing; eight scoped private production API
scenarios (group approval, series creation, guest/capacity, shared chat, private
photos, access revocation and archive/account deletion); eight live browser checks
at phone/desktop widths in both themes. All temporary accounts/groups/games/rooms
were removed, with no real-user notifications sent. Provider booleans are true.
The owner subsequently confirmed Google and one real Google identity was found;
actual Apple account completion and real-device production push remain pending.
No new full-site or broad unit run is claimed. Earlier known visual differences
remain recorded; owner requested production progress without repetitive broad QA.

The first policy byte comparison differed because of Cloudflare email protection;
normalized content and real browser-decoded mail links passed. New Worker and
binding setup initially hit short propagation delays, then verified successfully.
One existing weather check returned 503; retry and upstream NWS checks returned
200, including 156 forecast periods. US weather source code was unchanged; no
weather fix/credential change was made. Court discovery and geocoding returned 200.

**Pending owner setup:** a fresh production push pair was generated into ignored
.wrangler/production-push-keys.json without printing its private key. Public key
was matched in Production Pages settings and sender config before first push
activation. The owner placed the private-key field on Pages by mistake; sender
secret-list/settings metadata still show no private secret. Owner must add
PUSH_VAPID_PRIVATE_KEY as an encrypted Secret on the separate Worker
opencourts-push-production, save/deploy, and remove the misplaced Pages entry.
The agent has not read, removed or changed that secret. Push stays disabled until
corrected. Do not paste the private file/key into chat or Git.

The unique owner Google production player was added to MODERATOR_PLAYER_IDS,
preserving existing IDs and unrelated variables/secrets. No owner session was
fabricated. This updated moderator list and public push key are in Pages project
settings, **awaiting a production redeploy** after the misplaced Pages private-key
entry is removed. Once sender setup is verified, activate production push and
redeploy with these settings, then verify the owner's moderation queue and a
closed-app notification/tap on opencourts.us. Preview device subscriptions do not
carry over. Initial actual provider/device acceptance is not yet a pass.

Evidence is in qa-evidence/production-launch-*.json and
production-push-key-setup.json. Raw logs, backups, restored databases, source ZIP,
temporary sessions and key material remain private and ignored under .wrangler.

## Owner-filled production configuration checked - November 20, 2026

Owner reported that Production variables were filled. Read-only metadata confirms
all four Google/Apple identifier fields are nonempty and all four required secret
entries exist as secret_text. Secret values were not inspected; replacement of a
masked placeholder, credential correctness, Apple key formatting and encryption-key
length cannot be attested from this metadata check. End-to-end sign-in remains the
verification after production preparation/deployment.

AUTH_ORIGIN and production environment markers are correct. Feature/media/push
activation flags remain false. PUSH_VAPID_PUBLIC_KEY is filled and has the expected
65-byte uncompressed public-key shape; private-key pairing is not yet verified.
MODERATOR_PLAYER_IDS is filled but must be checked against the owner's eventual
production player ID, since this database had no player accounts at preflight.

Actual Production COURTS_DB binding was verified against
56c414b7-aca5-429b-acfa-b9e8e87b052b. Production photo bucket and image-processor
service bindings are absent. Those resources/bindings, production maintenance/push
sender setup, schema migration and reviewed production deployment remain pending.
No variables, secrets, bindings, database data or deployment changed in this check.
Evidence: qa-evidence/production-owner-config-check.json (booleans, public settings
and resource metadata only; no credential values).

## Production setup entries created - November 20, 2026

At the owner's explicit request, added only missing Production variables and four
new encrypted placeholder fields on Pages project opencourts. An add-only partial
PATCH contained no pre-existing variable names. Existing GEOAPIFY_API_KEY and
WEATHERAPI_KEY entries were preserved. Before/after configuration fingerprints
verified existing entries, Preview, non-variable Production configuration/bindings
and the canonical live deployment remained unchanged. No real credential values
were printed, supplied, copied from Preview or rotated. This is a Production
configuration change, not a production app deployment or database migration.

Added ordinary settings: AUTH_ORIGIN=https://opencourts.us,
PLAY_TOGETHER_ENVIRONMENT=production, PUSH_ENVIRONMENT=production and
PUSH_VAPID_SUBJECT=https://opencourts.us/contact. New PLAY_TOGETHER_ENABLED,
PLAY_TOGETHER_PRODUCTION_ENABLED, MEDIA_UPLOADS_ENABLED and PUSH_ENABLED are false.

Added blank owner-fill fields: GOOGLE_CLIENT_ID, APPLE_CLIENT_ID, APPLE_TEAM_ID,
APPLE_KEY_ID, PUSH_VAPID_PUBLIC_KEY and MODERATOR_PLAYER_IDS. The first four are
needed for sign-in; the last two are completed during push/moderator setup.

Added encrypted setup placeholders (not usable credentials): GOOGLE_CLIENT_SECRET,
APPLE_PRIVATE_KEY, APPLE_TOKEN_ENCRYPTION_KEY and AUTH_RATE_LIMIT_SECRET. Owner
must replace all four directly in Cloudflare Production. Placeholder value is
OWNER_SETUP_REQUIRED_BEFORE_LAUNCH. Do not enable features until configuration,
production resources, schema and deployment are ready. PUSH_VAPID_PRIVATE_KEY was
not created on Pages; it belongs only on the future production sender Worker.

Evidence: qa-evidence/production-vars-add-only.json contains names/types and
preservation booleans only. The helper/plan stay private and ignored under
.wrangler/qa-audit. Cloudflare's partial variable update behavior is documented at
https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/edit/
and matched the installed Wrangler single-variable update implementation.

## Provider callback registration update - November 20, 2026

Owner confirmed adding the production Apple domain/return URL and Google redirect
URI. Public read-only verification of opencourts.us returned HTTP 404 for Account,
/api/auth/me and both auth callback endpoints. Production does not yet expose the
Play Together authentication routes, so this does not verify or disprove the
provider registrations. No authenticated OAuth flow was attempted and provider
console configuration was not independently inspected. No credentials were read
or changed. Production credential setup, resources/schema and release deployment
remain pending before end-to-end sign-in can be verified.

# Owner setup before production activation

November 20, 2026. Owner confirmed only Preview sign-in is configured. Keep Preview
unchanged. Perform these steps directly in your provider accounts and Cloudflare;
never paste credentials, key contents or tokens into chat or repository files.

## Google

In the existing Google web OAuth client, add this authorized redirect URI while
preserving its Preview redirect URI:

https://opencourts.us/api/auth/google/callback

If the client uses Authorized JavaScript origins, include https://opencourts.us.
Check that the OAuth application's audience/publishing configuration permits the
intended production users. This project uses server-side web OAuth. Keep the
existing Android package and app registration unchanged.

## Apple

In the existing Sign in with Apple Services ID web configuration, add the domain
opencourts.us and the return URL below, preserving the Preview domain/return URL:

https://opencourts.us/api/auth/apple/callback

Keep the same intended primary App ID/Services ID relationship. APPLE_CLIENT_ID is
the web Services ID, not the Android package name. No new native iOS release is
part of this launch.

## Cloudflare Pages

Open Workers & Pages > opencourts > Settings > Variables and Secrets, select the
**Production** environment, and enter the production sign-in configuration from
your provider records/private credential manager. Leave existing values intact
where already configured. Do not use an operation that replaces all settings.

| Ordinary variable | Value source |
| --- | --- |
| AUTH_ORIGIN | https://opencourts.us |
| GOOGLE_CLIENT_ID | Google web OAuth client ID |
| APPLE_CLIENT_ID | Apple web Services ID |
| APPLE_TEAM_ID | Apple developer team ID |
| APPLE_KEY_ID | Sign in with Apple signing key ID |

| Encrypted secret | Requirement |
| --- | --- |
| GOOGLE_CLIENT_SECRET | Corresponding Google web OAuth secret |
| APPLE_PRIVATE_KEY | Complete existing Sign in with Apple .p8 PEM |
| APPLE_TOKEN_ENCRYPTION_KEY | Production token-encryption key, exactly 64 hexadecimal characters; preserve any existing production key |
| AUTH_RATE_LIMIT_SECRET | Private random production sign-in protection secret |

Do not expose secret values for verification. Confirm only that setup is complete.
Production feature-enable flags and media/push activation are handled in the
coordinated deployment after resource binding and database preparation. Keep any
existing production activation flags unchanged during this setup.

Under Production Bindings, COURTS_DB must reference opencourts-courts, never
opencourts-dev. Production also needs a separate private photo bucket, the private
image-processor service and its scheduled maintenance/push worker. The release
preflight will verify/provision those before feature activation.

Production push setup is separate: the sender needs its production VAPID private
key stored only on the sender Worker, with the matching public key on Pages and
Worker. It must not be activated until production delivery/settings acceptance.
Do not put the VAPID private key in Pages or send it in chat.

## References

- Google web OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- Apple web sign-in: https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/
- Cloudflare bindings/environments: https://developers.cloudflare.com/pages/functions/bindings/

## Current status — November 27, 2026

The website/API are live with separate Cloudflare Pages and API Worker releases.
This TWA loads the website at `https://opencourts.us`; website changes appear
after refresh/reopen, while the Android wrapper remains a separately signed
Google Play release. The owner confirmed receipt and tap for a requested
production notification, but this does not establish a particular Android
device/build or new Play-installed bundle acceptance. Version-code-3 Android
source is prepared but no signed bundle has been uploaded. Use the existing
app's upload key and Play App Signing identity. See the current testing
checklist and [deployment architecture](../docs/DEPLOYMENT_ARCHITECTURE.md).

# OpenCourts for Android

This is a separate Android app project. It opens the hosted OpenCourts website as a Trusted Web Activity (TWA). Website assets are deployed by Cloudflare Pages and API requests are handled by the separate API Worker; the existing D1 catalog remains behind the API. Internet access and a TWA-capable browser are required. The website can reuse the last searched area's saved public court results for up to 24 hours while updating them. This does not provide full offline maps or weather.

## Build and test

1. Install Android Studio, Android SDK 36, and JDK 17. Open `android-app/` as a Gradle project and let Android Studio sync dependencies. The project uses Android Gradle Plugin 9.4 with Gradle 9.6.
2. Run the `app` configuration on an Android device or emulator with Chrome installed. Full-screen mode requires the website's `/.well-known/assetlinks.json` to be deployed and to include the certificate fingerprint of the installed app.
   The launcher now shows an OpenCourts splash while the Trusted Web Activity starts. Chrome still powers the app, and some Chrome versions can briefly show browser UI or a "running in Chrome" notice during a cold launch. That browser notice is controlled by Chrome, not by the website.
3. Test court search, map/list switching, location permission, weather, directions, external links, and the Android Back button on a device. Also check that the site's home-screen installation prompt stays hidden inside the Play-installed app.

This updates the existing Google Play app, package `us.opencourts.app`. Preserve its package, upload-key and Play App Signing setup. The current release source uses version code 3 / 2.0.0 and opens https://opencourts.us; the separate `.dev` debug package opens Preview.

## Verify the website and prepare a Play release

1. In Android Studio, use **Build > Generate Signed Bundle / APK > Android App Bundle**. Select the existing app's upload keystore. Do not create or replace the upload key for this update. Keep the keystore and passwords outside the repository.
2. Keep the existing Play App Signing setup in Play Console. Verify the **app signing certificate SHA-256 fingerprint** from Play Console's App signing page. This is generally different from the upload key fingerprint.
3. Verify that `public/.well-known/assetlinks.json` retains the existing release package and Play app-signing certificate association. Preview preparation adds the separate `.dev` package/debug association only to the development build. Preserve existing trusted release fingerprints; certificate or package changes require review. Do not replace the production file with a debug-only association.

4. Serve that file directly over HTTPS without a redirect, with `application/json` content type. Verify full-screen behavior using the Play-installed build. A locally upload-key-signed APK can use a different certificate from the Play-distributed app; do not change production associations solely to make that APK appear verified.
5. Finish the Play listing, screenshots, privacy policy, Data safety form, content rating, and app access declarations. Obtain explicit upload approval, then upload the signed `.aab` to the existing app's internal testing track. Review the donation link and analytics disclosures against current Play policies before production release.

The app uses no Android location permission itself. The website asks for browser geolocation only when a user taps the location control. External destinations such as Google Maps and OpenStreetMap open from the hosted site.

The hosted site offers a Google Play review link in an Android standalone session after a user requests court directions twice, opens three different court details, or opens a court and then visits both Dry courts and Weather. The suggestion waits until other dialogs are closed. Dismissing it pauses the suggestion for 90 days; opening the link stops future suggestions on that device. Test this with the app installed from a Play testing track, since a normal browser tab will not show the review suggestion. This is a website card that opens the Play listing, not the native Play in-app review sheet.

## Development push notification build (November 19, 2026)

Push source integration is prepared, not activated or released. Debug now installs separately as
`us.opencourts.app.dev`, loading stable Play Together Preview. Release retains `us.opencourts.app`
and `https://opencourts.us/`. Build with `gradlew.bat :app:assembleDebug` from this directory.
Never upload this debug build to the production Play track. Output: `app/build/outputs/apk/debug/app-debug.apk` (ignored).

Manifest adds notification permission/delegation and verified HTTPS links. The website's development
build adds the dev package/debug certificate to generated assetlinks only. Recheck the actual debug
certificate on another machine. Test Android 13+ Allow/Deny, app channel settings, foreground/background,
notification tap target and account switching. Browser permission and TWA delegation depend on Chrome;
a successful Gradle build is not a delivery test. No native Firebase backend is required.

See [notification architecture](../docs/NOTIFICATION_ARCHITECTURE.md) for schema/API/worker setup,
tester gates, iOS/email extension points and the remote activation approval checklist.

## Current Google Play internal testing gate

The user confirmed the latest published version is code 2 / 1.0.1. A new upload must use code 3 or higher after confirming no intervening upload. Do not change package identity, replace the signing key or attach the development database to production. The release build currently opens production; the .dev debug build opens Preview. Use the existing app and its internal testing track; do not choose a new package or store destination. Explicit approval is required before uploading.

Use [the current checklist](../docs/APP_TESTING_CHECKLIST.md) and [physical Android acceptance](../docs/ANDROID_DEVICE_ACCEPTANCE.md). There is no native iOS app in this release.

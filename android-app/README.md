# OpenCourts for Android

This is a separate Android app project. It opens the hosted OpenCourts website as a Trusted Web Activity (TWA), so the existing Cloudflare Pages Functions and D1 catalog continue to work. Internet access and a TWA-capable browser are required. The current website does not cache courts or weather for offline use.

## Build and test

1. Install Android Studio, Android SDK 36, and JDK 17. Open `android-app/` as a Gradle project and let Android Studio sync dependencies. The project uses Android Gradle Plugin 9.4 with Gradle 9.6.
2. Run the `app` configuration on an Android device or emulator with Chrome installed. Full-screen mode requires the website's `/.well-known/assetlinks.json` to be deployed and to include the certificate fingerprint of the installed app.
3. Test court search, map/list switching, location permission, weather, directions, external links, and the Android Back button on a device. Also check that the site's home-screen installation prompt stays hidden inside the Play-installed app.

The package ID is `us.opencourts.app`. Change it before the first Play upload if you want a different permanent ID; after publishing, Google Play does not permit changing it for that app.

## Verify the website and prepare a Play release

1. In Android Studio, use **Build > Generate Signed Bundle / APK > Android App Bundle**. Create an upload keystore and keep it outside this repository. The project ignores keystore files in `android-app/`.
2. Enable Play App Signing in Play Console. Copy the **app signing certificate SHA-256 fingerprint** from Play Console's App signing page. This is generally different from the upload key fingerprint.
3. The website's `public/.well-known/assetlinks.json` currently includes the local debug signing certificate used for emulator testing. Before Play release, add the **Play app signing** SHA-256 fingerprint to its `sha256_cert_fingerprints` array and deploy the website. Do not replace the debug fingerprint if you still want local debug builds to verify. The file must retain this structure:

   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "us.opencourts.app",
       "sha256_cert_fingerprints": ["DEBUG_FINGERPRINT", "SHA256_FROM_PLAY_CONSOLE"]
     }
   }]
   ```

4. Serve that file directly over HTTPS without a redirect, with `application/json` content type. Reinstall or clear browser data after changing the file, then verify that the browser bar disappears when launching the app. If testing a locally signed APK, add its signing fingerprint as another entry in the fingerprint array.
5. Finish the Play listing, screenshots, privacy policy, Data safety form, content rating, and app access declarations. Upload the signed `.aab` to an internal testing track first. Review the donation link and analytics disclosures against current Play policies before production release.

The app uses no Android location permission itself. The website asks for browser geolocation only when a user taps the location control. External destinations such as Google Maps and OpenStreetMap open from the hosted site.

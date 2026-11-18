# FINDR — separate Google Play edition

This standalone Android Studio / Gradle project packages the existing `public/app` source. It does not change the web app, the preview APK project in `android/`, or its signing identity. Its first release is `com.findr.play`, version `0.40.1-play.1`, code `1`, targeting Android 16 / API 36, minimum Android 8 / API 26.

The Play edition has separate app storage. Export/import your saved records when moving from a browser or preview APK; saved files are not silently copied between packages. Local AI still requires its advertised downloads and a supported WebView/device. Online AI remains explicitly opt-in.

## Build an unsigned review bundle

Install JDK 17 or 21 and Android SDK platform 36/build-tools 36.0.0. Set `ANDROID_HOME` or an untracked `local.properties` with `sdk.dir`. Python 3 and Node are used for preparation/tests.

```sh
cd android-play
./gradlew --no-daemon bundleRelease lintRelease
python3 scripts/verify-bundle.py app/build/outputs/bundle/release/app-release.aab
```

Output: `app/build/outputs/bundle/release/app-release.aab`. Without the explicit signing flag this is an **unsigned review artifact**, not a production submission. `assembleDebug` produces a debug-signed QA APK for a test device; export data before uninstalling it to install a differently signed Play build.

Gradle 8.13 is checksum-pinned; Android Gradle Plugin 8.13.2 builds the bundle. Web assets are copied into generated output and checked for parity. Only staged `app.mjs` and `index.html` receive documented Play-specific changes: Play update links and the privacy/reporting module. All other original assets remain byte-identical. A supported AGP asset transform restores `.gz` resources after the default asset merger expands/renames them; the verifier checks the final OCR gzip path and bytes, not just staging. `play-asset-manifest.json` records every file hash.

## Finish the first Play release

1. Create the Console app for `com.findr.play` and enrol in Play App Signing. Confirm the package before any first upload; it becomes permanent. Keep version codes increasing thereafter.
2. Review the [Play setup and privacy documents](../docs/play-store/PLAY-STORE-SETUP.md), ownership of bundled imagery/manual extracts and required Console declarations. Public support: **Williamflood8@gmail.com**.
3. Deploy the **separate** [feedback Worker](feedback-worker/README.md), set `FINDR_PLAY_REPORT_URL` to its HTTPS `/reports` endpoint, and verify a real report from the Android app appears once in its private database. Configure monitoring/review and retention. This is required for the AI-enabled release; an unconfigured review build says reporting is unavailable.
4. Verify the public privacy-policy link in `play-release.properties` works without login. Override `FINDR_PLAY_PRIVACY_URL` if using another public HTML page. No app accounts, analytics SDK or ad SDK are added; review the Zone Sketch promotion when declaring ads.
5. Create your **own private upload key** using Android Studio’s signed-bundle wizard or `keytool`. Keep encrypted backups outside Git. The known preview key is rejected. Never send passwords or private keys in chat.
6. Test on Android phones, including offline cold start, PDF import/OCR, downloads, a local-model conversation where supported, report delivery, export/re-import, process recreation, keyboard, predictive back and 16 KB devices. Use Play internal testing/pre-launch reports and any required closed testing before production.

For a signed build, export the following variables in a private local shell (values are never committed):

```text
FINDR_PLAY_KEYSTORE=/absolute/private/path/upload.jks
FINDR_PLAY_STORE_PASSWORD
FINDR_PLAY_KEY_ALIAS
FINDR_PLAY_KEY_PASSWORD
FINDR_PLAY_REPORT_URL
FINDR_PLAY_READINESS_CONFIRMED=yes
```

Then run `./gradlew bundleRelease lintRelease -PrequirePlaySigning=true`. This fails if owner configuration, public policy, reporting health or signing identity checks fail. It does not submit anything to Google Play. The health check is not a substitute for testing actual report delivery.

## GitHub build action

The manual **Build separate FINDR Google Play bundle** action builds an unsigned review bundle by default. For signing, configure repository secrets `FINDR_PLAY_KEYSTORE_BASE64`, `FINDR_PLAY_STORE_PASSWORD`, `FINDR_PLAY_KEY_ALIAS`, `FINDR_PLAY_KEY_PASSWORD`, plus repository variables `FINDR_PLAY_REPORT_URL` and `FINDR_PLAY_READINESS_CONFIRMED`. `FINDR_PLAY_PRIVACY_URL` is optional when the tracked policy URL is correct. No Play publishing credentials are required because the action only produces an artifact.

The action lives on the separate branch until reviewed/merged. GitHub normally exposes `workflow_dispatch` only once the workflow exists on the default branch; local builds work immediately. Keep the `release/play-store` branch while a shipped build links to its privacy policy; migrate the public policy URL deliberately before removing the branch. The existing Pages workflow is untouched. Review the separate PR before merging; merging to `main` still triggers that repository’s existing Pages workflow.

## Maintenance and checks

Update `play-release.properties` deliberately when adopting a newer web release. Source-version mismatches stop the build. The Play native activity derives from the existing preview shell but separately adds Android 16 insets/back handling and safe last-route restoration; keep native transport fixes in sync deliberately.

```sh
python3 -m unittest discover -s android-play/tests -v
node --test android-play/feedback-worker/tests/*.test.mjs
node --test --test-isolation=none tests/*.test.mjs
```

The full legacy web test suite also expects its normal dependencies and retained `FINDR-0.14.1.apk` fixture; this historical binary is not an input to the Play build. Do not publish keys, local model weights, user PDFs, local job data, SDKs or generated build folders to Git. A built/validated AAB is distinct from a signed upload, Play acceptance and a published listing.

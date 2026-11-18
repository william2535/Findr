# Separate Play build — verified 18 November 2026

This is preparation for FINDR's first Google Play release. The unsigned review AAB is **not ready for Play submission**, and no Play listing or live website was published. The original preview APK is unchanged.

## Source and identity

- Latest inspected web source: **0.40.1**, Sites version **92**; GitHub base `8bdd8b03feb8babd6266b80b57dbc5d53efeadb2`.
- Play package: `com.findr.play`, version **0.40.1-play.1**, version code **1**. This has separate app storage from `com.findr.app` and the browser.
- Android 8/API 26 minimum; Android 16/API 36 target.
- Public support/privacy contact: **Williamflood8@gmail.com**.
- Only the standalone `android-play/` project, Play documentation, manual build workflow and ignore rules are added/updated. Web assets, existing Android project and Pages deployment workflow are unchanged.

## Checks actually run

| Check | Result |
| --- | --- |
| Existing Node regression suite | 1,980 passed, 0 failed, 1 skipped; 44.8 seconds |
| Play staging/bundle regression tests | 12 passed |
| Feedback Worker/client tests | 11 passed; SQLite schema/idempotency/expiry queries also checked |
| Gradle `bundleRelease lintRelease assembleDebug` | Successful; final incremental build 31 seconds |
| Android lint | 0 errors, 7 warnings |
| Official bundletool 1.18.3 validation and decoded manifest | Passed |
| Bundletool universal QA APK generation | Passed; all 1,414 web assets verified in the APK; not installed |
| Final bundle asset checks | All 1,410 original assets represented; only staged `app.mjs` and `index.html` intentionally modified; 4 Play-only assets added |
| Unsigned/release configuration checks | Correctly reports unsigned and missing live reporting endpoint; production gate rejects incomplete setup |
| Original source isolation | No changes under `public/app`, `android/` or the Pages deployment workflow |
| Chromium UI at 390×844 and 390×460, reduced motion | Home and privacy/report dialog tested; no JS errors or horizontal overflow |

The skipped regression verifies manufacturer PDF bytes against private downloaded research fixtures unavailable to the GitHub checkout. The legacy suite's retained 0.14.1 APK fixture and normal installed dependencies were supplied locally for testing; neither is part of this Play change.

The browser checks used a synthetic native bridge and intercepted local assets. They are **not a real Android/WebView test**. The smaller viewport approximates reduced keyboard space but does not verify an actual mobile keyboard. Report delivery was tested against the local test harness, not a deployed backend.

Toolchain: Linux x86_64; Eclipse Temurin JDK 17.0.21+9; Gradle 8.13; Android Gradle Plugin 8.13.2; official Android platform/build-tools 36.0.0. Gradle, JDK, SDK downloads and bundletool were checked against upstream checksums. The repository pins the wrapper, build plugin and bundletool.

## OCR packaging repair

The first final-bundle check caught Android's asset merger expanding `vendor/ocr/eng.traineddata.gz` and removing `.gz` from the filename. That would break FINDR's resource URL and checksum. An Android artifact transform restores the exact source bytes/path after merging, validating the generated expanded counterpart before removing it. The final bundle passes path and hash checks; a regression rejects the observed failure. No web-source OCR change was needed.

## Review artifact

- File: `FINDR-Play-0.40.1-play.1-unsigned.aab`
- Size: **73,679,637 bytes**.
- SHA-256: `535f26382563b173a9556e5e5bfeddbaac7eefd5a44812ffbd64a8e3335ab38b`.
- Signature: **unsigned**, deliberately. The owner's private upload key is required for a production build.
- Only `INTERNET` permission; non-debuggable; cleartext traffic and backup disabled; no native `.so` libraries.
- Detailed machine-readable results: [VERIFICATION.json](VERIFICATION.json).

## Remaining release work

1. Deploy and test the separate feedback service; verify a real in-app report, private review access and retention/deletion operations. No service was deployed in this preparation.
2. Review privacy/data-safety/ads declarations and bundled asset rights, and confirm the published policy link is accessible without login. The Zone Sketch banner needs consideration for the Contains ads declaration.
3. Configure a private upload key, enable Play App Signing and build with `-PrequirePlaySigning=true`. The preview signing key is rejected.
4. Test actual Android devices/WebViews: offline cold start, PDF/OCR, downloads, local AI on supported devices, optional online providers, reporting, export/import, process recreation, insets, keyboard, predictive back and 16 KB configurations. No physical device or emulator installation was performed here.
5. Supply real Android store screenshots/feature graphic, finish Play Console declarations and complete applicable internal/closed testing. Google Play review, approval and publication remain unverified.

The seven lint warnings concern API-gated predictive back, a newer Gradle version, the required JavaScript-enabled WebView, redundant resource qualifier, an optional storage-allocation API, monochrome icon and bitmap density placement. None is hidden with a blanket lint suppression.

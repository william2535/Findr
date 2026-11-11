# FINDR 0.37.0 — Tool box and Android

## Scope

Home → Tool box offers four calculators: battery capacity, two-wire DC voltage drop, 4/5/6-band resistor colours, and radial conductor resistance / R1 + R2. Current inputs persist in `findr:toolbox:v1`, independently of jobs, PDF stores, Panel Pals and diagnostic evidence. No model or connection is required for arithmetic. Primary-source links require a connection; formulas and source notes are bundled offline. See [calculator scope and reviewed references](calculators-and-sources.md).

## Android

Package `com.findr.app`; versionName 0.37.0; versionCode 27; minimum Android 8/API 26; target API 35. Keep the original signing key and install as an update, without uninstalling. Native storage remains at `https://appassets.androidplatform.net/app/index.html`.

The wrapper accepts PDF, JSON, CSV/TSV/text and multiple-file picker requests, supplies binary/worker/WASM/font MIME types, and streams existing blob exports through Android Save As. Its online-AI transport reaches one fixed FINDR relay only after the existing client consent flow; it does not persist keys or silently enable cloud inference. A local-document/CSP boundary restricts native bridge exposure.

Build with Android SDK platform/build-tools 35 and the existing private signing key:

```
python scripts/prepare-app.py
FINDR_ANDROID_SDK=/path/to/android-sdk python android/build-apk.py
```

Java 21 with its `jdk.compiler` module is sufficient; no Gradle dependency is required. `aapt` compiles the manifest/resources; original web assets are appended under `assets/www/` before zip alignment/signing, preserving long wiring filenames that the legacy `aapt` asset validator rejects. The build compares every bundled web asset byte against `public/app`, verifies the original signing certificate and checks ZIP alignment. Downloaded model weights and engineers’ saved PDFs/jobs are not bundled.

The complete current APK and checksum remain in the workspace and GitHub backup at `public/releases/`. The Sites Git server rejected this73 MB binary with “pack member exceeds aggregate working-memory limit”, so its source commit includes the checksum/build logic but deliberately omits the generated binary. The GitHub backup retains that APK as an explicitly documented additional artifact. The deployed website excludes only the explicitly declared oversized APK and redirects `/releases/FINDR-0.37.0.apk` to the immutable-version GitHub release asset. The checksum remains a website static asset. Previous APKs are preserved in source; versioned URLs never send a differently numbered binary.

## Verification limits

No physical Android phone, Android emulator or iPhone was available. Compilation, signing and bundled-asset checks are not an on-device installation test. Actual Android WebView PDF/OCR, local-model inference, file chooser/Save As and authenticated provider calls require device verification. The model’s memory requirements and existing capability fallback remain unchanged. Native transport/export tests use controlled responses, not paid provider inference.

Final automated/browser results are recorded below and in adjacent evidence files.


## Completed checks

- All **1,868 Node regression tests passed**, zero failures/skips, including the new calculator, native transport/export and release-policy tests.
- TypeScript `tsc --noEmit`, production web build and public-asset boundary verification passed.
- Signed APK: 73,458,195 bytes; SHA256 `e6f91ded97b687b3a69ebfeee46e9a0c3a43b9679ef4fca7b63bf9b5a3a3e37f`. Official SDK35 apksigner verified v2/v3 and the existing certificate; zipalign, ZIP CRC, unique entries and all bundled app bytes passed. The previous0.14.1 APK hash is unchanged.
- Chromium154: seven browser checks passed including normal Home entry, all four calculators, draft restoration and a full reload with networking disabled after real service-worker caching (build `7423eeefce3a`). Existing synthetic saved Panel Pal/log were preserved. No model/provider requests occurred.
- WebKit26.0: five phone-layout/interaction checks passed. WebKit offline caching is unverified because this executor’s CacheStorage is unavailable. Browser widths390/1440, reduced motion and shortened viewport were checked; shortened viewport is not a real on-screen keyboard test.
- Adjacent `browser-*.json` and screenshots contain evidence. `release-validation.json` records prepublication checks; these results alone do not claim website or APK publication. GitHub release/provenance records record publication separately.

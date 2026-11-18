# FINDR: separate Google Play release

Prepared against web source **0.40.1**, GitHub baseline `8bdd8b03feb8babd6266b80b57dbc5d53efeadb2`. Official requirements checked **18 November 2026**. This is release preparation, not evidence of Play approval or publication.

Confirmed first Play release: **`com.findr.play`**, version code **1**, project developer **Will Flood**, public support/privacy contact **Williamflood8@gmail.com**. See [privacy release review](PRIVACY-RELEASE-REVIEW.md) for outstanding operational checks.

## Separate release boundary

Use the dedicated `android-play/` build and its README. Keep the legacy `android/` preview builder, its signing key, web version metadata, live Site and GitHub Pages deployment unchanged. A different application ID installs alongside the preview APK and has separate local data. If a Play Console entry already exists, its package name and signing relationship must be confirmed before the first upload; do not substitute a new key or package name for an existing app.

An unsigned `.aab` can be structurally validated but cannot be uploaded as a signed release. A debug-signed test APK is for QA only. Neither establishes a published Play listing.

## Owner-controlled items before upload

1. Use the confirmed package `com.findr.play` and code `1` for this first release. Complete the developer account and identity/contact verification requested by Play Console; match the actual Console identity rather than inventing a company name.
2. Generate or select an **upload key** using Android Studio's signed-bundle workflow, keep a secure backup outside Git, and configure the separate builder's signing inputs. Use Play App Signing for the distribution key. Never reuse FINDR's development/preview key as a new production signing identity. [Signing documentation](https://developer.android.com/studio/publish/app-signing).
3. Publish the [privacy policy](PRIVACY-POLICY.md) at the documented rendered GitHub URL and link that page inside the Play build. Verify logged-out access after branch publication. Complete the separate [operational review](PRIVACY-RELEASE-REVIEW.md), including relay/provider/hosting retention rather than promising no server collection. [Review requirements](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).
4. Complete [Data safety](DATA-SAFETY-DRAFT.md), app access instructions, ads declaration, target audience and the IARC content-rating questionnaire from the final binary. The drafted [store listing](STORE-LISTING-DRAFT.md) has the confirmed support contact and still needs real screenshots.
5. Resolve the AI-reporting release gate below before submitting a build that exposes Panel Pals generation.
6. Upload the signed AAB to **internal testing** first. Run the Play pre-launch report and real-device checks; then use the required closed/production path for the account. Do not call an internal test a production release.

## Technical requirements and tests

| Requirement | Application to FINDR |
|---|---|
| Target API | New mobile apps and updates require **Android 16 / API 36** from 31 August 2026. A target-35 preview APK is insufficient for this new submission. [Official policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en). |
| App Bundle | Produce and validate the dedicated release AAB, then sign with the upload key. Retain its SHA-256, source revision and version code with release evidence. |
| 16 KB devices | Inspect the final bundle/APKs for native `.so` libraries. Pure Java/Kotlin apps do not require native ELF rebuilds; bundled JavaScript/WASM used by system WebView is not an app-packaged Android ELF library. Nevertheless test on a 16 KB device/emulator. [Android guidance](https://developer.android.com/guide/practices/page-sizes). |
| Permissions | Verify the merged manifest. Existing FINDR uses Internet access and user-selected document import/export; do not add broad storage, contacts, microphone or location permissions unnecessarily. |
| Current Android behaviour | Exercise edge-to-edge insets, keyboard resize, system Back/predictive Back, rotation, file picker, PDF export and external links on API 36. Also test the minimum supported Android version. |
| Offline | Fresh install → prepare resources/save manual → disable network → cold launch → read PDF/search → resume a Pal/log → export. Separately test unseen PDF text/OCR and available local inference. State any device/model limitations. |
| Update | Install an older test build of the **same Play package and signer**, save data, update without uninstalling, then verify manuals/conversations. Sideload-preview data is separate when package IDs differ. |
| Online AI | Use an explicitly chosen provider and a test key supplied securely on device. Validate consent, cancellation, key clearing, manual excerpt scope and safe errors. Synthetic provider tests do not prove authenticated inference. |

For personal developer accounts created after 13 November 2023, Google currently requires at least **12 opted-in testers continuously for 14 days** in a closed test before applying for production access. The account's Console remains authoritative; production access is not automatic after the timer. [Testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

## AI-reporting release gate

Panel Pals is a central text chatbot, so Google's AI-generated-content policy is relevant to both local and online generation. It requires an in-app way to report/flag offensive output to the developer without leaving the app. The separate Play preparation adds a reporting interface and a separate feedback Worker. The owner still needs to deploy/configure its endpoint, activate retention cleanup and verify that reports actually reach the review store. An unconfigured endpoint, local flag, exported file or external email link alone does not demonstrate that requirement.

Before submission, configure and test the report path with acknowledgement, minimal disclosed payload, queue/failure handling and an operational review process. Update privacy/Data safety for the report data. Apply appropriate restricted-content safeguards; document source-grounding and refusal behaviour without claiming a model cannot generate harmful content. [AI-generated-content policy](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en).

## Content and release evidence

Verify licences/attribution for the bundled photos, portraits, diagrams, runtime libraries and model distribution; source links or public availability alone are not redistribution permission. Present manufacturer names as equipment references, not endorsements. The app includes adult language in its terminal/personality, so answer the content-rating questionnaire honestly and choose an appropriate audience.

Keep signed artifacts and keys outside the public source repository. Record actual build, bundle validation, signature and device-test results in the release report; leave unrun checks explicitly pending. These documents do not certify Play policy approval.

# Signed internal draft — 18 November 2026

Google service-account authentication and FINDR edit/track access succeeded in [access-check run 44296795142, attempt 3](https://github.com/william2535/Findr/actions/runs/44296795142/attempts/3). The temporary edit was deleted, and that check made no upload or release commit.

A dedicated FINDR upload key was generated outside the repository, backed up in the owner's private Drive folder, and pinned by its public certificate in `android-play/play-release.properties`. Folder and uploaded-file permission metadata showed `shared: false` with only the intended owner. No key, password or private backup is committed here. The owner configures its combined JSON as the `FINDR_PLAY_SIGNING_JSON` Actions secret.

Local build: `with-play-signing.mjs -- ./gradlew --no-daemon bundleRelease lintRelease -PrequirePlaySigning=true -PplayReviewOnly=true` completed successfully using the actual upload key. Final Gradle build took 34 seconds on the previously documented Linux/JDK 17/SDK 36 environment. The temporary signing directory was empty after completion.

The signed review bundle passed actual JAR signature verification, pinned-certificate comparison, official bundletool validation, decoded-manifest checks and all 1,414 packaged web-asset hashes. It preserves all 1,410 original web assets with the same two intentional Play staging overrides. The gzip OCR path remains intact.

- Package/version: `com.findr.play`, `0.40.1-play.1`, code `1`.
- Public upload certificate SHA-256: `6440201bb68743ee07c0d4dffbeaeef7c03230878ca91d231785894b8d88d1ab`.
- Local review AAB size: 73,768,139 bytes.
- Local review AAB SHA-256: `d253657a2a6d8bc7e44c009f73991520a1ac1d815b2c46146ad7e0a4b8178663`.
- `reviewOnly: true`, `releaseConfigurationReady: false`, `draftUploadChecksPassed: true`, `uploadableBuildChecksPassed: false`.
- Normal distribution verification correctly rejects this same signed review bundle. An explicit draft-verification option cannot turn an unmarked/unverified bundle into an acceptable draft.

This distinction permits uploading an **undistributed internal draft** for Console preparation before completing operational/reporting and device checks. It does not authorize or enable a rollout. The uploader is hardcoded to internal/draft and protects existing review state; production signing retains the existing readiness gates.

Focused checks: 15 Python build/bundle tests and 49 Node access/signing/upload/reporting tests passed. The earlier full web regression result remains 1,980 passed and one private-research-fixture skip; this change does not alter the shared web source. No physical Android test was performed.

GitHub builds produce their own freshly verified artifact and SHA; build timestamps/signatures can change the archive hash. A successful local build is not evidence of a successful Google upload. The upload workflow records its real commit/readback result separately. Reporting infrastructure, store declarations, actual Android tests and distribution readiness remain outstanding.

# Configure FINDR upload signing from an iPhone

Google's service-account JSON permits Play API operations. The Android upload key is a separate credential, needed to sign the AAB. The combined `FINDR_PLAY_SIGNING_JSON` secret lets the owner configure this with one paste instead of four separate signing secrets. It does not replace the Google credential or complete the reporting/release checks.

## Private handover

Use only the dedicated FINDR upload identity, not the preview APK key. Keep a recoverable private backup before the first upload establishes its certificate in Play Console. Google Play App Signing manages the eventual app-signing key separately.

The owner receives the complete combined JSON as a private file. A backup containing both the keystore and its password is a **full signing credential**, even though the keystore itself is password-protected. Never call that aggregate JSON an encrypted backup. Keep it in owner-only storage and out of Git, screenshots, chat and public Actions artifacts.

When using Drive for handover, verify the destination folder before upload and each file after upload: `shared: false`, no shared-drive membership, and only the intended owner in returned permission metadata. Unknown/omitted permissions are not proof of privacy. Do not change sharing or send invitations. The owner can additionally review **Manage access → Restricted** in Drive.

## Add the one GitHub secret

1. Open FINDR's GitHub **Settings → Secrets and variables → Actions → New repository secret**.
2. Set the name to `FINDR_PLAY_SIGNING_JSON` without spaces or quotation marks.
3. Paste the entire private signing JSON file into **Secret**, then save it.
4. If iPhone Files cannot copy its text, an Apple Shortcut containing **Select File → Get Text from Input → Copy to Clipboard** can copy the local file. Paste only into GitHub's secret field.

The JSON schema has exactly these fields, with real values supplied only in the private file: `schemaVersion` (1), `keystoreBase64`, `storePassword`, `keyAlias`, `keyPassword`, `certificateSha256`. No example private key or password belongs in the repository.

## Runner contract

The workflow passes that one secret to `FINDR_PLAY_SIGNING_JSON` in a dedicated build step, then invokes:

```sh
node android-play/scripts/with-play-signing.mjs -- ./gradlew --no-daemon bundleRelease lintRelease -PrequirePlaySigning=true
```

`RUNNER_TEMP` must be an existing absolute directory outside the Git checkout. The wrapper creates a 0700 subdirectory and 0600 keystore, validates the certificate fingerprint with `keytool`, rejects the known preview signer, and runs only the checked-in `android-play/gradlew` with allowed signing-build arguments. It passes the four legacy signing variables privately to the child process, without writing passwords to `GITHUB_ENV`. It removes aggregate JSON and Google service-account credentials from the build child's environment.

Child output is bounded and buffered before password/key redaction, including text split across chunks. Normal completion, build failure and handled SIGINT/SIGTERM clean up the temporary keystore. Forced process/runner termination cannot guarantee JavaScript cleanup; use an ephemeral hosted runner and never persist its temporary directory or publish it as an artifact. The wrapper does not upload to Google Play.

An explicit `-PplayReviewOnly=true` may additionally be passed for the separately defined review-only signing build. It still requires `-PrequirePlaySigning=true`. The wrapper does not interpret that build as production-ready; the build and publisher must preserve its review-only metadata and restrict any upload to an undistributed internal draft.

Existing four-secret configuration can remain supported by a separate workflow branch. The wrapper itself accepts only the combined JSON; it never silently falls back to another signing key. Production reporting, privacy, owner readiness and final bundle verification remain in force.

Focused tests: `node --test android-play/tests/play-signing.test.mjs`. These use synthetic opaque bytes with mocked certificate/build processes, not a real production keystore. A passing test does not establish successful signing; the real build and final AAB certificate still need verification.

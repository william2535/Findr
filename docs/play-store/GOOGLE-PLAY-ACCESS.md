# Check the Google Play publishing connection

The owner stores the complete Google service-account JSON in the repository Actions secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. Never put it in Git, a public artifact or a chat message. This is separate from the private Android upload keystore.

`Check FINDR Google Play access` runs on relevant pushes to `release/play-store`, without merging into `main` or deploying Pages. It can also be dispatched once the workflow is available on the default branch. Use the Actions run's **Re-run jobs** to retry after the owner changes credentials or Console permissions.

The check uses Node's built-in cryptography, authenticates only against Google's fixed OAuth endpoint, creates a temporary edit for `com.findr.play`, reads its tracks, then abandons the edit. It never uploads a bundle, commits an edit or releases an app. It prints only fixed status messages and presence flags for remaining setup; Google response bodies, service-account identity, signing values, JWTs and access tokens are not logged or saved as artifacts.

Google allows one open edit per user/app. Creating this check's edit invalidates another open edit owned by that same service account. Use a dedicated FINDR publisher and do not operate another publisher with it concurrently. This workflow uses the `findr-play-com-findr-play` concurrency group; future upload workflows must use the same group with cancellation disabled. Cleanup is attempted even when track access fails; any failed cleanup is shown honestly and the uncommitted edit expires.

## Results and recovery

- `access_verified`: Google authentication and FINDR edit/track access work. Upload/release-write permission and actual release readiness remain unverified.
- `missing_secret` / `invalid_secret`: add the complete service-account JSON to the named repository secret.
- `authentication_failed`: Google rejected the credential. Check the key is active and the JSON intact.
- `api_disabled`: enable **Google Play Android Developer API** in the service account's Cloud project.
- `permission_denied`: invite the service-account email under Play Console **Users and permissions**, with FINDR access and testing-release permissions. Allow propagation time.
- `app_not_initialized`: check app access and complete FINDR's initial Console setup/first signed upload. A new Console app may not be accessible by `com.findr.play` until its first bundle establishes that package. This is not proof of a broken key.
- `network_error`, `rate_limited`, `google_error`: retry after the transient/API issue is resolved. Raw upstream details are deliberately withheld from public logs.

Signing-secret presence is reported without exposing values. Presence does not verify keystore validity, live reporting, ownership/rights review, Android tests or Play approval. The existing `build-play.yml` remains an artifact builder: this connection check does not silently turn it into an uploader. A first signed Console upload and complete release configuration remain necessary before enabling an automated release.

References: [Google Play API setup](https://developers.google.com/android-publisher/getting_started), [edit lifecycle](https://developers.google.com/android-publisher/edits), [create an edit](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/insert), [delete an edit](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/delete), [first-upload bootstrap guidance](https://docs.fastlane.tools/actions/upload_to_play_store/).

Focused verification: `node --test android-play/tests/play-access.test.mjs`. The tests use generated synthetic keys and mocked Google responses; a successful test run is distinct from the real GitHub Actions connection check.

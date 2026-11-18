# Upload a verified FINDR internal draft

`android-play/scripts/upload-play-internal.mjs` uploads one signed AAB for **`com.findr.play`** to an **internal draft**. It cannot roll out to testers or production and does not promote, replace or cancel other tracks. A stored internal draft is not evidence of Play approval or of an installable testing release.

Run the existing bundle verifier immediately before upload. The uploader compares its JSON report with the exact AAB byte count and SHA-256, configured package/version, signature status, signing certificate and bundletool/manifest results. The known preview certificate is rejected. The report must describe either:

- A fully verified production-ready bundle with `uploadableBuildChecksPassed: true`, `releaseConfigurationReady: true` and the owner's `FINDR_PLAY_READINESS_CONFIRMED=yes` setting; or
- An explicitly verified **review-only** signed bundle with `draftUploadChecksPassed: true`, `reviewOnly: true` and `releaseConfigurationReady: false`. The verifier must establish these values from the checked bundled configuration. This path permits initial Console/pre-launch preparation while reporting infrastructure and distribution checks remain outstanding. It always reports `distributionReady: false`.

Do not hand-edit verification JSON or use a stale report. This uploader consumes the verifier's evidence; it does not replace the verifier's actual JAR signature and bundletool checks.

```sh
# First run verify-bundle.py with the applicable signed/review-draft verification mode.
# GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must be a private runner environment secret.
node android-play/scripts/upload-play-internal.mjs \
  --bundle android-play/app/build/outputs/bundle/release/app-release.aab \
  --verification android-play/app/build/verification.json \
  --commit-internal-draft \
  --output android-play/app/build/play-upload-result.json
```

The explicit `--commit-internal-draft` argument is required. No credentials belong on the command line. Credential JSON is consumed from the environment and removed from that environment before network work. Neither it, its identity, JWTs, access tokens nor raw Google error bodies are logged or written into the result file. Only fixed status codes and artifact identity are reported.

## Google operations

1. Obtain an OAuth token using the existing fixed-endpoint service-account authentication code.
2. Create one uncommitted edit and inspect its tracks, bundles and APKs. Stop on a visible reused/non-increasing version code or an existing internal draft. Google may know older reserved versions not exposed by these lists; an upload rejection remains authoritative.
3. Upload the AAB once with the media endpoint and verify Google's returned version code and payload SHA-256.
4. Retain all current internal releases, append only the new `status: draft` release, and verify Google's staged response retains them. No other track is updated.
5. Validate the edit, then commit with **`changesInReviewBehavior=ERROR_IF_IN_REVIEW`**, omitting `changesNotSentForReview`. Google explicitly required its omission for FINDR in [diagnostic run 44301204915](https://github.com/william2535/Findr/actions/runs/44301204915): HTTP 400, `review_flag_must_be_omitted`, no successful commit, and the temporary edit was deleted. This is an evidence-based fixed configuration, not an automatic fallback. The retained review guard prevents the API's default behaviour from cancelling an existing review; the hardcoded draft status prevents this script from starting a rollout. Omitting the rejected parameter is not a guarantee that Google will never initiate a review.
6. Read back the committed draft and bundle hash using a fresh temporary edit, then delete that readback edit. Report success only after the recorded draft, all retained internal releases and payload hash match.

Google allows one edit per user/app. Use the dedicated publisher account and the same workflow concurrency group as the access checker: **`findr-play-com-findr-play`**, with `cancel-in-progress: false`. Do not run another publisher for this app/account at the same time. No invocation automatically retries an upload or commit.

## Failure and recovery

- Deterministic pre-commit failures abandon the known uncommitted edit. Failed cleanup is reported separately.
- Known Google commit errors are classified into fixed enums (`review_flag_must_be_omitted`, `review_flag_required`, `review_in_progress`, `draft_app_requires_draft_release`) without logging raw responses. A new conflicting requirement stops the run; the script never changes its flags and retries automatically. The confirmed forbidden-flag response in run 44301204915 is the basis for the current omitted-parameter configuration.
- A lost upload response becomes `upload_outcome_unknown`; the uncommitted edit is abandoned where possible. Inspect Console/version state before retrying because uploaded version state may require reconciliation.
- A lost/ambiguous commit response becomes `commit_outcome_unknown`. The script neither retries nor deletes that edit because the commit may already have happened. Inspect Console before any further operation.
- A confirmed commit with failed readback becomes `committed_readback_unverified`. This is not a rollback: the draft may be saved. Do not upload the same version again.
- A successful result is `internal_draft_uploaded`, with `committed: true` and `readbackVerified: true`. It still does not mean testers can install it. Review-only builds must complete the remaining distribution requirements before any rollout.

The tool is intentionally conservative about Google normalizing an existing release: any unexpected change in retained release data stops validation rather than silently dropping that release. No automatic replacement of an existing draft is provided.

## Verification

`node --test android-play/tests/play-upload.test.mjs` uses a generated synthetic key, synthetic AAB bytes and mocked Google responses. It covers input/signature/readiness gates, review-only drafts, exact payload upload, version conflicts, retained releases, validation failure, ambiguous operations, cleanup and committed readback. These tests do not claim a real upload occurred.

Official references, checked 18 November 2026: [bundle upload](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles/upload), [bundle payload hashes](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles), [track update and draft status](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks), [edit validation](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/validate), [commit and review behaviour](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit).

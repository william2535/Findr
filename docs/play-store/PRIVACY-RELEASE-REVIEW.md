# Privacy and policy release review

This checklist is for the release operator, separate from the public [privacy policy](PRIVACY-POLICY.md). It does not claim Play approval.

Confirmed by the owner: first Google Play release; package `com.findr.play`, initial version code `1`; project developer **Will Flood**; public support/privacy contact **Williamflood8@gmail.com**. This name identifies the project developer, not an invented company or verified legal entity. Match the actual Console developer identity when completing the listing.

## Policy hosting

Planned URL: https://github.com/william2535/Findr/blob/release/play-store/docs/play-store/PRIVACY-POLICY.md

Google asks for a valid publicly accessible HTTPS policy, available without login/geofencing, on a standard non-editable webpage rather than a PDF/download. Its rule does not explicitly require a dedicated domain. A public GitHub blob page renders this Markdown as HTML and ordinary visitors cannot edit the original document. Use the rendered page, not a raw-file or ZIP URL. After publication, verify it opens logged out and the in-app link reaches it. Keep the branch/URL available through the release's lifetime. Play reviewer acceptance is not verified; if Console rejects the hosting format, host the same text as a standalone public HTTPS HTML page and update only the Play build/listing. This need not change the existing FINDR website. [Official requirements](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).

## Remaining operational checks

- The feedback Worker is prepared separately, not deployed by merely building the app. Deploy a new Worker/D1 database, activate the hourly cleanup, test one labelled report from Android and its idempotent retry, then verify one durable record and expiry. Until configured, the UI must report unavailable.
- Confirm an operational report-review schedule; the Worker does not automatically email notifications or establish that anyone has reviewed submissions.
- Confirm Cloudflare account D1 backup/Time Travel and infrastructure/security log retention. The public policy distinguishes active records from platform retention and promises neither zero retention nor an invented platform duration. Record actual account settings in private operational documentation and refine the policy if needed.
- Check that request-body/credential logging remains disabled at relay, Worker and account tooling, including any later observability integration.
- Recheck the actual Groq/OpenAI account data controls and current policies before making Console retention or service-provider exemption declarations. `store:false` is not zero retention.
- Make sure the support address is monitored and deletion requests can be handled. Agree a support-correspondence review/deletion process consistent with the stated purpose-limited retention.
- Complete Data safety for the actual final artifact and enabled endpoints. The public policy is not a completed Console form.
- Assess the existing Home Zone Sketch promotional banner in the Ads declaration. Google includes banners promoting the developer’s own apps in its house-ad examples; absence of an advertising SDK does not automatically mean “No ads”. [Official examples](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en).
- Verify rights/attribution for bundled manufacturer photos, portraits, diagrams, runtime libraries and models; public availability does not itself prove redistribution rights. Avoid manufacturer/celebrity endorsement claims.
- Review the target-audience/content-rating declarations for the app's language and AI features. Do not invent an age rating or claim approval before Console review.

Source reviewed: `android-play/web/play-report.mjs`, `android-play/web/play-store.mjs`, `android-play/feedback-worker/worker.mjs`, its migration/config, the existing local stores and optional AI relay. Review date: 18 November 2026.

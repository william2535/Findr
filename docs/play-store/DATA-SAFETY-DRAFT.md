# Play Data safety worksheet — not submitted

Source review: **18 November 2026**, FINDR web 0.40.1, separate first Play release `com.findr.play` / code `1`. Project developer: Will Flood. Public support/privacy contact: Williamflood8@gmail.com. Recheck the final Play artifact, remote relay configuration and any reporting feature before completing Console. Do not answer “no data collected” solely because FINDR stores jobs locally: optional online AI and network resources transmit data off device.

Google treats data sent off device, including controlled WebViews and SDKs, as collection. Even qualifying ephemeral processing belongs in the form response. Sharing exemptions depend on actual service-provider arrangements, purpose and user-initiated transfers; they are not implied merely by using HTTPS. [Official Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

| Data/flow | Observed source behaviour | Console review needed |
|---|---|---|
| Saved manuals, extracted text, notes, schedules, readings, Pal conversations | Kept in device IndexedDB/CacheStorage/local preferences for offline use. | Local-only data is not an off-device collection claim. Check all enabled features before deciding relevant categories. |
| Online questions, selected context and PDF excerpts | Optional, explicit provider consent; sent to FINDR relay and Groq/OpenAI. | Declare applicable user-generated content/messages/files-and-documents types that may be transmitted. Purpose: app functionality. Optional collection. Do not promise ephemeral processing across providers without evidence. |
| Names, site/customer details entered in free text | No structured requirement for personal identity; free text can still contain it and online context may transmit it. | Assess actual intended data under Personal info/other relevant categories. Disclose that entering details can transmit them when Online AI is chosen. |
| API credentials | Kept in module memory, transmitted via dedicated HTTPS header through relay to provider, cleared by disconnect/session end. | Treat as sensitive authentication data. Confirm applicable user/account identifier classification and purpose in the current Console taxonomy; do not put credentials into reports or analytics. |
| IP address and request/device metadata | Network requests reach resource publishers, GitHub, relay and selected provider. | Confirm hosting/provider access/security logs and retention. Do not declare no identifiers/diagnostics collection without checking infrastructure. |
| AI output reports | Separate Play interface/Worker prepared for voluntary reviewed category, description, optional answer excerpt, random report ID, version and package. D1 stores receipt/expiry timestamps and a payload checksum for idempotency; expiry is 29 days with hourly cleanup. No IP/User-Agent is stored in D1; Cloudflare receives network metadata and transiently rate-limits by IP. | Declare user-generated report content and applicable metadata for app functionality/content review. Deployment, cleanup and delivery must be verified; no automatic job/manual/API-key attachment is intended. |
| Exports/shared handovers | Explicit local download/export through Android document location. | User-chosen file sharing is distinct from automatic app collection; examine the final sharing mechanism and the applicable exemption. |
| Analytics, advertising, crash SDKs | No advertising/analytics SDK found in inspected app dependency/Android/entry-point sources. Local console error diagnostics exist. The Home Zone Sketch promotion is a separate Ads-declaration consideration. | Confirm final dependencies and relay/host settings. Do not use this bounded code review as proof that infrastructure collects nothing. |

## Answers supported by source, subject to final verification

- Online AI collection is optional; the engineer must choose it and accept its disclosure. No silent cloud fallback is intended.
- Application transport for AI uses HTTPS and the native manifest blocks cleartext. Verify every final resource endpoint before declaring all relevant data encrypted in transit.
- The app does not create FINDR accounts. Do not confuse provider API accounts with FINDR account creation. Reassess account-deletion requirements if accounts are added.
- No app payment-card form is present. Provider API billing happens in the provider's account, outside FINDR.
- Native import/export uses user-selected documents, not broad file access. Verify the final merged manifest contains only necessary permissions.
- Deleting a Pal removes its conversations/context but intentionally retains shared manuals and models. Removing the app/clearing storage does not delete exported files or third-party records.

## Evidence to finish before submission

1. Capture a final network trace for offline startup, explicit manual/model download, online generation, cancellation and reporting. Exclude secrets and user content from the saved audit.
2. Confirm whether the relay host logs headers, bodies, IPs or device metadata and its exact retention/deletion settings. Application code is stateless; infrastructure may not be.
3. Confirm provider agreements/settings before choosing a “service provider” sharing exemption or ephemeral-only processing. Do not assert zero retention based on `store: false`.
4. Deploy the separate feedback service and complete a report-delivery/retry/deletion test and verify the [public privacy policy](PRIVACY-POLICY.md) and [release review](PRIVACY-RELEASE-REVIEW.md).
5. Have the Play account owner review and submit the form for the exact package. These notes are preparation, not a completed or approved declaration.

## Source modules reviewed

- `public/app/db.mjs`: local manual metadata/PDF blobs/settings.
- `public/app/helpers-store.mjs`: Pal/conversation persistence, exports and shared-resource preservation.
- `public/app/online-language.mjs` and `online-language-policy.mjs`: explicit provider/consent, memory-only key and fixed transport contract.
- `lib/online-assistant.mjs` and `app/api/assistant/online/route.ts`: bounded stateless relay and fixed upstream providers.
- `android/src/com/findr/app/MainActivity.java`: native WebView/manual relay, document chooser and export bridge.
- `public/app/local-language*.mjs`: local worker/model resources and local resource deletion.
- `docs/online-panel-pals.md` and `docs/openai-panel-pals.md`: existing implementation disclosures; provider policies must be rechecked for release.

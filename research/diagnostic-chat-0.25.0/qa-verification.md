# FINDR 0.25.0 browser verification

These results use **labelled synthetic manuals, visits, observations and readings**. The PDF fixtures do not verify a manufacturer's procedure, electrical limit or equipment. Manufacturer source review is recorded separately in this directory.

## Environment and reproducibility

- Linux x86-64, Chromium 154, Playwright, five logical processors and 16 GB `navigator.deviceMemory` reported by the browser.
- Desktop viewport 1440 × 844; phone portrait viewport 390 × 844. An additional 390 × 500 viewport simulates the space available with a keyboard open.
- This is Chromium viewport testing, **not physical iPhone, Safari, Android or signed-APK testing**. Native phone keyboards, background eviction and low-memory devices still need physical-device validation.
- The final normal-entry offline run used the generated 0.25.0 shell: **1,294 assets, 82,595,813 bytes, build `684e4535e8fd`**.
- Browser network access was disabled only after the verified service worker had activated. The page was then reloaded before uploading a previously unseen local PDF. No manufacturer PDF, test result or manual-analysis cache was pre-seeded for that import.

Commands, from the repository root with the local static server on port 8088:

```sh
python -m http.server 8088 --bind 127.0.0.1 --directory public
node scripts/verify-diagnostic025-browser.mjs
node scripts/verify-diagnostic025-manuals.mjs
node scripts/verify-diagnostic025-restart.mjs
```

`FINDR_QA_URL`, `FINDR_PLAYWRIGHT_PATH`, `FINDR_CHROMIUM` and `FINDR_QA_RESULTS` override the environment. The normal UI harness defaults to actual browser-context offline testing; `FINDR_QA_OFFLINE=0` is explicitly a preliminary online run. `FINDR_QA_WIDTHS=390` selects a single viewport.

## Verified through the normal Fault Finder entry

Both viewport sizes passed the full workflow with browser networking unavailable:

1. Start through Fault Finder; keep the top menu accessible and respect reduced motion.
2. Require a readable manual before diagnosis; upload the unseen text PDF on desktop and the unseen image-only scan in the phone viewport.
3. Suggest and confirm system, manufacturer, installed model and variant.
4. Record a free-text resistance complaint and intermittent condition; ask the input/profile/access question with the applicable synthetic PDF page reference.
5. Open the saved PDF locally; return to the same job.
6. Answer a diagnostic question, correct it through the evidence log and retain the earlier answer.
7. Enter “12 volts”; clarify the actual point, reference, load condition, circuit state and source. Save the panel-reported reading without inventing a model pass result.
8. Correct the reading to `12.40`; retain both entries and the exact measurement reference.
9. Add and identify an Elmdene component manual in the same job. Preserve its entered equipment role, the panel identity and the pending question.
10. Scroll back through the transcript; submit an observation without jumping to the latest entry; use the Newest shortcut.
11. Keep composer and outcome controls inside the 500 px keyboard-like viewport, without horizontal overflow.
12. Calculate a series resistor total and a comparable voltage difference. An additional offline run saves the result as derived arithmetic and verifies two rapid save taps produce one event.
13. Give up with an access/return-visit handover. Review and download JSON, complete text and short handover; downloaded content matches the reviewed preview.
14. Reload and resume the same question and evidence.
15. Record a discriminating visual observation and finish with **confirmed cause awaiting parts**. Retests and restoration remain unverified.
16. Preserve an earlier undated saved visit unchanged. No uncaught browser errors occurred.

Evidence: [normal offline UI](qa/offline-normal-ui.json), [derived calculation save](qa/offline-derived-calculation-ui.json), [phone conversation](qa/conversation-390.png), [keyboard-like viewport](qa/keyboard-390.png), [desktop report](qa/report-1440.png).

## Manual-processing negative cases and cache reuse

The dedicated browser harness verifies unseen text and scanned PDF processing while offline, content identification with original page references, a second component manual, local page retrieval and reuse after reload. It also verifies:

- Hostile quoted PDF prompts and script text remain inert.
- A valid PDF with unreadable bars is rejected with `UNREADABLE_MANUAL`.
- A truncated PDF is rejected as incomplete.
- Cancelled processing commits no partial analysis for that content hash.
- A simulated quota failure during analysis save surfaces `STORAGE_UNAVAILABLE`; the previous usable analysis, saved PDF and old visit remain intact.
- An analysis reused after reload retains the same page text and references.

This harness ran against the same manual-processing implementation before the final diagnostic page-quality filter. The normal offline UI was rerun after that filter on the final manifest above; the processor and OCR resource bytes were unchanged. The separate rule regression covers excluding unreadable pages from citations in an otherwise usable manual.

Evidence: [offline processor results](qa/offline-manual-processing.json). Fixtures and exact SHA-256 values are in [the synthetic fixture directory](../../tests/fixtures/diagnostic025/README.md).

## Actual browser closure and restart

A dedicated persistent Chromium profile was closed and reopened. Network access was disabled before the reopened browser navigated. The saved partial reading clarification, event IDs and transcript resumed without duplication. The previously saved PDF opened locally. A **previously unseen image-only component PDF** was then processed with OCR for the first time after restart, identified and attached to the same pending reading.

The test asserts the exact component PDF hash and that every processed page uses OCR. Timing below comes from the processor's extraction/OCR/indexing stages; the incidental UI dispatch timer in the raw result is not used as an import benchmark.

Evidence: [browser-restart results](qa/offline-browser-restart.json).

## Measured performance

These are small, clean English synthetic documents on the Linux environment above. They are observations, not phone performance guarantees.

| Operation | Measurement |
| --- | ---: |
| Three-page selectable-text PDF, processor | 350.4 ms |
| Two-page image-only scan, processor | 2,239 ms |
| Reuse completed text analysis after offline reload | 4.9 ms |
| Full phone-viewport scan upload through identity UI | 2,871 ms |
| Full desktop text upload through identity UI | 356.6 ms |
| Conversational send through locally persisted response | 54.6–73.8 ms |
| First one-page component scan after browser restart, processor | 1,556 ms total; 1,372 ms OCR |

English OCR, uncertain identification and numbers extracted from scans still require engineer review. This verification does not establish compatibility or performance for physical Safari/iOS, low-memory mobile hardware, non-English scans, unusually large documents or every manufacturer's manual layout.

The original Node regression baseline was **1,069/1,069 passing** before implementation. Final regression, typecheck, build and publication results are recorded by the release owner; a browser test or successful build alone does not establish website publication or a signed APK release.

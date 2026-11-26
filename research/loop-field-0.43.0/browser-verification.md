# Loop field logging — browser verification

Verified on 26 November 2026 against FINDR **0.43.0**, offline release **2c7d00d2cfc5**, served from the actual `public/` application. This report concerns the new site-investigation recorder. All entered jobs, readings and photographs were explicitly synthetic test data; no real panel or customer records were used.

## Environments and measured results

| Browser | Field journey | First actual photo OCR | OCR confidence reported by Tesseract |
| --- | --- | --- | --- |
| Chromium 154.0.8037.57, Linux | 13 checks passed in 38.36 seconds | 2.165 seconds | 81 |
| WebKit 27.2, Linux | 13 checks passed in 55.15 seconds | 3.985 seconds | 83 |

Automation used Playwright 1.65.1 and a fresh persistent browser profile for each run. Persistent profiles permit actual IndexedDB Blob storage in the Linux WebKit runtime; the earlier ephemeral-context limitation is documented in the 0.42.0 browser report. There were no page errors in either final field run.

The OCR timings cover uploading a 1400 × 900 synthetic PNG through the real file input, worker initialization, local recognition and saving editable suggestions. They are one-run measurements on this Linux host, not mobile-device benchmarks or an accuracy guarantee. Confidence did not approve a single row automatically. Whole-journey durations include unrelated UI and persistence checks and are not OCR throughput figures.

Machine-readable results are retained in [browser-results.json](./browser-results.json). The harness is `tests/verify-loop-field-browser.mjs`.

## What the real UI tests established

1. **Entry and separate state.** Home → Panel Lab → Loop diagnostics opens Site investigation. Creating a job begins with no devices or readings. An existing edited matrix and a separate saved practice exercise survive the complete field journey unchanged.
2. **Actual OCR and column association.** Bundled Tesseract read a PNG containing the documented `Add / State / S/N / Type / Ver / Map` layout. Six nonconsecutive address/Map pairs were correctly proposed despite serial numbers and device-version digits. `Logged`, `Unallocated`, `Missing` and `1 of 6` summaries remained unparsed reference text, not devices. A second generic Address/Map/Device photograph also produced the expected two proposals.
3. **Human review and provenance.** Original photograph bytes were saved as actual Blobs. Before explicit confirmation the inventory remained empty. A deliberately introduced duplicate address prevented the batch being approved. Edited labels, corrected values and an intentionally unknown Map field were saved only after review, with their source-photo identities retained.
4. **Partial inventory and topology.** Six approved rows did not automatically establish the whole loop. An inconsistent expected count was rejected. Explicit completeness evidence was required. Equal Map numbers did not confirm a physical section; unverified sections withheld interpretation. Adding independent topology evidence retained the earlier observation's unverified snapshot.
5. **Entered counters and coverage.** The test entered actual form values and times; the app did not synthesize readings. A known 10→12 one-hour window produced a delta of 2. Independently entered poll totals of 1000→1600 retained their source and produced 600, rather than deriving polls from elapsed time or display refresh. Adjacent equal windows with matching coverage could compare. Excluding a device prevented a like-for-like comparison; unavailable devices remained unassessed.
6. **Resets and unknowns.** A 5→1 counter with a reset during the window retained both raw readings but no supported delta. A raw total without start time or starting counter stayed noncomparable. An unexplained counter decrease was rejected. Poll counts without a source were rejected. A quiet window explicitly did not establish a healthy loop or a confirmed repair.
7. **Corrections and history.** Correcting a confirmed device retained the old value in history and original observation snapshots, retained photo provenance and marked dependent tests for review. Reviewing one observation created its own correction history and cleared only that observation's review flag.
8. **Handover and restoration.** A handover could be saved with an outstanding impairment, which remained visible. Recording restoration changed the recorded-impairment status without declaring the system healthy or identifying an electrical cause. Outstanding inspection, review and retest work remained in the handover.
9. **Export/import and independent jobs.** The actual downloaded JSON included the complete job history and explicitly excluded image bytes. Import created a new job identity; the original stayed intact. Missing photo files were disclosed while their text and references were retained. Another job could reuse an address on a different loop without inheriting devices, readings, photos or impairments from the first.
10. **Interrupted photo work.** Reloading while OCR was pending retained the original photo. The resumed screen was not permanently busy. Cancelling and retrying the saved photo retained its identity, did not duplicate it and did not approve new devices. Job selection was disabled during processing; another job's photos stayed unchanged.
11. **Unreadable input and storage failure.** Invalid PNG bytes and a blank image produced honest unreadable-photo states with originals retained. A deliberately injected quota exception during the atomic photo save left the saved job untouched and labelled the in-memory photo unsaved. Retry saved the retained Blob; retrying its OCR did not create a duplicate photo. This was fault injection, not an actual exhausted-device-storage test.
12. **Layout and resume.** Touch viewports at 390 × 844, 820 × 1180 and 1440 × 1000, and a focused form at 390 × 430, had no horizontal body overflow. Reduced motion was enabled. Saved records and an unsubmitted notes draft resumed after reload. A separate fine-pointer desktop context opened the real field route at 1440 × 1000. Phone/tablet screenshots were visually reviewed.
13. **Explicit route preference.** Opening practice, then `#panel-lab/loop-log`, then returning through Home → ordinary Panel Lab and reloading kept the selected Site investigation mode and correct saved job.

## Offline proof

Both final runs waited for the real service worker to report:

```json
{"ready":true,"build":"2c7d00d2cfc5","version":"0.43.0","verification":"sha256-v1"}
```

The actual English OCR resource check also returned ready, covering **10,050,731 bytes** of OCR software/language resources. The complete release manifest contains **1,461 assets / 127,749,431 bytes**, including existing app resources; it is not the incremental size of this feature.

Networking was disabled **before** normal Panel Lab entry, creating field jobs or uploading the previously unseen local PNGs. All field stages above—including actual OCR, original-photo persistence, corrections, imports, cancellation/retry and repeated reloads—then ran offline. No mocked OCR, readiness override, fabricated progress or engine-action injection was used. The isolated fine-pointer desktop smoke used its own online context and is not counted as an additional offline-device result.

## Existing practice regression

The existing `tests/verify-protec-loop-browser.mjs` harness passed **11 checks in each browser on the same final build**. It was adapted to select the explicit Practise option and compare service-worker readiness against the active application version. Asynchronous IndexedDB polling now explicitly awaits browser evaluation; it does not rely on a Promise being interpreted as a polling result. The rerun covered the original mapped/intermittent/incomplete exercises, matrix preservation, restoration, exported log, storage recovery and saved-manual page/hash checks, including opening the actual reviewed PDF at page21 with networking disabled. Results are included alongside the field runs in `browser-results.json`; historical 0.42.0 evidence was not rewritten.

## Reproduction and limits

Serve `public/` on localhost and use an installed compatible Playwright/browser runtime:

```sh
FINDR_FIELD_OFFLINE=1 node tests/verify-loop-field-browser.mjs
FINDR_FIELD_BROWSER=webkit FINDR_FIELD_OFFLINE=1 node tests/verify-loop-field-browser.mjs
```

`PLAYWRIGHT_MODULE`, `FINDR_CHROMIUM`, `FINDR_WEBKIT`, `FINDR_FIELD_URL` and `FINDR_FIELD_OUTPUT` select an available runtime/server/output location. The harness generates its own clearly labelled test PNGs and profiles under the output directory. This run's detailed logs, images and browser profiles remain under `/tmp/findr-loop-field-qa`, outside application source.

No physical iPhone, iPad, Android device, installed mobile PWA, camera capture, real soft keyboard or live alarm panel was tested. Resizing a viewport checks layout, not native keyboard behavior. The high-contrast synthetic photographs do not establish OCR accuracy on glare, blur, oblique camera angles or different firmware layouts. Actual camera orientation/decoder checks are documented separately. Photos still require review and manual correction; no compatibility, real cable route, physical isolation method or repair is inferred from these tests. Original photograph files are deliberately excluded from JSON exports and must be saved separately when moving a job.

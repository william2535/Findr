# Release verification — web 0.27.0

## Scope and data preservation

This release changes the shared PDF reader, adds Quick Questions and optional
local inference, and connects these to the existing diagnostic terminal. It
preserves the `findr-device` v1 database and existing manual/job identifiers.
No stored PDFs, pack usage, emulators, panel schedules or historical visits
are deleted. The signed Android APK remains 0.14.1.

## Confirmed results

- Original iPhone-style error reproduced exactly with the real Advanced
  MxPro4 catalogue PDF in Linux WebKit 26.0. Both the original minified stack
  and official unminified `for await ... readableStream` function are retained.
- Repaired PDF regression: 13 checks in Chromium 154 and 13 in WebKit 26,
  covering text, actual offline-capable English OCR, older saved bytes,
  protected/invalid/unreadable files, runtime stack, cancellation and save retry.
  Those isolated tests use online-served local resources; they do not alone
  establish an installed offline application.
- Actual cached release upgrade in Chromium: seven checks from complete web
  0.26 build `480f4afaee4b` to an immutable 0.27 implementation snapshot
  `61a477861f3a`. The old saved Advanced PDF, job/transcript, history, pack usage
  and database version survived. The previously unprocessed 72-page manual
  processed in 1.36 seconds with browser networking disabled and the test
  server refusing requests. No processing request reached the server.
- Actual local SmolLM2 inference, pinned download, cancellation and chunk
  recovery passed in Chromium. Standalone model inference also ran in WebKit.
  Raw model tests explicitly record incorrect output; source guards reject it.
- Normal Quick Questions menus initially passed 15 checks with actual model
  inference: upload/identification, page viewer, follow-ups, correction,
  reload/history, explicit transfer, scrolling, reduced motion and phone-sized
  layout. Findings from this run improved cover-page filtering, component
  clarification and immutable source selection before the final run.
- Responsive layouts passed both engines at 390×844, 375×844, 390×500,
  768×900 and 1440×900. Reduced viewport height is not a real iOS keyboard test.

See the committed browser JSON files for final normal-menu/offline results
and precise measured timings. No synthetic PDF is represented as manufacturer
instructions. The genuine Advanced PDF test verifies software reading and
identification, not equipment procedures or installed hardware.

## Verification gap

Both WPE and GTK variants of this Linux WebKit package silently discard even
an isolated five-byte Cache Storage entry. Baseline 0.26 cannot complete its
verified offline installation in that environment. Consequently a full
WebKit offline/model-cache or upgrade pass is **not claimed**. The explicit
model download now probes cache persistence before attempting its large
transfer and reports a storage limitation without blaming the PDF. The
separate WebKit PDF/OCR/IndexedDB and direct local-inference results remain
valid. Physical iOS 26.5.2 Safari and installed-PWA validation remain outstanding,
including memory pressure, battery use, keyboard and safe areas.

## Release provenance

Automated regression, final build, archive size and production verification
are recorded below when completed. Deployment uses the existing public Sites
project; publication does not change the audience or create a new APK.

## Final application checks

- Full Node regression suite: **1,279 passed, 0 failed**. After the final
  PDF rendering-error wording adjustment, the affected prompt and exact
  offline-manifest checks passed **29/29**.
- TypeScript `--noEmit`: passed.
- Final normal-menu Chromium acceptance: **17 checks passed**, including
  actual model inference in both menus, network-disabled reload, previously
  unseen PDF processing, context/history/correction, page references and an
  explicit separate Fault Finder transfer. No external requests occurred in
  the offline phase. Fault Finder model explanation left its current check
  and all evidence unchanged.
- Measured final Chromium question wall time: **5.68–15.62 seconds** across
  six replies; the previously unseen camera PDF imported in **340 ms** (panel/PSU timings of 129–146 ms reused cached analysis). A longer Fault Finder
  local explanation took **22.48 seconds**. These are Linux-container
  measurements, not physical-phone performance. The real 72-page Advanced
  PDF took **0.97 s Chromium / 1.15 s WebKit** in the isolated repair check;
  the two-page scanned fixture took **2.49 s / 3.19 s** respectively.
- **Answer-quality limitation:** all six final normal-menu model outputs were
  withheld by source checks; the UI presented clearly labelled, page-linked
  manual extracts instead. A captured exact-engine reply echoed equipment
  metadata, so this was not an identifier-format parsing bug. Smaller bounded
  model experiments sometimes selected a valid source, but do not establish
  general technical reasoning quality. The local model is real, optional and
  fallible; this release does not claim a reliable fluent engineering LLM.

A video review caught future queued transcript lines taking up space and
pushing active typing out of view. Queued lines now collapse visually while
full content remains saved. The short normal-entry recording and focused
animation regression verify this final presentation correction separately.

## Final build

The final app manifest is **ca538710da52**, web **0.27.0**, containing 1,324
verified offline assets / 105,487,031 bytes. The final full regression and
TypeScript checks passed, followed by the production build and deployment
artifact verification. The build contains 1,375 public files and 164,015,747
bytes; its largest static asset is 24,126,768 bytes, below the 25 MiB limit.
The deployment-only cleanup retains APKs 0.14.1 and 0.14.0 and excludes 40
archived release artifacts without deleting their source files.

Final changes after the recorded 17-check shell snapshot are the queued-line
CSS repair, a clearer experimental-model explanation in Local resources, and
a guard requesting a missing external PSU/lock manual instead of interpreting
panel limits for that component. The complete 1,279-test run includes that
guard; the animation fix has its own actual-browser regression. PDF reading,
model inference/cache code and Quick Questions engine match the tested
normal-menu snapshot.

The demonstration is **27.76 seconds**, recorded from the normal Fault Finder
Start path at 390×844 in Chromium. It shows the live typing, upload,
identification, fault/diagnostic exchange and separate Quick Questions entry.
Its PDF and observations are labelled synthetic. It does not claim model
inference in that short clip. The longer offline acceptance recording and
JSON separately establish actual inference.

[Short demonstration](../../public/demos/findr-0.27.0-assistant-demo.mp4).
Publication is verified separately after the reviewable release commit is
pushed and the saved Sites version is deployed.

Additional normal-menu verification before release passed: Quick Questions
selected and downloaded the real Advanced MxPro4 archive PDF through the
existing published relay, verified its catalogue hash and read all 72 pages
while retaining the pending question. A separately unseen scanned PDF was
uploaded during the same Fault Finder job with networking disabled; two pages
went through actual OCR and identity confirmation returned to the same
pending diagnostic question (3.08 s total / 2.41 s OCR). See
`archive-download-ui.json` and `offline-unseen-scanned-pdf.json`.

## Verified publication

Published public Sites version **48**, release commit
`6b8875ccaf0899ad45121677a08842b007715cac`, succeeded on 10 November 2026.
The audience remains public. [Live FINDR](https://findr-fault-finder.floodyyy21.chatgpt.site/app/)
serves web **0.27.0**, build **ca538710da52**. Live reader, engine, version,
manifest and demonstration bytes match the release exactly.

The live browser check passed the actual Quick Questions entry and then
Fault Finder → Start → Use a saved manual → Advanced MxPro4. It read all
72 pages and reached equipment confirmation with no uncaught page errors.
The setup seeds the known real PDF into a fresh browser-local library; it
never accesses an engineer's existing browser storage.

[Live checks](live-browser.json) · [Served asset hashes](live-assets.json) ·
[Deployment provenance](publication.json) ·
[Watch the recording](https://findr-fault-finder.floodyyy21.chatgpt.site/demos/findr-0.27.0-assistant-demo.mp4).
The verification follow-up changes only scripts and research; deployed
application source remains the release commit above. No new APK was built.

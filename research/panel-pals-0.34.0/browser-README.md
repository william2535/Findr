# Panel Pal dialogue browser acceptance

Run date: 11 November 2026. Source preview: `http://127.0.0.1:8094/app/`.

These checks use the normal `#helpers` composer, real locally saved MxPro5 PDFs,
the app's PDF.js/Tesseract processing, IndexedDB and its saved-PDF reader. No
model responses, PDF text, search results or readiness states are mocked.

## Verified UI and manual-search fallback

| Environment | Viewport | Result |
| --- | --- | --- |
| Linux Chromium 154.0.8037.57 | 390 × 844, touch emulation | 8 checks passed |
| Linux Chromium 154.0.8037.57 | 1440 × 1000 | 8 checks passed |
| Linux WPE/WebKit 26.0 | 390 × 844, touch emulation | 8 checks passed |

All three UI runs used the explicitly labelled **Manual search · No AI** fallback.
They are not evidence of local-model inference or general language understanding.
Actual-model measurements and the full offline-model checks are recorded separately below.

The exact screenshot question creates four ordered requests. “What about step
two?” retains that plan. “I meant sounders, not all outputs” changes the target,
retains the other requests and saves the previous plan and original messages.
The reply retains source references and asks about missing equipment details;
it does not record the requested work as performed. The test also verifies:

- Every reviewed task recipe against the real browser-extracted PDF pages.
- Opening a cited saved manufacturer PDF at its requested page.
- Exact dialogue and message restoration after reload.
- Scrolled-back transcript position stays stable when new output arrives.
- Visible new-message typing and stable historical messages.
- Reduced motion, no horizontal overflow, and a composer reachable by scrolling
  in a simulated 480-pixel-high viewport. This is not a physical iPhone keyboard
  test and does not establish automatic keyboard positioning on iOS.
- A new job and a second pal sharing the user-guide PDF keep separate context.

Evidence: `browser-chromium-390-ui.json`, `browser-chromium-1440-ui.json`,
`browser-webkit-390-ui.json`, associated screenshots and the 13.7-second
`browser-chromium-390-ui.webm` recording. The video shows the fallback, not AI.

## Actual documents and processing

- `advanced-0254975c10bd`: Advanced MxPro5 user guide 680-166 rev04,
  SHA-256 `e5a636dd6f10edeb047520368714e04cde7b93bacc9465ab26ec6c30f19c2ce8`,
  43 PDF pages, 1,079,368 bytes.
- `advanced-a18ea5cccf04`: Advanced MxPro5 product manual 680-165 rev05,
  SHA-256 `d185e9c6e06af7108cbe373246e6b4fe7f1d4ad6202d3bc79691b1e16829150b`,
  74 PDF pages, 2,804,250 bytes.

Full downloaded PDFs stay outside the source repository. First processing in
the tested container took 16.8/26.2 seconds in Chromium and 17.6/32.8 seconds in
WebKit for the user/product manuals respectively. Six/five pages used OCR;
operation pages 26, 27 and 30 used selectable text. These are observed times
while other CPU benchmark work was running, not isolated phone benchmarks.
Subsequent Chromium checks reused the saved analysis and search index.

Browser verification caught a real quote mismatch: PDF.js read a menu caption as
`USER - ID`, while PyMuPDF read `USER-ID`. The shared disabling prerequisite was
narrowed to the relevant contiguous `ZONE/INPUTS OUTPUTS GROUPS` wording. The
verification rules were not weakened. All four recipes then passed in Chromium
and WebKit. The earlier failed `browser-chromium-390-manuals.json` retains the
initial import timings and mismatch for diagnosis; it is superseded by the
successful complete UI checks.

## Limits and reproduction

No physical iPhone was available. WebKit CacheStorage in this executor does not
retain written entries, independently of FINDR; therefore these WebKit results
claim online local-PDF processing/UI only, not offline app or model operation.

Run `scripts/verify-panel-pal-dialogue034-browser.mjs` with the real PDFs in
`FINDR_DIALOGUE_PDFS`, a source preview in `FINDR_DIALOGUE_QA_URL` and
`FINDR_DIALOGUE_QA_MODE=ui`. Use `FINDR_DIALOGUE_QA_BROWSER=webkit` and the installed
WebKit runner for that environment. `FINDR_DIALOGUE_QA_MODE=ai` requires the real
current pinned model to be installed in the supplied persistent profile; it
asserts actual inference and does not simulate it. `FINDR_DIALOGUE_QA_OFFLINE=1`
requires a prepared service-worker app and adds a network-disabled cold page
reload, contextual follow-up and a fresh question using actual local inference.
`FINDR_DIALOGUE_QA_PREPARE=1` exercises the explicit optional-model resource UI
with a locally mirrored copy of the pinned GGUF file. Use a profile and temporary
directory on a filesystem with enough free space for the model and cache writes.

## Actual optional model resource workflow

The normal resource UI downloaded all 1,280,835,840 bytes of the pinned
Qwen3.5-2B-Q4_K_M GGUF through 153 real range requests, stored the file and ran
the app's SHA-256 verification. Only the model transport was redirected to a
local copy of the actual pinned file; the downloader, resource coordinator,
cache writer, hardware probe and inference workers were unchanged. This
measures a local byte mirror, not Hugging Face network download performance.

The test stopped the first hardware trial after the outer and nested workers
had both started. Both worker targets disappeared after cancellation, no trial
proof was created, the compact profile remained selected, and the downloaded
bytes were retained. Retrying ran real local inference and selected the
experimental profile only after the hardware test passed. The proof explicitly
records `semanticQualityVerified: false`.

That first successful download-and-cancel sequence took 69.47 seconds; retry
and hardware probe took 20.25 seconds. The screenshot's exact multi-part request
then took 92.24 seconds end to end (91.65 seconds model generation). It produced
four task records with `modelUsed: true`. A step-two follow-up took 0.43 seconds
and the sounder correction 0.54 seconds using saved structured context, without
rerunning inference. These are Linux container measurements, not phone claims.

Evidence: `browser-chromium-390-ai.json` and its optional-resource screenshots.
That run passed model download, cancellation, retry, exact-request inference,
follow-up, correction, citation opening and persistence, then stopped because
a test locator detached during a resize. The final run uses a bounded fresh-DOM
reachability check instead; it does not relax the input/control bounds.

An earlier run exhausted the `/tmp` filesystem, which had only 1.1 GB free for
a 1.281 GB model. The app kept the compact profile, retained partial bytes and
displayed the storage-specific retry/free-space explanation. Evidence is kept
as `browser-chromium-390-ai-storage-failure.json` and its screenshot. The
successful test profile and temporary directory use the larger `/workspace`
filesystem. No old files or profiles were deleted to make the test pass.

## Final cold/offline normal-UI acceptance

`browser-chromium-390-ai-offline.json` passed **12 checks** against web 0.34.0,
precache build `eff26ef1dcee`, with zero page errors and zero failed requests.
The app reported complete `sha256-v1` service-worker verification before the
browser network was disabled. No response, extraction, cache readiness or
model output was mocked. The model transport mirror was not enabled during
this final run; the already verified local model was reused.

| Operation | Observed elapsed time | Model execution |
| --- | ---: | --- |
| Exact multi-part request, cold worker online | 107.35 s | Actual local 2B inference; 12.45 s load, 93.58 s generation |
| “What about step two?” | 0.46 s | Saved structured context and sources; no new inference |
| “I meant sounders, not all outputs” | 0.56 s | Explicit correction of saved plan; no new inference |
| Saved-plan follow-up after cold page reload, network disabled | 0.97 s | Saved structured context and sources |
| Fresh exact request after cold reload, network disabled | 106.40 s | Actual local 2B inference; 12.74 s load, 92.69 s generation |

The recording was enabled for these observed timings. The browser was Chromium
154.0.8037.57 on Linux, reporting five logical processors and 16 GB device
memory, at 390 × 844 with touch emulation. No other benchmark or build was run
while measuring these responses. This is not iPhone validation or a promise of
phone speed. The full screen recording is
`browser-chromium-390-ai-offline.webm`.

The final run also verified the frozen source's manual-search race fix through
the normal resource UI: choosing “Use manual search” while real generation was
active stopped inference, kept the original question, persisted that choice
across reload and retried without duplicate user messages or model re-entry.
Switching explicitly back to the compact profile retained the experimental
model bytes and the saved conversations. The source-page reader, four-task
plan, correction history, scrolling, small-viewport reachability, reduced motion
and separate job/pal state also passed.

This proves the tested request and supported UI/offline path. It does **not**
prove general language understanding: the separate raw model benchmark passed
only three of five small semantic cases. The model remains optional and
experimental; unsupported interpretations must still use clarification and
manual-evidence guards. WPE/WebKit was not used for actual 2B inference or for
these offline claims.

After this complete run, only the resource-card performance wording was updated
to disclose the observed 106–107-second cold UI responses alongside the earlier
33–87-second benchmark range. The final release therefore has a newer precache
hash; the recorded `eff26ef1dcee` run remains the functional acceptance evidence.
No model, retrieval, controller or conversation behavior changed in that copy edit.

# Local manual processing in FINDR 0.25.0

This subsystem reads locally saved or uploaded PDFs. Manual text is reference
data, never application code or diagnostic authority. All identity suggestions
require the engineer to confirm the installed equipment and applicable variant.
An OCR number is not a verified model-specific limit.

## Implementation and resources

- `manual-analysis.mjs` uses the existing PDF.js distribution and IndexedDB
  `findr-device` / `settings` store. No database upgrade or destructive migration
  is performed. The original PDF remains in the existing `files` store.
- PDF.js parses documents in its worker with evaluation and XFA disabled. The
  same-origin font, CMap and image-codec resources are explicitly configured.
  PDF metadata is retained separately from the page-derived identification.
- Pages without sufficiently readable selectable text are rendered one at a
  time, with an image limited to four million pixels and a 2,200-pixel longest
  edge (1,600 on reported devices with at most 2 GB RAM). Rendering yields between
  PDF.js chunks. The canvas and page resources are released after OCR.
- Tesseract.js 6.0.1 and tesseract.js-core 6.1.2 run English LSTM recognition in a
  dedicated worker owned by `manual-analysis-ocr.worker.mjs`. The UI owns that
  outer worker before language initialisation begins, so even startup failures
  and early cancellation can terminate the worker tree. Both SIMD and non-SIMD
  embedded-WASM builds are supplied.
  No legacy recognition engine, CDN fallback or downloaded language model is
  selected at runtime. `tessdata_fast` English is pinned to commit
  `87416418657359cb625c412a48b6e1d6d41c29bd` and its source SHA-256 is recorded in
  `public/app/vendor/ocr/sources.json`. The gzip is deterministic.
- The source bundles and licence notices are under `public/app/vendor/ocr`.
  The 193 processing assets, including existing PDF.js dependencies, total
  14,681,766 bytes. Each is pinned by SHA-256 in
  `manual-analysis-resources.mjs`. The new OCR runtime contributes about 10 MB.
- Identification and indexing run in `manual-analysis.worker.mjs`; pure,
  inspectable extraction rules live in `manual-analysis-core.mjs`. Text is
  passed as data to fixed worker operations. Embedded scripts, prompt-like text
  and PDF actions do not become application instructions.
- No local language model is loaded. Deterministic field parsing, explicit
  diagnostic state and the existing rules are preferable to an unbenchmarked
  generative model for this release. Unknown identity and ambiguous text remain
  visible for engineer correction.

## Persistence, cancellation and offline readiness

Completed analysis uses the key `manual-analysis:<processor-version>:<sha256>`.
It contains each physical PDF page number, extracted text, text/OCR method,
readability assessment, OCR confidence where present, identification evidence,
source hash, processor version, metadata and measured processing times. Reusing
the same content does not repeat OCR. `getManualAnalysis` can request a retained
historical processor version explicitly; new processing never removes older
versioned analysis.

An interrupted import does not create a completed analysis. Cancellation aborts
the active PDF render/parser and terminates the owned OCR worker tree, including
while language resources initialise. Cancellation immediately rejects the UI
operation. Successful
completion commits one IndexedDB value atomically. Storage failures are errors,
not a claim that an offline manual is ready. Unreadable completed documents are
cached as unusable, so a repeated selection explains the problem without
re-running expensive OCR. A clearer copy has a different hash.

Readiness checks browser capability, the active FINDR service worker's verified
offline status and the presence of all pinned processing assets in that exact
build's shell cache. A browser HTTP cache or an unrelated old CacheStorage entry
does not qualify. The existing service worker verifies asset hashes on install
and use. Resource downloads report actual completed assets/bytes; processing
reports actual pages and the OCR worker's current page progress. A failed or
incomplete installation continues to show that setup is required.

## Scope and limits

- English scanned text is supported. Other languages may extract correctly from
  selectable PDFs but are not covered by this English OCR resource pack.
- Sparse drawings, illegible scans and low-confidence pages remain explicit.
  A document with no sufficiently readable page is refused for diagnosis. A
  partly readable document can provide references only from its readable pages;
  missing relevant pages require a clearer copy or another manual.
- The parser's existing 120 MB file cap remains. Processing rejects documents
  above 1,500 pages and asks for the relevant manual/chapter. Actual practical
  capacity depends on browser memory and storage.
- Keyword page retrieval supplies an excerpt and original PDF page, not proof
  of model applicability or approval to perform a test. Every retrieved item is
  marked `referenceOnly`; OCR citations also require source-image review.
- Recognition does not establish which unit is physically installed. Combined
  systems, multiple manufacturer mentions, unknown products and model ranges
  remain suggestions. Variant selection is required for identified ranges.
- This implementation has been exercised in Linux Chromium at an iPhone-sized
  viewport. Physical iPhone Safari, device storage eviction, background-app
  termination and real-world poor-quality scan performance require device
  acceptance; viewport emulation is not a hardware benchmark.

## Validation evidence

`tests/manual-analysis.test.mjs` covers page-linked unconfirmed identities, exact
suffix preservation, family/variant uncertainty, combined systems, unreadable
and low-confidence OCR, page search provenance, inert embedded prompt text,
deterministic analysis, and all 193 bundled resource hashes/file-size limits.

Initial direct-API smoke measurements in Linux Chromium were 389 ms for a
three-page synthetic text manual and 2,166.5 ms for a two-page synthetic scanned
manual; both scanned pages had reported OCR confidence 95. The scans correctly
suggested Texecom / Premier Elite 24 / intruder / panel with source-page evidence.
The deliberately unreadable PDF was rejected and no browser page error occurred.
After adding the explicit OCR owner worker, a fresh two-page scan took 2,630 ms
(2,367 ms OCR; confidence 95 on both pages). Cancelling during the actual
`loading language traineddata` phase rejected in 5 ms, created no analysis entry,
and produced no browser page errors. These are environment measurements, not
guarantees for a phone.

The release's full offline/browser acceptance is recorded separately by
`scripts/verify-diagnostic025-manuals.mjs` and its release evidence. Synthetic
fixtures are explicitly labelled and are never manufacturer-verified sources.

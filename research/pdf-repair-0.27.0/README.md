# PDF reader repair evidence

The reported failure is reproduced with the actual catalogue manual, valid saved Blob bytes and the unchanged PDF.js library. PDF.js 5.6.205's `PDFPageProxy.getTextContent()` performs `for await (const value of readableStream)`. Playwright WebKit 26.0 has `ReadableStream.getReader()` but no `ReadableStream.prototype[Symbol.asyncIterator]`. The first page therefore raises the same `undefined is not a function (near '...t of e...')` TypeError shown on the user's iPhone.

The user reports iOS 26.5.2. This investigation used Linux Playwright WebKit 26.0, **not a physical iPhone or that exact iOS build**. The matching exception, unminified location and feature check establish the failing mechanism in the tested engine; physical iOS verification remains outstanding.

## Reproduction and source evidence

- Catalogue ID: `advanced-76cae27e9ec7`, title `Advanced mxpro4`.
- [Archive PDF](https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/Advanced%20mxpro4.pdf): 2,252,899 bytes, 72 PDF pages, SHA-256 `cc6ac29723cd0a4535e9493e6aac45fe7e676760b52670726779506d2362065e`.
- The saved file round trip was `saveManual(record, Blob)` → IndexedDB `files` → `getFile(id)` → Blob → ArrayBuffer → Uint8Array → PDF.js. The stored bytes begin `%PDF-1.5`. Document opening succeeds; text extraction fails on page 1. The files store contains actual bytes, not metadata.
- Main and worker match the official npm `pdfjs-dist@5.6.205/legacy/build` files byte for byte. Main SHA-256: `0d29c4871eff0b72f3896825f2673ddf7dfbccf815a7095a5d14f5aa68fab0e5`. Worker: `7fc442c268d107d656755252cf38c422a88e825b7f0caaac6a5f58364dff4179`. Neither file was replaced by this repair.
- [PDF.js API source v5.6.205](https://github.com/mozilla/pdf.js/blob/v5.6.205/src/display/api.js): documented `streamTextContent()` returns a ReadableStream; `getTextContent()` consumes it using async iteration. The official unminified legacy bundle identifies the failing `for await` at line 22019.
- [PDF.js FAQ](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions): supported legacy build and API/worker version matching guidance. Both are already the same legacy release here; switching to a legacy bundle would not fix this failure.
- [MDN ReadableStream compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/ReadableStream.json): `getReader` is supported from Safari 10.1; async iteration / `values` from Safari 27. Actual runtime feature detection is preserved with the captured stacks.
- Full original exception and stack: [minified](original-webkit-minified.json), [official unminified](original-webkit-unminified.json). The original v0.26 processor was served in an isolated browser harness, with its normal IndexedDB save/load path and the official version-matched library, avoiding new UI imports against the old module API. Storage succeeds and there are no unrelated page errors in these captures.

This is not evidence of a locked, incomplete or corrupted manual. No stale service worker was involved in the reproduction (service workers were blocked); the API and worker versions were identical. The previous generic catch incorrectly recommended another PDF for a JavaScript runtime failure.

## Implemented repair

`pdf-runtime.mjs` explicitly consumes the public `streamTextContent()` through `getReader().read()`, merges `items`, `styles` and `lang`, releases the reader and cancels on abort. No browser/PDF.js prototype is modified in production. Manual analysis and the app's reader/search share this helper, byte normalization and pinned library/worker configuration.

Blob, ArrayBuffer, offset TypedArray/DataView and a recognised Buffer-shaped legacy value are accepted. Metadata-only or missing values are rejected without rewriting the original files. The database remains `findr-device` version 1 with the same object stores and IDs.

Runtime, PDF/worker resources, version mismatch, password, invalid document, extraction, rendering, OCR, indexing, storage and cancellation have distinct handling. Original exception, cause and full stack are retained with stage, page and runtime capabilities; logs do not intentionally include document text, filenames or job answers. A runtime error no longer recommends unlocking or replacing the PDF.

The real manual also exposed an identification bug: `EN54-2` was mistaken for an exact model and the specification table's PSU mention outranked the panel description. Standards are excluded from model suggestions; bounded opening purpose/declaration pages supply equipment evidence, preserving actual variants and suffixes. The result is an unconfirmed Advanced/fire/panel family suggestion with a variant choice. This does not verify the installed panel, exact firmware or any engineering procedure. Processor `.1` analyses are retained for historical job references; `.2` reindexes existing page text without PDF rereading or OCR.

## Checks and measured environments

The focused Node suite covers reader-only streams, reproducing the old async-iteration failure, exact text-chunk aggregation, cancellation, retained worker exceptions, legacy byte offsets, rejected metadata, distinct errors and source-backed identity variants. It passed **18/18 tests**.

The committed runner `scripts/verify-pdf-runtime027.mjs` passed **13 checks in each browser**. See [WebKit results](webkit-results.json) and [Chromium results](chromium-results.json) for exact durations and environment strings. It exercises:

- Actual saved Blob text-PDF reading; reload and reuse of indexed pages; older typed-array storage.
- Backward-compatible reindexing that retains the old record and page references without re-extraction.
- Two-page image-only PDF with real local Tesseract English OCR.
- Password-protected, malformed and unreadable fixtures; cancellation; failed save followed by safe retry.
- An injected real extraction-stage runtime exception with correct error classification and original stack.
- All 72 pages of the actual Advanced archive PDF, identified as a panel with multiple supported variants.

These are Linux CPU/browser measurements at 390 × 844 CSS pixels, not iPhone performance claims. The runner deliberately blocks service workers to isolate the PDF repair; it does **not** claim airplane-mode readiness or app-update verification. The main release browser tests cover the normal menus and installed offline shell separately.

The tested WebKit package requires a persistent profile for IndexedDB Blob serialization. Nonpersistent Playwright WPE contexts failed even a five-byte Blob; persistent contexts pass. This test-harness issue is recorded here to avoid misidentifying it as an iPhone data corruption defect or making an unnecessary app migration.

Example invocation after starting the existing app/static test server:

```sh
FINDR_PDF_BROWSER=webkit \
FINDR_WEBKIT=/tmp/findr027-webkit-run.sh \
FINDR_PDF_QA_URL=http://127.0.0.1:8097/public/app/ \
FINDR_ADVANCED_PDF=/tmp/findr027-pdf/advanced-mxpro4.pdf \
node scripts/verify-pdf-runtime027.mjs
```

`FINDR_WEBKIT` is optional on machines with a standard working Playwright installation. `FINDR_ADVANCED_PDF` points to a locally downloaded copy whose hash should be verified; omitting it runs synthetic checks only. All synthetic fixtures are labelled and provide no manufacturer-approved test procedures.

## Cached release upgrade and offline processing

The separate `scripts/verify-pdf-upgrade027.mjs` runner passed **7 checks in Chromium 154** using a complete, byte-verified repository v0.26 baseline (`651f26b`, offline build `480f4afaee4b`) and an immutable prepared v0.27 snapshot (`61a477861f3a`, 1,323 assets, 105,474,185 bytes). See [the upgrade record](chromium-upgrade-results.json). This is a development snapshot verification, not a publication claim or an assertion that a later release hash is identical.

It installs the old shell, saves the original Advanced PDF and a v0.26 terminal job/history, proves the old app can reload offline, changes the same-origin server to the new release, verifies the new installed shell, then reloads offline. The exact saved PDF bytes, job, complete transcript, history, pack usage and database version 1 are unchanged. The previously saved, never-processed 72-page Advanced manual is then read entirely offline in **1,361 ms**, with all declared PDF/OCR assets ready. Browser networking is disabled **and** the local test server refuses every request, so background service-worker update checks cannot accidentally satisfy missing dependencies. No requests reached the server during this final PDF processing step. The runner can close and reopen an old tab if the browser leaves an already verified replacement worker waiting for activation; this preserves the stored job.

Recreate the prior app tree with `git archive 651f26b public/app | tar -x -C /tmp/findr026-baseline`, run the normal `prepare-app.py` workflow, then execute `node scripts/verify-pdf-upgrade027.mjs`. The runner freezes the current files and verifies both complete manifests before starting. `FINDR_OLD_APP`, `FINDR_NEW_APP` and `FINDR_ADVANCED_PDF` can point to explicit local snapshots/documents.

**WebKit full-shell/offline verification remains blocked by this Linux test package.** WPE and GTK persistent contexts both resolve `Cache.put(url, new Response('hello'))` without an error but immediately return an empty `Cache.keys()` and no `Cache.match()`. The same five-byte probe fails on a blank HTML page with no FINDR code, and after reload. Consequently even the unchanged v0.26 worker downloads all 1,298 assets but sees an empty cache and correctly refuses to claim offline readiness. This is separate from the reproduced PDF.js async-iteration defect and from the nonpersistent IndexedDB Blob limitation. The app was not changed to bypass integrity/readiness checks. Evidence: [WPE probe](webkit-cache-probe.log), [GTK probe](webkit-gtk-cache-probe.log), [installation trace](webkit-cache-install.log), [blocked upgrade result](webkit-upgrade-blocked.json). Standalone WebKit PDF/text/OCR and persistent IndexedDB checks pass; full offline operation on physical Safari/iPhone/PWA still needs verification.

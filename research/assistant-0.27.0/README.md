# FINDR web 0.27 — PDF repair and two local assistant modes

## What changed

The normal navigation now separates **Fault Finder** from **Quick Questions**.
Both retain the continuous animated terminal, complete stored messages,
reduced motion, tap-to-reveal, manual selection sheets, source viewer and
viewport-aware input. Question histories use their own `quick-questions-v1`
settings record. Existing `session`, `history`, PDF metadata and bytes are
untouched by question saves. An intentional, repeat-safe transfer creates a
separate Fault Finder job and carries confirmed equipment/manuals plus
unverified contextual observations.

Quick Questions can begin before a manual is chosen. It searches saved PDFs
first and the existing Manual Archives catalogue, asks for equipment and
applicable variant/firmware when required, and resumes the question after
manual upload/identification. Manuals use the same local processor as Fault
Finder. Page text and a version/hash-bound search index are saved; indexing
uses a module worker where supported. Trade aliases, bounded spelling
matching and conversation context support retrieval. Model codes and part
numbers are never fuzzy identity evidence.

The optional shared local runtime uses SmolLM2 360M Instruct int8 on one WASM
CPU thread. The model runs in a worker and can be cancelled. Quick Questions
asks it to select relevant source sentences, then independently checks exact
quotations against successfully read pages. Unsupported wording is withheld.
The resulting **documented excerpts still require review**: provenance does
not establish semantic completeness, installed configuration, compatibility
or permission to perform a procedure. Diagrams are not interpreted by a
vision model. OCR source pages are marked for visual checking.

Fault Finder uses the same runtime for contextual source explanations and
interpretation of ambiguous natural replies. A proposed Yes/No/Blocked answer
requires explicit confirmation before the structured diagnostic engine can
record it. A model never supplies numerical limits, completes an unperformed
test, overrides prerequisites or confirms a cause. Complete raw replies and
model/validation metadata are retained; ordinary measurements and quick
answers retain the fast deterministic path. The existing safety, impairment,
restoration and handover rules remain active.

## Confirmed PDF repair

The real catalogue Advanced MxPro4 manual opens successfully before the
baseline fails in text extraction. Official legacy PDF.js 5.6.205 uses
`for await (const value of readableStream)` inside `getTextContent()`;
the tested WebKit runtime lacks `ReadableStream[Symbol.asyncIterator]`.
The full original minified/unminified stacks and official documentation are
in [the PDF repair evidence](../pdf-repair-0.27.0/README.md).

`pdf-runtime.mjs` uses the documented `streamTextContent().getReader()` API
and releases/cancels readers properly. Uploads, saved-PDF analysis, the viewer
and in-PDF search share byte normalization, library/worker configuration and
resource URLs. No vendor or browser prototype patch is applied. Old Blob,
ArrayBuffer, typed-view and known Buffer records remain readable. Main/worker
versions are checked and content-hashed service-worker installation retains
an older complete release until the replacement is verified.

Errors retain stage/code/original stack without document text. Runtime,
resource, storage, cancellation, password, invalid-PDF, extraction and OCR
failures have distinct recovery. The unrelated identity bug that treated
EN54-2 as a model and a specification's PSU as the panel type is also fixed.
Old extracted text is reindexed when needed, preserving historical analysis
and source revisions without repeating OCR.

## Offline resources and limitations

The offline shell includes the PDF reader/worker/fonts/rendering resources,
English OCR and the 22.56 MB local inference runtime. The 366,642,692-byte
model pack is a separate explicit download, hash-pinned and stored in
resumable 8 MiB chunks. It is not in the website hosting bundle. The model
loads only for an inference request, never merely to check readiness.

**Local resources** shows app, PDF, OCR and model readiness separately;
a saved-PDF count is not processing readiness. Cancelled downloads preserve
verified chunks. Missing resources, quota errors and unsupported capabilities
remain visible. Saved manuals/conversations and labelled manual-extract or
guided-rule modes remain available without model inference. No online reply
service is silently enabled.

The small model is not a reliable autonomous technical reasoner. Actual tests
produced invented menu controls when unguarded; the app withholds those claims.
Context is deliberately bounded to 768 tokens for tested WebKit performance;
large questions may require focusing on one part. No physical iPhone,
installed iOS PWA, peak-memory or battery benchmark was available. The user's
iOS version is 26.5.2; Linux WebKit 26.0 is a reproduction environment, not
proof of real-iPhone resource limits or keyboard behavior.

## Evidence and reproducible checks

- [PDF regression and upgrade evidence](../pdf-repair-0.27.0/README.md)
- [Model measurements and download recovery](../local-language-0.27.0/README.md)
- [Browser environments](browser-environment.md)
- [Responsive layout checks](layout-checks.md)
- `scripts/verify-pdf-runtime027.mjs`
- `scripts/verify-pdf-upgrade027.mjs`
- `scripts/verify-questions027-browser.mjs`
- `scripts/verify-local-language027-browser.mjs`

The fixture manuals are explicitly synthetic. The PDF root-cause regression
additionally uses the real, catalogue-hash-verified Advanced MxPro4 document.
Final regression/build/menu/offline results and deployment provenance are
recorded in `release-verification.md`; a successful build is distinct from
publication and does not produce a new signed APK.

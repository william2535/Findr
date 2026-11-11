# FINDR 0.27 browser acceptance results

Executed on 10 November 2026 against the real local application. No language
model response was mocked. See [browser-environment.md](browser-environment.md)
for browser setup and fixture scope.

| Run | Result |
| --- | --- |
| Chromium 154.0.8037.57, 390×844, real model, then network disabled | 17 normal-menu checks passed |
| WebKit 26.0 build 2227, persistent Linux WPE, 390×844, labelled reference mode | 14 normal-menu checks passed |
| Chromium 154.0.8037.57, 1440×844, labelled reference mode | 13 normal-menu checks passed |
| Real saved Advanced mxpro4, normal Fault Finder Start → Use a saved manual | Chromium and WebKit passed; 72 pages read and original Blob preserved |
| Quick Questions exact-model question → catalogue download → PDF identification | Passed with real bytes from the published FINDR manual endpoint, hash verified; pending question retained |
| Chromium after browser closure/reopening with network disabled | App, PDF/OCR and model resources ready; question histories and Fault Finder model interaction retained |
| Unseen scanned PDF added through Fault Finder while offline | Two pages actually OCR-processed; equipment identified; original job and diagnostic question resumed |

The 17-check run used shell build `5a96340855af`, version 0.27.0. The subsequent
queued-animation CSS correction was checked separately and is present in the
final recording. PDF parser, model and conversation code were unchanged by that
visual correction.

The normal-menu checks cover separate histories, animated new output, a question
before equipment selection, native picker cancellation, PDF upload and equipment
confirmation, actual local inference, working saved-PDF page references,
contextual follow-ups, adding a PSU manual, question correction with retained
history, scrollback, reduced motion, multiline input, keyboard-like viewport
resizing and intentional transfer into a separate Fault Finder job. The offline
run also processed a previously unseen camera PDF after network access was
disabled. A subsequent Fault Finder language reply ran from the same installed
model without completing the outstanding diagnostic check or changing its
structured evidence. No external request was observed during that offline path.

The previously saved Advanced record uses the unchanged IndexedDB version-1
record/Blob layout. Its verified catalogue SHA-256 is
`cc6ac29723cd0a4535e9493e6aac45fe7e676760b52670726779506d2362065e`.
Its normal saved-manual UI read took 1.46 seconds in WebKit. The manual covers
several models; FINDR requests confirmation rather than inventing an installed
variant. The separate PDF regression evidence includes the original exception,
OCR, malformed/protected/unreadable files and old analysis records.

## Measured inference and an important quality limit

The complete Chromium run generated six Quick Questions replies using the
pinned SmolLM2 360M int8 model. **All six generated outputs failed source
validation and were withheld.** The UI presented explicitly labelled relevant
manual extracts with page references. These are successful evidence-preserving
fallbacks, not six successful model-authored answers.

An exact replay of the first request returned
`Equipment: Test Bench FINDR-QA-100 not established`, rather than a source ID.
The full synthetic request, raw actual response and validation result are in
[actual-model-response.json](actual-model-response.json). This is not an ID
punctuation parsing defect. Local inference is implemented and verified;
general contextual answer quality remains limited on this small model.

| Measured operation | Wall time |
| --- | --- |
| First Quick Questions reply, including cold model load | 15.62 s |
| Contextual menu follow-up | 8.40 s |
| PSU specification reply after reload | 9.19 s |
| Corrected question | 6.03 s |
| Offline reply after reopening | 10.01 s |
| Previously unseen local camera PDF while offline | 0.34 s |
| Previously unseen two-page scanned PDF, offline UI import and confirmation | 3.08 s (2.41 s OCR) |
| Reply using that newly processed PDF | 5.68 s |
| Fault Finder local explanation, 96 output tokens | 22.48 s |

The earlier panel and PSU imports in this run reused saved analyses and must not
be represented as fresh parsing benchmarks. These timings are from the Linux
container, not an iPhone. The model download and verification benchmark is
documented separately under `research/local-language-0.27.0`.

## WebKit limitation and remaining verification gaps

The official Linux WPE and GTK builds in this environment both return an empty
Cache Storage immediately after a successful `cache.put`, even for five bytes
on a blank page. A downloaded model configuration chunk therefore disappears
before verification. The same issue prevents verified service-worker readiness.
It is independently reproduced in [webkit-cache-probe.json](webkit-cache-probe.json).
The app now reports storage failure before attempting the large model download.

WebKit PDF reading, OCR, saved-manual selection and reference-mode conversations
were verified. The earlier standalone WebKit model benchmark used directly
served model files. **The final cached model and complete offline app were not
verified on WebKit.** Physical iPhone/iOS 26.5.2 and installed-PWA testing, real
phone keyboard behaviour and memory pressure remain unverified. The 390×500
check simulates a reduced viewport; it is not a physical keyboard test.

The archive browser check forwards the local `/api/manual` request to the
existing published FINDR endpoint using the configured environment proxy. It
returned the real 2,252,899-byte Advanced PDF; FINDR checked its catalogue hash,
saved it and resumed equipment identification in 1.78 seconds. The ordinary
Playwright API request bypassed that proxy and was refused, so the explicit
forwarder used `curl` and passed the real response bytes to the local UI. No PDF
fixture response was substituted. See [archive-download-ui.json](archive-download-ui.json).

The complete two-product compatibility conversation has focused automated rule
coverage but was not run end to end in the browser. No compatibility conclusion
is inferred from a shared protocol name.

## Recording

[terminal-demo.mp4](terminal-demo.mp4) is a 28-second recording of the real
390×844 Chromium UI: animated introduction → Start → PDF selection → confirmed
equipment → fault description → diagnostic exchange → separate Quick Questions
entry. The PDF and observations are clearly synthetic. It demonstrates the
terminal interaction, not offline readiness or model answer quality; its
recording context deliberately blocks service-worker installation.

The public copy is `public/demos/findr-0.27.0-assistant-demo.mp4`, outside the
offline app precache. Its presence in the working tree does not establish that
the website has been published.

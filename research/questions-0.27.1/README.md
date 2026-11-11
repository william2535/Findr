# Quick Questions saved-manual selection — web 0.27.1

Quick Questions now asks the engineer to choose a saved manual after each new standalone question. It does not infer or automatically choose a document, even with one saved match. The exact pending question survives selection, processing, equipment confirmation, navigation and reload. An empty library offers local upload or Manual Archives. Contextual follow-ups reuse the explicitly confirmed source. A new question or “change equipment” reopens the library.

Selecting a previously attached manual updates the active equipment and source scope without duplicating attachments. Corrections retain the original entry and its confirmed manual. The header shows the currently selected equipment. Saved-manual choice and existing histories use the unchanged local database and processing pipeline; no migration or model change is needed.

## Verification

- Focused engine suite: 34 passed, including selection guards, no automatic choice, saved pending questions, context/corrections and source switching.
- Complete regression suite: 1,284 passed, zero failures. The first run caught an outdated generated offline hash after the final engine edit; regenerating the manifest resolved it.
- TypeScript check passed.
- Chromium 154 on Linux, desktop 1280×844 and phone-sized 390×844: normal-menu saved PDF selection, confirmation, page-backed manual extracts, follow-ups, reload, navigation, reselecting a previous manual and offline source switching passed.
- Linux WebKit 26, 390×844: the same online selection flow passed. Reduced motion and a shortened 390×500 viewport were checked. These are browser layout checks, not physical iPhone/keyboard tests.
- This focused change uses the explicitly labelled manual-extract fallback during browser verification. Model inference and PDF/OCR implementations are unchanged; their prior measurements and limitations remain in the 0.27.0 report.

The Linux WebKit offline reselection probe hit a `NotReadableError` while reading an IndexedDB Blob. The failure is retained in `webkit-offline-reselection-gap.json`; this release does not claim that probe passed or establish physical iOS offline compatibility. Chromium offline reselection passed. No PDF-reader changes were made for this selection-flow update.

Browser JSON and screenshots in this directory record the exact runs. The fixtures are explicitly synthetic and do not establish real equipment procedures. No new signed APK was built.

## Final build

Web **0.27.1**, offline build **2ef389844dfa**. The production build and deployment artifact verification passed: 1,376 public files / 164,138,074 bytes; largest static asset 24,126,768 bytes (below 25 MiB). The final focused regression passed 47/47 after the controller's library-refresh and compact-picker changes. Final Chromium portrait acceptance passed 11 checks; the existing broader conversation test passed 14. The app keeps its original public Sites project and signed APK 0.14.1. Publication is verified separately after deployment.

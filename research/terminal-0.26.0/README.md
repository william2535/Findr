# FINDR 0.26.0 — one continuous diagnostic terminal

This correction builds on web 0.25.0 (`928a0dcadb9808f9835c7c6e8bbdab0d929c438a`). It replaces the separate intro/question-card experience with one saved terminal conversation through the normal **Fault Finder → Start** entry. The signed Android APK remains **0.14.1**. Build and browser verification are recorded below. Publication is a separate delivery step verified after committing this source.

## What changed

- `FINDR > let’s find that shit.` and `Ready? Type START.` belong to the same transcript as manual selection, equipment confirmation, fault descriptions, tests, corrections and the final handover. START and its tappable shortcut continue that job. Skip intro reaches its manual-selection question; reopening a saved job retains complete message content without replaying the introduction.
- New FINDR output visibly types with a cursor. Existing entries remain stable. Tap/reveal, a Skip typing control and reduced-motion support reveal text immediately. The saved text and diagnostic state are independent of the visual animation.
- The current multiline prompt remains below the transcript. Enter sends; Shift+Enter adds a line. Numbered text options accept their number, label or supported equivalent. Commands are case-insensitive whole commands: START, HELP, MANUALS, LOG, BACK, GIVE UP and FAULT FOUND. Ordinary sentences containing those words remain ordinary input.
- Saved-manual selection, archive results, uploads and compact measurement/calculator helpers return to the same conversation. A usable manual remains compulsory before diagnostic checks. Processing displays real work/progress and retains its existing local text/OCR cache.
- Errors distinguish resource-download cancellation, file-selection cancellation, interrupted manual processing, missing resources, unreadable PDFs, OCR failures, missing saved PDFs and storage failures. Recovery keeps the job and its previous usable manuals.
- Give up and Fault found remain beside the prompt and run conversational completion questions. Cause confirmation, work/retests and restoration remain separate. The engineer can review/copy the handover, view the full log, export a structured record and resume a paused visit.
- Changes saved through the existing detailed safety/restoration editor are mirrored into the terminal: tests, exact readings, changed conditions/assets, impairments and handover fields. Repeated or UI-only saves do not duplicate them. This adapter records the actual changes; it does not turn them into answers or grant test permissions.

## Diagnostic and manual boundaries

The conversation delegates to the existing diagnostic engine, memory bank, source records and saved visit model. It does not replace the engine with scripted display text. Clarification preserves measurements' actual points, references, units, conditions and source. Corrections retain originals, reassess dependent findings and invalidate superseded reading comparisons. “No idea” stays unknown rather than becoming a No answer.

The new numerical comparison is deliberately narrow: the real **Elmdene 2405ST PAK200789_04A APR 2026** manual was retrieved from the manufacturer, hashed and visually reviewed. With its exact attached PDF, confirmed installed model and matching test conditions, recorded DC output voltage can be compared with the documented mains/full-load or battery/full-load operating envelope. “24.1 V at the PSU output with the load connected” alone does not establish those conditions. The tighter nominal 24 V ±3% at 25°C is not silently substituted for the operating envelope. See [source review and limitations](elmdene-reading-source-review.md).

Other model-specific limits remain unverified unless already supported by an applicable reviewed rule. Unseen PDF/OCR text does not generate executable procedures or arbitrary numeric limits. The existing thirteen draft operational profiles remain disabled. A reading within a range is an observation, not evidence that the whole system is healthy or that the cause is confirmed. Existing prerequisites, physical-topology requirements, emergency handling and restoration records still apply.

English PDF/OCR resources, the existing analysis cache and deterministic diagnostic rules remain local. No local language model, remote inference or newly invented manufacturer parser is introduced. Archive/manual downloads require connectivity; the supported installed-resource workflow uses saved files and local processing.

## Reproduce the interaction

Open **Fault Finder** and press **Start**, or type `START`. Choose `[3] Upload a PDF`, confirm the suggested equipment or change it, then identify the component being investigated. Describe the actual fault in a full sentence. Enter `12 volts` to exercise targeted clarification, or use **+ Reading** for a compact measurement helper. Use `MANUALS` to add a component manual without losing the pending question, and `BACK` to append a correction. Finish with `GIVE UP` or `FAULT FOUND` and review the handover before exporting.

The browser automation uses clearly labelled synthetic manuals in `tests/fixtures/diagnostic025`; those fixtures are not manufacturer procedures. The demonstration records the actual app and visible typing. It uses synthetic manual content and simulated fault observations.

## Verification record

Focused checks completed during implementation:

| Check | Result |
|---|---|
| `tests/terminal-reading-evidence.test.mjs` | 8 passed: exact source/model/scope, missing conditions, zero/OL/unknown, mains/battery separation, correction and historical source snapshots |
| `tests/terminal-evidence-sync.test.mjs` | 7 passed: external-editor evidence, conditions/restoration, retries, stale chat protection and legacy preservation |
| `tests/terminal-controller.test.mjs` | 4 passed: trusted-gesture picker timing, full saved message content, correct interrupted-resource recovery and cross-job operation isolation |
| New/existing controller and external-editor sync combined | 15 passed at the focused verification point |
| Full regression suite | **1,187 passed, 0 failed, 0 skipped** (`node --test --test-isolation=none tests/*.test.mjs`) |
| Final engine-version / offline-manifest checks | **60 passed** after regenerating the final cache manifest; engine revision `2026-11-10.2` |
| Type check and production build | **Passed**: `tsc --noEmit`, `node scripts/run-framework.mjs build`, and `verify-public-build.mjs` |
| Desktop / phone browser workflow | **Passed** at 1440×844 and 390×844, including actual Start, command/option equivalence, readings/corrections, both endings, JSON export, reload, scrollback and reduced motion; 390×500 keyboard-height simulation also passed |
| Offline workflow | **Passed** with network blocked before importing previously unseen text/scanned PDFs, then adding a second manual, opening a saved PDF, corrections, outcomes, export and reload. Final cache `480f4afaee4b`: 1,298 assets / 82,711,538 bytes, zero missing processing resources |
| Error / selection recovery | **Passed**: 8 recovery cases plus initial-save retry, inline archive-download bridge and saved-manual reselection; synthetic archive payloads are labelled |
| Measured import / response | Linux x86_64 Chromium 154: synthetic text PDF **0.27–0.36 s**; scanned PDF **2.66–3.16 s**; fault submission to saved next question **40–84 ms**. These are small-fixture environment measurements, excluding deliberate visual typing |
| Screen recording and reviewed screenshots | **Reviewed** actual 40.24-second browser recording, 390×844 H.264, 465,363 bytes. [Watch the demonstration](../../public/demos/findr-0.26.0-terminal-demo.mp4); reviewed intro/identity/question frames and screenshots are in `qa/` |
| Website publication | **Verified live**: Sites version 47, source `86ce11c2ae363df2c2ae0412fa5bd9f66a03f954`, app 0.26.0 and final cache hash. Live 390px journey passed through scanned import, corrections, both endings and exports. Recording bytes/type/hash matched the reviewed MP4 |
| Newly signed/published APK | Not performed; existing APK remains 0.14.1 |

Reproducible browser scripts are `scripts/verify-terminal026-browser.mjs` and `scripts/record-terminal026-demo.mjs`. See [browser verification](qa/verification.md) and its machine-readable results for exact environments, fixtures, timings and checks. Chromium portrait or reduced-height simulation is not a physical iPhone/Safari test. Browser network-disabled testing is not a claim of physical airplane-mode device testing.

## Established release workflow

The repository's root README requires regenerating app assets with `python scripts/prepare-app.py` after final app changes, then running `node --test --test-isolation=none tests/*.test.mjs` and the applicable build checks. The preparation step regenerates the offline manifest/hash and release/share assets from `public/app/version.mjs`; new terminal modules must be included in that generated app shell.

Use the existing Sites build/source-sync/publication process associated with `.openai/hosting.json`. A successful local production build is not a published revision. Record an actual successful deployment and verify its served version before claiming website publication. No Android build or signing follows automatically from the web release. Existing catalogue IDs, PDF bytes, local database identities, packs, emulators and saved visits must remain preserved.

## Build artifact checks

The web output contains 1,347 public files and 140,475,460 bytes of build output. The existing deployment-only exclusions retain the two supported APK versions and omit 40 archived release artifacts plus the native-only download index from the deployed bundle; source artifacts are retained. Every included static asset is below the 25 MiB host limit. The demonstration video is outside the app shell and is not added to the offline resource download.

Remaining compatibility work: physical iPhone/Safari keyboards, storage-pressure behaviour and real-device airplane-mode validation. English OCR and readable/manual-specific reference coverage remain the supported scope; arbitrary unseen manuals do not create verified electrical procedures.

Published URL: https://findr-fault-finder.floodyyy21.chatgpt.site/app/#faults

[Live recording](https://findr-fault-finder.floodyyy21.chatgpt.site/demos/findr-0.26.0-terminal-demo.mp4) · [Live workflow evidence](qa/live-browser.json) · [Live version and video verification](qa/live-assets.json). Live synthetic scanned import measured 3.75 s and fault submission to the saved next question 48 ms in Linux Chromium. The follow-up verification commit changes tests/research only; the deployed application source remains the release commit above.

# Terminal conversation verification — 0.26.0

Verified on 10 November 2026 with Linux Chromium 154.0.8037.57. Desktop viewport: 1440×844. Phone portrait viewport: 390×844; a 390×500 viewport simulates the space left by an open keyboard. These are browser dimensions, not physical iPhone/Safari tests.

## Actual entry and continuous workflow

`scripts/verify-terminal026-browser.mjs` enters through `/app/#faults` and uses the real Start shortcut (phone) or typed START (desktop). It passed both online and after network access was disabled. Assertions cover:

- Real incremental opening text, cursor and tap-to-reveal; all assistant output keeps immutable full saved content. Start retains the same saved job and transcript.
- Typed numbers / upload wording, native file-picker event and cancellation; uploaded file, identification, confirmation and selections appear in the saved transcript.
- Local text PDF and image-only PDF/OCR; identified model and category confirmed inside the conversation; exact fault text chooses the existing diagnostic route and a question with a source-page reference.
- Opening the saved source PDF, Yes/No/unknown answers, ambiguous “12 volts” clarification (point, reference, condition, connection and source), and recorded evidence.
- BACK corrections retain original answers/readings; another manual preserves the job and pending diagnostic step.
- Scrollback stays put while output is added; Latest message follows output; reduced motion completes new messages immediately; composer and outcome controls fit the shorter viewport.
- Reload preserves transcript, evidence and step without replaying the intro. LOG does not consume a diagnostic question.
- GIVE UP asks handover questions in the transcript and saves a paused job; resume returns to the same pending question. FAULT FOUND asks for cause evidence, work and retest/restoration separately and supports a confirmed cause awaiting parts.
- Reviewed JSON export equals the downloaded record, with manuals, complete transcript and corrected evidence.

See `online-browser.json` and `offline-browser.json`. The latter completed both widths. A further full phone run used the final frozen cache **480f4afaee4b**, verified readiness true with **zero missing resources**, then disabled the network before importing a previously unseen scanned manual. See `final-offline-build.json`. Saved PDF rendering, an additional manual, corrections, both endings, export and reload all passed with network access blocked.

The browser automation runtime does not await async predicates passed to `waitForFunction`. The new scripts therefore explicitly await `page.evaluate` in their polling helper; success is based on persisted state, not a truthy Promise.

## Recovery and manual selection

`scripts/verify-terminal026-recovery.mjs` passed eight scenarios: Skip intro; cancelled resource preparation with resource-specific retry guidance; malformed PDF; deliberately failed OCR worker; unreadable scanned page; cancelled PDF processing with no partial attachment; storage-quota failure plus successful retry without losing the last saved state; and migration of a 0.25 chat without terminal metadata or intro replay. Failure injection is labelled synthetic. File-picker cancellation is dispatched using the browser cancel event; no OS-dialog automation is claimed.

`scripts/verify-terminal026-selection.mjs` passed first-save failure/retry, inline Manual Archives selection through the existing download/store/process bridge, and saved-manual reselection without a second download or duplicate attachment. The archive endpoint was fulfilled with a labelled synthetic PDF. This verifies the application bridge, not a live external manufacturer's host. See `manual-selection.json`.

`tests/manual-processing-errors.test.mjs` and `tests/manual-analysis.test.mjs`: **12 passed**. Direct browser fault injection also confirmed OCR_FAILED and operation-specific AbortError wording; see `processor-errors.json`.

## Measurements

The fixtures are the existing, clearly labelled `tests/fixtures/diagnostic025` PDFs. Their equipment names exercise identification; their invented text is not manufacturer diagnostic guidance.

| Scenario | Text import | Image-only import | Fault submission to saved next prompt |
| --- | ---: | ---: | ---: |
| Online, 1440 / 390px | 269ms | 2910ms | 51 / 71ms |
| Offline, 1440 / 390px | 362ms | 3162ms | 84 / 81ms |
| Final cache, offline 390px rerun | — | 2655ms | 40ms |

Import timings include local processing and job attachment; response timings stop when the next prompt is saved, independently of its visual typing duration. These are observations in this environment, not device-wide performance claims.

## Recording and scope

The actual browser recording is `/workspace/findr-0.26.0-terminal-demo.mp4`: H.264, 390×844, 40.24 seconds, 465363 bytes. `scripts/record-terminal026-demo.mjs` records Start → upload → manual identification → confirmation → component → fault → diagnostic question. It records genuine DOM typing and input; it does not reconstruct a video from screenshots. Extracted frames at 0.6 and 1.2 seconds verify partial opening text/cursor and subsequent text growth. The demo blocks service workers for reproducibility; offline readiness was tested separately above.

Remaining compatibility work: physical iPhone/Safari, the native iOS keyboard and file picker, Android WebView, browser eviction under real low-storage conditions, and performance on older phones. No live manufacturer archive download or newly published website is established by these local tests. Publication and release build checks are recorded separately by the release workflow.

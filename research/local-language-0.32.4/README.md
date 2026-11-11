# Local AI startup and recovery verification

Date: 2026-11-11. Web runtime repair: 0.32.3. Launcher feedback follow-up: 0.32.4. Explicit activation follow-up: 0.32.5. Native activation grace: 0.32.6.

## Report and implementation

The supplied iPhone recording showed a page reload immediately after the model-loading activity message. It did not establish an out-of-memory termination. The previous app retained the question but lost runtime failure state on reload, allowing repeated attempts at the same heavy startup.

The CPU worker now selects the non-JSEP .mjs/.wasm pair from onnxruntime-web 1.22.0-dev.20250409-89f8206ba4, the exact engine embedded by the existing Transformers.js 3.8.1 bundle. The package's JSEP files matched the prior bundled hashes byte-for-byte. All new vendor hashes and the deployed CPU WASM bytes were checked. The pinned 366,642,692-byte model pack and cache identities are unchanged.

Cached parts stream into the loader without per-part arrayBuffer reconstruction. The loader still holds a whole model buffer during the ORT WASM copy; this repair does not eliminate the substantial initialization memory requirement. Reviewed procedures bypass model allocation only after existing source-hash, page-text, equipment-scope and variant checks. They remain clearly labelled manual search, with complete citations and precautions. Other eligible requests use the actual local model for scoped source selection.

The recovery checkpoint is written and read back before starting the worker. It contains model identity, attempt identity, phase and timestamps, never questions or manual contents. A fresh app instance finding an unfinished attempt pauses inference. A manual-only retry cannot start the model even if readiness changes during submission. An explicit enable action clears the guard without submitting a question. Checkpoints are tab-scoped, so another open tab's active worker is not misclassified as a crash.

## Actual browser observations

In the existing Chrome profile on the public site:

- The update retained the existing Original Twinflex V3 helper, saved PDF, fault-log job and complete shared model pack. No model redownload was performed.
- A power-indicator question with no sufficiently relevant selected passage returned an explicit manual-search “not established” result.
- A separate fault-investigation question loaded the real pinned model from saved files. The reply asked for the exact fault message and displayed the real model's on-device provenance. It did not invent a technical diagnosis or cite unrelated evidence. No model runtime error appeared in the captured app logs.
- Reloading restored the saved user questions and completed AI reply, with no false interruption guard after success.
- A subsequent model attempt was deliberately interrupted through a normal page reload while “Reading verified local model files…” was visible. Reopening restored its question and displayed AI unavailable, the interrupted-loading explanation, Search saved manuals and Enable local AI retry. This was an intentional reload test, not a reproduced OS memory termination.
- Search saved manuals returned a clearly labelled manual-only response without restarting inference. Enable local AI retry then restored the available state while leaving the conversation unchanged and starting no new answer. The follow-up release refreshes shared readiness labels after these state changes as well.
- The first release-page update reached a rounded 100% and hit the old fixed deadline; the update later activated and the app loaded 0.32.3. The model and PDF remained stored. This observation led to the 0.32.4 progress-aware deadline and explicit finishing/activation phases.
- The final 0.32.4 launcher check exposed a more specific state: all 1,345 assets saved, the new worker installed/waiting, and the older worker still active. Its single install-time activation request had not resulted in activation in this browser. Version 0.32.5 adds an explicit, version-bound activation request from the launcher, requiring a verified cache before acceptance and retaining the separate active-worker verification before navigation. The observation does not establish why the browser left the earlier request waiting.
- The subsequent live check reached the native activation wait but exceeded the 20-second acknowledgement deadline. Chromium's implementation can retain the skipWaiting callback while the previous worker finishes ongoing work, with a five-minute fallback. The particular request keeping that worker occupied was not identified. Version 0.32.6 reports a separate verified_waiting phase before awaiting native activation, with a one-time six-minute grace inside the overall ten-minute deadline. This preserves exact active-version verification instead of treating a delayed activation as success.

## Software checks and limits

The final focused run for 0.32.6 passed 256 tests with no failures or skips, including 37 launcher checks and 26 service-worker checks. These exercise the exact upgrade ordering with an older active worker, an older waiting worker and a new installation; activation acknowledgement cannot replace active-version verification. The additional cases prove the five-minute native wait can complete, the grace cannot be extended by duplicate or late progress, the six-minute and overall deadlines remain finite, and final activation rejection is retained.

The focused suite covers source/variant/edition checks, helper and fault-log persistence, scoped indexes, download interruption/integrity, cache-stream cancellation/backpressure, startup checkpoints across fresh instances, explicit recovery, caught errors, late messages and context-limit worker reuse. Launcher tests cover progress renewal, malformed/duplicate/superseded progress, worker-state changes, the overall deadline and exact readiness gating. Runtime hashes and offline asset hashes are checked separately from generated answers.

No physical iPhone was available for execution. No new network-disabled or airplane-mode inference run was performed in this verification. Chrome startup success does not establish reliable performance on the user's particular iPhone. The upstream non-JSEP workaround supports the compatibility change, but the user's exact reload cause remains unproven. Model output quality remains limited; saved-manual evidence checks and honest manual-search fallback stay necessary.

References: [vendored runtime provenance](../../public/app/vendor/local-language/provenance.json), [runtime documentation](../../public/app/vendor/local-language/README.md), [upstream Safari/iOS investigation](https://github.com/huggingface/transformers.js/issues/1242), [Chromium native activation grace](https://chromium.googlesource.com/chromium/src/+/HEAD/content/browser/service_worker/service_worker_registration.cc).

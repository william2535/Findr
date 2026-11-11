# FINDR local language runtime verification — 2026-11-10

The implementation performs real inference locally in a module worker with Transformers.js 3.8.1 and its matching ONNX Runtime Web distribution. It runs **SmolLM2 360M Instruct int8** on one WASM CPU thread. WebGPU and cross-origin isolation are not required. Downloading model files is explicit; prompts, manual passages and generated replies are not sent to a remote inference service.

## Selection and limits

The smaller 135M int8 model was tested first. On a labelled synthetic event-log passage, it invented an “Event Log icon in the toolbar” that the supplied text did not contain. The 360M model reproduced that passage correctly, but its follow-up answer sometimes repeated an irrelevant configuration note. A final service run with a differently worded reference also invented “Next” and “Previous” controls before reaching its 64-token output limit. The larger model is therefore not reliably grounded by prompting alone. These are direct observations of model quality, not a broad evaluation of technical competence.

The selected 360M model remains fallible. Model output is marked `interpretationOnly`; Quick Questions maps known source IDs to immutable retrieved text or validates quoted claim spans, and Fault Finder keeps readings, prerequisites, numerical comparisons and cause confirmation in structured rules. A generated sentence is not evidence. The runtime does not stream unvalidated instructions into the transcript. `onToken` is available for internal integrations, but the app uses genuine token progress until validation finishes.

A bounded four-question source-ID selection experiment also failed to establish reliable selection: event-history and contextual menu questions returned the correct `S1` with unwanted prose; a PSU voltage question chose cover metadata `S1` instead of specification `S2`; an unanswered battery question echoed the question instead of returning `NONE`. Generation took 3.53–4.67 s per case. Immutable source rendering can prevent generated wording being promoted as documentation, but source IDs alone do not establish relevance. Raw prompts, outputs and timings are in `source-selection-chromium.json`.

With cover passages filtered out, the initial prompt still invented nonexistent `S2` IDs, including a fabricated battery capacity. The final engine prompt improved the two focused cases tested: the nominal-voltage question returned `SOURCE S1: 24 V.` in 3.13 s (only the known ID is consumed, never its generated suffix); the unsupported battery question returned nonconforming prose in 4.24 s, which the anchored parser rejects. Both single-source experiments are recorded separately. A valid ID establishes which stored passage to show, not that it completely answers the question.

Inputs are limited to **768 tokens**; older conversation turns can be omitted, with `contextTruncated` recorded. The latest question and supplied source passage are never silently clipped to fit. Oversized requests return `MODEL_CONTEXT_TOO_LONG` so the conversation can ask for a focused question. Default output is 96 tokens, with a hard cap of 160. Full conversation history remains in app storage regardless of model context limits.

## Resources and persistence

- Model/tokenizer/configuration: **366,642,692 bytes**, pinned to ONNX repository revision `fe7c7db4c8921c9e3fa1c65cfd296fb3b1b1a8f9`; whole-file SHA-256 is checked before use.
- Required vendor runtime JS/WASM: **22,563,501 bytes**, plus small application modules, included in the app precache. The largest deployed runtime asset is the 21,596,019-byte WASM, below the host's 25 MiB per-file limit. Model weights are not deployed in the app archive.
- Downloads use atomic **8 MiB Cache Storage chunks**, a content-addressed key and a final verified marker. Cancelled or interrupted downloads retain complete chunks. Resuming requests only the missing range when the server supports it; a full response is also handled safely. The separate `findr-language-model-v1` cache survives app-shell updates.
- Generation uses a cache adapter with network model loading disabled. Missing optional model files return local 404 responses. Missing required files fail with a download action; there is no implicit remote fallback.
- A model file count alone does not establish offline readiness: all required runtime resources must also be present in browser caches. A failed runtime is reported separately from a missing pack. Memory limits, cancellation, context limits, storage errors and worker failures retain conversations and verified model files.
- At the start of an explicit model download, a five-byte unique Cache Storage probe is written, read back and deleted. Browsers silently dropping writes fail with `STORAGE_UNAVAILABLE` before the large transfer. The probe does not run at startup and never changes model chunks, PDFs or conversations.

## Measured environments

Tests ran on a shared Linux x86_64 execution host, **Chromium 154.0.8037.57** and Playwright **WebKit 26.0 / WPE build 2227**. Portrait viewport was 390 × 844. Both used actual CPU inference without GPU acceleration. WebKit used `/tmp/findr027-webkit-run.sh`; persistent contexts are necessary for reliable Blob storage in this Linux harness. These are browser-engine measurements, **not physical iPhone measurements**. Concurrent test load can affect timings.

| Test | Model load | Generation | Result |
| --- | ---: | ---: | --- |
| 135M Chromium, cold | 3.86 s | 5.20 s | Invented an unsupported toolbar instruction; rejected as default |
| 360M Chromium, cold | 3.66 s | 6.68 s | Quoted the synthetic source |
| 360M Chromium, warm follow-up | 0 s | 3.46 s | Irrelevant source note; illustrates the need for guards |
| 360M WebKit, cold | 14.14 s | 35.01 s | Quoted the synthetic source |
| 360M WebKit, warm follow-up | 0 s | 10.23 s | Actual contextual inference completed |
| Final worker + verified Cache Storage, Chromium | 4.79 s | 5.73 s | 91 input / 22 output tokens, 3.84 tokens/s |
| Reproducible final service script, Chromium | 3.70 s | 12.54 s | 102 input / 64 output tokens; unsupported extra controls before token limit |
| Final service script, warm follow-up | 0 s | 9.84 s | 182 input / 25 output tokens; 2.54 tokens/s |

The final worker's first token arrived 2.66 s after generation began, after model loading. Raw standalone benchmark `updates[].at` values include load time. Synthetic benchmark references are not manufacturer procedures and are not added to the app's manual catalogue.

The final worker downloaded the actual pinned 366.64 MB pack from Hugging Face and verified it in **45.79 s** on this host. A separate recovery test removed the final 2,405,005-byte chunk, cancelled its download, then resumed from `Range: bytes=360710144-`. Download plus complete-file re-verification took **7.71 s**. Concurrent generation correctly returned `MODEL_BUSY`; cancelling active generation returned `AbortError`, retained the installed model and unloaded worker memory. The original profile was then released for normal-menu QA.

## Reproduction and coverage

```sh
node --test tests/local-language.test.mjs
FINDR_MODEL_DOWNLOAD=1 FINDR_MODEL_PROFILE=/tmp/findr-model-profile node scripts/verify-local-language027-browser.mjs
FINDR_MODEL_OFFLINE=1 FINDR_MODEL_PROFILE=/tmp/findr-model-profile node scripts/verify-local-language027-browser.mjs
```

The first browser command explicitly permits the large initial download. The offline command additionally requires the complete current app service-worker precache; it reloads and generates replies with browser networking disabled. Set `FINDR_MODEL_QA_URL`, `FINDR_MODEL_BROWSER=webkit`, `FINDR_WEBKIT` and `FINDR_MODEL_RESULTS` as appropriate. Reuse a profile only when no other browser process holds it.

Nine focused unit regressions cover pinning and sizes, incomplete download state, retention of complete chunks, exact byte reconstruction, corrupt/missing-cache repair, no implicit model fetch, incremental SHA-256, nonretaining storage and isolated probe cleanup. Raw measured inference and actual network recovery results are committed beside this note. Normal-menu, PDF, source-validation and complete service-worker offline QA are recorded by their separate test scripts; this note does not claim those from the standalone model tests.

## Remaining verification limits

No physical iPhone or installed iOS PWA was available. The tested Linux WPE WebKit build can run actual model inference from supplied local files, but its Cache Storage silently discards writes in the tested persistent environment; the final cached model download and complete offline workflow were therefore not verified there. This does not establish that an iPhone has the same storage failure. Peak resident memory and battery use were not measured. Large-model allocation can fail on constrained devices despite API capability checks; the app reports the failure and retains labelled reference-only tools and saved records. Replies are substantially slower in tested WebKit than Chromium and can take tens of seconds. This small model cannot reliably interpret every natural-language fault or infer procedures from diagrams. No online inference mode is enabled.

See `public/app/vendor/local-language/README.md` and `provenance.json` for official documentation, dependency licences and runtime hashes.

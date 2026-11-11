# Local model validation for Quick Questions 0.31.0

The repeated-manual problem was in the question-first answer flow, before local inference. A useful but unreviewed procedure extract was treated as a failed document and the correct manual was excluded. That flow now retains the useful passage, and can use the already-installed model for source selection. A rejected model reply falls back to labelled, exact manual text and completes the question rather than requesting another manual.

No model weights or runtime were changed. The existing optional pack remains **SmolLM2 360M Instruct, q8, WASM CPU**, pinned to revision `fe7c7db4c8921c9e3fa1c65cfd296fb3b1b1a8f9`: **366,642,692 bytes** plus the app's bundled processing runtime. Existing cached files were reused; these checks downloaded no model files.

## Actual inference through the repaired engine

[`question-first-integration.json`](question-first-integration.json) records a real browser run through the question-first engine, an attached **labelled synthetic MxPro4 reference**, `generateLocalReply`, and `applyQuickModelReply`. This is an engine/worker integration test; the separate Quick Questions browser suite covers normal menu interactions.

All three integration checks passed:

- The main question-first route ran the actual cached model and completed the original question with its exact supporting manual extract, one manual retained and no further download effect.
- A second inference and answer completion worked with browser networking disabled.
- Captured actual-model invented source IDs, unsupported wording and an invented battery value were rejected. None became a documented answer; the original question completed with bounded extracts.

The model itself returned `[S1] PDF page 2…` rather than the required source ID. The stricter parser correctly rejected that response. The useful result came from the exact source fallback, not accepted generated prose or a claim that the model had understood the complete procedure. The answer remained `answersQuestion: not_independently_verified`, with its PDF page reference and complete-procedure limitation.

Measured in **Chromium 154.0.8037.57, Linux container, 390 × 844 viewport**, not a physical phone:

| Run | Model load | Inference | First generated token | Tokens |
| --- | ---: | ---: | ---: | ---: |
| Cold engine integration | 6.06 s | 5.85 s | 3.35 s | 16 |
| Warm, browser network disabled | 0 s | 5.53 s | 3.13 s | 16 |

The network-disabled run followed initial runtime loading. Service workers were blocked to test current code, so this benchmark does not prove a fresh offline startup. App/manual offline reload is covered separately. No physical iPhone, WebKit model-inference, battery or frame-rate claim is made for this release.

Reproduce with an existing browser profile whose pinned model is installed and FINDR served on the same origin:

```sh
FINDR_MODEL_PROFILE=/path/to/installed-profile FINDR_MODEL_QA_URL=http://127.0.0.1:8088/app/ node scripts/verify-local-language031-browser.mjs
```

The harness deliberately disables the browser HTTP cache and service worker so previous app code cannot mask the new engine. It retains the model Cache Storage. The existing model integrity/cache unit suite also passed **9/9**.

## Why no prompt-only model upgrade was shipped

Twenty exploratory source-selection generations compared the existing prompt, a shorter prompt, question-last placement, and a one-example prompt. Exact inputs are in [`benchmark-inputs.json`](benchmark-inputs.json); raw outputs and measured timings remain in:

- [`source-selection-original-and-short.json`](source-selection-original-and-short.json)
- [`source-selection-placement-and-example.json`](source-selection-placement-and-example.json)
- [`source-selection-gent.json`](source-selection-gent.json)

The first sixteen used explicitly synthetic references for event history and an external PSU. The last four used actual excerpts from the Gent commissioning manual (PDF page 81) and operating manual (PDF page 11), including **“Putting a gent vigilon on walk test”**. The source audit and released Gent procedure are documented in the main Quick Questions release evidence.

No prompt variant was reliable enough to replace the existing one. The one-example prompt improved output format but selected the wrong passage for a component change and absent battery specification. For the real Gent question, the model invented `S3` although only `S1` and `S2` were supplied; for an unsupported battery question it invented a capacity. These are recorded failures of model quality, not passing answer-quality tests. Experimental prompts were not shipped. The strict selection and source checks reject those outputs.

The repair improves document search, conversation context, bounded extracts and reviewed procedures. It does **not** establish that this compact model can independently verify instructions, numerical limits, equipment identity or compatibility. The reviewed Gent walk-test procedure is source-verified application knowledge, not generated by the model.

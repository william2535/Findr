# Alternate local runtime feasibility — no production replacement selected

This is the feasibility-stage record. Later integration offers the 2B model as
an explicit experimental option while retaining the compact default; see
[runtime integration](model-optional-runtime-integration.md) and
[release verification](README.md). The failed semantic cases below remain
failures. The final application parser additionally accepts bounded known-word
spelling repairs; the retained production-parser JSON records the earlier run.

Actual browser inference was tested with **@wllama/wllama 3.13.0**, its matching WebAssembly runtime and pinned GGUF models. These trials established lower memory use than the exploratory ONNX runs, but **did not establish reliable multi-task language understanding**. No Wllama runtime or replacement model was enabled in FINDR by this work.

## Environment and method

Chromium 154.0.8037.57, Linux container, 390 × 844 viewport, single CPU inference thread, no WebGPU, 1,536-token context, 128-token batch and 64-token microbatch. Early trials used Wllama's default four parallel slots; the later plain/grammar trials explicitly used one slot. This is a browser workload on a Linux machine, **not a physical iPhone performance or compatibility test**.

Only one model inference process ran at a time. Renderer RSS was sampled once per second; reported memory is a sampled process peak, not an exact allocation maximum. Model weights and npm packages stayed outside the source repository. Npm tarball SHA-512 integrity and GGUF publisher SHA-256/size were checked before loading. Exact revisions, hashes and runtime resource sizes are recorded in `wllama-resources.json`.

`createChatCompletion` used the model's embedded chat template, greedy generation, and thinking disabled where the template supports it. Untrusted raw outputs were retained for evaluation only. No generated electrical procedures were released as application answers.

## Results

| Model / prompt | Exact request result | Other evidence | Measured time |
| --- | --- | --- | --- |
| Official Qwen2.5-1.5B-Instruct Q4_K_M, plain action extraction | Failed: confused device disablement with outputs, duplicated swapping and added new-device output disablement | Step-two follow-up and explicit sounder correction were correct | 40.6 s initial interpretation; 30.9 s follow-up; 47.8 s correction |
| Same model, compact JSON | Four action concepts, but missing replacement target and noncompliant object labels | Two-procedure request correct; typo request re-enabled sounders instead of detector; external-PSU request invented an output-disable task | 55.3 s initial; 20.3–28.5 s subsequent cases |
| Qwen3.5-0.8B Q4_K_M community quant, actual full planner prompt | Failed: copied the literal `short verb` placeholder and collapsed the request into one task | Strict parser would reject malformed observations and task fields | 60.4 s cold; 16.1 s same-prompt warm offline repeat |
| Same 0.8B model, plain extraction | Failed: generated output-pin replacement instructions instead of interpreting the request | Step-two reference was correct; correction ignored sounders and duplicated re-enabling | 41.4 s initial; 13.1 s follow-up; 26.4 s correction |
| Same 0.8B model, native JSON-schema grammar | Valid JSON, failed semantics: eight invented or altered tasks | Stopped after first failed case | 60.7 s, 138 generated tokens |
| Qwen2.5-1.5B, quoted-input reading-comprehension prompt and native JSON-schema grammar | Valid JSON, failed coverage: omitted the requested replacement step | Stopped after first failed case | 73.4 s, 75 generated tokens |
| Qwen3.5-2B Q4_K_M community quant, free-string native JSON-schema grammar | All four requested actions and objects correct | Stopped after first case to avoid excessive formatting tokens | 146.5 s, 143 generated tokens |
| Same 2B model, compact JSON grammar with free action/target strings | All four requested actions and objects correct; existing production parser accepted | Walk-test/history correct; typo request correct but parser rejects spelling repair; correction wrongly assigned all targets to sounders; external-PSU request returned no tasks | 86.7 s initial; 43.9 s two procedures; 54.4 s typo; 75.3 s correction; 33.2 s PSU |

The grammar constrained object shape, action enumeration and target strings. It did **not** preselect the correct tasks, targets, count or answer. Valid JSON therefore was not treated as successful understanding. The original full request remained the reference for checking omissions, invented work and incorrect target binding.

The final 2B trial removed action enumeration entirely and used compact GBNF solely to prevent formatting whitespace. Its action and target strings remained free, with no preselected task count. Three of five cases had correct semantics. Only two of five were accepted by the current production parser: the exact request and the independent two-procedure request. The typo answer correctly normalised `disbale` and `detctor`, but the parser's literal source guards rejected it; that is distinct from the model's actual incorrect correction and empty PSU result. These results do not establish a reliable general conversation upgrade. See `wllama-qwen35_2000-production-parser.json` for lossless JSON-to-action-line validation without weakening the source or omission guards.

### Memory and loading

The official 1.5B Q4_K_M weights are **1,117,320,736 bytes**. The first streamed OPFS download/load took 17.6 s on the local test server, with a sampled renderer peak of approximately 1.56 GiB. Loading a previously available local File/Blob instead took approximately 8.9 s. These timings have different I/O scope and are not interchangeable.

The Qwen3.5-0.8B Q4_K_M weights are **532,517,120 bytes**, a pinned Unsloth conversion of the Apache-2.0 Qwen model. Local File/Blob loading took 5.6–7.2 s, with approximately 1.14 GiB sampled peak at load in the first trial. A smaller download and lower memory use did not establish better interpretation quality.

The final Qwen3.5-2B Q4_K_M weights are **1,280,835,840 bytes**, also a pinned Unsloth conversion of an Apache-2.0 Qwen model. Native File/Blob loading took 10.1 s. The compact-grammar trial sampled a renderer peak of **2.192 GiB**. The environment exposed 16 GB device memory and five logical processors, although inference was explicitly single-threaded. This memory and latency result is not evidence that an iPhone can support the model reliably.

Creating one 1.1 GB network `Response.blob()` failed in this Chromium environment after a valid HTTP response. Its cause was not isolated: temporary-volume/blob quota pressure is a plausible factor, so this is not evidence of an inherent 1 GB API limit. Wllama's streamed OPFS download path succeeded. The later quality trials used an explicit local file selection to supply a disk-backed File/Blob; that tests loading, not a new production download integration.

### Offline scope

Completed warm-offline trials used Playwright's network-disabled browser context after loading model and runtime. Real inference continued without a network request, including the same inaccurate outputs. This establishes warm local execution only. It does **not** establish a fresh offline app startup, FINDR integration, correct technical answers or physical iPhone support.

The 2B model repeated the exact request successfully with networking disabled in **60.5 s**. Runtime and model were already loaded. Its two failed semantic cases remain failures even though inference itself can operate offline.

## Runtime integration requirements if revisited

- Wllama's default modern runtime uses JSPI/MEMORY64. Safari needs the matching `@wllama/wllama-compat` assets. The default compatibility paths point to a CDN; an offline application must bundle and explicitly configure its local JS and WASM paths.
- The main WASM is approximately 9.8 MB; the compatibility WASM is approximately 18 MB plus its JS wrapper. Resource hashes are in the manifest. No WebKit Wllama inference was claimed in this trial.
- FINDR's current verified chunk download/cache can stream into a checked OPFS preparation file. Avoid a full-size ArrayBuffer or one enormous network Blob. Preparation space, partial-file recovery, cancellation and shared storage accounting would need production implementation and tests.
- Do not count schema validity as semantic correctness. Preserve and compare explicit user clauses, detect missing steps, validate target relationships, and never treat a requested task as completed work.

LiquidAI LFM2.5-1.2B was inspected and downloaded outside the source tree but **not run**. Its LFM Open License 1.0 commercial revenue threshold makes it unsuitable as an unrestricted default for this engineer-facing application. It was not silently substituted.

## Reproduction

`node scripts/benchmark-pal-wllama034.mjs` expects separately obtained, integrity-checked npm assets and model files under `/tmp/findr034-wllama` (or `FINDR_WLLAMA_DIR`). Set `FINDR_WLLAMA_MODEL=qwen1500`, `qwen35_800` or `qwen35_2000`, and `FINDR_WLLAMA_PROMPT=plain`, `structured`, `planner`, `grammar`, `quoted-grammar`, `free-grammar` or `compact-grammar`. The 2B model is under `/workspace/findr-model-benchmarks/wllama`; browser profiles also default outside the constrained temporary volume. `FINDR_WLLAMA_CASE_LIMIT` bounds a trial. The script makes no application edits and uses no mocked model responses.

Read the individual `wllama-*.json` files for raw outputs, prompts, native token timings, memory samples and explicitly marked stopped trials. Failed trial outputs are research evidence, not instructions to follow onsite.

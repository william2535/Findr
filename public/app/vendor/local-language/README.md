# Offline language runtime

Pinned browser distributions downloaded 2026-11-10, with matching CPU runtime assets selected on 2026-11-11. `provenance.json` records source versions, byte sizes and SHA-256. No model weights are included here.

- `@huggingface/transformers` **3.8.1**, Apache-2.0 (`TRANSFORMERS-LICENSE`). The self-contained `transformers.min.js` distribution includes its matching ONNX Runtime Web **1.22.0-dev.20250409-89f8206ba4**.
- `ort-wasm-simd-threaded.mjs` and `.wasm` come from the exact **onnxruntime-web 1.22.0-dev.20250409-89f8206ba4** package. Its JSEP assets were verified byte-for-byte against the previous Transformers.js distribution before selecting the non-JSEP CPU build. The worker uses explicit `wasmPaths.mjs` and `.wasm` URLs, one CPU thread and no proxy. It does not require WebGPU, cross-origin isolation or SharedArrayBuffer. ONNX Runtime uses the MIT licence (`ORT-LICENSE`). The CPU WASM asset is 11,133,407 bytes, below the host's 25 MiB per-file limit.
- The four `hashes/*.js` modules come from `@noble/hashes` **2.0.1**, MIT (`hashes/LICENSE`). They provide incremental SHA-256 while verifying downloaded 8 MiB model chunks, avoiding a second whole-model buffer.

Bundled vendor files total **12,090,801 bytes**, including licences and excluding this documentation and the app's small worker/controller modules. Runtime resources are part of the app shell and must appear in the generated precache before offline readiness is reported.

The optional **SmolLM2 360M Instruct int8** model and tokenizer download separately from the immutable revision and SHA-256 manifest in `../../local-language-resources.mjs`: **366,642,692 bytes**. Explicit user action starts the download. Each complete file is hash-verified before inference is enabled. Model cache data is separate from service-worker app caches and survives app updates. Inference uses only the verified cache adapter; it cannot fetch a missing model file itself.

The CPU runtime change follows upstream investigation of Safari/iOS startup failures with the JSEP build; it does not prove that every iPhone can initialize this model. The loader still holds a complete JavaScript model buffer while ORT copies weights into WASM memory. Cache reconstruction now streams one saved part at a time without an additional 8 MiB `arrayBuffer()` reconstruction, but substantial model initialization memory remains necessary.

A tab-scoped session-storage checkpoint is committed before worker startup. An unfinished attempt found after a reload disables automatic inference until the user explicitly enables retry. Normal cancellation settles that checkpoint; source/context validation errors do not unload the existing model or block a smaller request. The checkpoint contains no questions or manual text and does not modify the saved model parts. Other open tabs have separate checkpoints.

Official documentation consulted:

- [Transformers.js custom usage](https://huggingface.co/docs/transformers.js/en/custom_usage): bundled WASM paths, local/remote model behaviour.
- [Transformers.js environment API](https://huggingface.co/docs/transformers.js/api/env): `useCustomCache`, `allowRemoteModels`, `allowLocalModels` and browser cache configuration.
- [ONNX Runtime Web deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html): matching runtime assets and deployment requirements.
- [ONNX Runtime Web environment flags](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html): `numThreads`, `wasmPaths` and worker configuration.
- [Upstream Safari/iOS startup investigation](https://github.com/huggingface/transformers.js/issues/1242): matching non-JSEP CPU runtime testing. This is evidence for the compatibility change, not a diagnosis of a particular device.
- [Original SmolLM2 model card](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct) and [ONNX conversion](https://huggingface.co/onnx-community/SmolLM2-360M-Instruct-ONNX).

This is a small general language model, not an electrical authority. Its interpretation must pass FINDR's source/evidence checks before any procedure is shown as supported. Model quality and real desktop-browser timings are recorded under `research/local-language-0.27.0/`; physical iPhone performance remains unverified.

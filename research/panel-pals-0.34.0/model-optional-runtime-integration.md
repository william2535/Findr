# Optional conversation model runtime

The compact SmolLM2-360M pack remains FINDR's default. The additional `conversation-2b` profile is explicitly experimental: Qwen3.5-2B Q4_K_M, 1,280,835,840 model bytes plus 29,395,450 bundled runtime/license bytes. Main and compatibility runtimes are pinned to official `@wllama/wllama` and `@wllama/wllama-compat` 3.13.0. File hashes and npm integrity values are recorded in `public/app/vendor/local-language/wllama/provenance.json`.

The model is not qualified as a general conversational assistant. The feasibility suite passed the exact four-action device request, an independently worded walk-test/history request and an imperfectly spelled request. It failed the correction and a component-change case. Explicit context handling, grounded task validation and labelled fallbacks remain necessary. Model interpretations never establish equipment procedures or completed work.

## API and activation

- `getLocalLanguageProfiles()` returns profile descriptors containing `id`, `title`, `experimental`, `model`, `files`, `bytes`, `runtimePaths` and `runtimeBytes`.
- `getActiveLocalLanguageProfile()` returns a descriptor; its `.id` is `compact` by default.
- `getLocalLanguageReadiness({profileId})` inspects an inactive candidate without selecting it. It retains the previous readiness fields and adds `profileId`, `activeProfileId`, `trialProof`, `canTest` and `canActivate`.
- `prepareLocalLanguageResources({profileId, signal, onProgress})` downloads that candidate using FINDR's existing resumable eight-MiB chunks and full SHA-256 verification. It never selects it.
- `testLocalLanguageProfile(profileId, {signal, onProgress})` performs actual constrained local inference and returns `{passed:true, profileId, trialProof, result, readiness}`. It never selects it. The small probe checks model loading and generation, **not understanding or answer quality**.
- `setActiveLocalLanguageProfile(profileId)` performs a synchronous, verified localStorage write. The experimental profile requires matching successful probe evidence for its model revision and runtime version. Compact can be selected without downloading it, retaining the normal manual-reference fallback.
- `allowLocalLanguageRetry({profileId})` clears only that profile's recovery error after an explicit retry action.
- `generateLocalReply()` retains existing callers and adds optional `profileId` and `outputFormat:'tasks'`. The latter uses compact native GBNF for a JSON task array; it leaves the action strings, targets and number of tasks open. Existing `choices` use a separate exact-label GBNF.

One model worker is active at a time. Switching profiles terminates the previous worker when necessary. Downloads, jobs, manuals and transcripts are not deleted. The compact recovery checkpoint keeps its previous key; the candidate has its own suffixed checkpoint so a failed large-model attempt cannot block compact use. Failed/cancelled probes leave the selected profile and trial proof unchanged. Preference write failures are reported, with rollback attempted before returning an error.

## Storage and inference

The GGUF adapter composes verified cached chunks into Blob parts; it does not concatenate the full model into a JavaScript ArrayBuffer. Wllama loads the Blob through its public `loadModel([blob], options)` API. All main/compat runtime paths are explicit same-origin URLs; no default CDN or cloud inference is used. The existing service-worker integrity manifest must include the new runtime assets before cold offline use can be reported ready.

The native engine uses one CPU thread, 1,536 context tokens, a 180-token output ceiling, thinking disabled and `ctx_shift:false`. The adapter does not discard older messages. Context overflow and incomplete output fail visibly. Prompt processing, load phases, generated tokens and timing values come from real operations. Native task output still passes the application's separate semantic grounding checks.

## Completed verification

`node --test tests/local-language*.test.mjs`: **74 passed** after integration. This includes all prior download/cache/recovery/lifecycle regressions and 15 new adapter/profile tests. Mocked controller tests are explicitly labelled as contracts, not inference evidence.

The isolated real-browser prototype exercised the same adapter and existing downloader/cache code through an outer module worker and wllama's nested worker:

- Downloaded and verified all real GGUF bytes from a local mirror in 39.15 seconds; the mirror served the exact pinned weight file, not simulated responses.
- Loaded verified CacheStorage chunks and produced the correct four-action JSON: 8.59 seconds load plus 85.87 seconds generation, 117 input/50 output tokens.
- Terminated the outer worker, disabled networking, reloaded and created a fresh worker. Cold offline loading and inference succeeded: 9.51 seconds load plus 92.36 seconds generation, with the same four-action JSON.
- Reused native exact-choice output and selected `S2` for the event-history source in the reference-label probe.

Raw results: `gguf-nested-cache-offline-prototype.json`. The prototype's injected file list used the pre-integration downloader, whose returned download metadata still named the compact model; the actual verified bytes and inference model were the pinned Qwen GGUF. Production now passes the selected model metadata explicitly to the existing downloader.

Environment: Chromium 154, Linux x86-64 managed executor, five logical processors, 390 × 844 viewport. A renderer RSS snapshot during the cache-based run was about 1.71 GB; this was not a sampled peak. **No physical iPhone was tested.** Browser memory pressure may prevent this optional model from running. The normal FINDR UI/offline journey and cancellation of nested workers are verified separately by the application QA run; this prototype alone does not establish those UI checks or publication.

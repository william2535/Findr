# Panel Pal dialogue model investigation — 11 November 2026

This is an actual local inference investigation, not a model-quality claim. No application model pack was changed by these experiments. Model outputs in the adjacent JSON files are untrusted benchmark data; they are **not operating instructions**.

## Conclusion of the ONNX comparison

Do not ship Qwen2.5-0.5B or Qwen3-0.6B as a generally capable conversational replacement on this evidence. Qwen3 can extract all four actions from the user's exact example with a simple prompt, and resolve the numbered follow-up. Broader tests still produced incorrect corrections, invented operating steps and a materially wrong interpretation of an imperfectly spelled request. A successful demonstration of the exact screenshot text is insufficient.

The existing SmolLM2-360M is also unsuitable for unconstrained dialogue interpretation in the tested prompt. Its source-label-only use in FINDR does not establish conversational understanding. It invented software API commands when asked to extract the four requested actions. These outputs must remain rejected by the application.

A stronger model/runtime evaluation is proceeding separately through the wllama investigation. No model choice or production resource change follows from this document alone.

## Environment and method

- Actual headless Chromium 154, Linux x86-64 managed executor, 390 × 844 viewport. This viewport is **not an iPhone performance test**.
- CPU: Intel Xeon Platinum 8573C, 5 exposed logical processors; browser reports 16 GB device memory. Cgroup memory limit 16 GiB.
- Transformers.js 3.8.1 and FINDR's bundled matching ONNX Runtime CPU WASM resources, one WASM thread, greedy generation. All inference remained local.
- Candidate files were downloaded from pinned Hugging Face revisions into `/tmp/findr034-models`, outside the source tree. SHA-256 manifests are included; weights are not.
- Initial comparisons used structured JSON planning prompts. A subsequent short, task-specific plain-language extraction prompt tested nine distinct cases. It supplies no equipment procedures or manual answers.
- Qwen3 used the official chat template with `enable_thinking:false`, explicitly rendered before passing a string to the pipeline. The pipeline's conversation-array interface does not forward this template option.
- Model bytes include weights, configuration and tokenizer files. The shared inference runtime is additional.

| Candidate | Pinned pack bytes | Result |
| --- | ---: | --- |
| Existing SmolLM2-360M Instruct q8 | 366,642,692 | Baseline structured interpretation failed all five cases. |
| Qwen2.5-0.5B Instruct q8 | 519,136,999 | Baseline, structured planner and few-shot variants failed substantive interpretation/schema checks. |
| Qwen3-0.6B q8, thinking disabled | 626,816,115 | Exact four-action request succeeds with plain extraction; broader correctness failures remain. |
| Qwen2.5-1.5B Instruct q8 | 1,585,994,866 | Loaded, but initial concurrent experiment was interrupted before a usable answer; no quality conclusion. |

The q4 ONNX alternatives were not assumed smaller: upstream Qwen2.5-0.5B q4 weights are 786,156,820 bytes versus 512,096,557 for q8; 1.5B q4 weights are 1,787,566,590 versus 1,578,954,293 for q8. These are published file sizes, not a comparison of on-device memory requirements.

## Nine-case sequential Qwen3 plain-extraction run

Cold model/runtime load: **12.49 s**. Each row below was executed sequentially in the same browser/worker. These are interpretation times, not manual retrieval or full application answer times.

| Case | Generation | Output tokens | Semantic outcome |
| --- | ---: | ---: | --- |
| Exact device-swap request with four actions | 10.40 s | 23 | All four actions in requested order. |
| “What about step two?” | 7.07 s | 12 | Correctly refers to disabling the old device. |
| “meant sounders, not all outputs” | 13.02 s | 29 | **Fail:** ignores sounders and reorders the previous plan. |
| Three readings plus present fault | 20.52 s | 53 | Values/points retained, but **not exact raw quotes**; must not replace original evidence. |
| Unrelated request for a coffee joke | 22.49 s | 56 | **Fail:** invents repeated observations instead of recognising the request. |
| Walk test followed by event history | 14.11 s | 30 | **Fail:** invents a “Start Walk Test” button and operating instructions. |
| Imperfect spelling: disable sounders, swap detector, re-enable | 10.39 s | 21 | **Fail:** turns it into swapping the detector with the sounder. |
| Explicit change to external PSU, two tasks | 12.02 s | 25 | Correct two requested tasks and component scope. |
| Inaccessible expander and resistance-fault report | 10.99 s | 22 | Preserves the reported observations; supplies no unsupported test. |

The exact four-action request repeated with browser networking disabled completed in **11.02 s**, producing the same four lines. This proves **warm, in-memory local inference only**. It does not prove cold offline model loading, offline manual processing, a complete PWA workflow or iPhone compatibility.

The historical Qwen3 JSON artifacts record input token counts before the added non-thinking template suffix; they are not exact counts of the final inference string. The benchmark script now counts the exact rendered string for future runs. Output token counts and elapsed times above are measured from actual generation.

## Memory and interrupted tests

Linux RSS snapshots showed approximately 1.13 GB for the current 360M renderer, 2.58 GB for Qwen2.5-0.5B, 2.53–2.94 GB for Qwen3-0.6B, and 6.03 GB for the 1.5B ONNX renderer. These are individual process RSS observations, not rigorously sampled peaks or physical-phone memory limits; shared mappings and allocations complicate direct comparisons.

An attempted parallel run of three model workers exceeded the shared executor's available memory. Linux cgroup counters recorded three renderer OOM kills. That experiment was stopped, and the nine-case Qwen3 run above was repeated alone. The concurrent 1.5B and second structured Qwen3 runs are marked interrupted in their artifacts. **This is not evidence that one isolated model fails on the executor or an iPhone.** It is also not acceptable performance evidence for a production model choice.

## Acceptance criteria

A result counts as a useful interpretation only if it preserves **all** separately requested tasks and their order, does not duplicate an introductory goal, and adds no operational facts or fabricated menu paths. A correction must apply the changed target and retain unchanged tasks/order. A numbered follow-up must resolve the referenced task without replacing the plan. Reported readings must retain the user's raw text separately from any interpretation; a request or proposed test is never recorded as completed work.

A valid-looking JSON object is not sufficient. A model that performs well on the exact screenshot but fails a differently worded two-task request is not qualified as a general conversational upgrade. Parser fallbacks and explicit context resolution must be labelled accurately and not counted as successful model inference.

## Reproduction and records

`node scripts/benchmark-panel-pal-dialogue034.mjs` runs genuine local browser inference against independently downloaded pinned candidate packs. It checks each manifest's sizes and SHA-256 hashes before loading. Set `FINDR_DIALOGUE_MODELS` for the external model directory, `FINDR_DIALOGUE_CANDIDATES` for candidate labels, `FINDR_DIALOGUE_PROMPT` to `planner`, `fewshot`, `planner-v2` or `plain`, and `FINDR_DIALOGUE_RESULTS` for the output path. `FINDR_DIALOGUE_TOKENS` defaults to 256; set it to 160 to reproduce the completed plain-extraction run. It requires the environment's Playwright and Chromium paths documented in the script. Run model benchmarks sequentially.

- `model-candidate-manifests.json`: exact IDs, revisions, bytes and hashes.
- `model-dialogue-benchmark.json`: first 360M/0.5B baseline and warm-offline repetitions.
- `model-dialogue-planner-qwen.json`: 0.5B structured planner failures.
- `model-dialogue-fewshot-qwen.json`: 0.5B few-shot failures.
- `model-dialogue-planner-qwen3.json`: completed structured online cases; offline repetition interrupted.
- `model-dialogue-planner-qwen15.json` and `model-dialogue-v2-qwen3.json`: explicitly marked interrupted concurrent runs.
- `model-dialogue-plain-qwen3.json`: completed sequential nine-case test and warm-offline repetition.

Official sources consulted: the original [Qwen2.5-0.5B model card](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct), the pinned ONNX community model repositories listed in the manifest, their published file metadata, and each model's tokenizer chat template. No manufacturer compatibility or operating procedure was evaluated by this model-only benchmark.

## Subsequent optional runtime work

A separate, explicitly experimental Qwen3.5-2B GGUF profile was subsequently integrated with the compact model preserved as the default. See `model-optional-runtime-integration.md` for its mixed quality evidence, actual cold-offline worker check, activation gate and limitations. This does not change the rejected ONNX candidate conclusions above.

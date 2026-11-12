# Compact local models and manual retrieval: evaluated options

Research date: 2026-11-12. This is a research evaluation, not a change to FINDR's
installed model, download defaults, AI readiness checks or existing conversations.
The implementation remains responsible for source scope, manual editions,
prerequisites, numerical comparisons and evidence state.

## Recommendation

Improve the evidence supplied to the existing model before increasing its size.
Downloading more manuals expands the local, searchable evidence library; it does
not train model parameters or establish that every panel question is answerable.
A model must still distinguish missing evidence from a supported procedure.

The first practical option is a structured panel knowledge pack: headings,
procedure spans, neighbouring precautions, menu labels and source page links,
restricted to the selected model/variant/revision. Search each separately requested
action, then retrieve enough surrounding context to establish the complete
procedure. Existing reviewed menu maps can supplement an incomplete text search
only when their own source and equipment applicability are verified.

A second option is a small optional semantic encoder alongside exact lexical
retrieval. It ranks meaning rather than generating answers. Exact matching must
remain for terminal numbers, menu labels, fault codes and model numbers. The
benchmark below evaluates this option without integrating it into the app.

A third, longer-term option is training a compact model for FINDR's language tasks:
request decomposition, correction handling, follow-up resolution, search planning
and abstention. Fine-tuning should teach these behaviours using reviewed examples;
it should not replace live, versioned manual evidence with memorised electrical
values or manufacturer procedures. Adding a manual should never silently alter
model weights or learn from unverified engineer observations.

## Existing model measurements

These are historical project measurements, not new measurements in this study:

- SmolLM2-360M q8: **366,642,692 bytes** for its configured pack. The primary model
  card explicitly warns that its output can be factually inaccurate or logically
  inconsistent.
- Optional Qwen3.5-2B Q4_K_M: **1,280,835,840 bytes** for the model, plus the runtime.
  Recorded cold offline Chromium application execution took **106.40 seconds**
  (12.74 seconds loading and 92.69 seconds generation). The feasibility run sampled
  about **2.2 GiB** peak renderer memory; raw semantic interpretation passed only
  **3 of 5** requests. Physical iPhone inference was not verified.

See [the existing benchmark report](../panel-pals-0.34.0/README.md) and
[model configuration](../../public/app/local-language-resources.mjs).

Four-bit is not an automatic download-size improvement. Verified repository
metadata for the existing SmolLM2-360M ONNX conversion lists q8 at **363,115,149
bytes**, q4 at **386,495,938 bytes**, and q4f16 at **272,353,302 bytes**. The latter
requires separate backend, memory and quality evaluation. Download size also does
not measure peak runtime memory: model copies, runtime buffers and context state
consume additional memory.

## Optional encoder: what was selected

The exploratory candidate is `Xenova/multi-qa-MiniLM-L6-cos-v1`, pinned to revision
`3c96c1df3fec9a98a5de76e80877c8bec18498f6`. The q8 ONNX file is **22,972,369 bytes**
and the tokenizer is **711,661 bytes**, plus small configuration files. The
upstream Sentence Transformers model card describes 384-dimensional normalized
embeddings, mean pooling and training on 215 million question-answer pairs. It
is intended for question-to-paragraph search, not chat generation.

The primary card states a maximum of 512 word pieces, with training inputs up to
250 word pieces. This experiment uses `max_length: 256`; truncation counts are
reported in the raw results. Chunk retrieval must reconnect to source pages and
complete procedure context before presenting any instruction.

A 384-dimensional float32 vector requires 1,536 bytes; 10,000 vectors require
15.36 MB, excluding text and metadata. Int8 vector storage would reduce this to
3.84 MB but needs representative calibration and retrieval-quality validation.
That arithmetic is not a claim that quantized ranking preserves accuracy.

Public, redistributable knowledge packs could be indexed on a development machine
so the phone only embeds each query. A newly uploaded PDF still needs local
processing and indexing. The document and query embedding model, pooling,
normalisation, dimensions and revision must match. Never mix vectors from different
models or silently broaden a pal's allowed document scope.

## Reproducible browser experiment

Run:

```sh
node research/retrieval-0.38.0/compact-encoder-benchmark.mjs
```

The default input is `/tmp/findr034-manual-evidence/analyses.json`, the existing
cached extraction of the real MxPro5 user guide and product manual. Manufacturer
PDFs and extracted page text are not included in this research directory. Set
`FINDR_ENCODER_ANALYSES` to the corresponding local analyses file when reproducing.
`FINDR_ENCODER_WORK` changes the temporary model/baseline directory. Playwright and
Chromium paths can be overridden with `FINDR_PLAYWRIGHT` and `FINDR_CHROMIUM`.

The script downloads only the optional 23 MB encoder pack to `/tmp`, checks model
bytes against the pinned Hugging Face metadata, and records each file's SHA-256.
It freezes lexical comparison code from source commit
`d1ff3d032895efa02b4f2ad8188e2d9508fbdf00`. It uses FINDR's existing Transformers.js
and matching CPU/WASM runtime, one worker, one CPU thread, mean pooling and
normalised embeddings. Both ranks use the same scoped passages from the two real
manuals. The semantic candidate does not bypass the application's technical-answer
checks, because this experiment produces rankings only.

The eight questions are those used in the original lexical audit. This is a small
exploratory set, not a statistically validated benchmark. It measures encoding
and retrieval, not conversational intelligence, safety or procedure completeness.

Raw output: [compact-encoder-results.json](compact-encoder-results.json).
Script: [compact-encoder-benchmark.mjs](compact-encoder-benchmark.mjs).

## Actual measured result

The encoder ran successfully on **Linux Chromium 154**, an Intel Xeon Platinum
8573C execution environment with 5 logical CPUs exposed. Its worker used CPU/WASM,
one inference thread, and a 390 × 844 browser viewport. A phone-sized viewport does
not make this a phone benchmark. No physical iPhone, Android device, or WebKit
inference was tested.

| Measurement | Observed result |
| --- | --- |
| Complete encoder/config/tokenizer download | 23,685,180 bytes |
| Download through this environment's proxy | 5.87 seconds |
| Pipeline load from the local file server | 1.257 seconds |
| Encode 254 scoped passages, batches of 4 | 39.79 seconds |
| Query encoding across eight questions | 6.5–10.8 milliseconds |
| Raw float32 passage vectors | 390,144 bytes |
| Passages truncated at 256 tokens | 15 of 254; longest input 403 tokens |
| Warm query with browser networking disabled | 7.8 milliseconds; zero server requests |
| Sampled renderer RSS before model load | 149.1 MB |
| Sampled peak aggregate renderer RSS | 448.6 MB |

The memory increase was approximately **299.5 MB**, including the browser/runtime
and indexing workload. Samples every 250 milliseconds can miss short-lived peaks.
These are aggregate Chromium renderer resident bytes, not just JavaScript heap or
model weights. The small download does not establish that it will fit comfortably
on the user's iPhone.

The offline check used the **already loaded worker in the same browser session**.
It did not reload the application, persist and reopen the model, test offline
resource installation, or establish cold-start readiness. The benchmark blocked
service workers and used a local HTTP file server for initial loading. No remote
inference service was used. All model files remain in `/tmp`; they are not bundled
in the source or installed into users' FINDR caches.

### Retrieval comparison

Both methods searched the same **254 scoped passages from the original index**.
The lexical comparator is frozen at the original source commit; it is not the new
heading-aware index shipping in this update. The lexical audit lists 294 raw
passages before helper scope/content-page filtering. Consequently, these results
must not be presented as an advantage over the new index or as an ablation of the
new retrieval planner.

The relevance targets were reviewed against the original pages and shared with
[the lexical audit](lexical-benchmark.json). They identify useful pages, not a
complete answer. In particular, the loop-open target provides monitoring context;
it does not establish a cause, cable order, break location or fault diagnosis.

| Question | Original lexical top page | Encoder top page | Original top-1 / top-3 target hit | Encoder top-1 / top-3 target hit |
| --- | --- | --- | --- | --- |
| View event history | User 24 | User 24 | Yes / Yes | Yes / Yes |
| Start walk test | Product 60 | User 33 | No / Yes | Yes / Yes |
| Disable a detector | User 29 | User 27 | No / Yes | Yes / Yes |
| Panel battery voltage | Product 2 | Product 25 | No / Yes | Yes / Yes |
| Meaning of loop open circuit | Product 51 | Product 51 | No / Yes | No / No |
| Find disable sounders menu | User 29 | User 16 | No / Yes | No / Yes |
| Change date and time | Product 50 | User 39 | Yes / Yes | Yes / Yes |
| View disabled devices | User 15 | User 16 | Yes / Yes | Yes / Yes |
| **Total across eight questions** | | | **3/8 / 8/8** | **6/8 / 7/8** |

Numbers denote PDF page positions. The encoder improved first-page relevance in
this small set, but lost a useful loop-monitoring reference from its first three
results. For the sounder-menu question, an overview of disabled outputs ranked
above the actual disable operation. This argues for combining semantic recall
with exact labels, headings and completeness checks, not replacing lexical search.
A detector-page hit likewise does not distinguish individual-device disablement
from disabling all automatic detectors without retrieving its surrounding context.
The battery question still needs to distinguish nominal battery arrangement from
a measured voltage under specified conditions.

Decision: **keep this encoder experimental**. Ship the smaller deterministic
retrieval/index improvements first. An optional hybrid encoder should undergo
physical-device memory, cold-offline-cache, cancellation, model isolation, and
retrieval-quality trials before being offered as ready. No different chat model,
semantic index or training result is claimed as shipped by this research.

## Training and autonomous search boundaries

LoRA trains a small set of additional parameters while retaining the base model.
A small adapter is not a self-contained tiny model. Merging it removes adapter
handling overhead but retains the base model's storage and runtime needs. The
wllama upstream README still lists LoRA adapter support as a TODO; merging and
exporting a separately trained checkpoint would require compatibility tests.

Distillation can train a smaller student using a larger teacher. It needs a
reviewed dataset, compute and held-out evaluation; it does not guarantee that a
135M or 360M model will understand every engineering conversation. No training,
paid inference or teacher API calls were performed here.

Evaluate separately: preserving each requested task and target; negation;
corrections; follow-ups; identifying missing variant information; relevant-section
recall; complete procedure/context retrieval; citation support; honest abstention;
latency; and memory. Hold out panel families and manual revisions. Synthetic
training answers are not manufacturer evidence.

A bounded retrieval controller can search the selected local manuals, inspect
headings and neighbouring sections, reformulate a specific missing subquestion,
and identify a relevant missing document. If online, it can search catalogue
metadata and ask before downloading the document. It must stop when the available
sources do not establish the answer. “Search until found” cannot promise an answer
that the source material does not contain.

Document text is reference data, never executable instructions. Search may not
access another pal's private context, override application rules or silently
switch to online inference. Cache retrieval by document hash, index version,
model/variant scope and query; updates must not rewrite historical evidence.

## Primary sources inspected

- [SmolLM2 primary model card](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct)
- [SmolLM2 ONNX file metadata](https://huggingface.co/api/models/onnx-community/SmolLM2-360M-Instruct-ONNX?blobs=true)
- [Multi-QA MiniLM primary model card](https://huggingface.co/sentence-transformers/multi-qa-MiniLM-L6-cos-v1)
- [Pinned browser encoder files](https://huggingface.co/Xenova/multi-qa-MiniLM-L6-cos-v1/tree/3c96c1df3fec9a98a5de76e80877c8bec18498f6)
- [Transformers.js 3.8.1 quantization](https://huggingface.co/docs/transformers.js/v3.8.1/en/guides/dtypes)
- [Sentence Transformers semantic search](https://github.com/huggingface/sentence-transformers/blob/master/examples/sentence_transformer/applications/semantic-search/README.md)
- [Sentence Transformers embedding quantization](https://github.com/huggingface/sentence-transformers/blob/master/examples/sentence_transformer/applications/embedding-quantization/README.md)
- [PEFT LoRA and merging](https://huggingface.co/docs/peft/en/developer_guides/lora)
- [TRL knowledge distillation](https://huggingface.co/docs/trl/en/gkd_trainer)
- [wllama runtime documentation](https://github.com/ngxson/wllama)

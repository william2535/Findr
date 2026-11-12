# Bounded helper manual search

Verified 12 November 2026. This is a local retrieval improvement, not a trained model or a claim that FINDR can answer every panel question.

## Implementation

`public/app/helper-search-planner.mjs` runs no more than three searches over the helper engine's already scoped, successfully read passages:

1. The original question.
2. Where applicable, a controlled vocabulary bridge for clock settings, historical events or disabled-status viewing. The original question remains in the query.
3. If the required section has not been located, one explicit matching source-heading query.

The planner stops rather than continuously suggesting more documents. It does not download a manual, widen the helper's document scope, execute repository code, send data online or invoke a model. Existing task decomposition continues to search each task through the same scope boundary.

The original-question relevance check still applies to every result. A result must have the same passage ID, manual ID, content hash, PDF page and exact text as an allowed source passage. Heading labels affect ranking only; they cannot invent navigation instructions, supply another section's precautions or establish a complete procedure. The existing reviewed-procedure, impairment, measurement, model-boundary and source-conflict checks remain in place.

Explicit print/export/clear/delete/disable/enable/reset/configure operations are not rewritten as viewing history. A regression during development caught PRINT being promoted to VIEW; the final implementation has a focused guard and test for this case.

`message.searchPlan` records the version, actual queries and candidate IDs for at most three attempts, selected-helper scope and honest `candidate_references_found` / `not_established` state. It records `inferenceUsed: false`. This metadata is saved alongside the answer; technical citations continue using actual source text and page provenance.

## Measured retrieval experiment

`benchmark-helper-search.mjs` uses the real locally extracted MxPro5 user guide (43 PDF pages) and product manual (74 PDF pages). Their hashes are in `helper-search-benchmark.json`. The PDFs and full extracted manual text are not copied into this repository.

To isolate the planner, the experiment compares the previous helper engine from source revision `d1ff3d032895efa02b4f2ad8188e2d9508fbdf00` against the same current lexical indexes used by the new planner. Changes to the lexical index are measured separately by `lexical-benchmark.json`.

The eight selected cases improved from 5/8 to 8/8 expected first references or correct abstention:

| Question | Same new index without planner | With planner |
|---|---|---|
| Where do I set the clock? | Product manual p44, scheduled clocks | User guide p39, Change-Time |
| How can I look up old alarms? | Product manual p61, battery text | User guide p24, event log |
| Where is the event log? | Product manual p52, trace logging | User guide p24, event log |
| How do I print the event log? | User guide p38 | Same p38 |
| Change the printer options | User guide p36 | Same p36 |
| View software version | User guide p22 | Same p22 |
| What does dirty mean? | User guide p25 | Same p25 |
| Enable quantum teleportation | No evidence | No evidence |

Node measurements on the managed Linux executor used ten runs per query. Median planner-inclusive helper retrieval was 18.7–28.1 ms across these cases. The three improved questions used two searches; the remaining five used one. This is a small targeted sample, not a broad accuracy estimate. No local language inference, PDF processing, physical iPhone performance or new verified operating procedure is measured here.

Reproduce with:

```sh
node research/retrieval-0.38.0/benchmark-helper-search.mjs /path/to/analyses.json /tmp/helper-search-benchmark.json
node --test tests/helper-search-planner.test.mjs tests/helpers-engine.test.mjs tests/helper-task-evidence.test.mjs tests/helper-dialogue-engine.test.mjs tests/helper-panel-reference-engine.test.mjs
```

The focused suite passed 102 tests. It covers bounded attempts, unchanged original queries, cross-helper exclusion, altered-source rejection, honest manual-only fallback, unsupported-question abstention, incomplete impairment instructions and explicit print-versus-view preservation.

## Limits

Vocabulary bridges are deliberately narrow. They are inspectable retrieval rules, not general natural-language understanding. A helper still cannot answer a question absent from its selected manuals, and more indexed manuals do not alter model weights. No autonomous archive/repository download or automatic model training has been added by this planner.

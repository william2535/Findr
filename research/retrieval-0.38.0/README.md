# FINDR 0.38.0 — scoped manual retrieval

More saved manuals add searchable evidence. They do not train, fine-tune or change
FINDR's language-model weights. This work improves how the existing assistant
finds evidence inside its selected manuals without downloading a new model.
The optional encoder feasibility study is documented separately in
`compact-model-research.md`; no semantic model was added to the application.

## Implemented index changes

`manual-retrieval.mjs` now builds schema 2 indexes (retrieval version
`2026-11-12.1`) containing inverted term postings and document frequencies.
The existing hash/processor/version-keyed cache and indexing worker are reused.
Persisted index validation checks postings, source identities, original page text
and heading anchors. Old or corrupt derived indexes rebuild from existing local
analysis; saved PDFs, conversations and analysis records are not migrated away
or deleted. A failed cache write still returns the memory index with the real
storage exception.

Candidate selection intersects stored postings with the caller's current filtered
passages. A removed, unreadable or out-of-scope passage cannot return through an
older posting. IDs, verbatim chunk text, offsets and original page references are
unchanged. Per-query scoring considers candidates rather than rebuilding document
frequency with repeated full corpus scans.

Explicit numbered headings retain their exact title, number, source page, offset
and quotation. They improve operation/target ranking and can guide the bounded
search planner. Heading context may extend to the next consecutive readable page,
but never indefinitely. A new heading near the top of the next page replaces the
old context. These are candidate context anchors; inferred headings do **not**
populate a certified section citation. Numerical units, contents entries and
embedded model-control instructions are excluded from heading detection.

The operation heading boost is generic: for example, a detector/input disable
section can outrank a general disablement-group mention. There are no
manufacturer-specific page-number boosts. The evidence, recipe, model-scope,
measurement and precaution gates remain in place. No unrelated adjacent warning
can authorise an operation, and an unreviewed extract remains unreviewed.

## Measured real-document comparison

Reproduce from the retained actual analyses and PDFs:

```sh
node scripts/benchmark-retrieval038.mjs \
  /tmp/findr034-manual-evidence/analyses.json \
  research/retrieval-0.38.0/lexical-benchmark.json
```

The script imports the actual baseline retrieval/helper modules from commit
`d1ff3d032895efa02b4f2ad8188e2d9508fbdf00` and compares the current modules.
It does not change app storage or source. The current helper path also includes
the separately implemented bounded search planner. Manufacturer PDFs and model
weights are not redistributed in this research directory.

Environment: **Linux x64, Node v24.19.0**, shared development executor. This is a
CPU retrieval measurement, not iPhone timing or language-model inference.
Each real query was repeated seven times, reporting its median. Timings vary with
shared host load; there are no claims of hardware-independent speed.

Actual saved manufacturer documents, with PDF SHA-256 checked again by the script:

- Advanced MxPro5 user guide, `advanced-0254975c10bd`, 43 pages,
  `e5a636dd6f10edeb047520368714e04cde7b93bacc9465ab26ec6c30f19c2ce8`.
- MxPro5 Product Manual, `advanced-a18ea5cccf04`, 74 pages,
  `d185e9c6e06af7108cbe373246e6b4fe7f1d4ad6202d3bc79691b1e16829150b`.

The two indexes contain 294 original chunks. Helper filtering removes contents
and other unsuitable passages before searching.

| Measurement | Baseline | Updated |
| --- | ---: | ---: |
| Relevant first result, 12 reviewed queries | 6/12 | 10/12 |
| Relevant reference among first four | 12/12 | 12/12 |
| Median of query medians | 24.72 ms | 21.55 ms |
| Serialized index size | 1,039,246 bytes | 1,282,150 bytes |

The four first-result improvements are walk test (user p33), detector disabling
(user p27), sounder disabling menu (user p27), and enabling sounders (user p30).
No first-result pass in this fixture became a failure. A planner integration
regression initially redirected **print event log** to **view event log**; its
explicit-operation guard now preserves the print section on p38.

Battery-voltage and loop-open questions still miss the reviewed reference as
the first result, although it is in the first four. Loop monitoring text does not
establish the fault's cause. The benchmark grades page relevance only: it does
not establish that a retrieved chunk contains the complete safe procedure, that
any action was performed, or that the model can answer arbitrary panel questions.
Existing reviewed walk-test/control recipes already supported some questions
before this update; their existence is not counted as newly implemented knowledge.

## Scaling and tradeoffs

The scale fixture is explicitly **synthetic**: repeated readable text in 20 or
100 distinct manual identities, 40 pages each. It measures index mechanics, not
manufacturer coverage. Each query is repeated nine times.

| Synthetic corpus/query | Baseline median | Updated median |
| --- | ---: | ---: |
| 800 pages, precise component/section | 7.90 ms | 0.78 ms |
| 4,000 pages, precise component/section | 39.27 ms | 1.76 ms |
| 800 pages, terms appearing almost everywhere | 8.57 ms | 9.49 ms |
| 4,000 pages, terms appearing almost everywhere | 45.30 ms | 46.40 ms |

Postings substantially help selective searches. They cannot prune a query whose
terms occur throughout the corpus; those broad searches are slightly slower in
this run. Serialized indexes grow about 23% for the real pair and 11% for the
synthetic scale fixture. Building remains once per content/version; no additional
model or model weights are required. Cache validation and helper scope verification
remain deliberate costs; the measurements do not hide them for real helper calls.

## Focused regression checks

206 tests passed in the final eight-file focused run:

```sh
node --test tests/manual-retrieval.test.mjs tests/retrieval-cache.test.mjs \
  tests/helper-task-evidence.test.mjs tests/helper-dialogue-engine.test.mjs \
  tests/helpers-engine.test.mjs tests/manual-answers.test.mjs \
  tests/helper-search-planner.test.mjs tests/quick-questions-engine.test.mjs
```

New tests cover persisted postings, filtered scope, opposite operation ranking,
exact heading anchors, bounded heading inheritance, misleading numerical units,
legacy/corrupt cache rebuilding and prototype-property query words. Existing
checks still reject changed source bytes, invented values, reordered procedures,
other-helper evidence, unperformed tests and unrelated component precautions.

Browser/offline, full-suite and release verification are recorded by the main
release workflow separately. These Node checks do not constitute a publication,
APK build, physical-panel test or real iPhone test.

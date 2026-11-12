# Compact Panel Pals: manuals, retrieval and model training

## What downloading more manuals changes

A downloaded manual adds reference material. PDF extraction, OCR and indexing do not update a language model's weights. The same shared local model can search different document sets for different pals; each pal's selected scope remains the boundary. A larger library is useful only when FINDR can locate the applicable model, edition and complete procedure without mixing unrelated equipment.

Do not promise an answer to every panel question. A document may omit the procedure, a scan may be unreadable, or the installed firmware may differ. More documents can also introduce conflicting editions. Missing evidence remains missing.

## The practical architecture

1. Save the original PDF and its content hash once. Preserve the manufacturer, model coverage, revision, PDF page position and printed page label when known.
2. Process it once using the existing offline PDF/OCR pipeline and retain the searchable text. The index is disposable derived data; the PDF, job history and original readings are not.
3. Store an inverted index and source-linked headings. Exact model numbers, fault codes and terminal labels must remain searchable. Ordinary spelling tolerance must not change numeric model or address tokens.
4. Split a compound request into its requested tasks. Search the selected manuals, then try a bounded focused or heading search when evidence is incomplete. A search hit is not proof of a complete procedure.
5. Use reviewed, source-pinned procedure packs and menu references where available. Keep prerequisites, system effects, restoration and installed variant alongside the steps. Never infer a procedure from an isolated menu label.
6. Let the model interpret language within its demonstrated capability. Keep measurements, rules, evidence support and citations explicit. Do not let fluent wording turn a possible cause into a confirmed fault.
7. If the selected documents cannot answer, report the gap. Additional downloads require a relevant document and the engineer's choice. Searching forever or repeatedly recommending the same manual is not a recovery strategy.

The application searches document data. It does not give a local model arbitrary access to GitHub, executable source files, another pal's documents or cloud services. Instructions embedded in manuals remain untrusted reference text.

## What is worth evaluating next

**Small semantic search.** A question-to-paragraph encoder can supplement exact matching without replacing the chat model. The candidate evaluated for this release is Multi-QA MiniLM, a roughly 23 MB quantized encoder with 384-dimensional vectors. It is a retrieval model, not an assistant. Model names, codes, wiring labels and safety context still need exact evidence checks. See the measured research results before considering it for a phone download.

**Precomputed public knowledge packs.** For manuals that can legally be redistributed, a development machine can prepare headings, indexes and source-linked reviewed procedures. A phone then downloads and verifies the pack instead of rebuilding everything. Tie every derived item to its PDF hash and processor/index version; reject a mismatched edition. Do not publish user-uploaded manuals or job information as a shared pack.

**Task-specific training outside the phone.** Distillation or a small adapter may teach trade-language interpretation: splitting tasks, preserving negation, understanding corrections, resolving follow-ups and forming search queries. It should not memorise engineering specifications as the authority. Training needs reviewed examples, compute, a compatible exported model and a separate held-out evaluation. An adapter still needs its base model; it is not a way to eliminate that download.

## Evaluation before changing the model

Use questions separated from training data and cover whole manual families, not only rewordings of one known example. Measure relevant-section recall, complete procedure coverage, correct model/edition scope, citation support, unsupported-question abstention, task preservation, corrections, latency and peak memory. Include scans, tables, diagrams and conflicting editions.

Test a previously unseen PDF and a cold browser restart with networking disabled. A desktop browser result is not an iPhone result. Record the exact runtime, quantization, assets and device; include slow or failed cases rather than selecting only successful examples.

Release-specific evidence and primary-source research are in `research/retrieval-0.38.0/`. No new model training is claimed by this release.

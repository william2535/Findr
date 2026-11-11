# FINDR Helpers 0.32.0 — implementation and verification

Helpers combines questions and fault investigations around a saved system scope. Each helper has a selected manual library and separate job conversations. One installed language model is shared across helpers. Creating a helper does not train another model.

This note separates the implementation, completed measurements, deterministic regressions and browser verification limits. Test counts below are checkpoints from overlapping suites and must not be added together.

## Architecture

### Selecting the scope

`helpers-catalog.mjs` builds panel, device, archive-reference and family choices from the existing catalogue and reviewed relationships. Search recognises model spellings such as `MxPro4` and `MxPro 4`. The setup records the engineer's scope confirmation, name, variant and firmware where known.

Panel plans include linked manuals and SHA-pinned archive records with the exact manufacturer, discipline and model identity. That association does not certify accessory compatibility. Reviewed family relationships retain their document editions, evidence pages and limits. Unverified protocol collections are labelled as reference collections; a shared manufacturer or protocol string does not create a verified compatible system.

The download plan distinguishes required and optional documents, already-saved files, additional known bytes, missing size information, the shared model download and missing coverage. Missing or unreadable documents are retained as visible incomplete states.

### Actual files, processing and storage

`helpers-library.mjs` downloads real PDF bytes through the existing manual relay. Partial downloads are stored in 1 MiB chunks and resume using HTTP Range when supported. A server returning a complete response causes a safe restart. A file is saved only after the complete PDF passes the existing validation and pinned hash check where available. Failed, cancelled or unreadable files cannot complete a pack.

The library reuses the existing PDF extraction, English OCR, page-quality checks and searchable analysis/index caches. Successfully read text preserves PDF page identity. Low-quality or unreadable content is excluded from answer evidence. Identical PDFs and derived indexes are shared by their content hash. Returned index metadata is remapped to the selected catalogue alias without changing the shared stored index.

`helpers-store.mjs` stores helpers under `helpers-v1` in the existing IndexedDB settings store. Helper updates are atomic; a revision lease prevents a stale tab from overwriting a newer saved helper. Messages, draft state and confirmed observations belong to an individual conversation. New conversations start with a clean diagnostic context. Renaming, deletion, export and import preserve helper identity rules. Imports create a new helper, validate included PDFs and rebuild readiness rather than trusting imported ready flags. Deleting a helper retains shared PDFs, indexes and model files.

### Local inference and evidence

The shared model is **SmolLM2 360M Instruct, q8, WASM CPU**, pinned to revision `fe7c7db4c8921c9e3fa1c65cfd296fb3b1b1a8f9`. The five model/configuration/tokenizer files total **366,642,692 bytes**; the existing bundled runtime is **22,563,501 bytes**. WebGPU is not required. The manifest records exact file sizes and SHA-256 hashes in `public/app/local-language-resources.mjs`.

`helpers-engine.mjs` restricts retrieval to the current helper's selected manual IDs and expected content hashes, even when passed a wider list of shared indexes. It uses local keyword ranking, trade aliases and bounded spelling tolerance. The local model selects supporting passages and, for an investigation, an unanswered observation question. This release does not include a separate embedding model or claim embedding-based semantic retrieval.

Displayed technical wording comes from exact retrieved manual text or an existing reviewed procedure whose manual hash, pages and scope have been checked. Free-form model wording does not become a technical instruction. Unknown source IDs, unrelated models, unsupported operations, missing variant information and conflicting source evidence have explicit handling. Document instructions cannot override the assistant or widen its source scope.

The normal request includes source context once. It does not also pass the same evidence through `generateLocalReply`'s `context` argument. Requests are bounded for the existing 768-token input limit, with a smaller retry for a reported context-length error. Full conversation history remains stored separately from the bounded model input. Following the measured invalid-selection result described below, the model adapter constrains output to allowed source/observation labels using a token trie. It preserves model scores among allowed continuations and includes `NONE`; the engine still validates the complete result. The real model selected a valid saved-manual source in the subsequent browser check.

Fault investigations retain the exact reported symptom, observations, completed questions and readings. The model may select the next unanswered observation; a recorded reading remains a user report until the relevant evidence establishes its meaning. A possible cause is not silently promoted to a confirmed diagnosis.

### Readiness and interface

The helper cards and library distinguish **Ready offline**, **Preparing**, **Missing manuals**, and **AI unavailable**. The UI additionally gates Ready offline on the current application's service-worker verification, alongside the library's selected PDF/index and processing/model checks. Sharing a cached model or PDF does not widen another helper's retrieval scope.

An unsupported or unavailable model produces a labelled **Manual search** result. Failed source selection is also identified, rather than presented as a successful AI answer. There is no automatic cloud inference fallback.

The interface uses the existing FINDR wordmark, approved Manual Hunt identity, black/yellow styling, permanent slower animations and Ready for the job glow. The conversation uses genuine retrieval, download, processing and model activity. Earlier Fault Finder and Quick Questions histories remain accessible through Earlier saved sessions and can be continued with an explicitly selected helper scope.

## Completed checks and measurements

### Unit-test checkpoints

| Checkpoint | Observed result | Scope |
| --- | --- | --- |
| Earlier QA checkpoint of the three new Helpers suites plus local-model cache tests | **53 passed, 0 failed** | Before subsequent source-selection/library fixes; output in `targeted-tests.txt` |
| Final focused application suite rerun by QA | **118 passed, 0 failed** | Seven relevant suites run together after engine 2026-11-11.3 froze, 9.92 seconds; exact output in `focused-tests.txt` |
| Engine subset included in the final focused run | **34 passed** | Helpers source scope, strict selection, diagnostic relevance/context regressions and related engine cases |
| Latest store/library suite reported by its owner | **19 passed** | Storage, downloads, identity/scope and alias reuse, including subsequent catalogue regressions |
| Existing local-model cache suite run during QA reconnaissance | **9 passed** | Pinning, chunks, integrity states, missing/corrupt resources, local-only adapter and storage probe |

The store/library cases include interrupted transfer with Range resume, full-response restart, quota preflight, rejected PDF integrity, shared-file reuse, exact-model filtering, reviewed-family limits, unconfirmed protocol collections, per-helper alias remapping, unreadable documents, atomic saves, deletion isolation and revision conflicts.

Interruption, quota and unreadability checks used controlled response, storage and analysis fixtures. They were not live browser network interruption, a physically full device or a new unreadable scan on the tested browser. The native browser results below are reported separately.

The standalone acceptance script `scripts/verify-helpers032-browser.mjs` passed syntax and whitespace checks. It has not executed its acceptance flow in this environment: the installed headless Chromium launcher aborts before loading a page because UNIX socket creation is denied. This does not describe the shared Chrome browser, which the task owner is controlling through the supported CUA interface.

### Independently verified model and PDF bytes

All five pinned model files were downloaded using the inherited HTTPS configuration and matched their expected sizes and hashes. That proves the downloaded resources; it does not itself prove inference. Details are recorded in [`runtime-reconnaissance.json`](runtime-reconnaissance.json).

QA independently downloaded and hash-checked the first two catalogue PDFs below. The task owner downloaded the third from the existing published manual relay with HTTP 200 and confirmed its catalogue hash. All three were then imported through the ordinary Manuals UI for the browser checks.

| Catalogue record | Bytes | SHA-256 |
| --- | ---: | --- |
| `advanced-8f3ba6ecfc7f` — MxPro4 user guide | 927,783 | `5b0e02d2f682d6039474e94716b2f75f10868dc33fa3e6764c0b43c3c50b86a4` |
| `advanced-76cae27e9ec7` — MxPro4 installation reference | 2,252,899 | `cc6ac29723cd0a4535e9493e6aac45fe7e676760b52670726779506d2362065e` |
| `advanced-9e6af4fbfd7d` — MxPro4 installation manual | 1,781,694 | `b632b6574242523f30b5747ad74c6505ae5c77b6c41adf911bf813c759e3cb32` |

Poppler extraction preserved 40 and 72 PDF pages respectively for the tokenizer/retrieval experiment. Browser PDF extraction is verified separately by the browser flow.

### Actual pinned-tokenizer regression

The real tokenizer was loaded from the pinned local files. The new Helpers retrieval and request builder were exercised against the real MxPro PDF text:

| Request | Input tokens | Observation |
| --- | ---: | --- |
| Event history | 452 | User-guide PDF page 22 retrieved |
| Walk test | 410 | User-guide PDF page 31 retrieved |
| Battery fault | 492 | Candidate sections retrieved; a relevance defect was found in the later native test and repaired separately |
| Long field observations | 536 | Bounded request with retained observation context |
| Unsupported “quantum smoke compensator” | 169 | No supporting passage retrieved |

All requests were below 768 tokens. Every request contained one source-context block and no additional context argument. [`pinned-tokenizer-real-pdfs.json`](pinned-tokenizer-real-pdfs.json) records the exact questions, source pages and counts. This experiment ran tokenization and retrieval; it did not run model inference or prove browser offline operation.

## Current browser verification

The shared native Chrome browser is the current execution path for browser QA. A temporary development-only page can run the real app modules inside the normal `/app/` service-worker scope and report evidence through visible UI. Its model download uses the actual pinned endpoint. It does not fabricate replies, searches, downloads or progress.

The temporary page includes an offline check that requires `navigator.onLine === false` and a rejected unique uncached same-origin request before unloading and invoking the actual model. It also provides an app-frame reload check; that would not constitute a browser-process restart. **Neither offline action was executed:** the managed browser explicitly refused DevTools with “DevTools not allowed on this page” and “Your organization has blocked the use of DevTools on this page.” No policy bypass or simulated network result was used. Actual network-disabled inference and reopening therefore remain unverified in this environment.

| Browser check | Current recorded result |
| --- | --- |
| Normal helper creation and document preparation | **Creation and preparation passed using imported real PDFs.** MxPro4 scope with three selected documents was saved. The initial preview relay requests returned HTTP 502 and correctly stayed incomplete. After the three hash-checked PDFs were imported through Manuals, Helpers reused them and performed real extraction, OCR where needed and indexing. Direct preview relay delivery remains a separate limitation. |
| Actual pinned-model download in shared Chrome | **Passed.** All five pinned files, **366,642,692 bytes**, downloaded and verified in **47.9 seconds** through the ordinary model endpoint. This alone does not prove inference. |
| Actual local inference and supported citation | **Passed after constrained-selection repair.** The real model chose `S1` for the event-history question, returned `mode: local-ai` / `modelUsed: true`, and cited the saved MxPro4 user guide at PDF page **22**. Actual metrics were 439 input tokens and 3 output tokens. The earlier invalid-selection result was retained as failure evidence. |
| Saved citation opens the correct PDF page | **Passed.** Citation opened the saved user-guide PDF at page **31 of 40**, confirmed in the reader UI. |
| Saved conversation reload and separate new job | **Passed.** The same saved conversation returned after normal page reload. New conversation opened empty; Saved conversations showed the original walk-test job and the separate telemetry-question job. |
| Multi-step fault investigation | **Real four-turn run exposed defects; final deterministic regressions passed.** The narrow browser harness missed irrelevant cable/contents evidence and a misassigned “No checks yet” answer. Engine 2026-11-11.3 repairs were checked against all three real PDFs and exact sequence regressions. The browser sequence was not rerun after that repair. |
| Network-disabled inference after worker unload | **Not executed — environment blocked.** Managed Chrome disallowed DevTools, and the standalone browser could not launch under the environment's socket restriction. No actual offline inference pass is claimed. |
| App reinitialization while offline | **Not executed — environment blocked.** App/PDF/OCR/model checks completed and the helper displayed Ready offline, but actual network-disabled reopening was not tested. |
| Two helpers share files while keeping source scopes separate | **Browser file reuse passed.** An imported helper initially remained Preparing, then preparation reused the three PDFs/indexes, reached Ready offline and showed 0 KB additional download with the saved PDF count still three. Per-helper retrieval isolation passed controlled automated tests; a separate browser test with different source scopes was not performed. |
| Unsupported question | **Passed in normal UI.** “How do I enable quantum telemetry?” received “Not established in these manuals.” |
| Clearly labelled unavailable-AI fallback | **Controlled engine tests passed.** The normal UI also showed a labelled Manual search fallback after invalid model output. A physical unsupported device was not tested. |

Browser observations and their execution limits are recorded in [`browser-native.json`](browser-native.json). Earlier 0.27/0.31 JSON files establish historical tests of those versions and are not reused as proof of the new Helpers release. The task owner reported a successful canonical production build before the final diagnostic repair; the publication workflow performs the final rebuild separately.

The captured preconstraint event-history run produced **439 input tokens and 24 output tokens**. Model loading took **39.6 seconds**, generation **107.4 seconds**, and the whole QA turn **152.8 seconds**. Its output echoed part of the question instead of choosing a source. The engine rejected it and labelled the result Manual search. The QA action's `passed` field means the raw diagnostic capture completed; it does not mean that the answer passed source selection. The exact prompt, output and metrics are in [`browser-preconstraint-selection.json`](browser-preconstraint-selection.json).

The repaired run used engine **2026-11-11.2** and verified, controlling app shell **a289b667d3b4**. The model's token scores selected `S1` from `S1`, `S2`, `S3`, and `NONE`; the citation matched the saved user-guide hash and page 22. It generated **3 tokens** from **439 input tokens**. This cold run took **172.0 seconds overall**, including **123.1 seconds loading** and **40.9 seconds generating**. It demonstrates actual supported local inference, but it is slow on this shared Linux browser and does not establish acceptable speed or memory use on a phone. Exact metrics and source identity are in [`browser-constrained-model.json`](browser-constrained-model.json).

The later real diagnostic run retained four observations and produced source/next-question selections on all four turns. It took **332.2 seconds**, with generation ranging from **46.1 to 119.9 seconds** per turn while the model was already loaded. Manual review found two defects that the initial narrow harness assertion did not catch: weak retrieval admitted battery-cable installation text and a table of contents as fault evidence; an out-of-order “No checks yet” response was assigned to the pending location field and then checks were asked about again. The complete failed-quality run is retained in [`browser-diagnostic-before-relevance-fix.json`](browser-diagnostic-before-relevance-fix.json). It proves actual model execution and retained context, but it does not prove a sound investigation.

Final engine **2026-11-11.3** passed deterministic checks using the full text of all three hash-verified PDFs. Both battery-fault reports now return no misleading passages; event history still retrieves user-guide page 22 first and walk test page 31 first. Contents pages are excluded while the real device-address table on page 20 remains searchable. Exact conversation regressions preserve “No checks yet” as a checks observation without consuming the pending location question, and keep a measured no-voltage report separate from a Yes/No fault-presence answer. [`diagnostic-retrieval-regression.json`](diagnostic-retrieval-regression.json) records the real-PDF results; `focused-tests.txt` records the final 118 passing tests. These are **deterministic retrieval/context tests**, with no claim of a subsequent browser or model rerun.

The OCR failure identified an existing preview transport difference: Vite added `Content-Encoding: gzip` to the compressed language data, so the browser decoded it before the service worker compared the original-file hash. The published site serves that data without the encoding header and matched the expected hash in both normal and compression-enabled HTTPS requests. A development-only middleware now serves the exact OCR file with the same binary-data semantics. After the canonical preview restart, the actual browser response was HTTP 200, had no encoding header, and matched all **1,967,599** compressed bytes and the expected SHA-256. No manifest hash, asset bytes or service-worker integrity rule was relaxed. Details are in [`ocr-asset-transport.json`](ocr-asset-transport.json), and the original failure was retained in [`browser-sw-pre-repair.json`](browser-sw-pre-repair.json).

## Catalogue coverage and limits

The current catalogue exposes **10 reviewed family scopes, all in Fire**, using **34 distinct manual records**. These are reviewed document collections with explicit limits, not blanket compatibility approval for a brand or protocol. The data comes from `public/app/data/fire-service-manuals.json` and the current `buildHelperPlan()` output. Every one of the 34 has a downloadable catalogue reference; this task did not download and test all of them.

| Reviewed scope | Manuals in its plan | Main scope limit |
| --- | ---: | --- |
| XFP 16 zone — Apollo/Hochiki | 9 | Single-loop XFP501E/X and XFP501E/H; CAST is separate |
| XFP 32 zone — Apollo/Hochiki | 9 | Confirm protocol and fitted one/two-loop configuration; CAST is separate |
| XFP CAST 16 zone | 6 | Main engineering manual covers XFP501E/CA; other references retain their individual scope |
| XFP CAST 32 zone | 6 | XFP501/CA and XFP502/CA; fitted loop count and edition matter |
| XFP 16-zone repeater | 1 | Historical repeater document; main-panel functions do not transfer |
| XFP 32-zone repeater | 1 | Historical repeater document; no exact catalogue image is bound |
| Original Twinflex V3 | 1 | Separate from TWINFLEXpro and pro² firmware V3.00+ |
| TWINFLEXpro | 6 | Earlier V1.00+/V2.00+ editions remain separate from pro² |
| TWINFLEXpro² | 12 | Main manuals target V3.00+; expansion cards only apply to their named four-zone model |
| TWINFLEXpro² repeater | 2 | Repeater instructions only |

There are **16 broader protocol-reference collections**, all labelled unconfirmed. Examples include Gent Vigilon, Apollo XP95/Discovery/CoreProtocol, C-TEC CAST device references, Ajax Jeweller, domestic hardwired/SmartLINK alarms, Pyronix Enforcer WE, Protec 6000/6000PLUS, Twinflex two-wire, Sita, EMS FireCell, Hochiki ESP/CDX and Nittan Evolution. Individual panel/device helpers remain limited to their linked or exact-model documents unless reviewed relationships exist. MxPro4's installation/user/reference collection does not establish its entire compatible device family.

Concrete gaps remain:

- **Nine device entries have no linked manuals:** Orisec DT-200, W-MC-C, SD-G2/SD-G3 and ES-120/ES-130; Pyronix KX12DQ-WE, XDL12TT-WE, MC1Z1-WE, MCEXTERNAL-WE and NANO/SHOCK-WE.
- The **Pyronix Enforcer WE protocol collection has no linked downloadable documents**.
- **68 panel entries lack direct `record_ids` links.** Exact-model catalogue matching can still supply documents for some, so this does not mean 68 empty plans.
- There are **no reviewed family definitions for Intruder, CCTV or Access Control** in the current family dataset.
- Variant, firmware and edition coverage is limited to what each manual establishes. Arbitrary installed combinations remain unconfirmed.

## Device and verification limits

The small local model can return an unusable selection. Such a result retains the manual-search fallback; having generated tokens is not enough to count as a source-supported answer. Tests of one MxPro helper do not establish correct coverage for every manufacturer, protocol or firmware.

No physical iPhone, installed iOS PWA, battery measurement or peak-memory measurement is established by this run. Shared Linux Chrome results describe that tested browser. Headless acceptance and any WebKit results must be reported independently if they are run later.

The temporary `public/__qa_helpers032/` directory was removed from public assets and retained as source under `research/helpers-0.32.0/native-browser-harness/`. It was outside `/app/` and was never part of the app's precache. The retained source documents how the real-component browser checks ran; no QA endpoint or test hook is part of the published application.

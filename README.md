## Home banner and compact view buttons — web 0.39.2

Home uses the owner-supplied Zone Sketch banner artwork as the link to its existing beta tester page. The image is bundled unchanged for offline display. Detailed and Compact grid are now small icon-only buttons, with accessible names, hover titles, 44px tap targets and the same saved preference. Android remains **0.37.0**.

## Full timed practice papers — web 0.39.1

**Quizzes → 10 full papers** adds a third option alongside the 31 subject quizzes and 20 short mocks. Each generated paper has 60 different questions from the existing reviewed bank, mixed across subjects. All 196 points appear across the ten papers. The one-hour practice clock starts on Start, continues while away, survives reload and submits the saved choices when it expires.

You can skip, revisit and change answers before submission. Correctness is hidden until you finish; the result distinguishes correct, incorrect and unanswered questions, with the supporting explanations and sources for all 60. The existing instant-feedback learning quizzes and understanding circles remain separate.

Highfield’s current FESS EPA Kit v5.0 specifies **60 questions in 75 minutes**. FINDR uses the requested **60-minute practice timer**, clearly labelled as unofficial. Confirm your enrolled assessment version with your provider. The saved deadline uses the device clock; this offline learning tool is not a proctored exam or a clock-tampering prevention system.

[Generation and source evidence](research/fess-0.39.1/paper-generation.md). Android remains **0.37.0**.

## Subject quizzes, FESS mocks and Resistor Lab — web 0.39.0

**Quizzes** is the final navigation entry. Choose from 31 subject quizzes (4–8 questions, about five minutes at your own pace), or keep using the **20 mocks** option. Together each option covers all 196 points in the supplied revision guide. Correct answers play a short ding; wrong answers show the correction and wait for you to select it. Completion reaches 100% after corrections while the original first-attempt score stays separate.

Tap **I understand** as each explanation clicks. The subject quiz’s circle becomes greener, finishing its questions earns a tick, and explicitly confirming the whole section turns the circle fully green. Starting another attempt keeps previously confirmed understanding visible. Runs, answers, understanding and the question/explanation edition are saved locally. Every review includes reasons for all four choices, source references and visible revision notes where the older guide needed qualification or correction.

**Home → Tool box → Resistor lab** finds combinations from the resistors you have, or lets you build and rearrange series/parallel groups in a sandbox. It shows the equivalent resistance live, supports zero-ohm links and open circuits, and keeps your circuit on this device. Search is explicitly bounded to 12 available pieces and up to four per combination; it does not claim to solve every possible network, power rating or tolerance. [Tool details](docs/resistor-lab.md).

These features are included in the app update and do not need an AI model or manual download. External revision-source links need a connection. Current Highfield, Skills England, FIA, Hochiki, NSI and ECS resources are linked with their assessment scope and version; confirm your enrolled EPA with your training provider. FINDR’s learning mocks are not an official paper or exam-grade prediction.

The Android download remains **0.37.0**. Release verification and limitations are recorded in [the FESS research folder](research/fess-0.39.0/).

## Manual retrieval and downloadable Tool box — web 0.38.0

Panel Pals now builds a versioned inverted index with source-linked heading hints and uses a bounded local search planner. The planner retains the original question, searches only the pal’s selected readable manuals, and records up to three real search attempts. Existing model, citation, variant and diagnostic safeguards remain in place; no new model training or larger model download is claimed. See [the compact assistant plan](docs/COMPACT-PANEL-PALS.md) and [measured retrieval research](research/retrieval-0.38.0/).

Open the small Tool box icon on Home, then **Download tool box pack**. The optional 16,473-byte pack contains six additional calculators and six original visual guides. Actual files are fetched from an immutable GitHub commit, verified and stored locally, with cancellation, resume and safe retries. The original four calculators stay included. See [pack contents and maintenance](docs/toolbox-packs.md) and [technical source research](research/toolbox-pack-0.38.0/source-research.md).

This release updates the web/PWA. The signed Android download remains **0.37.0**; it has not been rebuilt or relabelled. Browser and release verification are recorded in `research/toolbox-pack-0.38.0/`.

## Home layout — web 0.37.1

Home’s Tool box is now a small48px icon-only square just below the view switch. Its native dropdown is closed on first use; the icon retains a Tool box label for assistive technology and a hover tooltip. The new **Detailed / Compact grid** switch reduces card padding, arranges shortcuts and packs into columns, and folds the longer installation/about guides in Compact view. Text remains readable and interactive controls retain touch targets; this does not change browser zoom. Layout and dropdown state are saved locally, independently of manuals, jobs and calculator drafts. The existing yellow heading glow remains. Occasional soft yellow sparks now brighten, fade and sometimes shoot through the background; they pause while hidden or when reduced motion is requested. Home also links to the verified [Zone Sketch Tester Hub](https://william2535.github.io/FIRE-ZONE-PLAN-APP/beta.html) in a separate tab.

This is a web/PWA layout update. The verified signed Android download remains0.37.0; it has not been rebuilt or relabelled. Browser checks and measured page-height changes are in `research/home-grid-0.37.1/`.

## Tool box and Android update — 0.37.0

Home now has a **Tool box** with fire-alarm battery capacity (24/72/custom hours), DC voltage drop, 4/5/6-band resistor colours and conductor resistance / R1 + R2. The calculators run locally, save their inputs separately from fault logs, and show formulas, assumptions and sources. They do not establish equipment limits or compliance. [Calculation references](research/toolbox-0.37.0/calculators-and-sources.md).

Android is updated to **0.37.0 / versionCode 27**, bundling the same application with the existing package name, storage origin and signing identity. It supports the current import types, Save As exports and the explicitly selected online-AI relay. The complete APK is hosted from its verified GitHub backup commit because it exceeds the website’s 25 MiB static-file limit; the versioned website download redirects to that exact asset. [Build, verification and limitations](research/toolbox-0.37.0/README.md). Earlier release notes below describe their historical versions.

## OpenAI key option — web 0.36.0

**Online AI** now offers **Groq** and **OpenAI**, selected explicitly for each Panel Pal conversation. OpenAI uses the fixed GPT-6 Luna model with an individual API key held only in this tab’s memory. It requires a paid-API acknowledgement and data-sharing consent; a ChatGPT subscription does not cover API charges. No provider is selected as an automatic fallback, and keys, cancellation and reported usage stay separate between providers.

Saved manual grounding, citations and diagnostic evidence checks remain in place. OpenAI’s top usage display reports remaining requests/minute and tokens/minute; it does not claim to show billing credits. Groq’s daily-request/minute-token display remains compatible. New and imported conversations still require their own explicit online choice. [OpenAI setup](docs/openai-panel-pals.md) · [Checks and limitations](research/openai-panel-pals-0.36.0/README.md). Authenticated OpenAI responses were not tested without a real key; provider test responses are synthetic. Android remains 0.14.1.

## Kanye portrait — web 0.35.2

The last Panel Pal icon is now **Kanye**, using a bundled 30.5 KB public-domain Official White House photo. Its existing saved slot ID is retained, so older selections and exports continue to work. Source and licence are recorded in `public/app/icons/pals/CREDITS.json`. Other portraits, colours and conversations are unchanged. Android remains 0.14.1.

## Online allowance and realistic portraits — web 0.35.1

A compact strip at the top shows Groq’s last reported remaining daily requests and tokens/minute, with separate reset countdowns. It updates from normal reply/error headers without any polling or extra model requests. Missing balances remain unknown; elapsed timers never refill an invented balance. A fresh tab or changed key starts without an account snapshot. Groq does not supply the other two remaining balances in these headers.

Panel Pals’ six scientists now use bundled public-domain photos or historical painted portraits (299 KB total), with source credits. OG and Panel pal stay unchanged, as do saved IDs and colours. [Portrait sources and checks](research/realistic-panel-pals-0.35.1/README.md) · [Usage verification](research/online-usage-0.35.1/README.md). Android remains 0.14.1.

## Optional online Panel Pals — web 0.35.0

Panel Pals now offer **Offline AI**, **Online AI** and **Manual search** per conversation. Online mode uses Groq’s hosted open-weight GPT-OSS 120B model, so no language-model download is needed on the phone. It requires your own Groq Free-plan account/key, explicit data-sharing consent and an internet connection. FINDR cannot check a key’s billing tier; a paid-account key may incur charges. There is no automatic provider switch, paid upgrade or online fallback.

Keys stay in memory for the current browser tab, never in exports or saved conversations. The online model interprets requests and selects scoped manual evidence; existing citations, technical evidence checks and diagnostic records remain in force. New conversations and imported backups start offline unless deliberately changed. Local resources includes explicit per-pack removal so large local models can be removed while retaining PDFs, jobs, indexes and runtime resources.

[Setup, data handling and limits](docs/online-panel-pals.md). [Verification](research/online-panel-pals-0.35.0/README.md). Authenticated Groq inference and provider response performance remain unverified without a real key; automated provider responses are synthetic. Android remains 0.14.1.

## Genius portraits for Panel Pals — web 0.34.1

**Customise** keeps the original **OG** terminal and **Panel pal** robot, with six new original line portraits: **Stephen Hawking, Albert Einstein, Isaac Newton, Nikola Tesla, Marie Curie and Ada Lovelace**. Portraits follow the selected colour on cards, conversation headers, replies and the fault handover. All graphics are bundled SVG; no image download or network connection is needed.

Retired choices map consistently when loading older pals or backups: Sparky → Tesla, Little gremlin → Hawking, Tea break → Einstein, Cone head → Newton, Night owl → Curie and Wire wizard → Lovelace. Existing colours, saved conversations, manuals and fault records are preserved. This changes appearance only; it does not change the pal's model, behaviour or diagnostic knowledge. Android remains 0.14.1.

## Multi-task Panel Pals — web 0.34.0

Compound requests now retain an ordered task plan, separate manual evidence and missing details for each task. Step-number follow-ups, explicit corrections, component changes and raw observations stay with the current saved conversation. Requested work is never marked as performed. Reviewed MxPro5 user-guide procedures cover sounder and individual-input disabling/enabling; physical device replacement still requires the relevant device/protocol instructions. Generic outputs and unspecified devices are clarified rather than silently mapped to a different operation.

Everything remains local. The existing compact reference model stays the default. **Local resources** offers an explicitly experimental **Qwen3.5-2B Q4_K_M** profile: 1,280,835,840 bytes plus 29,395,450 bytes of bundled runtime assets. Download, integrity verification and a real local hardware/syntax trial must succeed before explicit activation. That trial does not certify language quality. Saved PDFs, compact-model files and conversations are retained when switching or cancelling.

Measured raw semantic results were mixed (3/5 benchmark requests understood; correction and external-PSU requests failed). The application validates model interpretation against the actual request and retains an accurately labelled manual-search fallback. CPU replies can exceed a minute and peak memory in the tested Chromium renderer was about 2.2 GiB. No general conversational-intelligence or physical-iPhone capability claim is made. No cloud inference is used. See [implementation, evidence and limits](research/panel-pals-0.34.0/README.md). Android remains 0.14.1.

## Panel Pals and support-call handover — web 0.33.0

Helpers are now **Panel Pals**. Existing saved pals, conversations, manuals, exports and internal routes remain compatible. A pal's chosen icon sits beside its replies, with more conversational wording around the same sourced information and evidence rules.

**Give up** saves an unresolved investigation, plays a short skippable red reaction, then returns to a calm support screen. Reduced motion skips the shaking and pulses. **Prepare for call** collects the fault, recorded observations, tests, raw readings, corrections and outstanding work in a readable timeline. Missing reasons or test context remain explicitly unrecorded; a suggested check never becomes a performed test.

Support contacts are read from the pal's saved manual pages, with their title and page available to check. A number printed in an older manual is not a claim of current verification. Missing, ambiguous or uncertain contact details remain visible instead of supplying a guessed helpline. [Checks and limitations](research/panel-pals-0.33.0/README.md). Android remains 0.14.1.

## Make your helpers yours — web 0.32.8

Each helper can have its own playful icon and accent colour. Open **Customise**, preview the choices and save; the appearance follows that helper on its card and conversation. Existing helpers keep the default FINDR yellow terminal icon. Choices are stored locally and travel with helper exports without changing manuals, conversations or diagnostic evidence. The surrounding FINDR branding stays black and yellow.

[Browser checks and limitations](research/helper-customisation-0.32.8/README.md). Android remains 0.14.1.

## Helper source dropdowns — web 0.32.7

Helper replies keep their citations in a compact, initially closed **Sources** disclosure. Open it to see the actual supporting manuals, PDF pages, recorded sections/editions and quoted text. Sources with no valid PDF page do not acquire an invented page number. The same saved PDF and edition checks remain in use.

Opening sources and supporting text stays stable while that conversation updates or a PDF is opened. Existing messages, typing, downloaded files and diagnostic context are preserved. [Browser checks and limitations](research/helper-sources-0.32.7/README.md). The GitHub source backup is refreshed with this release; Android remains 0.14.1.

## Browser activation wait — web 0.32.6

The updater distinguishes a verified release waiting for native browser activation from an unresponsive verification request. Chromium can defer activation while the previous worker finishes ongoing work. The waiting worker now reports successful cache verification before awaiting native activation, and the launcher allows that verified phase a bounded six minutes within its existing overall limit. Repeated messages cannot extend the allowance. The app still opens only after actual activation and an exact-version readiness check; the waiting message does not claim the update is active.

## Verified update activation — web 0.32.5

The final live update check exposed a fully downloaded release remaining in the browser's waiting state. The launcher now requests activation of that waiting worker explicitly, with the required release version. The worker verifies the release and its saved asset set before accepting the request. Opening still waits for actual activation and a separate exact-version readiness reply from the active worker. The request is bounded; a browser that cannot activate the release shows an actionable update error instead of an indefinite spinner. This continues the local AI startup and recovery fixes below and reuses the same saved model, manuals, conversations and fault logs.

## App update feedback — web 0.32.4

The release-page updater now waits while real download progress or worker-state advancement continues, instead of timing out after a fixed minute. It has a separate overall deadline, reports actual file counts, and distinguishes downloading, finishing, activating and checking the saved release. It does not show 100% for an incomplete rounded count. Failed updates retain their exact error and a readable **Update details** section. The exact-version and verified-cache gate remains required; no saved stores are cleared.

A pending question is no longer described as interrupted while its reply is actively running. The local AI runtime and recovery changes from 0.32.3 are retained. Live Chrome verification reused the existing model download, completed a genuine local-model diagnostic reply, restored it after reload, and detected a deliberately interrupted subsequent model startup with the question preserved and automatic inference paused. This is a browser check, not a physical iPhone or network-disabled inference result. Details and limits are recorded in [the startup verification notes](research/local-language-0.32.4/README.md).

## Local AI startup recovery — web 0.32.3

This update addresses the reported page reload while **Loading the local language model into memory…**. The recording establishes the failure stage, not its exact cause or a universal iPhone memory limit.

The CPU worker now uses explicit paths to the matching **non-JSEP ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4** runtime. Its package's previous JSEP assets were byte-identical to the existing Transformers.js 3.8.1 distribution before replacement. The CPU WASM is 11,133,407 bytes instead of 21,596,019 bytes. The model itself, its pinned revision, all hashes and all saved-part cache identities remain unchanged. Updating the app does not require another 366 MB model download.

Cached model parts stream directly into the loader under backpressure, without rebuilding each part in another 8 MiB buffer. Selected manual analyses load once per question. A complete reviewed procedure is returned directly only after its existing document-hash, page-text, exact-model and variant checks; conflicting selected editions remain visible. These replies explicitly say **MANUAL SEARCH · NO AI**, retain all steps, precautions and citations, and do not allocate the model just to repeat verified instructions. Other supported requests still use the actual local model to select scoped source evidence.

Before inference, FINDR commits a small tab-scoped recovery checkpoint containing only lifecycle metadata. Reloading after an unfinished attempt keeps AI paused and offers **Search saved manuals** for the saved question. **Enable local AI retry** clears that guard only after an explicit action and does not submit or load the model by itself. Successful replies and normal cancellation settle the checkpoint; context-limit retries retain the worker instead of loading the same model twice. No helper, PDF, model part, conversation or fault log is deleted by recovery.

Focused software checks cover interrupted startup across fresh application instances, explicit retry, failed checkpoint writes, cancelled/late worker events, a smaller context retry, direct cache streaming and cancellation, verified procedure scope/edition checks, and retained download behavior. Runtime assets pass their pinned hashes and the CPU WASM compiles. Lifecycle tests use fake workers and metadata-only caches; they are not physical-device inference tests. The browser still needs substantial memory to initialize the 360M model. Physical iPhone reliability and a network-disabled inference run must be reported separately from these checks. Web/PWA release; Android APK remains 0.14.1.

## Resumable local model downloads — web 0.32.2

The optional model downloader now requests one existing 8 MiB part at a time, validates each HTTP range, retries interrupted network transfers within a bounded limit, and preserves the original cache keys and saved parts. A host that ignores ranges is handled by an explicit streaming fallback, with rereading shown separately from saved progress. Actual incoming bytes, saving, retries and final integrity checks are visible. The complete file still has to match its pinned SHA-256 before it can be used.

Network, browser storage and readiness waits have deadlines. **Pause download** unlocks the interface immediately and **Resume download** reuses saved parts. Returning to the foreground detects an expired download; repeated unchanged progress cannot keep it alive indefinitely. A stuck conversation-event callback or late result from a cancelled attempt cannot hold or overwrite the next attempt. Saved manuals, helpers and conversations are retained.

Injected failure tests cover stalled headers/body reads/cache writes, partial-transfer retry, malformed ranges, hosts ignoring ranges, cancellation, late results, stalled readiness checks and final integrity rejection. These are software checks; physical iPhone download and inference capability are not established by them. The model, its size and its inference capabilities are unchanged. Web/PWA release; Android APK remains 0.14.1.

## Helper fault matrix — web 0.32.1

Each helper now includes **I want to fault find**. This opens the original adaptive Yes / No / I don’t know question matrix within the current conversation, alongside the existing test readings, checks, work log and handover tools. Every job has its own saved fault record and downloadable log. Starting a new conversation creates a separate job; returning to an earlier conversation restores its questions and tests.

The matrix offers possible causes for further investigation. Its reference examples name their applicable models; the matrix does not establish compatibility or turn a reading into a confirmed repair. Manual-grounded chat remains available in the same helper.

## Helpers — web 0.32.0

**Helpers** combines Fault Finder and Quick Questions into one saved system workspace. Create a helper for an exact panel, device, documented family or explicitly unconfirmed protocol reference collection; confirm its scope and select real required/optional PDFs. Each helper has its own document allowlist and independent saved conversations. The same PDF bytes, extracted text/index and shared language model are reused where applicable.

The existing **SmolLM2-360M-Instruct ONNX int8** engine runs locally with a pinned, hash-checked **366,642,692-byte** model pack. It selects relevant saved manual evidence and the next useful diagnostic observation. Technical answers use exact PDF text or existing procedures checked against the precise PDF hash and cited pages. Sources enter the compact model request once. No model is trained per helper, no cloud inference is used, and unsupported/failed inference is explicitly labelled **Manual search**. Keyword matching, documented aliases and local model selection are supported; this release does not claim an embedding index or unrestricted generative diagnosis.

Downloads save actual byte chunks and resume using HTTP Range where the publisher supports it. A server that ignores Range safely restarts that file. Incomplete, corrupt, unreadable or unindexed PDFs cannot make a pack complete. PDF text extraction and English OCR use the existing local processing engine. **Ready offline** also requires the checked shared model, runtime and current app shell. Storage displays separate helper documents and shared resources; deleting a helper retains PDFs, indexes and the model. Exports optionally include actual PDFs, and imported readiness flags are discarded and rebuilt.

Earlier questions and fault records remain available through **Helpers → Earlier saved sessions**, with a path to continue them after choosing the exact helper scope. Existing saved manuals are retained. The black/yellow design, approved Manual Hunt mark, FINDR wordmark, slower always-enabled effects and Ready for the job glow remain. The signed Android APK remains **0.14.1**; this is a web/PWA release.

[Implementation, measured checks and limitations](research/helpers-0.32.0/README.md). Family coverage is limited to documented catalogue relationships; sharing a manufacturer or protocol label does not establish compatibility. Device CPU, memory, browser storage and OCR quality remain practical limits.

## Quick Questions retrieval and clearer headings — web 0.31.0

Quick Questions now keeps useful, cited manual passages instead of treating every partial procedure as a reason to request another download. Question-first requests can reach the installed local model; its output remains constrained to supported source material. Equipment names no longer dominate passage ranking, documented manufacturer aliases and model-family coverage are recognised consistently, and follow-ups retain the original task. The classifier now recognises the Vigilon commissioning cover's actual model wording. Saved page text can update its identity without repeating PDF extraction or OCR. Previously rejected attached manuals are rechecked once with the updated answer rules, preserving the conversation and historical page references.

The reported **“Putting a Gent Vigilon on walk test”** journey uses the real **4188-856 issue 7 (07/15)** commissioning manual. Its reviewed EN Zone Test route is restricted to the documented EN Vigilon 4/6-loop / Compact MCC/MCB V4.53-or-higher menu map; FINDR asks for that variant before releasing the steps. The procedure includes engineer access, prerequisites, test effects, the Off action and supporting pages. BS Commission mode and other variants are not silently assigned this route.

Home and emulator headings use straightforward field-tool wording. General headings, navigation and labels now use a clean system sans-serif; the terminal conversation retains monospace text. The black, white and yellow colours, animations, navigation, saved PDFs and job histories are retained.

[Workflow verification](research/questions-0.31.0/README.md) · [Gent source review](research/gent-walk-0.31.0/README.md) · [Actual local-model measurements and limits](research/local-language-0.31.0/README.md). The existing optional SmolLM2 pack is unchanged: this repairs retrieval and conversation routing, and does not claim a more capable replacement model. Web only; signed Android remains 0.14.1.

## Visible interface motion — web 0.30.1

The Home title, main buttons and selected navigation tab now carry visible light sweeps from the first screen, including on touch devices. The earlier release's animation was too easy to miss: its main card was below the initial phone view and the sweeps had long quiet gaps. Shorter cycles and stronger highlights keep FINDR's black, white and yellow palette.

Help → **Interface effects** shows the effective On, Off or system Reduce Motion state. **Replay effects** closes Help and restarts the visible effects. System reduced motion remains respected; offscreen/hidden-page animation pauses, and manual pages, panel indicators and terminal history retain their existing behaviour.

[Rendered-pixel verification](research/motion-0.30.1/README.md). Web only; signed Android remains 0.14.1.

## Interface motion — web 0.30.0

FINDR now uses restrained gloss sweeps, travelling edge highlights, short card entrances, hover lifts, tactile buttons and 170–240 ms sheet/dialog transitions. The reference is the user’s [Zone Sketch](https://github.com/william2535/FIRE-ZONE-PLAN-APP/blob/main/ZoneSketch.html): its slow gloss and edge traces are adapted to FINDR’s neutral black/white and yellow palette.

Help → **Interface effects** switches the decoration off and saves the preference locally. System reduced-motion settings override it. Effects pause offscreen and in hidden tabs; PDF pages, physical panel indicators and historical terminal text are excluded. Existing terminal typing retains its own skip/reduced-motion controls. Navigation order and the understated Home joke remain intact.

[Browser verification and scope](research/motion-0.30.0/README.md). Web only; signed Android remains 0.14.1.

## Navigation and Home copy — web 0.29.1

Main navigation is now Home → Manuals → Emulators → Fault finder → Quick Questions → Menu maps on desktop and mobile. Home keeps the project’s existing voice and branding without explaining the dating-app joke.

## Question-first Quick Questions — web 0.29.0

Ask the question first. FINDR extracts the equipment and operation, checks saved manuals, and searches the existing Manual Archives catalogue when needed. A proposed document shows its model coverage and needs **Yes** before downloading. Reading the file automatically resumes the original question; readable saved manuals and extracted text are reused. **Choose another**, upload, pending offline questions, corrections and contextual follow-ups stay in the same terminal. Fault Finder remains a separate investigation and history.

The MxPro walk-test example uses real Advanced user guides **680-015 revision 10 (MxPro4, PDF pages 31–32)** and **680-166 revision 04 (MxPro5, PDF pages 33–34)**. Reviewed steps are released only after the downloaded PDF hash and each cited page quote match. The answer states the document's scope, authorised access, system effects and finish-test action; downloading a guide does not confirm the installed panel. These sourced procedures do not require the optional local model. Other questions retain conservative document extraction and honest missing-evidence handling.

[Source verification](research/mxpro-questions-0.29.0/source-README.md) · [Workflow checks and limits](research/questions-0.29.0/README.md). This replaces the mandatory saved-manual picker for **new** questions introduced in 0.27.1; explicit MANUALS and older saved conversations remain available. Existing PDFs, jobs, emulators and packs retain their storage identities. Signed Android remains 0.14.1.

## Neutral theme and Tyco Minerva MX / MX2 — web 0.28.0

FINDR now uses neutral black and charcoal surfaces with white text and yellow accents. The terminal animation stays; its green tint is removed. Physical panel LCDs and status LEDs retain their equipment colours.

The **Minerva MX / MX2** emulator joins the grid/list library with separate fascia choices, **HINTS**, **FIND A MENU**, guided tasks and a searchable menu map. Its source is Tyco Operating Instructions **17A-05-O Issue 5 (11/04), Firmware 5.0**, covering MX1000/MX4000/MX4000M and MX2-100/MX2-200. Source pages and scope stay visible. Diagnostics details and an unspecified maintenance selector are labelled reference boundaries rather than invented controls. The Tyco pack gains the already-catalogued operating manual and two manufacturer panel figures.

[Source review and coverage](research/minerva-0.28.0/README.md) · [Release verification](research/minerva-0.28.0/RELEASE.md).

## Saved-manual choice in Quick Questions — web 0.27.1

Ask your question, then choose the saved manual it concerns. FINDR keeps the original question while it reads the document and confirms the equipment. Follow-ups reuse that confirmed manual; a new standalone question or an explicit equipment change opens the saved library again. No manual is selected automatically. With an empty library, upload a PDF or find one in Manual Archives.

[Verification](research/questions-0.27.1/README.md). Existing manuals, conversations and Fault Finder jobs are preserved.

## Saved-PDF repair and Quick Questions — web 0.27.0

**Fault Finder** and **Quick Questions** have separate terminal conversations and histories, sharing saved PDFs, local text/OCR processing, retrieval and optional local language inference. Quick Questions accepts a question first, requests the applicable manual, confirms equipment, shows page-linked source extracts and supports follow-ups. An explicit transfer creates a separate Fault Finder job; previous observations remain context, never completed tests.

The iPhone-style Advanced MxPro4 failure was reproduced in WebKit: PDF.js text extraction iterated a ReadableStream asynchronously where the runtime lacks that API. The shared reader now consumes its supported `getReader()` stream. Existing Blob/typed-byte PDFs and historical analyses are preserved. Runtime errors no longer advise replacing or unlocking a valid document.

Install the **366.6 MB SmolLM2 360M int8** pack through **Local resources** for local inference. App, PDF, English OCR and model readiness are separate. Model output is fallible: manual answers present independently checked exact quotations; diagnostic interpretations require confirmation. The existing evidence rules retain numerical comparisons, prerequisites and findings. Without the model, labelled manual extracts and guided rules remain available. No remote inference is enabled.

[Implementation, measured performance and verification](research/assistant-0.27.0/README.md) · [PDF root cause and original stacks](research/pdf-repair-0.27.0/README.md) · [Model selection and limits](research/local-language-0.27.0/README.md).

This is a web release. The signed APK remains 0.14.1; physical iOS 26.5.2 Safari/PWA testing remains outstanding.

## Continuous diagnostic terminal — web 0.26.0

Fault Finder now keeps its introduction, START, manual selection, equipment confirmation, diagnostic answers, readings, corrections and handover in one saved terminal transcript. New FINDR lines type visibly; tap to reveal them immediately. Historical messages stay stable, reduced motion shows complete lines, and reopening resumes the same job.

Type replies or tap numbered options. HELP, MANUALS, LOG, BACK, GIVE UP and FAULT FOUND act on the real job. Saved PDFs, local uploads and inline Manual Archives selection use the existing PDF store, processing workers and downloads. Errors distinguish file selection, resource downloads, PDF reading, OCR and storage. Compact helpers retain exact measurement context; source-specific comparisons remain gated by the installed model, document edition and operating conditions.

See [implementation, verification and limitations](research/terminal-0.26.0/README.md). Existing manuals, imported schedules, emulators and saved visits retain their storage identities. This is a web release; the signed APK remains 0.14.1.

## Offline diagnostic terminal — web 0.25.0

The normal **Fault Finder → Start** path now begins with a compulsory readable manual. Select a saved PDF, download through Manual Archives, or upload a PDF. On-device text extraction and English OCR suggest equipment identity with page references; the engineer confirms system, model and variant. The conversation accepts fault descriptions, quick answers, multiple readings and append-only corrections. Add component manuals without losing the pending question, pause/resume visits and review short/full/JSON reports.

The existing 58-route evidence framework and safety gates remain the foundation. Explicit rules distinguish observations, inferred possibilities, confirmed causes and restoration. Five unit-aware calculators support comparisons and estimates. Six reviewed manufacturer documents provide hash-bound facts; the existing 13 draft equipment procedure profiles remain disabled. Matching text is a reference, not automatic authority to perform a test.

The app now uses consistent terminal styling with a brief skippable introduction and accessible navigation. Existing PDFs, packs, imports, emulators and historical visits retain their storage identities. English OCR software is bundled in the offline shell; no language model or online diagnostic service is required. Physical iPhone/Safari validation is separate from Chromium portrait emulation. Web only; the signed APK remains 0.14.1.

See [implementation and verification](research/diagnostic-chat-0.25.0/README.md), [manual processing](research/manual-processing-0.25.0.md), and [manufacturer source checks](research/diagnostic-chat-0.25.0/manufacturer-source-checks.json).

## Full-screen terminal — web 0.24.2

Fault Finder now opens as a completely black, full-screen terminal with the app header and footer hidden. After a short pause, “let’s find that shit” types in green, character by character, beside a blinking cursor. Start appears when typing finishes and opens the existing fault visit. Skip intro or Escape opens the normal tools immediately. Reduced-motion mode shows the finished text and Start without animation. There is no decorative console window or extra introduction text.

Existing manuals, emulators, logs and diagnostic logic are unchanged. Web update only; APK remains 0.14.1.

## Picture grid and a little attitude — web 0.24.1

Emulators now opens as a compact picture grid, with a remembered Grid/List choice and direct XFP cabinet buttons. Wiring picture cards and family packs show equipment thumbnails from their reviewed catalogue links: 151 pages have linked pictures; 26 explicitly state that a photo is not linked. Existing diagram, manual and saved-PDF actions are preserved.

FINDR keeps its yellow-and-black dating-app joke and adds a more personal, student-project voice. Fault Finder opens with a green terminal typing “let’s find that shit”. Start works immediately; reduced-motion mode shows the complete line without animation. Technical checks, evidence and reports remain unchanged.

See [validation](research/grid-wiring-0.24.1/README.md). Web update only; signed APK remains 0.14.1.

## XFP and Twinflex installer practice — web 0.24.0

**Emulators → C-TEC XFP** now offers the 16-zone plastic and 32-zone metal cabinets, with separate saved practice states and source-based physical controls. Level 3 passwords and the internal NVM link remain separate. Call-out tasks cover supported device disablement/restoration, finding new devices, assignment, loop learn and tests. **Emulators → Fike TWINFLEXpro²** adds its distinct keypad flap, right-hand Write Enable cover, Engineer 3A/3B access and supported configuration with reset-to-apply behaviour.

Both families join contextual **HINTS** and **Menu maps**. Manufacturer fascia figures support the panel appearance, with fit/enlarged controls for portrait phones. Unsupported hardware effects remain visible as labelled references. The Twinflex trainer is the eight-zone pro² V3.00+ profile; original Twinflex, earlier pro, CAST XFP and repeaters retain separate manuals.

The manual review covers **45 existing archive records / 34 canonical editions / ten variant-specific collections**, including installer and user guides, historical editions and related equipment. Existing saved PDFs and record IDs are preserved. Manuals continue to download through FINDR's existing offline store; they are not automatically downloaded by this release.

Try **Emulators → XFP → Call-out tasks**, or **TWINFLEXpro² → Call-out tasks**. See the [source and scope review](research/fire-service-0.24.0/README.md) and [release validation](research/fire-service-0.24.0/validation.md). This web release leaves the signed Android APK at **0.14.1**.

## Wiring families, contextual hints and every trainer’s map — web 0.23.0

Wiring diagrams now includes **branded family packs**, with coordinated colour accents, original manual-page previews and a scoped picture collection for each family. The existing 177 reviewed pictures and their model/edition limits remain intact. A family pack organises the references; it does not establish compatibility between every product in the pack. Individual picture search and full-PDF downloads remain available.

**HINTS** keeps the selected panel or keypad in context across all 13 supported emulator families. Existing guided tasks retain their own next-control hints; free practice offers documented tasks and references. An archive panel without a verified trainer keeps its own model/manual context instead of receiving a guessed sequence from another family.

The main **Menu maps** library now includes Gent Vigilon, Gent Nano, C-TEC CFP Standard and Kentec Sigma CP alongside the nine existing intruder maps. The fire additions use the already reviewed source editions, preserving supported routes, configuration-dependent entries and reference-only boundaries. CFP and Sigma CP are presented as controls/configuration maps rather than fabricated LCD menus. Existing keypad maps and saved trainer state are preserved.

See the [scope and source review](research/packs-hints-maps-0.23.0/README.md) and [release validation](research/packs-hints-maps-0.23.0/validation.md). This web update leaves the signed Android APK at **0.14.1**.

## Wiring pictures from the manuals — web 0.22.0

**Manuals → Wiring diagrams** opens **177 reviewed pictures from 105 manuals**, across fire, intruder, access control, CCTV and warden call. Search by model or wiring term, then use **Filters & sorting** for brand, discipline, panel/device and result order. The ordinary manual list also offers a Wiring diagrams filter. Curated pictures appear on 40 panel and 60 device families where the source supports that association.

Tap a picture to view the complete source page, fit it to the screen or zoom and pan. Each picture retains its model scope, edition, PDF page and relevant source limits. Wiring, terminal layouts and connection examples have separate labels. These are original manual pages, not reconstructed schematics. Coverage is a reviewed subset of the 12,377-record archive; FINDR does not claim a wiring picture for every model.

Pictures are included in the app's offline assets. Full PDFs retain their separate **saved / available to download** status and use the existing download store. **Open source page** verifies the actual saved PDF's hash before using its page number; another edition opens from the beginning with an explicit notice. Existing PDFs, sessions, imports, packs and emulators are preserved.

Try **Manuals → Wiring diagrams → search “Sigma CP”**, then open the zone-wiring picture. See the [coverage and source review](research/wiring-0.22.0/README.md) and [release validation](research/wiring-0.22.0/validation.md). This web update leaves the signed Android APK at **0.14.1**.

## Sigma CP engineering and call-out practice — web 0.21.0

The **Kentec Sigma CP** trainer now follows the K11080M2 cabinet and fascia, including its two groups of zone indicators, seven physical buttons, Enable Control key and two-digit display. **Open cover** reveals the original manual's Write Enable location figure. Switch **Write Enable ON** to practise level 3 with **Mode (+10)**, **Select (+1)** and **Enter**; the flashing units dot identifies a set configuration option. Fit and zoom views support portrait phone use.

**Call-outs** offers **Disable a detector's zone**, **Add / replace a detector**, **Put a zone into test**, **Find an internal fault indication** and **Review level-3 configuration**. Sigma CP is conventional: disablement affects the entire zone and there is no addressed-detector enrolment menu. Add/replace practice covers the panel-side isolation, fictional work checkpoint, test and restoration; it does not certify physical work or compatibility.

The checked manual records **103 configuration codes**. **48** have supported simulation effects; **55** remain reference-only because they need different hardware, additional peripherals, analogue circuit behaviour or an unverified firmware scope. Five new lessons add 79 steps, taking Sigma to **13 lessons / 109 steps** and the complete CFP/Sigma library to **28 lessons / 237 steps**. The CFP trainer, original Sigma lessons, saved settings and other app records remain available.

Try **Emulators → Sigma CP → Call-outs**, or **Open cover → Write Enable**. The manual does not settle every switch direction, code-entry boundary or engineering unset sequence; the trainer labels the relevant starting-point and reset assists. See the [source review](research/sigma-level3-0.21.0/README.md) and [release validation](research/sigma-level3-0.21.0/validation.md). The signed Android APK remains **0.14.1**.

## CFP inside and out — web 0.20.0

The **C-TEC CFP Standard** trainer now follows the documented front-panel layout, including its numbered buttons, separate operator controls, zone labels and status indicators. **Remove cover** reveals the actual Main Control PCB diagram from the checked installation manual, with interactive **SW8 Access Level Three Functions** and **VR1 Delay Minutes** controls. **Zoom controls** enlarges the panel for touch use on a portrait phone.

Removing the cover changes the view; press SW8 to enter level 3. Its nine documented positions cover coincidence, non-latching, delays, test, system/repeater/open/short diagnostics and new-zone sounder behaviour. Confirmed settings, explicit fictional inputs and a training clock support guided practice. Seven new engineering lessons add 93 steps; the complete CFP/Sigma library now has **23 lessons / 158 steps**. Existing operator lessons, Sigma controls and previously saved progress remain available.

Try **Emulators → CFP Standard → Remove cover → SW8**, or choose **Learn → Remove the cover and enter level 3**. This is the eight-zone Standard profile from the checked historical manual, not an Economy/AlarmSense trainer or a hardware-certified firmware replica. Source limits and the manual's coincidence/non-latching warnings remain visible. See the [source review](research/cfp-level3-0.20.0/README.md) and [release validation](research/cfp-level3-0.20.0/validation.md). The signed Android APK remains **0.14.1**.

## More picture packs and conventional fire practice — web 0.19.0

Manual Archives now includes **Bosch Blue Line Gen2** and **Risco BWare/iWISE** device picture packs, with four documented families and full part-code suffixes. Four new Kentec repeater cards cover **Sigma CP-R, HydroSense CP-R, Solo Response and Solo 2 Response**. Ten existing C-TEC/Kentec cards gained checked user/installation documents. Library totals are **615 pictured panel families / 86 panel packs** and **150 device families / 18 device packs**. Existing records, pictures and saved-PDF identities remain intact.

**Emulators → Fire panels** now includes **C-TEC CFP Standard** and **Kentec Sigma CP**, each as an explicitly scoped eight-zone operator trainer. Sixteen lessons contain 65 physical-key, fictional-input and labelled practice-assist steps. The panel faces, access controls, lamp tests, alarm/fault indications, silence/reset distinctions and supported disablements follow the cited manuals. SHOW HINTS points to a control; the engineer performs each action. Independent progress and scenarios save through the existing local database and work offline with the app assets.

There are no invented LCD menus, commissioning procedures, circuit readings or hardware-validation claims. Sigma CP's full MODE cycle order is not established by the checked manuals, so a clearly separate practice starting-point selector loads documented modes. Its auto-reset demonstration does not claim an exact hardware timer. CFP engineering walk-test programming is outside this operator release. Existing Gent/Nano and all nine intruder trainers remain available.

Try **Manuals → Device packs → Bosch or Risco**, or **Emulators → CFP Standard → Learn → SHOW HINTS**. The source reports document exact editions, page references and image attribution: [devices](research/device-packs-0.19.0/README.md), [panels](research/panel-packs-0.19.0/README.md), [emulators](research/conventional-fire-0.19.0/README.md). See the [release validation](research/conventional-fire-0.19.0/validation.md). This web update does not change the signed Android APK, which remains **0.14.1**.

## Guided fault visits — web 0.18.0

**Fault finder → Start a fault visit** opens the new visit log. Choose the system and record what was reported, then follow one Yes / No / I don’t know question or tap **Log a test**. Point, raw reading and operating state stay together on the phone screen; method, instrument, comparison details and photos are optional expandable details. Record an already-taken measurement with its actual provenance even when its method cannot be verified. A logged value is not automatic permission for a new electrical test or a model-specific pass result.

The visit holds separate incidents, append-only readings and corrections, individual existing/introduced impairments, retests and handover. Compare saved tests only under known comparable conditions. A physical-path review needs traced or checked topology and supported boundaries; programmed addresses never establish cable order. Pause unresolved work, search saved visits, preview a short/full/JSON report, or create a linked return visit without copying previous tests as fresh checks.

This release ships **58 generic routes and 180 staged rules** across shared power/cabling, fire, access, CCTV and intruder. The **13 exact-model profile candidates remain disabled drafts**; no new manufacturer numeric ranges or operational sequences are verified. Existing panel-led guides, manual packs, imported schedules, hints and emulators remain available. Old logs adapt lazily and retain their original text and provenance in the same local store; no database upgrade or PDF rewrite is performed.

See the [scope and source review](research/field-visits-0.18.0/README.md) and [release validation](research/field-visits-0.18.0/validation.md). This is a web update; the signed preview APK remains **0.14.1**.

## Quick fault log — web 0.17.1

The fault record now opens as a compact **Quick log**. Choose **Panel**, **First device**, **Last device** or another point, enter the reading and tap **Save reading**. Voltage defaults to V DC. That tap saves the reading and fault case locally; there is no second save step or required engineer, instrument, procedure or handover form.

Notes and extra details are optional. Existing detailed checks, measurements, work logs and handover remain under **More tools**. Saved readings retain their exact entered values and original/correction history. Quick entries are unassessed observations: omitted test references and conditions stay unknown rather than being invented or interpreted as a diagnosis.

**Download log** exports the recorded readings and any existing findings without empty worksheets. Saved sessions, PDFs, imported schedules and the original Yes / No / I Don’t Know flow are retained. Web 0.17.1 does not update the signed APK (0.14.1). All 733 tests, the type check, production build and desktop/iPhone-width browser workflows passed. See the [validation note](research/faults-0.17.1/README.md).

## Documented fault investigations — web 0.17.0

Fault finder now adds **Investigation & readings** alongside its existing Yes / No / I don’t know questions. Each of the **32 current fault guides** has an investigation worksheet for recording checks, measurements, work carried out and the next engineer’s handover. The worksheets cover fire, intruder, access control, CCTV and warden call; they organise the evidence for those guides rather than claim a verified repair procedure for every model or fault.

Record readings exactly as displayed, including `0.00`, `OL` or a range indication, together with the location, test points, power/load conditions, instrument, engineer and time. Assessments require the applicable expected value and source; FINDR does not assume a universal healthy voltage. Corrections add a linked entry and retain the original. Not-tested checks, inconclusive findings, work that did not clear the fault and outstanding verification remain visible in the complete report.

For an open-loop investigation, the physical-path helper records confirmed endpoints and comparable observations, then suggests a smaller interval only when the engineer has recorded a verified route, an applicable procedure and a controlled single test path. It never derives cable order from addresses. **Kentec Syncro’s documented dual feed means voltage can remain present at both ends of an open loop**; endpoint power alone cannot locate or rule out a break. See the [source review and scope](research/faults-0.17.0/README.md).

Case updates save the current session and its history entry atomically in the existing local store. Other saved cases are retained without the former 30-session truncation. The complete text handover includes imported panel context, unanswered or unperformed checks, all original readings and corrections, the work log and the system state left onsite. Save, reopen and export the record locally, including when the outcome remains unresolved; only a missing manual needs a download.

Try **Fault finder → choose a panel → Loop open / short circuit → Investigation & readings**. Add the engineer/job and exact manual reference, record a first reading in **Measurements**, then add a correction and prepare an unresolved **Handover**. Use **Download complete report** to retain a copy for the next engineer. Real site measurements and any physical testing must follow the applicable model’s procedure and the recorded site arrangements.

Release verification is recorded in the [0.17.0 research note](research/faults-0.17.0/README.md#release-verification). All 721 automated tests, the type check and the production build passed. Desktop (1440px) and iPhone portrait (390px) browser workflows passed, including offline reopening and handover export. These are browser checks, not physical-panel certification. Publication is verified separately from the build. This web release does not build or update the signed Android APK, which remains **0.14.1**.

## Import panel download — web 0.16.0

Home now offers **Import panel download**, with an offline schedule/lookup workspace under Fault finder. Import UTF-8 CSV or tab-delimited TSV/TXT files, preview the first rows, confirm the column mapping, and save them against a site and panel/network. Loop and address are required; node, sub-address, zone, programmed location, device type, manufacturer, model, full part number and export date are retained where mapped. All original cells and headers are kept. Limits: 5 MiB, 10,000 rows, 100 columns.

**No manufacturer-native backup format has been verified or is claimed.** No real panel export was available in the repository. Uptick, Zone Sketch, Excel files and non-UTF-8 text are outside this release. See the [format audit](research/panel-import-0.16.0/format-audit.md).

Imports use one atomic transaction in the existing IndexedDB settings store. A replacement requires explicit confirmation for the same site/panel and rejects stale changes. A failed save, rejected draft or cancelled preview leaves the previous snapshot intact; same-scope reimport replaces rows rather than appending them. PDF bytes, existing sessions, packs, emulators and hints retain their existing stores and identities.

Lookup accepts panel display shorthand such as `L1 D37`, separate fields, zones and programmed text. Multi-panel files require explicit panel scope. Multiple nodes/sub-addresses remain candidates; FINDR never chooses the first matching address. Loop lists retain source order without claiming cable sequence, isolator boundaries or break location. Configuration details describe programming at export time, not the installed device or a live fault.

Complete catalogue part numbers can reveal linked documents, labelled with family scope, actual recorded edition and saved/downloadable status. Generic family/type words do not acquire verified manuals. Source-illustration page numbers are not fault/manual citations. A missing manual downloads through the existing validated PDF system; saved PDFs open locally. **Start Fault Finder with this device** copies site/panel/node/loop/address/sub-address/zone/location/model/part code and separately reported fault into the session and report, leaving all Yes/No checks unanswered.

Try the **labelled synthetic example CSV** from the import screen. Enter site `Training House`, panel/network `Test network`, confirm the mapping and import, then choose panel **A** and enter **L1 D37 missing**. Three candidates are shown because node/sub-address differs. Select **Ground floor, reception** (node01) for the complete **S4-720-ST-VO** part-code match and its family installation document. Panel **B** gives the annexe device instead; **L2 D37** in A gives a generic optical row with no verified model manual. Example TSV is also supplied under `public/app/examples/`.

[Validation and reproducible browser checks](research/panel-import-0.16.0/validation.md): 693 tests, type check and production build passed; desktop and iPhone portrait browser workflows passed, including reload with networking disabled. These are browser tests, not physical-device certification. Web release 0.16.0 does not build or update the signed Android APK, which remains 0.14.1.

## Personal Home and separate Fault finder — web 0.15.3

Home now shows frequently opened panel/device packs, downloaded packs with actual complete/partial PDF counts, offline storage status, and About/how-to instructions. Frequency uses local pack-open counts stored in the existing settings database; earlier usage is not invented. Downloaded packs are derived from saved manual IDs, including existing downloads. Home and Fault finder have separate navigation and active states. `#faults` contains start/resume and saved fault sessions; existing `#identify` deep links and adaptive question flows remain available. Android remains 0.14.1.

## Fault finder access restored — web 0.15.2

Restores the explicitly named **Fault finder** navigation link directly to panel selection. The app home and public landing page lead with **Start fault finding**, explain the panel → fault → Yes/No question flow, and retain manual search. Existing fault sessions can be continued from the home screen. The adaptive engine, source references, saved sessions and diagnostic limits are unchanged. Android remains 0.14.1.

## Web usability update — 0.15.1

The app home now opens with Manual Archives search and one-tap access to saved PDFs, panel identification, menu maps and emulators. The Manuals section supports direct links to `#downloads/all` and `#downloads/saved`, clearer empty states, resettable filters, relevance/title/brand sorting and recently saved sorting for local PDFs. Model-code searches ignore separator punctuation (for example CP-25 and CP25). The release page highlights the same workflows and correctly labels the separate Android APK version.

This is a web-only update. The bundled archive snapshot and verified document references are unchanged; no new manufacturer editions have been claimed. The Android APK remains 0.14.1. Existing local PDFs, sessions and training progress retain their storage identities.

# FINDR 0.14.1

Offline panel and device identification, manual downloads, interactive keypad emulators, documented menu maps and adaptive fire and security fault triage for Will Flood. The web app installs on iOS as a PWA; a separately built Android APK bundles the same app and catalogue.

## Included

- Consistent FINDR yellow-and-black branding across the release page, app navigation, catalogue, downloads, menu maps, emulator chooser and training help. Real keypad/panel faces and safety-status colours retain their recognition colours.
- Four main navigation items: Fault finder, Emulators, Menu maps and Downloads. Emulators groups GENT Nano and Vigilon under Fire panels, followed by the nine Intruder keypads.
- Nine free-use intruder keypad emulators with persistent fictional settings, record selection, zone omission, detector inputs, event logs, walk tests and output tests. SHOW HINTS guides a menu route through highlighted physical keys, rising feedback tones and a completion celebration. Guided exercises remain available inside Keypads.
- Dedicated GENT Vigilon 4/6-loop fire-panel trainer with 20 lessons, 236 steps, 28 help articles, 16 glossary terms and 345 source catalogue routes. Its 102 mapped panel screens include 71 interactive screens and 31 explicit reference screens. SHOW HINTS now teaches the complete walk-test / Zone Test start and stop routes, with a simulated test cycle and restoration checks. The wider catalogue includes engineering and conditional references; it does not imply 345 working firmware routes.
- Dedicated GENT Nano V3.xx trainer with its own nine-button panel face, 16 zone indicators, 28 lessons, 229 logical steps, 34 help articles and 20 glossary terms. Its 56 mapped screens comprise 39 interactive and 17 reference screens; the 76-route catalogue distinguishes 20 implemented operator routes, seven conditional routes and 49 older engineering references. SHOW HINTS follows Nano's context buttons, Minus, Next/Verify and Plus, with every highlighted button pressed by the learner.
- Nine recognisable keypad practice faces with 62 selected exercises, including model-specific omission lessons. Pyronix Manager omission is limited to Day Alarm inputs; it is separate from ordinary input omission during arming.
- Searchable menu maps for Galaxy Dimension, Texecom Premier Elite, Scantronic/Eaton i-on, legacy Orisec CP, Menvier M750/M800 Pyronix Enforcer V11, Accenta/Optima G4 LCD, Risco LightSYS2 and HKC Quantum70 V4: 8,979 indexed entries, 22 pinned manufacturer documents and 88 explicit evidence questions. The source corpus totals 1,825 PDF pages, with 946 distinct cited source-page pairs. Entries include menus, actions, settings, values and references; they are not a count of simulated LCD screens. See the [research index](research/menu-maps/README.md) for editions, counts, conflicts and remaining work.
- 611 pictured panel families across 80 brands, with UK-first browsing, brand/system filters, fast search, three-way comparison and source credits. Manufacturer photos, shared keypad references and manual illustrations retain their source labels. Other models may be entered manually.
- Current Manual Archives snapshot: 12,377 records, 28 October 2026, source commit `7d37ac3035c2024e906fcc4453d52ffcfbde87c2`.
- 86 panel packs across fire, intruder, access control, CCTV and warden call. Picture-only packs state that manuals have not yet been linked. All catalogue records remain searchable by discipline, brand, model and title. Pack document identifiers are preserved when adding pictures.
- 146 pictured device families in 16 UK-first device packs: Aico, Ajax, Apollo, C-TEC, EMS, Fike, Gent, Hochiki, Nittan, Notifier, Optex, Orisec, Protec, Pyronix, Texecom and The Fire Beam Company. Browse by exact model code, brand, Fire/Intruder category, device type or protocol. Source pictures, part numbers, model limits and manufacturer references accompany each entry.
- 61 separately verified, hash-pinned device references supplement the unchanged archive snapshot. Active device packs link 128 distinct document records in total, including explicitly online-only references. Six earlier supplier references remain source-only for history and imports; six active EMS references are source-only because their publisher rejects the download relay. Each supplemental PDF is labelled Device reference, with its actual source and edition; publisher links are never treated as saved offline files.
- Serialized downloads with cancellation, partial-pack counts, per-file errors, retries, size limits, PDF-header/EOF checks and archive SHA-256 comparisons where available. Never marks a link as a saved PDF.
- IndexedDB commits metadata and PDF bytes together. Import works without publisher CORS; unknown imports remain labelled as local files rather than silently attached to a model.
- Bundled PDF.js reader, page navigation and embedded-text search; no external CDN dependency.
- 32 symptom groups, 215 observation questions and 136 cause hypotheses across fire, intruder, access control, CCTV and warden call. New questions offer Yes, No and I don’t know, with adaptive selection, editable answers and an unresolved outcome. Every question has source references; the canonical register contains 49 sources. Earlier saved Probably / Probably not answers retain their original half-strength contribution. Reports and sessions remain local.

## Scope

This is a working first build, not a validated repair diagnostic product. Question weights are editorial heuristics, not calibrated probabilities. Displayed causes are hypotheses; no percentage confidence is shown. Sources may cover different panel models; the UI states their applicability and provides exact-panel manual lookup separately. Downloading a PDF does not generate a diagnostic decision tree. The original guided rules do not need a model. Web 0.27 adds optional local language inference with independently checked source quotations; no remote inference service is used.

The catalogue is bundled at a recorded revision, not continuously synced. Manufacturer URLs can change or refuse downloads; failed PDFs remain missing and may be imported manually. Full standards are not included in this app feed.

## iOS / web

Open the deployed site in Safari, Share → Add to Home Screen. Open online once and wait for App ready offline. Download packs and verify their saved counts. Test in airplane mode before relying on the phone at a site. Browser storage can be evicted or cleared; retain source files. The hosting service's initial owner-only access is separate from local offline tools.

All app assets, catalogue, images and PDF.js files are precached under `/app/`. Actual PDF bytes and session records live only in the device's IndexedDB. The allowlisted `/api/manual/:id` endpoint streams publisher files during an explicitly requested download; it does not store user libraries. It cannot accept arbitrary target URLs.

## Android

The current build output is `artifacts/FINDR-0.14.1.apk`; its release download is `/releases/FINDR-0.14.1.apk`. This is a sideloadable preview build, versionCode 26, Android 8+ (API 26), target API 35. Modern Android System WebView is needed. It uses only INTERNET permission; no account, analytics, broad storage permission or JavaScript native bridge. App files, menu maps and lookup data are bundled. HTTPS local asset requests and allowlisted PDF downloads are handled by the native WebView client. PDF import uses the system document picker. External source links open in the browser.

The preview APK is signed with the included development-only `android/preview.keystore` (alias findr-preview, conventional password android). This is deliberately a non-production signing identity, retained to allow updates to this preview without clearing device data. Replace it with a privately managed production signing identity before distribution through a store. No Play Store or Apple App Store publication is claimed.

Build with Android SDK platform/build-tools 35 and Java 17:

```
python scripts/prepare-app.py
FINDR_ANDROID_SDK=/absolute/sdk/path python android/build-apk.py
```

The manual Android build uses javac, D8, AAPT, zipalign and apksigner and requires no Gradle dependencies. Generated assets/build outputs are excluded from source control.

## Web development and publication

Vinext hosts the static app and the PDF relay. Run the supplied Sites dev/build tools. The root URL serves the public release page; its Open FINDR button opens `/app/`. Source identity is in `.openai/hosting.json`.

After changing app files, run `python scripts/prepare-app.py` to regenerate the offline cache version, then `node --test --test-isolation=none tests/*.test.mjs`. Build via the Sites build helper, synchronize exact source and publish via Sites. The catalogue can be regenerated with `scripts/sync-catalogue.py` from an explicitly selected Manual Archives checkout. Panel pack IDs should be reviewed against each new snapshot.

## Validation and limits

Automated checks cover source mappings, knowledge graph integrity, adaptive ranking, unknown answers, answer changes, PDF validation and hash mismatch, and service-worker app-only cache routing. APK signature and manifest checks are performed. Browser flows are checked using the available remote browser. Physical iPhone and Android installation/offline tests remain outstanding; no emulator or real-device pass is implied.

Research notes and image provenance are in `research/` and `public/app/data/panels.json`. PDF.js is Apache-2.0; its licence is bundled. Manufacturer photographs and source manuals retain their publishers' rights. Akinator's exact algorithm is proprietary; FINDR implements its own adaptive selector inspired by the public question/database description.

## Picture update — 29 October 2026

This update preserves the 345-family working expansion, adds 51 pictured families, replaces the blank Haes Fusion extraction with its real cabinet photograph, and replaces the LightSYS+ PCB image with the sourced cabinet/interface picture. Three already-covered Simplex/Faraday aliases are linked to their existing cards. All current panel IDs and previously linked document IDs are retained.

The tracked backlog now contains 10 unresolved legacy candidates (nine Haes and original Simplex 4100). This is a research backlog, not a count of every unpictured product worldwide. The photo library is not claimed to be exhaustive. Picture-only entries explicitly have no linked archive manual when the archive does not contain a matching issue.

For further reviewed batches, use `python scripts/add-panel-images.py /absolute/path/to/picture-batches`, then regenerate the offline assets with `python scripts/prepare-app.py`. The incremental importer preserves the existing library and pack IDs. Do not rebuild from the original seven-image seed unless every subsequent batch is supplied. The latest batch audit is `research/panel-audit/latest-additions.json`; each image retains its exact source in `public/app/data/panels.json`.

## UK-first browsing — 29 October 2026

The picture library and download packs open in UK-first order, with familiar UK fire-panel families at the top. UK-facing intruder, warden-call, access-control and CCTV entries follow. Every picture remains available through search and filters; Brand A–Z restores alphabetical browsing. Sorting also applies to pack cover pictures and panels within each pack.

`uk_priority` is an editorial browsing flag attached to reviewed panel IDs, not a claim about manufacturing origin, exclusive availability, installed-base size or regulatory suitability. Mixed brands are reviewed by model family. `uk_priority_order` highlights selected UK fire families within their system type. Unreviewed additions stay in the wider collection until their UK relevance is checked. The incremental picture importer retains these fields when replacing images. Evidence and the reviewed selection are recorded in `research/panel-audit/uk-priority.json`.

## Keypad practice — 29 October 2026

FINDR 0.3.0 adds an offline practice section with 19 exercises across Galaxy Dimension, Texecom Premier Elite 48, Eaton/Scantronic i-on40H+ software 6.0.xx, and legacy Orisec CP-25/50/100. Common-phrase search finds tasks such as zone resistance, alarm history, walk testing and zone programming. Menu labels and routes are checked against the stated manufacturer manuals; profile cards, task citations and the source audit identify the precise edition and pages.

The simulator starts with engineer/installer access already authorised. It uses fictional zones, readings and events, without a live-panel transport. Only selected menu branches are included, and omitted options and illustrative LCD layout are disclosed. Galaxy preserves A/B and # context; Texecom separates NO editing from Menu navigation; Scantronic stages changes until a clean simulated Installer exit. Demo detector controls and task hints sit outside the keypad. Completed tasks are saved locally, separately from fault-finding sessions.

The pure state engine is `public/app/practice-engine.mjs`; model data and manual references are `public/app/data/practice.json`. The UI is `public/app/practice.mjs` with `practice.css`. Regression tests exercise each task and brand-specific controls, including contextual numeric entry, cancellation, walk-test selection and commit-on-exit. `research/panel-audit/keypad-practice.json` retains the manual provenance and scope decisions. Original research PDFs are not bundled.

## Release branding — 29 October 2026

Version 0.3.1 introduces the requested yellow-and-black fire-panel face and lowercase findr wordmark. The root URL is now a public release landing with web-app and Android APK links. The functional app remains at `/app/index.html`, and its PWA start URL and saved local data identity are retained.

The original mark is `branding/findr-panel-master.png`. The preparation script creates app, Apple and maskable PNG icons from it, plus a 1200×630 share card. Root and app pages both supply social metadata. The signed Android release is published at `/releases/FINDR-0.3.1.apk`, outside the app cache and bundled Android assets. Rebuild, verify and copy the APK to `public/releases` before the web build when changing the release. Preserve the existing preview signing identity.

This is a public beta. Browser preview and build checks do not imply physical-device installation testing. No claim of manufacturer approval or a complete firmware emulator is made.


## Safari offline navigation fix (web 0.3.2)

Safari can reject a cached navigation Response with redirect history. The host canonicalises `/app/index.html` to `/app/`; the previous worker stored that followed Response and served it directly. The worker now fetches the canonical directory for the shell and reconstructs approved redirected asset responses before storing or serving them. Unexpected redirect targets are rejected. Existing cached responses are also normalised. Worker source changes participate in the offline build hash.

Every Open FINDR link on the release page repairs only the redirected cached app HTML before navigating to `/app/`. This works outside the affected worker's scope and requests a background worker update. It does not clear saved PDFs, sessions, settings or other sites' caches. The PWA identity and scope remain `/app/`, with a canonical directory start URL. Registration uses `updateViaCache: 'none'`.

For the 0.3.2 web-only fix, the Android APK stayed on 0.3.1 because its native bundled mode does not use this browser service worker. Native Response regression tests model the Safari redirect restriction; physical iPhone verification remains outstanding.


## Recognisable keypads and zone omission — 0.4.0

The four practice faces and selection cards now use distinct, source-referenced physical layouts: Honeywell Galaxy MK7, Texecom Premier Elite LCDLP, Eaton/Scantronic KEY-KP01 and Orisec MK-700. The keypad model is shown separately from the connected control-panel family. The case, LCD, button shapes and positions are recreated in HTML/CSS; these are teaching illustrations rather than photographs or firmware replicas. The existing FINDR branding and panel catalogue are retained.

Eight new exercises bring the total to 27: omit a detector’s zone, then restore it, for each family. The common phrase “disable device” finds the appropriate omission lesson. Each guide gives the model’s menu wording, key actions, confirmation and source-page link. User-menu lessons start in an already-authorised user session; existing engineering lessons keep their original entry points. No PINs or real panel connections are used.

Omission is distinct from disconnecting or powering down a detector. The exercises use ordinary intrusion-zone fixtures and explain each model’s reinstatement and omittability rules. They do not add a universal fire-device disable workflow, permanent zone deprogramming or a single cross-brand save action. Accepted omission state is separate from a detector’s Secure/Active/Tamper condition. The new reference audit is `research/panel-audit/keypad-update-0.4.0.json`; the original 0.3.0 research audit is retained as history.

The 0.4.0 release used the existing signing identity and package name, with Android versionCode 6. The Safari response-normalisation and launch recovery introduced in web 0.3.2 remain in place.

## Documented menu maps — 0.5.0 original four-family baseline

Menu maps adds a separate, searchable reference alongside the existing 27 practice exercises. Search a menu label, a supported numeric address or a common phrase such as “zone resistance”, “last alarm” or “omit zone”; filter by panel family and inspect the source edition before following the path. Each entry carries its kind, parent path, access/context notes and exact manual-page references. The browser exposes known gaps, offers copyable reference text and provides the underlying JSON for download. The reference data is available offline with the app; opening an external source PDF still requires a connection unless that PDF is already saved separately.

The original four maps contained 4,366 entries across 10 manufacturer-authored source documents totalling 919 PDF pages. Their entries cited 489 distinct source-document/page pairs. These historical figures describe the 0.5.0 research corpus and reference index, not the number of physical keypad screens, supported simulator actions or pages reproduced in FINDR. Its 36 recorded gaps included manual contradictions, missing firmware evidence and configuration-dependent behavior. The current nine-family totals are listed above and in the research index.

Galaxy Dimension uses IE1-0063/IU1-0063 Rev 1.0. Texecom keeps INS176-9 installer, INS177-9 user and INS222-10 supplement evidence separate. Scantronic keeps installer software 6.0.xx, user/admin software 7.02.xx and the 2020 omission guide separate. Orisec keeps legacy CP-25/50/100 installer coverage separate from the CP-25/50 user guide. A familiar keypad face does not establish the connected panel model or software version.

The durable [menu research index](research/menu-maps/README.md) links each family report, source provenance, numbering rules, exact evidence questions and reproducible lookup commands. The app uses `public/app/menu-map.mjs`, `menu-map-engine.mjs` and `menu-map.css`; the four source-pinned JSON files are in `public/app/data/menu-maps/`. A repository lookup uses the same search logic:

```sh
node scripts/find-menu.mjs --panel galaxy-dimension "51.46"
node scripts/find-menu.mjs --panel texecom-premier-elite "omit zones"
node scripts/find-menu.mjs --panel orisec-cp --json "View Zone Status"
```

The menu atlas does not execute panel commands or expand every reference into an interactive lesson. Exact LCD transitions, all permission combinations and firmware differences remain subject to the documented limits and matching-panel evidence. No physical-panel verification or manufacturer approval is claimed.

## Update visibility — 0.5.1

The public release page now has an **Open Menu maps** button. When a browser has an existing FINDR offline installation, the launcher waits for that app's worker to activate and confirm both its exact release version and complete cached asset set before navigation. Download progress remains visible; incomplete updates produce a retry message instead of silently opening an old interface. A fresh browser can open the network app immediately.

Later in-app worker updates offer a deliberate **Reload FINDR** control, preserving the current task until the user chooses to reload. Help and the launcher use the shared release version; packaging checks Android metadata against it. The phone navigation uses four columns for the four app sections, and the app home includes a direct menu-map shortcut.

Installed Android APKs keep their bundled files. Updating the website does not update an already installed APK: install the latest APK as an app update, or use the website. The recovery flow never clears IndexedDB, saved PDFs, sessions or practice completion records.

## Interactive keypad emulator — 0.6.0

The public release opens **Keypad emulator** directly. The four recognisable keypad faces now control a shared stateful model, beyond the earlier fixed exercises. Use the physical buttons to navigate, select a zone/user/group/output, change a field, confirm or cancel it, and see its saved value when returning. A separate FINDR search helper opens a documented route while still requiring its record context. Menu-map entries also offer **Open on keypad**.

Omitting and reinstating zones changes the fictional panel; Secure/Active/Tamper inputs feed the status displays, walk tests and basic alarm behaviour. Test outputs stop on leaving a test. Temporary Texecom diagnostic omissions remain separate from user omissions. Scantronic stages omission changes until confirmation and checks active inputs at installer exit. Galaxy preserves Full Menu numbers versus factory Quick Menu slots, per-group settings and its context-dependent keys. Per-field settings persist in the existing device database without affecting saved manuals, fault sessions or guided progress. Restoring a session returns to a safe access root and stops transient tests.

The source editions remain separate: Galaxy engineer/manager/Quick, Texecom engineer/arming/user, Scantronic partitioned versus part-setting installer and user-v7, and Orisec engineer/user. Access is already authorised in each training session. The demo does not model authentication or communicate with alarm hardware.

Coverage is recorded in `research/panel-audit/emulator-0.6.0.json`: 464 navigable menu nodes, 1,094 editable field templates and 153 operational/status handlers. These counts are not physical LCD screens and do not multiply a field by its available records. A further 979 reachable entries remain explicitly reference-only. Unsupported functions, conflicting source values and missing exact key sequences are identified on the current screen and under Sources & accuracy; they are not silently replaced with invented controls.

The simulated panel is not a full firmware implementation. The exact timing of setting, every interlock, all permission combinations, hardware discovery, signalling, the Galaxy word library and all effects of stored programming values remain outside this release. Some source structures use simplified sequences, including Galaxy SIA level selection. Character strips and the optional typing aid are FINDR helpers; Orisec text uses an explicit **Apply text** helper while its exact physical save sequence is pending verification. Galaxy Print produces a local fictional report, not a printer protocol emulation. Physical keypad and phone installation verification remain outstanding.

Implementation lives in `public/app/emulator-engine.mjs`, `emulator-config.mjs`, `emulator-galaxy-extra.mjs`, `emulator.mjs` and `emulator.css`. The existing source maps remain the evidence layer. The engine and configuration suites contain 52 passing tests covering record context, valid and invalid values, commit/cancel differences, shared state, omission, outputs, walks, log filters, persistent edits and source-specific exceptions. Browser checks additionally exercise numeric Galaxy zone programming, Texecom Yes/No field editing, Scantronic omission/walk inputs and Orisec text application.


## SHOW HINTS — 0.7.0

**SHOW HINTS** now sits beside **Open on keypad** in menu-map entries and emulator search results. It opens the appropriate access menu, highlights one physical button, and waits for the learner to press it. The learner can choose the relevant demo zone, user or group before following the route. Every keypad action is performed by the learner; the helper never presses keys automatically.

The planner compares documented number/function shortcuts and both scroll directions within the existing emulator. It keeps Galaxy Full and Quick Menu contexts separate, selects records before their dependent fields, and follows Texecom’s sequential field controls. A wrong key causes the remaining route to be recalculated from the actual screen. Guidance stops on reaching the requested menu, field or highlighted value, before saving a setting or executing a command. A conditional branch that requires a programming save stops at that prerequisite; reference-only arrivals retain their evidence-gap message.

Newly earned progress produces success tones that rise in pitch, followed by a completion flourish and visual celebration for a supported arrival. A sound control mutes the feedback. Earned route progress is a high-water mark, so retracing the same steps cannot repeatedly raise the reward; the completion card reports actual taps separately. These are FINDR learning cues, separate from real keypad sounds.

All **213 automated tests pass**, including **21 route-planner tests** and **12 audio tests**. A planning smoke covered all **2,690 reachable model nodes** without exceptions, including reference and prerequisite outcomes; this is not a count of fully interactive routes or physical screens. Browser checks covered both SHOW HINTS entry points, all four families, record selection, wrong-key recovery, keyboard input, mute and completion. All four faces fit a 320px-wide frame without horizontal overflow. Actual listening and physical-device installation remain unverified. The manufacturer-source scope and existing emulator limits are unchanged. The audit is `research/panel-audit/hints-0.7.0.json`; Android uses versionCode 10.

## Menvier and Pyronix expansion — 0.8.0

FINDR adds **Menvier M750/M800** and **Pyronix Enforcer V11** to the same keypad interface, with source-referenced faces, free menu navigation, record-based editing, persistent fictional settings and SHOW HINTS. Seven lessons for each new family bring the total from 27 to **41**. Their source atlases add **1,024 Menvier entries** and **1,317 Pyronix entries**; selectable values and supporting references are included in those counts, so they do not imply that every entry is a separate interactive screen.

Menvier uses the classic M Series keypad style. Its **496966 Issue 5 (2006)** M750/M800 engineer root stays separate from the later **11821957 M800 Manager** root, whose PDF metadata dates it to 2010. The manager menu is not claimed to match M750 or the older engineering firmware. Modern Menvier30/40/100/300 and TS-series panels are outside this baseline. Zone programming follows type, attributes, wards and description; dedicated Zone Resistance displays its reading immediately. The source differences and fixture limits are recorded in the [Menvier expansion audit](research/expansion/menvier-audit.json).

Pyronix is pinned to **Enforcer V11 Programming Guide SAP102028847-02**, **Communications Guide SAP102028846-01** and the **Extended User Guide Rev-02**. Its physical YES/NO, arrow and A/B/C/D controls retain their distinct contexts; manual chapter numbers are not invented as keypad shortcuts. Master Manager **OMIT INPUTS?** covers Day Alarm inputs, and the exact repeated-selection restoration prompt remains an explicit gap. See the [Pyronix expansion audit](research/expansion/pyronix-audit.json) and [keypad-face audit](research/expansion/keypad-faces-audit.json).

Free-text helpers, conditional communications/output branches and hardware-dependent operations retain visible limitations. No matching physical panel has been tested, no live connection is made and no manufacturer approval or complete firmware parity is claimed. Earlier release sections and their validation totals are historical records. Android 0.8.0 uses **versionCode 11** and the existing preview signing identity; final release validation is recorded separately from the family research audits.

The full 0.8.0 suite passes **301 tests**, including all **41 guided lessons** and the new route-recovery, selector, area-assignment and test-flow cases. Browser checks confirm both new faces, physical menu navigation, wrong-key hint recovery and phone-width layouts without horizontal overflow. The signed APK contains byte-identical copies of all 649 app files; the web build retains all 672 public files. See the [release validation record](research/panel-audit/expansion-0.8.0.json), [test results](research/panel-audit/expansion-0.8.0-tests.txt) and [two-keypad preview](research/panel-audit/expansion-0.8.0-preview.jpg).

## Pictured packs expansion — 0.8.1

This release adds **45 pictured families**: **20 fire-panel, repeater and control-terminal families**, **12 intruder/keypad families**, and **13 door-entry/access-control families**. FINDR now contains **441 pictured families across 56 brands and 58 packs**. Forty-three additions have recorded UK relevance; the two legacy Paradox keypad families remain in the wider collection. All previous 396 cards and their image bytes are unchanged, all previous pack identifiers and document links are retained, and the 12,377-record archive snapshot is unchanged.

Fire additions include Advanced Go, QuickZone, QuickZone XL, TouchControl, ExGo and EvacGo; Eaton CF2000, xDetect and FX2200; Protec 3500, 3300 and 6000PLUS/REPEATER; European Hochiki Latitude; Notifier INSPIRE E10/E15; Zeta Premier Quatro MKII; and four Haes remote-terminal/repeater families. A clear, original Haes Multi-Tech front-control illustration resolves one legacy gap. Nine previously tracked legacy candidates still need an adequate image; a newly reviewed Scantronic 500r candidate makes the total tracked backlog ten. The backlog is not a count of all products missing worldwide.

Intruder additions include Menvier M Series and Networker, Scantronic's shared 9930 keypad, the Accenta/Optima LCD keypad, Pyronix EURO 76 L and the shared surface keypad, three HKC families, SPC Comfort and two Paradox keypad families. Door-entry additions include Paxton Entry Standard/VR/Touch, six Videx families, CAME/BPT MTM/Lithos/Thangram and ACT10. The ACT10 card groups under Acre/Vanderbilt while retaining its exact legacy ACT manual association.

Every addition retains an attributable real manufacturer image, original manual illustration or explicitly credited supplier photo. Shared keypad and open-cabinet pictures describe their limits. Twenty-four new picture cards have no exact archive manual association and say so; the three packs containing no linked manuals show **Pictures only**, with no misleading zero-of-zero “All PDFs saved” button. Stale CAME manual URLs are documented in the source audit without altering the recorded archive. Image conversion preserves palette transparency, and the three Videx family composites have only their outer whitespace cropped, with all panels and family badges retained.

The existing six emulator families, 41 lessons and menu research scope are unchanged. All **301 tests pass**. Data checks verify every image hash and dimension, prior-card and pack preservation, and exact record identifiers. Browser checks cover the public launcher, UK-first order, new search results, Haes source credit and illustration labels, the Menvier keypad-reference label, and the HKC picture-only pack. All 441 pictures are listed in the offline precache, and the Android APK contains byte-identical copies of all **694 app files**. Android uses **versionCode 12** and the existing preview signing identity. Physical-device installation and offline use remain unverified.

See the [release audit](research/panel-audit/pictures-0.8.1.json), [test results](research/panel-audit/pictures-0.8.1-tests.txt), [pack preview](research/panel-audit/pictures-0.8.1-preview.jpg), and the four `pictures-0.8.1-*` source audits in `research/panel-audit/`. Exact image sources remain in `public/app/data/panels.json`.

## Three more keypad emulators — 0.9.0

This release adds **Accenta/Optima G4 LCD (8EP417A)**, **Risco LightSYS2 (RP432KP)** and **HKC Quantum70 V4**, bringing FINDR to **nine keypad families and 62 guided exercises**. The three additions contribute **2,272 source-index entries**, including selections and references. Their **989 reachable emulator entries** include menus, supported editors, actions/tests and explicitly labelled reference screens; these are not all claimed as exact physical LCD screens. The six existing family profiles and their 41 lessons are retained. All 441 pictured families, 58 packs and 12,377 archive records remain unchanged.

The new faces use the real key arrangements: ADE's single ▲ and pink key bank, Risco's 18-button layout with padlock/house/green OK keys, and HKC's separate PLAY/QUIT, REC/YES and LIGHT/NO column beside * and #. Keyboard input is restricted to controls on each face. SHOW HINTS plans over the same state engine, highlights one physical key at a time, recovers from wrong presses and uses the existing rising feedback and completion celebration.

**Source-specific behavior matters.** ADE omission is selected by the zone digit and temporary omissions are restored by unsetting; repeated digits do not invent a restore gesture. RESET cannot unset an already-armed demo. Risco preserves separate one-time and permanent omissions, requires Part Set then OK to store its omission draft, and retains numeric installer versus scroll-only user menus. HKC uses the separately labelled authorised `* zone [* zone …] YES` inhibit-and-set procedure, with restoration on unset. All editions, fields, limits and unresolved details remain available beside the keypad and in the menu maps.

Output-test hints stop at the selected question before activation. Text helpers retain family-specific validation. HKC's clock helper is usable, but SHOW HINTS declines its undocumented date-to-time transition. Automatic HKC bell phases, unfitted hardware, enrolment, live communications and unsupported reset procedures remain explicit references or prerequisites. No matching physical panel has been tested, and no live panel transport is included.

Release verification is recorded in [emulators-0.9.0.json](research/panel-audit/emulators-0.9.0.json), with [test results](research/panel-audit/emulators-0.9.0-tests.txt) and the [browser preview](research/panel-audit/emulators-0.9.0-preview.jpg). Family evidence is in [ADE](research/expansion-0.9.0/ade-audit.json), [Risco](research/expansion-0.9.0/risco-audit.json) and [HKC](research/expansion-0.9.0/hkc-audit.json). Android uses **versionCode 13** with the existing signing identity.

All **400 automated tests pass**, including all **62 guided lessons** and a **13-case cross-family hint audit** covering **989 reachable entries**. Browser checks cover the three new faces, physical controls, omission/unset behavior, wrong-key recovery and 320px layouts. The Android package retains byte-identical copies of all **701 app files**; the web build preserves all **730 public files**.


## GENT fire-panel trainer — 0.10.0

This release adds a dedicated GENT section at `/app/#gent`, linked from the main navigation, home page, keypad list, menu-map landing and exact 4/6-loop catalogue panel. The baseline is the classic full-size EN Vigilon with 2 km loop cards, using the July 2015 operating instructions 4188-1025, commissioning instructions 4188-856 issue 7 and installation instructions 4188-1024 issue 4. The internally inconsistent operator issue labels remain visible in Sources & scope. Compact, Plus, voice-alarm and unverified later firmware are outside this trainer's claimed match.

The code-drawn panel follows the source face: wide LCD, 32 zone indicators, F1–F4, physical fire controls and full keyboard. Small screens offer a whole-panel view and a larger-keys view with contained horizontal scrolling. The independent fire engine models buzzer versus alarm sounders, latched fires, live inputs, current faults, device/zone disablements, explicit restoration, events, labels, simulated NVM, clock and printer-dependent branches. Verify and U buttons remain unconfigured. Every site address, label and credential is fictional; there is no panel transport or remote connection.

Four learning tracks contain **18 lessons and 183 steps**, with expected outcomes, common mistakes, source pages, optional rising-pitch feedback and completion rewards. Learners tap every highlighted key. Hints rebuild incorrect PIN prefixes and cleared Device/Loop, Zone or event fields after a detour; route planning cannot execute a protection-changing operation. Disablement lessons explicitly show that a disablement remains active and link to the matching restoration lesson. Progress is local to the device. Leaving or reloading ends temporary tests and clears access drafts.

The help centre contains **28 articles and 16 glossary terms**. Source mapping comprises **96 screens (65 interactive, 31 reference)** and **343 catalogue routes (20 implemented-task links, 284 references, 34 conditional and five source conflicts)**. Eighteen documented limits include edition discrepancies, Repair/FARE/Aux Rly routing, MCP behaviour under a disabled zone and the conflicting engineering Zone Test order. Zone Test behaviour is demonstrated using a labelled FINDR scenario control; no exact disputed physical route is invented. The fictional site has two commissioned loops, three zones and six devices, without redefining the panel family's hardware capacity.

Research and validation are retained in [the menu audit](research/gent-0.10.0/menu-audit.json), [tutorial audit](research/gent-0.10.0/tutorial-audit.json) and [release audit](research/gent-0.10.0/release-audit.json). **479 automated tests pass**, including every GENT lesson through its literal source-key sequence and the actual UI controller, incorrect-input and detour recovery, separate fire-control semantics, persistence, reference citations and all earlier emulator suites. Browser QA covers full disable/re-enable lessons, searchable help, menu hints, preserved progress and 320/390-pixel layouts. This is manual-based emulation; validation against physical GENT firmware remains outstanding.

All nine intruder profiles and their 62 exercises, 441 pictured families, 58 packs and 12,377 catalogue records are preserved. Android is versionCode14 with the previous signing identity. The web and APK contain the same app files.

Production builds clean generated output and verify each copied public asset before packaging. Orphan copies in the app, releases and share directories are excluded, and the 256 MiB hosting limit is checked. Historical public APK links remain available.

## GENT Nano trainer — 0.11.0

This release adds the Nano trainer at `/app/#nano`, with a GENT family switch between Nano and the existing Vigilon trainer. The selected model is the **NANO-24 single-loop panel with V3.xx software**, using **4188-947 issue 9_12-21** operating instructions and **4188-948 issue 11_01-22** installation instructions. Detailed commissioning evidence comes from the older **4188-949 issue 3_05/10, V2.xx** manual and stays separately identified. Its engineering routes are reference material unless the supported operator procedure is corroborated by the V3.xx baseline. Document hashes, editions, page links and the commissioning PDF's printed-versus-PDF page discrepancy are retained in the [Nano menu audit](research/nano-0.11.0/menu-audit.json).

Nano has its own physical face and state engine: an **8 × 40 LCD**, **nine physical keys**, **16 zone indicators**, and the separate common Fault, Power and Fire lights. The five navigation controls are left selection, Minus, Next/Verify, Plus and right selection; the four emergency controls are Cancel Buzzer, Reset, Sound Alarms and Silence Alarms. The practice PIN is entered by changing one digit at a time. Source-specific behaviour includes a flashing first fire zone, steady later fire zones, separate buzzer and sounder states, latched fires, device and zone disablements, sector and output disablements, current and historic logs, clock editing, weekly testing and the eight-second display test.

The map contains **39 interactive screens and 17 reference screens**. Its **76 catalogue routes** comprise **20 implemented operator routes, seven conditional routes and 49 older engineering references**; these totals do not represent 76 fully emulated firmware functions. The V3 operator source expressly states that a disabled Nano zone blocks both sensors and manual call points. Device, channel, zone, sector and output disablements remain distinct, survive Reset where applicable, and require their matching enable operation. Lessons explain the remaining disablement and provide restoration practice.

The learning centre contains **28 lessons, 229 logical steps and 835 physical key presses across the recorded lesson sequences**, plus **34 help articles and 20 glossary terms**. A logical step can require several physical presses, such as scrolling PIN digits or navigating to a form. SHOW HINTS highlights the next actual control and waits for the learner; it also recovers the required menu and form values after a detour. Optional rising feedback tones, a completion celebration, mute and practice without hints use the existing FINDR learning system. Lesson completion checks the resulting panel state. The [tutorial audit](research/nano-0.11.0/tutorial-audit.json) records the lesson counts and scope.

**Practice time is paused while learning.** Guided lessons advance simulation time only through their clearly labelled **Advance training time** actions, allowing the learner to read the five-second silence and subsequent five-second reset stages of a weekly test. Free practice runs its timers normally while the trainer is visible. This is a FINDR teaching policy; real Nano firmware does not pause for a lesson. Within a panel session, leaving the weekly-test view with Quit does not stop testing: the explicit Start/Stop confirmation is required. FINDR clears temporary tests when leaving or reloading the trainer as a separately disclosed session-cleanup rule.

The fixture is a fictional single loop with seven devices, 16 selectable zones and sectors, and three populated zones/sectors. The practice code **2468** is not a Gent factory default or site credential. Device/channel disablement is deliberately commissioned for optional Customer-level access; the older commissioning source gives Engineering-level access as the factory setting. Printer actions are conditional references because no printer is fitted. Day/Verify durations, the alarm policy, cursor conventions and the 180-second practice timeout are declared fixture or training choices. The 999-entry history capacity is attributed to the older commissioning source. Twenty-one source and teaching limits remain visible, including exact V3 engineering forms, configuration differences and unverified physical firmware behaviour.

The complete suite passes **588 automated tests**, including **109 new Nano tests** and all 479 previous checks. Source validation, the Nano engine, literal lesson sequences, controller flows, incorrect input and route recovery are covered in the [test results](research/nano-0.11.0/test-results.txt). The existing Vigilon trainer, nine intruder profiles and 62 exercises, 441 pictured families, 58 packs and 12,377 catalogue records are retained. Android 0.11.0 uses **versionCode 15** and the existing preview signing identity. No physical Nano validation, manufacturer approval or complete firmware parity is claimed; physical phone installation and offline checks remain outstanding.

The Nano release keeps the Android download index in the APK while omitting its unused copy from the web build. The web manual relay retains its separately compiled allowlist. Web packaging verifies all 745 required public files and reserves an additional 1 MiB for archive overhead; training content and historical release downloads are preserved.

## Emulators navigation — 0.11.1

The main app navigation now has four items: **Fault finder, Emulators, Menu maps and Downloads**. Emulators opens one chooser with **Fire panels** (GENT Nano and GENT Vigilon) followed by **Intruder keypads** (the existing nine families). The fire cards use their existing sourced photographs. Nano and Vigilon retain their routes, controls, help, lessons and saved progress; the Emulators navigation item stays active inside either trainer.

The release page now offers one **Open Emulators** button in place of the two separate GENT buttons. The app home uses one shared Emulators callout. The phone navigation uses four equal columns, checked at 320 px and 390 px without horizontal page or navigation overflow.

Web and Android both carry this layout in **0.11.1 / Android versionCode 16**. A new APK is required to update the navigation of an installed Android copy. Engine files and source-mapped training content are unchanged.

To keep web-plus-Android releases within the host's expanded archive limit, the deployment now carries the **current and previous APKs and their checksums**. All historical binaries remain unchanged in the source repository. An older deployed download URL shows an explicit archived-version page with a link to the current release; it does not substitute a different binary under the old filename. Current 0.11.1 and previous 0.11.0 download URLs continue to serve their actual files.


## App-wide FINDR theme — 0.11.2

The user's requested Grindr-inspired fire-panel joke is now the app-wide visual direction: the existing FINDR panel-face logo and lowercase wordmark, saturated yellow, charcoal surfaces and bold navigation/actions. “Find your type. Know your panel.” leads the home and release pages. The same colour system covers the catalogue, downloads, menu maps, emulator chooser, guided practice and GENT help, while keeping technical labels plain.

`public/app/findr-theme.css` is the final shared stylesheet. Physical keypad/panel faces, LCDs, key legends and red/amber/green status meanings are preserved. The four-item navigation remains Fault finder, Emulators, Menu maps and Downloads, with GENT Nano and Vigilon under Emulators. Menu routes, trainer engines, lessons, hints and sounds are unchanged.

Web and Android carry **0.11.2 / Android versionCode 17**. The Android shell and web/PWA theme use charcoal to match the app. The deployed release retains APKs and checksums for 0.11.2 and 0.11.1; older versioned URLs show the existing archive explanation. This theme patch does not add manufacturer mappings or claim new panel accuracy. See `research/theme-0.11.2/release-audit.json` for the release checks and practical testing limits.

## Expanded fault finder — 0.12.0

The observation guide now contains **32 groups, 215 questions and 136 possible causes**: 13 fire groups, seven intruder groups, four access-control groups, five CCTV groups and three warden-call groups. This adds **19 groups, 160 questions and 95 candidate explanations**. New coverage includes conventional fire circuits, unwanted-alarm follow-up, disablement/test states, expected outputs, beam and aspirating detectors; intruder power, setting, zones, signalling and wireless faults; door and access events; CCTV image, stream and remote-access issues; and care-call reception and speech. The [research index](research/faults-0.12.0/README.md) links the model-specific evidence, 49-source register, 76 claim mappings and 37 authored scenarios.

Each new answer is **Yes, No or I don’t know**. Unknown answers remain neutral, Undo recomputes from the retained observations, and insufficient evidence stays explicitly unresolved in the screen and copied report. Question sources expand beside the observation. All **13 original group IDs, 55 original question texts, 41 original cause IDs/titles and 175 original likelihood cells** are retained. Earlier Probably / Probably not answers keep their original half-strength weighting. The [data audit](research/faults-0.12.0/data-audit.json) records the actual hint, check, summary and source changes, including the clarified Advent XT2 12 V/24 V fuse consequences. The numbers remain editorial ranking heuristics, not measured probabilities or confirmed diagnoses.

The full suite passes **605 tests**, with no failures or skips. Browser checks cover three-choice questions, an earlier saved session, source details, Undo, all-unknown results/reporting, a complete conventional-zone example and phone-width layouts. The signed Android **versionCode 18** package contains byte-identical copies of all **712 app assets**; the production web build passes with **731 public files**. Release evidence and practical limits are linked in the [validation record](research/faults-0.12.0/README.md#release-validation). Physical panel validation and physical phone installation/offline checks remain outstanding.

## Vigilon walk test with SHOW HINTS — 0.12.1

Vigilon now has a complete learner-operated **walk test / Zone Test** route. Two new lessons cover starting a test and finishing an already active test. SHOW HINTS highlights each panel key through fictional engineering access, both Test menu selections, On or Off, the zone number and confirmation. The learner presses every key. The exercise observes the five-second simulated alarm cycle, restores the fictional sensor input and explicitly switches the zone out of test before checking the panel's final condition. Closing a menu or completing the automatic cycle does not stand in for switching test mode off.

The Vigilon pack now contains **20 lessons, 236 steps and 102 mapped screens: 71 interactive and 31 reference**. Its **345 catalogue routes** comprise 24 implemented links, 283 references, 34 conditional entries and four source conflicts. The 28 help articles and 16 glossary terms remain available, with the test guidance linked to the new lessons. The nine intruder families, Nano trainer, pictured panel library and expanded fault finder are retained.

The route follows the July 2015 commissioning diagram for the classic EN 4/6-loop profile, with separate manufacturer training material corroborating direct zone-number entry after On/Off. The [walk-test source review](research/vigilon-walktest-0.12.1/README.md) records the conflicting prose, earlier map cross-check, training presentation's uncertain edition date and the bounded interpretation. The original 0.10.0 audit remains as historical evidence. The practice site and engineering credential are fictional; physical panel validation and universal firmware equivalence are not claimed.

Web and Android use **0.12.1 / Android versionCode 19**. The deployed download set retains the current 0.12.1 and previous 0.12.0 APKs and their checksums. Versioned 0.11.2 URLs use the existing explicit archive-page pattern; the original binary and checksum remain unchanged in the source repository.

The [0.12.1 validation record](research/vigilon-walktest-0.12.1/README.md#release-validation) records **625 passing checks**, the full browser-completed walk-test lesson, phone layouts, and byte-identical Android assets.


## Pictured packs expansion — 0.12.2

This release adds **63 UK-priority pictured families**, taking FINDR to **504 pictured families across 61 brands and 64 packs**. The additions comprise **20 fire panels/repeaters**, **19 intruder keypads**, **17 access-control/door-entry families**, **six CCTV recorder fascia families**, and **one Tunstall CareAssist receiver**. All 441 existing card records are unchanged and their image files are byte-for-byte preserved, every previous pack ID and document association is retained, and the 12,377-record Manual Archives snapshot remains unchanged.

Fire additions include EMS FirePoint System 5000, SmartCell and FireCell 2X-A; Eaton BiWire variants and CF50016; Kentec View, Focus, Focus+ and Taktis Vision repeaters; Protec LOOP/REPEATER; Zeta Simplicity/Infinity ID2 variants; and Fike Duonet/Quadnet/repeater references. Keypad additions cover Orisec RK/MK/TK ranges, Texecom LCD/LCDLP/metal faces, Galaxy MK7/MK8/MK9 and TouchCenter Plus, four Ajax keypads and two Risco touch interfaces.

The entrance/access additions cover Bell System, Comelit, Entrotec, Fermax and PAC. The CCTV additions group documented shared Hikvision Q/K, I/M and Turbo HD fascias, with exact suffix limits. CareAssist is labelled as a portable local alarm receiver. Photos, remote-keypad references and manual drawings retain their source labels. All pictures come from manufacturer material or clearly credited suppliers; none are generated hardware substitutes.

**23 new entries have exact existing archive links; 40 are picture-only** and explicitly state that no matching archive manual is linked. The linked material includes online Ajax manuals, which are not represented as downloadable PDFs. Model labels, connected-panel identity and document editions remain necessary: a shared keypad or cabinet does not identify firmware, controller/repeater role or capacity. The tracked research backlog is now 16 candidates, including six deferred entrance/access leads; it is not a count of all unpictured products.

The source audits are `research/panel-audit/pictures-0.12.2-*.json`; preservation and image checks are in `research/panel-packs-0.12.2/data-validation.json`. Android 0.12.2 uses versionCode 20 and the retained preview signing identity.

Release validation: **625 automated tests pass**. Browser checks cover the expanded library, UK-first order, EMS source/manual display and Orisec/Fermax layouts in 390px/320px phone frames without horizontal overflow. The APK contains 775 web assets identical to the prepared app, uses the existing signing certificate and passes signature and alignment checks. Physical installation and offline device use remain untested. See `research/panel-packs-0.12.2/` for the validation records.

## Pictured packs expansion — 0.12.3

This release adds **45 pictured families**: **11 fire-panel/repeater families**, **12 intruder keypad/control-panel families**, **15 access-control/door-entry families** and **seven CCTV recorder families**. FINDR now has **549 pictured families across 74 brands and 80 packs**. Forty-four additions have documented UK relevance; the Qolsys IQ Panel 2/2 Plus card stays in the wider collection because its linked 2020 guide is not verified as a UK edition.

The fire additions include Advanced remote terminals, Ampac FireFinder Plus EN54, Cygnus SmartNet, ESSER Compact/FlexES/IQ8Control, FireQuest, GFE JUNIOR V4 and Ventcroft FireTrax Professional. Intruder additions include Abacus, Lynteck Nexus, Gardtec, Aritech, original Visonic PowerMax, Texecom LED-keypad families and Castle Care-Tech. Access additions cover Aiphone GT, Axis controllers/intercoms, Farfisa FC52PL and Videx VProx/SC24000. The recorder pack distinguishes original and Mk II Axis S22 generations and adds S3008/S3016 plus Honeywell HRDE4X4.

**43 additions link to 53 distinct existing archive records. Two entries are picture-only:** the Castle Care-Tech 1600 and Gardtec Profile keypads, which explicitly state that no exact archive manual is linked. Shared fascias, regional editions, remote terminals, exposed controller boards and open cabinets retain model-specific limits. Original manufacturer photos or drawings are used; no hardware features were generated.

Visual review replaced a misleading FireQuest repeater cover photograph with its explicitly identified front-control drawing, a low-resolution Farfisa thumbnail with its exact manual drawing, and an incorrectly reused RKP8 product image with the original RKP4/8/16 installation figure. Blank image margins were trimmed where this improved identification. The seven recorder cards also received an independent document/image review.

All **504 previous panel records and image files are unchanged**. All **64 prior pack identifiers and document associations are preserved**, and the **12,377-record Manual Archives snapshot is byte-for-byte unchanged**. The tracked picture-research backlog contains 19 candidates; it is not a claim of exhaustive worldwide coverage. Source and edition checks are in `research/panel-audit/pictures-0.12.3-*.json`; preservation and image verification are in `research/panel-packs-0.12.3/data-validation.json`. Android 0.12.3 uses versionCode 21 and the retained preview signing identity.

Release validation: **625 automated tests pass**. Browser checks cover the release link, UK-first selection, the new ESSER cards and exact IQ8Control manual links, the expanded Downloads packs and the Castle picture-only label. Aiphone and Axis cards/source dialogs fit 390px and 320px phone frames without horizontal overflow. The APK contains **820 app files identical to the prepared app**, uses the existing signing certificate, and passes signature, alignment and archive-integrity checks. Physical phone installation and offline device use remain untested. Validation records are in `research/panel-packs-0.12.3/`.

## First device packs — 0.13.0

Device packs are available in Downloads beside Panel packs, with a home shortcut and a dedicated picture browser at `#devices`. Pack details show the pictured families and their matched documents; model cards show exact product codes, protocol, source credits and the limits of visual identification. Search includes part numbers, aliases and protocol names. UK-first and alphabetical browsing are available, with brand/type filters and incremental results. The four-item main navigation is retained.

This first batch contains 12 Apollo, five Gent and seven C-TEC device families. The 549 existing panel families and 80 panel packs are preserved. GENT Nano/Vigilon trainers, the nine intruder emulators, their lesson/source data and the fault guide remain intact. The Gent S-Quad entry is explicitly the legacy sensor/sounder/strobe family; later VAD and Self-Test variants are outside its verified scope. CA459A/W is a visual-only alarm base, separately identified from sounder/VAD variants.

The archive catalogue remains at 12,377 records and its original source commit. `data/device-documents.json` adds 13 real, independently verified manufacturer references: three Apollo datasheets, one Gent call-point instruction leaflet, and nine C-TEC product/installation documents. These have source-hash identities, exact PDF hashes, lengths and page counts. C-TEC's original archive links returned verification HTML during review, so these new references use separately obtained manufacturer PDFs from distributor or manufacturer support sources. They do not overwrite or impersonate the old archive records. All 24 new pictured families have linked documents, with 24 distinct document IDs across the three packs.

The existing serialized PDF download, hash checks, saved counts, reader, imports, cancellation and retry pipeline handles the new references. New allowlist entries are added to both web and Android without modifying original archive mappings. Imported PDF matching recognises the separately verified device references. Offline app caching includes device pictures, identities and source metadata; PDF content becomes available offline only after it is saved.

Reviewed source provenance is in `research/device-audit/`. Release checks are in `research/device-packs-0.13.0/`. Future reviewed batches can be validated with `python3 scripts/add-device-images.py /absolute/path/to/device-batches --check` and imported by omitting `--check`. The importer preserves existing device IDs and document associations and never changes the panel data. It accepts explicit supplemental `documents.json` records and extends the exact-ID download allowlists. Regenerate app assets and rebuild Android after data changes.

## Device download follow-up — 0.13.1

The first live checks found that the Acorn source served the research downloads but rejected FINDR's production relay with HTTP 403. This follow-up replaces the affected detector and VAD references with four independently verified manufacturer PDFs from Modern Alarm and retains the working EU Fire and manufacturer-support instructions. The active C-TEC pack has seven matched documents; Apollo retains 12 and Gent retains three. Each replacement retains its actual printed revision (2021/2022), exact model scope and pinned PDF hash.

The six earlier Acorn reference identities and hashes remain in the document catalogue as source-only entries, so old saved copies and imports retain their identity. They are excluded from active pack downloads, offer Open source instead of Save PDF, and explain the import route. The panel catalogue, all 24 device pictures, the three pack IDs and existing saved data remain intact. The Android build advances to versionCode 23 with the same signing certificate.

## Offline update integrity — 0.13.2

The live upgrade check found an installation with current application code and document metadata but older device-to-document mappings. This release pins every offline asset to its generated SHA-256. It only reuses bytes from an earlier FINDR cache when they match the new build exactly; changed or mismatched assets are fetched using the current build identifier and checked before storage. The previous cache remains available until the new installation is complete.

Offline asset operations have bounded waits and retain verified partial progress for a retry. A completion marker tied to the exact asset manifest gates readiness and activation cleanup. The release progress display retains its last percentage while installation state changes. Device and panel contents, saved PDFs, training progress and sessions are unchanged. Android advances to code 24 with the existing signing certificate.


## Expanded panel and device packs — 0.14.0

This release resumes the interrupted pack update and adds 62 pictured panel families, bringing the catalogue to 611 families across 80 brands and 86 panel packs. The new brand packs are Fire-Lite (13 families), Silent Knight (10), Potter (16), Gamewell FCI (12), Radionics (2) and Napco (1). Four C-TEC references add the FP/MFP legacy families and CFP760/XFP510-16 repeaters. Four Tunstall cards identify the Vi IP control cabinet, two specific resident room units and a Communicall Digital video room unit. Hardware roles, historical editions, regional limitations and shared-fascia family limits are stated on the cards. The six new overseas brand packs do not displace the established UK-first selection.

The recovered device work adds 122 families to the previous 24, for 146 families across 16 brand packs. The additions cover Aico (12), Ajax (10), Apollo (6), EMS (8), Fike (8), The Fire Beam Company (2), Hochiki (18), Nittan (10), Notifier (9), Optex (7), Orisec (5), Protec (12), Pyronix (6) and Texecom (9). Notifier-branded System Sensor products are grouped under Notifier. Forty-four new hash-pinned supplemental PDF records bring the reference collection to 61 records. The 16 active packs link 128 distinct records, including separately labelled online manuals.

Device browsing now has Fire/Intruder filtering. Pack searches include exact model codes, aliases and protocols. Online-only sources are counted separately from downloadable PDFs and never receive a false saved/offline label. Nine Orisec/Pyronix families whose PDF sources could not be verified retain honest online references; Ajax current online manuals remain separate from the dated PDF references. A Nittan filename/printed-issue discrepancy and an EV-H-CS source-temperature conflict are disclosed without overwriting historical archive records.

All 549 original panel cards and image bytes, all 24 prior device cards, existing download IDs and mappings, the 12,377-record archive snapshot, database identity, emulator engines, fault guide and preview signing identity are preserved. Existing app-only integrity checks and complete-cache activation remain in place. Android advances to versionCode 25. The hosted release retains APK 0.13.2 as its previous download and serves an explicit archive notice for 0.13.1.

The per-batch panel evidence is in `research/panel-packs-0.14.0/`; device evidence is in `research/device-audit/` and `research/device-packs-0.14.0/`. Research PDFs are not bundled into the application. `integration-check.json` records preservation checks; release validation records are added after testing. Physical iPhone/Android installation and airplane-mode testing remain separate from automated checks and browser verification.

Local release validation passed all 659 existing and expanded tests with zero failures or skips. The verified production build is 93,642,603 bytes and includes only the current and previous APK downloads. All 52 archive-backed PDFs newly used by device packs returned valid PDFs through the live relay, with hashes matching the recovered source bytes. The new supplemental reference IDs are checked after publication.

The first publication attempt was rejected by the 25 MiB per-file host limit. Seven obsolete source-master photos (5,104,518 bytes) now live byte-for-byte in `research/panel-originals/`, while all 611 current catalogue pictures remain unchanged. Legacy session images resolve to their existing catalogue counterparts without rewriting the session. APK builds use a fresh staging directory and verify every bundled app byte, preventing obsolete aapt entries. A static-asset boundary check rejects oversized files before publication. The rebuilt signed APK is 24,126,768 bytes, with 2,087,632 bytes of hosting headroom.

## EMS download availability follow-up — 0.14.1

Live verification of the 0.14.0 release found 90 of 96 newly linked PDF references download successfully with exact source hashes. Six EMS documents from Huvo returned publisher HTTP 403 through the production relay. The manufacturer alternative was unavailable, so these six retain their document IDs, hashes, edition metadata and picture associations but now offer Open source and Import PDF guidance. The EMS pack has two downloadable PDF records and six source-only document records; the online-reference total also includes distinct device/product source pages. Existing saved or imported copies remain readable. No reference has been marked saved without stored PDF bytes. All 611 panel families, 86 panel packs, 146 device families and 16 device packs remain intact. Android advances to code 26 with the same signer; 0.14.0 remains the previous APK download.

FINDR 0.14.1 was published successfully as hosted version 28 on 30 October 2026. Live checks verified the exact APK/checksum, six disabled relay routes and two remaining EMS PDFs. The browser upgraded from 0.13.2 through 0.14.0 to 0.14.1, retained all five earlier PDFs, reached App ready offline, and saved/read a new Fire-Lite manual. Fire/Intruder filters and exact part-code searches passed. The final screenshot and release evidence are in `research/device-packs-0.14.1/`.

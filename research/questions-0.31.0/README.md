# Quick Questions investigation — web 0.31.0

The reported query is **“Putting a gent vigilon on walk test”**. A fresh Chromium run through Home → Quick Questions reproduced the issue: FINDR proposed and downloaded the real 2009 Vigilon operating instructions, successfully processed it, rejected its equipment scope, then proposed the 1999 operating instructions. No answer was produced.

The saved analysis identified **Honeywell**, with **Gent** also present in its manufacturer candidates and page evidence, and correctly identified **Vigilon**. The question intent named Gent/Vigilon. A single-manufacturer comparison rejected these matching document identities. The [baseline result](baseline-chromium-390.json) records this evidence and the subsequent proposal. The operator guide is not claimed to establish the engineering Zone Test procedure; the source review separately identifies the commissioning instructions needed for that operation.

The browser harness at [`scripts/verify-questions031-browser.mjs`](../../scripts/verify-questions031-browser.mjs) uses normal menu interactions and downloaded PDF processing. Its transport intercept serves actual catalogue-hash-verified copies at `/api/manual/:id`; it does not replace the PDF reader, identification, indexing, rules, UI or persistence. That verifies the local application journey, not the external publisher/relay's availability.

All browser runs use a Linux container. Chromium and WebKit phone-width simulation do not establish behaviour on a physical iPhone. Model-enabled inference is measured separately by the language agent; a fresh browser profile in this harness uses the documented retrieval/reviewed-procedure fallback.


## Final results

The corrected route proposes **Vigilon 4/6 Loop and Compact — Installation (2015, source-listed)**, catalogue ID `facp-7538be76-f958-46e4-99f6-c718601bb349`. The actual PDF is **Generic Commissioning Instructions 4188-856 issue 7 (07/15)**. A focused question requires **EN Vigilon / MCC or MCB V4.53 or higher** before releasing five reviewed Zone Test steps. Sources include PDF pages **105** (menu map), **81** (effects, prerequisites and exit) and **53** (access). See the separate Gent source review for exact anchors and scope; this is not a procedure for an unidentified BS/Nano/Compact VA variant.

The tests also found and corrected a second scope failure in generic MxPro answers: the manual matcher recognised `MxPro4` coverage through its documented `Mx-4100`/`Mx-4200`/`Mx-4400`/`Mx-4800` models, but the answer generator used a stricter second comparison and discarded the same PDF. The event-history answer now returns relevant cited **page 22** material from **Advanced 680-015 revision 10**, with a contextual follow-up. It is labelled source text, not an independently reviewed full procedure.

| Final environment | Checks | Gent proposal | Download/process + variant reload/answer | Repeat from saved text |
| --- | ---: | ---: | ---: | ---: |
| Linux Chromium 154.0.8037.57, 390 × 844 touch, offline install enabled | 15 passed | 657 ms | 20,244 ms | 225 ms |
| Linux WebKit 26.0, 390 × 844 touch | 12 passed | 516 ms | 24,237 ms | 278 ms |
| Chromium, actual previously stuck QA profile | 1 passed | — | cached analysis reused | — |

These are end-to-end automation timings in a shared container, not isolated CPU benchmarks or physical-phone timings. The import column includes local serving of the real 10,265,001-byte PDF, its 162-page processing including OCR where required, autosaves, reload at the variant prompt and an automated variant reply. It excludes external internet download latency and a person's response time. Repeat timing includes UI and storage, not language-model inference.

The **28 final browser checks** cover correct proposal and confirmation, original-question continuity, required variant/reload, supported answer and page link, follow-up, cached reuse, stable history, phone keyboard-sized layout, reduced motion, generic MxPro retrieval, offline saved-PDF use and an unsupported question left unresolved. Home and Emulators use the revised neutral wording and sans headings with no portrait horizontal overflow.

- [Chromium + offline results](browser-chromium-390-offline.json)
- [WebKit results](browser-webkit-390.json)
- [Existing-job recovery](recovery-chromium-390.json)

The recovery profile came from the real failing browser journey, with a pending question and saved commissioning PDF. Reselecting the PDF, confirming the variant and reloading retained the job ID, original question ID and every historical message, without another download or a duplicate question. Stored processor `.2` pages were reindexed by `.3` in **78 ms**: all 162 page objects and the original processing timestamp remained identical, and the prior record remained available. The recorded original extraction/OCR timings are historical, not a new OCR run.

Chromium verified service-worker shell **`bc597f9e9304` / 0.31.0**, reloaded with networking disabled, answered from saved text and opened the PDF page. The unsupported offline question produced a missing-evidence response and no fabricated answer. No external requests occurred in that offline path. WebKit's normal UI path passed; installed offline CacheStorage and a physical iPhone remain outside this run's verification.

Root additionally completed **1,375/1,375 Node regression tests**, TypeScript checking, production build and public-asset verification (**1,394 files / 165,499,269 bytes**). The existing public download relay separately returned the real Gent PDF with the expected SHA-256 hash. Local browser transport tests do not by themselves establish publication of the new version.

## Reproduction

Save the independently verified Gent commissioning PDF and Advanced user guide as their catalogue IDs under `/tmp/qq031-pdfs`, then serve `public` on port 8088:

```sh
FINDR_QA_BROWSER=webkit node scripts/verify-questions031-browser.mjs
FINDR_QA_OFFLINE=1 FINDR_QA_RESULTS=research/questions-0.31.0/browser-chromium-390-offline.json node scripts/verify-questions031-browser.mjs
```

`FINDR_QA_REAL_DOWNLOADS=1` disables the PDF transport override. Supply `FINDR_QA_URL` and `FINDR_QA_PROXY=1` to test the actual published relay through the inherited environment proxy. `FINDR_QA_RECOVERY=1` plus `FINDR_QA_PROFILE` selects an existing retained failing QA profile for the recovery check. No profile or model binary is committed. The script uses the workspace Playwright package, `/usr/bin/chromium` and `/tmp/findr027-webkit-run.sh`.

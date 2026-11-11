# MxPro 5 multi-task source review

Reviewed 11 November 2026 against actual manufacturer-authored documents already in FINDR's Manual Archives catalogue. PDFs were downloaded to `/tmp/findr034-manual-evidence`, outside the source tree. No complete manufacturer PDF is included in this change.

## Exact sources

| Catalogue ID | Document | Edition | PDF pages | Bytes | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| `advanced-0254975c10bd` | Advanced MxPro5 — User guide, 680-166 | 04 | 43 | 1,079,368 | `e5a636dd6f10edeb047520368714e04cde7b93bacc9465ab26ec6c30f19c2ce8` |
| `advanced-a18ea5cccf04` | MxPro5 — Product Manual, 680-165 | 05 | 74 | 2,804,250 | `d185e9c6e06af7108cbe373246e6b4fe7f1d4ad6202d3bc79691b1e16829150b` |

Both downloads matched the catalogue hashes. Source URLs remain in `public/app/data/catalogue.json`. Printed page numbers equal one-based PDF positions on every page cited below. Edition 04 of document 680-166 and edition 05 of document 680-165 are complementary user/product manuals, not two editions of one document. Neither establishes that a different current-generation panel or protocol uses identical procedures.

## The reported request comprises distinct tasks

> I need to swap a device, how do I disable outputs, disable the old one, swap it, then re enable device.

The overarching goal is a device replacement. The four requested operations are (1) disable the required outputs, (2) disable the old device, (3) replace the device, (4) re-enable the replacement. Output restoration is also an outstanding issue to record; mentioning a requested procedure does not establish that any disablement or repair has actually happened.

1. **Output disablement:** user guide p27, §3.10.2. It explicitly says, “If disabled, the outputs will not activate in the event of a fire alarm or other programmed event.” Available output categories depend on commissioning. Ask which outputs are intended; never silently select ALL OUTPUTS. ALL SOUNDERS steps are explicitly documented on this page. Sounders and individually addressable beacons are distinct; combined units may disable together.
2. **Individual input disablement:** user guide p26, §3.10.1. DISABLE → ZONE/INPUTS → select the zone → Mode → SELECTED INPUTS → select the required input and confirm. Do not use this route for an unspecified output/module merely because the user calls it a device. The page supports opening more information to identify the actual input.
3. **Physical replacement:** no universal replacement procedure for an unspecified loop device is established by these two manuals. Product manual p28 §2.5.3 explicitly says to connect devices “in accordance with the manufacturers’ data sheet supplied with each unit.” Product manual p7 says its programming/installation information is generic and directs readers to the appropriate protocol application note. Ask for the old/new device part number and protocol; obtain applicable device instructions. A panel software disablement is not evidence of electrical isolation.
4. **Re-enable:** user guide p30, §§3.11.1–3.11.2 establishes separate input and output restoration, including selection of individual outputs. Re-enabling is not evidence that the replacement is compatible, repaired or functionally retested. Product manual p60 §4.1 documents functional checking and logbook entries in its maintenance context; it does not establish an exact post-swap test sequence for every device.

## Access and precautions

User guide p10 §3.1 defines Level 2 as Authorised User and says individual User IDs can have differing permissions. P11 §3.1.1 describes an access key, or MENU → ENABLE CONTROLS → the engineer's authorised password. P18 footnote 2 states that User 1 does not have permission for the marked disablement options. P26/p27 prompt for a password when the current User ID lacks permission. User guide p6 and product manual p7 restrict installation/programming/maintenance to trained service personnel. These sources cannot establish site-specific permission, monitoring arrangements or compensatory protection: those remain explicit job prerequisites, not model-generated assumptions.

## Source defect to preserve

User guide p27 §3.10.2.4 is headed **Fire Protection Outputs**, but its instruction says to highlight **FIRE ROUTING OUTPUT** before disabling fire protection outputs. This is an internal inconsistency in this edition. Do not repair it by guessing a menu path. Show the source conflict and obtain applicable corrected documentation before advising that specific operation.

## Existing retrieval failure, reproduced

Audit used real PDF text extracted with PyMuPDF and the shipped `buildManualIndex` / `retrieveHelperEvidence` functions. This is a source/index audit, not a browser/PDF.js or model-quality benchmark.

- The complete user sentence ranked user-guide p15 (disablement status), product-manual p49 (refers to the user manual), user-guide p18 (menu summary), and p35 (output testing). It missed the actual disable procedures on p26/p27.
- The atomic query `disable outputs` correctly retrieved p27. However, the 1,100-character index split p27: consequences/permission are at offset 0, while ALL SOUNDERS instructions are at offset 1083. The old one-selected-passage precautions check could not retain the supporting context.
- The atomic query `re enable device` returned no passages: `re` was treated as a substantive required term.
- `replace device` retrieved unrelated chassis, battery, text-character and LCD replacement content. Mere overlap of “replace” with an arbitrary device is insufficient procedure evidence.
- When both reviewed PDFs are present, the old `conflicts()` grouped their revision strings by common model and wrongly called their separate document numbers conflicting editions.

The correction should retrieve and assess each requested operation separately, preserve neighbouring section context and document identity, expose supported parts, and ask focused questions for the parts the sources cannot establish.

## Runtime procedure verification

`public/app/data/helper-task-procedures.json` adds four reviewed operations: disable all sounders, disable an individual input, enable an individual input, and enable all sounders. Each uses the existing exact PDF hash, readable page, source quote and model-scope checks. Input recipes do not match an unspecified generic device. Sounder recipes declare `task.extent: "all"` so selected-device restoration cannot silently widen to all sounders. These procedures do not establish a completed action or a physical replacement procedure.

All four procedures passed against the real PDFs processed through FINDR's `analyseManual` and PDF.js in Linux Chromium 154. Results are recorded under `seed.verified` in `browser-chromium-390-ui.json`. This verifies the application reader and source grounding in that browser; it is not an iPhone verification.

The first browser run caught an important extractor difference on p26: PDF.js returned `USER - ID`, where PyMuPDF returned `USER-ID`. Two menu-row anchors unnecessarily included that unrelated label. Both were narrowed to the original contiguous `ZONE/INPUTS OUTPUTS GROUPS` row that supports the claimed route. No quote-normalisation or validation rule was relaxed. A short real browser-text excerpt and `tests/helper-task-source-anchors.test.mjs` preserve this regression; the original over-broad quote still fails and both corrected anchors pass.

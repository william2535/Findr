# XFP and Twinflex manual review — FINDR 0.24.0

Reviewed on 2 November 2026 against catalogue baseline commit `b126f5b4c54709aa161416963d0cf9dde91d8d72`. The additive association file is `public/app/data/fire-service-manuals.json`; the existing catalogue, panel pictures, download IDs and pinned source hashes are unchanged.

All 45 existing catalogue candidates containing XFP or Twinflex in their brand, models or title were retrieved as valid PDFs, including previously retrieved source files. They contain 41 distinct PDF byte hashes and 34 canonical document editions. All 18 existing catalogue SHA256 pins match; there were no failed retrievals or pinned-hash mismatches. These figures describe the current FINDR archive review, not every publication ever issued by either manufacturer.

The audit records each original URL, retrieval result, actual PDF hash and size, page count, document number, edition, model scope and duplicate evidence. PDF headers and page counts were checked using `pdfinfo`; full text was extracted using `pdftotext -layout`. Source covers and relevant model/revision statements were read, with rendered checks of the critical cabinet, generation and compatibility boundaries. This does not claim that every page was visually inspected. Temporary reviewed sources are `/tmp/fire-service-0.24.0/<recordId>.pdf` and `.txt`; those temporary paths are provenance notes, not application dependencies. Full PDFs are not bundled into the app shell; the existing FINDR download system saves them on demand.

## Model and edition boundaries

| Collection | Preferred engineering source | Scope |
| --- | --- | --- |
| XFP Apollo/Hochiki 16 zone | DFU1200510 Rev 3, 36 pages | XFP501E/X and XFP501E/H, one loop |
| XFP Apollo/Hochiki 32 zone | DFU2200510 Rev 2, 36 pages | One- or two-loop 32-zone family; check fitted loops/protocol |
| CAST XFP 16 zone | DFU5010000 Rev 5, 1 October 2021, 48 pages | XFP501E/CA only |
| CAST XFP 32 zone | DFU5010020 Rev 5, 1 October 2021, 48 pages | XFP501/CA and XFP502/CA |
| Original Twinflex V3 | 26-0338 Issue 9, 53 pages | Older Twinflex product; no exact existing picture binding |
| TWINFLEXpro | 26-0959 Issue 13, January 2013, 78 pages | Earlier pro from V2.00; Issue 7 V1.00+ remains labelled historical |
| TWINFLEXpro² | 26-0959 Rev 18, October 2020, 80 pages | pro² from V3.00; current user guide is 26-1028 Rev 5 |

The ten collections also retain separate 16-zone XFP repeater, 32-zone XFP repeater and pro² repeater references. The 32-zone XFP repeater has no exact existing picture binding. Related equipment documents do not establish main-panel engineering behaviour. On a repeater's own picture, its manuals are marked `selected-equipment` so they remain primary references.

## Findings that affect association

- Official XFP 16-zone Rev 3 (`c-tec-6a8ae5ddd7bc`) has the same access-level tree on PDF page 17 as the earlier Rev 1. Its page 20 explicitly describes network/repeater options as non-redundant and not assessed to EN54-2. CAST commissioning and address functions remain separate.
- The historical XFP user guide `c-tec-70f490a601e3` actually prints **DFU2000501 Rev 2**. Other user copies print **DFU2000510 Rev 1**. The printed identities are retained; no universal revision ordering between different document numbers is inferred.
- `fike-6cfbefcbbb78` has a stale TWINFLEXpro archive title, but its actual cover/body identify **pro²**, V3.00+, 26-0959 Rev 18. The PDF hash is `19a3a00c9300574c53573cbdda4eb98fa240e6a7c633bbd5003fec9b439ef5cd`.
- The same stale generation label occurs for `fike-d32c7e8d452f` (actual pro² user guide, Rev 5) and `fike-ccc737b20ef3` (actual pro² repeater user guide, Rev 3). These three IDs are excluded from promotion on the earlier pro picture. Original catalogue records remain searchable and unchanged.
- Current Fike PDF text layers retain older “Issue14Draft” / “Issue3” template strings. The rendered current covers show Rev 18 / Rev 5. Those extracted strings are recorded as text-layer artifacts, not assumed visible version badges.
- Expansion card **505-0007** is only for a four-zone pro² panel. Its source expressly excludes two-zone pro² and earlier pro/Checkpoint Plus. Its conventional zones cannot distinguish smoke from MCP fire signals.
- The **505-0006** accessory sheet names the four-zone earlier pro. Current pro² engineering manual 26-0959 Rev 18, PDF page 20, independently corroborates that card for four additional Twinflex zones. That cross-source evidence is recorded explicitly; compatibility is not inferred from the archive title.
- Repeater, expansion, battery-box, sounder/VAD, application-note, datasheet and brochure documents retain distinct roles. Brochures expressly state that they are not installation instructions.

## Duplicate policy

Canonical entries prefer an existing hash-pinned archive record when one exists. For example, official XFP 32-zone record `c-tec-b03be75d8eb7` is byte-identical to canonical `c-tec-ba3f93b60d06`. Four alternate groups have identical PDF bytes. Other duplicates share the reviewed edition and normalized full text but have different PDF hashes. Every original ID and hash is preserved. An already-saved alternate may satisfy an exact-source action only when its PDF hash matches; matching text alone does not permit substitution for a pinned page source.

Within each family the preferred current engineering source appears before historical editions. User guides, quick-start documents and supporting or related equipment remain labelled. Original Twinflex V3, earlier pro V1/V2, pro² V3, non-CAST XFP, CAST XFP and repeaters are not interchangeable.

## Validation

Run `node --test tests/fire-service-manuals.test.mjs tests/packs-hints-maps-preservation.test.mjs`. The focused checks cover complete candidate accounting, pinned hashes, duplicate evidence, exact picture bindings, protocol/cabinet separation, wrong-generation exclusions, accessory limits and repeater relationships. The existing preservation test checks the 23 protected baseline files. Full regression, build and website publication are separate release checks owned by the main release workflow.

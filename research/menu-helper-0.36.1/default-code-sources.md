# Manufacturer access-reference review

Reviewed 11 November 2026. Runtime data is `public/app/data/panel-default-access.json`; it contains twelve evidence-linked rows, not a universal list of working site passwords. Codes remain strings, so `0000` retains all four digits. Emulator practice credentials were excluded.

| Equipment and scope | Recorded access | Manufacturer document; PDF page |
| --- | --- | --- |
| Advanced MxPro5, manual's software 5000-050-04 onwards scope | Level 3 factory default 7654 | 680-165 Rev 05; p50, §3.3.13 |
| Advanced MxPro4, manual's Mx4100/4200/4400-023 onwards scope | Level 3 factory default 7654 | 680-014 Rev 13; p43, §3.3.12 |
| Gent Nano **V2.xx only** | Level 2 0000, Level 3 3333, Level 4 4444 | 4188-949 Issue 3_05/10; p20 |
| Gent Vigilon / Compact, MCC/MCB V4.53 or greater in the reviewed 2015 scope | Customer Level 2 2222 **once an Engineer PIN is active** | 4188-856 Issue 7_07/15; p54 |
| C-TEC XFP push-button variants in the cited user guide | Level 2 3333 | DFU2000501 Rev 2; pp12/20 |
| C-TEC XFP single-loop 16-zone XFP501E/X or XFP501E/H | Level 3 4444 | DFU1200510 Rev 3; p18 |
| C-TEC XFP 1/2-loop 32-zone variants in the cited engineering guide | Level 3 4444 | DFU2200510 Rev 2; p18 |
| C-TEC CFP 2/4/8-zone keypad entry in the cited shared guide | Documented sequence 2143; **not labelled a changeable factory default** | DFU7001020 Rev 2; p6 |
| Fike TWINFLEXpro², V3.00 onwards in the cited guide | User Level 2A 8737; Supervisor Level 2B SUPR / 7877 | 26-1028 Rev 5; pp30, 19, 32 |

Every entry records its URL, SHA-256, title, edition, PDF position, printed page, access role, model scope, literal quotation and conditions. Catalogue IDs are included where found. One C-TEC catalogue duplicate has the verified hash but no page count; the existing independently reviewed menu-map source supplies its page count. The current official C-TEC downloads still match those previously reviewed bytes. Mirrors are identified by their URLs; manufacturer-authored does not mean manufacturer-hosted or current edition.

The Nano data has explicit firmware applicability so a V3.xx or unknown-version pal must not silently receive V2.xx codes. CAST is excluded from the reviewed XFP rows; TWINFLEXpro² is not legacy Twinflex/pro. Vigilon's Engineer-PIN prerequisite must travel with its customer code. The data includes the site-code caveat on every factory-default row.

## Deliberate gaps

- MxPro4/5 Level 2: their user guides do not establish a default. The product-manual password table is explicitly an **example**; its values are not defaults.
- Nano V3.xx: operating Issue 9_12-21 and installation Issue 11_01-22 do not verify the older V2.xx defaults.
- Vigilon Engineer Level 3: p54 explicitly says the panels leave the factory with **no Engineer PIN code**. This is not a claim about a commissioned panel's current access.
- Kentec Sigma CP: Man-1078 Issue 25 describes key access at Level 2 and a physical Write Enable switch at Level 3. Configuration option numbers are not PINs.
- Tyco Minerva MX/MX2: 17A-05-O Issue 5, firmware 5.0, establishes access levels but supplies no numeric factory default in the reviewed operating instructions.
- TWINFLEXpro² Engineer: the engineering guide's diagram and editable-code example do not explicitly call their displayed value a factory default. That example was not promoted to a default-code answer.

No reset, lost-password or bypass procedure is included. Published defaults do not establish permission, a site's current code, or the suitability of a disablement/test.

## Verification

Seventeen source PDFs were downloaded from the already recorded URLs for this review, and each matched the repository's existing SHA-256. The previously downloaded MxPro5 product manual also matched its existing catalogue SHA-256. Documents were not modified or added to the distributable app.

Ran:

```sh
FINDR_DEFAULT_CODE_PDF_CACHE=/tmp/findr0361-default-code-evidence \
  node --test tests/panel-default-access.test.mjs
```

**5 tests passed, 0 failed, 0 skipped.** This includes checking the actual PDF bytes and every published quotation against its exact page using Poppler `pdftotext`; both supplementary TWINFLEX/Nano evidence and source-backed gap statements were included. Routine test runs omit only the real-PDF audit when its optional cache variable is absent; schema/source-catalogue and conditional-scope regressions still run. These are data/source tests, not physical-panel or iPhone access tests.

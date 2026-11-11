# Vigilon walk-test route review — 0.12.1

Reviewed on 30 October 2026. This note records the evidence used to add a learner-operated walk-test route. It is a source decision, not a claim of validation on physical equipment. The runtime and lesson changes are documented separately.

## Problem in 0.12.0

The Vigilon pack offered a preconfigured `zone-test` scenario, a `zone-test-reference` node without soft keys, and reference help. It did not contain a guided start/stop exercise. Neither `gent-vigilon.json` nor `gent-lessons.json` contained the search terms “walk test”, “walk-test”, “walktest” or the user's spelling “vigilion”. The existing customer practice credential did not grant engineering access.

The original 0.10.0 audit was right to disclose a disagreement in the commissioning manual rather than invent a route. Preserve that historical record. This review adds evidence and a bounded interpretation; it does not turn the conflicting prose into a manufacturer erratum.

## Sources and provenance

### Selected profile: July 2015 classic Vigilon

- Source ID: `gent-vigilon-4188-856-2015`.
- Manufacturer: Gent by Honeywell.
- Document: *Generic Commissioning Instructions for Vigilon 4/6 loop & Compact range of fire panels & network nodes*, 4188-856, issue 7, July 2015.
- [Primary manufacturer document, archive mirror](https://docs.facpmanuals.com/manuals/Honeywell_Gent/vigilon_and_vigilon_compact-installation-2015.pdf).
- 162 PDF pages. Printed page numbers match one-based PDF pages.
- SHA256: `a08baba300272577485f0dc29dfe0addb65815dca59036369256419d30366998`.
- The downloaded bytes match the hash pinned by the original FINDR audit. Pages 53, 81, 104 and 105 were re-read; pages 81 and 105 were rendered and visually inspected.

Page 105 is the EN54 V4 menu map for MCC/MCB V4.53 or higher. Page 81's prose omits a second Test selection and places Zone before On/Off. The diagram includes the second selection, then On/Off, then a zone-number stage with a 1–128 parameter range. Its engineering row excludes the Remote option marked for customer access only. Page 53 distinguishes customer and engineering access. Page 81 describes the approximately five-second default cycle, automatic silence/reset and explicit test-mode removal; other zones continue normal operation.

### Earlier manufacturer map: corroboration only

- Document: *Generic Commissioning Instructions — Vigilon range of panels*, 4188-856, issue 2, December 2006.
- [Manufacturer-origin PDF hosted by Acorn Fire & Security](https://www.acornfiresecurity.com/index.php?filename=GENT%2FVigilon+-+General+Commissioning+Instructions.pdf&route=extension%2Fmodule%2Fdocument%2Fdownload).
- 190 PDF pages; printed page 87 is PDF page 87.
- SHA256: `7efd54ffed941160d7041e006c349407aa4bfa3adacfaf2de4842cc561af0fd9`.
- Page 87 was rendered and visually inspected. Its EN V4.37 map already contains the repeated Test selection before On/Off. It then offers Zone and Device. The 2015 map has only the zone-number stage.

This older map supports the interpretation that the prose is incomplete. Its Device branch and zero-based range are not imported into the 2015 profile.

### Manufacturer training presentation: direct-entry corroboration

- Canonical source ID: `gent-vigilon-plus-basic-training-archive`.
- Title: *Vigilon Plus — Basic Commissioning Training*.
- Publisher: Gent by Honeywell; manufacturer-origin slides mirrored by FACP Manuals.
- [Stable archive download](https://docs.facpmanuals.com/manuals/Honeywell_Gent/vigilon_plus_basic_commissioning_training-2017.pdf).
- 133 PDF pages. References use one-based PDF page numbers because the relevant slide has no printed page number.
- SHA256: `1f1eb22abf19c69e38019524c70ea90424b45285d76218d1e63ae45b8f800dd3`.
- Reviewed pages: 1, 2, 22 and 103. Page 103 was rendered and visually inspected.

Slide 103 explicitly connects the two Test choices to On/Off, direct typing of a zone number or range, and Enter. It shows no separate Zone-button selection. A stray “LOOP” token appears in PDF text extraction but is absent from the visible route; it must not become a learner step. The slide identifies automatic reset and silence as the default test options.

**Edition boundary:** the archive filename and catalogue call this document “2017”. The reviewed slides do not establish a manufacturer issue date. PDF metadata records creation on 7 June 2021 and modification on 2 February 2026. Describe it as an undated training presentation with an archive year label, not a verified 2017 edition. It covers Vigilon Plus and is used only to interpret the matching route structure; it does not replace FINDR's classic VIG1-24/VIG1-72 profile.

### Operator controls and completion context

- Existing source ID: `gent-vigilon-4188-1025-2015`.
- [Vigilon panel and Network node — Operating instructions, July 2015](https://www.midlandfiresecurity.co.uk/wp-content/uploads/2019/05/gent-honeywell-vigilon-Vig-4-6-loops-Oper_2km-4188-1025.pdf).
- 40 pages; existing pinned SHA256: `e065bfe4221da2a1ab1d02df943b2c5442d21abfd519fe6c13c3369201473caa`.
- Page 21 explicitly gives the initial Test/Eng and UserCode F4 selections and physical Enter after the credential. Page 20 explains menu abort and Quit. Page 9 defines the Test lamp as indicating one or more zones in test. Page 12 supplies the separate operator weekly-test and restored-input context.

## Adopted bounded route

Use the 2015 menu diagram for positions, with the Plus training slide corroborating direct numeric entry. This is a documentary inference across consistent structures, not observation of the target firmware running on a panel.

| Stage in the FINDR exercise | Learner control |
| --- | --- |
| Open menu | Menu On/Off |
| Select Test/Eng, then UserCode | F4, F4 |
| Enter the fictional engineering credential | 3, 9, 1, 7, physical Enter |
| Advance the engineering row | F4, `<etc>` |
| Open testing, then the zone-test choices | F2, then F4 |
| Choose start or stop | F2 On / F1 Off |
| Enter the selected fixture zone | 2 |
| Submit | F2 Enter |

The first authenticated engineering row is represented as Loop / Card / Network / `<etc>`; the next contains Config / Test / the conditional Commission choice / `<etc>`. Selecting the first Test reveals FreeBlok / PSU / Datalog / Test. Do not collapse fixed soft-key positions because unrelated fitted or engineering options are not implemented. Unimplemented choices should remain references, not perform unrelated actions.

There is no additional F1 Zone step. Customer code `2468` and engineering code `3917` are separate FINDR-only credentials, not manufacturer defaults or live-site access codes. The exercise accepts only installed fixture zones even though the source parameter range is wider.

## Lesson completion and training conventions

The new exercise starts from normal and requires each keypad action; it must not load the existing preconfigured test scenario as a substitute for entering the route. Use “Walk test / Zone Test” wording and searchable aliases while retaining the panel's Zone Test terminology. Link the existing test help to the start and finish lessons.

Use fictional Zone 2 and simulated sensor L1D3. The lesson should observe the test indication and default cycle, restore the simulated input, then explicitly take the Off route for the same zone. Completion requires the input to be normal, no remaining test zones, the Test lamp off, and no unresolved fixture fire, fault or disablement. A completed cycle, menu closure or acknowledgement alone must not complete the restoration lesson.

Restoring the simulated input before exit and requiring a clean fixture are FINDR teaching policies. Do not attribute an extra input-restoration menu command to page 81. Keep the normal operator weekly test separate from engineering Zone Test.

The numeric form's Cancel/Enter/Quit positions follow the map. Clearing an uncommitted field on Cancel is an explicit FINDR entry convention: the reviewed sources do not independently specify that exact editing behaviour. Cancel, Quit and menu abort must not undo a committed test-zone state. Quit's general exit meaning is supported by operator page 20.

## Limits retained

- No physical panel or firmware recording was used. A target-panel recording remains useful for final hardware comparison, particularly the first authenticated row and parameter display.
- The selected profile remains the July 2015 classic full-size EN 4/6-loop family; it is not a universal Vigilon, BS Commission mode, Compact, Nano or Plus emulator.
- The lesson covers the default automatic silence/reset cycle. It does not certify network, plant, external signalling or installation-specific cause-and-effect behaviour.
- The manufacturer sources require authorised testing and site arrangements. This patch is an offline practice route and does not supply live credentials, credential recovery or plant-isolation procedures.
- Preserve the original 0.10.0 gap and audit as historical evidence. New runtime source notes may explain this bounded resolution and link this review.

## Research method

Primary-document searches used the stronger web search engine. The original Gentexpert URLs remain indexed but returned 404 when opened; the working archive copy was downloaded and matched against the original pinned hash. The menu decisions above were checked against rendered pages, not text extraction alone. No application code was changed by the source-review task, and this note does not claim test results or publication.


## Release validation

The complete suite passed **625 tests**, with no failures, cancellations or skips. The [test output](test-results.txt) includes the new engineering-access, literal lesson replay, abandoned-field recovery, no-auto-press, search-alias and timer regressions. In particular, a guided zone-test pause no longer freezes an accidental four-second display test.

The browser run completed all 36 steps of `gent-walk-test` through visible controls, observed the simulated fire and its five-second cycle, restored the input, took the complete Off route, and reached a normal panel and the completion celebration. Search for `walktest` returned both lessons. Phone-width checks at 390 and 320 pixels showed no page overflow; the 390-pixel run confirmed the nearby instructions/action and highlighted physical route through On. See [browser evidence](browser-validation.json) and [hint screenshot](walk-test-hints-proof.jpg).

The signed Android **0.12.1 / versionCode 19** package passes v2/v3 verification with the existing preview certificate, and all **712 bundled app files** match the prepared source byte for byte. See [Android verification](android-verification.json). Physical phone installation remains untested.

The production web build succeeded and its public-file gate checked **732 files**, retaining APKs **0.12.1 and 0.12.0** and their checksums. The native-only PDF index and archived APKs were excluded from the web output. See [web build](web-build.txt). Physical-panel verification and universal firmware parity are not claimed.

# FINDR wiring packs, hints and menu maps — web 0.23.0

Reviewed 2 November 2026 against web 0.22.0, commit `e8691d604f07fc882a803892d4c6ca7f8722a869`.

## Wiring family packs

**Manuals → Wiring packs** groups all **177 reviewed wiring pictures** into **79 family packs across 28 brands**. Every source page belongs to one explicit family collection. Brand colours, original-page previews, family counts and breadcrumbs make the same collection browsable without requiring a model search. The existing Wiring diagrams gallery and its search/filters remain available.

The pack index retains existing source-picture IDs. Family membership is a browsing association, not an assertion that the included variants are interchangeable. Examples kept separate include CFP and its repeater, XFP 16/32-zone models, Sigma CP/CP-R/XT, the two Advent generations and Gent Vigilon Compact/4–6-loop pages from a shared document. Shared source pages keep an explicit family note. The complete [wiring source review](../wiring-0.22.0/README.md) remains authoritative for model/edition applicability.

Pictures are already included in the verified offline app. A family displays its separate full-PDF saved count; **Save missing PDFs** uses the existing download queue, deduplicates document IDs and retains the family after failure or cancellation. Original manual links and the byte-verified source-page reader are reused. Colours are FINDR navigation accents rather than a claim of manufacturer endorsement.

## Hints for the selected panel

All **13 supported emulator families** share an explicit registry: the nine intruder keypads, Gent Vigilon, Gent Nano, C-TEC CFP Standard and Kentec Sigma CP. HINTS retains the selected family and its model/source limits. During an active task or menu route it reveals the existing coach without restarting the run. Free practice offers documented tasks and menu/control references. Physical keys use their actual labels; training assists remain separate.

Archive panels without an explicitly matched trainer retain their own brand, model and linked manual actions. They receive no guessed instructions from a similar-looking panel or shared manufacturer. Starting a guided task is labelled as loading a fictional practice setup; opening the hint picker alone changes no panel configuration.

Source-only, conditional, conflicting and other-version entries remain searchable as references. They do not gain physical hints from a title match. Independent regressions protect **31 Vigilon and 17 Nano runtime nodes marked `confidence: reference`** from being offered as guided routes. Existing keypad planners and their state/command boundaries are retained.

## All current engines in the map library

The nine intruder maps remain byte-identical, with **8,979 entries**. Four new maps project the already reviewed fire-engine source data into the common library:

| Family | Additional entries | Representation |
| --- | ---: | --- |
| Gent Vigilon 4/6 loop | 456 | Menus, documented reference branches and guided tasks |
| Gent Nano V3.xx | 140 | Menus, explicitly scoped references and guided tasks |
| C-TEC CFP Standard | 61 | Physical controls, indications, SW8 functions and tasks |
| Kentec Sigma CP | 189 | Controls, modes, configuration codes, indications and tasks |
| **Total** | **846** | **13 maps / 9,825 entries overall** |

These counts include groups, settings, source-only references and 76 existing authored fire practice tasks. They are not counts of simulated LCD screens, newly implemented effects or newly verified hardware behaviours. The conventional maps do not invent LCD menus. All nine CFP SW8 functions and all 103 Sigma configuration codes remain represented; Sigma keeps its 48 supported effects and 55 reference-only codes.

An entry receives an interactive route only where the exact engine has a supported path. A supported configuration effect without a verified per-code route is labelled accordingly. Links target the existing Gent, Nano, conventional or keypad controller explicitly. Fire searches preserve device versus zone scope rather than applying the intruder omission synonym universally.

See [fire-map construction and source limits](fire-menu-maps.md), [input and coverage audit](fire-menu-map-audit.json), [original intruder-map baseline](intruder-map-baseline.json) and [preserved-data hashes](baseline-preservation.json). `node scripts/build-fire-menu-maps.mjs --check` verifies the deterministic projection. Sources and engine JSON are reused without changing their editions, observations or simulation limits.

## Offline and release scope

The new pack index, maps and hint/route modules are included in the existing offline integrity manifest. Full PDFs, saved sessions, imports and trainer progress remain in the same local stores. No database migration or PDF rewrite is performed. Wait for **App ready offline** after updating.

See [release validation](validation.md) for automated tests, browser evidence, build and publication boundaries. The signed Android APK remains **0.14.1**, versionCode 26; this release updates the website.

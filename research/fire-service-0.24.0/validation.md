# FINDR web 0.24.0 — release validation

Baseline: web 0.23.0, commit `b126f5b4c54709aa161416963d0cf9dde91d8d72`. Checked 2 November 2026.

## Delivered scope

Two new trainer families provide the 16-zone plastic and 32-zone metal C-TEC XFP variants and the eight-zone Fike TWINFLEXpro² V3.00+ fixture. They add 19 call-outs / 120 authored steps and 202 menu-map entries. The shared atlas now contains 15 families / 10,027 entries. Entries include references, settings, groups and authored tasks; these are not counts of simulated hardware functions or LCD screens.

The manual audit covers all 45 XFP/Twinflex candidates in the current archive, with 41 distinct PDF byte hashes and 34 canonical editions across ten variant-specific collections. Eighteen existing pins match; no retrieval or pinned-hash failure occurred. Existing catalogue, delivery IDs, picture packs, wiring source data, imports, PDFs, fault visits and earlier trainer identities are preserved. The 23-file baseline preservation gate passes.

## Automated and build results

| Check | Result |
| --- | --- |
| `node --test --test-isolation=none tests/*.test.mjs` | **1,067 passed, 0 failed, 0 skipped** |
| Additional tests compared with 0.23.0 | **75**, included in the full suite |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `node scripts/build-service-menu-maps.mjs --check` | Passed; both maps reproduce the frozen reviewed source data |
| `node scripts/build-fire-menu-maps.mjs --check` | Passed; four earlier fire maps preserved |
| `node scripts/merge-wiring.mjs --check --strict-assets` | Passed; 177 source pictures / 105 manuals preserved |
| `python scripts/prepare-app.py` | **1,271 offline assets / 72,251,215 bytes**, revision `eb71adfd7e4a` |
| `node scripts/run-framework.mjs build` | Passed; Vinext retains its informational route-classification limitation |
| `node scripts/verify-public-build.mjs` | **1,315 public files** match source; deployment output **129,070,473 bytes**; expected 40 archived-APK files and native-only index excluded |
| `git diff --check` | Passed |

Focused tests cover source identity and deterministic data generation, all authored lessons and exposed routes, exact panel/cabinet bindings, access loss during edits, NVM/Write Enable changes before confirmation, cancellation, reset-applied configuration, restored state, failed storage reads/writes and retry, source-only boundaries, active HINTS, manual aliases and existing map-search behaviour. The [independent review](independent-review.md) records separately reproduced source and engine findings and their verified corrections.

## Manual delivery

The browser harness uses exact reviewed source PDF bytes for repeatable download, saved-reader and offline checks. Separately, actual requests through the existing public `/api/manual/:id` relay returned HTTP 200 and the expected complete hashes for both XFP32 DFU2200510 Rev 2 (1,146,161 bytes) and Twinflex Rev 18 (5,328,796 bytes). These requests were not intercepted. See [manual-delivery.json](manual-delivery.json). Publisher availability can change; this is delivery evidence at the recorded time, separate from new-version publication.

## Browser acceptance

**Final acceptance passed at both 390 × 844 and 1440 × 844**, using cache `findr-shell-eb71adfd7e4a`, web 0.24.0 and all **1,271 verified assets**. Evidence is in [browser-validation.json](browser-validation.json), [browser-results.jsonl](browser-results.jsonl) and 36 adjacent screenshots. The reproducible harness is `scripts/qa-fire-service.cjs`; fixtures are explicitly labelled synthetic. Source PDFs are real reviewed bytes.

At each width, the browser completed all ten XFP call-outs on each cabinet (56 authored steps / 147 actual key or practice actions per cabinet) and all nine Twinflex call-outs (64 steps / 178 actions). That is **944 lesson actions** across both widths, in addition to the access, cover, memory-protection, cancellation, save/reset, reload and manual checks. Enlarged physical targets meet 44px, with no document-level horizontal overflow. HINTS preserves earned progress and the selected XFP cabinet; its route closes the previous panel modal and retains the Emulators navigation context.

The exact XFP32 and Twinflex installer PDFs were downloaded through FINDR's existing storage flow, opened and checked for painted, stable PDF canvases and matching hashes. An already-saved byte-identical manual alias was reused. API interception was removed before disabling networking. Offline reload retained both new trainers' configuration/progress, all five earlier trainer records, the current fault visit/log, pack usage, a valid imported schedule and the original Gent PDF bytes. The retained schedule was generated with the committed 0.23 parser; an actual offline `L1 D37` search opened its programmed location. Earlier trainer views and the saved fault log also reopened. **No browser JavaScript errors or runtime hash drift were reported.**

## Release boundaries

The face comparison uses original manual figures and manufacturer photographs. The trainer is source-scoped simulation, not physical-panel or firmware certification. Chromium viewport emulation does not establish physical iPhone/Safari testing. CAST XFP, Hochiki device behaviour, original Twinflex, earlier pro and repeaters are not silently substituted into these trainers.

The website is built from the reviewable source commit and published through the established Sites workflow. A local build does not establish publication: successful deployment and live served-source checks are separate release gates. The web version is **0.24.0**. The signed Android preview APK stays **0.14.1**, versionCode **26**; this release does not build or publish a new APK.

# FINDR web 0.20.0 — release validation

Checked on 2 November 2026 against web 0.19.0, commit `ed00c1fa0479ccfc5c111abeec4de2eac33f1843`.

## Delivered change

The existing eight-zone CFP Standard trainer has a source-reviewed fascia, a removable-cover view using the actual installation-manual PCB diagram, and separate SW8/VR1 controls. Its nine documented engineering positions support programming and diagnostics, with explicit fictional inputs and a training clock. Seven new lessons add 93 steps. The complete conventional-panel library has **23 lessons / 158 steps**: 15 CFP and eight Sigma CP lessons. The previous sixteen lessons and the Sigma source profile retain their canonical baseline identities.

See the [source review](README.md), [evidence audit](source-audit.json) and [PCB image provenance](pcb-image-source.json). This release uses the existing archive documents; it does not add a generated hardware picture, claim a new manual edition or introduce another panel family.

## Automated and build checks

| Check | Result |
| --- | --- |
| `node --test --test-isolation=none tests/*.test.mjs` | **900 passed, 0 failed, 0 skipped** |
| Conventional engine tests, including the new level-3 cases | **36 passed**, including replay of all 23 lessons / 158 steps |
| Conventional controller tests | **10 passed**, including prior progress, hints, save/read recovery and per-profile isolation |
| Conventional source tests, including the new level-3 cases | **11 passed**, including original lesson/Sigma preservation, nine-position order and authentic source image |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `python scripts/prepare-app.py` | **1,060 offline assets / 38,562,982 bytes**, final revision `51cc91133d8e` |
| `node scripts/run-framework.mjs build` | Passed; Vinext retains its informational route-classification limitation |
| `node scripts/verify-public-build.mjs` | **1,100 public files** match source; deployment output **94,855,112 bytes**; expected archived-APK/native-index exclusions applied |
| `git diff --check` | Passed |

Engine checks cover cover/access independence; immediate level-3 Next Option versus the existing operator hold; staged/confirmed choices; coincidence and non-latching demonstrations; zone/output delays and override; approximate walk-test cadence and alarm priority; resound selection; diagnostic mappings; and backward-compatible restoration. Imported schedules, packs, fault logs, saved PDFs, Gent/Nano and intruder regressions are part of the existing full suite.

## Browser acceptance

Harness: `scripts/qa-cfp-level3.cjs`, Chromium at **390 × 844** and **1440 × 844**. The labelled [legacy fixture](../../tests/fixtures/cfp-level3/README.md) was generated using the committed 0.19.0 engine. All site inputs and readings are synthetic. PDF download responses use the checked source bytes, so the normal download/validation/local-reader path is tested without depending on a live publisher host.

Both widths drive all 23 lessons / 158 steps through actual rendered buttons, operator three-second holds, cover actions, VR1 selection and explicitly fictional inputs. Separate assertions check the nine-position SW8 cycle, confirmed versus draft settings, coincidence output gating, open/short scenario selectors and all four diagnostic lesson views, the manual action and loaded PDF canvas. Front and PCB zoom controls have hit targets of at least 44 × 44 pixels with no document-level horizontal overflow.

The offline phase waits for the complete cache, disables networking and reloads. It checks stored engineering configuration, walk-test flags, old/new lesson progress, and an active level-3 session with an unconfirmed draft under the refitted cover. SW8 stays hidden until the cover is removed; closing the cover does not invent a lid sensor or exit action. Both the newly saved CFP manual and an earlier Gent manual render offline. Existing synthetic fault visits, imported schedules, keypad settings and the untouched Sigma record remain unchanged while using CFP. Sigma lessons and the return-to-visit link are exercised afterward.

**Complete workflow outcome: passed at both widths on revision `afc4869465ca`.** All 23 lessons / 158 steps completed per viewport; the network-disabled reload, both saved PDFs, retained records and zoom checks passed with no page errors or document overflow. See the [machine-readable browser report](browser-validation.json), [result lines](browser-results.jsonl) and the accompanying front/PCB screenshots.

The final screenshot review identified a Fire Zones title/top-border overlap with the red zone-number row. An isolated CSS positioning correction moved the heading above the numbers without changing controls or engine logic. The full 900-test suite and production build passed again. A [supplemental final visual/offline run](browser-visual-final.json) passed at both widths on release revision `51cc91133d8e`, including heading separation, fit/zoom targets, offline PCB loading, stored settings, SW8/Exit and both saved PDFs. Original exhaustive evidence is retained; the final screenshots have a `final-` prefix.

## Scope and release identity

This is browser viewport emulation, not physical iPhone/Safari testing or physical-panel certification. The historical Standard manual does not establish Economy/AlarmSense behaviour or every firmware edge case. Unsupported draft/last-item behaviours are labelled training policies; the manual's timing-wording difference and EN54-2 warnings remain visible. The PCB figure does not represent a complete cabinet, PSU or electrical-work procedure.

Existing catalogue/pack identities, PDF bytes and database schema are unchanged. The CFP trainer extends its existing v1 local settings record with defaults for old saves; it does not replace other session stores.

The source is committed for review and packaged through the established Sites workflow. Build success is separate from publication; live deployment status and exact served source are checked before claiming the website is updated. The web version is **0.20.0**. The signed Android preview APK remains **0.14.1**, versionCode **26**; no new APK or app-store release is claimed.

# FINDR web 0.21.0 — release validation

Checked on 2 November 2026 against web 0.20.0, commit `3d6f286119accef7c86f80cc74cb4461a9153b9d`.

## Delivered scope

The existing eight-zone **Kentec Sigma CP K11080M2** trainer now uses the documented cabinet/fascia layout, zone groups, physical buttons and two-digit seven-segment display. The cover action exposes the original Write Enable location figure; Write Enable separately controls level 3. Fit and zoom views retain usable phone controls.

Five call-out choices cover whole-zone disablement, add/replace detector panel practice, zone test, internal fault indications and configuration review. Five new lessons add **79 steps**. Sigma now has **13 lessons / 109 steps**; with CFP, the complete conventional library has **28 lessons / 237 steps**. Original Sigma operator lessons and the complete CFP source profile are protected by baseline hashes.

The manual catalogue records **103 configuration codes**: **48 supported simulation effects** and **55 reference-only entries** with their applicable hardware, revision and source limits. Supported effects include source/zone delay selection with operator Ad, sounder resounding, independent relay behaviour, buzzer/earth-monitor suppression, non-latching demonstration and common-sounder inhibition. Unsupported circuitry or unverified key sequences are not silently added. See the [source report](README.md), [audit](source-audit.json) and [original image provenance](write-enable-image-source.json).

## Automated and build results

| Check | Result |
| --- | --- |
| `node --test --test-isolation=none tests/*.test.mjs` | **927 passed, 0 failed, 0 skipped** |
| Conventional engine tests | **53 passed**, including 17 new Sigma cases and replay of all 28 lessons / 237 steps |
| Conventional controller tests | **14 passed**, including call-out launches, level-3 access, settings and actual guided input events |
| Conventional source tests | **17 passed**, including all 103 codes, model/revision boundaries, source warnings and baseline preservation |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `python scripts/prepare-app.py` | **1,062 offline assets / 38,698,257 bytes**, revision `0213a7fad87a` |
| `node scripts/run-framework.mjs build` | Passed; Vinext retains its informational route-classification limitation |
| `node scripts/verify-public-build.mjs` | **1,103 public files** match source; deployment output **95,109,273 bytes**; expected archived-APK/native-index exclusions applied |
| `git diff --check` | Passed |

Focused cases verify cover/access separation, supported versus reference-only setting guards, flashing set dot, repeated Enter as set/review, explicit training reset scope, detector/call-point delay distinction, configured-state reporting, CPU/watchdog reset and silence behaviour, local/fire/fault relay separation, old-schema defaults and malformed-state restoration. The full suite also retains existing imports, fault visits, manual stores, packs and other emulators.

An independent source/engine review found and corrected two output couplings: inhibiting common sounders must not suppress the separate local fire relay, and code 29 suppresses new-zone sounder resound while a fresh eligible zone still requests that relay. A call point entering a detector-delayed zone bypasses that detector-only delay. Retained engineering settings are shown separately from an unconfigured normal fixture; no invented front-panel disablement lamp is used for that distinction.

## Browser acceptance

Harness: `scripts/qa-sigma-level3.cjs`, Chromium at **390 × 844** and **1440 × 844**. The [legacy fixture](../../tests/fixtures/sigma-level3/README.md) was generated using the committed 0.20.0 engine before the Sigma changes. Site inputs and readings are synthetic. The normal manual download/read flow is exercised with the checked Kentec source PDF bytes substituted for the API response, without depending on a live publisher host.

The browser drives every Sigma and CFP lesson through actual rendered controls, including held CFP buttons, source-labelled training assists, Write Enable, numeric code entry and Enter. All five call-out choices launch the expected tasks. Separate checks cover unsupported configuration rejection, resound behaviour, visible diagnostic indications and units dot, cover-state persistence, actual image loading and manual filtering.

Fit and zoom views are inspected at both widths. Zoomed physical keys meet the 44 × 44 CSS pixel target; caption/divider separation is asserted explicitly. Earlier visual issues were corrected before the final asset revision and production build.

The final offline run waits for the complete app cache, disables networking and reloads. It checks active Write Enable, configuration and lesson completions, new and previously saved PDFs, earlier CFP settings/progress and retained synthetic visits/imports/keypad records. **Final outcome: passed at both widths on revision `0213a7fad87a`.** All 28 lessons / 237 steps and all five call-out launches passed per viewport, including the network-disabled reload, both saved PDFs, source image loading, retained records, visible diagnostic readings and fit/zoom caption checks. No page errors or document-level horizontal overflow were reported. See the [browser evidence](browser-validation.json), [result lines](browser-results.jsonl) and accompanying front, zoom and aperture screenshots.

## Limits, preservation and publication

These are Chromium viewport checks, not physical iPhone/Safari or panel-hardware certification. The trainer represents the named K-series fixture; T-series wiring, CP-A, optional boards, analogue circuit thresholds and unverified revision-specific codes remain outside the implemented effects.

Sigma CP disables a whole conventional zone. The add/replace task covers panel-side practice and a fictional checkpoint; it does not enrol an addressed detector, establish compatibility, certify physical work or create an actual fault-visit test result. The source's conflicting switch direction and missing unset/wrap details remain documented; training assists are separate from physical controls.

The database schema, catalogue/pack identities, saved PDF bytes and existing session stores are unchanged. The Sigma v1 settings record receives backward-compatible defaults while the earlier CFP record remains independent.

Source is committed for review and the verified output is packaged through the established Sites workflow. A successful build is separate from publication; deployment status and the exact live app source are verified before claiming the site is updated. Web version **0.21.0** does not update the signed Android preview APK, which remains **0.14.1**, versionCode **26**. No app-store release is claimed.

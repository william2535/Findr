# FINDR web 0.19.0 — release validation

Checked on 2 November 2026. Baseline source: web 0.18.0, commit `188a62b558a9349261606b3bf041d205e1dac89a`. This is an expansion of the existing app, manual/PDF store and emulator library, not a new app or data migration.

## Delivered scope

- **Two new device packs / four pictured families:** Bosch Blue Line Gen2 pet-friendly TriTech and W12 G/H; Risco BWare and iWISE DT AM Grade 3 with complete documented suffixes. Totals: **150 device families, 18 packs, 132 distinct linked documents**. Six PDFs were checked; four applicable existing archive installation records are linked. See [device evidence](../device-packs-0.19.0/README.md).
- **Four new Kentec repeater picture cards:** Sigma CP-R, HydroSense CP-R, Solo Response and Solo 2 Response. Ten existing C-TEC/Kentec cards gain checked user/installation links. Totals: **615 panel families, 86 packs**. Eleven PDFs checked; exact variants and historical editions remain visible. See [panel evidence](../panel-packs-0.19.0/README.md).
- **Two new operator emulators:** C-TEC CFP Standard and Kentec Sigma CP, each an explicitly scoped fictional eight-zone fixture. **16 lessons / 65 steps**, with physical controls, held-button actions, hints, scenarios, source pages and independent local progress. Existing two Gent fire trainers and nine intruder families remain available. See [manual/source scope](README.md).

All pictures are extracted manufacturer photographs or cropped manual figures with credits and hashes. No generated hardware image is presented as model evidence. Shared Bosch photographs remain labelled family illustrations. Unverified K3200 and XFP510-32 picture candidates were withheld.

## Checks run

| Check | Result |
| --- | --- |
| `node --test --test-isolation=none tests/*.test.mjs` | **878 passed, 0 failed, 0 skipped** |
| New engine tests | **22 passed**, including all 16 lessons / 65 steps |
| New controller tests | **8 passed**, including literal controls/holds, active-family manual filtering, save/read recovery and delayed overlapping profile reads |
| New source tests | **5 passed**, covering document identity, page bounds, exact physical controls and scope limits |
| New pack-specific tests | **7 passed**, plus existing catalogue/image/pack regressions in the full suite |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `node scripts/run-framework.mjs build` | Passed; Vinext retains its informational dynamic-route classification limitation |
| `python scripts/prepare-app.py` | **1,058 offline assets / 38,441,954 bytes**, revision `8aac9ad72ceb` |
| `node scripts/verify-public-build.mjs` | **1,097 public files** match source; deployment output **94,615,240 bytes**; expected archived-APK/native-index exclusions applied |
| `git diff --check` | Passed |

## Browser acceptance

Harness: `scripts/qa-packs-emulators.cjs`, using Chromium at **390 × 844** and **1440 × 844**. This is viewport emulation, not physical iPhone/Safari or physical-panel certification.

The browser checks genuine bundled pack pictures, exact part codes, existing PDF download/read actions using the checked source PDF bytes, active-panel-only manual references, every lesson through literal physical controls, real three-second holds, visible lamp tests while held and their release, hints that do not press controls automatically, and disclosed Sigma practice-mode selection. It checks for page errors and horizontal overflow.

A delayed catalogue response deliberately allows early hash navigation before initialization. This exposed and fixed an app startup race: routing now waits for catalogue/controllers/saved state, then renders the most recently requested route. The startup-error Reload action remains available. Controller tests separately retain unread/unsaved progress and prevent a slow previous profile read from overwriting the active profile.

After service-worker readiness, networking is disabled and the page is reloaded. The final flow reopens new trainer progress, new and previously saved PDFs, picture packs and their manuals. Synthetic prior fault visits, imported schedules and older intruder-emulator settings are checked for preservation. Return to fault visit remains available across the new trainer routes.

**Final outcome: passed at both widths on revision `8aac9ad72ceb`.** All 16 lessons / 65 steps completed per viewport. Held lamps, independent saved profiles, completed lessons and disablements, new/old PDFs, new pictures and preserved old records all passed offline checks. No page errors or horizontal overflow were reported.

## Exact limits and preservation

CFP Standard is not an Economy or AlarmSense trainer. Its engineering walk-test setup, commissioning, live electrical readings and internal controls are not implemented. Sigma K11080M2 is not a CP-A/T-series circuit simulator. The checked manuals do not establish its full MODE cycle, so a separate training chooser loads documented targets; it does not invent a hardware key count. Automatic test reset uses an explicit demonstration without claiming a precise hardware delay. These source boundaries are visible in the trainer.

The C-TEC sources match existing archive hashes. The Sigma records retain their existing identities and URLs, but the archive does not pin their revisions/hashes: checked hashes and the Issue06-cover/05-footer discrepancy live in the trainer's source audit, and the UI asks for a saved/downloaded edition check. No archive snapshot or previous PDF bytes were silently rewritten.

All 146 earlier device rows / 16 packs, all 611 earlier panel images/hashes, and previous panel/pack document IDs were preserved. The new trainer uses separate per-profile `conventional-fire-trainer-v1:<profile-id>` settings keys in the existing database. No IndexedDB schema change, data deletion or replacement of saved visits, imports, Gent/Nano or keypad storage was made.

## Build versus publication

The release source is committed for review and the verified output is packaged through the established Sites workflow. A build is not itself a published site; deployment status and the live version are checked separately before publication is claimed.

The web version is **0.19.0**. The signed Android preview APK remains **0.14.1**, versionCode **26**. No new signed APK, physical-panel verification or app-store publication is claimed.

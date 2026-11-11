# C-TEC XFP trainer source review — 0.24.0

Reviewed 2026-11-02. This is document and software verification, not physical-panel certification.

## Exact scope

- XFP501E/X, 16-zone single-loop plastic cabinet, Apollo XP95 fictional fixture. Engineering manual **DFU1200510 Rev 3**, 36 PDF pages, official record `c-tec-6a8ae5ddd7bc`, https://c-tec.com/download?wpdmdl=12092 . SHA-256 `dd2afe39b0a4b2fcb2ad6c83559edc812ab0d43b8db8e3f23423a13e8eed556d`.
- XFP502/X, 32-zone two-loop metal cabinet, Apollo XP95 fictional fixture. Engineering manual **DFU2200510 Rev 2**, 36 PDF pages, official record `c-tec-b03be75d8eb7`, https://c-tec.com/download?wpdmdl=12095 . SHA-256 `a56ad3e3160fa617e4d024dba54bc0e378f5542855be71ee3a35b90083b1faea`. Manuals audit confirmed duplicate pinned record `c-tec-ba3f93b60d06` has identical bytes.
- User manual and log book **DFU2000501 Rev 2**, 28 PDF pages, record `c-tec-70f490a601e3`, https://www.srsalertfire.ie/uploads/WsOIx2U5/XFPUserManual.pdf . SHA-256 `1710cb3359701fc524a96ed38fc165502b62d4737c0d94d1175ef0466773bc14`.

Both selected cabinets use keyswitch level-2 entry and independent four-digit level-3 code entry. The manuals also cover named Hochiki and code-entry versions; the trainer does not silently substitute those protocols/models. CAST manuals are available separately through the family archive, without a claimed CAST engine.

`build-xfp.py` generates 62 source-indexed nodes and 10 authored lessons. Reviewed hashes are pinned, so regeneration does not require temporary downloaded files. Every node has edition-specific page references and a simulation status; reference-only nodes have no executable hint-route claim. Lesson step references follow the actual operation, with user-control references to the user manual.

## Reviewed controls and behavior

- Engineering pp14–15: original cabinet/physical control layout, separately implemented by the face agent. Engineering p17: conditional menu ordering and access trees. p18: four-digit access (1/2/3/4 on Up/Accept/Down/Escape), NVM link separate from access, relock reminder. User pp6–7: physical indicators, including steady fire LEDs after silence and sounder status as fault/disablement rather than sounding indication.
- Engineering pp19–20 and user p19: change/confirm access codes. Both entries must match; Escape is digit 4 inside code entry. A changed level-2 code does not replace keyswitch access. User p19 permits the level-2 code change at level 2 without a stated internal-link operation.
- Engineering pp20–25: optional network card; basic network mode/number, learn preserving or explicitly erasing, find-new accept/reject and assignment, stored fitted-device display, zone/group assignment, day/night times, DST and global/individual sounder disablements. Exact source clean-start sequence is 1,2,3,4,Silence Internal Sounder.
- Engineering pp25–27: target selection, explicit disable/enable confirmation, next-target movement, zone/device dependency and all/group behavior. Losing keyswitch access cancels a privileged draft. NVM-required changes recheck the current link before committing.
- Engineering pp27–33: temporary monitored-point disablement restored on exit; device output bits; output/sounder/relay tests; walk-test return to engineer menu and no output-set operation; blink end selection; stored database and explicitly synthetic PSU/current/version displays; earth monitoring.
- User pp15–19: operator menu, clock, history, disablements and password confirmation. Source actions use the existing manual/archive system, not a new PDF store.

## Source conflicts and boundaries

1. Engineering p17's level-3 tree omits level-2 items and zones-in-test, although p18 says level-2 options are accessible and p19 describes zones-in-test under level 3. We preserve the pictured level-3 key order and route those operator functions through the separately documented level-2 tree. No unverified position is invented.
2. The 16-zone p17 tree still prints a history-print label but explicitly states PRINT OPTION NOT AVAILABLE. That option is omitted in the 16-zone engine.
3. The panel-relay test paragraph on 32-zone p29 copies an output-set selector saying 1–16/all. The three-relay specification and panel-relay screen establish 1–3, used here.
4. The single-loop manual's copied current example includes a second loop. The 16-zone engine only displays loop 1; stored configurations are capacity-checked and isolated by variant.
5. Official 16-zone Rev 3 p20 specifically identifies optional network/repeater functions as non-redundant and not assessed to EN54-2. This caveat is kept in node scope. Earlier Rev 1 was not used as the current source.
6. Loop learn's Escape at the erase prompt **starts the preserve-data learn**, rather than cancelling. Hint planning never presses or suggests blindly escaping an unrelated open editor/confirmation. Explicit physical keys cause all actions.
7. Configuration describes programmed information. It does not prove the present installation. Blink examples only illustrate source-provided physical topology; consecutive addresses are never claimed to be cable order or a break location.
8. Cause/effect, device/zone text, dependencies, sensitivity behavior and I/O output-set assignment require XFP507 PC tools. Calibration, actual duplicate-address polling, commissioning hardware tests, intensive/loop polling, Discovery EEPROM, external print/network events and real network integrity are reference-only. Intensive/loop tests explicitly warn that the real operation suspends fire reporting.
9. Synthetic analogue, PSU/current, versions and site names are training examples, without expected-value thresholds or invented healthy physical results. Optional network configuration is a fictional card fixture; it does not make network events real.
10. The trainer does not certify firmware timing. The test pulse has an explicit training end action; there is no inferred physical I/O effect. The authored fixture has group-1 one-out/all-out mapping only.

## Persistence and verification

IndexedDB keys are `xfp-trainer-v1:16` and `xfp-trainer-v1:32`; selected cabinet is `xfp-trainer-selected-variant-v1`. Existing FINDR PDFs, packs and Fault Finder sessions are untouched. Saves are queued and failed saves retain the last usable record; failed reads prevent practice overwrite until retried. Durable configuration and safe in-progress navigation are restored; temporary diagnostic outputs/monitor disablement stop on leave/reload. A stale restored privileged form cannot commit without current access. HINTS reveals the active task without resetting or advancing it.

Focused tests replay all ten lessons through engine and controller event handlers on both variants, check source references/hashes, cover/access/NVM separation, access loss, code confirmation, cancel/reject preservation, loop-learn semantics, restore bounds, variant selection, save/read failures, and manual routing. Independent browser/mobile/offline evidence is recorded by the release QA agent.

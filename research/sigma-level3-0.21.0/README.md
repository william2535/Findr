# Sigma CP: fascia, level 3 and conventional call-outs

This release extends FINDR’s existing **Kentec Sigma CP K11080M2**, eight-zone K-series trainer. It preserves all eight previous Sigma operator lessons and the complete CFP Standard source profile. Five new Sigma lessons add **79 steps**, giving Sigma **13 lessons / 109 steps** and the conventional library **28 lessons / 237 steps**. A step can be a physical key action, a simulated cover operation or an explicitly fictional input; these counts are not counts of independent real-panel functions.

The primary source is Kentec’s **Man-1078, Issue 25, April 2024**, *Sigma CP (K and T Series) Operation and Maintenance Manual*. Its existing catalogue identity remains `kentec-0d82d93522c3`. The checked PDF has 24 pages, 834,385 bytes and SHA-256 `ce2da02ef49b615e68ae7a1e69b9ffcc54efd8970bbacb9b1589f484d3e30dd6`. The archive does not pin that record’s edition or hash; the trainer therefore retains its edition check rather than silently changing saved files. The supplemental user manual is **Man-1082**, cover Issue 06 / page-footer `_05`, record `kentec-33d8d4b2acfa`, SHA-256 `97522c50ed95e9abbb87fc7332d4950e63c785aa9a48d523393936d25297cee0`. The source bytes were rechecked. PDF and printed page numbers agree for the cited pages.

The [source audit](source-audit.json) records the baseline, preserved identities, every configuration code and exact references. The [Write Enable image provenance](write-enable-image-source.json) records the original Figure 8 crop. Root release validation records engine/browser/build/publication results separately; this source report does not claim a published website or updated APK.

## Appearance and actual controls

Main-manual page 9 establishes the front fascia: zone chart on the left, two columns of general indicators, two groups of four zone fire/fault lamps, a two-character System Mode display, Enable Control keyswitch and seven grey buttons along the bottom. The existing sourced K11080M2 photograph supplies cabinet/colour recognition. MODE and SELECT carry their real `+10` and `+1` secondary legends.

Page 16, Figure 8 identifies **Write Enable behind the aperture in the panel plate**. The cover-off view uses that actual figure, not a fabricated picture of the complete PCB, batteries or mains assembly. Removing the simulated cover alone does not select level 3; the engineer operates Write Enable separately. Refitting it does not invent a lid sensor or discard a setting.

The main manual names **Watchdog Reset** and **Processor Reset** on page 19, but the checked illustration does not establish their exact physical positions. Watchdog Reset is presented as a separately labelled conceptual internal control. Processor Reset remains a reference; it does not claim to restart or repair real hardware.

## Source boundaries for access and configuration

The source contains a direction conflict: page 16 says slide Write Enable **right** for level 3, while page 19 also describes the normal/off position as **right**. FINDR deliberately labels the control **ON / OFF** without teaching an unsupported left/right direction. Page 16 says level 3 produces three buzzer pips every few seconds. Page 19 says General Fault stays lit if Write Enable is left on. These are distinct from detector-alarm and watchdog warnings.

At level 3, **Mode (+10)** and **Select (+1)** enter the code. **Enter** sets the option, and the flashing units dot identifies a set option. Page 16 does not explicitly specify a second Enter to unset it, the initial display, code wrapping or the exact alphabetic-bank sequence. FINDR therefore keeps repeated Enter as set/review, uses an explicitly labelled training starting point where necessary, and provides a separate **Restore training configuration** action. That action is not described as a hardware procedure and does not remove visits, manuals, other trainer progress, zone disablements or test flags.

Operator MODE target selection keeps the earlier disclosed limitation: the manuals name `d`, `db`, `Ad` and `t` without establishing the complete cycle. The training target chooser does not assert a physical press count.

## Configuration coverage

All **103 codes** in Table 8 are recorded with applicable pages and descriptions. **48 codes** have supported simulation effects; **55** remain explicitly reference-only. This is a common-sounder K-series fixture within the existing **sigma_CP 214.hex or later** warning scope, not a claim that every later revision or optional accessory is present.

| Codes | Supported effect or retained boundary | Source |
| --- | --- | --- |
| `00–09` | Common sounder delay time: 30 seconds or 1–9 minutes. Selected zone/source delay and operator `Ad` are also required. | p17 |
| `10` | Common alarm mode, identified by the source as the default. | p17 |
| `21`, `22`, `23`, `26`, `29` | Fire-buzzer suppression, fault-output suppression, earth-monitoring suppression, fire-relay suppression and no new-zone resound. Inputs/indications are not silently treated as repaired. | p17 |
| `31–38`, `41–48` | Detector or call-point delay selection for each zone. Fictional input type is explicit; panel wording alone does not identify an installed device. | p17 |
| `81–88` | Non-latching zones. The manual allows up to 20 seconds to self-reset when sounders operate; the training clock is explicit and not a measured acceptance timer. | p18 |
| `91–98` | Inhibit the selected zone from operating the two common sounder outputs. This is distinct from disabling the zone. | p18 |
| `11`, `12`, `25`, `C1–C8` | Reference-only zonal/two-stage/two-wire sounder arrangements; their hardware is outside the common-sounder fixture. `C` requires SIGMA242.HEX or later. | pp17–18 |
| `24`, `27`, `28`, `2A` | Reference-only physical auxiliary-output timing and source/threshold-dependent call-point discrimination. `2A` requires version 215 onward. | p17 |
| `51–58`, `61–68`, `71–78` | Reference-only ancillary coincidence, intrinsically safe barrier thresholds and legacy short-circuit-as-alarm thresholds. No accessory or electrical threshold is fabricated. | pp17–18 |
| `A1–A8`, `E1–E8` | Reference-only input-persistence and revision-dependent fire-relay inhibition. `E` requires SIGMA242.HEX or later. | p18 |

The source explicitly marks `21`, `22`, `71–78`, `81–88`, `A1–A8` and `E1–E8` as **not complying with EN54-2**. These warnings remain attached to the corresponding entries. No source warning is silently converted into a recommended site setting.

Internal reference indications cover Mains fail, Batt fail, CPU, Aux 24V, Batt low, Earth, System fuse, S1, S2 and Comms. Pages 19–20 explain those indications; they do not establish a cable-break location or a measured fault diagnosis. A synthetic CPU/watchdog cause can clear while its indication stays latched until the conceptual Watchdog Reset. User-manual page 2 supports a steady General Fault and flashing specific fault indicators; page 3 supports steady disablement/test indicators.

## Practical call-out options

Five visible tasks link to guided practice:

- **Disable a detector’s zone:** `d1–d8` affect the whole selected zone, including other devices connected to it. There is no individual addressed-device disablement on this conventional model.
- **Add / replace a detector:** review exact detector/base compatibility and the circuit arrangement, then practise panel-side isolation, a clearly fictional work checkpoint, test and restoration. There is no detector enrolment or “Add device” panel menu. The checkpoint neither certifies physical work nor becomes a real fault-visit test result.
- **Put a zone into test:** use the source `t` target and deliberately remove the test flag afterward. The automatic-reset demonstration does not claim an exact physical timer.
- **Find an internal fault indication:** inspect the documented internal descriptions, then practise synthetic Mains fail and watchdog indications without asserting a component diagnosis.
- **Review level-3 configuration:** operate cover, Write Enable, numeric buttons and Enter; inspect the set dot and leave Write Enable off. Page 23 supplies the configuration-record rationale.

Page 11 describes conventional zone circuits as single radials without spurs/T-junctions, with applicable end-of-line arrangements. The lesson does not universalise an EOL value: the manual also distinguishes LCMU/diode-base arrangements, and the sounder circuit has a different EOL specification. Compatibility tables are on pages 6–7. Actual physical work, commissioning and live measurements remain outside a panel-button simulation.

Pages 13–14 do describe enrolling **repeaters, ancillary boards and sounder boards**, with board/software qualifications and separate commissioning manuals. Those are not conventional detector enrolment and are not presented as the requested detector “Add device” function.

## Preservation and focused source checks

The new source test pins the complete prior CFP profile and the first eight Sigma lessons to canonical hashes from commit `3d6f286119accef7c86f80cc74cb4461a9153b9d`. Existing physical key IDs and catalogue records remain the same. The older CFP test’s whole-Sigma freeze was replaced by this explicit preservation boundary because Sigma now legitimately expands.

Focused source tests check all 103 codes, supported/reference distinctions, edition restrictions, every starred warning, exact model limitations, call-out links, synthetic checkpoints, source pages, legacy identities and the original Figure 8 asset hash. **17 source tests passed** after the content update. These tests verify content integrity and source boundaries; runtime and physical-panel behaviour require their own evidence.

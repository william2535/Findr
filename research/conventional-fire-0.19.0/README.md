# Conventional fire operator trainers — source review

Reviewed 2 November 2026 against four retrieved manufacturer-authored PDFs. The new profiles are **C-TEC CFP Standard**, using the documented eight-zone Standard operator fascia, and **Kentec Sigma CP K11080M2**, using an eight-zone K-series training configuration. These add operator practice to the existing Gent and intruder trainers. They do not connect to a real panel, simulate electrical circuits, or establish a safe/restored installation.

The structured source record is [source-audit.json](source-audit.json). The offline source/feature/lesson data is [conventional-fire.json](../../public/app/data/conventional-fire.json). Each actionable feature and lesson step cites its PDF page and printed page; these coincide on the pages cited. All bytes, editions and links below were checked for this batch. Successful software tests are not physical-panel or firmware certification.

## Documents actually checked

| Source | Checked edition and provenance | Existing manual record | Pages used |
| --- | --- | --- | --- |
| C-TEC DFU7001020, CFP user manual/log book | Rev 2; manufacturer-authored document retrieved from the existing UK Watch archive mirror; SHA-256 matches the archive record | `c-tec-5332c9b751b2` | 3 model feature chart; 6 physical fascia/access; 7 LEDs/lamp test; 8 alarm/silence/reset; 9 faults; 10–11 disablements; 12 delay limits |
| C-TEC DFU7004010, installation/maintenance manual | Rev 1; manufacturer-authored Standard manual from the existing archive mirror; SHA-256 matches the archive record | `c-tec-4b1267f3fefc` | 14 access scope; 15 walk-test description; 16 physical PCB/engineering entry; 17 engineering test programming |
| Kentec Man-1078, Sigma CP K/T operation/maintenance | Issue 25, April 2024, retrieved from Kentec's official URL | `kentec-0d82d93522c3` | 3 variant scope; 9 fascia; 15 general operation/zone disablement; 16 version-specific disabled-input warning, output disablement, test mode |
| Kentec Man-1082, Sigma CP K/T and CP-A user manual | Cover says Issue 06, June 2013; internal footers say `_05`. Both facts retained. Retrieved from Kentec's official URL | `kentec-33d8d4b2acfa` | 2–3 indication examples; 4 access/lamp/sounder/reset controls; 5 zone disable/test; 6 sounder disable/delay scope/return to normal |

The C-TEC official download endpoint returned HTTP 403 during this review. It was not treated as a verified retrieval; the exact existing mirror files supplied the checked material. The Sigma catalogue entries have no pinned hash or edition. Their identities and download URLs are preserved, while the trainer's source metadata records the checked bytes. A downloaded or previously saved Sigma PDF must still be checked against the cited edition. The archive catalogue was not silently rewritten to describe a different saved file.

Sources fetched for review remain in the execution workspace under `/tmp/findr-emulator-source-audit/`; their provenance and complete hashes are in the tracked audit JSON. PDF files are opened/saved through FINDR's existing manual system rather than being marked downloaded merely because their summaries are bundled.

## Implemented evidence scope

The data defines **16 lessons and 65 steps**, eight lessons per model, with six synthetic starting scenarios per model. Inputs, rooms, disablements and fault causes are fictional; none are imported from a customer's live installation.

CFP lessons cover the actual numbered access keys, keyswitch access, shared lamp-test control, internal buzzer mute, alarm silence/resound, cleared-input reset, manual sounder activation, confirmed zone disable/restore, and cancelling an unconfirmed toggle. Its actual fascia has seven pushbuttons and a keyswitch. The left numeric column is **1: dedicated key; 2: Exit Access Mode; 3: Next Option; 4: Enable/Disable / Lamp Test**. The separate Silence/Resound and Reset buttons are not keys 1 and 2. This distinction was verified against the rendered user-manual figure on page 6 and the PCB figure on engineering-manual page 16, avoiding a misleading inference from text-extraction order.

CFP disablement selection starts with a three-second hold of Next Option. Enable/Disable stages a change; Next Option confirms it and moves to the next item. Leaving selection retains earlier confirmed changes but discards the most recent unconfirmed toggle. Zone and output indicators remain tied to those distinct states. Manual evacuation does not invent a detector input and, in the checked edition, does not activate remote/auxiliary fire outputs. The synthetic fixture explicitly chooses new-zone resound; this is a programmable option rather than a universal claim about installed panels.

Sigma lessons cover lamp testing at general access, Enable Control access, buzzer mute with the fault retained, sounder silence/resound, cleared-input reset, and the documented `d`, `db` and `t` targets with Enter toggles and restoration. Its physical face has seven pushbuttons, a keyswitch and a two-character seven-segment display. The common Fire indicator is represented as lit, distinct from the flashing active zone indicators described by the main manual. No fictitious LCD menu is added.

The Sigma manuals tell the user to press Mode until a target is displayed but do **not** establish a complete MODE cycle order. The trainer therefore uses an explicitly labelled **documented-target training chooser**. Choosing a target is a training shortcut; it is not a claim about a real panel's number of button presses. Select/Enter behaviour after reaching a documented target is independently cited. The `Ad` target remains reference-scoped because the default training installation has no configured delays.

The flashing disabled-zone-number warning is explicitly limited to the main manual's **sigma_CP 214.hex or later** scope. The source describes automatic reset of a zone in test only as occurring after a few seconds; an explicit advance of the simulated test cycle does not invent a precise hardware timer. Both the source uncertainty and the fictional fixture assumptions remain visible.

## Deliberately outside this batch

- C-TEC access-level-three programming, live-panel internal controls, walk-test setup, coincidence, non-latching programming, delay setting and electrical thresholds. The walk-test reference identifies the applicable engineering pages without presenting a front-panel shortcut as a verified operator sequence.
- Sigma access-level-three Write Enable and configuration options, electrical K/T differences, CP-A AlarmSense compatibility, delays without configured zones, or exact MODE cycle timing/order.
- Firmware-complete behaviour, sounder/circuit analogue simulation, certification, diagnostic pass values or a claim that a real system has been reinstated.

The older common user manuals also discuss additional variants. Those mentions do not extend this release's scope to every similar-looking cabinet or give exact support for different hardware.

## Verification and integration

`tests/conventional-fire-sources.test.mjs` checks the exact pictured profile identities, manual record/URL integrity, pinned versus unpinned catalogue distinction, source-page bounds, every physical key and lesson step, the visually verified CFP numeric mapping, three-second selection requirement, and the disclosed Sigma cycle/version limits. The pure engine and browser owners verify state transitions, physical interactions, save/reload, hints and offline/manual return separately.

The source/data files are designed for the existing release preparation and service-worker asset manifest. No existing manual IDs, panel IDs, saved PDF identities or trainer stores are replaced by this data addition. Final regression/build counts and publication status belong in the release owner's validation record rather than being inferred from this source review.

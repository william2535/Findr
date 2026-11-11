# Galaxy Dimension menu atlas — evidence and coverage

Reviewed 29 October 2026. The shipped reference is `public/app/data/menu-maps/galaxy-dimension.json`.

## Scope and identity

This atlas describes the manufacturer’s **Galaxy Dimension GD-48, GD-96, GD-264 and GD-520** menu baseline, used through a **Mk7 LCD / KeyProx**. The source editions are Installer **IE1-0063 Rev 1.0** and User **IU1-0063 Rev 1.0**. A document revision is not a verified installed firmware revision. Flex, G2 and earlier Galaxy families are deliberately outside the scope.

The map contains **1,365 reference entries**, including menu groups, commands, settings, status fields and selection values. That count is not a count of independent simulated screens. The original seven Galaxy practice exercises remain the interactive implementation. The atlas expands lookup and explanation; it does not claim that each listed command is now simulated.

## Sources and reproducibility

| Source | Original | Fingerprint |
|---|---|---|
| Honeywell Galaxy Dimension Installer Manual, IE1-0063 Rev 1.0, 306 PDF pages | [Manufacturer-authored PDF on UKWatch archive](https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/Galaxy%20Dimension%20Install%20Manual.pdf) | SHA-256 `b64fa5be0bd932ecb4bee89767ec1de60ef8742614548a005e982a5833812c14` |
| Honeywell Galaxy Dimension User Guide, IU1-0063 Rev 1.0, 48 PDF pages | [Manufacturer-authored user guide](https://dawsonsawyer.co.uk/?mdocs-file=754) | SHA-256 `2319ad38964515e881c37f6cbea1c43c819d7e3f249012811a1539a3410ccdfb` |

For the installer manual’s system-operation section, printed `6-n` is PDF page `n + 74`. For the user guide body, printed page `n` is PDF page `n + 8`. Every map entry carries an exact one-based PDF page and its printed-page counterpart. This avoids the frequent error of using viewer indexes as printed page numbers.

Research originals were read from the existing `keypad-research/galaxy` working directory, opened through web retrieval to corroborate the source, and inspected with PDF text plus rendered pages. Original PDFs are not duplicated into the public app. The JSON records the source fingerprints so a later edition can be compared deliberately.

## Coverage audit

The extraction was checked against the contents, Table 6-1 (PDF75), all section-6 option headings, Table 6-8 (PDF126), zone tables, output-function definitions, and the communication, timing and access-control diagrams.

| Area | Mapped coverage |
|---|---|
| Full Menu | All seven group headings 10–70 and all 43 option entries in Table 6-1 |
| Quick Menu | All ten factory slots, with explicit mappings to the Full Menu and configuration caveats |
| 51 Parameters | All 75 slots; reserved/unavailable 40 and 43 are labelled; documented nested branches included |
| 52 Program Zones | All ten attributes; 52 function slots, including Not Used 44–46; resistance, activity and custom-SIA selections |
| 53 Program Outputs | All seven attributes and 81 function values, with mode/polarity/lighting branches |
| User/manager operations | Setting, display, printing, access log, tests, clocks, codes/cards, timer control, group omit and remote/engineer access |
| 56 Communications | All seven interface branches; mode/format-dependent settings; explicit links for shared external Telecom details; common 20-trigger reference |
| 61 Diagnostics | Latest and Historical branches, all listed diagnostic categories, the seven PSU display-cycle fields, recording/check selection and printing |
| 63–68 | Groups, custom-zone assembly, schedules, autoset/lockout, pre-checks, remote reset and menu-access assignment |
| 69 Access Control | MAX and DCM parameters, reader selection, group/security/antipassback/recall branches and card-format options |
| 71 SPI Key | Blank/formatted-key states, file actions and storage commands, with their state conditions |

There are 169 menu entries, 516 settings, 495 selection values, 85 commands, 55 status fields and 45 references in this baseline. Some descriptions point to an explicitly shared branch instead of duplicating a misleading independent hierarchy.

## How the numbers actually work

`50 Engineer 1` is a grouping heading. `51 Parameters` is the option in that group; its address is **51**, not `50.51`. `51.46` is the nested **Resistance Select** parameter. This differs from `52 → selected zone → 9 Res. Select`, which requires choosing the zone instance before its attribute.

`1002` is a zone address, while `03` inside Function is the **Intruder** function value. They are not menu addresses. The map keeps local `code`, verified option `address`, parent relationships and value kind separately. Repeated user/device/group/schedule records are represented as selectors, not fabricated individual live records.

The factory Quick Menu’s `3` points to Full Menu `21 Display Zones`. Quick slots can be changed in `59 Quick Menu`; the panel also reorders them by access type. A user’s actual Quick Menu therefore cannot be reconstructed from the keypad appearance or factory table alone. [Installer pp6-1–6-2,6-155; user pp10–11.]

## Source reconciliation and extraction hazards

The text extractor renders many star glyphs as `7`. Rendered-page checks confirm **star**, including text deletion and missing-module acknowledgement. Engineer exit is consistently the engineer banner followed by the authorised engineer code and `esc`. The fuller description adds `ent` confirmation after star for a missing-module action. This is not a numbered Log Off menu. [Installer pp6-3,6-29.]

Descriptive text is essential even where a diagram looks complete. External Telecom `11 Fail to Comm` and `15 Backup Module` are **available with different behaviour**, not omitted: the former uses attempt count rather than internal Telecom’s time threshold; the latter has a different backup-device list. External RS232 Copy/Overwrite has a separate software-compatibility limitation. [Installer pp6-119,6-123,6-144.]

Several genuine inconsistencies remain in the source itself:

- **System Print:** the table shows 10 Keypads / 11 Timers / 12 Event Log / 13 All. Nearby prose uses 10 Timers and 11 Event Log. The atlas preserves the table, marks the conflict and asks for the actual screen. [Installer p6-151.]
- **MAX/DCM Menu Recall:** diagrams show Keypad as 3; prose repeats 2 after Menu Mode. Those entries have no asserted complete numeric address. [Installer pp6-178–6-179,6-185,6-190.]
- **MAX Exit Group:** appears in the diagram but lacks detailed MAX treatment. DCM’s similarly named option is expressly unavailable; the two are not conflated. [Installer pp6-178,6-182–6-184,6-188.]
- **Historical Record:** prose says areas 1–7, while the Checks table offers 1–9. All listed areas are indexed, without claiming every firmware records them. [Installer p6-158.]
- **Holiday editor:** the installer describes a Name / Modify Dates level that the user guide does not describe. [Installer p6-39; user p29.]
- **Weekend Pattern Day:** installer marks the local option unavailable and refers to 65.1.6; the user guide describes local selection. The atlas follows the installer baseline and makes the difference visible. [Installer p6-42; user p31.]
- **Periodic PIN change:** installer says six digits, while the user guide says four to six. This does not justify implementing one universal validation rule. [Installer p6-34; user p23.]

Other obvious editorial inconsistencies are explained locally: the DTMF diagram’s attribute 7 label differs from the descriptive Output Groups section, and the Menu Access note calls option48 Datelock despite the main tree and detailed section identifying Engineer Access. These labels are not silently copied into the atlas. [Installer pp6-109,6-112,6-177.]

## Questions that require the owner’s evidence

The JSON carries ten precise questions, ranked by priority and linked to affected entries. The first two are the practical starting point:

1. **Which GD model and software version should be reproduced?** A photograph of Type and Version under `23 System` identifies the baseline.
2. **What is the actual Quick Menu?** A photograph or recording of its numbered entries identifies site-specific changes.
3. Which optional Ethernet, serial, MAX/DCM, audio and wireless modules are fitted to the test system?
4. What numbers appear for System Print’s final reports?
5. Is Menu Recall’s Keypad item 3 on the actual firmware?
6. Is MAX Exit Group visible and usable?
7. Which historical diagnostic areas are actually recorded?
8. Does Holiday Modify Dates introduce the Name / Modify Dates level?
9. Does periodic PIN change enforce six digits or the configured length?
10. Is Weekend Pattern Day available locally, or only under Weekly Schedule?

Only menu/version evidence is needed. Photographs should omit credentials and site account details.

## Existing practice review

The seven existing task paths are consistent with their scoped manuals: omission uses immediate `#` and exits with `esc`; zone inspection uses21 and `#` for readings; log history uses22 with B towards older events; selected walk test follows31 → Activate → Silent → Selected Zones; Function editing selects the zone before attribute1 and value03.

No changes to the practice engine or shared profile were made by this research task. The broader atlas does not turn unsupported physical keys or branches into simulated behaviour. The map’s most relevant corrections are to future expansions: distinguish per-zone settings from system parameters, source-dependent escape/save behaviour, value codes from menu addresses, and user/engineer/Quick Menu context.

## Validation and limits

The JSON passed independent structural checks for unique IDs, valid parents, acyclic paths, source IDs/page ranges, related-node references and declared kinds. Explicit completeness checks cover 43 top-level options, 75 parameters, ten zone attributes, 52 zone-function slots and81 output-function values. A text-to-page label audit checked numeric menu entries, with rendered-page checks where glyphs or table extraction were unreliable.

This is a documented archived baseline, not a hardware-tested digital twin. Exact LCD spacing, state transitions, every scalar range, every repeated on/off value and modern firmware additions require further evidence. TouchCenter setup, standalone RF-RIO setup, installation/wiring, the text-word library, full reporting event-code tables and log-message dictionaries are outside this Mk7 menu atlas. Those exclusions are stated rather than presented as nonexistent panel features.

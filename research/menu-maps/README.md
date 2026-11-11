# FINDR 0.9.0 — menu research index

Research date: **29 October 2026**. This index describes the nine committed maps in [`public/app/data/menu-maps/`](../../public/app/data/menu-maps/), the evidence behind them and the questions needed to improve their match to real installations. The original four-family reports and 0.5.0 validation record are retained as history; the Menvier and Pyronix expansion audits record the additional 0.8.0 work.

FINDR now has **8,979 indexed entries from 22 manufacturer-authored documents, with 88 recorded evidence gaps**. The source documents contain **1,825 PDF pages in total**; individual entries cite **946 distinct source-document/page pairs**. The app has **nine keypad emulators and 62 selected practice exercises**. Atlas entries include values and supporting references; these totals do not claim 8,979 physical or interactive screens, complete firmware emulation or hardware verification.

## Coverage at a glance

These counts are calculated from the current JSON files. “Cited pages” counts distinct `(sourceId, pdfPage)` pairs used by entries within each family. “Source pages” is the sum of the source documents' complete PDF lengths, including front matter and material outside the keypad atlas; it is not a claim that every page yields a menu entry.

| Family and detailed report | Entries | Source documents | Source pages | Cited pages | Recorded gaps |
|---|---:|---:|---:|---:|---:|
| [Galaxy Dimension](galaxy-dimension.md) | 1,365 | 2 | 354 | 166 | 10 |
| [Texecom Premier Elite](texecom-premier-elite.md) | 956 | 3 | 226 | 117 | 9 |
| [Scantronic / Eaton i-on](scantronic-ion.md) | 1,189 | 3 | 215 | 139 | 8 |
| [Orisec CP](orisec-cp.md) | 856 | 2 | 124 | 67 | 9 |
| **Original four-family subtotal (0.5.0)** | **4,366** | **10** | **919** | **489** | **36** |
| [Menvier M750/M800](../expansion/menvier-audit.json) | 1,024 | 3 | 244 | 127 | 8 |
| [Pyronix Enforcer V11](../expansion/pyronix-audit.json) | 1,317 | 3 | 128 | 71 | 11 |
| **Six-family subtotal (0.8.0)** | **6,707** | **16** | **1,291** | **687** | **55** |
| [Accenta/Optima G4 LCD](../expansion-0.9.0/ade-audit.json) | 263 | 1 | 80 | 40 | 8 |
| [Risco LightSYS2](../expansion-0.9.0/risco-audit.json) | 1,146 | 3 | 338 | 155 | 9 |
| [HKC Quantum70 V4](../expansion-0.9.0/hkc-audit.json) | 863 | 2 | 116 | 64 | 16 |
| **Current nine-family total (0.9.0)** | **8,979** | **22** | **1,825** | **946** | **88** |

### What an entry means — original four-family kind counts

The kind definitions apply to all nine maps. The counts in this table are the preserved **0.5.0 original four-family baseline**, not the current nine-map inventory. Use the reproducible inventory command below for current counts by kind.

| Stored kind | Original 0.5.0 count | Meaning |
|---|---:|---|
| `menu` | 453 | A documented menu, group or branch. Some roots are explicitly labelled reference groupings; the hierarchy is not a guarantee of one LCD screen per node. |
| `command` | 235 | A documented action. Listing it does not execute it or imply a simulated implementation. |
| `setting` | 1,758 | A field, flag, parameter or related group of fields. |
| `selection` | 1,557 | A value or choice within its own context, including record selectors and output-function choices. |
| `status` | 163 | A readout, diagnostic field or documented status view. |
| `reference` | 200 | A source note, shared definition, reserved item, separate-edition comparison or supporting reference. |

Repeated records are represented according to the source, without fabricating installed device lists. Some repeated configuration branches are expanded; others link to explicitly shared definitions. Entry totals therefore help track the research, but should not be used to compare firmware complexity or completeness between manufacturers.

## Expansion in 0.9.0

Accenta/Optima, Risco and HKC add seven lessons each, source-specific runtime adapters and recognised physical faces. The original manuals are pinned in their map JSON files and linked through each screen. ADE uses the combined 80-page IU1-0040 Rev1.0 / IE1-0040 Rev1.1 booklet. Risco separates installer G (June 2020, 272 pages), UK user E (August 2021, 60 pages), and the six-page English extract of keypad H. HKC separates the V4.0+ installer (310118_1, 104 pages) from the official earlier user guide (160811_1, 12 pages), with corroborated and uncertain overlaps identified.

The new [face audit](../expansion-0.9.0/keypad-faces-audit.json) records appearance evidence. [ADE](../expansion-0.9.0/ade-audit.json), [Risco](../expansion-0.9.0/risco-audit.json) and [HKC](../expansion-0.9.0/hkc-audit.json) retain source conflicts and implementation limits. The 0.9.0 independent hint audit covers 989 reachable entries, including reference and no-fitted-device outcomes. It checks physical keys and preserves configured settings, omissions, arming and alarms while following hints.

## Expansion in 0.8.0

Menvier and Pyronix use the shared emulator, physical-button hint planner and learning feedback, and each adds seven guided lessons. Their menu maps preserve the exact model and source-edition boundaries. The [Menvier audit](../expansion/menvier-audit.json), [Pyronix audit](../expansion/pyronix-audit.json) and [face audit](../expansion/keypad-faces-audit.json) record source hashes, reviewed pages, implemented behaviors, known differences and focused QA. Android 0.8.0 uses versionCode 11; its release path is `/releases/FINDR-0.8.0.apk`.

Menvier retains distinct older M750/M800 engineer and later M800 manager roots. Pyronix preserves the V11 YES/NO question flow, separate arrow and A/B/C/D keys, and the Day Alarm restriction on Manager omission. Free-text helpers and simplified conditional or hardware-dependent flows are identified at their screens. Exact timing, every permission combination and real equipment behavior are not implied by an atlas entry or editable fixture.

## Pinned sources and separate editions

The JSON source records retain exact URLs, document identity, edition, publisher, page convention and fingerprint. Each entry carries its own `sourceRefs`; the detailed reports explain cross-page interpretation and source conflicts.

| Family | Pinned evidence | Model and version boundaries |
|---|---|---|
| Galaxy Dimension | Installer **IE1-0063 Rev 1.0**, 306 pages; User **IU1-0063 Rev 1.0**, 48 pages | GD-48, GD-96, GD-264 and GD-520 through Mk7/KeyProx. The document revision is not an identified installed firmware version. Galaxy Flex, G2 and earlier families are outside this baseline. |
| Texecom Premier Elite | Installer **INS176-9**, 132 pages; Master User **INS177-9**, 70 pages; Quick Reference **INS222-10**, 24 pages | Premier Elite 48 is the training target; the installer covers additional 24/24-W/48/48-W/88/168/640 models with explicit differences. Older installer arming entries and the later quick-reference differences have separate roots. No combined firmware is inferred. |
| Scantronic / Eaton i-on | Configuration Guide **Issue 1, part 13368866, software 6.0.xx (2019)**, 140 pages; Administration and User Manual **Issue 4, part 14199506, software 7.02.xx (2022)**, 67 pages; User Guide **Issue 3, part 13433640 (2020)**, 8 pages | Installer target is i-on40H+. The 7.02.xx user/admin tree and 2020 omission evidence remain independent. Compact-only options and later installer features are not imported into the older installer tree. |
| Orisec CP | Installation Manual **INS008, ©2018**, 80 pages; User Guide **INS023, ©2017**, 44 pages | Installer covers legacy CP-25/50/100; user guide covers CP-25/50 only. Current CP-10/20/60/200 and W-CP models are not established by these manuals. |
| Menvier M750/M800 | Engineering Manual **496966 Issue 5, ©2005–2006**, 140 pages; M800/M2000 Manager’s Manual **11821957**, PDF metadata created January 2010, 76 pages; User’s Guide **12062453, ©2010**, 28 pages | The engineer root covers the M750/M800 subset. The later Manager root is M800-only and stays separate because timer menus and capacities differ. The User’s Guide supplies the classic keypad appearance/key names. Modern Menvier30/40/100/300 and TS-series are excluded. No matching firmware version is asserted. |
| Pyronix Enforcer V11 | Programming Guide **SAP102028847-02**, 60 pages; Communications Guide **SAP102028846-01**, 28 pages; Extended User Guide **Rev-02**, 40 pages | Enforcer V11 engineer, Master Manager and restricted User contexts remain separate. Hardware-dependent wireless/modem/reader branches carry conditions. Other Enforcer generations and EURO-series panels are not imported into this baseline. |

### Provenance policy

Use manufacturer-authored manuals as the authority for menu wording and behavior. Prefer manufacturer-hosted copies. An identifiable original on a public installer/archive mirror is acceptable when its cover, edition, scope and content can be established. Search snippets, mirror wrapper titles, generic support pages and product photographs do not establish a complete menu hierarchy.

Twenty-one sources have recorded SHA-256 fingerprints of their PDF bytes: nine from the original research, six from 0.8.0, and six from 0.9.0. For the Scantronic 6.0.xx configuration guide, direct PDF download failed but the web PDF reader provided the complete extracted text with all 6,352 line positions. Its `extractedTextSha256` is a fingerprint of that recovered text, **not** a PDF checksum. Usable page images were unavailable for that source, so the report records text/table/body cross-checking instead of claiming visual inspection. The image-based Orisec user guide was read with OCR and rendered-page checks. Other diagram, glyph and permission-table ambiguities were checked against page images where available.

Printed page labels and one-based PDF pages are recorded separately. For example, Galaxy installer page `6-64` is PDF page138; the i-on user map on printed pages28–29 is PDF pages32–33. PDF link targets use the PDF page, not a zero-based array position.

Descriptions are original explanations with short factual labels and page citations. Original manuals retain their publishers' rights and are linked rather than bundled into this new reference dataset. Keep source identity and edition history when revising an entry. If a manual disagrees with itself or another edition, preserve the distinction, attach the evidence and ask for a matching-panel observation rather than silently choosing a universal answer.

## Numbers, hierarchy and navigation

The map deliberately separates the displayed local `code`, an explicitly verified full `address`, a selected record number, a field/value number and source presentation `order`. A complete address is supplied only where the source supports it. Concatenating every breadcrumb number would produce false routes.

| Example | Correct interpretation |
|---|---|
| Galaxy `50 Engineer 1 → 51 Parameters → 46 Resistance Select` | `50` groups options; the verified parameter address is `51.46`, not `50.51.46`. |
| Galaxy `52 → selected zone → 9 Res. Select` | Selecting a zone intervenes. The zone address is not another menu number. |
| Texecom `9 Engineer Utils → 3 View Zone Status` | Local menu selections require their documented confirmation keys. A subsequent three-digit zone number selects a record. |
| i-on Zone Type `05` | A type-selector shortcut for Final Exit. Appendix chapter numbers do not establish a root numeric route. |
| Orisec Programming Menu `00` and Zone Type `04` | The first selects Zone Programming; the second is the Intruder type value inside its own field. |
| Menvier `2.7.3.4` and zone `0002` | Select `2 → ENT → 7 → ENT → 3 → ENT → 4 → ENT` to reach Zone Resistance. `0002` then selects a zone; `2734` is not a root shortcut. |
| Pyronix `CHANGE INPUTS?` and input type `08` | YES/NO traverses the documented questions; the selected input address and type value have their own contexts. A manual chapter number does not become a top-level key sequence. |

The manual's chapter order and a printed parameter table are not automatically the live menu order. Optional hardware, partition/group mode, user rights and current panel state can affect visibility. Key meanings also depend on context: a left/right key can change a value or operate a test rather than enter/back; accepting a field and leaving installer mode can have different effects. Each family report and map retains the documented distinctions.

## Major unresolved conflicts

The full 88-item register is stored in the nine JSON `gaps` arrays and shown in FINDR. The original four-family register contained 36 questions; Menvier adds eight, Pyronix eleven, ADE eight, Risco nine and HKC sixteen. These examples explain why the map does not claim a single universal route for every keypad face.

| Family | Source conflict or missing evidence | How the map handles it |
|---|---|---|
| Galaxy | System Print's table and prose disagree on report numbers10–13; MAX/DCM Menu Recall diagrams and prose disagree on Keypad2/3. | Source-specific interpretation and explicit conflict notes; ambiguous complete addresses are withheld. See installer pp6-151,6-178–6-179,6-185,6-190. |
| Galaxy | Quick Menu is configurable; Historical Record text says areas1–7 although Checks lists1–9. | Factory Quick Menu remains distinct from the site's actual list; listed diagnostic areas do not imply that all are recorded. See installer pp6-155,6-158. |
| Texecom | INS176-9 p46 assigns Omit Zones4; INS177-9 p14 assigns7. Older User Type5/6 are Duress/Arm Only; INS222-10 p18 reverses them. | Separate source roots and value references; no automatic substitution between editions. |
| Texecom | X-10 repeats shortcut6 in the older index; later quick guide uses7. NVM category3 changes between the old example and quick table. System output09 and holiday capacity also differ. | Later additions/differences stay in the INS222-10 reference root. The affected selectors require matching-firmware evidence. |
| Scantronic | Installer6.0.xx and user/admin7.02.xx are separate software baselines. The older deletion prose conflicts about preserving the zone type. | Separate roots; deletion behavior remains an explicit question. See Configuration Guide p22. |
| Scantronic | User permissions table and role descriptions disagree for some restricted roles; Pendants appears in the body but not the summary map. Calendar creation/edit wording also differs. | Retain the documented body route, identify uncertain permissions/order and ask for named-role, named-firmware evidence. |
| Orisec | INS008 p30 shortcut text says03/11 for System Event Logs/Log off; screenshots show02/09. PrintLog and ChimeLog both have02 on p69. | Do not assert complete top-level numeric shortcuts or treat chapter numbers as keys. Duplicate numbering remains visible as a source issue. |
| Orisec | User option8 is duplicated, BeamPair appears as timers09 and27, and voice-message counts differ. CP-100 supports10areas but the ZoneAreas list stops at5. | Retain documented labels and explicit gaps; do not manufacture the missing CP-100 ZoneAreas continuation. Full Master User ChangeSettings remains unexpanded. |
| Menvier | The 2006 engineering guide and later M800 manager guide give different timer menus/capacities. Older Time Switch prose says three while its diagram mentions keys1–4. | Keep edition-specific roots and record scopes. Use three older training records and expose the source conflict instead of claiming a universal capacity. |
| Menvier | Some field bounds and conditional output/test sequences are not fully documented; Manager Engineer Access does not show its number-to-label mapping. | Label training bounds and simplified flows, keep uncertain operations as references and offer verified access-window labels without invented hotkeys. |
| Pyronix | The Programming Guide repeats EOL code2 and disagrees between reader/keypad tables and worked sequences. Some timer ranges and response stages are incomplete or inconsistent. | Disable uncertain numeric assignments and unsupported range editors; retain the source issue and request a matching V11 display. |
| Pyronix | Fast Format screens are less fully described than SIA/Contact ID; Manager Day Alarm restoration lacks a complete repeated-selection prompt. | Do not substitute another signalling format’s sequence. Keep Manager omission restricted to Day Alarm and label the restoration interaction as simplified. |

Other differences, including Galaxy holiday/PIN rules, Texecom attribute and module fields, and i-on calendar labels, are documented in the per-family reports and affected entries.

## Evidence to request first

Start with the exact connected control panel and its firmware. The keypad's appearance alone cannot resolve these questions. The first evidence package should identify the target for each family, then show the menus that differ between documents.

| Priority | Evidence request | Why it matters |
|---|---|---|
| 1 — Galaxy | Photograph **23 System → Type and Version**; identify GD-48/96/264/520. Capture the actual authorised user's Quick Menu in order and list fitted communications/MAX/DCM modules. | Establishes panel/software identity, configured shortcut slots and conditional branches. |
| 1 — Texecom | Photograph the Premier Elite model and **Engineer Utils → System Tests → View Version No.**; identify the keypad and Ricochet/expander models. | Establishes which installer/user edition and wireless generation to reproduce. |
| 1 — Scantronic | Photograph **About → Panel** showing model and firmware; say whether the system uses partitions or part-setting, and identify fitted expanders/comms modules and the exact keypad model/firmware. | Distinguishes the6.0.xx installer and7.02.xx user baselines and identifies hidden branches and keypad-local settings. |
| 1 — Orisec | Photograph **About** for both panel and keypad, then provide a slow scroll of the authorised engineer menu with labels/numbers. Supply the matching Master User Guide if available. | Resolves the legacy/current-model boundary, disputed engineer numbering and missing ChangeSettings tree. |
| 1 — Menvier | Identify M750/M800 and capture **Engineer Menu 2 → Built In Tests → Equipment → Software Version**. Supply its matching Manager manual and capture the time-switch and output-selection screens. | Resolves the old/later source split, contradictory capacity and conditional wizard sequence. |
| 1 — Pyronix | Identify the Enforcer V11 software and fitted modem/reader modules. Capture the disputed EOL/reader choices and the prompt for an already omitted Day Alarm input. | Resolves numeric conflicts, module-dependent branches and the exact reinstatement interaction. |
| 2 — Conflicting selectors | On the identified versions, capture Texecom ArmingMenu4–7 and UserType5/6; Galaxy SystemPrint final report numbers; Orisec PrintLog, UserOptions8 and SystemTimers09/27. | Resolves the most direct numbering conflicts without guessing. |
| 3 — Behavior and permissions | Supply the affected screen sequence and role for i-on user permissions/calendar/Pendants, Texecom field advance/cancel, and conditional diagnostic or device branches. | Turns a documented reference into an accurately bounded future lesson. |

Request menu and version evidence, not PINs, monitoring-account data or site identifiers. For behavior that changes configuration, a disconnected training panel and a spare record give better evidence than an occupied live system. Reset/default selectors can be photographed without confirming the action. Each JSON gap includes the narrower question, affected entries and the evidence needed; those records are the detailed work queue.

## Reproduce a lookup

From the repository root, [`scripts/find-menu.mjs`](../../scripts/find-menu.mjs) loads the same committed maps and search logic used by the app. It performs a deterministic read-only lookup; it does not ask an external model to invent a route.

```sh
node scripts/find-menu.mjs --panel galaxy-dimension "51.46"
node scripts/find-menu.mjs --panel texecom-premier-elite --limit 5 "omit zones"
node scripts/find-menu.mjs --panel orisec-cp --json "View Zone Status"
node scripts/find-menu.mjs --panel menvier-mseries "2.7.3.4"
node scripts/find-menu.mjs --panel pyronix-enforcer "CHANGE INPUTS"
node scripts/find-menu.mjs --limit 10 "zone resistance"
```

Supported profile IDs are `galaxy-dimension`, `texecom-premier-elite`, `scantronic-ion`, `orisec-cp`, `menvier-mseries` and `pyronix-enforcer`. Text output includes the baseline, path, entry kind, source pages and relevant notes. `--json` also exposes the node, source records and any approximate-spelling flag. A missing result is a reason to check the model, firmware, wording and manual; it is not evidence that a panel feature does not exist.

To recalculate the inventory without changing data:

```sh
node --input-type=module <<'JS'
import fs from 'node:fs';
const dir = 'public/app/data/menu-maps';
const totals = {entries: 0, sources: 0, sourcePages: 0, citedPages: 0, gaps: 0};
const kinds = {};
for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
  const map = JSON.parse(fs.readFileSync(`${dir}/${name}`, 'utf8'));
  const cited = new Set(map.nodes.flatMap(node => node.sourceRefs.map(ref =>
    `${ref.sourceId}:${ref.pdfPage}`)));
  const row = {
    entries: map.nodes.length,
    sources: map.sources.length,
    sourcePages: map.sources.reduce((sum, source) => sum + source.totalPdfPages, 0),
    citedPages: cited.size,
    gaps: map.gaps.length
  };
  for (const key of Object.keys(totals)) totals[key] += row[key];
  for (const node of map.nodes) kinds[node.kind] = (kinds[node.kind] || 0) + 1;
  console.log(map.profileId, row);
}
console.log('Total', totals);
console.log('Entry kinds', kinds);
JS
```

This reproduces the inventory, not the manual research or a hardware test. The checked-in JSON files, family reports and expansion audits are the durable evidence records. [`build-orisec-map.py`](build-orisec-map.py) records the Orisec extraction/curation process and requires the fingerprinted original PDFs and its documented working inputs; it is not an app runtime dependency or a universal generator. Expansion scripts and their source checks are documented in the two family audits. Research extraction scripts should not be rerun against a different manual issue without an explicit edition comparison.

## Existing practice and remaining limits

The atlas adds lookup breadth; the current 62 exercises retain their selected task scope and fictional zones/readings. The original four families contribute 27 exercises, and Menvier/Pyronix contribute fourteen and ADE/Risco/HKC contribute twenty-one. The free emulators implement selected source-backed behavior across the broader tree, while reference-only entries remain marked. An entry that describes a bell test, default reset, communicator or output does not by itself make that action executable through FINDR. No live-panel transport is provided.

The independent audit identified an unverified shared-engine shortcut in **Orisec ViewZoneStatus**: digits plus Enter could select a zone even though INS023 p36 establishes scrolling and INS008 pp64–65 does not establish a numeric alternative. That shortcut is excluded from the current lesson; it retains documented up/down zone selection. Exact keypad/firmware evidence is required before adding a numeric alternative. The lesson also deliberately omits zone counters and reset modes. Further simulator changes should be checked against the matching keypad/firmware rather than inferred from shared engine behavior.

The family reports contain the other material limits:

- **Galaxy:** archived Dimension baseline; no TouchCenter or standalone RF-RIO local setup, complete protocol/event dictionaries, every scalar range, or exact live screen pagination and timing.
- **Texecom:** separate editions with unresolved conflicts; no universal SmartCom/Connect expansion, full third-party communicator setup or verified cancellation/return behavior for every field.
- **Scantronic:** exact i-on40H+ and software boundaries; no Compact-only branches, unverified local-keypad setup, every protocol code/log/error dictionary, or complete installation-specific permission/state combinations.
- **Orisec:** legacy family scope; incomplete MasterUser ChangeSettings evidence, disputed top-level ordering, omitted complete event-code expansion and many detailed ranges/defaults; current CP models require their own source set.
- **Menvier:** separate old engineer and later M800 manager editions; helper text editing, labelled training bounds and simplified conditional output/calendar/test flows. The fixed circuit fixtures do not constitute a full electrical model.
- **Pyronix:** V11-only evidence; conditional communication/reader behavior, predictive-text timing, incomplete ranges and hardware-dependent tests remain bounded. Manager Day Alarm omission is distinct from ordinary input omission during arming.

No physical panel has been verified as part of this research release. Manual comparison, source-page checks and software integrity checks cannot establish live firmware behavior. The next improvement is to resolve the highest-priority model/version questions and add narrowly verified screen sequences, with the original evidence retained alongside each change.

## Historical release verification — original 0.5.0 research

For the original four-family 0.5.0 release, the final selected automated suite passed **102 checks with zero failures**. It covered map integrity and source-page bounds, numerical and phrase retrieval, the then-published practice routes, the Orisec input correction, and the existing offline redirect-recovery regressions. Desktop and phone-width local-preview checks confirmed menu lookup, entry navigation, evidence questions, related references, copy controls and links to matching practice tasks. The checked phone layout had no horizontal overflow. This historical result is not the 0.8.0 regression total.

These checks validate the software and recorded structure, not real-panel firmware behavior. See the [historical release validation record](../panel-audit/menu-maps-0.5.0.json) and [interface screenshot](menu-maps-0.5.0-preview.jpg) for the precise scope. The [Menvier](../expansion/menvier-audit.json) and [Pyronix](../expansion/pyronix-audit.json) audits describe the 0.8.0 family-level source and functional checks; final release QA is maintained separately.

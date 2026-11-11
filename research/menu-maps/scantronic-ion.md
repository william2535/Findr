# Scantronic / Eaton i-on40H+ menu atlas

Research and audit date: 29 October 2026.

The accompanying data file is `public/app/data/menu-maps/scantronic-ion.json`. It contains **1,189 sourced entries across four separate roots**. An entry can be a menu, action, setting, dynamic record selector, value, status or reference. This count must not be presented as 1,189 distinct LCD menus, or as 1,189 fully simulated screens.

The installer atlas is pinned to **control-unit software 6.0.xx**, Configuration Guide Issue 1. The later user/administrator atlas is pinned independently to **software 7.02.xx**, Administration and User Manual Issue 4. The existing omission lesson retains a third, independent 2020 quick-guide source. The data deliberately does not combine those editions into a fictional single firmware.

## 1. Sources and reproducibility

| Source ID | Manufacturer document | Edition and scope | Page convention |
|---|---|---|---|
| `cfg6` | [i-on Series Security System Configuration Guide](https://manuals.plus/m/c3243f2cbca970b85037b1ba61cd19e6d75283e105a422e3fc0be3acfe81950c.pdf) | Eaton, Issue 1, part 13368866, 1 October 2019; control-unit software 6.0.xx; 140 PDF pages | Arabic printed body page equals one-based PDF page. Front matter has Roman labels. |
| `user7` | [i-on Series Security System Administration and User Manual](https://www.eaton.com/content/dam/eaton/products/safety-security-emergency-communications/security-intruder-alarm-systems/i-on-series-admin-and-user-guides/eaton-security-i-on-series-admin-user-manual-en-gb.pdf) | Eaton, Issue 4, part 14199506, 24 January 2022; control-unit software 7.02.xx; 67 PDF pages | One-based PDF page = Arabic printed page + 4. The user map is printed 28–29 / PDF 32–33. |
| `user2020` | [i-on Security System User Guide](https://www.eaton.com/content/dam/eaton/products/safety-security-emergency-communications/security-intruder-alarm-systems/i-on-series-admin-and-user-guides/eaton-intrusion-i-on-user-guide-en.pdf) | Eaton, Issue 3, part 13433640, 10 August 2020; 8 PDF pages; no firmware revision asserted | Printed and one-based PDF page numbers agree. |

The configuration guide is the manufacturer-authored original hosted by a public mirror. Its cover, software applicability, final imprint and full Appendix C were checked. The mirror/search wrapper sometimes calls it an “i-on Compact Engineering Guide”; that wrapper title is not the document’s actual title or its full model scope. The guide covers i-on Compact, i-on30R+, i-on40H+, i-onG2SM and i-onG3MM. This atlas filters that family source for i-on40H+.

Direct PDF-byte retrieval from the mirror failed. The web PDF reader did supply the complete extracted document: all **6,352 line positions**, across all 140 pages, were recovered without missing line ranges. A text fingerprint is therefore recorded for `cfg6`; **no PDF-byte checksum is claimed**. The configuration guide’s page images were not delivered as usable image data by that reader, so its table hierarchy was cross-checked against body headings, the contents and structured table extraction rather than claimed as a visual inspection.

The two Eaton-hosted user PDFs were downloaded successfully. The user-menu tables on PDF pages 32 and 33 were rendered and visually inspected to verify their column alignment, labels and permissions. Extracted text alone scrambles those narrow role columns.

| Fingerprint target | SHA-256 |
|---|---|
| `cfg6` recovered text | `2330845128e5763deb6845f9a7b13a52fd0f6d6b9fcf27dca97625c892131201` |
| `user7` original PDF bytes | `dda5e283517ed7bd06f7a221fb6849a6a2d51c2f40af18ba25a12d7368aa511f` |
| `user2020` original PDF bytes | `0641bb8b125fe8f0ae3b90a84a16018472583de4f2c6c0a1eeff82190ad4381f` |

Every atlas entry has an exact one-based PDF page and printed page in `sourceRefs`. The parent’s source is inherited only within the same edition. Supplementary references are added where a description crosses a page or the manual explicitly delegates to another section. The original summaries explain behavior; the data does not reproduce manual prose wholesale.

## 2. Numbering and navigation findings

This is primarily a **labelled scroll menu**. The installer selects named options using up/down and tick. Cross backs out. Left/right are context-dependent: they can change a selection, switch zone names to numbers, or operate a test output. A general rule that right always enters and left always returns would be wrong. See `cfg6` printed/PDF pages 13, 109–111.

Appendix C prints numerals beside main sections, including the alternative “Partitions” and “Setting options” sections and a later jump to “6 Communications”. Those are not established by this guide as usable root keypad shortcuts. Consequently, ordinary menu nodes have `code: null`, and none is given a fabricated full numeric address. `order` is source presentation order only.

Two-digit shortcuts **are** explicitly documented within zone and output **Type** selectors. The guide also says those numbers are not displayed alongside the type on the keypad. They cannot be concatenated with the document’s chapter numbers to form menu addresses. For example:

| Context | Value | Meaning | Evidence |
|---|---|---|---|
| Zone Type | `05` | Final Exit | `cfg6` p. 24 |
| Zone Type | `04` | 24 Hour Alarm | `cfg6` p. 24 |
| Output Type | `04` | Open/Close | `cfg6` p. 49 |
| Zone or device selector | `000`, `PAN<00 W`, expander/keypad address | Identifies an installed record or physical input | `cfg6` pp. 16–20 |
| User selector | A three-digit user number | Selects a user record, not a menu | `user7` printed p. 38 / PDF p. 42 |

The reference root contains all **26 zone-type values, 00–25**, and all **63 individually enumerated output-type values: 00–56 and 70–75**. “Custom Output 1 to n”, starting at 81, is one explicit range entry. The data does not fill gaps in the output numbering or invent a maximum custom-output code. Type descriptions explain function and relevant restrictions, including wired-only zone types, plug-by-only ATS Test, part-set prerequisites, and UK/EU confirmation differences.

### Save and exit behavior

Normal installer configuration becomes persistent when installer mode is exited (`cfg6` p. 12). The exit sequence is cross back to the leave prompt, then tick. The guide requires the reported exit problems to be rectified (`cfg6` p. 14). It does not justify a universal “ignore every fault and leave” shortcut.

Factory defaults apply immediately rather than waiting for normal exit (`cfg6` p. 73). Radio-device deletion has separately documented behavior and a wording conflict on page 22. Bus-device changes and keypad deletion explicitly require leaving installer mode to save (`cfg6` pp. 34, 40, 44). The atlas does not replace these distinctions with a universal transactional-save assumption.

For user zone omission, the right key changes the included/omitted marker and tick confirms. Normal zone omissions are cleared by unsetting; hold-up and tamper-related omission rules have separate conditions. The map explains that omitting a zone concerns monitoring, not disconnecting power from the detector (`user7` printed pp. 31–32 / PDF pp. 35–36; `user2020` p. 8).

## 3. Coverage and source-order audit

Counts include each branch’s parent entry and conditional selector/value descendants. Repeated keypad A–D and part-set B/C/D configurations account for many entries.

| Root / main branch | Entries | Primary coverage |
|---|---:|---|
| Installer 6.0.xx, entire root | 935 | Appendix C and the corresponding detailed chapters |
| Detectors/Devices | 235 | Detector enrollment, zone editing, bus addressing, wired/radio expanders, wired/radio keypads, external sirens, internal sounders, WAMs and cameras |
| Outputs | 91 | Radio, panel/expander/keypad wired, plug-by and custom logic outputs |
| Partitions | 101 | Partition settings, Full Set Link, Remote Set and Calendar Set |
| Setting Options | 132 | Alternative part-setting system; Full Set, B/C/D, Remote Set and Calendar Set |
| System Options | 117 | User access/reset, defaults, installer options, confirmation, hardware, radio, masking, perimeter, shunt groups, time and updates |
| Communications | 162 | Contacts, ARC reporting, speech, SMS, line failure, cloud, web server, mobile data, Ethernet and dynamic DNS |
| Test | 67 | Warning devices, keypad/expander checks, walk test, resistance, signal strength, outputs, user devices, communications, current and locate functions |
| View Log | 4 | All, mandatory and non-mandatory event stores |
| About | 25 | Panel/cloud/device identity, module/Ethernet status and zone mapping |
| Type/address reference root | 99 | Zone/output selectors and address formats; not another LCD root |
| Separate user/admin 7.02.xx root | 153 | User map, body-expanded management, calendar, remotes, Wi-Fi and tests |
| Separate 2020 omission reference | 2 | Existing user-omission lesson provenance |

Across all roots, the schema contains 140 menu entries, 96 commands, 458 settings, 421 selections, 53 status entries and 21 references. A selection can be a value or a template for a dynamic record. Labels such as “Selected contact”, “Event n” and a device address/name template are marked accordingly; they are not claims that a fixed LCD screen contains those exact placeholder words.

### Appendix C completeness ledger

| Printed/PDF page | Audit result |
|---|---|
| 129 | Detector receiver/system deletion scopes, Program Zones and wired expander branches mapped. The single-zone fields and attributes are expanded from pp. 23–33. |
| 130 | Radio expanders, wired keypad fields and the start of i-RK01 mapped. Compact on-board keypad branch excluded. Model-dependent keypad fields retained with conditions. |
| 131 | Remaining radio keypad types, external sirens and internal sounders mapped. Source order retains KEY-RAS Sounder Volume before Battery Only from the summary map. |
| 132 | WAMs, cameras, radio output and panel/expander wired output editors mapped. Camera triggers expanded from p. 47. |
| 133 | Keypad/plug-by/custom outputs and first partition fields mapped. Output type and User Defined details expanded from pp. 48–57. |
| 134 | Remaining partition fields, Full Set Link, Remote Set, Calendar Set and alternative Setting Options mapped. Creation prompts checked against pp. 66–67. |
| 135 | Remaining Setting Options plus System Options → User Options mapped. The reset/text hierarchy was specifically rechecked. |
| 136 | Defaults, installer options, confirmation, hardware, radio, masking, perimeter and shunt groups mapped. Compact-only hardware options excluded. |
| 137 | Time/updates, contacts and initial ARC configuration mapped. Unused legacy IP/email/reporting placeholders are reference entries, not active features. |
| 138 | Remaining reporting, speech, SMS, line-failure and IP branches plus start of Test mapped. Per-message selectors/destinations expanded from pp. 99–102. |
| 139 | Remaining Test, View Log and About mapped. Battery(s) excluded using the explicit Compact-only restriction in the body on p. 113. |

The audit also compared the table of contents with body headings. This caught page mistakes that a top-level table alone would miss: GSM Antenna and Panel Tamper Return begin on page 83; CID/SIA Events begins on page 93; Restorals, Burg Comms Rearm and 21CN FF Ack time are on page 97; Test → SMS is on page 113.

### Body expansions and interpretation rules

Radio keypad, siren, sounder and output enrollment include the receiver selection and device-record selection described in their detailed procedures. These are dynamic selections. WAM Add/Del is named in Appendix C, but its intermediate sequence is not expanded by the body; the atlas leaves that sequence unasserted rather than copying another device’s behavior.

Speech and SMS triggers are attached to a selected numbered message. Destinations proceed through the selected message, its recipient position, a contact, then one of the contact’s two telephone numbers. These levels were added from the body instead of placing every trigger at the wrong parent. Fixed test-call schedules expose Daily, Weekly, Monthly and Disabled as values; hour/day inputs are described without inventing further labelled firmware menus.

Output editors preserve the ordinary pulse fields and separately explain User Defined behavior. On Time can mean pulse duration, timed activation duration or scheduled on-time depending on the output type and Latched setting. Conditional Latched, Off Time and Days entries are supported by page 53; their exact placement in a live editor is not certified by the condensed Appendix C table.

Partitions and Setting Options are alternative roots within installer mode. Their conditions explicitly prevent them being described as simultaneously visible on one installation. Full Set Link concerns common-area partition 1 and the partitions linked to it; it is not an arbitrary bidirectional linking tool (`cfg6` pp. 64–65).

## 4. Corrections and genuine source discrepancies

### Resolved hierarchy and model pitfalls

The correct System Options subtree is:

- **User Options → User Access** for permission-related settings.
- **User Options → User Reset → CSID Code** for the remote reset identifier.
- **User Options → Keypad Text** as the next User Options sibling.
- **Restore Defaults** as the next System Options sibling.

Putting CSID Code or Keypad Text directly under System Options flattens the documented hierarchy. The final data uses Appendix C page 135, the contents, and body pages 71–72 to retain the proper nesting.

**Test → Battery(s) is i-on Compact only** according to the explicit body note on page 113. The summary table’s layout can obscure that restriction. It is excluded from the i-on40H+ map, as are Panel PSU and the Compact on-board keypad/sounder branches. Locate Panel activates an internal sounder, not a location indicator. External PSU current is conditional on an EXP-PSU.

The Signal Strengths order follows the summary/body: Detectors, Radio Keypads, External Sirens, WAMs, Internal Sounders. Radio Keypads is not placed after all other device categories.

### Discrepancies retained instead of silently guessed

| Issue | Evidence and treatment |
|---|---|
| Radio detector deletion | `cfg6` p. 22 distinguishes Delete Detector ID, which retains other configuration, from Default zone, but later says deleting a detector sets its zone to Not Used. Both commands are mapped; the zone-type consequence is flagged for matched-firmware confirmation. |
| Pendants omitted from summary | `user7` printed p. 45 / PDF p. 49 explicitly describes Test → Pendants. It is absent from the printed pp. 28–29 summary. It is included from the body, with exact LCD position unverified. |
| Calendar edit versus creation wording | The later summary uses Event name/time/day and Ward/Partitions. Its creation procedure uses Event Name/Time/Days, Event Actions and Event Exceptions. The older installer edit list uses Name/Time/Days/Actions/Exceptions. Each edition keeps its own labels. The later edit exception component is marked reference because its exact live label/position is not established. |
| Calendar exception field differences | The v6 edit map has Name, Start and End. The later user map lists Exception Name plus separate start/end time/date fields. These have not been silently combined. |
| Restricted role permissions | The later map marks Pair App for Guard, Set Only and Duress, although its introductory role text says those users lack user-menu access. The Remote Password row omits Master/Admin, while personal-editing prose is broader. These require exact-firmware observations. |
| Output-operation prose scope | This is **not treated as a hard contradiction**: the later table and Normal-user description explicitly permit output operation beyond Master/Admin. The operation chapter merely introduces Master/Admin without saying “only”. The atlas retains the table permissions. |
| Short label variants | Shunt Group / Shunt Groups, Siren & Sounders / Sirens & Sounders, and Set Date & Time / Set Time & Date vary between maps and body headings. Preferred map labels retain notes/aliases for the alternative wording. |
| Remote Self-Test | The output-type catalogue calls value 54 unused, while the grade-3 wired-siren test paragraph describes a compatible feature. No grade-3-only self-test support is asserted for i-on40H+. |
| Later-only features | Wi-Fi is retained only in the later user root. The later user introduction’s One Partition attribute mention is not evidence for inserting a new attribute into the older v6 installer map. |

## 5. Existing FINDR practice audit

The existing `scantronic-ion` profile is deliberately a small exercise set. Its seven tasks were compared with these sources. **No correction to those current task routes was required by this audit.** The expanded atlas is separate from the exercise engine.

| Existing task | Checked behavior / route | Result |
|---|---|---|
| `omit-zone` | User Omit Zones; right changes I/O, tick stores; omission returns on ordinary unsetting | Consistent with the independent 2020 p. 8 source and later user pp. 31–32. |
| `restore-zone` | Same user route; restore the included marker and confirm | Consistent. FINDR’s cancellation rule should remain identified as its exercise rule where a source does not explicitly certify it. |
| `check-resistance` | Installer Test → Zone Resistances; wired-zone restriction; name/number toggle | Consistent with `cfg6` p. 110. The plural label is supported. |
| `find-alarm` | View Log; down older, up newer; additional details with right | Consistent with later user printed p. 40 / PDF p. 44. The existing PDF page 44 link was already correct. |
| `walk-test` | Installer Test → Walk Test → System | Consistent with `cfg6` pp. 109–110. The route should not be renamed All Zones. |
| `change-zone-type` | Detectors/Devices → Detectors → Program Zones → selected zone → Type | Consistent. Existing values 00, 03, 05 and 06 agree with the manufacturer’s context-local shortcuts. |
| `leave-installer` | Cross back, leave confirmation, exit checks; normal commit on exit | Consistent with `cfg6` pp. 12–14. The atlas explicitly retains exceptions to the general commit rule. |

The profile’s existing `rightIsEnter: false` and `leftIsBack: false` are consistent with the documented context-sensitive arrow behavior. `commitOnExit: true` and mandatory exit checks match the general installer case used by those lessons. Those flags should not automatically govern factory default, deletion or every future feature without a specific behavior review.

## 6. What remains outside the evidence claim

No physical keypad or control unit was tested. The atlas is a documentary reference and cannot certify every firmware state transition, timeout, simultaneous alarm condition, role combination, editable range or LCD abbreviation. It does not enumerate the entire communications protocol dictionary, every log event, TCP/IP/SSL error, or all possible dynamically generated records.

Keypad-local setup is a distinct interface. Panel-level KEY-KPZ01 / KEY-FKPZ lighting and buzzer fields do not prove the same local setup sequence on a KEY-KP01. The precise keypad model and firmware must be known before that local menu is added. The visual “KEY-KP01-style” trainer is not evidence of hardware identity.

Defaults are not copied indiscriminately: source/model/grade differences and occasional body-versus-map inconsistencies make unconditional default claims unsafe for an accuracy-focused trainer. For example, zone partition defaults differ in the table and explanatory text. The atlas maps the setting and its applicability without forcing an unsupported universal initial value.

### Precise owner evidence to request

The JSON carries eight explicit evidence gaps. The first three establish which menu FINDR should imitate:

1. **About → Panel:** model, firmware, installed language/version and partitioned or part-setting mode.
2. **Installed hardware:** expander types, radio keypad types and communications module. These determine whether whole branches appear.
3. **Keypad model/firmware:** the model label and About → Keypads identity, for local setup and LCD behavior.

Only after those are matched should specific observations settle the narrower gaps: the two radio-detector deletion commands, restricted-role Pair App / Remote Password, the scroll position of Pendants, and Calendar Set → Edit Event / Edit Exception wording. A menu photograph or short ordered scroll recording is more useful than an unspecific “something is missing”. Access codes, credentials and personal contact values are not needed.

## 7. Validation performed

The final data passed schema-required-field checks, unique-ID checks, valid-parent and acyclic-graph checks, sibling-order checks, valid gap target checks, source-ID/page-range checks and the printed/PDF offset rule. All 1,189 nodes have page references. Numeric `code` values occur only in the documented zone/output type catalogues; no ordinary labelled menu has been assigned a shortcut. The exact sets of 26 zone codes and 63 output codes plus the custom range were checked, including the intentional numbering gap.

Source order was checked against every applicable Appendix C page and against the later user-map rows. Body-only expansions remain distinguishable from summary-table entries, and unknown local scroll order is labelled rather than invented. The official user table was visually checked; the older installer table was cross-checked through text, contents and structured extraction with that provenance limitation stated above.

No shared practice data, application behavior, build configuration, source manual, repository history or deployment was changed by this research task. The two owned deliverables are the JSON atlas and this audit report.

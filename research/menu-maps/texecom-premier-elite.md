# Texecom Premier Elite menu research — 29 October 2026

## Result and scope

The menu atlas contains **956 reference entries**, not 956 distinct screens: 107 menus, 291 settings, 398 selection values, 39 status entries, 28 commands and 93 explicitly labelled reference entries. Every entry has an exact printed/PDF page reference. The 789-entry engineer root covers the nine main programming headings in INS176-9. The other roots keep the INS177-9 user/arming menu, the conflicting older arming table, and INS222-10 additions separate.

The primary target remains **Premier Elite 48**, with the LCDLP used as a visual reference. The manuals also cover other control panels. The case and keypad model do not establish the connected panel model, software version, rights, fitted devices or available menus. The actual target firmware has not yet been supplied or observed.

This map is a documented baseline, not a hardware-validated emulator. The existing seven Texecom exercises remain a selected simulation. Do not present all entries as implemented keypad states or claim that the research proves zero errors.

## Source manifest

### INS176-9, Revision 9

- **Title:** Premier Elite 24/24-W/48/48-W/88/168 & 640 Installation Manual
- **Publisher:** Texecom
- **Original:** [Premier Elite 24/24-W/48/48-W/88/168 & 640 Installation Manual](https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/Texecom%20Premier%20Elite%20Installation%20Manual.pdf)
- **PDF pages:** 132
- **SHA-256:** `d856f1824ea17835677cdc3d5602942ceab77f256c37eea5209705c6aa453d21`
- **Scope:** Manufacturer-authored original on installer archive; engineer baseline. No firmware number is inferred solely from revision 9.
- **Pagination:** Printed page number equals one-based PDF page number.

### INS177-9

- **Title:** Premier Elite Series Master User Guide
- **Publisher:** Texecom
- **Original:** [Premier Elite Series Master User Guide](https://texecom-live.s3.eu-west-2.amazonaws.com/wp-content/uploads/2022/02/01102934/INS177-9_Premier_Elite_Series_Master_User_Guide-3.pdf)
- **PDF pages:** 70
- **SHA-256:** `82e5d01905dcf6cb8e9e6c3ec3077dacaedcbc935b5a7bb22f872b80c85cbed1`
- **Scope:** Manufacturer-hosted user baseline. Do not assume its arming numeric assignments match the older installer table.
- **Pagination:** Printed page number equals one-based PDF page number.

### INS222-10

- **Title:** Premier Elite Series Quick Reference Guide / Quick Start Guide
- **Publisher:** Texecom
- **Original:** [Premier Elite Series Quick Reference Guide / Quick Start Guide](https://texecom-live.s3.eu-west-2.amazonaws.com/wp-content/uploads/2022/02/01102933/INS222-10_Premier_Elite_Quick_Start_Guide.pdf)
- **PDF pages:** 24
- **SHA-256:** `88587f7804ea621bbb82e5ef62ca9be7f4af59d1c6017e2f5199bb35ec64142f`
- **Scope:** Manufacturer-hosted corroboration and explicitly separate additions/differences. Not used to silently expand the INS176-9 firmware baseline.
- **Pagination:** Printed page number equals one-based PDF page number.

The source PDFs were downloaded into research scratch and text/diagrams checked there. Manufacturer-authored originals are the evidence; third-party summaries were not used to define menu values. No manuals or credentials have been embedded in the app. The delivered structured JSON is the durable research record.

## How numbers are interpreted

- **Main headings:** 1 Zone Setup; 2 Area Programming; 3 Global Options; 4 Keypad Setup; 5 Expander Setup; 6 System Outputs; 7 UDL/Digi Options; 8 Setup Users; 9 Engineer Utils. Yes enters the selected heading. 0 is the separate engineer-logoff command.
- **Local submenu identifiers:** 9 → Yes → 3 → Yes reaches View Zone Status. The next three digits select a zone; they are not another menu number.
- **Value identifiers:** in Zone Setup, a selected zone can have type 3 Guard. The type value 3 is unrelated to main heading 3 Global Options.
- **Attribute positions:** 1–8 select a bit/flag position while editing an attribute group. Repeated display letters such as A or F are not unique identifiers across groups.
- **Fields advanced with Yes:** zone, keypad, expander and user records contain field sequences. Their presentation order is not converted into fictitious numeric menu addresses.
- **Output namespaces:** first select an output bank and record, then its function group, function value and modifiers. System type 13 and Area type 13 mean different things.
- **Record identifiers:** zone addresses, user numbers, expander/network addresses, area letters, timer indexes and ARC records all have their own context.
- **Order field:** source/presentation order only. Null code means no dependable number was established; it does not mean zero.

## Coverage comparison

| Source area | Captured structure | Limit |
|---|---|---|
| INS176-9 pp45–46 | All nine main headings, their indexed submenus, part arms and engineer exit/logoff | Exact live Menu/Reset return behaviour remains to be recorded |
| pp48–53 Zone Setup | Field sequence, 22 zone types, two attribute groups, conditional key/custom attributes, nine wiring values, area/text/chime/group and MT2 learning | Wireless mode replaces wiring; not every conditional device parameter is established |
| pp54–61 Area Programming | Eight main branches, timer group identifiers, arming modes, suite structure, 39 area options and time-arming fields | 640 group handling is model-conditional |
| pp62–71 Global Options | Eleven branches, 34 system timers, 54 two-state configurations, ten system options, hardware flags, timer fields, messages and tones | Language/country values are referenced by their matrix, not all enumerated as menu leaves |
| pp72–75 Keypad / Expander | Record field sequences, input mappings, all listed options, auxiliary-input choices and tone flags | Fitted devices and allowed area capacity still determine visibility |
| pp76–82 Outputs | Eight banks, shared field reference, eight function groups, 54 System types, 72 Area types, zone functions, modifiers, X-10 and custom/group references | X-10 shortcut conflict is exposed; shared references are not invented menu screens |
| pp83–94 UDL/Digi | Nine branches, ARC fields and protocol conditions, UDL flags, module settings/readouts, Com-port choices and allowed-port subsets | Protocol-dependent field visibility has source inconsistencies |
| pp95–106 Integrations / reporting | Reporting-table locator and excluded-scope record | Integration instructions and Contact ID/SIA payloads are not falsely turned into keypad menus |
| pp107–111 Setup Users | Fields, ten baseline user types, options/config flags, TAG and MT2 SmartKey routes | User rights, Grade mode and firmware filter options |
| pp112–123 Engineer Utils | All 19 entries from the index, log types/hotkeys, tests, zone diagnostics, network data, version, iD and Ricochet | NVM category list comes from the separate quick-guide root because numbering conflicts |
| p124 Part arms | Three selections and per-zone inclusion field | No live arming/emulation implied |
| INS177-9 pp14,32 + detailed pp16–61 | Separate arming and user roots, user fields and battery-replacement entries | Its numbering is not merged with INS176-9 |
| INS222-10 pp5–6,13–14,18–20,23 | Corroboration plus separately labelled additions and changed values | Not treated as a complete newer firmware map |

## Discrepancy register

These are differences in the actual source documents, not guesses to be concealed in the simulator.

1. **Arming-menu numbers.** INS176-9 p46: 4 Omit Zones, 5 Cancel Exit, 6 Disarm Areas, 7 Use Anti-code. INS177-9 p14: 4 Cancel Exit, 5 Disarm System, 6 Use Anti-code, 7 Omit Zones. The two roots retain their editions. The existing Omit-function-key exercise is unaffected.
2. **User types 5 and 6.** INS176-9 p108 and INS177-9 p46: Duress=5, Arm Only=6. INS222-10 p18: Arm Only=5, Duress=6, with Prevent Unset additionally listed by scrolling. This can change the meaning of entered values.
3. **Output-bank shortcut.** INS176-9 p46 gives both Custom and X-10 key 6. INS222-10 p13 assigns X-10 key 7. The older X-10 entry has no asserted numeric shortcut.
4. **Output function 09.** INS176-9 p77 names System type 09 Bell Fuse Blown; INS222-10 p13 names it System Over Voltage. System type 02 is also differently labelled. These tables must stay version-specific.
5. **Default NVM categories.** INS176-9 p119 example says 3=Keypad Outputs; INS222-10 p20 says 3=RedCARE Pins and 4=Keypad Outputs. The complete later category list stays in the supplement.
6. **Holiday capacity.** INS176-9 p70 states eight dates; INS177-9 p57 offers 24. No single capacity is asserted across editions.
7. **System Text flow.** INS176-9 p69 has a key/example mismatch for Banner Message. The seven-field definition is retained, and its direct shortcut should be checked.
8. **Zone attribute glyphs.** INS176-9 p51 uses ON TEST/T and ACTIVITY/A, while INS222-10 p6 uses Soak Test/S and Activity/F. The quick-guide Reset row also appears misnumbered. The map keeps the installer meanings/positions and does not guess universal LCD glyphs.
9. **Radio generation.** INS176-9 p49 explicitly moves MT2 detector learning to Zone Setup and SmartKey learning to Setup Users. Configure Radio on p121 is explicitly non-MT2. INS222-10 p5/23 additionally shows a top-level Learn Ricochet route.
10. **Radio/communicator text.** INS176-9 p93 repeats AV No.3 in the contact list; the map does not manufacture an evidenced AV No.2 label. Report Areas applicability differs between the p86 flow and p87 prose. The Hybrid paragraph on p53 has inconsistent set/sleep wording; only the verified mode name is mapped.
11. **Additional diagnostics.** INS222-10 p20 includes View Key Strokes, Signalling Test and View Unique ID that are not part of the older documented engineer utility set. They are separate supplement entries.

## Existing trainer audit

The seven existing Texecom exercises were inspected against this research: ordinary omit/reinstate, circuit resistance, last alarm, walk test, zone type and engineer logoff. Their core target paths match their declared sources. In particular:

- Engineer resistance is a readout in 9 Engineer Utils → 3 View Zone Status; there is no invented Resistance submenu.
- Omit in View Zone Status is a **diagnostic disable of zone and tamper**, automatically cleared on leaving that diagnostic menu (INS176-9 p116). It must remain separate from the ordinary user omission lesson.
- The alarm selector opens the chosen log with its choice digit, with context-specific log filters, Area and Part functions (p112).
- Zone Setup begins at the type of a selected three-digit zone; Yes normally continues through further fields (p48). The starter exercise supports only that first field.
- 0 Log off ENGINEER then Yes is the dedicated session exit; merely returning to the engineer heading does not log off (pp45,47).

The current practice controller deliberately simplifies Reset and cancellation and does not implement the full Zone Setup field sequence. The source does not justify silently promoting those trainer rules into a claim of exact real-panel behaviour. The exact return/cancel states are a concrete hardware-recording gap. No shared practice files were changed by this research task.

## Questions for the owner

The JSON contains nine structured gap records. Prioritise these three evidence requests:

1. **Target identity:** photo of the exact panel model and the software version from Engineer Utils → System Tests → View Version No. Hide serial numbers, site names and all codes.
2. **Read-only menu order:** a short recording of the Arming Menu and the engineer main menu; identify which numbers select Omit Zones and the relevant user-type values. This resolves the actual version rather than guessing from the keypad case.
3. **Wireless inventory:** the Ricochet expander generation/model and whether Learn Ricochet is a main-menu entry.

Once those are known, ask the remaining targeted questions in the map about X-10/NVM selectors, holiday capacity, return/cancel behaviour and the specific ambiguous field labels. Do not ask the owner simply “what menus are missing?” The current data explains exactly which observations will resolve which source conflicts. For the NVM selector, observe labels only and do not confirm a reset.

## Validation

- All 956 node IDs are unique.
- Every non-root parent exists and no parent cycle was found.
- Every source reference names one of the three pinned sources and a valid exact one-based PDF page.
- Structured gap references resolve to actual node IDs.
- Numerical definitions were checked for contiguous ranges: zone types 0–21, area options 1–39, global timers 0–33, configuration 00–53, system options 0–9, System outputs 00–53 and Area outputs 00–71.
- The shared output editor, legacy arming table and newer additions are explicitly typed reference entries, preventing a navigation UI from implying that their editorial group labels appear on a keypad.
- Repeated choices are retained only where they occur in distinct field or access contexts.
- Source PDFs and key index/flow pages were inspected; no physical panel, credential entry, arming or programming was performed.

## Files

- `public/app/data/menu-maps/texecom-premier-elite.json`: structured atlas, source manifest, navigation, numbering notes, coverage and gaps.
- `research/menu-maps/texecom-premier-elite.md`: this audit and handoff record.

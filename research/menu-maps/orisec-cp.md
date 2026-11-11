# Orisec CP menu research — 29 October 2026

## Baseline and evidence

This map uses Orisec's **INS008 (2018)** installation manual for the legacy **CP-25, CP-50 and CP-100**, and keeps **INS023 (2017)** user procedures for **CP-25 / CP-50** in a separate root. Neither edition proves which firmware is installed on a particular control panel. The MK-700 is a physical keypad style reference, not a firmware identifier.

Both PDFs are manufacturer-authored originals hosted by UKWatch Security. Full source URLs, one-based PDF page references, printed-page references and SHA-256 fingerprints are retained in `public/app/data/menu-maps/orisec-cp.json`. Printed and PDF page numbers match in these copies. The user PDF is image based; its page images were rendered and OCR was used as a reading aid. Key labels and menu screenshots were checked visually where needed.

The official current product page was also checked: <https://www.orisec.co.uk/control-panels/>. It lists other contemporary families and capacities. This is evidence for keeping newer CP-10/20/60/200 and W-CP devices outside the legacy map, not evidence that the old menu is valid for them. Orisec's public Installer Portal link redirected to a sign-in page; no restricted source was accessed.

## Structural coverage

The source-specific index includes every numbered **Programming menu group 00–24** printed in INS008 pp31–63. It includes the authored field headings and short parameter/value labels within those groups. The 25 groups are Zone Programming, System Options, Area Options, Area Timers, System Text, User Setup, Panel Outputs, Keypad Setup, Keypad Outputs, Expander Setup, Expander Outputs, Control Timers, Holiday Dates, Com Port Setup, Coms Modules, Speech Dialler, Voice messages, ARC Setup, Fast Format Channels, ZX-5C Setup, Test call & Pre-dial, UDL Options, X10 Outputs, Chain Setup and Remote Output Setup.

The extraction script uses the PDF's authored font hierarchy to distinguish the numbered group headings, field headings, and short parameter/value names. It deliberately does not copy the explanatory paragraphs. Curated summaries explain commonly queried features; other entries point directly to the authoritative parameter page. The script is retained as `build-orisec-map.py`, requires the identified original PDFs as inputs, and rebuilds this map deterministically. It is not run in the public app.

All **13 Tests & Diagnostics entries, 00–12**, are indexed from pp64–68. The map adds meaningful internal references: walk-test sound modes, inactive-zone periods, zone-status modes, device diagnostic screens, communications-module views and test-call event selections. Actual diagnostic activation is not implemented by the map browser.

The remaining engineer sections cover wireless learning, event/mandatory/chime logs, print log, event filters, Create / Edit Chains, Confirm Devices, SIA/Contact ID editing, clock/calendar fields, About, and the distinct Exit Menu and Log off & exit actions. The full event-code table is linked at pp70–72 rather than exposed as hundreds of invented navigable menu screens.

The separate user root includes documented setting/unsetting and area operations, Omit zones, chime, logs, system tests, Change my code, Reset alarms and Exit menu. The visible Change settings label is retained as an explicitly incomplete reference: INS023 does not supply that submenu. Optional keypad features use the user guide's **Keypad Text** column: User Control, X10 Control, Alarm Clock, Chime, Messages, Send SMS, LCD Message and Timer. These differ from installer permission-flag names and are not silently conflated.

## Numbering and ordering

The two-digit number beside a Programming group or diagnostic entry is local to its parent. A number beside Zone Type is a **type value**. A number beside a flag identifies a **parameter/flag**. Numbers in an event record or zone selector have another meaning. The schema and interface distinguish these contexts.

The numbered chapter heading “4. Tests and Diagnostics” is not a keypad shortcut. No complete top-level shortcut list is invented from the chapter numbers. Main engineer/user root ordering is identified as document/reference order where the manual does not establish a complete live sequence. Parameter/value lists also do not claim that every item is a separate LCD submenu.

## Confirmed source problems and questions

1. **Top-level shortcuts (INS008 p30):** the text gives System Event Logs as03 and Log off & exit as11; the two screenshots show02 and09. Both were checked visually. The map retains the labels and withholds the disputed top-level codes. A model/version-labelled scroll through the real engineer menu will resolve the target version.
2. **Print log (p69):** both View chime log and Print log carry02. The former is retained as documented; the latter is not assigned an invented03. A photo of the actual log submenu is needed.
3. **User Options (p47):** Simple key fob and Key fob MA1+2 both have option8. Their numbers remain marked as conflicting.
4. **System Timers (pp35–36):** Beam pair appears at09 and27. The exact on-panel labels, units and context-help text are needed before treating them as the same or different timers.
5. **Voice-message count (p67):** the installer paragraph says10, while the selector procedure says1–15. INS023 p38 separately supports15, but does not establish the firmware of the installer example.
6. **Test-call events (p67):** both Arm Failure and Arm Fail are listed. Their relationship is not guessed.
7. **Master-user programming:** Change settings is visible in INS023 p22 but its tree is missing. INS008 p73 delegates user details to a master user guide. Obtain the version-matched guide or redacted menu captures.
8. **Target identity:** obtain the control-panel and keypad model/software lines from About. A current, version-matched installer manual would support a separately versioned map rather than overwriting this baseline.

The JSON gap records carry precise questions, affected node IDs, priority and the evidence required. No passcode is needed to document these differences.

## Existing exercise audit

The six existing Orisec exercises remain consistent with their bounded sources: Tests & Diagnostics →00 Test Bell & Strobe; →01 Walk Test Zones; →03 View Zone Status; System Event Logs →00 View event log; and separate INS023 user omission/restoration. Top-level numerical shortcuts were already absent, so the newly discovered top-level numbering conflict does not require inventing or changing a shortcut in those exercises.

Omission is available to Master/Manager users in INS023 p21, is controlled by left/right on the selected zone, and returns with Back. Reinstate on Disarm is an installer option. The omission lesson does not disconnect the detector. User logs and tests are also Master/Manager features (pp24,32), and user log printing is CP-50 only (p26). The map records those limits.

INS008 p74 expressly distinguishes Exit Menu (engineer still on site) from Log off & exit. The map explains this distinction rather than presenting both as identical save/exit commands.

## Independent review and corrections

A second researcher sampled the map against the original PDFs, including all25programming-group labels/codes, short-heading extraction, output semantics and significant access/model conditions. This caught a dropped superscript in **In 2nd Entry** (p49), which has been restored. It also added the explicit CP-50/CP-100 limits for Radio Coms (p56) and Bell Power Off output78(p50), model-specific output-area limits, and the precise COM-port counts.

The review corrected optional keypad features to an installer-enabled, unset home-screen context without a user code or NFC tag, corroborated by INS008 p54. Alternative output functions are now selection/reference entries rather than independent-setting claims. CP-100 supports10areas, but the source's detailed Zone Areas enumeration stops at5; that missing continuation is a ninth question instead of invented entries6–10.

## Validation boundary

The generated map passes unique-ID, parent, cycle and exact-page validation. Counts describe indexed reference entries, including many parameter values, not physical screens or new simulator exercises. An independent reviewer checked sampled hierarchy, model/permission limits and the material source conflicts before release. Physical panel, firmware timing, complete cancellation behaviour and all live configuration permutations remain unverified.

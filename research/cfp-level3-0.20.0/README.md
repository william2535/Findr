# CFP Standard: accurate fascia and access level 3

This change expands the existing eight-zone **C-TEC CFP Standard** trainer. It keeps the Sigma CP profile and all sixteen previous conventional-panel lessons unchanged, while adding seven CFP engineering lessons containing 93 steps. The complete conventional library now has **23 lessons / 158 steps**. A lesson step may involve a physical button sequence, a simulated cover/VR1 action or an explicitly fictional input; these counts are not a count of independent real-panel functions.

The source is the existing manufacturer-authored **DFU7004010 Rev 1**, *CFP 2/4/8 Zone installation & maintenance manual*, archive record `c-tec-4b1267f3fefc`, SHA-256 `6e04b478f4fe32f3f33a0365e660a5629a6621882a6231b3f2d56985d6c1ace8`. The local PDF was re-read and its bytes rechecked. It is the checked historical Standard edition, not a claim that every similar-looking CFP, Economy or AlarmSense has these controls. The front-fascia reference remains **DFU7001020 Rev 2**, PDF/printed page 6. See [source-audit.json](source-audit.json) for hashes, preserved baseline identities and exact function/page evidence.

## Physical source evidence

The user-manual page 6 figure establishes the front's eight zone-label boxes, separate general Fire lamp, horizontal red and yellow zone-indicator rows, the four numbered keys in the left column, the three independent operator buttons and keyswitch. Keys **1 / 2 / 3 / 4** are the dedicated code key, Exit Access Mode, Next Option and Enable/Disable/Lamp Test. Silence/Resound and Reset are separate buttons; they do not become numbered access-code keys.

The removable-cover view uses **Figure 12, PDF/printed page 16** of the engineering manual. This is the Main Control PCB, not a guessed photograph of the entire cabinet, power supply, batteries or mains section. The original figure locates the real tactile controls SW1–SW7, the internal **SW8 Access Level Three Functions** button and **VR1 Delay Minutes** control. The actual figure crop is recorded in [pcb-image-source.json](pcb-image-source.json), including its source hash, crop rectangle, rendered dimensions and derivative WebP hash. No generated hardware picture is used as evidence.

The cover control changes the simulation view. Removing it alone does not enter engineering access; SW8 is the documented entry. Replacing the cover does not imply an invented lid switch, automatic access exit or change to stored settings. Lessons explicitly use Escape Access before replacing the cover. User-level controls remain usable with the lid removed, as page 16 states.

## Functions and evidence

Page 16's **S-shaped line** establishes this exact SW8 sequence:

`Coincidence → Nonlatching → Delays → Test → System Fault → Repeater Fault → Open Circuit → Short Circuit → Sounder Status → Coincidence`

Pressing SW8 first selects Coincidence and lights Accessed steadily. The selected function is identified by its flashing yellow indicator. Escape Access exits engineering access. Zone fault lamps are temporarily reused to display the selected function's information; normal fault/disablement information is not silently erased.

| Function | Checked behaviour and limits | PDF/printed pages |
| --- | --- | --- |
| Coincidence | Pairs 1/2, 3/4, 5/6 and 7/8. Next Option selects a pair; Enable/Disable stages a choice; Next Option confirms it. Both paired zones must be in alarm for automatic sounder/output operation. The manual marks this function **non-compliant with EN54-2**; the warning remains visible in the trainer. | 14–16 |
| Nonlatching | Individual zones. A cleared non-latching input clears its alarm without a manual reset; remote and auxiliary fire outputs are not triggered by that zone. The manual also marks this function **non-compliant with EN54-2**. | 15, 17 |
| Delays | Individual zones, then Remote Output, then Auxiliary Output, then explicitly back to zone 1. Next Option confirms selections. VR1 sets one common period; the text permits **1–10 minutes**, even though the diagram also prints a zero tick. | 15, 17 |
| Test | Select individual zones and confirm them. **Exit access level 3 before testing.** A non-test alarm temporarily suspends testing until reset. The sounding cadence is described as approximately one second on/eight seconds off, not an exact measured acceptance timer. | 15, 17 |
| System Fault | Read-only diagnostic mapping: zone indicator 1 means watchdog, 2 site-memory corruption, 3 PLL. These are codes in this view, not detector-zone faults. System indications require their relevant reset/check; clearing a synthetic cause does not establish a physical repair. | 21 |
| Repeater Fault | Read-only mapping of the zone fault indicators to repeater numbers 1–8. It does not imply that a detector zone has that fault. | 22 |
| Open Circuit | Read-only display of the detector zones with known open-circuit indications. It does not locate a physical cable break. | 19 |
| Short Circuit | Read-only display of detector zones with known short-circuit indications. A generic zone fault is not automatically reclassified as an open or short. | 19 |
| Sounder Status | Direct Enable/Disable toggle. **Three quick flashes followed by a longer gap:** a new zone resounds. **Equal on/off periods:** a new zone does not resound. No Next Option confirmation is specified for this setting. | 15, 17 |

The user-level three-second Next Option hold is **not** transferred to engineering programming. Engineering instructions say to press Next Option to select the first item. Selecting a programming item is distinct from confirming it.

## Source limits retained

The engineering instructions explicitly make Next Option the confirmation action, but do not spell out every unconfirmed-exit or last-item wrap case. The simulator commits confirmed choices and labels its unconfirmed-draft handling as a training policy. Delays has an explicit documented return to zone 1; other programming loops do not acquire an asserted firmware wrap merely by analogy.

There is a source wording difference for Test indications: page 15 describes the zone and General Test lights pulsing quickly together, whereas page 17 says they are lit steadily after Escape Access. This difference is recorded in the data and source audit. A training-clock demonstration does not certify universal indicator or sounder timing across firmware revisions.

This is a training interface, not permission to open or alter live equipment. No electrical measurements, hardware-component removal, circuit resistance limits, mains procedure, or diagnosis of a real installation is generated by the cover control. Underlying circuit values and coupled undocumented edge cases are outside this release's evidence scope.

## Data and preservation

The CFP profile retains its existing identity, front-control IDs and original eight operator lessons. SW8 and VR1 are separately identified in `internalControls`; they are not appended as invented front-panel keys. The Sigma profile and its eight lessons remain byte-equivalent as canonical data. Baseline hashes in the source audit protect both facts.

New guided tasks cover opening/access/exit, coincidence, non-latching, zone/remote/auxiliary delays and VR1, one-man test and restoration, new-zone resound and the four diagnostic views. All have source locators. Explicit fictional inputs are separate from real buttons. Programming lessons finish by restoring their changed settings and leaving engineering access.

`tests/cfp-level3-sources.test.mjs` checks preservation, the physical/internal distinction, all nine function positions, source-located actions, warnings, timing/draft limits and the authentic PCB crop. The existing conventional source tests now distinguish internal lesson keys from the unchanged front controls. Final engine, browser, offline, build and publication outcomes are recorded by the release owner; this source report alone does not claim publication or a signed APK update.

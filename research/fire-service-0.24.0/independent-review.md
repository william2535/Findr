# Independent source and engine review

Reviewed on 2 November 2026 by the manual-review agent, separately from the XFP and Twinflex implementation owners. Runtime files were not edited by the reviewer. The review concentrated on access controls, protected writes, reset-applied settings, menu order and claims about hardware behaviour.

Sources checked were XFP 32-zone DFU2200510 Rev 2, XFP 16-zone DFU1200510 Rev 3, Twinflexpro² 26-0959 Rev 18 and its 26-1028 Rev 5 user guide. Exact record IDs and PDF hashes are retained in `manuals-audit.json` and the trainer source data. The source PDFs were available for direct text and rendered-page review.

## Findings resolved and independently checked

| Finding | Source or observed defect | Final verification |
| --- | --- | --- |
| XFP access loss during an edit | Returning the key to level 1 left a pending level-2 zone disablement editable. | Public-key sequence now leaves the zone enabled; the pending privileged form is cancelled. Owner also added protection against restoring a stale privileged form. |
| XFP event-log order | Engineering manual page 17 places Print before Display, then Reset. | Data now lists `print-history`, `history`, `reset-history`. |
| XFP final fitted-device page | The final screen labelled an empty row as address 131, beyond the fixture's 1–126 range. | Public navigation to the last page shows addresses 121–126 and an empty second row. |
| XFP Clean Start scope | Page 25 describes returning memory to defaults; the first implementation retained changed settings. | After changing DST, the documented five-button confirmation restores the fixture default and clears the learned database. Physical cover and NVM-link state remain retained. The owner added a broader simulated-settings retention/reset regression. |
| Twinflex Supervisor versus Engineer menu | Supervisor option 3 is Delays in installer pages 28/31 and user guide pages 19/23. Engineer option 3 is Re-Sound in installer pages 33/39. | Typing `3 ENTER`, `3 ENTER` selects the correct option at each access level. A route to the Supervisor-only option is rejected from Engineer access. Numeric selection respects the access-specific list. |
| Twinflex System Test sound | Installer pages 31/37 describe local audible test, although the paragraph duplicates Audible Test wording. The initial engine made System Test silent. | A zone-1 test produces zone-1 sound only, then resets the fictional input after an explicit five-second time step. The duplicated-source limitation remains recorded. |
| Twinflex Engineer access and temporary buzzer | Page 24 permits new access levels from Normal, except 3A→3B. Page 44 restores the temporary buzzer when leaving Engineer. | Turning the Enable key during code-based Engineer access cannot jump to User. Buzzer changes require 3B, and normal exit restores the buzzer. |
| Twinflex protected writes and Re-Sound application | Pages 19/33 require Write Enable for engineering changes and reset before configuration takes effect. | Re-Sound is stored as configured state and remains unapplied until RESET. Removing Write Enable before confirming a zone-power draft prevents the write. |
| Twinflex Write Enable reminder | Page 23 requires a system fault on the LEDs and display outside Engineer access. The first LCD still said System Normal. | Both the normal LCD and Current Faults now identify the Write Enable reminder. |

Verification used the exported public engine APIs and physical-key sequences. The reviewer independently reran four XFP correction checks and eight Twinflex access/menu/output checks after the owners' fixes. No unresolved defect from this review remained at that point. This review is separate from the release's full regression suite, browser acceptance, build and publication checks.

## Remaining source limits

- These are fictional training fixtures, not firmware or electrical verification. XFP is scoped to Apollo XP95 examples in the selected 16- and 32-zone cabinets. CAST, Hochiki behaviour, original Twinflex, earlier pro and repeaters are not substituted for the active trainers.
- NVM unlock and XFP installer access remain separate. Twinflex Write Enable and Engineer access remain separate. Refitting a cover does not imply either memory protection mechanism has been restored.
- XFP's page-17 level-3 tree omits positions for some functions mentioned elsewhere. The trainer uses their documented level-2 routes instead of inventing a level-3 position. XFP 16-zone Rev 3's network/repeater caveat is retained.
- Hardware-only diagnostics, network/peripheral behaviour, unavailable programming functions and uncertain device effects remain references where verified simulation is unavailable. Synthetic readings are labelled and do not establish real expected-value thresholds or cable-break locations.
- The duplicated Twinflex System Test paragraph supports local sound in this implementation; it does not establish an all-zone output pattern. Explicit simulated time steps do not certify real firmware timing.
- XFP Clean Start restores the trainer's declared fixture defaults. This is not a claim that every hidden physical-panel setting or factory default has been reproduced.

# FINDR 0.12.0 fault-finder research and data audit

Reviewed 30 October 2026. This release expands the observation guide from **13 groups, 55 questions and 41 cause hypotheses** to **32 groups, 215 questions and 136 cause hypotheses**. The guide is a source-supported way to organise observations and possible causes. Its numerical weights are editorial heuristics; they are not calibrated against real fault cases, manufacturer failure rates or prevalence data.

The runtime dataset is [knowledge.json](../../public/app/data/knowledge.json). [data-audit.json](data-audit.json) records input hashes, exact changes to existing records, structural checks, source resolution and category totals. It compares the current dataset with `176821fa199be88614ac652a62b4e3faf5a705df:public/app/data/knowledge.json` using stable IDs. No runtime data was altered by that audit.

## Coverage

| Discipline | Previous groups / questions / causes | Current groups / questions / causes |
|---|---:|---:|
| Fire | 7 / 31 / 21 | 13 / 79 / 49 |
| Intruder | 1 / 4 / 4 | 7 / 50 / 33 |
| Access control | 2 / 8 / 6 | 4 / 28 / 18 |
| CCTV | 2 / 8 / 6 | 5 / 35 / 22 |
| Warden call | 1 / 4 / 4 | 3 / 23 / 14 |
| **Total** | **13 / 55 / 41** | **32 / 215 / 136** |

The increase is **19 groups, 160 questions and 95 candidate explanations**. Every group has five to eight questions and three to five causes. All 136 causes have complete likelihood maps: **928 stored cells** in total. The audit contains the individual group inventory and every added question/cause ID.

Fire additions cover conventional zone circuits, unwanted-alarm follow-up, disablement/test indications, expected outputs not operating, optical beam faults and aspirating airflow. Intruder additions cover power, zones/contacts, setting, signalling, repeated alarms and wireless devices. Access and CCTV add door-lock/door-event, picture, stream and remote-viewing flows. Warden-call additions cover calls not received and quiet or one-way speech. The source notes below define applicability and distinguish reported states from wiring or component diagnoses.

## Research files and evidence

| Workstream | Source notes | Full data and claim mappings | Groups / questions / causes | Sources in fragment | Evidence mappings | Scenarios |
|---|---|---|---:|---:|---:|---:|
| Fire | [fire-sources.md](fire-sources.md) | [fire-fragment.json](fire-fragment.json) | 13 / 79 / 49 | 15 | 25 | 7 |
| Intruder and warden call | [security-warden-sources.md](security-warden-sources.md) | [security-warden-fragment.json](security-warden-fragment.json) | 10 / 73 / 47 | 10 | 26 | 11 |
| Access and CCTV | [access-cctv-sources.md](access-cctv-sources.md) | [access-cctv-fragment.json](access-cctv-fragment.json) | 9 / 63 / 40 | 22 | 25 | 19 |

Each fragment's `evidence` array connects a claim with its source pages/sections and relevant questions/causes. Together they provide **76 evidence mappings**. Manufacturer-authored documents and official support pages establish the named conditions and distinctions; chronology, contextual inference and numerical weights remain identified as editorial. Disclosed mirrors retain manufacturer-document provenance. Document issues, model scope, printed pages and PDF-page offsets are described in the source notes; an HTML reference has a named section instead of an invented page number.

The integrated register has **49 canonical sources**. The 47 fragment records are supplemented by two retained original records, `advanced-mxpro5` and `ctec-cfp-repeater`, which are not attached to current questions or causes. All **272 question-level references** and **215 complete inline cause-source objects** resolve to the register. Inline URLs and catalogue IDs agree with their canonical records. Source titles and page locations have been refined where the research supports a more precise attribution.

All **seven distinct non-null catalogue record IDs**, used in **70 canonical/inline source objects**, resolve to the bundled 12,377-record catalogue; each source URL matches that catalogue entry. A null `recordId` means the document is cited through its source URL without a linked archive record. It does not claim that the PDF is bundled or saved offline. This audit checked record identity, not a fresh download of every publisher file. Exact resolutions and URLs appear in [data-audit.json](data-audit.json).

[merge-guide.py](merge-guide.py) records the integration process. [scenarios.json](scenarios.json) collects **37 authored scenarios**; every one of the 19 new groups has an example. Scenario outcomes check the consistency of the supplied evidence and weights. They do not establish diagnostic accuracy on field cases.

## Saved-answer compatibility and actual changes

All **13 original group IDs, 55 original question IDs/texts, 41 original cause IDs/titles and 175 original likelihood cells** are preserved. Original records retain their relative order. The data audit stores matching hashes for original question-text tuples and likelihood tuples, plus empty lists for missing IDs, changed question text and changed original weights.

The update does change supporting content. The exact before/after values are recorded in the audit:

- **41 question hints** change: 25 standardise the unknown-answer wording, and 16 refine the access/CCTV observation instructions.
- **14 existing cause check lists** change, adding or refining observation-only guidance.
- **Two cause summaries** change. `loop_break` now explains that all addresses can remain visible when an open loop is supplied from both ends. `warden-report_fuse` distinguishes the documented XT2 24 V effect on all intercom emergency calls from the 12 V effect on some ancillary devices.
- **All 41 existing cause-source lists** receive refreshed or more specific references. The audit records added/removed source objects and exact field changes. Every original question also gains source references.

Existing compound question meanings remain intact, including `warden-report_0` (mains failure or low system battery) and `warden-report_2` (resident unit, pullcord or open-circuit report). New observations use separate IDs. Splitting an old question under its existing ID would reinterpret saved evidence, so it was not done.

New questions offer **Yes, No and I don’t know**. Unknown has zero evidence weight and leaves the candidate weights unchanged; unavailable or inapplicable observations should stay unknown. The engine accepts earlier `probably` and `probably-not` answers with their original half-strength log-likelihood contribution, equivalent to multiplying by the square root of the corresponding likelihood. They are labelled as earlier-session answers and are not offered for new responses. Baseline data metadata used the spelling `probably_not`, while the actual baseline engine offered/stored `probably-not`; compatibility preserves the real runtime key. Undo recomputes from the retained valid answers. Expanded candidate sets can change relative rankings even when every old answer contribution is preserved.

The engine's established calculation bounds are **0.05–0.95**. Four new stored editorial values sit just outside them and are deliberately retained in the data:

| Group / cause / question | Stored | Effective |
|---|---:|---:|
| `security-wireless` / `security-wireless_configuration` / `security-wireless_mismatch` | 0.96 | 0.95 |
| `warden-report` / `warden-report_line` / `warden-report_4` | 0.04 | 0.05 |
| `warden-report` / `warden-report_line` / `warden-report_5` | 0.04 | 0.05 |
| `warden-call-not-received` / `warden-call-not-received_parked` / `warden-call-not-received_parked` | 0.96 | 0.95 |

These are bounded editorial inputs, not a statistical calibration claim. Related observations can be correlated; source references do not validate independence or the numerical values. The unresolved outcome remains available, and insufficient evidence must not be presented as a confirmed diagnosis.

## Release validation

The parent release workflow completed the following checks; the static data audit does not stand in for them:

- **605 automated tests passed**, with zero failures or skips, in 23.25 seconds. See [test-results.txt](test-results.txt).
- Browser checks confirmed the three answer buttons, an earlier saved Loop session after expansion to seven questions, collapsible source details/links, Undo and the visible 0.12.0 footer. Seven unknown answers produced “More evidence needed”; the copied report explicitly stated insufficient evidence without ranked cause titles. A complete seven-answer conventional-zone example identified the missing-detector possibility as the strongest match. See the [browser proof](fault-finder-0.12.0-proof.jpg).
- Phone iframe checks at nominal 390 px and 320 px produced effective client widths of 375 px and 305 px. Client and scroll widths matched, with no horizontal overflow; all three answer buttons were 57 px high. These are browser layout checks, not physical-phone tests.
- The signed Android package passed signature and versionCode **18** checks; all **712 app assets** matched their source bytes. See [android-verification.json](android-verification.json) and [android-build.txt](android-build.txt).
- The production web build passed with **731 public files**. The deployment retains current 0.12.0 and previous 0.11.2 APKs/checksums; 24 archived release files are excluded from the deployment output, approximately 82.7 MB. See [web-build.txt](web-build.txt).

No installed panel, detector, access controller, recorder or care-call system was physically validated or altered during this work. Physical iPhone/Android installation and offline checks remain outstanding. Model-specific source limitations, simultaneous faults and absent evidence still matter; these flows do not certify a system as safe, fixed or operational.

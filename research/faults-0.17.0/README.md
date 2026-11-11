# Documented fault investigations — web 0.17.0

Reviewed 2 November 2026. This note records the source boundaries and evidence-record design for FINDR’s investigation worksheets. It extends the existing observation guide and saved sessions. It does not replace the exact-model installation, commissioning or fault procedure with a universal electrical test.

## Coverage and existing behaviour

The release adds a worksheet for each of the existing **32 fault groups**: 13 fire, seven intruder, four access-control, five CCTV and three warden-call groups. The existing **215 observation questions, 136 cause hypotheses and 49-source register** remain the basis for Yes / No / I don’t know triage. Imported configuration details, measurements and worksheet completion never supply answers to checks the engineer has not performed.

These are investigation and handover worksheets for the current groups, not 32 manufacturer-approved diagnostic algorithms or a claim to cover every fault. The earlier questions and source meanings remain documented in [the 0.12.0 audit](../faults-0.12.0/README.md). Its ranking weights are editorial heuristics, not calibrated probabilities. The earlier research deliberately limited the question flow to observations; adding a place to record tests does not retrospectively verify new electrical procedures or thresholds.

The workflow keeps setup and system state, checks and findings, raw measurements, the work log, physical-path observations where applicable, and handover/outcome together. Source examples name their model and edition. The selected panel’s exact manual remains necessary when choosing an actual test point, instrument, operating state and expected result.

## Open-loop source review

The key primary source was freshly retrieved and its relevant text checked for this change:

- Source ID: `kentec-syncro`.
- Document: **Syncro Installation and Operation Manual, Man-1055, Issue 26, May 2016**, 38 PDF pages.
- Manufacturer URL: <https://kentec.co.uk/wp-content/uploads/2018/08/man-1055.pdf>.
- Existing catalogue record: `kentec-724b56a14295`.
- SHA-256 of the freshly retrieved PDF, matching the existing source register: `46cefb817c0aa9e0f8b349c84bfe90ff3f2472067d79b7f7e216d7cdf43bbbfd`.
- Relevant printed pages equal the one-based PDF page positions. This review used extracted document text; it is not a test of a physical panel.

**Page 11, section 9, Detection circuits:** Syncro normally drives from Loop Out and monitors the return at Loop In. When the loop is open because of a cable fault or short-circuit isolation, it drives power from both ends so devices can remain connected. Short-circuit isolators isolate the affected section. Consequently, a device remaining visible or a voltage being present at both ends does not establish loop continuity and does not locate the break. This behaviour is documented for the covered Syncro/protocol configurations; it is not a universal claim about every panel.

**Page 32, section 25.1, Loop Data Test:** the manual identifies interference, poor connections, earth leakage, cross-talk, wrong or defective devices, excessive loop resistance and excessive sounder current as possible bad-data causes. It describes excessive resistance tending to affect devices nearest Loop In and a model-specific comparison after reversing loop connections. That intervention is not copied into a universal worksheet. Test configuration, protocol, load and the applicable procedure affect what a reading means.

**Appendix D, Specifications:** the panel’s 18–30 V operating range and nominal 27.6 V battery charge figure are different specifications. Neither supplies a universal acceptable voltage at an addressable field device. The worksheets therefore contain no universal 24 V pass/fail threshold.

No reviewed source establishes a universal first-device / last-device voltage test followed by physical midpoint splitting for all addressable loops. The path helper is an **editorial evidence-organising aid**, not a manufacturer-derived switching, disconnection, isolation or cable-test procedure.

## Physical-path investigation limits

An engineer records the actual physical sequence and its evidence, rather than sorting an imported schedule by loop/address. Labels can include the panel test point, a confirmed first/last device, verified junctions or isolator boundaries when established by the source or onsite evidence. An imported address identifies programmed equipment; it does not establish where that equipment lies along a cable route.

Endpoint observations need the recorded model-specific procedure and test conditions. A midpoint comparison additionally requires an explicitly confirmed single test path and the justification for comparing observations under those conditions. The app does not instruct how to obtain that configuration. The engineer’s classification is separate from the raw measurement; the app does not turn voltage-present into “satisfactory”.

The helper may suggest a next comparable point or an interval to investigate. It keeps the case for review if conditions differ, evidence conflicts, both ends have the same classification, or observations suggest more than one transition. Inconclusive evidence stays inconclusive. An interval is not a proven break position. Changing the route or test setup requires a new comparison while retaining the earlier observations in the work log.

## Source coverage across disciplines

The following summarizes the existing source register reviewed for applicability. Except for the Syncro document described above, this task consulted the repository’s source notes and mappings; it did not freshly download and verify every listed manual. Attempts to retrieve Paxton AN1060 and AN1061 during this review returned HTTP 403, so their earlier documented review remains the available evidence.

| Discipline | Useful existing source coverage | Boundary for deeper investigation |
|---|---|---|
| Fire | `kentec-syncro` pp11, 19, 30, 32: loop, supply/earth, configuration and loop diagnostics. `ctec-cfp-engineer` pp18–22: conventional CFP faults. `advanced-mxpro5` pp28–29: detector-loop/output principles. `hochiki-esp-comms`: ESP communications observations. | Panel, protocol, firmware and load matter. Conventional CFP instructions are not addressable-loop procedures. No generic device-voltage threshold is established. |
| Intruder | `pyronix-v11-programming-02` pp34–37 and 57–59; Texecom Premier Elite, Eaton i-on and SmartCom references distinguish power, battery, zone, wireless, setting and signalling messages. | A battery warning is not proof that the battery needs replacing. Reset meanings and communication paths differ by model. User-message sources do not verify every electrical test. |
| Access control | `net2-reader`, Paxton AN1060 p1, includes supply-voltage context; `net2-offline`, AN1061 pp1–2, distinguishes complete versus partial RS485 failures. Net2 event/release and PaxLock references add further bounded observations. | RS485 methods do not transfer automatically to Net2Air, Ethernet-only systems or Paxton10. Credential acceptance, reader response, commanded release and physical movement are separate observations. |
| CCTV | Hikvision link, authentication, PoE exception and recording references; Axis network, streaming, storage, image, focus, IR and remote-client sources. | Preserve local/remote, live/recorded, camera/network/client and incident-time distinctions. Sources do not establish a universal electrical or network threshold for every camera/NVR. |
| Warden call | `xt2-faults`, Advent XT2 FM0816 issue 12, pp5, 7–10, 12–13, 22; `spectralink-s33-user-e`, pp23–25, 29, 39–40, 74–75. | XT2 p9 gives different consequences for 12 V and 24 V fuse reports. Routine privacy, emergency speech, mute, listening level and channel availability remain distinct; these are not universal wiring-test instructions. |

The detailed inherited editions, mirrors, page-number offsets and claim mappings are in [fire sources](../faults-0.12.0/fire-sources.md), [access/CCTV sources](../faults-0.12.0/access-cctv-sources.md) and [intruder/warden sources](../faults-0.12.0/security-warden-sources.md). A reference available by URL is not automatically a PDF saved on the device.

## Readings, corrections and uncertainty

Measurement values remain text: `0.00`, leading zeros, `OL`, signed values and range indications retain their original form. Blank or unperformed readings never become zero. Entries carry a timestamp and can record engineer, instrument, physical location, terminals/reference, powered/isolated/loading conditions, expected range, exact manual/source and uncertainty. An electrical reading requires a reference/test point and test condition. An assessment against a reference requires both the expected result and its source.

Corrections append a new reading linked to the earlier one. The original value and its context remain in the ledger and exported report. The ledger records what the engineer entered; it is not an instrument calibration certificate or a tamper-proof audit log. Work entries separately record what was done, the reason and the resulting system state, including unsuccessful checks.

Checks distinguish satisfactory, issue found, not tested/unavailable and not applicable. Recording an issue does not mean it was repaired. Findings can remain unresolved, in progress or awaiting verification. Marking a case resolved requires an engineer-entered findings summary, restoration confirmation and a passed functional-test record; no measurement or ranked hypothesis automatically marks the case fixed.

## Local persistence and handover

The existing `findr-device` IndexedDB database and its `settings` store are reused. `case-store.mjs` reads saved history and writes the updated history and current session in **one readwrite transaction**, resolving only after commit. It replaces the matching case ID and retains all other cases without the former 30-session truncation. Malformed stored history and failed saves do not replace the prior records. PDF stores, imported schedules, pack IDs, emulators and existing question IDs are unchanged by this persistence module.

The text report retains site/panel and any imported programmed context, reported fault text, Yes/No observations, worksheet checks including those not performed, raw readings and corrections, work entries, path evidence, unresolved issues, next checks and the system state left onsite. It can be downloaded or copied for the next engineer without a server. Cases and saved PDFs use the existing local/offline mechanisms; a missing document still needs the existing download path. Browser storage can be cleared, so exporting the completed or unresolved handover provides a separate record.

A panel schedule still describes programming at export time. It does not confirm which device is installed now, that a fault is active or where a cable breaks. This release does not add a manufacturer-native panel-export parser; the documented CSV/TSV support and [0.16.0 import scope](../panel-import-0.16.0/format-audit.md) remain applicable.

## Release verification

Completed local validation on 2 November 2026:

- `node --test --test-isolation=none tests/*.test.mjs`: **721 passed**, no failures/skips. This includes 28 new engine, worksheet, controller and atomic-store cases, covering all 32 groups and 193 checkpoints, raw readings, corrections, uncertainty, conflicting/dual-fed path observations and failed transaction preservation.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `node scripts/run-framework.mjs build`: passed. `node scripts/verify-public-build.mjs`: passed; legacy archived APKs are excluded under the existing workflow. All offline web app assets match the source bytes; the native-only download map is deliberately omitted.
- `scripts/qa-investigation.cjs`: passed at **390 × 844** and **1440 × 844** in Chromium. The labelled synthetic workflow exercises existing Yes/No/unknown answers, raw `24.00`, `0.00`, corrected `23.90` and `OL` readings, procedure-gated endpoint/midpoint comparisons, retention of an earlier route comparison, work log, unresolved TXT handover, guide changes retaining earlier answers/checks, offline reload and preservation of 32 previous cases. No horizontal overflow or browser exceptions were found.
- Additional unlisted-fault record entry and offline reload at 390px: passed. Failed-save controller tests retain edited reading/work drafts without duplicate entries.
- `scripts/qa-panel-import.cjs`: passed at **390px and 1440px**, retaining CSV/TSV mapping, ambiguity handling, scoped loop lookup, exact/generic model distinctions, downloaded PDF viewing, session context, rejected/confirmed reimports and offline reload. All schedule data is labelled synthetic; no real manufacturer export was newly verified.

Repeat browser checks with `FINDR_PLAYWRIGHT_PATH` pointing to an installed Playwright module and `FINDR_QA_URL` pointing to a prepared app server. The import script additionally needs `FINDR_QA_PDF` pointing to the actual linked Gent installation PDF. Run `python scripts/prepare-app.py` before serving `public` so service-worker integrity hashes match.

The deployment result is recorded separately after this reviewed source commit is pushed and the build is published. A build alone does not establish publication.

The intended release is **web 0.17.0**. The separate signed Android APK remains **0.14.1 / versionCode 26**. A successful build is distinct from a published website; publication requires its own verified deployment. No physical-panel validation, physical iPhone test or new signed APK is claimed.

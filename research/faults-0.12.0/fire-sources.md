# FINDR 0.12.0 fire fault-finder source audit

Reviewed: 30 October 2026. This is a research fragment for integration, not a diagnosis engine or a repair procedure.

## Coverage and compatibility

- 13 fire groups: seven replacements retaining their existing identities, plus six new groups.
- 79 questions; 49 candidate explanations.
- Every original fire group, question and cause ID is preserved. Every original question text is byte-for-byte unchanged. Only “Don’t know” hint labels are standardised to “I don’t know”.
- Every question carries sourceRefs; every cause carries complete inline source objects and a likelihood for every question in its group.
- Every new question asks for one observation using the normal display, an existing record or a safely visible condition. New answer values are yes/no/unknown.
- All likelihoods are editorial heuristics bounded from 0.05 to 0.95. They are not manufacturer probabilities, prevalence, reliability figures or calibrated confidence. Related observations may be correlated.
- Six new-group evidence scenarios and one loop-open/all-addresses-present regression scenario are supplied for the parent integration workflow. No tests, commits or publication were performed by this research task.

| Group | Questions | Candidates | Change |
|---|---:|---:|---|
| power | 7 | 4 | Existing IDs retained |
| loop | 7 | 3 | Existing IDs retained |
| earth | 5 | 3 | Existing IDs retained |
| device | 5 | 3 | Existing IDs retained |
| sounder | 5 | 4 | Existing IDs retained |
| network | 5 | 3 | Existing IDs retained |
| system | 5 | 3 | Existing IDs retained |
| fire_conventional_zone | 7 | 4 | New |
| fire_unwanted_alarm | 7 | 4 | New |
| fire_disablement_test | 5 | 4 | New |
| fire_outputs_not_operating | 7 | 5 | New |
| fire_beam | 7 | 5 | New |
| fire_aspirating_airflow | 7 | 4 | New |

## Key interpretation limits

1. **All loop devices visible does not clear a loop-open fault.** Kentec Syncro issue 26, printed/PDF page 11, §9 explicitly describes power from both loop ends after an open circuit. The new loop_all_devices_present observation therefore supports compatibility with loop_break. It uses a complete existing current status list, not absence of a missing-device warning.
2. **Specific messages and generic lamps are different evidence.** High battery impedance does not uniquely identify the battery; the path can include connections. A common System Fault lamp does not identify watchdog versus memory versus other internal conditions. Detailed CFP fault codes can require internal access, which FINDR does not request.
3. **Operational states are not wiring diagnoses.** Disabled zones/outputs, test state, enabled delays and running delays are kept distinct. On the referenced CFP variants, General Disablement can accompany enabled delays. On Syncro, test mode and output attributes depend on commissioned cause-and-effect.
4. **Unwanted-alarm questions are retrospective.** A reported environmental influence, call-point activation or test does not rule out fire, establish someone’s intent or authorise changing protection. Current or suspected fire remains subject to the site emergency procedure.
5. **Beam fault codes are model-specific.** Hub Reflective E-codes are cited only for that controller. Fireray One uses different indications. No aligning, cleaning, blocking or illuminating a detector is requested by the questions or checks.
6. **Aspirating airflow has multiple causes.** High/low direction, filter warnings, layout and ventilation are observations, not unique diagnoses. VESDA percentage airflow is relative to normalization; VLF units and other ranges differ. The historic FIA-code guide is cited only for physical airflow examples, never as current standards advice.
7. **Chronology is an editorial inference.** Prior work, rain, configuration changes and repeat incidents are context. Manufacturer references establish possible mechanisms; they do not provide the numerical weights or prove causation from timing.
8. **No intervention is a prerequisite.** No new question or check calls for opening equipment, removing/reseating heads, disconnecting circuits, isolator bypass, electrical measurements, generating alarm inputs, resetting, changing sensitivity, normalizing flow or editing configuration.
9. **No universal LED flash sequence is introduced.** CFP Rev 4 engineer p17 describes steady final test indications, while the Rev 2 user table p7 and walk-test note p2 describe flashing test indications. The fragment asks whether a test condition is reported and leaves the exact pattern to the applicable issue/model.

## Canonical sources

Page numbers in question.sourceRefs are printed/manual page numbers. pdfPage is supplied where a hosted file has a different PDF page or two printed pages share one PDF spread. Existing catalogue recordId values are retained where applicable. Browser reference identifiers below are retrieval provenance for the parent agent; public citations should use the linked documents.

### gent-ops-1999

- **Document:** [GENT Vigilon Operating Manual VIG-MAN-OPS, Issue 1, January 1999](https://prod-edam.honeywell.com/content/dam/honeywell-edam/hbt/en-us/documents/manuals-and-guides/repair-and-maintenance-guides/gent-112425/hon-ba-fire-vigop.pdf?download=false)
- **Publisher:** GENT / Honeywell
- **Scope:** Legacy Vigilon covered by VIG-MAN-OPS issue 1 (1999); message examples are not universal GENT wording.
- **Anchor:** Typical fault messages; disablement messages p17
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn271view1`
- **PDF pages:** 58

### ctec-cfp-engineer

- **Document:** [C-TEC CFP Standard Installation & Maintenance Manual DFU7004010 Rev 4 (1 November 2021)](https://c-tec.com/download?wpdmdl=13537)
- **Publisher:** C-TEC
- **Scope:** CFP Standard 2/4/8-zone conventional panels covered by Rev 4; do not apply its EOL, LED or diagnostic arrangements to AlarmSense or other panels.
- **Anchor:** Fault diagnosis, pp18–22
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn260view0`
- **PDF pages:** 24

### ctec-cfp-user

- **Document:** [C-TEC CFP 2/4/8-zone User Manual & Log Book DFU7001020 Rev 2](https://c-tec.com/download?wpdmdl=12076)
- **Publisher:** C-TEC
- **Scope:** CFP models listed in DFU7001020 Rev 2. Delay indicators and available functions vary by model; use the normal, non-selection display.
- **Anchor:** Indicator meanings; faults p9; disablements p10; delays p12
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn260view1`
- **PDF pages:** 20
- **Downloaded-byte SHA-256:** `f4445ea23e6f6fc95a6732ed57b6591dac6d85b3e26f7c6b81dabcec0c0d5333`

### ctec-cfp-walktest

- **Document:** [C-TEC application note 0005.0: CFP Walk Test Mode, DFU0000702 Rev 1](https://c-tec.com/download?wpdmdl=12352)
- **Publisher:** C-TEC
- **Scope:** CFP panels covered by this application note. Cited only to identify an already active test condition, not to instruct entering test or opening the panel.
- **Anchor:** Final test-state indication, step 5
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn260view2`
- **PDF pages:** 2

### kentec-syncro

- **Document:** [Kentec Syncro Product Manual Man-1055 Issue 26 (May 2016)](https://kentec.co.uk/wp-content/uploads/2018/08/man-1055.pdf)
- **Publisher:** Kentec Electronics
- **Scope:** Syncro models and Hochiki/Apollo/Argus protocol configurations covered by issue 26. Installed configuration and firmware determine the applicable behavior.
- **Anchor:** §9 Detection circuits; §17 Power supply p19; §18 Inputs/outputs pp23–26; §25.1 Loop Data Test p32
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn255view2`
- **PDF pages:** 38
- **Downloaded-byte SHA-256:** `46cefb817c0aa9e0f8b349c84bfe90ff3f2472067d79b7f7e216d7cdf43bbbfd`

### kentec-network

- **Document:** [Kentec Syncro Networking Manual Man-1058 Issue 06 (December 2016)](https://kentec.co.uk/wp-content/uploads/2018/08/man-1058.pdf)
- **Publisher:** Kentec Electronics
- **Scope:** Syncro network covered by issue 06; node numbering, processing and fault descriptions are model-specific.
- **Anchor:** §12 Network faults, pp11–12
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn255view3`
- **PDF pages:** 12

### hochiki-esp-comms

- **Document:** [Hochiki Europe: Why do several devices on my addressable loop report random communication faults?](https://web.hochikieurope.com/en-gb/knowledge-base/random-communication-faults-on-hochiki-esp-addressable-loops)
- **Publisher:** Hochiki Europe
- **Scope:** Hochiki ESP analogue addressable loops in the UK/Europe, including the listed ESP sensors, modules and call points; not every addressable protocol.
- **Anchor:** Applies to; Symptoms; Likely causes
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn257view4`

### advanced-mxpro5-features

- **Document:** [Advanced MxPro 5 UK/Ireland brochure: Hardware Features](https://www.advancedco.com/wp-content/uploads/MxPro-5-UK-IRE-Brochure-KC.pdf)
- **Publisher:** Advanced Electronics
- **Scope:** MxPro 5 with the relevant transmission-path monitoring enabled. This brochure does not establish the fault text, threshold or enabled state on another panel.
- **Anchor:** Hardware Features / Wiring fault monitoring (PDF page 7, left-hand printed page 12)
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn293view0`
- **PDF pages:** 17

### advanced-mxpro5-release-notes

- **Document:** [Advanced MxPro 5 firmware release notes: v60.03.00 monitoring and event logging](https://www.advancedco.com/product/flash/mxpro-5-firmware-releases/)
- **Publisher:** Advanced Electronics
- **Scope:** MxPro 5 firmware v60.03.00 entries only; cited to show that monitoring and log facilities depend on firmware/configuration, not to recommend firmware changes.
- **Anchor:** v60.03.00: EN54-13 monitoring disabled as default; Configuration changes are now logged
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn294view0`

### apollo-unwanted-alarms

- **Document:** [Apollo Fire Detectors: How do you reduce the risk of Manual Call Point false alarms? (9 June 2020)](https://apollo-fire.co.uk/news/how-do-you-reduce-the-risk-of-manual-call-point-false-alarms/)
- **Publisher:** Apollo Fire Detectors
- **Scope:** General unwanted-activation examples from Apollo. These examples cannot classify a current incident as false or determine anyone’s intent.
- **Anchor:** What are False Alarms, and how do they occur?; Manual Call Point related false alarms
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn257view3`

### hochiki-unwanted-alarms

- **Document:** [Hochiki Europe: How do I reduce false alarms on a fire alarm system?](https://web.hochikieurope.com/en-gb/knowledge-base/reduce-false-alarms-on-a-fire-alarm-system)
- **Publisher:** Hochiki Europe
- **Scope:** General guidance for Hochiki Europe detectors/panels in the UK. FINDR uses the observation examples, not the article’s standards advice or modification procedures.
- **Anchor:** Common causes; Investigate and record every false alarm
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn271view2`

### ffe-fireray-hub

- **Document:** [FFE Fireray Hub Reflective User Guide 0044-102-03](https://ffeuk.com/hubfs/website/resources/Fireray/Fireray_Hub_Reflective/User_Guides/0044-102_Fireray_Hub_Reflective_User_Guide_(EN).pdf)
- **Publisher:** FFE
- **Scope:** Fireray Hub Reflective controller/head system covered by 0044-102-03. E-codes apply to this model only; other beam detectors have different indicators.
- **Anchor:** §21 Cleaning; §22 Error codes
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn259view1`
- **PDF pages:** 24
- **Downloaded-byte SHA-256:** `f6f143f6e819a5ed911edebf761fea05527c4210c101754c1dc79e494f49fd08`

### ffe-fireray-one

- **Document:** [FFE Fireray One User Guide 0044-092-05](https://ffeuk.com/hubfs/website/resources/Fireray/Fireray_One/User_Guides/0044-092_Fireray_One_User_Guide_(EN).pdf)
- **Publisher:** FFE
- **Scope:** Fireray One covered by 0044-092-05. Its flash indications are different from Fireray Hub E-codes; no code or flash-rate interchange is assumed.
- **Anchor:** Status Indications and Troubleshooting
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn259view2`
- **PDF pages:** 16
- **Downloaded-byte SHA-256:** `299915b3abf18cefb564b81db82275ff43f6bd24a86d94244cbba19f68ab60c5`

### xtralis-vesda-maintenance

- **Document:** [Xtralis VESDA Maintenance Guide 10256_09 (April 2020)](https://www.acornfiresecurity.com/index.php?filename=Xtralis%2FVesda+Maintenance+Guide.pdf&route=extension%2Fmodule%2Fdocument%2Fdownload)
- **Publisher:** Xtralis
- **Scope:** VESDA VLP, VLS, VLC, VLF and VLI covered by 10256_09; not a VESDA-E product guide. Flow units, thresholds and filter behavior differ by model.
- **Anchor:** §3.2 Checking Airflow; §3.3 Checking the Filter(s) (PDF page 14)
- **Provenance:** Manufacturer-authored Xtralis PDF hosted by Acorn Fire & Security; Xtralis copyright, document number, contact details and product scope verified; distributor watermark is present.
- **Browser reference:** `turn271view0`
- **PDF pages:** 58

### xtralis-vesda-airflow-guide

- **Document:** [Xtralis: A Guide to the FIA Code of Practice for Aspirating Smoke Detector Systems, 12951_02](https://xtralis.com/file/7504)
- **Publisher:** Xtralis
- **Scope:** Historical Xtralis VESDA guide referring to the February 2012 FIA code. Used only for broken-pipe/high-flow and blocked-pipe/low-flow examples, not as current UK compliance advice.
- **Anchor:** §14.2.3.2 Fault detection
- **Provenance:** Manufacturer-authored material on the manufacturer website
- **Browser reference:** `turn259view0`
- **PDF pages:** 24
- **Downloaded-byte SHA-256:** `c763635bb7373ed04d2311ece9ffb1d6a8dff31e8822e1558d8af63fac42230d`

## Evidence map

The JSON evidence list is the machine-readable claim/page map. It distinguishes manufacturer-fact, editorial-inference and editorial-method entries. Per-question sourceRefs and full per-cause references provide the precise local anchors; the canonical source object limits applicability.

| Evidence ID | Groups | Primary anchors |
|---|---|---|
| fire-editorial-ranking | power, loop, earth, device, sounder, network, system, fire_conventional_zone, fire_unwanted_alarm, fire_disablement_test, fire_outputs_not_operating, fire_beam, fire_aspirating_airflow | FINDR editorial method |
| power-message-distinction | power | kentec-syncro p19 |
| battery-impedance-not-component-proof | power | ctec-cfp-engineer p20 |
| loop-open-all-devices | loop | kentec-syncro p11 |
| loop-isolation | loop | kentec-syncro p11 |
| loop-bad-data | loop, device | kentec-syncro p32 |
| integrity-monitoring-conditional | loop | advanced-mxpro5-features p12; advanced-mxpro5-release-notes |
| earth-water-and-path | earth | hochiki-esp-comms; kentec-syncro p30 |
| observational-timing-not-causation | earth, loop, device, sounder, network, system, fire_conventional_zone | hochiki-esp-comms; ctec-cfp-engineer p19; ctec-cfp-engineer p21 |
| lost-device-not-failed-detector | device | gent-ops-1999 p15 |
| configuration-mismatch | device | kentec-syncro p9; hochiki-esp-comms |
| sounder-supply-monitoring | sounder, fire_outputs_not_operating | kentec-syncro p15 |
| network-missing-not-one-cause | network | kentec-network p12; kentec-network p12 |
| system-generic-indication | system | ctec-cfp-engineer p21; ctec-cfp-user p9 |
| conventional-zone-monitored | fire_conventional_zone | ctec-cfp-engineer p18; ctec-cfp-engineer p19; ctec-cfp-user p9 |
| conventional-zone-indicator-context | fire_conventional_zone, fire_disablement_test | ctec-cfp-user p7; ctec-cfp-walktest p2; ctec-cfp-user p10 |
| unwanted-observations-only | fire_unwanted_alarm | apollo-unwanted-alarms; hochiki-unwanted-alarms |
| disablement-and-delay-distinct | fire_disablement_test | ctec-cfp-user p10; ctec-cfp-user p12 |
| test-can-inhibit-selected-outputs | fire_disablement_test, fire_outputs_not_operating | kentec-syncro p24 |
| output-state-and-configuration | fire_outputs_not_operating | ctec-cfp-user p10; ctec-cfp-user p12; kentec-syncro p25; kentec-syncro p24 |
| beam-model-specific-faults | fire_beam | ffe-fireray-hub p20; ffe-fireray-hub p20 |
| beam-compensation | fire_beam | ffe-fireray-hub p20; ffe-fireray-one p15 |
| asd-flow-direction | fire_aspirating_airflow | xtralis-vesda-airflow-guide p21 |
| asd-multiple-causes | fire_aspirating_airflow | xtralis-vesda-maintenance p8; xtralis-vesda-maintenance p8 |
| asd-normalized-reading | fire_aspirating_airflow | xtralis-vesda-maintenance p8 |

## Source retrieval and bounded omissions

- Research used the stronger web search system and opened manufacturer documents/support pages. The tables for CFP fault indicators, CFP user indicators, GENT legacy fault messages, FFE Hub error codes, the Advanced features spread and VESDA airflow text were visually inspected.
- Manufacturer PDFs are preferred. The VESDA maintenance guide is a genuine Xtralis document on the Acorn distributor site, verified from its cover, copyright, document number, product list and manufacturer contact section. No forum or third-party diagnostic summary is used as evidence.
- The original FFE WordPress link returned 404; the current PDF was followed from FFE’s own Resources page. The canonical source uses that working manufacturer URL.
- Some PDF downloads were rejected by the source server even though the browser retrieval and page screenshots worked. SHA-256 is provided only where the bytes were successfully downloaded; no hash is fabricated.
- Unverified manufacturer-default timing, alarm priorities, thresholds, EOL component values, access codes and intervention procedures are deliberately not encoded. Exact configuration and additional concurrent faults remain outside a one-group heuristic ranking.
- Existing broad causes were preserved and re-anchored where a clearer verified source was available. For example, output supply supervision now cites Syncro §12 directly, and a missing network node cites Networking §12.4 rather than an unrelated general-network page.
- Original source IDs advanced-mxpro5 and ctec-cfp-repeater are not needed by these replacement fire groups. This fragment does not delete the global catalogue; the integrator can retain sources used elsewhere.

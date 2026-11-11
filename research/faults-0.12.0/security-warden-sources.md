# Intruder and warden-call fault-finder research

Reviewed 30 October 2026 for FINDR 0.12.0.

The accompanying `security-warden-fragment.json` contains **10 groups, 73 questions, 47 cause records, 10 canonical sources, 26 evidence mappings and 11 scenarios**. It replaces `security-alert` and `warden-report` in full, adds six intruder groups and adds two warden-call groups. All new questions accept Yes, No or I don’t know. Likelihoods are bounded editorial heuristics, not manufacturer statistics, prevalence estimates or proof of a diagnosis.

## Coverage

| Group ID | Purpose | Questions | Causes |
|---|---|---:|---:|
| `security-alert` | Existing tamper, supervision, jamming and internal-fault distinctions, with device battery and visible casing evidence | 6 | 4 |
| `security-power` | Mains, standby battery, battery availability and charging indications | 7 | 4 |
| `security-zone` | Open contact, observed movement, unresolved active zone, tamper and missing wireless device | 7 | 5 |
| `security-setting` | Active-zone, fault, model-specific reset, user/lock and exit-completion reasons | 7 | 5 |
| `security-signalling` | Local data, cellular, modem interface, ARC and app/cloud evidence | 8 | 5 |
| `security-repeat-alarm` | Recorded activity, environmental correlation, contact, fault-event and entry-timing leads | 8 | 5 |
| `security-wireless` | Device battery, reception, jamming, mismatch and tamper evidence | 7 | 5 |
| `warden-report` | Existing fault-message classes, with separate 12 V, 24 V and mains-restored observations | 7 | 4 |
| `warden-call-not-received` | Call record, destination, handset, local state, parked call and line-fault evidence | 8 | 5 |
| `warden-speech` | Routine-call privacy, S33 microphone mute, listening level, speech stage and local fault | 8 | 5 |

There are 65 added questions: 60 across the eight new groups and five appended to the existing groups. The eight original questions remain intact.

## Canonical source register

The source IDs below are the application’s stable reference IDs. Each canonical JSON source includes title, exact URL, publisher, edition, applicability, provenance, review date and page-numbering guidance. Questions use `sourceRefs`; causes include complete inline source objects with the relevant page and section. The research `evidence` array maps the substantive distinctions to their questions and causes.

| Source ID | Verified publication and location | Applicability / provenance |
|---|---|---|
| `texecom-faq` | [Texecom support FAQs](https://www.texe.com/help-and-support/faqs/): named CIE, supervision, jamming, zone tamper and locked-keypad sections | Official manufacturer HTML. The question’s named panel or Ricochet context governs the claim. Reset, wiring and disablement instructions were not imported. |
| `texecom-elite-ins177-9` | [Premier Elite Series Master User Guide INS177-9](https://texecom-live.s3.eu-west-2.amazonaws.com/wp-content/uploads/2022/02/01102934/INS177-9_Premier_Elite_Series_Master_User_Guide-3.pdf): pp11–12, 19, 21–22, 33–35, 48 | Manufacturer-hosted original, 70 PDF pages, copyright 2017. Printed page equals one-based PDF page. No universal firmware version is inferred from the document revision. |
| `eaton-ion-admin-4` | [i-on Series Administration and User Manual, Issue 4](https://www.eaton.com/content/dam/eaton/products/safety-security-emergency-communications/security-intruder-alarm-systems/i-on-series-admin-and-user-guides/eaton-security-i-on-series-admin-user-manual-en-gb.pdf): pp5–6, 11, 21, 25 | Official Eaton PDF, software 7.02.xx, part 14199506, 24 January 2022. i-on Compact, 30R+, 40H+, G2SM, G3MM and G3LM. One-based PDF page is printed Arabic page + 4. |
| `pyronix-v11-programming-02` | [Enforcer V11 Programming Guide SAP 102028847-02](https://cdn.connectec.uk/Images/Products/alarms/enforcer-v11-programming-guide.pdf): pp34–37 and Appendix E pp57–59 | Pyronix-authored original on Connectec’s distributor CDN. Cover, SAP and manufacturer identity verified. The 60-page PDF uses matching Arabic page positions. Legacy official Pyronix links redirected, so the mirror is disclosed. |
| `pyronix-v11-user-02` | [Enforcer V11 Extended User Guide Rev-02](https://eaglesecuritysolutions.co.uk/user-manual/pyronix-wireless-alarm-system-extended-user-guide.pdf): pp12–13 | Manufacturer-authored original on the Eagle Security Solutions mirror. Rev-02 and Enforcer V11 headings verified. Printed page equals one-based PDF page in the relevant sections. |
| `pyronix-v11-comms-01` | [Enforcer V11 Communications Guide SAP 102028846-01](https://cdn.connectec.uk/Images/Products/alarms/enforcer-v11-communications-guide-en.pdf): pp7–8, 12 and 17 | Manufacturer-authored original on Connectec CDN. Distinguishes onboard Wi-Fi from optional LAN, GPRS and PSTN equipment. No assumption that an optional module is fitted. |
| `texecom-smartcom-troubleshooting` | [SmartCom & SmartCom 4G Troubleshooting Guide](https://texecom-live.s3.eu-west-2.amazonaws.com/wp-content/uploads/2022/10/07075442/SmartCom-Troubleshooting-Guide-2.pdf): pp5–6 and 10 | Official manufacturer-hosted PDF. The document prints the placeholder INSXXXEN/INSXXX, so no fabricated issue number is assigned. Only error meanings and observation context are used. |
| `texecom-capture-environment` | [Texecom Capture technical product explanation](https://www.texe.com/our-security-systems/capture-motion-detectors/): Pet Immunity, Built to Withstand, Active White Light Rejection | Official technical product page. Supports model-dependent environmental and animal observations; it does not establish a false-alarm rate or guarantee the tolerance of an unidentified detector. |
| `xt2-faults` | [Advent XT2 User Manual FM0816 issue 12, S33 Spectralink handsets](https://www.tynetec.co.uk/wp-content/uploads/2025/02/FM0816-12-Advent-XT2-User-Manual-S33-Spectralink.pdf): pp5, 7–10, 12–13 and 22 | Official Tynetec/Legrand PDF. Issue 12 amendment is dated 15 January 2025. Printed page equals one-based PDF page. The existing record ID `tynetec-76a7189ff1cc` is retained. |
| `spectralink-s33-user-e` | [Spectralink S33 Handset User Guide](https://www.tynetec.co.uk/wp-content/uploads/2025/02/Spectralink-S33-Handset-User-Guide.pdf): pp23–25, 29, 39–40 and 74–75 | Spectralink original hosted by Tynetec for its system: 722-0240-000 Rev E, October 2024. The cover and headers establish the correct title; search/PDF metadata incorrectly calls it a server guide. Printed page equals one-based PDF page. |

## Preservation and corrections

Every original `security-alert_*` and `warden-report_*` question ID and text is retained. Every original cause ID, title and likelihood cell is retained. Existing saved answers therefore retain their question meanings and original contributions. Added questions have new IDs. No root answer-choice configuration, engine, UI or existing knowledge file was edited by this task.

Two legacy warden questions combine related messages: `warden-report_0` combines mains failure and low system battery; `warden-report_2` combines a named resident unit, pullcord or open-circuit report. They are retained for saved-answer compatibility. New observations are kept separate. A later redesign that splits these legacy questions would require explicit history migration rather than silently reusing either ID.

The existing warden fuse cause needed a **clarification of scope**, not a new identity. Issue 12 page 9 distinguishes the effects of the 24 V and 12 V reports. The replacement retains `warden-report_fuse` but gives the two consequences explicitly, instead of implying that every fuse report has the same effect. Both new fuse questions are individually answerable; their weights do not assume that both voltages are normally reported together. See the [XT2 fault table, printed page 9](https://www.tynetec.co.uk/wp-content/uploads/2025/02/FM0816-12-Advent-XT2-User-Manual-S33-Spectralink.pdf#page=9).

## Interpretation boundaries that matter

**A reset message is model-dependent.** The Premier Elite engineer-reset description can explain a blocked re-arm, while the cited Eaton installer-reset example still permits normal setting. The question hint and cause summary call out this difference. The finder supplies no reset or anti-code procedure. See [Texecom p21](https://texecom-live.s3.eu-west-2.amazonaws.com/wp-content/uploads/2022/02/01102934/INS177-9_Premier_Elite_Series_Master_User_Guide-3.pdf#page=21) and [Eaton printed p25 / PDF p29](https://www.eaton.com/content/dam/eaton/products/safety-security-emergency-communications/security-intruder-alarm-systems/i-on-series-admin-and-user-guides/eaton-security-i-on-series-admin-user-manual-en-gb.pdf#page=29).

**A battery warning is not a replacement verdict.** The power flow separates a recorded outage, disconnect message, stored load-test result and charging indication. It requests existing service evidence and never asks a user to open, disconnect, load-test or replace anything. The distinctions are documented in [Enforcer Appendix E, pp58–59](https://cdn.connectec.uk/Images/Products/alarms/enforcer-v11-programming-guide.pdf#page=58).

**Signalling and app status are separate observations.** A particular ARC receipt can coexist with a cloud/app problem. It cannot establish that every path or every event is healthy. Device diagnostics, network incidents and ARC receipts are used as existing evidence; no test transmission, router change, port-opening, communicator reset or reprogramming is requested. See [Enforcer communications p8](https://cdn.connectec.uk/Images/Products/alarms/enforcer-v11-communications-guide-en.pdf#page=8).

**Environmental timing remains an inference.** Sunlight, nearby heating, recorded animals and known people are observations to compare with events. The finder does not declare an intrusion false, prescribe detector sensitivity changes, or assume a detector has a pet-immunity feature. The record deliberately labels environmental correlation as editorial interpretation of the [manufacturer’s detector explanation](https://www.texe.com/our-security-systems/capture-motion-detectors/).

**Care-call states require the correct model.** XT2 routine-call privacy, emergency speech, test state, parked calls and operating modes are kept distinct. The privacy question directs emergency-call users to choose I don’t know for the routine-only indication. Neither a privacy lamp nor absent speech is treated as proof of a failed microphone. Staff are directed to existing welfare and alternate-contact arrangements when a resident cannot be reached. The source distinctions are in [XT2 pp5, 9, 12–13 and 22](https://www.tynetec.co.uk/wp-content/uploads/2025/02/FM0816-12-Advent-XT2-User-Manual-S33-Spectralink.pdf#page=5).

**Handset silent mode and microphone mute are different.** S33 ringing, listening volume, outgoing speech and network-availability indications have separate observations. The shared no-speech-channel icon can also indicate system busy, so it is not presented as proof of a radio-coverage fault. These distinctions come from the [S33 status and audio sections](https://www.tynetec.co.uk/wp-content/uploads/2025/02/Spectralink-S33-Handset-User-Guide.pdf#page=23).

## Integration and scenario notes

The fragment has the requested root keys: `groups`, `sources`, `evidence` and `scenarios`. Each question has one or more references shaped as `{sourceId, page, section}`. Each cause has a complete likelihood map for its group, a `hypothesis` status, source objects and observation-only checks. HTML references have `page: null`; PDF references use the printed page number and the canonical record explains conversion to PDF position.

Eleven scenarios cover all ten groups, including an additional emergency-speech case that keeps routine privacy out of scope. The cases are construction fixtures for the editorial model, not field trials or manufacturer-approved diagnostic algorithms. They cover an explicit CIE report, disconnected standby battery, closed opening still active, user restriction, app-only outage with ARC receipt, entry-time expiry, explicit jamming, a 24 V fuse report, a silent receiving handset, routine-call privacy and a local intercom fault during an emergency call.

There was no hardware validation or alteration of an installed security or care-call system. The parent integration task owns the application’s unresolved-result safeguards, legacy answer support, ranking validation and release checks. Manufacturer PDFs were consulted through their page-positioned web representations; no copied manuals or new public assets are included in this research deliverable.

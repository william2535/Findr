# FINDR 0.12.0: access-control and CCTV research

Reviewed: 30 October 2026. This note accompanies `access-cctv-fragment.json`. It contains research/data only; it does not modify the fault-finder engine, application or `knowledge.json`.

## Coverage

The fragment contains **9 groups, 63 questions, 40 causes, 22 canonical primary-source references, 25 evidence mappings and 19 answer scenarios**. Each group has seven questions and four or five candidate causes.

| Group | Treatment | Questions | Causes |
|---|---|---:|---:|
| `access-offline` — Controller offline | Expanded existing group | 7 | 4 |
| `access-denied` — Card accepted / door closed | Expanded existing group | 7 | 5 |
| `access-unlocked` — Door will not lock / stays unlocked | New group | 7 | 5 |
| `access-door-alarm` — Door-held / forced / exit-event alarm | New group | 7 | 4 |
| `cctv-link` — Camera offline / no link | Expanded existing group | 7 | 4 |
| `cctv-record` — Missing recordings | Expanded existing group | 7 | 5 |
| `cctv-image` — Poor picture / night IR / focus | New group | 7 | 5 |
| `cctv-stream` — Intermittent / jerky video stream | New group | 7 | 4 |
| `cctv-remote` — Remote viewing / playback access | New group | 7 | 4 |

Time, retention and missing-footage checks belong to `cctv-record`. `cctv-remote` separately covers reaching an authorised remote service and playing existing footage in its client. This avoids treating a remote playback problem as proof that the recorder failed to record.

## Compatibility and integration

- All **16 existing question IDs and their question texts** are preserved exactly. Their original meanings have not been repurposed. Hints now consistently ask for existing observations, authorised records or safely visible indications.
- All **12 existing cause IDs** are preserved, along with their original four likelihood entries. New likelihood entries cover the additional questions. Existing records therefore retain their interpretation.
- No saved-answer migration is required by this fragment. New scenarios use only `yes`, `no` and `unknown`. Handling older half-strength answers remains an engine responsibility.
- Each question has `sourceRefs: [{sourceId, page, section}]`. PDF references use printed page numbers; HTML references use `page: null` and a named section. Every cause keeps complete inline source objects, using the same canonical IDs as `sources`.
- Every cause has a complete likelihood entry for every question in its group, a `hypothesis` status and `weightBasis: "uncalibrated-editorial-heuristic"`. The values are editorial ranking weights, not manufacturer failure rates, measured probabilities or a calibration claim.
- The 19 scenarios exercise all nine groups, including each new group. They ranked the declared `expectedCause` first when replayed through the existing `rank` function. This is a consistency check of the authored examples, not validation against real fault cases. No test file was created.

## Primary-source register

Paxton PDF page references were checked against the primary documents’ printed page labels and section text. HTML references cite their actual section headings without inventing page numbers. The model boundaries in the JSON are part of each reference, including when a page does not establish a complete supported-model list.

| Source ID and official document | Verified reference | Declared issue or date |
|---|---|---|
| `net2-offline` — [Paxton APN-1061 - ACUs not responding - RS485 data line](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1061.pdf) | Printed pp. 1-2: NO ACUs are responding; Some ACUs are responding | 1.0.1 |
| `net2-denied` — [Paxton APN-1059 - What to do if a user is denied access with a valid token](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1059.pdf) | Printed pp. 1: A Door does not open; User validity; User validity is correct but access is still denied | 1.0.1 |
| `net2-tcpip` — [Paxton APN-1006 - Installing remote sites using TCP/IP](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1006.pdf) | Printed pp. 4-6: LED indications; Software configuration; How do I give the device an IP address?; Troubleshooting | Not stated in the reviewed excerpt |
| `net2-reader` — [Paxton APN-1060 - What to do if readers or keypads are not working](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1060.pdf) | Printed pp. 1: Software settings; User token; Supply voltage | 1.0.1 |
| `net2-unlock` — [Paxton APN-1049 - Holding a door unlocked with Net2 software](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1049.pdf) | Printed pp. 1: Holding a door unlocked with Net2 software | 1.0.1 |
| `net2-door-alarms` — [Paxton APN-1047 - Configuring door alarms](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1047.pdf) | Printed pp. 1-4: Alarm definitions; Alarm types; Alarm reporting at the PC; Exit-button behaviour | 1.0.3 |
| `net2-exit-monitor` — [Paxton APN-1048 - Door Forced monitoring integrated with a Manual door handle](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1048.pdf) | Printed pp. 1-2: False door forced alarms; Create an Exit button event | 1.0.1 |
| `net2-fire-release` — [Paxton APN-1031 - Integrating Net2 with a fire alarm system](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1031.pdf) | Printed pp. 1-3: Overview; Resetting the Fire Alarm; Automatically reset fire alarm feature | 1.0.2 |
| `net2-fail-open` — [Paxton APN-1090 - Advice on using access control with fire doors](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1090.pdf) | Printed pp. 1-2: Fail safe opening of fire doors; Security issues | Not stated in the reviewed excerpt |
| `paxlock-door-fit` — [Paxton APN-1173 - PaxLock Pro Installation and Commissioning Guide](https://www.paxton-access.com/wp-content/uploads/2019/03/AN1173.pdf) | Printed pp. 1-4, 8-10: Checks prior to installation; Post installation commissioning; Troubleshooting | 1.0.6 |
| `hik-network` — [Hikvision - Why is the video recorder notifying the network is unreachable when a network camera is being added?](https://enpinfo.hikvision.com/hkwsen/unzip/20230410194813_20373_doc/GUID-03DBE341-D7F0-4680-99B2-DF54C958DEBA.html) | HTML section: Reason | Online manual snapshot 2023-04-10 |
| `hik-link` — [Hikvision - How to Solve IP Camera No Link Issue on PoE NVR](https://securitylab.hikvision.com/tr/support/how-to/faq/how-to-solve-ip-camera-no-link-issue-on-poe-nvr/) | HTML section: Scenario 1: user name or password is wrong; Scenario 2: Network is Unreachable; Scenario 3: IP camera does not exist | Not stated in the reviewed excerpt |
| `hik-poe-exceptions` — [Hikvision Hik-Partner Pro - Add Exception Rule](https://enpinfo.hikvision.com/hkwsen/unzip/20230330182709_44228_doc/GUID-70503EA6-F0B3-42B7-ACC4-99E14FA61DF7.html) | HTML section: Step 5: network-switch exception types | Online manual snapshot 2023-03-30 |
| `hik-record` — [Hikvision - Why is there no recorded video after the motion detection is set?](https://enpinfo.hikvision.com/hkwsen/unzip/20230410194813_20373_doc/GUID-92930AA9-2960-4EB1-AC9B-0804C03741C2.html) | HTML section: Reason; Solution | Online manual snapshot 2023-04-10 |
| `axis-image` — [Axis - Troubleshooting guide for image quality](https://help.axis.com/en-us/troubleshooting-image-quality) | HTML section: Shutter speed; Gain and noise | January 2026 |
| `axis-ir` — [Axis - IR reflections in dome cameras](https://whitepapers.axis.com/en-us/ir-reflections-in-dome-cameras) | HTML section: Summary; IR light reflected against nearby objects; IR light reflected against objects on the dome surface | May 2021 |
| `axis-focus` — [Axis - Troubleshooting guide for focus](https://help.axis.com/en-us/troubleshooting-focus) | HTML section: Dome and front glass; Dirty or scratched dome or front glass; Object proximity; Near focus limit for autofocus | December 2024 |
| `axis-stream` — [Axis - Troubleshooting guide for streaming issues](https://help.axis.com/en-us/troubleshooting-streaming) | HTML section: Cannot retrieve stream in client; Too many viewers displayed in web interface; My video stream is lagging, jerky, or choppy | July 2026 |
| `axis-network` — [Axis - Troubleshooting guide for network connection](https://help.axis.com/en-us/troubleshooting-network) | HTML section: The infrastructure; Bandwidth; Device overload; Chipset performance | September 2026 |
| `axis-acs5-troubleshooting` — [Axis - AXIS Camera Station 5 Troubleshooting guide](https://help.axis.com/en-us/axis-camera-station-troubleshooting-guide) | HTML section: Recordings disappear; Recording gaps during continuous recording; Live view and playback performance; Detected time difference on a device | March 2026 |
| `axis-acspro-manual` — [Axis - AXIS Camera Station Pro User manual](https://help.axis.com/en-us/axis-camera-station-pro) | HTML section: Select storage devices to connect; Time synchronization; Secure Remote Access v2 | Not stated in the reviewed excerpt |
| `axis-edge-manual` — [Axis - AXIS Camera Station Edge User manual](https://help.axis.com/en-us/axis-camera-station-edge) | HTML section: Troubleshooting > Technical issues and solutions > Login; Web app; Mobile app | September 2026 |

## Decisions and source qualifications

### Access control

**Offline controllers.** Paxton APN-1061 distinguishes failure of an entire RS485 link from failure of some controllers. The extra TCP/IP question uses APN-1006, which covers Net2 plus and its Ethernet interfaces. A cluster beyond a recorded RS485 route point is an editorial lead, not a proven cable break. The guide does not transfer RS485 termination or cable tests to Net2Air, Ethernet-only or Paxton10 systems. See evidence `access-offline-rs485` and `access-offline-ip`.

**Credential and release.** APN-1059 and APN-1060 distinguish an explicit denial, lack of reader response and a grant without physical release. Offline controllers not receiving changed user validity are a separate candidate. Questions about another credential or reader refer to results already observed during authorised use; they do not request a new credential trial. See `access-denied-validity`, `access-denied-reader` and `access-denied-update`.

**Door left unlocked.** Scheduled release, an active Net2 fire-release state, exit-input activity and supply loss to a documented fail-open lock are separated. The mechanical candidate is supported by the separately scoped PaxLock Pro installation guide; its measurements and repair methods are not generalised to other hardware. The questions do not establish whether an escape door is compliant or suitable for occupancy. See `access-unlocked-schedule` through `access-unlocked-mechanical`.

**Door alarms.** A Net2 forced-door label can result from a mechanical-handle exit without the expected exit event. A left-open event instead concerns the allowed opening duration. A contact reading that disagrees with visible position is treated as a monitoring discrepancy, without naming a failed component. No alarm label is presented as proof of unlawful entry. See `access-door-events`, `access-door-contact` and `access-unlocked-exit`.

### CCTV

**Link and power status.** The Hikvision examples distinguish unreachable network/address errors, explicit authentication errors and a camera-not-detected message. The PoE question is conditional on an already-recorded power-off exception from supported Hik-Partner Pro monitoring. It does not assume every NVR offers that exception. The online recorder pages do not identify every compatible recorder model; the user must match their exact model/firmware. See `cctv-link-status`, `cctv-link-power` and `cctv-shared-path`.

**Recording versus retention.** The Hikvision motion-recording page supports separate schedule, event and storage candidates. Axis documentation supplies the added retention and time-offset examples. Current live video does not prove that a past recording was made. An oldest-available timestamp later than the incident is not, by itself, proof of the deletion mechanism. A reported clock offset is a lead for reviewing the requested time, not permission to change evidence timestamps. See `cctv-record-creation`, `cctv-record-retention` and `cctv-record-time`.

**Image quality.** IR reflection, optical-cover contamination, focus limitations, motion blur and low-light noise can coexist. The IR source specifically warns that a reflecting surface may lie outside the visible camera image. The near-focus-limit question is only applicable to a model offering that feature. Checks request existing images or safe external observations, not climbing, cover removal or setting changes. See `cctv-image-ir`, `cctv-image-focus` and `cctv-image-exposure`.

**Streaming.** Axis describes device, network and client contributions separately. Its viewer-limit message is not a definitive overload diagnosis: the same guide acknowledges other RTSP-service causes. Comparing an already-available local recording with a stuttering client is an editorial discriminator, not a command to disconnect a live system or generate a traffic capture. See `cctv-stream-capacity` and `cctv-stream-client`.

**Remote access and playback.** Internet availability, provider incidents, account/site association and client codec support are separate candidates. A historical incident must be matched to the fault time; a healthy service now does not settle a past incident. The cited H.265 restriction belongs specifically to the AXIS Camera Station Edge web app in the reviewed September 2026 documentation. It is not claimed for all browsers, recorders or Axis clients. See `cctv-remote-path` and `cctv-remote-codec`.

## Corrections and limits

- **No legacy question was redefined.** Existing display titles were retained. Their broader meanings are clarified by additional observations and hints, rather than silently migrating saved answers.
- Canonical source titles now reflect the actual document titles. In particular, the Hikvision recording page concerns no video after motion detection is configured, rather than being evidence for every possible recording fault.
- The Net2 fire-reset relationship is explicitly configuration-dependent. The fragment contains no fire-reset procedure, override instruction or claim that clearing the fire panel necessarily relocks the doors.
- Where the source describes invasive diagnosis or administration, the fragment uses only the observable part. It contains no electrical measurements, supply interruption, reader rewiring, emergency-release operation, password reset, rights change, factory default, recorder format or recording deletion.
- These flows do not cover every vendor, topology or simultaneous-fault combination. Unavailable evidence and inapplicable model features should receive **I don’t know**. Lack of a positive observation does not prove a system is healthy.
- Some observations are correlated, especially alarm-name and event-sequence questions. Complete bounded weights make the ranking deterministic; they do not establish statistical independence or diagnostic accuracy.
- A successful scenario is only an authored example. Deployment and field validation remain outside this research fragment.

## Review result

The fragment passes a structural review for group sizes, complete bounded matrices, source-reference resolution and unchanged legacy question text. All **19** supplied scenarios returned their specified candidate using the current ranking function. The reviewed dataset contains **67 question-level references**. Only the two requested research files were authored for this task.

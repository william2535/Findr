// FINDR-authored investigation worksheets. Existing references establish the
// named fault distinctions; they do not authorise a test on an arbitrary model.
const measurementRecord = 'Record the exact test point and reference terminals, instrument, time, circuit condition/load, measured value and unit, expected value/range from the applicable manual, source edition/page, and your interpretation. Keep an unavailable reading as not tested.';
const procedureNote = 'Use only the exact-model procedure and an approved test point under the site’s authorised working arrangements. Do not infer a universal voltage, resistance or current limit. Resistance/continuity work requires the manufacturer’s prescribed de-energised test condition and protection of connected electronics.';
// Tuple: stable ID, title, practical prompt, record to retain, optional kind/unit.
const plans = {
  power: [
    ['chronology','Separate the supply messages','Capture mains, charger, battery-disconnected, low-voltage and impedance messages separately; compare their first occurrence with recorded outages.','Original messages, times, affected supply and whether restoration was recorded.'],
    ['baseline','Establish the panel supply baseline','Record the panel’s documented supply/charger diagnostics before comparing a downstream circuit. A supply indication is not a measured value.','Diagnostic display, source, normal reference and current operating state.'],
    ['charger','Record permitted charger / DC supply readings','Where the exact panel procedure permits a DC test, record the approved supply test-point reading and load condition. Keep charger and battery terminal readings separate.',measurementRecord,'DC supply voltage','V DC'],
    ['battery','Examine battery evidence','Retain battery type, capacity, installation date, connection observations and any authorised battery-test result. A terminal voltage alone does not establish usable capacity.','Battery identity, age evidence, test method/result and unresolved charger or connection concerns.'],
    ['comparison','Compare before and after the supply event','Compare readings and alarms in the same documented operating condition; record any condition changes rather than treating them as equivalent tests.','Paired times/readings, loading, supply state and what changed.'],
    ['verification','Verify supply recovery','After authorised corrective work, record the manufacturer-prescribed supply/battery verification and whether the original messages return.','Restoration test, observation duration, remaining faults and standby provision.'],
  ],
  loop: [
    ['identity','Define the loop fault precisely','Record open circuit, short circuit, high-resistance/integrity or communication wording, loop/node, first occurrence and current expected-versus-reported devices.','Exact display, loop/node, missing addresses and configuration/export date.'],
    ['topology','Confirm the actual cable route','Establish the physical outgoing and return ends, first and last devices, branches and isolators from checked drawings or traced evidence. Do not use consecutive address numbers as cable order.','Drawing/source reference, confirmed physical endpoints, unknown sections, branches and isolator indications.'],
    ['panel-baseline','Record the panel-end baseline','Use the exact-model loop diagnostic/test procedure to record permitted panel-end DC readings and current loop supply directions. A dual-fed open loop may still power every device.',measurementRecord+' Include outgoing/return identity and isolator/feed state.','Loop DC voltage','V DC'],
    ['end-devices','Compare confirmed first and last physical devices','If the manufacturer permits the test, record the same defined reading at the confirmed first and last physical devices, with the same reference and stated supply/test condition. Powered devices at both ends do not rule out an open circuit.',measurementRecord+' Keep both endpoint readings and labels; do not declare a cable break from voltage alone.','Endpoint DC voltage','V DC'],
    ['narrowing','Narrow a confirmed physical section','Only where the exact procedure permits controlled section testing, use the confirmed route and comparable satisfactory/abnormal evidence to choose the next intermediate point. If topology, feed state or results conflict, retain the wider section instead of eliminating it.','Section boundaries, why the point was chosen, procedure/test condition, point reading and which section still needs investigation.'],
    ['cable-test','Record the permitted cable integrity test','If the model procedure calls for continuity/resistance testing, record results only in its prescribed de-energised condition. Document how that method applies to the cable section and connected equipment.',measurementRecord+' Record the precise cable section and test method; unknown is not a pass.','Cable resistance / continuity','Ω'],
    ['restoration','Prove the loop is restored','After authorised work, record the specified loop integrity/device-status checks, restored feed/isolator state and comparison with the original device list.','Before/after faults, integrity test results, device count, outstanding section and final system state.'],
  ],
  earth: [
    ['scope','Identify the earth indication','Capture the exact earth-fault message, affected equipment and any polarity/path information the model actually provides.','Message, timestamp, panel/node and what the indication does not identify.'],
    ['environment','Build the environmental timeline','Compare occurrences with rain, condensation, damp equipment and recent work; retain visible evidence without deciding that moisture is the cause.','Location, weather/work time, enclosure condition and photograph/reference if available.'],
    ['reference','Record approved earth diagnostics','Use only the exact panel’s permitted earth-fault diagnostic/test points; retain the reference, operating condition and manufacturer interpretation.',measurementRecord,'Earth diagnostic reading','As specified'],
    ['sections','Track an authorised section investigation','For section tests permitted by the exact manual, record each tested section, the authorised test condition and whether the indication changed. Preserve the wider scope if results conflict.','Section identity, procedure, start/end time, indication before/after and service impact.'],
    ['integrity','Retain cable-condition results','Record any permitted cable/insulation test with its specified method and equipment limitations. Do not apply an insulation test to connected electronics without the exact prescribed arrangement.',measurementRecord+' Include instrument mode and test setup evidence.','Cable integrity','As specified'],
    ['recurrence','Check for recurrence','After authorised work, document the manufacturer’s restoration checks and whether the earth indication returns under relevant conditions.','Final indication, monitoring period, remaining damp/damaged areas and next inspection.'],
  ],
  device: [
    ['identity','Pin down the affected device','Record panel/node/loop/address/sub-address and the exact missing, wrong-type, duplicate or bad-data message. Keep imported location text separate from the checked physical label.','Full address, programmed location, installed label evidence and message.'],
    ['pattern','Map the communication pattern','Compare one repeated device with groups that fail together; use actual topology evidence for shared sections, not address adjacency.','Affected/unaffected devices, common times and confirmed shared route.'],
    ['configuration','Compare programmed and installed identities','Check existing configuration and replacement history against the complete device code, protocol and compatible base; retain conflicts rather than silently choosing a model.','Configured type, label code/suffix, firmware/protocol, replacement time and conflicts.'],
    ['supply','Record a permitted device supply reading','If the exact device/panel method permits it, record the approved DC test point, reference and loop state alongside the communication status.',measurementRecord,'Device DC supply','V DC'],
    ['comparison','Compare with an appropriate reference','Compare diagnostics with an equivalent known-working device under the same documented conditions. Record why the comparison is valid; similar appearance is insufficient.','Reference identity, matched conditions, diagnostics and difference observed.'],
    ['verification','Verify communication after work','Record the manufacturer’s required status/functional verification after authorised corrective work, including whether the same fault recurs.','Status, test event/result, original address identity and remaining intermittent evidence.'],
  ],
  sounder: [
    ['classification','Separate fault, disablement and test state','Record the output identity and exact open/short/supply message alongside any disablement, silence, test or delay indication.','Circuit/output ID, indication categories and original event timing.'],
    ['design','Establish the monitored circuit design','Use approved drawings and the exact panel/output manual to identify the circuit, supervision arrangement and documented end device or termination.','Drawing, output type, termination specification/source and confirmed route.'],
    ['panel-reading','Record permitted output readings','Record approved output DC readings in the manual’s stated normal/alarm/test condition. Those conditions may produce different readings and must not be mixed.',measurementRecord,'Output DC voltage','V DC'],
    ['field-reading','Compare the affected circuit locations','Where the procedure permits, compare panel-end and confirmed field/end-device readings in the same documented condition; record the affected circuit extent. ',measurementRecord+' Include physical locations and circuit-state confirmation.','Field output voltage','V DC'],
    ['supervision','Record the approved supervision check','Retain any authorised supervision/cable integrity result with the required de-energised arrangement and exact termination values from the model documentation.','Procedure, expected supervision condition, measured result and equipment/test arrangement.'],
    ['operation','Verify supervised status and operation','After authorised work, record restoration of supervision and the approved functional output test, including effects on connected equipment.','Fault state, witnessed output response, service-impact arrangements and outstanding issues.'],
  ],
  network: [
    ['nodes','Map the affected nodes','Record which panels/repeaters are offline and which retain normal local operation, with first fault times.','Node IDs, local status, network messages and common timing.'],
    ['route','Confirm network route and configuration','Compare the documented route, node IDs, card identity and recent approved configuration changes. Keep unknown connections explicit.','Drawing/version, expected nodes, observed identities and change history.'],
    ['local-power','Record permitted remote supply diagnostics','Record the remote panel’s displayed supply diagnostics and any exact-model permitted DC measurement before treating a link fault as a cable failure.',measurementRecord,'Remote DC supply','V DC'],
    ['link','Compare link-end indications','Compare documented link/card diagnostics at both confirmed ends and distinguish local operation from transport availability.','Endpoint IDs, card indicators, error counters and test/operating state.'],
    ['section','Record authorised network section tests','Use the exact network manual’s approved method to record section results; do not infer a topology from node-number order.','Section boundaries, method/source, results and nodes remaining affected.'],
    ['recovery','Verify network recovery','Record expected node visibility, local operation and specified communication/functional tests after authorised work.','Recovered nodes, test messages, time observed and any remaining intermittent errors.'],
  ],
  system: [
    ['message','Preserve the original system evidence','Capture processor/watchdog, checksum, memory or generic system-fault wording and the event sequence before any authorised intervention.','Exact messages, timestamps, restart count and available diagnostic export.'],
    ['baseline','Identify software and configuration baseline','Record panel/card identity, firmware and approved configuration revision; compare the event with recent changes.','Software/configuration references, compatibility evidence and change approval.'],
    ['dependencies','Check accompanying supply and communication reports','Record any concurrent supply or communication indications without assuming that the processor indication identifies the failed component.','Related messages, chronology and what is known about operating state.'],
    ['diagnostics','Capture model-supported diagnostics','Use the manufacturer’s prescribed diagnostic collection procedure; preserve original evidence and the support case reference.','Diagnostic fields/logs, collection method and manufacturer interpretation.'],
    ['recurrence','Track recurrence and scope','Compare repeated incidents by time, conditions and affected functions; record intermittent recovery separately from a proven repair.','Occurrence table, functions affected, temporary recovery and unresolved dependencies.'],
    ['verification','Record authorised repair verification','After manufacturer-directed or authorised corrective work, record the specified checks and final protection/function status.','Work reference, firmware/configuration outcome, acceptance tests and next support action.'],
  ],
  fire_conventional_zone: [
    ['zone','Define the zone condition','Record the numbered zone and distinguish alarm, open/short fault, disablement and test indications.','Zone label, exact state and when it began.'],
    ['layout','Check the zone design and physical devices','Compare the approved circuit drawing, zone membership, documented end-of-line arrangement and visible missing detector heads.','Physical route evidence, termination specification, head/base identity and changes.'],
    ['baseline','Record approved zone test-point readings','Use the exact panel’s procedure to record zone readings with its specified reference and normal/alarm/test condition.',measurementRecord,'Zone circuit reading','As specified'],
    ['section','Compare confirmed zone sections','For permitted diagnostic tests, record the confirmed section and compare results against the model-specific supervision requirements. Address or device-list order is not a physical route.','Section boundaries, test procedure/condition and observed status.'],
    ['integrity','Retain circuit integrity evidence','Record permitted de-energised continuity/resistance checks and the documented termination identity without introducing a generic EOL value.',measurementRecord,'Zone resistance / continuity','Ω'],
    ['restore','Verify zone restoration and functional response','After authorised work, record the prescribed zone test and reinstatement, including removal of temporary test/disablement states where authorised.','Zone status, witnessed device response, final indications and outstanding coverage.'],
  ],
  fire_unwanted_alarm: [
    ['incident','Preserve the incident sequence','Record the first initiating input and alarm chronology, including whether a planned test or actual incident was recorded.','First device, activation times, investigation outcome and event-log reference.'],
    ['environment','Capture conditions at the actual event time','Record steam, fumes, dust, airflow or other documented activity at the detector location; distinguish witnessed events from later assumptions.','Time-correlated environmental evidence, source/person and location.'],
    ['device','Confirm detector type and suitability evidence','Compare the full label and programmed type with the documented application/design and maintenance history.','Installed model, programmed type, design reference and previous service results.'],
    ['trend','Collect supported contamination / analogue diagnostics','Record model-supported detector values and their documented interpretation without importing a threshold from another detector family.',measurementRecord,'Detector diagnostic value','Manufacturer units'],
    ['repeat','Compare repeated and unaffected locations','Look for repeated locations or shared environmental events; retain comparable unaffected devices and reasons the comparison is valid.','Incident pattern, comparison locations, time windows and competing explanations.'],
    ['verification','Record corrective action and follow-up','After approved maintenance/design action, record prescribed verification and a defined follow-up observation period; absence of another alarm is not immediate proof of cause.','Work, test result, monitoring period, remaining uncertainty and next visit plan.'],
  ],
  fire_disablement_test: [
    ['status','List every affected disablement or test state','Record exact zones, outputs, devices and delay/test indications rather than treating every amber indication as a fault.','Affected functions and scope, current status and start time.'],
    ['authority','Find the reason and authorised owner','Check the site work/test record and responsible-person instruction before treating the state as unintended.','Work reference, authorised reason, owner and intended completion.'],
    ['impact','Record protection and response impact','Compare the affected functions with the approved cause-and-effect and site arrangements; identify coverage or output limitations.','Affected areas/outputs, temporary arrangements and responsible person informed.'],
    ['comparison','Compare intended and actual status','Compare the authorised list with the panel’s actual list and separate unexplained entries from planned work.','Matched entries, unexplained differences and who must resolve them.'],
    ['verification','Document authorised reinstatement checks','When reinstatement is authorised, retain the exact procedure and evidence that intended functions were restored and tested.','Authority, state before/after, functional verification and remaining restrictions.'],
    ['handover','Account for every remaining restriction','Retain an explicit owner, reason and next action for any remaining test/disablement/delay state.','Outstanding state, protection impact, owner and review deadline.'],
  ],
  fire_outputs_not_operating: [
    ['expected','Establish the required output response','Use the approved cause-and-effect to identify what response was required for the actual initiating event.','Input/event, output ID, required condition and design revision.'],
    ['states','Capture states that affect the response','Record delay, silence, disablement and test indications with timestamps; do not treat an expected programmed state as failed hardware.','Event sequence and state of each relevant control/output.'],
    ['command','Compare commanded and observed response','Compare supported controller diagnostics/event logs with what was witnessed at the connected equipment.','Command indication, witness/location, physical response and timing.'],
    ['supply','Record permitted output and supply readings','If required by the exact procedure, record approved DC readings at the controller and confirmed load under the same stated output condition.',measurementRecord,'Output / load DC voltage','V DC'],
    ['path','Separate control logic from field path evidence','Record documented logic/configuration findings, monitored-circuit faults and field equipment diagnostics separately.','Evidence supporting each path and the next authorised discriminating check.'],
    ['verify','Verify the complete required response','After authorised work, record the approved cause-and-effect test from input through actual output, including reinstatement of temporary arrangements.','Test reference, complete response, witness, final states and unresolved outputs.'],
  ],
  fire_beam: [
    ['message','Capture the beam controller’s exact fault','Separate rapid obscuration, compensation limit, alignment, ambient-light, communication and low-power messages.','Controller/channel, exact message, time and current signal/diagnostic display.'],
    ['path','Record the real beam path conditions','Observe and document obstructions, movement, dirt, light conditions and recent building work without assuming they explain the fault.','Detector/reflector positions, path observations and environmental timing.'],
    ['signal','Record supported beam diagnostics','Record signal/alignment/compensation values using the exact model’s diagnostic method and documented reference conditions.',measurementRecord,'Beam signal / compensation','Manufacturer units'],
    ['power','Record a permitted supply check when relevant','For low-power or communication indications, record the approved supply test-point measurement and condition if the model procedure permits it.',measurementRecord,'Beam supply voltage','V DC'],
    ['comparison','Compare conditions before and after approved action','Retain diagnostic values and environmental conditions on both sides of an authorised adjustment or maintenance action.','Action reference, paired values, alignment/path conditions and remaining faults.'],
    ['verification','Record the manufacturer’s beam verification','After authorised work, record required functional/fault checks and final operating status rather than accepting a cleared display alone.','Test method, observed response, witness and remaining maintenance action.'],
  ],
  fire_aspirating_airflow: [
    ['flow','Identify the affected airflow condition','Record high/low airflow, filter message and affected pipe/sector with first occurrence and detector operating state.','Pipe/sector IDs, message, current values and fault time.'],
    ['design','Compare the installed sampling arrangement','Use the approved pipe design to record confirmed routes, visible damage, covered holes, end arrangements and later changes.','Drawing/revision, physical observations and unverified sections.'],
    ['diagnostics','Capture pipe airflow and detector diagnostics','Record supported per-pipe airflow and filter/fan diagnostics under the exact model’s documented conditions.',measurementRecord,'Airflow / detector diagnostic','Manufacturer units'],
    ['environment','Compare ventilation and building changes','Compare fault timing with ventilation, pressure or occupancy changes and keep those records separate from proven pipe defects.','Building mode, dates, environmental evidence and design assumptions.'],
    ['comparison','Compare affected and stable pipes','Compare like-for-like pipe diagnostics where the design supports comparison; different pipe geometry may require different expected values.','Pipe identities, design values, observed differences and next authorised check.'],
    ['verification','Verify airflow and detection after work','Retain the manufacturer-prescribed airflow and functional verification following authorised maintenance or design correction.','Final diagnostic values, test response, design/update reference and unresolved issues.'],
  ],
  'security-alert': [
    ['classification','Separate tamper, supervision and system reports','Record the exact device/CIE message and timing; keep radio jamming, missing-device and casing reports separate.','Device/area, event category, timing and initial state.'],
    ['physical','Record the device and enclosure evidence','Check the named location and full label against records; retain visible casing/mounting condition and relevant service work.','Location, label, casing observations and work history.'],
    ['diagnostics','Record supported system / radio diagnostics','Retain the exact model’s tamper, battery, supervision and radio diagnostics with their timestamp and context.','Diagnostic name, raw value/status, model interpretation and last successful communication.'],
    ['comparison','Compare isolated and shared events','Compare the affected device with other devices on the same receiver or system at the fault time.','Affected/unaffected set, shared timing and receiver/system evidence.'],
    ['directed-test','Record the authorised discriminating check','Use the exact installation/service procedure for any required tamper or supply test, retaining its result rather than assuming an open casing is the only cause.','Procedure reference, exact test condition, observed result and unresolved path.'],
    ['verification','Verify normal protection after work','Record the specified functional/tamper/supervision verification and final setting/protection state after authorised work.','Test result, remaining events, areas affected and next engineer action.'],
  ],
  'security-power': [
    ['messages','Separate panel, battery and charger warnings','Capture the exact supply warnings and chronology, including mains restored and prior load-test records.','Warning source, affected PSU, first occurrence and outage history.'],
    ['identity','Establish PSU and battery requirements','Record panel/PSU model and battery specification, installation date and exact documented test requirements.','Equipment identity, battery details, expected conditions and manual edition.'],
    ['supply','Record approved DC supply measurements','Measure only at the exact model’s approved DC test points and retain load/operating condition with the reading.',measurementRecord,'Intruder DC supply','V DC'],
    ['battery','Record battery evidence beyond terminal voltage','Retain approved battery-test method/result and connection observations; a resting voltage alone does not show available capacity.','Battery identity, permitted test result, load condition and connection findings.'],
    ['comparison','Compare source and affected load','Where permitted, compare PSU and confirmed downstream readings in the same operating state; retain the actual route and loading evidence.',measurementRecord,'Downstream DC supply','V DC'],
    ['verification','Verify recovery and standby provision','After authorised work, record the documented supply/battery checks and any continuing low-voltage or charging indication.','Final alarms, test results, standby condition and follow-up.'],
  ],
  'security-setting': [
    ['attempt','Record the failed setting attempt','Capture requested area/mode, exact keypad message, time and stage reached without recording access credentials.','Area, mode, event log and active-zone/fault/reset wording.'],
    ['zones','Compare the reported zones with actual conditions','Record each named opening or detector condition and its indicated active/secure state.','Zone/location, physical condition, displayed state and disagreement.'],
    ['permissions','Check authorised scope and restrictions','Use authorised records to compare area permission, reset requirements and keypad lock state; do not bypass them.','Permission/reset evidence, authorised owner and outstanding restriction.'],
    ['sequence','Compare the documented setting sequence','Compare observed exit/entry stage and log events with the exact panel’s documented sequence and programmed site options.','Stage reached, times, model/site setting reference and differing behaviour.'],
    ['targeted','Record a permitted diagnostic check','Follow the relevant zone, supply or system investigation for the identified blocker and retain the result in this case.','Linked investigation, test/source, finding and whether the blocker remains.'],
    ['verification','Verify the authorised setting outcome','Record the agreed functional setting/unsetting verification and actual final area state after corrective work.','Witnessed result, final protection state, residual blockers and handover owner.'],
  ],
  'security-signalling': [
    ['event','Identify the missing transmission','Record event type/time, intended receiving centre/path and exact transmission, modem, cloud or configuration message.','Event reference, expected recipient/path and failure details; omit credentials.'],
    ['paths','Separate local, network and cellular evidence','Compare available path diagnostics and fault timing with local network/service status.','Path names, supported statuses, outage/change records and unaffected paths.'],
    ['radio','Record documented cellular diagnostics','Retain the actual supported signal metric and unit, network/registration status and manufacturer interpretation; do not apply a generic radio threshold.',measurementRecord,'Cellular diagnostic','Reported units'],
    ['configuration','Compare approved signalling configuration','Have the authorised party compare destination/path configuration with the approved records without exposing passwords or reset procedures.','Configuration reference, discrepancy, authorised reviewer and change status.'],
    ['receipt','Correlate sender and receiving-centre evidence','For an authorised test/event, compare the panel’s transmission record with actual receiver acknowledgement.','Test/event ID, send/receive times, receiving-centre reference and missing stage.'],
    ['verification','Record end-to-end service restoration','Document approved path testing and confirmed receipt after work, plus any remaining degraded signalling path.','Verified paths, acknowledgement references, residual risk and responsible party.'],
  ],
  'security-repeat-alarm': [
    ['timeline','Reconstruct each activation','Record the first input, area/zone, alarm/tamper/supervision classification and event timing.','Occurrence table, source log and first-event certainty.'],
    ['environment','Record conditions at activation time','Collect witnessed occupancy, pets, sunlight, heating, opening movement or work that coincides with the activation.','Time-linked conditions, witness/source and differing uneventful periods.'],
    ['identity','Check the detector and application record','Compare model, location, coverage/design, mounting observations and maintenance history.','Label, design basis, visible condition and prior interventions.'],
    ['diagnostics','Retain model-supported detector evidence','Record the authorised diagnostic/test result with the exact sensitivity/mode context already documented; do not invent a universal setting.',measurementRecord,'Detector diagnostic','Manufacturer units'],
    ['comparison','Compare repeated and stable conditions','Separate ordinary detection, entry-time events, tamper and supervision evidence; compare similar unaffected periods/devices.','Comparison basis, repeat pattern, alternatives still possible and next check.'],
    ['verification','Document corrective work and follow-up','Record the approved functional test and agreed observation period after authorised work rather than declaring a cause solely because alarms stopped.','Work, test/witness, monitoring window, remaining uncertainty and follow-up owner.'],
  ],
  'security-wireless': [
    ['identity','Identify the exact wireless report','Record device/receiver IDs and whether the event is battery, tamper, supervision, mismatch or jamming.','Full report, last successful communication and first fault time.'],
    ['scope','Compare one device with the receiver group','Record affected and unaffected devices at the same times to distinguish a local pattern from a shared receiver/environment pattern.','Device group, timings, receiver status and recent physical changes.'],
    ['signal','Record the supported radio metric','Use the exact system’s documented signal/supervision diagnostics and keep the units and interpretation attached.',measurementRecord,'Wireless signal / supervision','Reported units'],
    ['battery','Record battery and device condition evidence','Retain the complete device/battery identity, replacement history and any manufacturer-permitted battery-test result.','Battery warning/test evidence, type, date and casing/location observations.'],
    ['configuration','Check device/receiver compatibility evidence','Compare approved enrolment/device-type records and exact hardware/protocol identity; keep a mismatch unresolved until checked.','Configuration reference, physical label, incompatibility evidence and authorised owner.'],
    ['verification','Verify communication and protection','After authorised work, record the specified functional, tamper and supervision checks over the required observation period.','Test responses, final radio diagnostics, remaining faults and next review.'],
  ],
  'security-zone': [
    ['state','Capture physical and indicated zone state','Record the named zone, contact/detector type, actual opening/movement condition and exact active/tamper indication.','Location, physical state, panel state and time.'],
    ['design','Confirm the zone wiring/configuration basis','Use the exact panel/device manual and approved design to identify supervision and expected normal conditions without assuming a generic resistor value.','Circuit type, termination specification/source and configured zone type.'],
    ['reading','Record approved zone diagnostics or readings','Use the exact model’s permitted diagnostic or de-energised circuit-test method, retaining reference, condition and expected interpretation.',measurementRecord,'Zone diagnostic / resistance','As specified'],
    ['comparison','Compare changed and unchanged physical conditions','Under an authorised test, compare the normal physical states with panel response and retain timing and any intermittent disagreement.','Test condition, physical action authorised, displayed response and repeatability.'],
    ['path','Localise the unresolved contact / circuit evidence','Use confirmed cable/device identity and manufacturer-permitted comparisons to identify which section still requires investigation.','Compared points, procedure, findings and remaining unknown section.'],
    ['verification','Verify zone and tamper response','Record the prescribed functional/tamper checks and final zone/area state after authorised work.','Secure/active/tamper outcomes, witness, protection state and unresolved findings.'],
  ],
  'access-offline': [
    ['scope','Map which controllers are offline','Record affected/unaffected controllers, link/server and time of loss, including local door operation if known.','Controller IDs, shared link, earliest event and local status.'],
    ['power','Record controller supply evidence','Retain documented power indicators and any exact-model permitted DC supply measurement at the affected controller.',measurementRecord,'Controller DC supply','V DC'],
    ['route','Check the confirmed communication route','Compare the documented Ethernet/RS485 route and configured node/address records with the actual affected group.','Route/source, expected addresses, confirmed endpoint and recent changes.'],
    ['diagnostics','Compare server and link diagnostics','Record supported server/link status, error indications and authorised network diagnostic results.','Diagnostic source, endpoint/port, timing and server availability.'],
    ['section','Record a permitted path comparison','Compare a known-working controller/link section with the affected one using the manufacturer’s authorised method; node order is not cable order.','Reference controller, route basis, test/result and remaining affected section.'],
    ['verification','Verify online state and door service','Record communication recovery and the agreed authorised door/access test without bypassing fire-release or egress functions.','Online events, test response, fire/egress status and outstanding doors.'],
  ],
  'access-denied': [
    ['event','Separate denied, unresponsive and granted events','Record the exact reader/controller event and actual door response for the affected attempt.','Reader/door, event/time, credential reference without secret data and physical response.'],
    ['permission','Compare authorised permission evidence','Check valid dates, access levels, controller synchronisation and relevant offline history using authorised records.','Permission/version, synchronisation evidence and responsible administrator.'],
    ['reader','Compare an authorised reference credential / reader','Where authorised, record the outcome for a known-working credential or reader and why it is a valid comparison.','Comparison identifiers, permissions, events and reader responses.'],
    ['command','Follow a granted event to the lock response','If access is granted but the door remains locked, compare controller command indication, lock/door condition and fault reports.','Command versus physical response, supply reports and confirmed lock design.'],
    ['load','Record approved lock / controller readings','Where the exact installation procedure permits, record low-voltage readings under the documented lock operating state. Preserve egress/fire-release arrangements.',measurementRecord,'Lock / controller DC voltage','V DC'],
    ['verification','Verify authorised access and final door state','Record the agreed access/door-response verification after work, including continued required egress and fire-interface operation.','Witnessed events, door state, restrictions remaining and handover.'],
  ],
  'access-unlocked': [
    ['state','Capture why unlocking is indicated','Record actual door/lock state with unlock timezone, fire-release and repeated exit-request events.','Door, times, controller state and event references.'],
    ['design','Establish the lock’s documented operating principle','Confirm model, fail-safe/fail-secure behaviour and approved egress/fire-release design before interpreting a power loss.','Lock label, design/manual reference and required safe state.'],
    ['fit','Record mechanical closing and alignment evidence','Observe whether the door reaches its documented closed position and retain recent hardware-work history without defeating release functions.','Door/strike alignment observations, contact indication and changes.'],
    ['power','Record permitted lock power measurements','Use only the exact low-voltage lock/controller procedure to record supply at the approved points in the documented operating state.',measurementRecord,'Lock DC supply','V DC'],
    ['compare','Compare command, supply and physical state','Correlate controller command/event, measured or reported power and actual latch/door condition; keep each as separate evidence.','Time-matched command, supply, physical response and unresolved path.'],
    ['verification','Verify the required locking and release behaviour','After authorised work, record agreed locking/access, egress and fire-interface tests with the responsible person.','Test results, final state, temporary restrictions and unresolved safety/service impact.'],
  ],
  'access-door-alarm': [
    ['event','Identify the door alarm sequence','Separate held-open, forced-open and exit-event messages and capture the access/exit events that preceded them.','Door, ordered timestamps, event types and clock consistency.'],
    ['physical','Compare contact state with the actual door','Record actual open/closed position, contact indication and mechanical closing observations at the same time.','Physical/contact states, location and any disagreement.'],
    ['timing','Compare the approved timing and event requirements','Use the site configuration and exact system documentation to compare open-time and authorised exit/access sequences.','Configured values/reference, observed interval and expected events.'],
    ['inputs','Record a permitted input / contact test','Use the exact controller/contact procedure to retain input diagnostics or permitted circuit readings without bypassing egress or release functions.',measurementRecord,'Door input diagnostic','As specified'],
    ['comparison','Compare repeatable and intermittent sequences','Under an authorised functional test, record the full access/exit/open/close sequence and identify the event or state that fails to follow.','Test steps/reference, expected/actual sequence, witness and repeatability.'],
    ['verification','Verify alarm and door service restoration','Record final contact, access/exit and alarm behaviour after approved work, including any outstanding mechanical or configuration issue.','Final events, physical state, test result and next owner.'],
  ],
  'cctv-link': [
    ['status','Capture the exact camera/channel status','Separate network unreachable, authentication, missing-camera and PoE power-off messages; record when each began.','Camera/channel, error text, timestamps and endpoint identity.'],
    ['scope','Map the affected network path','Compare affected cameras with working cameras on the confirmed switch/uplink route.','Switch/port map, shared timing and source of topology evidence.'],
    ['power','Record supported power / PoE diagnostics','Collect supported port power state, class/budget and exception logs; where a model specifies an approved supply test, record its method separately.','Port identity, reported units/values, budget reference, timestamps and device state.'],
    ['network','Compare approved addressing and link diagnostics','Use authorised records to compare camera/recorder address and port, link status and network diagnostics without exposing credentials.','Configured versus recorded endpoint, link/error metrics and administrator findings.'],
    ['compare','Compare the camera path with an appropriate reference','Record a manufacturer/administrator-approved comparison that separates camera, port/path and recorder evidence.','Reference identity, unchanged conditions, test method, result and remaining suspect path.'],
    ['verification','Verify live view and required recording','After authorised work, record stable live view plus recording/playback checks for the affected channel and monitor for renewed link errors.','Live/recording result, duration, error counts and unresolved channels.'],
  ],
  'cctv-record': [
    ['request','Define the missing footage precisely','Record channel and required time range with timezone, recorder clock and the source of the reported gap.','Requested interval, clock/timezone evidence and channel identity.'],
    ['availability','Separate live-video and stored-video evidence','Record live status, available playback intervals and the oldest/newest retained recording for the same channel.','Live state, playback boundaries, storage location and timestamps.'],
    ['policy','Compare recording schedule and retention','Check the approved recording mode, event schedule, retention and matching event history; do not assume absent events should create recordings.','Configuration reference, schedule/retention, triggering events and expected footage.'],
    ['storage','Record supported storage diagnostics','Capture HDD/storage health, capacity, errors and writing status using the recorder’s documented diagnostic interpretation.','Disk/storage IDs, raw diagnostic values/units, error time and manufacturer status.'],
    ['compare','Compare affected channels and time boundaries','Compare channels sharing storage and gaps sharing the same times, including any camera/server clock disagreement.','Comparison basis, common gap window, clock offsets and remaining explanation.'],
    ['verification','Verify new recording and retrieval','Following authorised work, record a witnessed new recording/playback test and what historical footage remains unavailable.','Test interval, retrievable result, unrecoverable gap, evidence retention and follow-up.'],
  ],
  'cctv-image': [
    ['symptom','Record when and how the image degrades','Capture affected view/time and distinguish day/night haze, movement blur, stationary focus and low-light noise.','Camera/channel, examples, mode, lighting and subject conditions.'],
    ['scene','Document the scene and visible cover condition','Record droplets, dirt, nearby reflective surfaces, lighting changes and the actual subject distance.','Scene evidence, cover condition, distance and environmental timing.'],
    ['baseline','Record supported image diagnostics / settings','Retain exposure, shutter/gain, IR and focus-related values already available through the authorised model interface.','Values/units, mode, manual interpretation and configuration snapshot.'],
    ['comparison','Compare like-for-like image conditions','Compare day/night, moving/stationary or local/recorded images while identifying which conditions changed.','Comparison frames/time, lighting/motion, held conditions and observed difference.'],
    ['directed','Record a model-approved corrective test','Use the exact camera maintenance/focus procedure for any authorised intervention and retain before/after evidence.','Procedure, approved action, unchanged settings/conditions and image result.'],
    ['verification','Verify the required operational image','Record the agreed view/identification requirement under relevant day/night conditions rather than only checking that video exists.','Acceptance scene, recorded sample reference, residual limitation and next review.'],
  ],
  'cctv-stream': [
    ['scope','Define where stuttering occurs','Record camera/client/time and compare live stream, existing local recording and other clients.','Affected paths, playback/live distinction, time window and client identity.'],
    ['load','Record stream and client load','Collect supported stream count, codec, resolution/frame rate and CPU/GPU or viewer-limit diagnostics without changing them.','Raw settings/units, concurrent streams, client load and error text.'],
    ['network','Record network performance evidence','Use authorised monitoring to retain throughput, packet loss, latency and relevant interface/error metrics with their measurement interval.','Metric/value/unit, endpoint/route, time window and tool/source.'],
    ['comparison','Compare stable and affected paths','Compare a valid reference stream/client and identify shared switches, uplinks or resource limits using confirmed topology.','Reference conditions, common path, differing load and remaining alternatives.'],
    ['directed','Document a controlled authorised comparison','Use the agreed vendor/network test plan to change only the documented test condition, retaining original settings and observed impact.','Test plan, controlled variable, before/after metrics and restoration record.'],
    ['verification','Verify smooth live and recorded service','Record performance over the agreed load and observation period, including any continuing client/codec limitations.','Stream quality, load, monitoring period, error counts and outstanding capacity work.'],
  ],
  'cctv-remote': [
    ['scope','Separate remote access from local service','Record which remote operation fails and whether authorised local live view/playback remains available.','Client/site, operation, exact error and local comparison.'],
    ['identity','Check authorised account/site membership evidence','Have the authorised administrator compare membership, permission and sign-in error evidence without recording passwords or recovery codes.','Account reference, permission source, exact error and administrator finding.'],
    ['services','Correlate internet and provider status','Compare the fault window with site connectivity and provider outage/status records.','Connectivity evidence, provider status time and unaffected services.'],
    ['playback','Compare recording and client compatibility','For playback faults, compare the same known recording in authorised local/remote clients and capture codec/version differences.','Recording/time, client versions, codec, results and supported-mode reference.'],
    ['path','Record the authorised remote-path diagnostic','Use the approved IT/vendor diagnostic method for the affected connection; retain the precise failed stage without changing security controls ad hoc.','Method, endpoint, result, responsible administrator and unresolved dependency.'],
    ['verification','Verify the required authorised remote operation','Record successful live/playback access with the approved account/client after work and any ongoing provider or site limitation.','Verified functions, test time, local service state and next owner.'],
  ],
  'warden-report': [
    ['message','Record the exact resident/system report','Capture spoken/displayed wording separately for supply, battery, line, resident unit and fuse reports.','Exact message, resident/unit reference, timestamp and affected service.'],
    ['impact','Establish the affected call capability','Use the exact system documentation and responsible staff report to identify which emergency/ancillary functions may be affected and current support arrangements.','Affected residents/functions, staff contact, temporary arrangements and urgency.'],
    ['baseline','Record supported system supply diagnostics','Retain the exact model’s PSU/battery/fuse diagnostic status and any approved low-voltage test, with the relevant circuit identified.',measurementRecord,'Warden system supply','V DC'],
    ['path','Compare resident and outgoing call-path evidence','Separate unit faults from manager/telephone/outgoing-path faults and correlate event times with restored-supply reports.','Unit/path identities, event chronology and known-working reference.'],
    ['directed','Record the authorised service investigation','Use the exact vendor/service procedure for required checks; retain what was tested and what staff assistance or protection remained in place.','Procedure, controlled condition, result, service impact and outstanding fault.'],
    ['verification','Verify resident service and handover','Record the agreed witnessed call/function test after work and the explicit final status for each affected resident/function.','Test/witness, received response, final limitations and staff handover.'],
  ],
  'warden-call-not-received': [
    ['call','Trace the particular missing call','Record resident/unit, initiation time and whether the call appears in the manager/event record.','Call/event ID, source unit, time, record presence and reported destination.'],
    ['routing','Capture operating mode and routing state','Record onsite/offsite, parked-call, handset silent/no-signal and resident test-mode indications as separate observations.','Exact states, device identities and timing relative to the call.'],
    ['path','Check unit, system and outgoing-path faults','Correlate known resident-unit and telephone/path faults with the affected call and compare a known-working route.','Fault messages, shared path, reference call and potential missing stage.'],
    ['diagnostics','Record supported handset / route diagnostics','Use the exact system/handset diagnostics to retain signal, registration, call routing and service status.','Raw status/values, units where present, source and interpretation.'],
    ['witnessed','Record an authorised witnessed call test','Under agreed staff/service arrangements, record each stage from initiation through actual receipt and acknowledgement.','Test reference, initiator, receiving staff, timestamps and stage not reached.'],
    ['verification','Verify the final call route and staff handover','After authorised work, record the required call test and ensure any remaining resident/service limitation has an explicit owner.','Confirmed route, receipt evidence, outstanding protection arrangements and next action.'],
  ],
  'warden-speech': [
    ['direction','Record both speech directions separately','Record whether staff heard the resident and the resident heard staff during the actual affected call; distinguish announcements from live speech.','Call type, endpoints, each direction, time and witnesses.'],
    ['states','Capture privacy, mute and audio states','Record documented privacy, handset mute and volume indications in the context of the call type. Do not treat routine privacy behaviour as a failed emergency path.','Exact indications, call context and manual interpretation.'],
    ['scope','Compare endpoints and call types','Compare an authorised known-working handset/unit or call path while retaining what changed.','Reference endpoints, call type, direction results and comparison validity.'],
    ['diagnostics','Record model-supported audio / link diagnostics','Use the exact system’s approved diagnostics or test method; retain reported values and their units rather than inventing an audio threshold.','Method/source, endpoint, raw result and documented expected behaviour.'],
    ['directed','Document an authorised functional comparison','With staff/service arrangements agreed, retain the result of the prescribed speech test and any unit/path faults at the same time.','Test/witness, directions heard, fault messages and outstanding endpoint/path.'],
    ['verification','Verify speech service and handover','After authorised work, record the required witnessed two-way response for relevant call types and final privacy/service state.','Final speech results, call types, staff handover and remaining limitation.'],
  ],
};

const fallback = [
  ['evidence','Record the unlisted fault','Preserve the exact message, affected function, timing and physical location. Do not force the fault into an unrelated guide.','Original message, site/panel/device scope, event history and immediate service impact.'],
  ['reference','Identify the applicable procedure','Find the exact equipment/firmware documentation or technical-support instruction before undertaking diagnostic tests.','Model, firmware, document edition, section and support case reference.'],
  ['record','Retain actual findings and next steps','Record each authorised observation or measurement with its context, including inconclusive results and checks not performed.','Test point/method, result/unit, expected reference, unknowns and next engineer action.'],
];

export const INVESTIGATION_GROUP_IDS = Object.freeze(Object.keys(plans));

export function getInvestigationPlan(group) {
  const id=typeof group?.id==='string'?group.id:'unlisted';
  const references=new Map();
  for(const question of group?.questions||[])for(const ref of question.sourceRefs||[]){
    if(!ref?.sourceId)continue;
    const key=JSON.stringify([ref.sourceId,ref.page??null,ref.section??'']);
    if(!references.has(key))references.set(key,{...ref});
  }
  const sourceRefs=[...references.values()];
  return {
    id,title:`${group?.title||'Unlisted fault'} investigation`,
    scope:'FINDR investigation worksheet. References support interpretation of this fault group’s named symptoms; they are not a universal manufacturer test procedure and do not verify every checkpoint or measurement sequence below. The suggested investigation order is FINDR-authored. Select the exact equipment manual, approved test conditions and site authority before physical tests. '+(group?.scope||''),
    checks:(plans[id]||fallback).map(([key,title,prompt,record,measurementKind,unit])=>({
      id:`${id}:${key}`,title,prompt:measurementKind?`${prompt} ${procedureNote}`:prompt,record,
      ...(measurementKind?{measurementKind,unit}:{}),requiresProcedure:!!measurementKind||/authorised|permitted|procedure|prescribed|test plan|functional test/i.test(prompt),
      sourceRefs:sourceRefs.map(ref=>({...ref})),
    })),
  };
}

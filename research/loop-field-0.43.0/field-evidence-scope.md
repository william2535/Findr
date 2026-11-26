# Protec 6500 field evidence scope

Reviewed 26 November 2026 for FINDR 0.43.0. This update records an engineer's real observations and photographs. It must not represent the fictional Panel Lab simulation as a real panel connection or generate live test results.

## Reused evidence

No manuals were downloaded again. Reused the checked PDF and page renders under `/tmp/protec6500-research/`, and `research/protec6500-loop-lab/{SOURCE-AUDIT.md,sources.json}`.

The existing catalogue record `protec-aee99ea8ed2b` points to the manufacturer-authored **Protec Algo-Tec 6500/6600 Commissioning Manual**, RDM0002/2_4, revision dated 11 December 2017, hosted by Acorn. The downloaded bytes have SHA-256 `0e841fa49b0a24fac91d5c7cde6987e4b311974d0a96ee78643e0ca17a2bfeb0`. PDF page positions and printed page numbers coincide for all references below. The file has 43 PDF pages although its footers say “of 44”.

- [Catalogue PDF](https://www.acornfiresecurity.com/index.php?filename=6500-commissioning-manual.pdf&route=extension%2Fmodule%2Fdocument%2Fdownload): p4 competence; pp5–8 access/navigation; p9 logging; p10 allocation table; p13 Diagnostic Tools; pp20–21 Loop Info and counters; p30 loop faults.
- **Protec X600 Commissioning Software User Manual**, RDM0024 Issue 6 AC, revision dated 26 February 2019: [public manufacturer-document transcription](https://www.scribd.com/document/558311549/Commissioning-Software-User-Manual), printed pp52 and123, defines map-node position. This is an external HTML source, not a verified downloadable saved-PDF page. Its archived HTML hash and limitations are in the previous audit.
- The 2019 RDM0002/3 edition corroborates the core navigation and counters. Neither historic edition establishes current-firmware screen parity. Do not silently substitute their page positions.

## Actual allocation table: photo/OCR contract

The p10 screenshot was visually inspected again. Its left table headings are:

| Visible heading | Intended field | Handling |
| --- | --- | --- |
| Add | Address | Preserve raw text. The manual permits allocated addresses1–200;0 or blank can mean unallocated, so neither means device zero nor a valid physical position. |
| State | Displayed device state | Preserve the displayed string rather than inferring a diagnosis. |
| S/N | Device serial number | Alphanumeric. Do not convert to a number or discard leading characters. |
| Type | Displayed device type | Preserve the exact displayed identifier; do not infer compatibility. |
| Ver | Displayed device software version | A device value, not the installed panel firmware. |
| Map | Map node | Preserve numeric value and raw text; missing/unclear values are unknown, not zero. |

The example rows show addresses1–10, `OK`, serial numbers `DFD310`–`DFD319`, type `16PAI`, device version10, and map1 throughout. Those are documentation examples, not user data or a seeded real job. Their repeated map1 values demonstrate why a map group is not an exact device sequence.

The top bar includes the panel and loop identity, status, and date/time. The right-side headings `Logged`, `Unallocated`, `Missing`, and a position indicator such as `1 of 33` are summary information, not additional device rows. The address-allocation keypad, its numbers, arrows and buttons are not device data. No zone, location description, cable length or physical-sequence column is visible in this particular screen.

Recommended import safeguards are FINDR implementation rules, not claims from the manual:

- Keep the original photo and OCR text associated with the import. Ask the engineer to review extracted rows before merging them into confirmed evidence. A general OCR confidence score is not confirmation.
- Prefer the known table region/heading alignment, and allow manual column mapping or row correction if another firmware layout differs. Incomplete rows must remain visibly incomplete.
- Warn if a photo lacks panel/loop context; require that identity before merging. Different loops may reuse addresses and map values.
- Multiple photos may overlap; merge exact duplicates by confirmed panel/loop and identity, but flag conflicting serials, addresses or map values. Do not silently overwrite prior observations.
- Preserve the original reading and corrections, source image reference, capture/import time, and engineer confirmation. Imported date/time shown on a panel is not automatically the phone's capture time or proof that the panel clock is correct.

## Map groups and physical sections

The X600 manual relates a map node to the number of preceding isolators from loop sideA. This provides approximate physical position. Sorting by Map is supported by the allocation screen, but it does not prove an exact order between devices with the same node.

Use **Map group** for a collection derived from the Map column. Use **Confirmed physical section** only when the engineer records independent site evidence identifying its boundaries and route. Store these as separate concepts. A device does not need its own isolator to share a mapped group. An absent or stale map does not justify inventing cable order. Addresses, serial numbers, device names, and photo row order cannot substitute for a verified physical route. Branch/spur reconstruction is not established by these manuals.

The UI may render groups in ascending confirmed map order, but devices within a tied group must be visually equal or explicitly marked “order within group unconfirmed”. Site-confirmed physical order can be added separately with its evidence; it should not rewrite the original map reading.

## Actual missed replies and polls

RDM0002/2_4 p21 describes **Total Device Missed Replies** as cumulative since the last counter reset. **Total Exchange Errors** concerns loop-card/driver-processor communication and is a separate counter. The named **Reset Counts** control clears both; it is not the main panel Reset action. The manual recommends resetting counts and rechecking after one hour, with no missed replies expected.

The p20 **Scan Time** is the duration to communicate with every loop device. The30second figure describes the display's refresh interval. The reviewed screen does **not** establish a total-polls counter, per-device polling totals or individual missed-reply counters.

Therefore:

- Name the main captured field exactly, or show “Missed replies — panel total”. Record panel, card/loop identity, actual displayed value, observation time, source and configuration/coverage.
- Record a counter reset, panel restart or suspected rollover as an event. Never subtract across an unknown reset boundary or turn a negative difference into zero. Preserve both original snapshots and mark the interval incomparable.
- Calculate added missed replies only for a valid start/end pair. If no beginning value exists, show the raw total without a fabricated interval delta.
- An optional **polls** field must remain clearly engineer-supplied and require its actual source/definition. Do not calculate observed polling totals from elapsed time divided by Scan Time, display refreshes, number of photos, or number of connected devices.
- Do not display a missed-reply percentage without an independently observed matching denominator whose scope and period are known. Never divide one loop's total by another section's polls.
- If showing a derived rate, label the time interval and units. A rate calculated from a brief window does not replace the manufacturer's one-hour check or establish a universal acceptable threshold.

## Comparability and conclusions

Capture the observation's panel/loop, start/end times, start/end values, reset/restart status, known reachable and missing devices, relevant load/operating condition, and changes made since baseline. Keep unknowns visible. The engineer may record two sections' observations, but the app must distinguish equal conditions from a changed coverage test.

Lower totals after clearing counters do not demonstrate an improvement. Lower additions over equal periods can support prioritising a section for further investigation, but different reachable populations, excluded devices, elapsed periods and intermittent symptoms limit comparison. A quiet isolated part or one with absent devices cannot be declared healthy on that basis.

Suggested outcome terms:

- “No additional missed replies recorded in this window.”
- “Fewer additional missed replies; coverage changed, so this narrows the investigation only.”
- “These readings cannot be compared: a reset or counter discontinuity is unaccounted for.”
- “Cause remains unconfirmed.”

Avoid “healthy loop”, “fault located”, “corruption proved”, “all devices good”, or a green passed state solely from a low/zero counter. Counts do not establish the cause. Separate an observed improvement, a suspected section, a confirmed cause, and restoration/retest status in saved findings.

## Impairments, restoration and the limit of instructions

No live physical split/disconnection procedure or software **Split Loop** command was verified in the reviewed sources. The field logger may record what a competent engineer reports doing, without supplying unverified wiring steps or making that action look like a remote command. Its controls should say “Record section test” or “Record change”, not imply that FINDR physically switches a loop.

Before recording an introduced impairment, provide relevant fields for authorisation, monitoring/notification arrangements, affected protection, temporary measures, exact changed points and the intended restoration. These are evidence-capture safeguards; they are not an approved site method statement or a universal manufacturer's procedure.

Retain each introduced change until its restoration is recorded. Keep partial restoration, outstanding parts/access, and equipment still disabled visible at handover. Recording reconnection alone does not establish correct functioning: distinguish restoration from functional retest and post-restoration observation. A clear indication or reset alone does not confirm the cause.

## Short interface wording and references

| Context | Suggested wording | Provenance |
| --- | --- | --- |
| Import photo | “Read the rows, then check them against your photo.” | FINDR import safeguard |
| Map display | “Same Map number means a group. The order inside it is not confirmed.” | X600 RDM0024 Issue6, printed pp52,123; inference for ties |
| Add counter | “Enter the total shown on the panel. Tell me if the counts were reset.” | RDM0002/2_4, PDF/printed p21 |
| Quiet interval | “No new missed replies in this window. That does not prove the whole loop is healthy.” | Counter meaning p21 + bounded evidence interpretation |
| Changed section | “The connected devices changed. Keep this as a separate test condition.” | FINDR comparison safeguard |
| Restoration | “What did you put back, and what did you retest?” | FINDR evidence-capture safeguard |
| Navigation source | “Allocation table and Map sort — manual p10.” | Existing record `protec-aee99ea8ed2b`, checked hash above |
| Counter source | “Loop Info and counter reset — manual pp20–21.” | Same existing record; open p20 or21 as appropriate |

The field record is local evidence supplied by the engineer, not telemetry received directly from a panel. Sources must distinguish manual facts, engineer observations, OCR suggestions, calculated deltas and app interpretation. Keep historical source editions and the original evidence available when records are corrected or exported.

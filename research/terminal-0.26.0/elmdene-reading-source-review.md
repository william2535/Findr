# Elmdene 2405ST recorded-voltage comparison

Reviewed on 10 November 2026 for the FINDR terminal correction. This adds a narrow deterministic comparison of an engineer's existing reading. It does not enable a physical-test procedure or confirm a fault cause.

## Manufacturer source verified

- Publisher: Elmdene International Ltd.
- Document: **PAK200789_04A APR 2026**, *2405ST-x 24.0 V dc 5 Amp Switch Mode Power Supply*.
- Official URL: <https://www.elmdene.co.uk/product/manual/PAK200789_04A_2405ST.pdf>.
- SHA-256 of the downloaded PDF: `039cf3f194763593dc2c6eb2e0ac97429025db44d5757260036a9c4be8bbb4ef`.
- PDF page count: **25**. The English section begins at PDF page 1. Referenced English printed pages 1 and 2 match PDF pages 1 and 2.
- Verification: downloaded from the official URL, extracted with `pdftotext -layout`, and visually inspected raster renders of PDF pages 1 and 2. The PDF is not bundled into FINDR or its offline resources by this change; an engineer must attach/save the manual normally.

## Reviewed facts and scope

Page 1 identifies `2405ST-x`, with `x` denoting enclosure size. Its diagram labels separate `LOAD1 − / +` and `LOAD2 − / +` output terminal pairs. Page 2's mechanical table lists `2405ST-C`, `2405ST-K`, `2405ST-E` and `2405ST-H`; `2405ST` names the PSU itself. A generic “PSU”, “Elmdene”, unknown suffix, or literal family placeholder `2405ST-x` is not accepted as an installed model.

Page 2, **Specification — PSU Output**, states:

| Operating condition | Documented voltage |
|---|---|
| Mains power, at full load | 21.6 V dc (Umin) – 28.8 V dc (Umax) |
| Nominal, on mains at full load and 25°C | Un = 24.0 V dc ±3% |
| Battery standby, at full load | 21.6 V dc – 26.0 V dc |

The same page states: “Umax elevated by approximately +1% of Un when connecting the battery. Umax = 28.8V at all other times.”

Only the two explicit **full-load operating envelopes** are enabled for comparison. The nominal ±3% figure is retained as source evidence but is **not** an automated pass/fail limit: no temperature applicability is inferred. The battery-connection transient is explicitly excluded from the mains comparison. “Load connected” is not equated with full load; the configured charger setting changes available load capacity and must be accounted for by the engineer.

The comparator requires:

1. A usable, attached manual with the exact verified PDF hash and readable pages 1 and 2.
2. Engineer-confirmed manufacturer and applicable installed model.
3. A current, performed meter/instrument numeric voltage reading, retaining its raw entry. A historical report, suggested test, unavailable/OL/unstable result or unverified measurement method is not interpreted against the range.
4. The actual same-output +/− pair, DC measurement mode, mains/battery state and explicitly established full-load condition.
5. For mains operation, confirmation that the reading was outside the battery-connection transient.

These context questions describe a reading already taken. They do not instruct an engineer to load a PSU, connect/disconnect batteries, energise equipment or perform a measurement. Existing test-prerequisite rules remain responsible for suggested tests.

## Behaviour in the conversation

“24.1 V at the PSU output with the load connected” is retained exactly. It does **not** automatically produce a normal/healthy verdict. Once the engine has captured missing probe reference, source and conditions, the comparator can ask only for the remaining source-specific scope. Unknown or inapplicable scope is saved as unverified and the normal investigation resumes.

With the exact source/model, fully established applicable conditions and verified method, 24.1 V is within the documented range. That says only that this reading falls within this range. It does not establish PSU health, installed wiring condition, downstream voltage, a cleared fault's cause or restoration. An outside-range observation similarly does not identify a failed component.

An unrelated manual, a different revision/hash or a newly OCR-read limit does not silently acquire authority from this module. Those readings remain recorded with their missing applicable specification. No arbitrary manual text is converted into executable rules.

## Verification

`node --test tests/terminal-reading-evidence.test.mjs`: **8 tests passed** when first implemented. Tests cover source applicability, the natural-language example's missing scope, source/model/method gating, mains versus battery conditions, no nominal-voltage substitution, unknown/partial/no-load and AC rejection, zero versus unavailable/OL/unstable values, unit conversion, correction re-evaluation and immutable historical source snapshots.

Existing engine audit: `reviewCorrectedEvidence` marks affected findings for review and invalidates dependent cause/retest outcomes when supporting evidence is superseded. The terminal layer must re-evaluate the replacement reading and retain the old comparison in transcript history. This module does not mutate readings, sessions, existing procedure profiles or verification state.

This review is not a physical-device benchmark or live electrical test. The exact numeric comparison is intentionally narrow; it is not a general manufacturer-limit extraction system.

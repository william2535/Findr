# Diagnostic calculators and checked document passages — 0.25.0

Checked 10 November 2026. This review implements the supplied FINDR research brief's distinction between a recorded observation, a supported inference, a model-specific reference and a confirmed cause.

## Calculator behaviour

`public/app/diagnostic-calculators.mjs` provides five local, deterministic calculators. Every result records its calculator version. Raw inputs remain available alongside normalised quantities.

| Calculator | Calculation and evidence boundary |
| --- | --- |
| Supply → device voltage | Normalises V/mV, retains signed difference and leaves percentage undefined for zero source voltage. Reuses `compareTestEvents`; interpretation requires recorded points, supply, load, operating/circuit state, measurement time and comparable-condition confirmation. A negative difference is retained. No generic allowable-drop limit is supplied. |
| Voltage/current/resistance/power | Any two of V, A and Ω for a passive steady DC load. Undefined zero-current resistance, contradictory signs and non-finite results are rejected. This is arithmetic, not permission to use an ohmmeter on a connected circuit. |
| Series/parallel resistor network | Accepts explicit units and resistor notation such as `2k2`, `4k7`. Preserves the distinction between `mΩ` and `MΩ`. Zero is valid; OL/unknown/unstable are observations rather than numeric infinity. Nominal totals do not become firmware acceptance bands. |
| PoE headroom | Checks each entered demand against its corresponding actual allocation and separately compares total demand plus other load with the budget. Aggregate spare capacity cannot conceal a per-port shortage. No PoE class defaults or camera maximums are invented. Demand and budget must be referred to the same PSE point and configuration. |
| Battery runtime | Ideal Ah/A estimate with an optional explicitly entered usable-capacity percentage. Does not apply a hidden derating factor. No capacity test, standby-compliance or battery-health conclusion is generated. |

`calculateEvidenceBoundary` delegates to the existing `localisePath` logic. Imported address order cannot become a physical cable sequence. Existing provenance, comparison and superseded-evidence checks remain in force.

`recordDiagnosticCalculation` saves a recomputed result, original unit-bearing inputs, assumptions and warnings as an append-only `calculation` event and transcript entry. Its result is explicitly `source: derived`, `executionState: calculated`. It does not complete the current question and cannot serve as performed evidence to confirm a cause. Repeated saves with the same operation ID are idempotent; conflicting reuse is rejected.

## Fresh source retrieval and verification

All six PDFs below were downloaded successfully and their relevant text checked. Texecom p32 and Paxton APN-1086 p1 drawings were also rendered and visually inspected. Retrieval metadata, complete PDF SHA-256 values and extracted-page text hashes are retained in `manufacturer-source-checks.json`. Full manufacturer PDFs are not copied into this source change: the existing archive/download system remains responsible for saving a manual on an engineer's device.

| Document | Checked locator | Supported reference and limit |
| --- | --- | --- |
| C-TEC **DFU7004010 Rev 4, 01/11/21** | PDF/printed pp7–8 | The CFP Standard detector circuit uses an EOL capacitor; the conventional sounder circuit uses a 6k8 EOL resistor. These are different circuits. The reference excludes CFP AlarmSense. |
| Texecom **INS176-15** | PDF/printed pp32,60 | The one-NC-device EOL drawing has a 2k2 series EOL and 4k7 across the alarm contact. With tamper closed, ideal secure/alarm network totals are 2.2kΩ/6.9kΩ. Page60 lists other wiring configurations separately. These totals are not firmware bands. The catalogue's alternate manufacturer-hosted URL was downloaded and has the identical SHA-256. |
| Paxton **APN-1061 v1.0.1** | PDF/printed pp1–2 | The specified RS485 data-pair test is described with converter power and PC connections removed, experienced installer, correct termination/topology and cable-specific bands (CAT5 60–87Ω; CR8723/Belden 60–76Ω). These are not universal RS485 limits. Existing isolation/safety gates still apply. |
| Paxton **APN-1086 v1.0.3** | PDF/printed p1 | The relay is voltage-free; the illustrated independent lock supply switches 0V through NO/NC and COM. Actual wiring and the separate lock requirements must be established. A click alone proves neither contact operation nor lock drive or physical release. |
| Honeywell **Galaxy Dimension IE1-0063 Rev1.0** | PDF pp25–26, printed 2-13/2-14; document control PDF p306 | Tables2-7/2-8 distinguish double-balanced/EOL profiles. For the independently confirmed Option09 profile, the brief's synthetic 996Ω/1967Ω readings sit inside the listed Normal/Open states. The word Open here does not establish a discontinuous conductor. Exact hardware, zone override and firmware applicability remain necessary. Retrieved from a distributor mirror; not described as a fresh manufacturer-host download. |
| Advanced **680-165 Rev05** | §3.3.6 PDF/printed p48; applicability p1; document control p74 | Loop Meter documents input/output voltage and loading, plus diagnostic communication pulse heights. Cover applicability starts at software5000-050-04. No universal loop voltage, direction-to-location mapping or menu keystrokes are created. Retrieved from a distributor mirror; the PDF SHA-256 matches the existing catalogue record. |

## Runtime source contract

`public/app/diagnostic-verified-sources.mjs` binds checked passages to the **exact PDF bytes attached to the job**, using `contentHash`, `hash` or `sha256`. Matching by title or catalogue ID alone cannot establish this evidence. Results retain document ID, revision, hash, actual PDF page, printed page, section, excerpt, retrieval provenance and source-pack version.

Installed model confirmation and the passage's relevant configuration fields are checked independently. Incomplete or conflicting scope returns `scope-unconfirmed`, with the missing fields and conflicts. A checked document fact can be shown while the installed applicability remains unresolved.

This is a document-content and diagram check, not an asserted competent-person operational approval or site authorisation. `actionEnabled` and `comparatorEnabled` remain false. The existing thirteen draft field profiles are unchanged and disabled. Actual test eligibility still comes from the established field engine and current visit's explicit safety/prerequisite evidence. Snapshotting a source result preserves the historical document and uncertainty if packs are updated later.

## Focused verification

`node --test tests/diagnostic-calculators.test.mjs tests/diagnostic-verified-sources.test.mjs`: **15 passed** after calculation-log integration. Cases cover units and zero, non-numeric readings, unknown/unperformed tests, differing conditions, per-port and total PoE budgets, resistor/firmware distinctions, battery assumptions, exact document binding, family/model ambiguity, CFP circuit separation, Texecom modes, Galaxy input states, immutable historical source snapshots and derived calculations never becoming performed tests or cause-confirmation evidence.

`node --test tests/diagnostic-chat-controller.test.mjs`: **4 passed** after controller review fixes. The real controller is exercised with a small DOM/storage harness: failed saves stay visible and block flushing, retry retains a single input, rapid writes preserve the newest snapshot, a later successful write clears earlier failure status, and legacy fields survive the first conversation save. Phone layout and real browser storage belong to the separate browser acceptance checks.

Release-wide regression, browser/offline validation, build and publication outcomes are recorded by the release owner. This source note does not pre-claim them.

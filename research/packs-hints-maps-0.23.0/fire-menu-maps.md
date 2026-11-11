# Four fire-panel menu and control maps

This release exposes the existing reviewed fire-engine references through the shared searchable menu atlas. It adds **846 entries in four maps**, bringing the atlas to **13 families / 9,825 entries** when combined with the nine unchanged intruder maps. Counts include reference groupings, settings, source-only entries and authored practice tasks; they do not represent 846 new simulated screens.

| Family | Entries | Reviewed reference rows | Guided practice tasks | Source documents |
| --- | ---: | ---: | ---: | ---: |
| Gent Vigilon 4/6 loop | 456 | 345, merged into 344 distinct full paths | 20 | 4 |
| Gent Nano V3.xx | 140 | 76 distinct full paths | 28 | 3 |
| C-TEC CFP Standard | 61 | Physical controls and all 9 SW8 positions | 15 | 2 |
| Kentec Sigma CP | 189 | Physical controls and all 103 configuration codes | 13 | 2 |

The 11 source documents are the already-reviewed sources attached to these engines. This work reuses their pinned identities, editions, reviewed routes and restrictions; it does not claim a fresh full-page review of every source PDF. The independent review checked the exact Gent commissioning PDF hash and the printed/PDF numbering for appendix pages 98–106. The [audit](fire-menu-map-audit.json) records input hashes and per-map counts. The [intruder baseline](intruder-map-baseline.json) protects all nine previous maps byte-for-byte against commit `e8691d604f07fc882a803892d4c6ca7f8722a869`.

## Hierarchy and evidence

The generator preserves every Gent source-reference row and its page evidence. Identical complete paths merge their original identifiers, notes and references. The only duplicate complete path in Vigilon is Set Up → Modify → Label → MCP; it becomes one indexed entry without discarding either source row. Intermediate headings group the recorded paths and explicitly do not assert an extra physical screen or an exact key sequence.

Vigilon keeps the classic VIG1-24/VIG1-72 and July 2015 boundary, including the issue-number ambiguity, full-size versus Compact/VA restrictions, source conflicts and optional equipment limits. Nano keeps its V3.xx operator source apart from V2.xx commissioning references. The two supported version-information routes under Engineering use the V3 operator source; older engineering operations remain reference-only.

CFP and Sigma are labelled **control/function maps**. CFP has no invented LCD menus or numeric shortcut addresses. Its SW8 function order, programming/diagnostic distinction, VR1 period and source warnings are retained. Sigma preserves string codes such as `00`, `2A`, `d1`, `db` and `Ad`. Its 103 configuration entries remain **48 supported effects / 55 reference-only**, with minimum-firmware and hardware conditions intact. The unresolved MODE cycle, Write Enable direction, unset sequence and reset-assist boundaries remain visible.

The earlier CFP source metadata contained an obsolete operator-only scope sentence. The generated map presents the already-reviewed Standard Rev 1 engineering scope instead, without changing the original source dataset or claiming newer hardware compatibility.

## Routes and hints

Each new map records its explicit engine route. A Gent/Nano menu entry gets a highlighted-key link only when the source row says implemented, its explicit `nodeId` resolves to the correct engine, and that runtime node has `confidence: verified` and is not reference-only. Conditional and conflicting rows do not acquire routes from a similar label. Unsupported reference nodes stay references even when the runtime contains a placeholder with the same identifier.

Conventional configuration entries have no invented direct-route links. Existing lessons are indexed separately as FINDR practice tasks, with explicit same-engine coach routes. Five Sigma call-outs link to their existing lessons and retain the conventional whole-zone and fictional-work boundaries. Opening a lesson loads its labelled fictional scenario; a hint does not execute a physical command on behalf of the learner.

Source links use actual one-based PDF pages. Explicit printed-page labels are retained; the Nano commissioning appendix is PDF 85 / printed 86. Gent commissioning PDF 98–106 matches its printed footers. Unknown printed labels remain **not recorded**, with no guessed offset.

## Reproduction and checks

Run `node scripts/build-fire-menu-maps.mjs` to regenerate the four JSON maps and source-projection audit. Run with `--check` to verify deterministic output without rewriting it. `tests/fire-menu-maps.test.mjs` validates source identities/page bounds, complete reference retention, exact configuration-code statuses, all SW8 positions, real lesson routes, old/new source boundaries, page-label rules and preservation of the original intruder maps. Independent runtime-route guards are tested separately.

No existing emulator engine logic, original map data, source manuals, saved sessions or PDF records are changed by this projection. Browser usability, the shared hints integration and publication are validated by the release owner separately.

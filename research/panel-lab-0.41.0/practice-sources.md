# Panel Lab practice coverage

Prepared 26 November 2026 for FINDR 0.41.0.

## Generic matrix challenges

Seven authored exercises use FINDR’s generic cause-and-effect engine: either cause, selective output groups, coincidence, cancelled/restarted delays, latching and reset, staged outputs, and a combined board. Each takes roughly two to five minutes. They are not manufacturer configuration files, approved evacuation strategies or certificates of competence.

The grader runs independent input/time/reset sequences against the learner’s matrix. It reports individual outcomes and does not modify the saved board. Opening an exercise or pressing a button cannot mark a blank matrix complete. Original test-point IDs must remain; labels can be changed. Each check starts from a fresh simulated board, so it cannot inherit another job’s active causes.

## Manufacturer lessons

The new practice library links to the existing coached emulators. Their own engines check the learner’s steps and keep their own progress. Panel Lab does not claim completion from opening a link.

| Panel | Lessons | Existing source evidence |
| --- | --- | --- |
| C-TEC CFP Standard | Level-three entry, output/zone delays, resound selection | `c-tec-cfp-standard.json`, installation/maintenance manual DFU7004010 Rev 1, cited PDF pages 15–17 according to the existing lesson |
| Kentec Sigma CP | Level-three review, detector delay with Ad and restoration | `kentec-sigma-cp.json`, Man-1078 Issue 25 (April 2024), existing lesson references PDF pages 15–19 and 23 |
| C-TEC XFP | Installer access/NVM, new detector acceptance, input-zone assignment | `xfp.json`, DFU2200510 Rev 2 (32-zone) and DFU1200510 Rev 3 (16-zone), existing lesson references PDF pages 18 and 21–23 |
| Fike TWINFLEXpro² | Installer access and programming protection, zone output delay | `twinflex.json`, 26-0959 Rev 18 (October 2020; V3.00+), existing lesson references PDF pages 24, 33, 42–44 and 56 |

Each lesson preserves its exact existing emulator route, source-map node, manual catalogue record ID, document edition, PDF position and printed-page label. Sources are passed to the host’s saved-manual opening flow. A manual missing locally still needs downloading before its PDF is available offline. No menu code, access code, physical wiring instruction or compatibility relationship is newly invented by this module.

Source files are in `public/app/data/menu-maps/`. The test suite verifies every cited page against the existing reviewed node and document metadata and verifies the document ID exists in the manual catalogue. Existing source evidence is reused; this update did not newly re-extract the manufacturer PDFs or verify physical hardware/firmware.

## Checks actually run

`node --test tests/panel-lab-practice.test.mjs` — 16 tests passed. Coverage includes solved and unsolved boards, missing connections, incorrect AND/OR logic, cross-group leakage, delay boundaries, missing/unwanted latches, incorrect combined relationships, missing/extra test points, invalid settings, independent starters and all manufacturer source/route mappings.

The root release verification covers integration, storage, mobile layout and offline loading separately. These isolated logic/source checks do not establish browser behaviour, real panel behaviour or installation compliance.

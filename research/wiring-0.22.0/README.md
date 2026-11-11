# FINDR wiring pictures — web 0.22.0

Reviewed 2 November 2026 against web 0.21.0, commit `350e887b0ce5bb3706a7a3660f0fe531d1175d9f`.

## Delivered coverage

The release contains **177 original source-page pictures from 105 manual records**, across **28 brands**, with explicit links to **40 panel families and 60 device families**. A source-only picture can remain searchable without an exact panel/device association. Counts describe reviewed pages and catalogue families, not all variants or all 12,377 archive records.

| Discipline | Pictures |
| --- | ---: |
| Fire | 121 |
| Intruder | 32 |
| Access control | 7 |
| CCTV | 6 |
| Warden call | 11 |

Images total **31,486,428 bytes**. They are complete manual pages rendered to WebP, with dense pages rendered at higher resolution. One sideways Tynetec sheet is rotated for readability. Legends, terminal labels, resistors, alternative configurations and adjacent warnings remain visible. No wiring was generated or redrawn. Wiring diagrams, terminal layouts and connection examples are separately identified.

## Source evidence

Each entry records the existing manual ID, original URL, SHA256 of the reviewed PDF, actual PDF page, printed page when available, edition, applicability, image hash/dimensions and review date. Sources were retrieved and pages visually inspected; a matching title alone is insufficient. Pinned catalogue hashes must match. Unpinned archive sources receive the hash of the bytes actually reviewed.

- [Fire-panel entries](fire-panels-entries.json) and [audit](fire-panels-audit.json): 66 pictures / 32 manual records.
- [Fire-device entries](fire-devices-entries.json), [audit](fire-devices-audit.json) and [notes](fire-devices-notes.md): 55 pictures / 48 manual records.
- [Intruder, access, CCTV and warden entries](security-entries.json) and [audit](security-audit.json): 56 pictures / 25 manual records.
- [Target-link review](target-link-review.json): independent evidence for 17 new explicit target bindings, plus the rejected generic CHQ-ARI link from a CHQ-ARI(CLR) source.
- [Merge audit](merge-audit.json), [baseline hashes](baseline-data-hashes.json) and [entry contract](entry-contract.json).

Model boundaries remain visible. Examples include distinct Sigma K/T wiring, separate Protec conventional/addressable base drawings, the legacy S-Quad manual's unsupported 34703 MCP warning, Fike Twinflex SRP exclusions and Nittan isolator compatibility limits. A family manual remains labelled as a family source. Shared manufacturers, protocols or similar appearance do not establish a target link.

Two repeater termination pages are withheld: Sigma CP-R Man-1093 page 8 and HydroSense CP-R Man-1132 page 8 conflict over first versus last/only J2 termination. Clear supply/relay pages remain included. Other unreadable, unavailable, mismatched or text-only candidates and their reasons are recorded in the batch audits. The archive's existing Gent combined-manual title differs from the actual commissioning cover; the source edition and page scope are recorded without rewriting the catalogue.

## App and offline behaviour

**Manuals → Wiring diagrams** opens a picture gallery with search and collapsible filters. The ordinary manual lists also offer a wiring-only filter. Exact curated target links appear within existing device and panel views. Fit, 100% and 150% modes support portrait viewing and panning; the source page is available without first downloading its full PDF.

Pictures and their index are included in the existing verified app cache. Wait for **App ready offline** before relying on them offline. Full PDFs retain their independent saved/download status and use the existing local IndexedDB store and download pipeline. Missing or rejected full-PDF downloads leave the picture and gallery intact.

Page navigation verifies the actual saved PDF Blob against the reviewed source SHA256, then renders that same Blob. Another edition is labelled explicitly and can open only from its beginning through this action. Unknown hashes, out-of-range pages and changing/closed viewers do not receive a guessed source-page jump. This does not replace an engineer's check of the installed model, revision and applicable source instructions.

No database upgrade or rewrite of existing documents, sessions or imports is performed. Eight catalogue, pack and delivery-data files remain byte-identical to the baseline. Existing emulator and fault-finding flows are retained.

## Reproduction

Run `node scripts/merge-wiring.mjs --check --strict-assets` to check source bindings, original catalogue hashes, image bytes/dimensions, duplicates, asset limits and unreferenced images. After changing the reviewed batch entries, run `node scripts/merge-wiring.mjs` and regenerate the app manifest with `python scripts/prepare-app.py`. The merge compares parsed index contents, so preparation may compact the shipped JSON without invalidating the source review.

See [release validation](validation.md) for tests, browser evidence and publication limits. Web 0.22.0 does not rebuild the signed Android APK, which remains 0.14.1.

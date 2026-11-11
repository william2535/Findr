# Panel download format audit — web 0.16.0

Inspected the existing app, scripts, examples, research, CSV/TSV files and tests before choosing support. No representative real addressable fire-panel configuration export, documented native export grammar or existing native backup parser was found.

- `research/expansion-0.9.0/risco-controls.tsv` is menu page/address/title research, not a programmed-device schedule.
- `research/device-packs-0.14.0/importer-check.json` audits catalogue expansion.
- `scripts/add-device-images.py`, `add-panel-images.py` and `merge-panel-expansion.py` import catalogue/image manifests, not panel downloads.
- Existing `public/app/db.mjs` stores PDF metadata and bytes atomically in IndexedDB. `devices.json` links device families via `record_ids` into `catalogue.json` and `device-documents.json`. These remain the sources for device evidence and offline manuals.

## Supported in this release

UTF-8 comma-separated CSV and tab-separated TSV/TXT schedules, with a header row and explicit column mapping. UTF-8 BOM, CRLF/LF, quoted fields, doubled quote escaping, embedded line breaks and empty optional fields are supported. Separate nonempty loop and address fields are required in every device row. Limits: 5 MiB, 10,000 rows, 100 columns. Malformed files and ambiguous mappings fail before persistence. Other encodings, semicolon files, Excel workbooks, native manufacturer backups, Uptick and Zone Sketch are outside this release.

Original strings, headers and row cells are retained; numeric equivalence is used only during lookup. Panel/node/loop/address/sub-address identify candidate rows, not installed-device verification or physical cable order. Duplicate rows are retained as explicit candidates; imports replace snapshots rather than append devices.

## Synthetic examples

All fixtures in `tests/fixtures/panel-import/` are labelled synthetic, not manufacturer exports. Downloadable example copies are under `public/app/examples/`.

The fixture uses panels A and B, both with loops 01/02 containing address 037. Panel A adds node02 sub-addresses01/02 at loop01/address037. Panel A node01 loop01 address037 has Gent `S4-720-ST-VO`; its exact listed part code links to `gent-squad-legacy-family` and `gent-0ba4cfc5de7c`, explicitly a family/range installation reference. Generic optical and S-Quad rows do not receive that document as a verified model match.

Device `source_pdf_page` is image provenance, not a recommended wiring/fault page. Document `pages` is total length. Neither becomes an invented page citation. Actual document title, model scope and recorded revision are shown; missing revision remains unknown.

## Next manufacturer sample

An anonymised Gent Vigilon programming-software device-list export would be useful next: include the original file, panel model, firmware and programming-software versions, export steps, and a few matching display messages. Retain node/loop/address/sub-address fields, original headers, complete part-code suffixes and date fields; replace site/location names. A native backup is useful only with its documented format or a matching readable export for verification.

# Synthetic diagnostic conversation fixtures

Every PDF in this directory is generated QA material, **not manufacturer documentation**. Real manufacturer/model names exercise identification suggestions only. These documents establish no verified equipment procedure, model limit, wiring profile or permission to test equipment.

Rebuild using `python tests/fixtures/diagnostic025/generate.py` (ReportLab and Pillow). `manifest.json` records exact bytes and SHA-256.

- `synthetic-premier-elite-text.pdf`: three selectable-text pages, labelled intruder panel, exact variant, document type and synthetic revision; read-only fault records and measurement context.
- `synthetic-premier-elite-scan.pdf`: two image-only pages; no embedded searchable text. Used as a previously unseen manual after the browser goes offline.
- `synthetic-elmdene-component.pdf` / `synthetic-elmdene-component-scan.pdf`: a second component manual that must join the same visit without replacing its current question or evidence.
- `synthetic-reference-injection.pdf`: intentionally hostile quoted reference text. It must remain inert and never control questions, tests, exports or scripts.
- `synthetic-large-cancellation.pdf`: 36 text pages for interrupted processing checks.
- `synthetic-unreadable.pdf`: valid PDF with abstract bars and no usable equipment text; must not be accepted as sufficient evidence for diagnosis.
- `synthetic-malformed.pdf`: deliberately truncated file; a failed import must leave saved manuals and visits intact.

Synthetic fixtures verify software behaviour. They do not verify an actual manufacturer export, manual or physical equipment procedure.

# MxPro Quick Questions source review

The reviewed procedure pack is [`public/app/data/quick-procedures.json`](../../public/app/data/quick-procedures.json). It contains source-linked summaries for two real manufacturer-authored user guides already in Manual Archives. The PDFs were downloaded and their SHA-256 hashes matched the existing catalogue on 10 November 2026. Full PDF files are not redistributed in this research directory.

| Manual | Catalogue ID | Manufacturer document | Walk-test section and PDF pages |
| --- | --- | --- | --- |
| Advanced MxPro4 — User guide | `advanced-8f3ba6ecfc7f` | 680-015, revision 10 | 3.10.1 Test – Zones, 31–32 |
| Advanced MxPro5 — User guide | `advanced-0254975c10bd` | 680-166, revision 04 | 3.13.1 Test – Zones, 33–34 |

URLs, exact hashes, byte counts, coverage and other supporting pages are recorded in [`source-audit.json`](source-audit.json). Printed page numbers match PDF positions for these reviewed pages. These copies are hosted by the catalogue’s existing third-party source. Their original manufacturer document numbers and revisions were read from the PDFs; current manufacturer revision status was not independently established.

Both documents establish the same walk-test route: authorised Level 2 access, TEST → ZONES, sounder choice, zone selection, device activation, automatic reset when the test stimulus clears, then Esc → FINISHED TEST. Other menu branches differ between the panels, but those differences do not change this route. Sounder operation is subject to the panel’s commissioned programming. Selecting KEEP ZONES IN TEST leaves testing active; leaving the menu alone must not be described as restoration.

No single reviewed document covers both families. A question saying only “MxPro” can be answered without an artificial model question by clearly stating the selected guide’s scope. The answer must say which family it covers, and must not treat download consent as confirmation of the installed panel. An explicit MxPro5 question must not receive an MxPro4-only answer, or vice versa. These guides do not justify claiming that walk test suppresses every external output or remote signalling path.

The answer pack contains short source anchors for every procedural claim. Runtime use must require the actual downloaded content hash and readable matching page text, not merely a matching filename or catalogue ID. The source audit checked every anchor against `pdftotext` extraction of the real files. A second check used FINDR’s actual `pdf-runtime.mjs` with PDF.js 5.6.205 in Linux Chromium 154.0.8037.57: all 49 references per document matched, across seven MxPro4 pages and eight MxPro5 pages. Results are in [`source-browser-anchors.json`](source-browser-anchors.json). This is a source-reader check, not the normal-menu integration journey or a physical iPhone test.

PDF.js splits the displayed label WITHOUT SOUNDERS into `WITHOUT SOUNDE RS` in both PDFs. The anchor uses the adjacent intact sentence describing the sounder choice instead; matching remains strict, without fuzzy recovery of numerical values or procedures. Updated, unmatched or unreadable documents must use ordinary retrieval or explain the missing evidence rather than apply this pack unconditionally.

To reproduce the source audit with existing downloads:

```sh
python3 research/mxpro-questions-0.29.0/source-audit.py --cache /tmp/mxpro029
```

To fetch missing copies from the recorded URLs before checking:

```sh
python3 research/mxpro-questions-0.29.0/source-audit.py --cache /tmp/findr-mxpro-review --download
```

The audit requires Python 3 and Poppler’s `pdfinfo` / `pdftotext`. It validates real file hashes, page counts and every page quotation, including follow-ups. It does not use synthetic PDFs or assert browser compatibility.

# Gent Vigilon Zone Test source review — 0.31.0

The reported Quick Questions example was “Putting a gent vigilon on walk test”. The ordinary operating manual is not sufficient: the 2009 operating instructions describe a weekly call-point test on page 11, not the engineering Zone Test menu. FINDR now has a reviewed Zone Test answer tied to the applicable commissioning manual's actual bytes and readable pages.

## Source and scope

- Gent by Honeywell, *Generic Commissioning Instructions for Vigilon 4/6 loop & Compact range of fire panels & network nodes*, 4188-856, issue 7, July 2015.
- [Manufacturer-authored document, archive mirror](https://docs.facpmanuals.com/manuals/Honeywell_Gent/vigilon_and_vigilon_compact-installation-2015.pdf).
- Existing catalogue ID `facp-7538be76-f958-46e4-99f6-c718601bb349`. The catalogue labels it “Installation (2015, source-listed)”; the PDF cover establishes the commissioning title.
- SHA-256 `a08baba300272577485f0dc29dfe0addb65815dca59036369256419d30366998`; 10,265,001 bytes; 162 PDF pages. Downloaded again on 10 November 2026 and matched the existing catalogue hash.
- The answer requires selection of **EN Vigilon (MCC/MCB V4.53 or higher)**. Its scope is the documented EN 4/6-loop / Compact menu map. This is not a universal Vigilon, Nano, Plus, older-firmware, network-node or BS Commission-mode instruction.

## Reviewed evidence

PDF positions and printed page numbers agree on the cited pages:

| Page | Evidence |
| --- | --- |
| 1 | Cover title, product range and document footer. |
| 53 | Engineer access is Level 3, distinct from customer access. No live passwords or credentials are supplied. |
| 81 | Zone Test applies to EN 4/6-loop / Compact / Compact VA; preparation, site consent, informing occupants and alarm receiving centre, plant isolation, default five-second alarm followed by automatic silence/reset, inhibited functions, unaffected zones and explicit Test Off restoration. BS Commission mode is a separate procedure. |
| 105 | EN MCC/MCB V4.53-or-higher Test/Eng menu map. The drawn edges show Test → Test → On/Off, then the zone-number stage and Enter. |

Pages 81 and 105 were rendered and visually inspected again for this release. See [page 81](zone-test-page81.png) and [page 105](menu-map-page105.png). Diagram order was checked from its drawn connections, not inferred from PDF text order alone. “At the Zone entry” names the parameter stage after On/Off; it does not invent a separate Zone-button press. The earlier manufacturer training corroboration and the independent review agreed on this wording.

The page 81 prose omits the second Test and places Zone before On/Off. The page 105 diagram shows two Test selections and the zone-entry stage after On/Off. FINDR follows the diagram for this firmware scope and discloses the disagreement in the answer. This retains the bounded interpretation already documented in the [0.12.1 emulator source review](../vigilon-walktest-0.12.1/README.md), which also checked an earlier manufacturer map and manufacturer training presentation. It does not assert a manufacturer erratum or physical-panel validation. A panel whose options differ needs its own version checked before proceeding.

The reviewed answer covers entering Zone Test, testing devices under the documented default behaviour and explicitly switching it Off. It records the documented system effects and prerequisites. It does not treat ordinary operator weekly testing, a reset, closing the menu or the BS Commission branch as equivalent.

## Runtime verification and reproduction

The recipe in `public/app/data/quick-procedures.json` requires both the exact SHA-256 and every cited source quotation on its successfully read page. Changed bytes, unreadable/missing pages or an unsupported variant cannot release the reviewed procedure.

`source-audit.py` verifies the hash, page count and all quotations against a fresh Poppler extraction:

```sh
python research/gent-walk-0.31.0/source-audit.py --cache /tmp/gent-source-audit --download
```

[Browser source audit](browser-source-audit.json) checks the same 33 unique anchors using FINDR's actual bundled PDF.js 5.6.205 reader, and releases five reviewed steps with pages 81, 105 and 53. With the app served on `127.0.0.1:8088`, run `node research/gent-walk-0.31.0/source-browser-audit.cjs /path/to/verified-commissioning.pdf` to reproduce it (workspace Chromium/Playwright required). Browser conversation checks, missing-evidence handling and release checks are recorded separately under `research/questions-0.31.0/`. These source checks are not a claim of publication, physical hardware testing or applicability to unlisted firmware.

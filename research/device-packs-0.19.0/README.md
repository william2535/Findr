# Bosch and Risco device picture packs — 0.19.0

Added **four pictured device families in two new packs**, taking the device library from 146 families / 16 packs to **150 families / 18 packs**. The batch links four existing archive installation documents. It adds no new archive record, supplementary document, URL or download allowlist entry.

| Card | Exact documented part codes | Linked archive document | Inspected edition |
| --- | --- | --- | --- |
| Bosch Blue Line Gen2 pet-friendly TriTech | ISC-BDL2-WP6G, ISC-BDL2-WP12G, ISC-BDL2-WP12H | `bosch-0ba92138ab30` | F.01U.140.810 revision 10, December 2017 |
| Bosch Blue Line Gen2 TriTech W12 | ISC-BDL2-W12G, ISC-BDL2-W12H | `bosch-c221490fad45` | F.01U.140.813 revision 10, December 2017 |
| Risco BWare | RK515DTGL | `risco-00a6655953a1` | 5IN1749, January 2012 |
| Risco iWISE DT AM Grade 3 family | RK815DTG3, RK815DTG3A, RK825DTG3, RK825DTG3A | `risco-e8aee4e7a650` | 5IN2634 D, August 2022 |

Six source PDFs were retrieved on 2 November 2026 with HTTP 200 and exact SHA-256, byte-count and page-count matches to the retained archive snapshot. [source-audit.json](source-audit.json) records all URLs, hashes, page counts, model scopes and extracted image object identifiers. The original PDFs remain research inputs outside the deployable app; the existing PDF download system continues to retrieve and validate them when requested.

## Source pictures and limits

The two Bosch cards deliberately share the representative Blue Line Gen2 family photograph extracted from PDF page 1, image object 52, of existing datasheet `bosch-be9d38fc89d0`. The retrieved document is the Radionix/Bosch family datasheet V48 dated 23 July 2026. The picture does not distinguish WP/non-WP, range or suffix. Both cards say so and require the complete device label. The applicable installation references are the separate 2017 sheets, not a guessed transfer from the current datasheet ordering list.

The 2019 quick guide `bosch-3d8651b2effe` was also retrieved and inspected. It lists GE/HE variants and does not list the earlier H variant. It is **not linked** to these G/H cards. Codes were not shortened to create a false match. GE/HE, -CHI and PIR-only BPR variants remain outside this batch.

The Risco photographs were extracted as original image objects from the actual instruction sheets: BWare PDF page 1/object 65, and iWISE PDF page 1/object 77. These manufacturer originals are hosted by distributors; the credits say so. The iWISE sheet explicitly names the A-suffixed variants even though the archive's abbreviated model list omits them. All four complete codes are retained. The sheet's Grade 2 qualification when installed with a swivel is visible in the card's applicability note; a product photograph never establishes the grade of a completed installation.

No hardware pictures were generated or reconstructed. The original photographic objects were converted to RGB WebP and proportionally resized for local/offline display. Image hashes, dimensions and credits are recorded. The images were inspected both in their PDF page context and separately after extraction.

## Reproduction and verification

Download the six PDFs at the exact URLs in `source-audit.json` into a local research folder as `<record_id>.pdf`. Then run:

```sh
python scripts/add-device-packs-0.19.0.py /path/to/research-pdfs
python scripts/add-device-packs-0.19.0.py /path/to/research-pdfs --apply
node --test tests/device-expansion-0.19.test.mjs tests/device-catalog.test.mjs
```

The first command only checks inputs. The applying command verifies archive hashes, extracts the inspected source objects, preserves every earlier device/pack and writes only the two device indexes, four new pictures and this batch's source audit. Repeating it is idempotent; an existing conflicting row fails rather than replacing an identity silently. Root release preparation must regenerate the service-worker manifest after all application data is final.

The focused tests cover full suffixes, the correct installation link, later-edition exclusion, original image attribution/hashes, family-picture disclosures and the existing saved-PDF pack counts. The release owner's final regression/browser results and publication status are recorded separately. Software checks and historical PDFs do not certify a current installation or promise that these editions are the latest manufacturer releases.

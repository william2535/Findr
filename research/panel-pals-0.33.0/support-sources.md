# Manual-first UK support contacts

The Give up screen searches only readable pages of the current pal’s selected, locally processed manuals. It does not use a language model to invent a telephone number and does not search another pal’s library. The existing manual-library loader checks the saved PDF, content hash and analysis before returning pages. The support resolver also checks selected IDs and recorded expected hashes.

Contacts need a support/contact/telephone label and UK evidence: either an international `+44` / `0044` prefix, or an explicit UK country marker near a domestic number. Technical support, customer support and general contact remain distinct. Fax and sales/order labels are excluded. The original printed number, exact PDF page, manual identity/hash, supporting excerpt and known edition accompany each result.

A saved manual is historical evidence. Results say **listed in the saved manual**, never that the line was recently verified or is still staffed. OCR-derived digits require the engineer to inspect the PDF page; no automatic dial link is emitted for them. Ambiguous manufacturers and competing numbers in different pages/editions stay explicit. Missing or unreadable contact information produces an honest missing-number message while call preparation remains available. No phone calls were made during verification.

## Actual manufacturer document check

Checked on 11 November 2026 against the official Advanced PDF already listed in FINDR’s catalogue:

- Catalogue ID: `advanced-c1f080ef94b1`.
- Document: **Axis EN 5000V — Installation, programming and commissioning manual**, document **680-165V**, revision **07**.
- [Official manufacturer PDF](https://www.advancedco.com/wp-content/uploads/680-165V-07-Axis-EN-Product-Manual.pdf).
- Download: 2,885,501 bytes; SHA-256 `ea38daebe63652fb5c30e490be892ebe1df5bf87f29e9ed9d7f35d04ca855238`, matching the catalogue’s existing hash.
- 84 PDF pages. PDF page **84** prints Advanced Electronics’ telephone number as **+44 (0) 845 894 7000**. It is labelled **Tel**, not technical support. The resolver therefore returns **General contact** and warns that the number may have changed since publication.
- This check downloaded the original PDF to `/tmp`, extracted text using `pdftotext -layout`, and passed its page text through FINDR’s existing `buildManualAnalysis` plus the new resolver. It establishes the real-document parser result, not a current live telephone verification. The full downloaded manual is excluded from the source backup.
- Regression coverage uses only a short factual footer excerpt, not a redistributed copy of the PDF. The company name “Advanced Electronics” prevents the product name “Axis EN” from being mistaken for Axis Communications’ contact.

The [official Honeywell/Gent Vigilon operating manual](https://prod-edam.honeywell.com/content/dam/honeywell-edam/hbt/en-us/documents/manuals-and-guides/repair-and-maintenance-guides/gent-112425/hon-ba-fire-vigop.pdf?download=false), catalogue `gent-f03fe5ba8e30`, was also fetched (773,363 bytes; SHA-256 `59691d4e1533d4da0d354cab006782b0a4e79dbc8548e81524c63f339a6522ae`). That edition, Issue 1_1/99, did not supply a labelled support contact in the extracted text. No number was supplied from memory to fill that gap. The official C-TEC download endpoint returned HTTP 403 in this environment, so no real C-TEC number is claimed verified by this change.

## Automated coverage and limits

`tests/panel-pal-support.test.mjs` covers domestic/international formatting; source page/hash fidelity; technical/customer/general distinctions; sales/fax exclusion; unlabelled values and electrical specifications; OCR review; unreadable pages; selected-document and edition isolation; conflicting brands; misleading component manufacturer names; embedded prompt text; local storage failures; and conflicting numbers across editions. Synthetic contacts use the fictional `01632 960xxx` range and must never be dialled.

The browser acceptance fixture uses a clearly labelled synthetic PDF and the actual local PDF-processing pipeline. It demonstrates offline retrieval and opening the saved supporting page without publishing a real customer document. Not every possible manual layout, telephone format or OCR result can be read reliably. A contact table with unclear text order, a missing UK marker, an unreadable page or an ambiguous manufacturer may require opening the original PDF or adding a clearer contact page. No external contact directory is bundled in this release.

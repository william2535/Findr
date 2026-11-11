# FINDR panel pack batch B — 30 October 2026

Ready for the existing incremental `scripts/add-panel-images.py` importer.

## Contents

- 31 new pictured families across four previously absent brands: Potter 16, Gamewell FCI 12, Radionics 2 and Napco 1.
- 77 distinct exact archive record IDs. All exist in the current FINDR catalogue and have the fire category.
- Real manufacturer product photographs, manufacturer-authored datasheet photographs, and two clearly labelled Radionics panel-control drawings. No generated or generic stand-in pictures.
- `panels.json` is the import manifest; `images/` contains its input assets. The importer will compress those assets and assign final image hashes.
- `audit.json` records exact source document URLs, verified PDF byte hashes, sizes, page counts, illustration pages and crop bounds. Research PDF files in `research/` are acquisition inputs, not app assets.

## Review decisions

Visually similar capacity variants are grouped where appropriate: IPA-60/100, AFC-50/100, PFC-6030/6075, PFC-6200/6800, Flex 4/8 and Flex 402/404. Each card explicitly identifies which model is pictured. Releasing and voice products remain distinct because their use and model identities differ.

Every addition is unprioritised for UK-first browsing. Applicability text identifies North American/historical documentation and requires the installed model, supply, protocol and revision to match. Current Potter photos do not imply that older archive editions describe every later LCD revision.

Napco is the original FireLink 32-point panel, linked to the archive's 2018 getting-started reference. The card does not claim to include a complete current installation manual or cover FireLink XL.

Radionics D7024 uses the built-in keypad drawing on PDF page 11, expressly distinguished from the D7033 remote keypad. D9024/D10024 uses the labelled D10024 front-panel drawing on PDF page 4; the card states the D9024 indication differences.

FC-72 was rejected because its available datasheet photograph was only 98 by 91 pixels. No card or placeholder was added for it.

## Validation

All 31 IDs are new relative to the 549-family source catalogue, all referenced images decode, all IDs are unique, and all 77 record IDs resolve to the exact archive. One manufacturer-authored source PDF per family was downloaded and verified as a readable PDF with header, EOF marker, SHA-256, page count and matching model information. All final images were visually inspected in the two `research/final-contact-*.jpg` sheets. Embedded images that were stored upside down were oriented using the PDF placement matrix; extraction excludes neighbouring text and certification marks.

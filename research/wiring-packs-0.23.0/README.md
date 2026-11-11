# Branded wiring families — 0.23.0

The existing 177 reviewed source-page pictures are organised into **28 brand collections / 79 family packs**. Every picture has exactly one explicit family membership. The source image, source PDF hash/page, scope, linked model IDs and existing document IDs are unchanged.

The new route is `#downloads/wiring-packs`, with brand and family drill-down. Kentec Sigma CP is `#downloads/wiring-packs/kentec/kentec-sigma-cp`. Search accepts brand, family, model or wiring terms. Returning to the same pack retains its picture query, and returning to the previous wiring gallery through its link retains the earlier filters. Pack browsing search remains separate from ordinary manual search.

Colour accents coordinate the cards, family headings and source-page collages. These are FINDR browsing colours rather than a manufacturer endorsement. Brand names and family labels remain visible, so colour is never the only identifier. Dark text on each brand strip meets WCAG AA text contrast; cards and controls are keyboard accessible and sized for portrait touch use.

## Grouping decisions

- Sigma CP, CP-R, XT, Syncro, Solo and Hydrosense remain separate. Sigma K/T drawings share their original source page and retain the variant note. Conflicting repeater termination pages remain excluded.
- C-TEC CFP Standard, CFP repeater, XFP 16-zone, XFP 32-zone and XFP repeater remain separate; CAST devices form their own collection.
- The combined Gent source contains Compact and 4/6-loop boards. Family membership selects the exact picture IDs, avoiding a record-level join that would attach both boards to both panels.
- The Protec 3000PLUS/6000PLUS base page is explicitly labelled a shared source with separate conventional/addressable drawings. It does not claim interchangeable wiring.
- Sita and Twinflex devices are separate, as are TWINFLEXpro panels and pro² repeaters. Tynetec Advent XT and XT2 remain separate.
- Hochiki CHQ-ARI(CLR) retains its suffix and scope. Broad product-family device collections retain the applicability and compatibility conditions attached to each individual picture.

The materialisation script [`build-packs.py`](build-packs.py) records the reviewed group assignments and writes explicit picture IDs to `public/app/data/wiring-packs.json`. It fails if a source page is missing, duplicated or newly added without classification. The runtime validates brand ownership and full coverage as well.

## Offline and PDFs

Brand/family packs organise the existing offline pictures. Full PDF availability is counted independently. **Save missing PDFs** deduplicates source records, skips already-saved files and source-only references, and uses FINDR's existing download system. Partial failures preserve pictures, show what still needs saving and leave retry available; an unexpected download rejection is displayed without leaving the family. The existing source viewer still hashes the actual saved PDF before opening its recorded page.

No new wiring or model compatibility was inferred for this release. Existing catalogues, packs, PDFs, imported schedules, sessions and emulators keep their identities.

## Focused verification

Seven new tests cover complete/nonduplicated membership, exact source-page separation, scoped search, malformed data rejection, brand-strip contrast, saved-PDF accounting and an unexpected download failure with retained pictures/retry. The wiring, pack and device-catalogue subset passed **39 tests**. Chromium checks at **390 × 844** and **1440 × 844** opened the brand grid, Kentec families and Sigma CP's three pictures without page errors or document overflow. On the phone, the first brand and family cards begin around 584–586px; duplicate instructions were compacted after visual review. Final offline and whole-app validation belongs to the release report.

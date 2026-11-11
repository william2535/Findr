# Panel picture packs — web 0.19.0 batch

This batch adds four genuine Kentec repeater figures and connects eleven checked documents to the relevant picture packs: four documents for the new cards and seven additional user/installation documents across ten existing cards. All existing archive, panel and pack identifiers remain unchanged. The pictured library grows from **611 to 615 families**; the number of panel packs remains **86**.

## New pictured cards

| Card | Actual image source | Linked manual and scope |
| --- | --- | --- |
| Sigma CP-R 2 / 4 / 8-zone repeater | Man-1093, PDF page 5, mains-powered eight-zone fascia illustration | Man-1093 Issue 06, May 2016. K01020M2/K01040M2/K01080M2 and E01020L2/E01040L2/E01080L2 family; not a Sigma CP main panel. The manual's main-panel PCB alpha-suffix compatibility condition remains visible. |
| HydroSense CP-R B3420 repeater | Man-1132, PDF page 5, mains-powered fascia illustration | Man-1132 Issue 03, June 2013. Water-detection repeater; not a fire control panel or the HydroSense CP main panel. Retained beside the existing HydroSense cards in the Kentec archive pack. |
| Solo Response addressable repeater | Man-1052, PDF page 1, product photograph | Issue 02, November 1998. Historical single-loop addressable repeater; distinct from a Solo main panel and from Solo 2 Response. |
| Solo 2 Response addressable repeater | Man-1064, PDF page 1, product photograph | Issue 01, July 2002. Historical single-loop addressable repeater; distinct from the earlier Solo Response and Solo 2 main panel. |

These images are unchanged crops of manufacturer figures. Cabinet appearance does not prove zone count, supply type, protocol, installed hardware or firmware. Each card retains its image credit, exact source page, source URL, derivative hash, actual manual edition and applicability limits. No replacement artwork was generated.

## Existing cards enriched

- **CFP Standard, Economy and AlarmSense:** the checked DFU7001020 Rev 2 user guide is a family manual. Its page 3 feature chart distinguishes the types; the cards say that some sections do not apply to every variant. The checked **DFU7004010 Rev 1 Standard engineering manual is linked only to Standard**.
- **XFP 16-zone and 32-zone:** historical DFU2000501 Rev 2 user guide, with both layouts on PDF page 6. This is not the CAST guide.
- **XFP CAST 16-zone and 32-zone:** DFU5020000 Rev 3, whose cover explicitly lists XFP501E/CA, XFP501/CA and XFP502/CA.
- **ZFP CAST:** DFU5030050 Rev 3, 1 May 2022. The Apollo card does not acquire this CAST document.
- **EACIE:** DFU5030070 Rev 1. The card retains the guide's Fire and Rescue Service-only equipment scope.
- **Syncro:** Man-1057 Issue 09, June 2013. The historical multi-loop guide is not assigned to AS, Lite or XT merely because they share the Syncro name.

The C-TEC pack grows from 20 to **26 linked documents** and the Kentec pack from 110 to **115**. These counts include retained historical/source-listed documents; the fresh check applies only to the eleven records listed in this batch's manifest. A linked PDF is available to save through FINDR's existing download system and is not automatically saved on the user's device.

## Evidence and reproducibility

[manifest.json](manifest.json) records every source URL, SHA-256, byte/page count, exact manual revision, applicability page, crop rectangle and target card. Six archive sources already had hashes; freshly fetched bytes matched those hashes. The four new repeater manuals and Syncro user manual were retrieved from Kentec's official URLs and pinned in this research manifest without rewriting the archive snapshot. The manifest is the authority for this batch's checked-source claim; it is not a replacement catalogue.

Rebuild using `python scripts/expand-panel-packs-0.19.0.py /absolute/pdf/cache`. Missing PDFs are fetched only from the recorded URLs. A hash or page-count mismatch stops the update. The script only merges additions, preserves all previous panel and pack links and keeps existing image files/identities. It does not change `catalogue.json`, download allowlists, PDF storage, emulators or saved visits.

[preservation.json](preservation.json) records the baseline and confirms that every prior panel image/hash and every prior panel/pack record ID remains. The three focused tests in `tests/panel-packs-0.19.test.mjs` passed, covering authentic figure provenance, repeater/main-panel distinctions, Standard versus Economy/AlarmSense and CAST versus other protocol links, pinned sources and preserved prior links. Full regression, browser, build and publication validation belong to the release owner.

## Deliberately withheld

- **K3200:** Man-1049 was read, but its cover has a generic Kentec collage rather than a verified K3200 front. No picture card was fabricated.
- **XFP510-32 repeater:** the exact archive DFU2200502 Rev 1 hash matched, but that manual contains rear/internal drawings. Manufacturer/supplier product pages returned 403 during this check. No main-panel photo was relabelled as a repeater.
- Six C-TEC official user-download endpoints returned 403. They are not described as newly verified. The explicitly checked archive editions remain separate and retain their original IDs and revisions.

These are manual/picture additions, not newly verified repair procedures or a new signed Android release.

# XFP and Twinflex service practice — web 0.24.0

This release adds two fire trainer families to FINDR's existing engine, hints, manual archive and offline systems. It preserves the 0.23.0 baseline (`b126f5b4c54709aa161416963d0cf9dde91d8d72`), catalogue IDs, downloaded PDFs, imported schedules, saved fault visits and previous trainer settings. It does not migrate the database or change the signed Android APK.

## Exact trainer scope

| Trainer | Appearance and fixture | Engineering source |
| --- | --- | --- |
| C-TEC XFP 16 zone | Plastic cabinet, XFP501E/X, one-loop Apollo XP95 fictional fixture | DFU1200510 Rev 3 |
| C-TEC XFP 32 zone | Metal cabinet, XFP502/X, two-loop Apollo XP95 fictional fixture | DFU2200510 Rev 2 |
| Fike TWINFLEXpro² | Eight-zone pro² fixture, V3.00+ source scope | 26-0959 Rev 18, October 2020; user guide 26-1028 Rev 5 |

XFP cabinet selection retains separate practice states. The manuals also cover Hochiki variants, but that does not turn the fictional Apollo devices into a mixed-protocol installation. CAST XFP, original Twinflex, earlier TWINFLEXpro and repeaters retain their own manual associations and do not inherit these trainers.

The faces use original manufacturer fascia figures and photographs, with interactive indicators, LCDs and controls. Separate fit/enlarged views support portrait use. Opening a training cover exposes the documented programming control without granting access automatically. Source image provenance and extraction coordinates are recorded in [face-asset-clips.json](face-asset-clips.json).

## Installer and call-out practice

XFP separates access-level passwords from its internal NVM unlock link. Supported exercises cover device disablement/restoration, finding new devices, assignment, full loop learn, output and zone tests, and relevant configuration. Destructive fictional learn actions require confirmation. The 16-zone profile cannot acquire a second loop. PC-only programming, calibration, physical polling and unverified hardware results remain labelled references. The exact AL3 menu follows the source diagram; broader AL2 capabilities with an unsettled AL3 position do not receive a guessed key sequence.

Twinflex separates User, Supervisor, Engineer 3A and writable Engineer 3B. Its lower keypad flap and right-hand Write Enable cover are independent. Four-digit access codes are accepted on the fourth digit; menu choices use ENTER. Stored engineering changes remain pending until RESET. Operational disablements and tests are distinct from zone power settings. Leaving Write Enable on outside Engineer causes the documented reminder rather than an invented shutdown. Zone/device replacement practice respects Twinflex's zone-based operation: there is no fabricated addressed-device enrolment menu.

Call-out lessons, contextual HINTS, source references and the shared Menu maps library use the same scoped data. A highlighted key is a prompt, not an automatic action. Fictional inputs, practice timing and reset assists are labelled separately from real panel controls. Reference-only entries remain visible without claiming a measured voltage, verified circuit condition or successful physical test.

The additions contain **19 call-outs / 120 authored steps** and **202 menu-map entries**, taking the shared library to **15 families / 10,027 entries**. These totals include references, settings, groups and tasks; they are not counts of simulated LCD screens. Detailed evidence is in the [XFP source review](xfp-source-review.md), [Twinflex source audit](twinflex-source-audit.md), [face audit](face-source-audit.txt) and [independent review](independent-review.md).

## Manuals and offline use

The [manual review](manuals.md) and [machine-readable audit](manuals-audit.json) account for all 45 XFP/Twinflex candidate records in the existing archive: 41 distinct PDF hashes, 34 canonical editions and ten variant-specific collections. Eighteen existing hash pins matched, with no retrieval failure or mismatch. This is complete coverage of the reviewed archive candidates, not a claim to possess every manufacturer publication.

Installer/user documents, historical editions, repeaters, accessories, application notes and brochures retain their roles and scope. Misleading legacy archive titles are corrected in the additive presentation index while original record IDs remain intact. Byte-identical saved aliases can satisfy a saved-document action; a different PDF with similar text does not become an exact page source.

The trainer code, lesson data, menu maps and face pictures join the existing integrity-checked app cache. Full manuals use FINDR's existing on-demand PDF store and reader. Once downloaded, a PDF remains usable offline. No manual is labelled saved merely because its publisher link was checked during development.

## Review and release

See [validation.md](validation.md) for regression, build, browser and preservation results. Source-based simulation is distinct from verification on physical panels. Browser checks at iPhone portrait width are distinct from physical iPhone/Safari testing.

The web release is **0.24.0**. The signed preview APK remains **0.14.1**, versionCode **26**. Publication requires a pushed reviewable commit, saved Sites version, successful deployment and a check of the live served application; a local build alone does not establish publication.

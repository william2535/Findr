# Historical preservation regression audit

Checked 26 November 2026 against GitHub source `95e3f8727230985ebb64592233c56945f25a4f4d`, before Panel Lab changes.

The three reported historical-preservation failures reproduce on a clean detached checkout: 30 checks run, 27 pass, three fail. They are not caused by the new matrix or Home implementation.

## Catalogue snapshots

Previously published commit `95ac61a58420bcf77a36405f9c9365d954e7a1b0` adds 35 Paxton document records, 41 device records, one device pack and 35 entries to each download map. Comparison with parent `e68e7b6f843666cb653bd63447004ab4bc18b32a` confirms no previous record or field changed. The importer also alphabetically reorders the device packs.

The historical 0.22/0.23 tests already project the later Minerva additions out before comparing the original byte hashes. Their helper now also projects this exact reviewed Paxton batch out. `tests/fixtures/preservation/paxton-95ac61a-additions.json` pins its IDs and record hashes from that immutable commit, plus the published pack order and original order. The original baseline sizes and hashes remain unchanged. Altered/missing/duplicate reviewed records, unknown additions, altered old fields and unreviewed pack reordering still fail.

No catalogue content, associations or runtime code was changed to make these tests pass.

## Retained Android artifact

The complete-source GitHub export deliberately excludes generated `public/releases/FINDR-0.14.1.apk`. The existing release policy still requires that previous APK for the original Sites build. This is a packaging prerequisite, not an assertion to relax.

For this build, the original Sites source copy was restored locally and checked against the retained checksum:

- File: `FINDR-0.14.1.apk`
- Bytes: 24,126,768
- SHA-256: `b46ed914f92d9715980e74555cdf9f85487530232fa09040f17729d54b075353`

A clean GitHub checkout needs that same verified release artifact supplied before running the Sites public-build gate. It remains excluded from the source backup; the original release policy and missing-artifact tests were not weakened.

## Verification

After the exact projection fix and local artifact restoration: 34 focused checks passed, zero failed. These include the three original suites and four new negative/preservation checks. No original historical snapshot was rewritten.

# FINDR web 0.22.0 — release validation

Checked on 2 November 2026 against web 0.21.0, commit `350e887b0ce5bb3706a7a3660f0fe531d1175d9f`.

## Delivered scope

Manuals now offers a Wiring diagrams gallery and filter, original source-page pictures, model/edition references, zoom/pan, explicit curated panel/device links and the existing full-PDF download/reader flow. The release includes **177 pictures / 105 manuals / 28 brands**, with links to **40 panel and 60 device families**. Pictures cover fire, intruder, access, CCTV and warden call. Source review, excluded candidates and exact association evidence are in the [research index](README.md).

## Automated and build results

| Check | Result |
| --- | --- |
| `node --test --test-isolation=none tests/*.test.mjs` | **953 passed, 0 failed, 0 skipped** |
| New wiring logic, provenance and UI tests | **26 passed**, included in the full suite |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `node scripts/merge-wiring.mjs --check --strict-assets` | Passed; no conflicting/duplicate source pages or unreferenced images |
| Baseline catalogue/pack/download preservation | All eight recorded files byte-identical |
| `python scripts/prepare-app.py` | **1,243 offline assets / 70,422,804 bytes**, revision `57ad67801e89` |
| `node scripts/run-framework.mjs build` | Passed; Vinext retains its informational route-classification limitation |
| `node scripts/verify-public-build.mjs` | **1,285 public files** match source; deployment output **127,000,237 bytes**; expected archived-APK/native-index exclusions applied |
| `git diff --check` | Passed |

Tests cover intersection of text/brand/category/target/saved filters, full model suffixes, exact curated target links, immutable searches, duplicate-source rejection, pinned source hashes, actual image bytes/dimensions, offline asset integrity and preservation of existing catalogue identities. All 17 new target bindings have explicit source evidence; the rejected generic CHQ-ARI association cannot reappear silently.

Source-page opening hashes the actual stored PDF, rejects a different/unknown edition and validates the page bound in the reader. The exact hashed Blob is passed to the reader, avoiding a second database read that could fetch different bytes. Controller tests cover a file changing during hashing, late completion after the viewer closes or changes, download failure, retry, source-page return and zoom without cropping the source.

The generated practice-data version follows the app version; its remaining data is identical to 0.21.0. No emulator logic, stored PDF identities, database schema, fault-session data or imported schedules are migrated or rewritten.

## Browser acceptance

Harness: `scripts/qa-wiring.cjs`, Chromium at **390 × 844** and **1440 × 844**. The [preservation fixture](../../tests/fixtures/wiring/README.md) contains labelled synthetic 0.21.0 trainer progress and earlier site records. Checked real source-PDF bytes substitute for the manual API response during download tests, avoiding dependency on live publisher availability. Networking is then disabled and the interception removed for offline checks.

The flow covers ordinary-manual wiring filtering; model, brand, discipline and target filters; empty coverage; picture loading and zoom; large touch controls; failed-download context preservation; normal PDF download and exact source-page opening; actual-byte mismatch despite forged matching metadata; saved-only filtering and recent-save order; and explicit device/panel associations. Offline reload checks the actual verified service-worker build, source pictures, both old and newly downloaded PDFs, saved visits/imports, pack usage and existing CFP/Sigma/keypad state. Both conventional emulators and the earlier visit are reopened.

**Final result: passed at both widths**, with no page errors or document-level horizontal overflow. Each browser verified `findr-shell-57ad67801e89`, version 0.22.0, containing all **1,243 assets**. Network-disabled reload, the original source picture, exact Sigma source page, retained Gent PDF, existing records and reopened emulators/visit all passed. See the adjacent browser evidence files and screenshots.

## Limits and publication

Coverage is the reviewed subset of the archive, not a wiring manual for every listed model. Pictures are original manual pages with their applicable models, edition and source limits. Contradictory repeater termination pages are excluded. No generated wiring, inferred physical topology, universal compatibility or physical installation validation is claimed.

Browser tests use Chromium viewport emulation, not a physical iPhone/Safari certification. Offline availability follows completion of the existing verified app-cache setup; browser storage remains subject to normal device retention. Full PDFs are separate from the included pictures and download only through the existing explicit action.

Source is committed for review and the verified output is packaged through the established Sites workflow. Build completion is separate from publication; successful deployment and live served-source checks are required before reporting an updated website. Web **0.22.0** leaves the signed Android APK at **0.14.1**, versionCode **26**. No new signed APK or app-store publication is claimed.

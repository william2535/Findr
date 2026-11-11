# FINDR web 0.23.0 — release validation

Checked 2 November 2026 against web 0.22.0, commit `e8691d604f07fc882a803892d4c6ca7f8722a869`.

## Delivered scope

The existing wiring collection now has **28 branded collections / 79 family packs**, retaining all **177 reviewed pictures from 105 manuals**. Contextual hints cover all **13 current emulator families**, with 138 existing guided tasks available through the family-specific chooser. The common menu/control library adds four fire maps and **846 documented entries**, for **13 maps / 9,825 entries** overall. Entries include source-only references, settings, groups and authored tasks; these totals are not counts of simulated LCD screens or newly implemented hardware effects.

The [research index](README.md), [fire-map audit](fire-menu-map-audit.json), [independent review](independent-review.json) and [wiring pack notes](../wiring-packs-0.23.0/README.md) record model limits, explicit associations and source status. All nine original intruder maps remain byte-identical. Twenty-three original catalogue, delivery, pack, wiring and source-data files are protected against baseline hashes; practice metadata changes only its release version.

## Automated and build results

| Check | Result |
| --- | --- |
| `node --test --test-isolation=none tests/*.test.mjs` | **992 passed, 0 failed, 0 skipped** |
| Additional tests in this release | **39**, included in the full suite |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `node scripts/build-fire-menu-maps.mjs --check` | Passed; deterministic projection matches all four shipped maps |
| `node scripts/merge-wiring.mjs --check --strict-assets` | Passed; original source-picture index and assets preserved |
| `python scripts/prepare-app.py` | **1,250 offline assets / 71,216,193 bytes**, revision `6214c2994290` |
| `node scripts/run-framework.mjs build` | Passed; Vinext retains its informational route-classification limitation |
| `node scripts/verify-public-build.mjs` | **1,293 public files** match source; deployment output **127,913,596 bytes**; expected archived-APK/native-index exclusions applied |
| `git diff --check` | Passed |

Focused tests check complete/unique family membership, correct source-page grouping, saved-PDF counts, source-only references, malformed routes and unexpected save rejection. Menu tests check all 13 explicit engine bindings, source references and parent paths, source-only action guards, all 103 Sigma codes with their 48/55 support split, all nine CFP SW8 functions and preservation of the nine intruder maps.

Search checks preserve fire device-versus-zone scope, exact Sigma alphanumeric codes such as `2A`, `Ad` and `d1`, the CFP `SW8` control and contextual level-3 wording without turning it into a delay-value lookup. Independent tests forbid interactive routes for all 31 Vigilon and 17 Nano runtime nodes whose source confidence is reference-only. Supported configuration effects without a verified per-code sequence do not acquire invented navigation links.

Hint tests check explicit panel/profile matching, unsupported models retaining their own manuals, all 13 catalogues, scoped source limits, actual physical labels versus practice assists, and active guided tasks retaining their existing step, state and progress when HINTS is opened. Existing hint planners and engine state transitions remain covered by the full regression suite.

## Browser acceptance

Harness: `scripts/qa-packs-hints-maps.cjs`, Chromium at **390 × 844** and **1440 × 844**. The labelled synthetic preservation fixture was generated with the committed 0.22.0 engine so pre-existing state normalization is not misreported as a new migration. Actual checked Sigma/Gent PDF bytes are used for the download and retained-PDF flows; the API interception is removed before networking is disabled.

Coverage includes brand → family → source picture → saved PDF, pack download failure/retry, all 13 scoped hint pickers, all 13 menu-map search filters, actual new-map clickthrough into the correct fire engine/coach, reference-only action guards and unsupported Sigma XT retaining its own linked manuals. Five active-hint workflows retain their current task/route and engine state. Images are decoded and the PDF canvas is nonblank and stable before screenshot capture.

**Final acceptance passed at both widths**, including the network-disabled reload. Both browsers verified cache `findr-shell-6214c2994290`, version 0.23.0, containing all **1,250 assets**. All 13 menu/hint families remained available offline, source pictures and both old/new PDFs rendered, and earlier records were retained. Active-task checks performed a real key/practice acknowledgement before opening HINTS and preserved that earned step and engine state. No browser errors or document-level horizontal overflow were reported. See [browser-validation.json](browser-validation.json), [result lines](browser-results.jsonl) and the 16 adjacent screenshots.

## Release boundaries

These checks use Chromium viewport emulation, not physical iPhone/Safari or hardware-panel certification. Fire-map content is projected from previously reviewed editions and existing source data; this release does not establish new manufacturer firmware behaviour. Model, variant, access and edition limits remain visible. Archive models without a verified engine receive model-specific manual help rather than fabricated interactive hints.

The new indices and modules use the existing integrity-checked offline cache. Saved PDFs, imports, sessions and trainer records keep their existing stores and identities. No database upgrade, file rewrite or signed APK is introduced.

The verified output is committed and packaged through the established Sites workflow. Build success is distinct from publication; deployment status and live served-source checks are required before reporting the website updated. The web release is **0.23.0**; the signed Android preview APK remains **0.14.1**, versionCode **26**.

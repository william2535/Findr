# FINDR 0.36.1 — menu references and documented panel access

## Change

The reported MxPro5 question, `How to disable a devicw`, now enters the same device-task path as the correctly spelled question. The original message remains unchanged. A generic device asks for its type; `detector` resolves the saved request to the existing reviewed individual-input procedure, with its prerequisites, effects and source pages. It does not silently treat an output as an input, or mark requested work as performed.

When saved-manual retrieval does not establish a complete route, Panel Pals can use FINDR's existing source-pinned menu maps. These responses name the mapped scope and document edition, link to the menu reference and source pages, and distinguish a menu location from a complete operating procedure. Firmware/variant conflicts, explicit different panels, fictional practice routes and compound service requests cannot become a single generic route. No MxPro map was invented: its reported device operation uses the already-reviewed MxPro5 manual procedure.

Public factory values and fixed entry sequences are separately represented in `panel-default-access.json`: 12 documented access references and six explicit coverage gaps. Sources include edition, PDF page, SHA-256 and an exact quotation. Nano V2 requires firmware confirmation and is not applied to V3. MxPro4/5 Level 2 example tables do not become factory defaults. Sigma physical access and unverified Minerva defaults are reported honestly. The references never claim the current site credential or supply a reset/bypass procedure. See [default-code-sources.md](default-code-sources.md) for the actual source audit.

New source links open a matching saved PDF locally. An unsaved edition is labelled as a publisher PDF requiring a connection; the bundled map remains available offline. These reference answers require no new model download and are labelled `Manual search · No AI` when inference is not used. Existing local/online engines, provider consent and saved job structures remain intact.

## Verification

- Full Node suite with the actual-PDF access audit enabled: **1,827 passed, zero failed or skipped**, 47.55 seconds.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed. Public build verification: 1,461 static files, 188,354,734 build bytes, largest static file 24,126,768 bytes, no oversized assets. Older APK exclusions apply only to deployment output; source/recovery files remain preserved.
- Chromium **154.0.8037.57**, Linux, 390 × 844: **9 online checks and 10 cold-offline checks passed**.
- WPE WebKit **26.0**, Linux, 390 × 844: **9 online checks passed**.
- Normal Panel Pals composer: exact typo → device-type question → `detector` → reviewed MxPro5 procedure; retained prior log and reload state; real saved PDF page 26; factory Level 3 reference and real saved PDF page 50; separate XFP pal and real saved engineering PDF page 29; working `#menus/xfp/walk-test` link; cross-pal scope rejection.
- Chromium network disabled before a cold page reload: conversations, saved PDF opening, access references and scoped menu lookup remained usable. Verified offline build **0c7986c75eb4**, web **0.36.1**.
- No page errors, model-download requests or cloud-provider calls occurred in these browser runs. No actual local inference was needed or claimed for this reference repair.

Actual manufacturer PDFs used: Advanced MxPro5 User Guide **680-166 Rev04** (43 pages), MxPro5 Product Manual **680-165 Rev05** (74 pages), and C-TEC XFP engineering **DFU2200510 Rev2** (36 pages). The real local PDF analysis/index pipeline was used, including reuse of previously extracted text. No full PDFs, model weights, provider keys or customer records are included in this release's evidence.

The initial full test run correctly caught the stale offline byte manifest during development. Regenerating with `python scripts/prepare-app.py` and rerunning the complete suite produced the passing result above. Early browser harness assertions were corrected to match the actual `documented` status and disclosure behavior; no application behavior was changed to bypass them.

## Limits

This is an evidence/retrieval correction, not a new language model or a guarantee of arbitrary menu understanding. Unmapped operations, uncertain variants and missing procedures remain explicitly unresolved. A menu reference cannot establish safe prerequisites for a physical service operation. The public default values may have been changed on site.

No physical iPhone was available for this release's tests. WebKit's container CacheStorage capability remains unavailable, so WebKit offline readiness is not claimed; offline verification is Chromium only. The Android APK remains 0.14.1 (code 26). Browser evidence and the repeatable harness are stored beside this report and in `scripts/verify-helper-menu0361-browser.mjs`.

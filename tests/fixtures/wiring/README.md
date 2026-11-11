# Synthetic prior records for wiring-library acceptance

`synthetic-0.21-progress.json` was generated using the exact committed FINDR 0.21.0 conventional trainer engine and data at `350e887b0ce5bb3706a7a3660f0fe531d1175d9f`, before wiring-library changes.

The fictional CFP record has a confirmed coincidence pair, a three-minute delay and an earlier completed lesson. The fictional Sigma record retains Write Enable ON beneath a closed cover, codes 01/31/29 and an earlier completed lesson. Browser acceptance checks both records remain unchanged while browsing diagrams, downloading/reading PDFs and reloading offline. Separate synthetic visit, imported schedule, keypad and pack-usage markers are seeded by the harness. No fixture represents customer data or physical work.

## Browser acceptance

After preparing the offline manifest, serve `public` at the repository root URL and run:

```sh
FINDR_PLAYWRIGHT_PATH=/opt/codex/cua_node/lib/node_modules/playwright \
FINDR_SIGMA_PDF=/path/to/kentec-sigma-cp-main.pdf \
FINDR_QA_PDF=/path/to/gent-installation.pdf \
node scripts/qa-wiring.cjs
```

The default URL is `http://127.0.0.1:8087`. `FINDR_QA_URL`, `FINDR_CHROMIUM` and `FINDR_QA_WIDTHS` override the server, Chromium executable and widths. Defaults are 390×844 and 1440×844. `FINDR_QA_LAYOUT_ONLY=1` blocks service workers and skips the offline phase for preliminary checks; this is not an offline pass.

The checked Sigma installation PDF for catalogue ID `kentec-0d82d93522c3` is intercepted as the normal manual API response. Its actual SHA-256 must match the selected reviewed wiring entry. The old saved PDF is the checked Gent source for `gent-0ba4cfc5de7c`. PDFs are not bundled in these fixtures. The first source download intentionally returns a labelled synthetic failure, then succeeds with the checked bytes.

A deliberate mismatch test stores the Gent bytes under the Sigma ID while forging a matching `fileHash` metadata value. Correct behaviour requires hashing the actual saved Blob, retaining the diagram view with an edition-mismatch explanation, and offering only an explicit open-at-start action. The harness restores the proper Sigma source afterward through the normal download system.

Acceptance covers manual content/brand/discipline/target filters, picture and source labels, zoom, source-page opening, download-failure context, exact device/panel associations, saved-only full-PDF scope and recent-save order, offline picture/PDF loading and record preservation. It also reopens the earlier trainer views and fault visit. Browser checks use Chromium viewport emulation, not physical iPhone/Safari, wiring validation or publication verification. Pure matching/source-integrity tests and the broader regression suite are separate.

Before the offline phase, the harness removes its PDF API interception and sets the browser context offline. It checks `navigator.onLine` is false and records the verified service-worker cache/build after reloading. The browser therefore opens the retained PDF Blobs without a synthetic online response.

One JSON result is emitted per viewport. Screenshots are written under `/tmp/findr-wiring-*`; failures save a screenshot and HTML snapshot. Final release evidence is copied to `research/wiring-0.22.0/` by the QA owner after the frozen cache passes.

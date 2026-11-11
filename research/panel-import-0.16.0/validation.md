# Panel import validation — web 0.16.0

## Automated verification

- Full existing regression suite plus focused importer/lookup, persistence, matching and context/report tests: **693 passed, 0 failed**.
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` passed.
- Production: `node scripts/run-framework.mjs build` passed.
- `node scripts/verify-public-build.mjs` passed, including copied public asset identity, per-file limits and release retention checks.
- `git diff --check` passed.

## Browser workflow

`scripts/qa-panel-import.cjs` passed with Chromium at **1440 × 844** and **390 × 844**. The latter is an iPhone portrait viewport simulation, not a physical iPhone/Safari test.

Tested UTF-8 CSV and tab-delimited TSV, including unfamiliar-header mapping, quoted multiline values, blank cells, leading zeros and complete part-code suffixes. Synthetic schedules contain two panels, each with two loops reusing address 37, plus network-node and sub-address collisions.

The flow tested import → panel scope → display lookup → programmed location → manual → Fault Finder. It verified address ambiguity, loop investigation wording, exact vs generic device identity, deliberate replacement, rejected/unchecked replacement, malformed input and cancellation. Same-scope reimport retained seven rows, not fourteen. Atomic write failure and stale replacement rejection were additionally tested with the store's fault-injection harness.

A real linked Gent S-Quad installation PDF was retrieved from its existing catalogue URL for browser testing. A local test endpoint supplied those bytes at the app's existing manual-download URL. This exercised FINDR's PDF validation, existing downloader, atomic metadata/blob storage and bundled PDF.js renderer. It is **not** a test of the production publisher relay, and the PDF was not added to source or the deployment archive.

After the real service worker reported readiness, browser networking was disabled and the page reloaded. The schedule, scoped lookup, saved PDF, prior saved session and newly saved imported-context session remained usable. The copied report retained site, panel, node, loop, zero-padded address, zone, programmed location, full part code, export date and separately reported fault; imported fields supplied no check answers.

No real manufacturer configuration export was verified. No signed Android APK was built for this web release; APK remains 0.14.1. A successful local build is not itself publication; deployment is a separate Sites operation.

## Reproduce browser checks

Serve `public/` locally at `http://127.0.0.1:8085`. Download the Gent document from the exact `gent-0ba4cfc5de7c` catalogue URL to a temporary local file. With Playwright and Chromium available:

```sh
FINDR_PLAYWRIGHT_PATH=/absolute/path/to/playwright \
FINDR_QA_PDF=/absolute/path/to/the-referenced-gent.pdf \
FINDR_QA_URL=http://127.0.0.1:8085 \
FINDR_CHROMIUM=/absolute/path/to/chromium \
node scripts/qa-panel-import.cjs
```

The script intercepts only that manual's test download endpoint and serves the provided PDF. It uses isolated browser contexts and never writes synthetic imports or sessions to a deployed site.

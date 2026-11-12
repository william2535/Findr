# GitHub Pages release verification — FINDR 0.40.0

Tested 12 November 2026 in the managed Linux execution environment. This release packages the existing browser app under `/Findr/app/`; it does not replace the app with a demo. The original Site supplies catalogue PDF downloads and the explicitly chosen, personal-key online AI relay. Their CORS allowlist is the owner's exact GitHub Pages origin, without cookies or wildcard origins. Android remains 0.37.0/code27.

## Automated checks

- Full Node suite: 1,981 tests; 1,980 passed, zero failed, one skipped. The optional default-access manufacturer-PDF audit needs an external local evidence cache not present in this environment; its deterministic regressions passed.
- TypeScript `pnpm exec tsc --noEmit`, production `pnpm build`, and `node scripts/verify-public-build.mjs`: passed.
- New tests cover fixed API routing, nested update discovery, CORS including range resume and consent/key boundaries, and deterministic safe Pages packaging.
- Compiled Worker preview: actual PDF and online API OPTIONS handlers return 204 for the exact Pages origin; capability GET returns 200 and honestly reports that a personal key is required and provider service has not been verified. See `local-api.json`.

## Browser checks

`chromium.json` records Chromium 154.0.8037.57 at the actual generated nested path. Normal UI checks cover Home at 320/390/1440px, banner/grid, manual packs, emulators, menu maps, Resistor Lab, timed paper answering and reload, and creating/reopening a Panel Pal conversation. No page exceptions or accidental account-root app/API requests occurred.

With networking disabled after the verified service-worker install: the app reopened, the saved pal/transcript reopened, a saved PDF rendered, and previously unseen labelled synthetic text and scanned PDFs processed successfully. The existing PDF/OCR pipeline was called by the test harness with fixture bytes, rather than claiming a user file-picker upload. Timings and hashes are in the JSON. Manual processing readiness was verified separately from the optional local language model.

The regression harness and synthetic fixture records are test-only. An initial malformed synthetic saved-manual record omitted the category field; correcting that fixture resolved its archive-rendering error. No production record migration was needed. A previous update-URL implementation failed an existing root-path regression; the final parent-of-app resolution passed the full suite and nested preview checks.

WebKit 26.0 passed the nested-path Home/layout, route, timed-paper reload and Panel Pal conversation checks, then its local browser storage context stopped during PDF processing. `webkit.json` records that failure; WebKit PDF processing and offline operation are not reported as passed. Chromium performed those checks successfully. The native Linux WebKit setup and limits are recorded separately.

The compiled local Worker returned 502 for one real upstream-manual request; the existing production server returned the complete 1,079,368-byte MxPro5 user-guide PDF for the same catalogue ID. Live Pages-to-production download verification is a separate post-publication check.

## Boundaries

A Linux browser/phone viewport is not a physical iPhone. No new local-model weights or authenticated online-provider request were exercised in this hosting change, so no new inference performance or phone capacity claim is made. The GitHub hostname has separate browser storage from the original Site; files and jobs are not silently moved between origins. Upstream publishers and optional provider services still require connectivity.

Local build success does not prove publication. Final production IDs, source provenance, GitHub commit and Pages workflow/deployment status belong in the release backup provenance and final delivery check, after they exist.

## Publication recovery

The native artifact uploader timed out twice after 300 seconds, for the verified 167,383,040-byte tar and 108,488,087-byte gzip. A source-build fallback for Site 90 then failed at the platform boundary with `Cannot create a string longer than 0x1fffffe8 characters`. The original live Site stayed unchanged.

Inventory found 703,199,664 bytes in the source tree, including 463,832,213 bytes across 21 retired APK binaries. Those binaries already receive 410 archived responses and are excluded from production output. Their bytes remain in the local workspace and historical Sites Git commit 47d5bb22; only their entries in the new source tree were removed. Checksums, archived handlers, Android source, currentAPK and previousAPK retention remain. `archived-build-inputs.json` records every retained local binary and its hash. They were also already excluded from the GitHub source export. This makes clean web source builds independent of retired installers, with no user-facing feature removed.

The post-recovery full suite passed 1,980 tests with zero failures and the same optional source-PDF audit skipped. Three added tests exercise absent archived binaries, mandatory checksums, hash failures and stale output removal.

Portable builds now wait for the Vinext CLI to finish and always run the public-asset gate; four additional tests cover completion order, child/gate failures and unchanged development PID behaviour. The final actual portable build completed with its integrated gate, preserving all web outputs.

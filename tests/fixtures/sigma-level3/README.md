# Synthetic legacy Sigma / CFP progress

`synthetic-0.20-progress.json` was generated using the exact committed FINDR 0.20.0 engine and data from `3d6f286119accef7c86f80cc74cb4461a9153b9d`, before the Sigma engineering extension.

The Sigma fixture has a fictional zone-4 disablement, enabled operator key and one prior completed lesson. The CFP fixture has fictional zone-3 disablement, a confirmed coincidence pair, a three-minute delay setting and earlier lesson progress. Browser acceptance asserts that Sigma initializes its new fields without losing the legacy records, and that using Sigma leaves the CFP record exactly unchanged until CFP is intentionally exercised later in the run.

No fixture is real customer, panel or physical-work evidence. The browser harness also seeds labelled synthetic prior visits, imported schedules and intruder settings as preservation markers. It separately retains a real checked source PDF through FINDR's existing local PDF store.

## Browser acceptance

After regenerating the offline manifest, serve `public` on the repository's root URL, then run:

```sh
FINDR_PLAYWRIGHT_PATH=/opt/codex/cua_node/lib/node_modules/playwright \
FINDR_SIGMA_PDF=/path/to/kentec-sigma-cp-main.pdf \
FINDR_QA_PDF=/path/to/gent-installation.pdf \
node scripts/qa-sigma-level3.cjs
```

Defaults use `http://127.0.0.1:8086` and the checked PDFs held in the execution workspace. `FINDR_QA_URL`, `FINDR_CHROMIUM` and `FINDR_QA_WIDTHS` override the server, Chromium executable and viewport widths. The Sigma API response is intercepted with the checked source PDF for existing catalogue ID `kentec-0d82d93522c3`; the earlier manual is catalogue ID `gent-0ba4cfc5de7c`. The normal download validation, storage and PDF reader run unchanged. PDFs are not bundled with these fixtures.

The harness uses actual rendered buttons, mode targets and clearly labelled fictional inputs to complete every Sigma and CFP lesson. The Sigma call-out cards launch their linked guided lessons. Independent checks cover cover/access separation, Write Enable persistence, code entry and set/review behaviour, resound configuration, manuals, zoomed touch targets, previous state preservation and reload with browser networking disabled. Both the new and earlier saved PDFs must render offline.

`FINDR_QA_LAYOUT_ONLY=1` disables service workers and skips offline assertions for preliminary layout checks; it is not an offline pass. Full acceptance emits one JSON line per width and screenshots under `/tmp/findr-sigma-*`. Failures additionally save a screenshot and HTML snapshot.

The environment uses desktop Chromium at 390×844 and 1440×844. These are viewport tests, not physical iPhone/Safari testing or physical-panel certification. The old visit/import/intruder records are preservation markers, not replacements for those features' own suites. Publication and APK signing are verified separately by the release owner.

# Synthetic legacy trainer progress

`synthetic-0.19-progress.json` was generated from the committed FINDR 0.19.0 pure engine at `ed00c1fa0479ccfc5c111abeec4de2eac33f1843`, before adding CFP engineering fields. It contains fictional CFP zone-3 and Sigma zone-4 disablements, enabled training keys and one earlier completed lesson per profile.

It is not customer or physical-panel data. Browser acceptance uses it to verify that the access-level-three extension initializes missing new fields without overwriting earlier disablements or the other panel's saved progress. All new readings, visit references and programming settings in the browser harness are also synthetic.

## Browser acceptance

`scripts/qa-cfp-level3.cjs` drives the real rendered controls at 390×844 and 1440×844, including every CFP and Sigma lesson. It also checks the documented nine-function SW8 cycle, staged/confirmed pair changes, cover replacement retaining active programming, coincidence output gating, VR1's 1–10 minute range, stored test settings, zoomed control hit areas, existing records and saved PDFs. After the app reports a complete offline cache, it reloads with browser networking disabled and reopens both the newly saved CFP PDF and an earlier Gent PDF.

Run against a server serving `public` at the repository root URL (default `http://127.0.0.1:8085`) after regenerating the service-worker manifest:

```sh
FINDR_PLAYWRIGHT_PATH=/opt/codex/cua_node/lib/node_modules/playwright \
FINDR_CFP_PDF=/path/to/ctec-cfp-install.pdf \
FINDR_QA_PDF=/path/to/gent-installation.pdf \
node scripts/qa-cfp-level3.cjs
```

The CFP PDF must be the installation manual linked by catalogue ID `c-tec-4b1267f3fefc`; the previously downloaded PDF uses catalogue ID `gent-0ba4cfc5de7c`. The harness intercepts the CFP download with those local source bytes so it tests FINDR's normal download/read storage flow without depending on a manufacturer's live host. PDFs are not bundled with these synthetic fixtures. `FINDR_QA_URL`, `FINDR_CHROMIUM` and `FINDR_QA_WIDTHS` override the server, Chromium executable and widths. `FINDR_QA_LAYOUT_ONLY=1` deliberately blocks service workers and skips the offline phase for preliminary layout work; that mode is not an offline pass.

Success is emitted as one JSON line per width. Screenshots are written under `/tmp/findr-cfp-*`; a failure additionally writes `/tmp/findr-cfp-level3-failure.png` and `.html`. These checks use desktop Chromium viewport emulation, not physical-panel or iPhone Safari certification. The older visit/import/intruder records are preservation markers, not a replacement for their own feature acceptance suites.

The isolated final heading-position correction also has a scoped follow-up: run `scripts/qa-cfp-level3-visual.cjs` with the same environment variables. It checks title/number separation, final fit/zoom screenshots, offline PCB-image loading, SW8/programming persistence and both saved PDFs. Results and the distinction from the earlier exhaustive asset revision are recorded in `research/cfp-level3-0.20.0/browser-visual-final.json`.

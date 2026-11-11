# Helpers Sources disclosure acceptance — 0.32.7

Verified against the isolated current-source checkout served at `http://127.0.0.1:8091/app/`. Chromium's service worker confirmed release **0.32.7**, build **21edf75194e5**, with `sha256-v1` asset verification before the offline checks.

| Environment | Result |
| --- | --- |
| Chromium 154.0.8037.57, desktop 1440 × 1000 | 10 checks passed, including network-disabled reload and saved PDF rendering |
| Chromium 154.0.8037.57, portrait touch emulation 390 × 844 | 10 checks passed, including network-disabled reload and saved PDF rendering |
| Playwright WebKit 26.0 / WPE Linux, portrait touch emulation 390 × 844 | 9 online UI checks passed; offline shell verification blocked by the installed browser's CacheStorage defect |

The final three browser reports contain no page errors or navigation warnings. The release owner also completed the final **1,542/1,542 unit tests**, TypeScript check, production build and public-asset verification successfully against these frozen source files.

No physical iPhone/Safari session was used. No local model was downloaded or invoked. This is source presentation and persistence coverage, not model quality testing.

The browser script generates two explicitly synthetic three-page PDFs, saves them in real IndexedDB, extracts them with the app's actual PDF runtime, and builds real local search indexes. It seeds a saved Helpers conversation with citation variants and long-title/quote layout probes. The follow-up question is submitted through the normal composer and produces a real, saved manual-search answer with citations. No requests, answers, PDF reader responses or readiness flags are mocked.

Checks cover:

- Sources start collapsed with the correct count; an answer without citations has no empty control.
- Touch/pointer and Enter/Space expansion, focus retention, source title, edition, printed page and unchanged supporting quote.
- Current `page` and legacy `pdfPage` citations render actual saved PDF pages 2 and 3.
- Returning from the PDF retains expansion. A same-chat connectivity/resource repaint retains source expansion, quote visibility, scrollback, draft text, focus and selection.
- A real subsequent manual-search reply retains earlier source expansion and scrollback; its own sources start collapsed.
- Reduced motion, no document or transcript horizontal overflow, and unchanged stored source references after reload.
- In Chromium, a network-disabled reload restores the saved conversation and renders the cited PDF from verified app assets and local file storage.

WebKit requires a persistent profile in this environment because its ephemeral contexts cannot store Blob objects. Its separate offline limitation is demonstrated without FINDR scripts or service workers in `webkit-cache-limitation.json`: native `Cache.put()` resolves, but immediate/reopened `match()` returns nothing and `keys()` is empty. The historical 0.29.0 probe records the same WPE behavior. No app workaround was made and no claim of WebKit/iPhone offline verification is made. A transient WebKit `Context is stopped` event, when emitted during navigation, is retained separately in the online result's `navigationWarnings`; all other page errors fail the script.

Final evidence:

- `chromium-1440.json`, `chromium-390.json`, `webkit-390-online.json`
- `webkit-cache-limitation.json`
- `synthetic-sources-a.pdf`, `synthetic-sources-b.pdf` — generated test fixtures, not user manuals
- Representative collapsed/expanded screenshots for Chromium and WebKit, plus the Chromium saved PDF screenshot
- `../../scripts/verify-helper-sources0327-browser.mjs`

Initial harness attempts are not release evidence. They exposed a seeded-file Map refresh requirement, Playwright's non-polling treatment of asynchronous `waitForFunction` predicates, and the WebKit environment limitations above. The final script reloads after seeding, explicitly awaits/retries asynchronous predicates, and waits for the verified offline shell before Chromium interactions. Old `*-failure.png` and the failed WebKit offline attempt are excluded from the release evidence commit.

Reproduce with a static server rooted at `public` and Playwright available:

```sh
python3 -m http.server 8091 --bind 127.0.0.1 --directory public
FINDR_SOURCES_MOBILE=0 FINDR_SOURCES_OFFLINE=1 node scripts/verify-helper-sources0327-browser.mjs
FINDR_SOURCES_MOBILE=1 FINDR_SOURCES_OFFLINE=1 node scripts/verify-helper-sources0327-browser.mjs
FINDR_SOURCES_BROWSER=webkit FINDR_SOURCES_MOBILE=1 FINDR_SOURCES_LABEL_SUFFIX=-online FINDR_WEBKIT=/path/to/working/webkit-wrapper node scripts/verify-helper-sources0327-browser.mjs
```

`FINDR_PLAYWRIGHT_PATH`, `FINDR_CHROMIUM` and `FINDR_SOURCES_QA_URL` can select local tool/browser paths and the app URL. The recorded WebKit environment used `/tmp/findr0327-webkit-run.sh` with official Debian libraries extracted into a user-owned temporary directory; no privileged system or application changes were needed.

# Helper customisation acceptance — web 0.32.8

Verified through the existing Helpers entry and Customise controls at `http://127.0.0.1:8092/app/`. The offline run confirmed version **0.32.8**, build **2f6778a8f8a5**, and `sha256-v1` app-cache verification before networking was disabled.

| Environment | Result |
| --- | --- |
| Chromium 154.0.8037.57, desktop 1440 × 1000 | 9 browser checks passed |
| Chromium 154.0.8037.57, portrait touch emulation 390 × 844 | 10 checks passed, including offline reload, saving new appearance and reopening it |
| Playwright WebKit 26.0 / WPE Linux, portrait touch emulation 390 × 844 | 9 online browser checks passed |

All three final runs have zero page errors or navigation warnings. The full regression suite passed **1,546/1,546 tests**. TypeScript, production build and public-asset verification also passed (1,420 public files).

The harness seeds two explicitly synthetic saved helpers, including one older record without an appearance property. All subsequent choices, saves, navigation, export downloads and import file selection use the normal app UI and real local storage. No downloads, model responses or readiness flags are fabricated. No model inference was run for this appearance change.

Checks cover:

- Older helpers acquire the default terminal icon and yellow; another helper retains its own owl and blue.
- Icon and colour selections show a live preview, `aria-pressed` and visible selected markers. All 15 choice controls meet 44px minimum width and height.
- Preview background and borders settle to the chosen palette; saved cards and conversation headers display the selected icon and accent. Unselected helpers stay independent.
- Cancel restores the saved choice. Reset previews the original look and remains reversible before saving.
- Enter/Space operate the controls, touch operates the portrait choices, and reduced motion leaves the controls usable.
- Saving preserves conversation messages and confirmed diagnostic context. Immediately leaving a newly typed draft for Customise preserves that draft.
- Reload restores the appearance. A normal exported helper JSON downloaded through the app can be selected through the import file picker, preserving its appearance and conversations under a new helper identity.
- With Chromium networking disabled, the verified app reloads, accepts a new icon and colour, saves them, then restores them on another reload.
- Portrait and desktop documents have no horizontal overflow. Palette contrast is at least 7.88:1 for accent text on its tint and 10.21:1 for black on its accent.

No physical iPhone or installed iOS PWA was tested. Phone keyboard appearance is not simulated by a desktop browser; the draft/navigation test uses the real textarea at portrait width. WebKit offline was not claimed or retried because the installed WPE browser's native CacheStorage limitation was independently established in [the previous source-disclosure QA](../helper-sources-0.32.7/README.md). This does not establish physical Safari behaviour.

Final evidence is `chromium-1440.json`, `chromium-390-offline.json` and `webkit-390.json`, alongside representative preview/card/offline screenshots. The older `chromium-390.json` and any `*-failure.png` files are initial harness artifacts, not release evidence. A first colour assertion assumed hexadecimal serialization and was corrected to normalize native CSS colour values; preview screenshots wait for the actual 350ms colour transition to finish.

Reproduce with a static server rooted at `public` and Playwright available:

```sh
python3 -m http.server 8092 --bind 127.0.0.1 --directory public
FINDR_CUSTOM_MOBILE=0 node scripts/verify-helper-customisation0328-browser.mjs
FINDR_CUSTOM_MOBILE=1 FINDR_CUSTOM_OFFLINE=1 node scripts/verify-helper-customisation0328-browser.mjs
FINDR_CUSTOM_BROWSER=webkit FINDR_CUSTOM_MOBILE=1 FINDR_WEBKIT=/path/to/working/webkit-wrapper node scripts/verify-helper-customisation0328-browser.mjs
```

`FINDR_PLAYWRIGHT_PATH`, `FINDR_CHROMIUM` and `FINDR_CUSTOM_QA_URL` allow local tool/browser paths and an alternative app URL. The recorded WebKit run reused `/tmp/findr0327-webkit-run.sh`, with official Debian libraries already extracted into a temporary user-owned directory.

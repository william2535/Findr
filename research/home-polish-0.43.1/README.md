# FINDR Home polish — browser verification

Test date: 27 November 2026. Application: 0.43.1.

The Home redesign replaces stacked feature promotions with six consistent daily shortcuts,
keeps Saved PDFs and manual search prominent, groups utilities, and leaves installation
and About closed unless the engineer chooses otherwise. Existing routes, storage and
download handlers remain in use.

## Reproduction

Serve public/ on localhost. Run tests/verify-home-polish-browser.mjs against the normal
/app/#home entry point. The harness uses a new persistent browser profile under /tmp
and only synthetic PDF records.

    PLAYWRIGHT_MODULE=/path/to/playwright \
    FINDR_HOME_URL=http://127.0.0.1:4187/app/ \
    FINDR_HOME_BROWSER=chromium \
    CHROMIUM_EXECUTABLE=/usr/bin/chromium \
    node tests/verify-home-polish-browser.mjs

For WebKit, use FINDR_HOME_BROWSER=webkit and WEBKIT_EXECUTABLE when a custom runtime
wrapper is needed. FINDR_HOME_OFFLINE=1 first requires the actual service worker to
verify its complete release cache, then disables browser networking and reloads Home.
It does not substitute an intercepted network fixture or mocked cache.

## Scope

- Detailed and compact layouts at 320, 390, 820 and 1440 CSS pixels.
- Toolbox alignment, disclosure, minimum 44-pixel control targets and no page overflow.
- Independent installation/About choices and layout persistence across reload.
- Saved PDFs, Find a manual, Panel Pals, Panel Lab, Emulators, Menu maps, panel downloads
  and Quizzes reached through their actual Home links.
- Update app's offline error stays visible and retryable.
- Storage modal and native PDF file chooser still open; cancelling file selection is safe.
- Synthetic PDF bytes remain in IndexedDB after reload, saved counts stay accurate,
  and packs used and downloaded are not duplicated.
- Additional downloaded packs remain reachable through Show more.
- Reduced motion, normal motion after the startup finishes, and a 390 × 430 viewport.
- Offline runs cover Home reload, saved counts and navigation to existing workspaces.
  They do not claim new local-model inference testing or manufacturer PDF validation.

## Visual review

Actual browser screenshots were inspected for phone, iPad-sized and desktop layouts.
At 390 × 844, the empty Home page decreased from **5004 px to 1637 px**, approximately
**67% shorter**, with all feature entry points retained. baseline.json records the
original section heights.

Screenshots were kept under /tmp/findr-home-polish-qa/ during verification rather than
adding generated PNGs to the source repository. JSON files list the corresponding names.
No physical iPhone, iPad or Android device was available for this run.

## Results and WebKit diagnostics

| Environment | Result |
| --- | --- |
| Chromium 154.0.8037.57, normal | 12 checks passed, no page errors |
| Chromium 154.0.8037.57, actual offline cache | 14 checks passed, no page errors; cache verified in 11.3 seconds |
| WebKit 27.2, normal | 12 checks passed, no page errors |
| WebKit 27.2, actual offline cache | All 14 functional checks completed and cache verified in 13.4 seconds; strict zero-error assertion failed on native rapid-reload errors described below |
| WebKit 26.0, normal | Functional checks completed; strict zero-error assertion failed |
| WebKit 26.0, actual offline cache | Verification timed out at 180 seconds; no offline pass |

Both successful cache verifications returned build f522586dca36, version 0.43.1 and
verification sha256-v1. These timings measure this Linux execution environment only.

The preinstalled Playwright 1.57 / WebKit 26.0 runtime completed the functional Home
checks, but rapid reloads emitted native "Context is stopped" errors with empty stacks.
The unchanged 0.43.0 baseline at GitHub commit
c3c31a3016e7a811b2f88277e1430d571ee2ae04 reproduced the same error seven times during
twelve reloads with an IndexedDB settings write. See webkit26-baseline-reload.json.
These errors were retained rather than filtered out.

That older runtime also failed to return a verified offline cache within the harness's
180-second limit. Its failed diagnostic results are retained in webkit26.json and
webkit26-offline.json; they must not be described as an offline pass. The newer
Playwright 1.65.1 / WebKit 27.2 runtime was installed separately under /tmp for the
current-engine checks. This did not change application dependencies or source.

With the service worker enabled, WebKit 27.2 also emitted the same empty-stack
"Context is stopped" native errors around repeated reloads. Its Home, saved-count and
workspace-navigation assertions all completed with networking disabled, but the strict
zero-error assertion deliberately failed. Do not report this as a completely clean
WebKit browser run or as physical-device verification.

An additional unchanged 0.43.0 baseline run with WebKit 27.2 and the service worker
enabled reproduced eight identical native errors during eight reloads. See
webkit27-baseline-reload.json. This establishes that the rapid-reload diagnostic
predates the Home redesign; no unrelated runtime change was made for it.

Current browser runs and exact checks are recorded in chromium.json,
chromium-offline.json, webkit.json and webkit-offline.json.

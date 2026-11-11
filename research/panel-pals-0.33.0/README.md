# Panel Pals acceptance — web 0.33.0

Tested through the normal Panel Pals navigation, conversation, fault questions, reading forms and Give up controls. The final offline run verified **0.33.0**, build **295078358727**, with `sha256-v1` cached-asset verification before networking was disabled.

| Environment | Result |
| --- | --- |
| Chromium 154.0.8037.57, desktop 1440 × 1000 | 12 browser checks passed |
| Chromium 154.0.8037.57, portrait touch emulation 390 × 844 | 13 checks passed, including network-disabled reload, manual contact extraction and exact cited PDF page |
| Playwright WebKit 26.0 / WPE Linux, portrait touch emulation 390 × 844 | 12 online checks passed |

All **37 browser checks** passed with zero final page errors or navigation warnings. The full regression suite passed **1,567/1,567 tests**; TypeScript, production build and verification of **1,424 public files** passed.

The harness generates a clearly labelled synthetic three-page text PDF, saves its real bytes locally, and runs FINDR's real PDF extraction and indexing. The fixture uses **01632 960123**, an intentionally fictional reserved UK number, under a synthetic C-TEC heading. It is **not a real C-TEC support number and was never called**. This checks extraction and page provenance, not manufacturer contact accuracy. [The manual-contact extraction notes](support-sources.md) describe the separate source review.

Only the initial saved pal, an older pal without appearance, and synthetic manual are seeded. Questions, answer corrections, readings, work reasons, handover entries, downloads and navigation use actual UI controls and IndexedDB. No PDF reader output, search answer, phone contact or offline-ready flag is mocked. A real manual-search fallback answer retrieves the synthetic event-history passage; no local model inference was run for this presentation/handover release.

Verified behaviour:

- **Panel Pals** appears in navigation while the existing route and older saved helpers remain usable.
- The pal's selected mug icon and purple accent appear to the left of every assistant message, including a newly retrieved answer. User messages have no pal avatar. Message text and Sources remain readable at phone width, without horizontal overflow.
- The existing Sources dropdown opens the saved PDF at the exact cited page and stays expanded after return.
- Normal fault controls record an answer, its undo and a replacement answer. The normal reading forms retain an original `0 V DC`, a `24.1 V DC` correction with exact PSU terminals/load condition, and a separate `OL Ω` reading. An actual work-log form records its reason and result.
- **Give up saves first**, retaining all measurements, unresolved status, unknown restoration and unperformed functional retest. The chosen icon receives the comic reaction. Two dark-red pulses have a measured CSS duration of 1.15 seconds each; the screen returns to normal after approximately 2.5–2.6 seconds including navigation. No rapid bright flashing or sound is used.
- The reaction has a focused Skip control; portrait tap and desktop Escape both end it. Reduced motion goes directly to support. Reloading the saved handover does not replay the animation.
- UK technical-support text is extracted from the selected synthetic PDF, with the manual title, edition and PDF page 3. Opening that source renders the actual saved PDF. The UI identifies the number as printed in the manual and warns that old details may have changed.
- **Prepare for call** retains stop reason and return requirements. Its chronological list distinguishes reported observations, answer corrections, raw readings, superseded originals and work. Exact points, conditions, recorded reasons and outstanding restoration remain available; secondary job details and source metadata are expandable.
- The plain-text call export retains all recorded values and corrections. Chromium clipboard copy was verified using its real clipboard permissions/API. WebKit's copy control was exercised, but clipboard contents were not read there.
- With Chromium networking disabled, the prepared call reloads, the contact is found from the saved manual and its exact PDF page opens. The log remains unchanged.

The compact call screen was inspected after the UI revision. Representative artifacts are the final JSON reports, portrait conversation/reaction/support/call screenshots and `panel-pal-give-up-preview.webm`, a six-second excerpt of the actual portrait run. The video is a time excerpt only; its UI and animation were not altered. Full-page browser screenshots can include an off-viewport fixed skip-link in the compositor output; this was an existing screenshot artifact, not an app focus or layout change.

No physical iPhone or installed iOS PWA was tested. Desktop phone emulation does not reproduce the native on-screen keyboard. WebKit offline was not claimed: this installed WPE runtime's CacheStorage limitation was already independently reproduced in [0.32.7 QA](../helper-sources-0.32.7/README.md). This does not establish physical Safari behaviour. No actual support call, manufacturer procedure, electrical test or AI inference benchmark was performed.

Initial harness attempts are not release results. The script now waits for the selected question view before editing its fields, scopes duplicate quick-log buttons to their navigation, and opens the new Job details disclosure when checking secondary text after reload. Old failure screenshots and the initial `chromium-390.json` are excluded from release evidence.

## Reproduce

Serve `public` and use an installed Playwright browser:

```sh
python3 -m http.server 8093 --bind 127.0.0.1 --directory public
FINDR_PALS_MOBILE=0 FINDR_PALS_BUILD=295078358727 node scripts/verify-panel-pals0330-browser.mjs
FINDR_PALS_MOBILE=1 FINDR_PALS_OFFLINE=1 FINDR_PALS_BUILD=295078358727 node scripts/verify-panel-pals0330-browser.mjs
FINDR_PALS_BROWSER=webkit FINDR_PALS_MOBILE=1 FINDR_WEBKIT=/path/to/working/webkit-wrapper node scripts/verify-panel-pals0330-browser.mjs
```

`FINDR_PALS_QA_URL`, `FINDR_PLAYWRIGHT_PATH`, `FINDR_CHROMIUM` and `FINDR_WEBKIT` select local infrastructure. `FINDR_PALS_VIDEO=1` records the raw browser run. The measured WebKit run reused `/tmp/findr0327-webkit-run.sh` and its already installed user-local official Debian libraries.

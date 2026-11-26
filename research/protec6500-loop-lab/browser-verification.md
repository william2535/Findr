# Protec 6500 Loop diagnostics: browser verification

Tested 26 November 2026 against the actual FINDR static application, version **0.42.0**, service-worker build **fc785a81ee8e**, served locally from `public/`. No live fire alarm panel was connected. All exercise records were synthetic and used isolated browser storage.

## Results

| Browser environment | Result | Whole automated journey |
| --- | --- | --- |
| Chromium 154.0.8037.57, Linux, Playwright 1.65.1 | 11 checks passed; no page errors | 24.3 seconds |
| WebKit 27.2, Linux, Playwright 1.65.1, fresh persistent profile | 11 checks passed; no page errors | 40.7 seconds |

These durations measure the complete automation, including navigation, synthetic scenarios and storage checks. They are not measurements of a physical panel, a real one-hour test, or download speed. Browser results are retained in [browser-results.json](./browser-results.json).

Both environments exercised touch layouts at 390 × 844, 820 × 1180 and 1440 × 1000, plus a separate fine-pointer desktop context at 1440 × 1000. A 390 × 430 viewport with the notes field focused checked reduced-height layout. Reduced motion was enabled. Body width stayed within the viewport; larger diagrams and tables scroll within their own regions. The observation control met the 44px height check. Phone and tablet screenshots were visually reviewed, including the corrected separation between lower isolator labels and device addresses.

## Verified interactions

1. Entered through Home → Panel Lab → Loop diagnostics. Edited an existing matrix first and confirmed that the new exercise, navigation and reload did not change its saved data. The direct `#panel-lab/loops` alias also restored the exercise.
2. Checked different address and Map group ordering. The supplied survey uses addresses 42, 7, 65, 12, 3, 91, 27, 16; numeric sorting does not masquerade as physical order. Tied Map groups and independent survey positions are explained. Hints open through the actual controls.
3. Confirmed observation prerequisites and one-hour synthetic windows. Whole-loop interval deltas were 15 then 15 while the cumulative total became 30. Individual rows separately displayed attempts, interval missed replies and cumulative counts. Premature completion was rejected without changing saved actions.
4. Exercised half A, half B, section C and section D with resets and repeated equal windows. Their synthetic interval deltas were 0, 8, 5 and 0. Excluded devices were labelled **Not polled** with dashes, rather than presented as healthy zero readings. The evidence narrowed the synthetic candidate to section C.
5. Reloaded and navigated away/back, comparing the exact persisted action log and unrelated matrix data. This tested actual IndexedDB persistence rather than restoring a screenshot or scripted conversation.
6. Changed the virtual configuration after a final restoration observation and verified that completion was rejected. Restoring, resetting and observing again allowed completion while the handover retained continuing missed replies and unconfirmed electrical cause/repair. Downloaded the actual JSON export and checked its saved run, result and pinned sources.
7. Completed the intermittent scenario with intervals 15, 0, 15; the quiet hour did not exclude an intermittent fault. The incomplete-topology scenario supplied no invented route, disabled section splitting and kept address 16 unpolled. Its unresolved handover retained incomplete coverage rather than claiming a healthy full loop.
8. Used real citation buttons. An unsaved source opened the manual chooser. The reviewed PDF, saved through the application's normal `saveManual` IndexedDB API, opened at PDF page 21. Replacing its actual bytes with a different valid PDF while forging matching metadata did **not** inherit that page claim: the reader opened at page 1 with the edition-mismatch notice. The original PDF was then restored for offline verification.
9. Injected a quota exception specifically into the exercise save. Existing saved actions survived, the storage failure was visible and Retry saved the pending action. An unsupported saved schema remained preserved with a recovery message; it was not silently replaced. These are injected failure checks, not a claim that a physical device was filled to capacity.

## Actual offline verification

Each browser installed the real service worker and received `ready: true`, `verification: "sha256-v1"`, `version: "0.42.0"`, `build: "fc785a81ee8e"` from `CHECK_OFFLINE`. Networking was then disabled with the browser automation's offline control. In that state the test:

- Reloaded the exercise and its persisted state.
- Performed Map review, survey acknowledgement, reset and a new one-hour synthetic observation through the UI.
- Opened the actually saved reviewed PDF at page 21 in the PDF reader.
- Reloaded again and confirmed the new observation and existing matrix remained saved.

The reviewed manual was Protec Algo-Tec 6500/6600 Commissioning Manual **RDM0002/2_4**, dated 11 December 2017, SHA-256 `0e841fa49b0a24fac91d5c7cde6987e4b311974d0a96ee78643e0ca17a2bfeb0`. It was supplied as an actual PDF fixture acquired during the separate source audit, not fabricated content. The harness stored the bytes via the real manual-storage API; it did not exercise a new manufacturer download through the chooser. The manual is not bundled in source. See [SOURCE-AUDIT.md](./SOURCE-AUDIT.md) for document acquisition and the limits of its edition.

## WebKit environment finding

The initial Linux WebKit ephemeral context passed the first eight interaction checks but could not save a PDF Blob. A minimal independent IndexedDB probe reproduced native `UnknownError: Error preparing Blob/File data to be stored in object store` even for a three-byte Blob; text and a 1.7MB Uint8Array succeeded. The same probe in a fresh persistent profile passed all four formats. The final WebKit run therefore used a fresh isolated persistent profile and passed with actual Blob records, PDF rendering and offline operation. No application change or array substitution was used to hide the initial failure.

## Reproduction and remaining limits

Harness: `tests/verify-protec-loop-browser.mjs`. With a compatible Playwright/browser installation, serve `public/` over localhost, then run:

```sh
FINDR_LOOP_OFFLINE=1 FINDR_LOOP_MANUAL=/path/to/reviewed-commissioning.pdf node tests/verify-protec-loop-browser.mjs
FINDR_LOOP_BROWSER=webkit FINDR_LOOP_OFFLINE=1 FINDR_LOOP_MANUAL=/path/to/reviewed-commissioning.pdf node tests/verify-protec-loop-browser.mjs
```

`PLAYWRIGHT_MODULE`, `FINDR_CHROMIUM`, `FINDR_WEBKIT`, `FINDR_LOOP_URL` and `FINDR_LOOP_OUTPUT` allow local installation/server overrides. Without `FINDR_LOOP_MANUAL`, the harness explicitly reports that the saved-PDF pin and reader checks were skipped. Screenshots and detailed logs from this run remain in `/tmp/findr-protec-loop-qa`; they are not runtime assets.

No physical iPhone/iPad, installed Apple PWA, actual soft keyboard, physical panel, wiring change, battery usage or current panel firmware was tested. A reduced viewport checks available screen space but is not a hardware keyboard test. The external X600 mapping reference still requires internet access; only the separately saved reviewed commissioning PDF was demonstrated offline. The simulator does not establish a manufacturer “Split Loop” command, a live disconnection method, a repaired system or parity with newer firmware. Those boundaries remain visible in the feature and source audit.

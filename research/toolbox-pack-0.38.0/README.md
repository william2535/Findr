# Tool box pack and scoped manual search: browser verification

Verified 12 November 2026 against web **0.38.0**, offline build **df788a7d9a0a**. Run with `scripts/verify-toolbox-pack0380-browser.mjs`.

## Results

- **Chromium 154.0.8037.57: 7 online checks passed.** Normal Home secret Tool box icon opened the download screen. The screen reported the actual 16,473-byte download. Cancellation preserved the first completed file; a subsequent failed request left the pack incomplete; Retry downloaded the remaining files without fetching the first file again. All seven files passed the application's SHA-256 verification.
- **WebKit 26.0: 6 online checks passed.** Repeated the real download/cancellation/failure/retry, calculator, picture-guide, layout and data-preservation journey.
- **Chromium: 3 cold-offline checks passed.** After the actual service worker proved the final build, networking was disabled before reloading. All six downloaded calculators and six local SVG guides worked. The saved Panel Pal conversation resumed, found the MxPro5 event-history reference and opened its saved PDF at page 24.

Both online runs used the real public GitHub content pinned at commit **d6cfb85034994f73cbbf6b24a8490a9002ed7c62**:

`https://raw.githubusercontent.com/william2535/Findr/d6cfb85034994f73cbbf6b24a8490a9002ed7c62/toolbox-packs/onsite-v1/`

Successful download responses were never replaced with fixtures. To make cancellation deterministic for this small pack, the browser harness delayed the second network request until the normal Cancel button was pressed. It then aborted that request once during the next attempt to test failure recovery. These are **injected transport faults**, not naturally observed GitHub failures. The final successful requests retrieved actual GitHub bytes.

## Calculations and guides

Normal UI checks verified these representative results:

| Tool | Inputs | Result checked |
| --- | --- | --- |
| DC current and power | 24 V, 120 Ω | 0.2 A; 4.8 W |
| Series / parallel resistors | 1,000 Ω and 2,000 Ω | 3,000 Ω; 666.66667 Ω |
| CCTV storage | 2 cameras, 4 Mbit/s, 24 hours/day, 7 days | 604.8 GB; 0.6048 TB |
| Camera bandwidth | 8 cameras, 4 Mbit/s, 1 stream, 100 Mbit/s link | 32 Mbit/s; 32%; 68 Mbit/s nominal spare |
| PoE budget | 4 devices, 15 W each, 60 W total, 30 W port limit | 60 W allocation; 0 W total spare; 15 W port headroom |
| DC load total | 8 loads, 50 mA, 24 V | 0.4 A; 400 mA; 9.6 W |

All six picture guides rendered their saved SVG bytes with readable alternate text, cautions and reference links. Their supporting external websites still require a connection. Primary pack controls met a 44 px height check, and layouts had no horizontal overflow at **320, 390 and 1440 px**. Screenshots include the saved-pack screen and an actual rendered guide.

## Panel Pal checks

The Chromium profile already contained real, previously processed MxPro5 manufacturer PDFs:

- `advanced-0254975c10bd`: MxPro5 User Manual, 680-166 Rev 04.
- `advanced-a18ea5cccf04`: MxPro5 Product Manual, 680-165 Rev 05.

Through the normal composer, “Where do I set the clock?” cited the user manual at PDF page 39, and “How can I look up old alarms?” cited PDF page 24. Each recorded search plan was scoped to the selected helper's manuals with no more than three attempts. A second, product-manual-only pal did not cite the first pal's user guide. The cold-offline follow-up “Where is the event log?” cited and opened saved PDF page 24.

These replies were explicitly labelled **Manual search / no AI**. No local model or online provider inference was used or claimed. The test did not establish general natural-language understanding beyond these scoped retrieval cases.

Original manual metadata, existing helper jobs and original calculator drafts remained unchanged. New test conversations were clearly identified as QA fixtures. No model downloads, provider requests or page errors were observed; the cold-offline run made no GitHub asset request.

## Limits and initial harness issue

This was Linux Chromium and WebKit browser testing, including emulated phone viewports. No physical iPhone, Android APK or native on-screen keyboard was tested. WebKit offline operation was not claimed because this executor has a known CacheStorage limitation. Insufficient-storage and additional validation cases are covered separately by implementation tests, not by this browser run.

The first Chromium attempt reused a profile still controlled by the older 0.36.1 service worker. Blocking new service-worker registration did not remove that existing controller, so the harness saw the old Home screen and timed out looking for the new layout. There was no page exception. The harness was corrected to run the real service-worker update, verify the final build and reload before the acceptance checks. The original failed screenshot is preserved at `/workspace/findr038-first-attempt/browser-chromium-online-failure.png`; the JSON files here contain the final passing runs.

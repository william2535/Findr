# Panel Lab browser verification — 26 November 2026

The actual app was served at `http://127.0.0.1:4177/app/`, starting from Home and the normal Panel Lab navigation.

| Environment | Result | Evidence |
| --- | --- | --- |
| Linux Chromium 154.0.8037.57 | Passed, including verified-shell offline reload | `chromium-offline.json` |
| Linux WebKit 26.0 | Passed online | `webkit.json` |

The browsers used emulated 320, 390 and 1440 pixel widths. A focused form was also checked at 390 × 430 pixels to represent reduced available screen space. These are not physical iPhone tests or a claim that a native iOS keyboard was opened.

The reusable harness is `scripts/verify-panel-lab-browser.mjs`. Run with `FINDR_LAB_BROWSER=webkit` for WebKit or `FINDR_LAB_OFFLINE=1` for the offline pass. It supports `FINDR_LAB_URL` for a different preview address.

Verified through visible controls:

- Home no longer has the Zone Sketch promotion; normal navigation opens Panel Lab.
- Creating, naming and editing a project saves real inputs, outputs, connections, AND logic, a ten-second delay and a latch.
- Enter and Space toggle a matrix cell while retaining keyboard focus.
- Triggering two causes, advancing time, isolating/restoring an output, clearing causes and resetting produce the expected output states. The eleven-second simulation and event log survive reload.
- JSON and test-log downloads contain the actual configuration and simulation. Import creates a separate identity. Invalid JSON leaves existing projects intact. Delete cancellation preserves the project; confirmed deletion preserves the other project.
- A blank challenge fails; the requested connections pass; subsequent edits clear the current grade. Historical completion survives navigation and reload.
- Seven logic challenges and ten panel lessons are present. The source button opens the existing manual-selection dialog. Opening the first CFP lesson starts its real trainer at step zero and does not award completion. A downloaded manufacturer PDF was not added as part of this browser run.
- An explicitly injected IndexedDB `QuotaExceededError` produces a visible recovery message, blocks opening another project, allows export of unsaved work and succeeds on Retry after the injection is removed. This is fault injection, not a physical low-disk test.
- Reduced-motion reload and unrelated stored reading data remain intact. Page widths fit the viewport; the matrix uses its own horizontal scroller and cells have at least 44-pixel targets.

The final Chromium offline pass verified the application's SHA-256 shell readiness for web **0.41.0**, build **`aba35152880b`**, before disabling networking. A cold reload, saved project, simulation input and another reload, and a new challenge with grading all succeeded without network access. No page exceptions or external requests were recorded by the harness. WebKit was verified online; physical Android/iOS and WebKit offline remain untested.

Two defects caught before publication were corrected: oversized valid matrices could exceed the original import limit, and matrix focus keys included changing ARIA state. The final runs include the corrected import bound and stable keyboard-focus behaviour.

Earlier `*failure.png` captures, if retained locally, are superseded debugging artifacts and are not final-pass evidence.

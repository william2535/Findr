# Phone spark visibility — web 0.39.3

## Evidence and repair

The previous effect placed most tiny bursts in clipped 12px gutters and faded rapidly, with up to four seconds between bursts. Every window resize cancelled all particles and restarted a 450ms delay. A WebKit 26.0 reproduction with 20 repeated portrait viewport changes observed **zero active samples** (`resize-before.json`). This establishes resize starvation; it does not establish the user's exact iPhone setting or a Safari-only canvas defect.

The revised scheduler preserves the current burst and next timer while coalescing resize work. Because changing canvas dimensions clears its bitmap, existing particles are redrawn in that same frame. Larger warm-yellow cores and soft halos fade over 2.2 seconds, with 0.65–1.55 second quiet gaps. Every third burst has a shooting trail. Open-space selection checks the glow and travel corridor, avoids the visible header, and falls back to gutters when the page is dense.

The existing behind-content stacking remains: screenshots established it renders in both engines, so no speculative stacking changes were made. No animation preference control, logo shine, shiny tiles or background grid was added. Reduce Motion still clears and hides decorative particles. Real device preferences were not available to inspect.

## Final verification

- All 1,960 Node regression tests passed, no failures/skips; typecheck, production build and public-build verification passed.
- Linux Chromium **154.0.8037.57**, WebKit **26.0**, emulated mobile at 390 × 844 with device scale 3. Canvas backing resolution capped at 2 for resource use.
- Final 20-resize test: actual visible particle pixels in **13/20** samples in each browser. Idle samples are expected between bursts.
- Rendered screenshot comparison (with a no-canvas reference) found **3,084** changed yellow pixels in Chromium and **2,965** in WebKit around the observed burst. Real-time alpha samples decreased gradually and retained soft edges. Shooting bursts were observed without fabricated particles or clock changes.
- Controls remained clickable at 320, 390 and 1440px; no horizontal page overflow; Reduce Motion clears/suppresses particles; no page errors.
- Chromium's final verified shell `314c7ceab33e` cold-reloaded offline and displayed the new particles. WebKit offline was not tested in this check.
- Visually inspected final WebKit screenshot for visible yellow glow and smooth edges.

This is browser emulation, **not physical iPhone Safari/PWA testing**, and does not benchmark phone battery use or Low Power Mode. The first WebKit media-preference test used an overly short fixed100ms wait; the final test waits for the actual media-change handler and verifies hidden/empty state rather than assuming event delivery timing.

Run from the repository root with preview on port4173:

```
SPARK_BUILD=314c7ceab33e node scripts/verify-sparks0393-browser.mjs
SPARK_BROWSER=webkit node scripts/verify-sparks0393-browser.mjs
```

The script uses the installed Playwright and browser executables documented in its source. Android remains0.37.0; no APK rebuilt.

# Motion visibility correction — 0.30.1

The 0.30.0 effects were running, but the first Home view did not make that clear on a touch screen. In a fresh 390 × 844 Chromium capture of the published 0.30.0 site, the Home title and three main action buttons changed **zero pixels** during the sampled five seconds. Most of the remaining Home content was still; its animated rail changed at most 0.094% of that region. The large card with a sweep began at y604. The user also confirmed their footer already showed 0.30.0.

The correction puts a light sweep on the visible Home title and main buttons, shortens quiet periods, adds a sweep to the selected navigation item, and exposes the actual effects state plus a **Replay effects** button in Help. Replay now resets pseudo-element animations as well as the title. The neutral black, white and yellow palette is retained.

## Actual-pixel verification

[`verify-motion0301-visibility.mjs`](../../scripts/verify-motion0301-visibility.mjs) checks screenshots, not just computed `animation-play-state`. Each region is sampled at 0, 350, 750, 1,200 and 1,800 ms after Home is ready and a 280 ms settling delay. A pixel counts as changed when at least one RGB channel differs by more than 12/255 between a pair of frames. The figures below are the largest observed pairwise change within that window. Both regions must exceed 1%, so a moving one-pixel border cannot pass by itself.

| Browser environment | Viewport | Title changed | Main action area changed | Focused checks |
| --- | --- | ---: | ---: | ---: |
| Chromium 154.0.8037.57, touch/no hover | 390 × 844 | 16.542% | 23.216% | 9 passed |
| WebKit 26.0, touch/no hover | 390 × 844 | 17.098% | 22.176% | 9 passed |
| Chromium 154.0.8037.57, desktop | 1280 × 844 | 9.012% | 22.888% | 9 passed |

All runs used a Linux container. No physical iPhone was available. WebKit and touch emulation do not establish performance or compatibility on the user's iOS 26.5.2 device. No frame-rate or battery measurements are claimed.

The three runs also verified recurring motion after the entrance, no horizontal page overflow, the requested navigation order, Help state, Replay returning to the current page, resetting visible title/gloss/edge clocks, and visible motion after replay. User **Off** and OS **Reduce Motion** each produced zero changed pixels in both regions over the sampled 1.5 seconds. Off survives reload. Reduce Motion disables the toggle and replay with an explicit explanation. Completed terminal messages remain stable. No uncaught page errors were recorded.

The existing browser regression run adds **14 passing checks**, giving **41 browser check results** across these four runs. It verifies the emulator chooser and unchanged Minerva fascia, new terminal typing versus stable history, a keyboard-sized viewport, local PDF import/viewing without moving document pixels, and verified offline shell reload/navigation/preferences without external requests. The installed shell was 0.30.1 / `e95a7d6d05ac`; both motion resources were cached. Background visibility was tested through a simulated visibility event, not physical OS backgrounding. Its evidence is in [`regression-chromium-offline.json`](regression-chromium-offline.json).

The release verification also completed the full Node regression suite: **1,358/1,358 passed** in 39.8 seconds. TypeScript checking, the production build, and public-build verification passed (1,393 public files; 165,354,096 bytes). A successful build does not establish publication.

## Evidence and reproduction

- [Old published 0.30.0 baseline](baseline-0.30.0.json), with [initial](baseline-0.30.0-0.png) and [five-second](baseline-0.30.0-5000.png) frames. Its title and action measurement boxes match the new Chromium phone run.
- [Touch Chromium results](visibility-chromium-390.json), [touch WebKit results](visibility-webkit-390.json), and [desktop results](visibility-chromium-1280.json), with retained strongest-difference screenshots.
- [23-second phone-width recording](visibility-chromium-390.webm) showing the visible sweeps, Help and replay, preference controls, and stable terminal text.

With the app served on `http://127.0.0.1:8088`, run:

```sh
FINDR_QA_WIDTH=390 FINDR_QA_VIDEO=1 node scripts/verify-motion0301-visibility.mjs
FINDR_QA_WIDTH=1280 node scripts/verify-motion0301-visibility.mjs
FINDR_QA_BROWSER=webkit FINDR_QA_WIDTH=390 node scripts/verify-motion0301-visibility.mjs
```

The harness uses this workspace's Playwright installation, `/usr/bin/chromium`, `/tmp/findr027-webkit-run.sh`, and Python/Pillow. `FINDR_QA_URL` overrides the local origin. Visibility tests block service workers to isolate current asset rendering; offline installation is covered by the separate regression run. These artifacts verify the local release candidate, not publication. The release workflow records build and publication separately.

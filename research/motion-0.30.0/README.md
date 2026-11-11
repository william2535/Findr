# FINDR 0.30.0 — motion verification

The reference is the user's [Zone Sketch by Will Flood v0.64](https://github.com/william2535/FIRE-ZONE-PLAN-APP/blob/main/ZoneSketch.html): diagonal gloss, travelling edge highlights, quick surface reveals, offscreen/hidden-tab pauses and a stored motion preference. FINDR adapts that pattern to its neutral white/yellow palette. No blue/green site hue is reintroduced.

## Browser checks

The normal entry points passed **13 checks each** in Linux **Chromium 154.0.8037.57** at **390×844** and **1280×844**, and Linux **WebKit 26.0/WPE** at **390×844**, with zero uncaught page errors. These are browser environments, not physical iPhone/Android tests.

- Existing main-navigation order and responsive layout remain intact.
- Real elapsed animation time advances for visible gloss/edge effects; screenshot captures show actual moving highlights.
- Scrolling a decorated surface outside the viewport pauses its animations.
- The visibility-change handler pauses ambient effects. This particular check uses a temporary `document.hidden` override to exercise the handler; it does not claim native operating-system backgrounding was tested.
- Help's **Interface effects** switch stops decoration immediately, survives reload and can re-enable it without a reload.
- The browser's reduced-motion preference dynamically suppresses decorative animation.
- Emulator library cards remain usable; the physical Minerva cabinet, display and LEDs receive no added decorative animation.
- Quick Questions still visibly types new output; older completed transcript entries remain unchanged and do not replay.
- The reply controls remain reachable at a keyboard-like **390×500** viewport.
- A labelled synthetic local PDF imports through the normal Manual library picker, opens in the existing reader and renders without moving document pixels.

An additional portrait route scan checked Home, Manuals, panel packs, devices, wiring pictures, branded wiring packs, Menu maps and Emulators. Each intended card surface received the shared styling; none caused horizontal overflow. See `route-coverage.json`.

The short [Chromium portrait recording](browser-chromium-390.webm) is a real-time **9.28-second** UI recording (910,497 bytes). Adjacent screenshots and JSON reports retain the observed styles and checks. Physical touch hardware, low-end phone frame rates and battery performance were not benchmarked.

## Installed offline check

Chromium passed **14 checks** with verified service-worker build **6d367add625c**, version **0.30.0**. The **1,336-asset** shell contains both `motion.mjs` and `motion.css`. After networking was disabled, reload, Home decoration, navigation and the saved off preference all worked. No external request or uncaught page error occurred. See `browser-chromium-390-offline.json`.

No WebKit offline claim is added; its known Linux/WPE CacheStorage verification gap remains separate from the passing online WebKit checks. There is no new external animation library, font download or inference requirement.

## Reproduce

Use the prepared static public directory (for example port 8088), then run:

```sh
FINDR_QA_WIDTH=390 node scripts/verify-motion030-browser.mjs
FINDR_QA_WIDTH=1280 node scripts/verify-motion030-browser.mjs
FINDR_QA_BROWSER=webkit FINDR_QA_WIDTH=390 node scripts/verify-motion030-browser.mjs
FINDR_QA_OFFLINE=1 FINDR_QA_RESULTS=/tmp/findr-motion-offline.json node scripts/verify-motion030-browser.mjs
```

The offline run must use the final prepared manifest. `FINDR_QA_VIDEO=1` optionally records the UI. Publication and the release commit are handled separately; these local checks do not establish deployment or a signed APK.

# FINDR web0.37.1 — compact Home, hidden Tool box and yellow sparks

## Behavior

Home offers Detailed and Compact grid layouts. Compact view uses narrower shortcut/pack cards, less padding, and expandable installation/about guides; it never changes browser zoom or hides saved-PDF counts, offline status or actions. At narrow widths below350px the main shortcut cards return to one column. All choices are local display preferences under `findr:home-view:v1`; manuals, jobs and calculator draft stores remain separate. Storage write failure produces a visible toast while the current view still works.

The final Tool box control is an icon-only48×48px square directly beneath the view options. It has a native keyboard-operable disclosure, a Tool box accessible name and hover tooltip. Opening it reveals the four existing calculator links. Open state and view selection survive reload/navigation. The larger labelled Tool box card seen in earlier evidence is superseded by the final icon check.

Open Zone Sketch appears at the top of Home and opens [the verified beta-tester hub](https://william2535.github.io/FIRE-ZONE-PLAN-APP/beta.html) in a separate tab with noopener/noreferrer. HTTP200 and canonical URL were checked against the actual GitHub Pages beta.html, whose title identifies the Zone Sketch Tester Hub (web/Androidv0.64). This external page is not claimed as part of FINDR’s offline cache.

## Sparks

`ambient-sparks.mjs` paints actual warm-yellow antialiased arcs, radial alpha gradients and short rounded trails on a transparent, pointer-inert canvas behind the interface. Bursts start bright, fade fully, and alternate with idle periods. Every fourth burst shoots; position, flecks and delays vary. No rectangular particle images, background grid, logo shine, simulated loading, model calls or remote assets are used. The existing heading glow remains. Canvas backing resolution follows device pixel ratio up to2; drawing stops between bursts. Reduced motion, page hide and visibility changes cancel work and clear particles. The canvas is aria-hidden and never intercepts clicks.

## Evidence and limits

The initial populated Home comparison (before the final icon/Zone Sketch placement) measured Detailed→Compact page heights of5051→2612px at390px,5995→2977px at320px,3405→1619px at1440px:48–52% less scroll. Comparing both layouts with guides expanded still reduced height. Its seven Chromium checks included keyboard, preferences, saved-data preservation and a real service-worker cold-offline reload. Those screenshots are retained as development-stage evidence rather than relabelled final screenshots.

Additional actual-animation checks passed5/5 in Chromium154 and5/5 in WebKit26. They observed naturally scheduled particles and shooting trails without injecting particles or time. Rendered-page image comparisons found248/261 changed warm-yellow pixels, soft intermediate-alpha edges and complete fade to transparency. Reduced-motion changes immediately stopped and cleared the canvas; pointer pass-through, Zone Sketch target/new-tab attributes and Compact grid were checked. The screenshots were visually inspected for soft edges and the expected black/yellow theme.

Headless Chromium/WebKit did not report document.hidden after a real tab switch, so real background-tab suspension is not claimed from that environment. The implementation handles visibilitychange/pagehide, but physical iPhone/Android behavior remains untested. WebKit offline caching remains unsupported by this executor. Final icon-position and current-build Chromium cold-offline evidence is recorded separately alongside these files.

This is a web/PWA release. APK0.37.0/code27 and its verified binary/checksum remain unchanged; no new APK installation is claimed.

## Final verification

Final build `bd8308995bf3` passed the secret-icon check at320/390/1440px, native keyboard disclosure, saved preferences, and a real Chromium cold-offline reload after service-worker readiness. Offline particles rendered, the normal resistor calculator returned1kΩ, and synthetic saved logs/manual metadata stayed unchanged. The final screenshot uses an inlineSVG external-link arrow to avoid the missing-font square observed in Chromium. The final DOM shape and all browser resources were verified; the preceding full regression suite passed1,872 tests, with zero failures/skips, and TypeScript/production build/public asset gate passed. Physical devices were not available.

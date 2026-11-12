# Home artwork and compact view controls — 0.39.2

The owner-supplied 1280 × 319 JPEG is bundled unchanged at `public/app/images/zone-sketch-banner.jpg` (69,867 bytes; SHA-256 `de813061ab8de4a1a3c502ba7b81471123e473f588ad6c9a1657fa1cc7ef5af8`). It remains a link to the existing Zone Sketch beta page. Only the banner asset is included; uploaded phone screenshots are not published.

The Detailed and Compact grid buttons now display info/grid symbols only. Accessible labels, titles, pressed state, 44 × 44 px tap targets and the existing local preference remain. The group is 102 × 54 px at the tested widths.

## Verified

- All 1,960 Node regression tests passed, zero failures/skips.
- `pnpm exec tsc --noEmit`, `pnpm build`, and `node scripts/verify-public-build.mjs` passed.
- Linux Chromium 154.0.8037.57 and WebKit 26.0: original artwork loads without cropping; correct beta URL/new-tab attributes; layouts work at 320, 390 and 1440 px with no horizontal page overflow; saved view and Tool box state survive reload; reduced-motion controls work; no page errors.
- Chromium with networking disabled: verified final shell `d31cfc89d315`, cold reload, original banner decoding, view toggle and second reload with saved grid preference passed.
- Visually inspected 390 px screenshots in both engines. These are emulated viewports, not a physical iPhone. WebKit service workers were blocked in the layout test; offline verification was Chromium only.

The initial offline harness used an async `waitForFunction` predicate. This installed Playwright version treats the returned Promise as truthy before the controller is ready. Replaced that test wait with explicit awaited evaluation/polling, confirmed the controller and verified build, then reran successfully. No production service-worker change was needed.

Android remains 0.37.0; this release does not rebuild an APK.

Run `HOME_ART_BUILD=d31cfc89d315 node research/home-art-0.39.2/browser-check.mjs`; set `HOME_ART_BROWSER=webkit` for WebKit layout checks. See JSON evidence and screenshots alongside this document.

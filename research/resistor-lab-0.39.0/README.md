# Resistor Lab verification

Tested against the actual application at `http://127.0.0.1:4173/app/#resistor-lab` on 12 November 2026. Browser scripts block service workers to test current source deterministically; the release's separate offline test uses the final prepared cache.

- `browser-check.mjs`: normal route, real calculations and IndexedDB. Chromium 154.0.8037.57 and WebKit 26.0, Linux, 320/390 px viewport. Checks valid results, actual topology movement, open branches, invalid edits, saved reload, clear/add, stock limits and cancellation. No model or calculation mocks.
- `storage-check.mjs`: isolated controller with explicitly injected quota errors and delayed writes. Verifies prior record preservation, retry and serialized writes. This does not simulate physically filling an iPhone's storage.
- `chromium.json`, `webkit.json`, `storage.json`: recorded results, including measured default-search elapsed time. Browser timing includes UI response and test observation; it is not a physical-device benchmark.
- `chromium.png`, `webkit.png`: screenshots after cancellation.
- `tests/resistor-lab.test.mjs`: 12 focused algorithm/state tests.

A standalone Node measurement of the maximum search used 12 distinct values (100, 150, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700, 6800 Ω), a 1100 Ω target and four parts. It examined 62,184 arrangements in approximately 397 ms on this Linux execution environment, with the longest measured chunk between progress/yield points about 24 ms. This is not a mobile speed guarantee. The UI default uses at most three parts.

To reproduce, serve `public` on port 4173, then run from the repository root:

```sh
node --test tests/resistor-lab.test.mjs
node research/resistor-lab-0.39.0/browser-check.mjs
LAB_BROWSER=webkit node research/resistor-lab-0.39.0/browser-check.mjs
node research/resistor-lab-0.39.0/storage-check.mjs
```

The browser harness uses this environment's Playwright installation and Chromium/WebKit executable paths; other environments must supply corresponding paths. No physical iPhone, physical Android, power-rating test or manufacturer circuit validation was performed. The tool is an ideal resistor-network calculator.

# FINDR web 0.28.0 — release verification

## Shipped

The shared site theme is neutral charcoal/black with white/grey text and FINDR yellow actions. Green glow, backgrounds and terminal output are removed from Home, Fault Finder, Quick Questions, Manuals, Menu maps, hints, reports and resource panels. Physical panel LCDs and LEDs retain their equipment colours. Terminal typing, navigation and reduced-motion support are preserved.

Tyco Minerva MX and MX2 have separate source-shaped fascias in the existing emulator grid/list library. Both use the verified Firmware 5.0 operating manual, 17A-05-O Issue 5 (11/04). The trainer has **HINTS**, **FIND A MENU**, physical-key guidance, seven guided tasks, a searchable shared atlas, source-page links and persistent fictional practice. It reuses the shared manual library, reader, hints sound preference and offline cache.

The source tree has 74 entries: 71 unconditional supported routes, conditional Restart, and two explicit reference-only boundaries. The shared atlas has 82 entries including seven authored tasks and their group; 79 explicit hint links. Hints are replay-tested from fresh and incorrect menu positions, and stop before committing isolations, walk tests or configuration changes. Restart is only available after a deliberate saved text edit. Undocumented Diagnostics submenus and the unnumbered Software Initialisation Count selector are not fabricated. See the source README for exact discrepancies and scope.

The Tyco pack gains two documented panel figures and its already-catalogued operating manual. Older catalogue bytes, manual IDs, other packs, wiring, keypad maps and fire-source data remain intact; preservation tests reconstruct the old snapshots after excluding only these explicit additions. The database schema, saved PDFs and investigation/question histories are unchanged. Minerva practice uses its own `minerva-mx-emulator-v1` setting.

## Checks

- **1,317 tests passed, zero failures** in the full Node regression suite.
- **33 Minerva tests passed**, including independently audited source behaviour, all unconditional hint routes, conditional Restart, access gates, report printing, point-category ranges, network-panel scoping, isolation/restoration, walk tests, correction-free source references and text persistence.
- Generated menu map consistency check passed.
- TypeScript `--noEmit`, production build and public-artifact validation passed.
- Chromium 154 on Linux: 12 checks at 390×844 and 11 at 1280×844, through the real emulator entry point. Covered neutral chrome, HINTS, menu search, wrong-turn recovery, manual key presses, deliberate isolate/de-isolate, reload, MX/MX2 selection and phone touch targets.
- Linux WebKit 26: 12 checks at 390×844 passed, with no uncaught page errors. These are phone-sized browser checks, not a physical iPhone test.
- Installed Chromium: 13 checks passed on verified service-worker build `f77ccfeeea38`. With networking disabled, reload retained the Minerva practice state, and HINTS/FIND A MENU worked from the cache. No external requests or page errors occurred in the offline phase.

The early checks found and corrected report-print actions, field ranges/year entry, foreign-panel handling, walk-test type filtering, stale text after reload and the active lesson URL. An initial preservation failure reflected the two intended panel additions; the tests now verify every older byte after reconstructing the original snapshot, without changing historical hashes. The final full suite is green.

## Build and limits

Web **0.28.0**, offline build **f77ccfeeea38**, 1,331 offline assets / 106,007,756 bytes. Production contains 1,384 public files / 164,778,748 bytes. Largest static asset remains 24,126,768 bytes, below 25 MiB. The deployment cleanup excludes archived release APK artifacts from the build only.

This is a manual-backed fictional trainer, not hardware/firmware certification. Only the cited Firmware 5.0 scope is established; later Minerva releases and undocumented engineering procedures are outside the verified coverage. No physical iPhone or live panel was tested. WebKit offline processing limitations from 0.27 are not reclassified by this Chromium-only offline check. No new signed APK was built; the signed Android release remains 0.14.1.

Browser JSON files and source-shaped cabinet screenshots in this folder record the actual environments. Total installation time and physical-phone performance were not benchmarked. Publication is checked separately after the source commit is pushed and deployed through the existing public Sites project.

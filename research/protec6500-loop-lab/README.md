# FINDR 0.42.0 verification

Protec Algo-Tec 6500 loop practice, 26 November 2026.

- Full stable Node regression: 2,040 tests, 2,039 passed, zero failed, one skipped. The existing skipped manufacturer fixture requires the original reviewed PDF bytes, which are not bundled. The earlier development runs caught the expected stale offline manifest while UI edits were still in progress; the final regenerated manifest and complete suite passed.
- Focused loop engine: 12 tests pass, including unknown topology, incomplete polling coverage, cumulative/reset semantics, repeated comparison evidence, premature restoration, corrected conclusions and validated saved-action replay.
- TypeScript no-emit check and JavaScript syntax checks passed.
- Production framework build and public asset gate passed: 1,552 public files; 167,691,045 build bytes. Original historical APK bytes needed by the existing build gate were supplied from the verified source checkout; no new Android build was created.
- Installed offline shell: version 0.42.0, build `fc785a81ee8e`, 1,456 hashed assets / 127,613,341 bytes.
- Existing Panel Lab Chromium browser regression passed all eight groups, including matrix editing, timed simulation, imports/exports, challenge grading, lessons, injected storage recovery and reduced-motion reload. See `existing-panel-lab-regression.json`.
- New browser journey results and environment limits are recorded in `browser-verification.md`.

The simulation uses manufacturer menu references and separately labelled synthetic survey/counter data. It is not a full 6500 emulator, real panel connection, live disconnection procedure, repair certificate or verification of current P5.7 screen parity. Reviewed source editions and limitations are in `SOURCE-AUDIT.md` and `sources.json`.

No physical iPhone, iPad or Android test, APK/AAB rebuild or Play rollout is claimed for this web release.

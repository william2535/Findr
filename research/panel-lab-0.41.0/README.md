# FINDR 0.41.0 verification

Panel Lab and premium Home update, 26 November 2026.

- Full Node regression: 2,028 tests; 2,027 passed, zero failed, one skipped. The skipped check requires the original reviewed manufacturer PDF bytes, which were not downloaded again for this release.
- TypeScript no-emit check: passed.
- Production framework build and public asset gate: passed (1,549 public files).
- Offline shell: version 0.41.0, build `aba35152880b`, 1,454 hashed assets.
- Chromium 154.0.8037.57 and WebKit 26.0 on Linux: full Panel Lab UI journey passed at 320/390/1440px, including focus and a reduced-height layout.
- Chromium: installed shell cold-reloaded with networking disabled; saved matrix/simulation and a new challenge worked offline.
- Sparks: actual rendered yellow pixels, soft edges, fading and shooting trails verified in Chromium at phone width. Reduced motion and pointer safety checked.

See [browser verification](browser-verification.md), [lesson source scope](practice-sources.md), and [preservation regression audit](preservation-regression-audit.md). JSON and screenshots alongside these notes contain browser evidence. Storage-full recovery uses a deliberately injected quota error; it is not a claim that a physical device was filled.

No physical iPhone/Android or WebKit-offline test. No new native APK/AAB or Play rollout. Manufacturer lessons reuse existing reviewed manual/engine mappings; generic matrices are not native programming files or compliance approval.

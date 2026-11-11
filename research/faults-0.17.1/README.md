# Quick fault log — web 0.17.1

This revision responds to the engineer’s need to enter a reading quickly without completing an investigation form.

The default record screen has a point dropdown, value, unit (V DC initially) and Save reading. Panel, First device and Last device need no label typing; another point accepts a short label. Save reading appends to the existing local case/history and displays the saved value. No second save is needed. The compact screen retains visible site/panel context. Extra notes and detailed tools are optional.

Quick readings reuse the existing immutable measurement ledger and atomic case store. `addQuickMeasurement` requires a location, raw value and unit, retains optional context, and always records the assessment as `not_assessed`. It does not fabricate terminals, power/load conditions, engineer identity, voltage thresholds or answers. The detailed-reading validator retains its existing requirements. Corrections append and retain originals; failed-save recovery retains revised drafts and avoids duplicate entries.

The quick TXT export includes recorded readings, corrections and any earlier findings/work/handover without blank forms. The full investigation report remains available from the detailed tools. Existing saved sessions and PDFs are unchanged; no database migration or new service is introduced.

Validation on 2 November 2026:

- Full regression: **733 tests passed**, no failures or skips.
- TypeScript check and production build: passed. Public build verification passed.
- `scripts/qa-quick-log.cjs`: passed at 390 × 844 and 1440 × 844. The dropdown, reading and save controls fit in the initial phone viewport. Tested Panel/First/Last values, exact zero, a custom point with OL and optional note, one-tap persistence, no duplicate empty submission, compact offline TXT, offline reload/reopen and preservation of a previous detailed case.
- `scripts/qa-investigation.cjs`: passed at both widths. Detailed questions, readings, corrections, path comparison, handover and older cases remain usable behind the optional tools.
- Six new engine/report tests and six new controller tests cover quick entry, no invented context/assessment, corrections, compact exports and failed-save recovery.

Publication is verified separately after pushing the reviewable source commit. The signed Android APK remains 0.14.1. Browser checks are not physical-device certification.

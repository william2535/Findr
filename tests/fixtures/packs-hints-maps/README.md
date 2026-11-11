# Synthetic 0.22.0 preservation fixture

`synthetic-0.22-progress.json` holds fictional CFP and Sigma settings/progress for the 0.23.0 browser acceptance script. It is derived from the existing labelled 0.21.0 fixture through `restoreConventionalState` from committed web 0.22.0 (`e8691d604f07fc882a803892d4c6ca7f8722a869`). The fixture records that engine's SHA256.

This normalizes the prior engine's already-established default `alarmKind` and configuration-code ordering before testing the new UI. The settings and completed lessons remain fictional. No live-panel observations or customer records are represented. Additional site, import, keypad marker and saved-visit records are explicitly labelled synthetic in `scripts/qa-packs-hints-maps.cjs`.

Browser checks compare the retained settings and progress, actual saved PDF bytes, visit, import rows and pack usage across the new browsing/hints flows and an offline reload. Intentional guided-task starts run in a separate browser context because starting a lesson explicitly loads a fictional practice scenario.

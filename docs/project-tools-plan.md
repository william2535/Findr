# FINDR Projects — implementation contract

Scope: **Cause & Effect Tester** and **Site Tracker** only. Programme/Gantt and advanced management reports belong in Jobs.

## Existing architecture
The actual browser app is `public/app/index.html` + `public/app/app.mjs`, not the Next.js release landing page. `db.mjs` uses IndexedDB database `findr-device` v1 with stores `manuals`, `files`, `settings`. Existing visit records and report exports must remain intact.

## Phase 1 (foundation)
`public/app/project-model.mjs` introduces versioned, immutable project records, C&E test cases/runs, actions, and portable JSON backup validation. This is a foundation module only: no UI route or database write is activated yet.

## Phase 2 (implementation)
- Add dedicated project storage using an IndexedDB version upgrade with safe, non-destructive migration; use separate stores for project metadata, test runs, and binary evidence.
- Add Projects navigation to `public/app/index.html`, route handling and controller initialization in `app.mjs`; preserve existing routes.
- Implement import wizard for CSV and XLSX; validate C&E input/output columns, show preview and require user approval. PDF table extraction is advisory only.
- Provide explicit statuses not_tested, pass, fail, blocked, not_applicable. Preserve every test run as immutable evidence; retests append new records.
- Site Tracker actions can reference failed test runs, visit investigations, and imported Zone Sketch assets. No implicit cross-origin storage sharing.
- Add JSON backup and basic CSV test register export; keep full PDF management reports and Gantt in Jobs.
- Update offline asset manifest, Pages packaging, tests, and release verification. Do not claim Android updated until rebuilt and signed.

## Safety
Never infer a pass from an import or an AI response. Record tester, date, expected vs actual output, limitations and witness separately. An export is not automatically a BS 5839 compliance certificate. Preserve existing data and offer backup before migrations.

## Jobs interoperability
Use a versioned transfer envelope with `sourceApp`, `schemaVersion`, `projectId`, `exportedAt`, `testSummary`, `openActions`, and optional `assets`. Jobs must validate and preview imports before accepting them.

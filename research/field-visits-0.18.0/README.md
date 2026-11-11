# FINDR field fault visits — web 0.18.0

This note records the implemented scope of the field-visit change, adapted from the supplied [fault-finding brief](user-brief.txt). It does not record a deployment. Final regression counts, browser checks, build results, commit and publication evidence belong in the release owner's validation record.

The inspected baseline is web 0.17.1. The web version is now 0.18.0; this change does not build a new signed Android APK. The existing APK version remains 0.14.1.

See the [requirement mapping](requirements-map.md) for the existing systems reused and the [source review](source-review.md) for document provenance, exact candidate scopes and outstanding manufacturer review.

## Implemented scope

The offline route catalogue contains **58 generic routes and 180 question rules**, with route version `2026-11-02.1`:

| Route IDs | Discipline | Routes |
| --- | --- | ---: |
| P01–P09 | Shared power, supplies and cabling | 9 |
| F01–F15 | Fire alarms | 15 |
| A01–A10 | Access control | 10 |
| C01–C12 | CCTV | 12 |
| I01–I12 | Intruder alarms | 12 |

These are T0 observations and T1 bounded evidence routes. The internal `generic-reviewed` status describes the generic route implementation; it does not mean manufacturer approval, competent review of a particular installation or certification of a repair procedure. Specialist/design issues preserve evidence and referral requirements rather than supplying an operational procedure.

**All 13 exact-profile candidates are draft and disabled. There are zero newly enabled T2 manufacturer actions or numerical ranges.** The candidates separate C-TEC CFP Standard detector and sounder circuits from AlarmSense; Advanced MxPro 5 from Gent Vigilon; Apollo Soteria test-set scope; Galaxy Dimension option 09 from Texecom DEOL/TEOL; Paxton lock and cable-specific RS485 scopes; and exact camera/PSE power requirements. An `exact` candidate match describes entered identity and scope only. It cannot activate a draft comparator or establish that a device is installed. The full candidate list is in [source-review.md](source-review.md).

The visit begins with the complaint and current symptom state, and works without a panel download or identified model. The main flow presents one question with **Yes / No / I don't know**, a reason and a separate **Log a test** action. Unknown, blocked, inaccessible and fault-absent outcomes remain explicit. A question answer is not recorded as a performed electrical test.

Quick logging keeps the point, entered result and current state prominent. References, instruments, notes, photos and other context are available when needed. Repeating a reading requires a fresh value and state. Corrections retain the original entry. The visit can be paused with an unresolved cause and a useful next action.

Optional tools in the test log compare recorded tests, review an evidenced physical boundary and interpret a saved coax observation. They retain source event IDs, comparison conditions and result snapshots as review events. They do not declare a generic pass or verified cause. Physical order requires recorded provenance: addresses, source-row order and a panel download are insufficient. A return-loop fault does not become a radial cable-break location. Replacing a path with observations requires an explicit new definition and retains the earlier path and evidence.

## Safety and source boundaries

The engine separates emergency response, access, competence, authority, energised measurement, isolation, impairment, instrument suitability, endpoint knowledge and specialist requirements. A historical reading can be recorded as method unverified without authorising another test. Live readings cannot satisfy the dedicated proving-dead record. A reset, substitution or cleared indication does not by itself verify cause or full restoration.

Safety-critical routes, including P02, F12, F13, F15, A05, A07 and I11, remain generic evidence and handover flows. Their guard conditions are software behaviour, not approval to operate a life-safety or hazardous-area system. Exact operational steps and site-specific procedures still require their applicable competent review.

The supplied register contains 53 references. Its source entries retain `reference-supplied` provenance and disabled numeric comparators. Fresh checks for this change covered official regulation 14 HTML, HSE HSG85 paragraphs 47–55 and the HSE GS38 publication page. This is not a claim that all 53 documents, all editions or every manufacturer example were independently revalidated. The [source review](source-review.md) records retrieved material, hashes and limitations.

Existing catalogue document IDs are reused where the document evidence supports a link. A catalogue link is distinct from an applicable exact model/revision match and from a PDF saved on the engineer's device. No source page or numerical limit is invented when the catalogue lacks one.

## Local records and migration

`session.fieldVisit`, schema version 1, holds the visit, independent incidents, assets, immutable test/review events, impairments and handover. It reuses the existing `findr-device` IndexedDB settings store and the atomic current-session/history transaction. PDF bytes remain in the separate existing manual/file stores. No new cloud record store or online fault-analysis service is introduced.

Lazy, repeatable adaptation retains original session fields and a local legacy snapshot. Earlier free text, answers, guide history, readings, actions and imported context become labelled legacy evidence. Deterministic identities prevent repeated adaptation from appending the same legacy record twice. Known capture times are retained as capture times; unknown test times, conditions and model identity are not invented. A previous restoration checkbox remains a historical claim rather than becoming current verified restoration.

Later edits to the old tools can be retained as additional legacy evidence. New events use stable save identities, and corrections append linked records. Drafts remain separate from performed events. Failed local saves expose an unsaved/retry state. A linked return visit retains parent references and outstanding impairment information while starting fresh questions, symptom state and test events.

Imports remain dated configuration evidence. They cannot overwrite an engineer-confirmed physical label, establish present device identity, prove an active fault or supply physical cable topology. Individual pre-existing and introduced impairments remain separate, as do incident outcome and restoration state.

## Handover and export

The visit provides a short handover, a full human-readable report and structured JSON. Export requires an intentional action after a preview. Comparison, localisation and coax reviews include their source event references and snapshots in recorded events, so the evidence does not depend on a transient screen result or a later rule revision.

Redaction is enabled by default. It aliases recognised site/contact/location/network identifiers, removes recognisable credential fields and labelled secret values, omits original legacy backups from a redacted report and omits identifying attachment payloads/metadata. Credential-like values are filtered from newly saved fields; historical originals remain locally preserved. Technical evidence states, unknowns, readings, corrections and outstanding actions remain available. The engineer must review the preview: arbitrary free text can contain identifiers that a pattern-based filter cannot reliably recognise.

Exports are reports, not a new restore/import format or a substitute for the app's local store. This release does not add JSON visit import or cloud synchronisation. Existing downloaded PDFs remain usable through the existing local reader. Obtaining an unsaved PDF or opening an external source page needs a connection; saving a visit and using the local routes do not.

## Existing journeys and formats retained

The original **32-guide** panel/manual flow and its Yes / No / I Don't Know questions remain available. Its existing warden-call material is retained; the new four-discipline catalogue does not claim newly authored warden-call routes. The new visit workspace uses `#investigation`; the earlier quick/detailed log remains at `#investigation/legacy`. Existing guides, packs, emulators, hints, menu maps and saved records retain their systems. A visit-wide active emergency takes priority over routine guide/log navigation.

Home continues to offer frequently used/downloaded packs, import and how-to information, with Fault Finder as a separate section. Manual/Hint/Menu Finder journeys can return to the same local visit. Manual catalogues, manual-to-device links and PDF download validation are reused.

Panel import support is unchanged: **UTF-8 CSV and tab-delimited TSV/TXT device schedules with preview and column mapping**. This release adds no native manufacturer-backup parser and verifies no new real manufacturer export. Uptick, Zone Sketch and Excel remain outside this scope. The existing [import format audit](../panel-import-0.16.0/format-audit.md) records the supported formats and synthetic fixture provenance.

## Changed-file roles

| File or group | Role in this change |
| --- | --- |
| `public/app/field-routes.mjs` | Offline 58-route/180-rule catalogue, test templates, supplied reference register and versioned branch targets. |
| `public/app/field-engine.mjs` | Eligibility and emergency precedence, evidence questions, blocked/unknown progression, comparison/localisation, proving-dead record checks, findings and restoration validation. |
| `public/app/field-model.mjs` | Visit/event schema, lazy legacy adaptation, immutable corrections, return visits, impairment history, local-input sanitisation, reports and visit search. |
| `public/app/field-profiles.mjs` | Thirteen immutable disabled draft profiles, exact/family/conflict matching and supported existing document references. |
| `public/app/field-evidence-tools.mjs` | Optional saved-evidence comparison, physical-path and coax UI; retained review snapshots and deliberate path replacement. |
| `public/app/field-visit.mjs` | One-question/quick-log controller, queued saves and drafts, incident context, attachments, handover, source display, manual journey and export preview. |
| `public/app/field-visit.css` | Portrait layout, large controls, compact quick logging and sticky current-point/actions with keyboard viewport support. |
| `public/app/app.mjs` | New visit/return-visit entry points and routing, existing store integration, history/search/export wiring and return navigation. |
| `public/app/investigation.mjs` | Configurable active route so the existing quick/detailed log remains available at its legacy route. |
| `public/app/index.html`, `public/app/findr-theme.css` | Load the new stylesheet and present visit return controls within the existing yellow-and-black shell. |
| `public/app/version.mjs`, `app/page.tsx` | Web version and launcher description; the existing APK version stays separate. |
| `tests/field-routes.test.mjs`, `tests/field-profiles.test.mjs` | Catalogue targets/scope, reference consistency, disabled profiles and supported catalogue records. |
| `tests/field-model.test.mjs`, `tests/field-engine.test.mjs` | Migration/save identities, evidence semantics, privacy, prerequisites, comparisons and restoration boundaries. |
| `tests/field-evidence-tools.test.mjs`, `tests/field-visit-controller.test.mjs` | Optional tool/controller behaviour, save/retry preservation, immutable evidence and exported review snapshots. |
| `tests/field-acceptance.test.mjs`, `tests/fixtures/field-visits/` | Labelled synthetic cases for the supplied acceptance scenarios; no real customer/site test data is claimed. |
| `scripts/qa-field-visit.cjs` | Browser workflow harness for desktop/portrait logging, preservation, manual/hint return, exports and offline reopening. Running it and recording its outcome are separate release steps. |
| `research/field-visits-0.18.0/` | Supplied brief, requirement mapping, source review and this scope record. |

The existing `scripts/prepare-app.py` release step regenerates offline assets, version presentation and integrity metadata. Generated output, final test/build results and any verified website publication must be recorded by the release owner after integration. A successful build alone is not publication or a newly signed APK.

# Web 0.18.0 validation — 2 November 2026

This release implements the supplied fault-visit brief on the existing FINDR web app. See [scope, changed files and remaining draft work](README.md), [source review](source-review.md) and [requirements map](requirements-map.md).

## Automated and build checks

- Full regression: `node --test --test-isolation=none tests/*.test.mjs` — **836 passed, 0 failed, 0 skipped**. Includes the existing importer, matching, PDF, session, emulator, hint and service-worker tests.
- New focused tests cover routes/profile scopes, migration and raw results, rule eligibility, comparable evidence, restoration/cause guards, export redaction and controller retry/recovery. The supplied T01–T36 cases use labelled synthetic fixtures and check both outcomes and suppressed claims. Disabled manufacturer candidates are tested as disabled; this is not evidence of a positive exact-model procedure.
- Type check: `node node_modules/typescript/bin/tsc --noEmit` — passed.
- Production build: `node scripts/run-framework.mjs build` — passed. Vinext retains its informational limitation that static analysis cannot classify every dynamic API route.
- `python scripts/prepare-app.py` — **1,046 offline assets, 38,199,235 bytes**, manifest revision `a1ccb6d36c7a`. The final export-only privacy correction is included.
- `node scripts/verify-public-build.mjs` — passed: **1,084 public files** matched source bytes; deployment output **94,232,362 bytes**. Existing native-only index and archived APK exclusions were applied; source APK artifacts remain intact.
- `git diff --check` — passed.

## Browser workflow

The repeatable harness is `scripts/qa-field-visit.cjs`, using Chromium at **390 × 844** and **1440 × 844**, plus a **500px-high** viewport to check sticky controls. This is browser viewport emulation, not physical iPhone/Safari testing or a signed APK test.

The flow uses a synthetic unknown-model access complaint, Yes and I don’t know answers, raw readings `0.00`, `24.00` and an explicitly historical unverified reading, a fresh-state requirement, inaccessible controller access and two independent impairments. It compares different-state readings and retains the rejection and original values. Menu Finder → SHOW HINTS → a highlighted physical key → Return to fault visit preserves the same visit and event identities. A previously downloaded real Gent PDF is read using the existing local reader; that verifies PDF preservation, not a new manufacturer diagnostic profile.

Export checks download redacted full-text and JSON reports, keep readings and outstanding actions, omit known site/network/location identifiers and photo pixels, and retain local photos. Unfinished UI drafts and attachment filenames are excluded from reports while remaining in local workspace storage. After service-worker readiness the browser goes offline and reloads: the visit resumes, exports and saved PDF remain available, the previous schedule is unchanged, the old free-text case reopens without an invented test date, and a linked return visit gets a new identity with zero copied current test events.

**Final outcome: passed at both widths on manifest `a1ccb6d36c7a`.** No browser page errors or horizontal overflow were reported. The repeated final run included the unfinished-draft privacy regression in JSON, full text and short handover.

## Import regression and format limits

`scripts/qa-panel-import.cjs` passed at **1440px** with UTF-8 CSV and at **390px** with UTF-8 tab-delimited TSV using custom column mapping, followed by CSV replacement. The browser checks covered duplicate address scopes, node/sub-address ambiguity, loop aid without physical-order claims, exact/generic device evidence, actual PDF download/read, session context/report, cancelled/malformed/rejected/confirmed reimports, service-worker offline reload and previous-session preservation. Quoted/blank/leading-zero cases remain covered by the full unit suite.

These schedules are labelled synthetic. **No real manufacturer-native export was verified, and no new native parser is claimed.** Uptick, Zone Sketch and Excel remain outside the release. The most useful next sample is an anonymised **Gent Vigilon download/export**, accompanied by its programming-software version, panel/firmware version, a matching readable device schedule and a few known node/loop/address/location/model entries. Preserve field structure, leading zeros and complete part codes while replacing site-identifying text.

## Migration and limits

Lazy schema-1 adaptation uses the existing atomic settings transaction and retains earlier records and unknown values. It does not upgrade IndexedDB, rewrite PDF blobs or turn old readings into newly performed tests. Original readings survive corrections and failed-save retries. The new catalogue ships 58 generic routes/180 rules; all 13 manufacturer-specific candidates remain draft/disabled. The safety-critical routes and exact-model numeric/operational profiles require further applicable source and competent review; successful software tests do not certify panel procedures.

Local photos can increase browser-storage use. A failed save is visible and retryable; browser storage can still be cleared by the platform. Export preview remains necessary because arbitrary free text may contain identifiers that pattern-based redaction cannot recognise. The report is not a JSON backup/restore import format.

## Release status

The source is prepared as a reviewable release commit. Build success and browser verification alone do not establish website publication. Publication is performed separately through the established Sites version/deployment workflow and reported only after its returned status and live version are checked.

This release updates the **web app to 0.18.0**. It does **not** build a new signed APK: the existing preview Android package remains **0.14.1**, versionCode **26**. No app-store release is claimed.

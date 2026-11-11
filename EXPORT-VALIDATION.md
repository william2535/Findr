> Initial export record for 0.32.6. For the current deployed source snapshot and verification, see [BACKUP-PROVENANCE.json](BACKUP-PROVENANCE.json) and [SOURCE-FILES.sha256](SOURCE-FILES.sha256). Historical release tags retain their original files.

# Export validation — 2026-11-11

All validation used `/workspace/findr-export-staging/FINDR` or `/workspace/findr-export-validation/FINDR`, never rebuilt or modified the original project or live Site.

- Source: current Git HEAD `c4bdbb83ff0ed11762b603f3aca6d5dadd795df3`, matching Site version 69; `APP_VERSION` is 0.32.6.
- Full Node suite: `node --test --test-isolation=none tests/*.test.mjs`, Node 24.19.0: **1,536 tests; 1,533 passed; 3 failed**. All failures are in `tests/release-downloads.test.mjs` and require deliberately excluded compiled APKs. They check current/previous retention, historical APK checksums, and current binary links. No application test failure was hidden or rewritten.
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false`: **passed**.
- Portable build: `node scripts/run-framework.mjs build`: **passed** in a separate copy with sanitized hosting metadata. Dependencies were reused through a validation-only symlink; they are not included in the ZIP. Fresh installation, independent production deployment and APK building were not tested.
- Static relative imports / module URLs: **212 checked** in non-vendor browser MJS source; **0 missing**. TypeScript compilation covers the app/server module graph. Dynamic network documents and model weights remain intentional external downloads.
- Source integrity: all 2,490 eligible main-source files matched their repository bytes except the documented sanitized `.openai/hosting.json`. Workspace recovery files are preserved separately. Additions are export instructions, environment example, inventory/audit/checksum records.
- Credential inspection: filename exclusions plus token/private-key/credential-URL/JWT and assignment scans. Reviewed matches were product/manual URLs, synthetic rejection fixtures and fixed Android preview-signing defaults; the actual signing keystore was excluded. No private credentials or unresolved candidates were found. Automated scanning is not a guarantee against every possible secret encoding.
- Validation performed no publish, deploy, GitHub push, live database write or original-source edit. A subsequent GitHub source upload was separately authorised by the owner.

Included research describes earlier implementation checks. It must not be interpreted as new browser/device testing of this export. The ZIP is a source backup, not a ready-made deployment archive.

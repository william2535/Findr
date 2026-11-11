# FINDR source inventory

Verified web version: **0.32.6**. Site version: **69**. Android source/retained release marker: **0.14.1**, code **26**. The package.json package version is the unchanged starter value, not the FINDR web release number.

Source commit: `c4bdbb83ff0ed11762b603f3aca6d5dadd795df3` (newest source-repository HEAD when exported). Main source was obtained from Git source, never from a deployment archive. Original workspace `/workspace/sites/findr` was inspected read-only: its base was `a26b564` with unfinished 0.32.0 edits. Forty-three differing eligible files are retained with their original relative paths in `WORKSPACE-RECOVERY/original-workspace-files.zip`; newer 0.32.6 main files take precedence. Identical local files are already represented in the main source.

No application implementation was rewritten or rebuilt in the original checkout. The original Site was not published or deployed. The owner subsequently authorised a separate GitHub source upload. The only existing source file changed in the export is `.openai/hosting.json`: its live project ID is replaced by a placeholder so a future checkout is not linked to the original site. Export documentation and checksums are additions.

## Included directories

| Directory | Files | Uncompressed bytes |
| --- | ---: | ---: |
| `app/` | 47 | 51,724 |
| `components/` | 62 | 214,987 |
| `lib/` | 10 | 1,573,643 |
| `hooks/` | 1 | 565 |
| `worker/` | 1 | 1,303 |
| `android/` | 4 | 25,046 |
| `public/` | 1435 | 106,245,640 |
| `db/` | 2 | 592 |
| `drizzle/` | 1 | 61 |
| `scripts/` | 69 | 675,646 |
| `tests/` | 145 | 1,703,122 |
| `research/` | 689 | 42,771,199 |
| `docs/` | 1 | 1,868 |
| `branding/` | 3 | 1,557,124 |
| `vendor/` | 2 | 17,104 |
| `examples/` | 2 | 2,070 |

The original hierarchy, import paths, dotfiles, package manifests, pnpm lock/workspace files, TypeScript/Vite/Next/PostCSS/ESLint configs, database schema/migration sources, tests, synthetic PDF fixtures and research are preserved. No `.github/` workflow directory existed to export.

## Key functional modules

- `public/app/app.mjs`, `index.html`, styles, catalogue/data and panel/device images: Home, navigation, identification, manual packs, schedules and branding.
- `public/app/helpers*.mjs` and `helpers.css`: Make a Helper, catalogue scopes, preparation, scoped conversations, reports, import/export and storage.
- `public/app/local-language*.mjs`, `fault-language*.mjs`: actual model configuration, pinned download URLs/hashes, WASM inference, recovery, prompts and evidence handling.
- `public/app/manual-analysis*.mjs`, `pdf-runtime.mjs`, `retrieval*.mjs`, `quick-questions-engine.mjs`: extraction/OCR, indexing, retrieval, model grounding and citations.
- `public/app/db.mjs`, `case-store.mjs`, Helpers store, `sw.js`, `precache.js`: browser persistence and offline caches.
- `public/app/diagnostic*`, `terminal*`, `field-*`, `investigation*`, `knowledge` data: fire, intruder, CCTV, access-control and other diagnostic routes, exact readings, corrections and handovers.
- Emulator modules/data, manual menu maps and hints remain in `public/app/` with the original assets and tests.
- `app/api/manual/[id]/route.ts`, `lib/download-map.json`, `worker/index.ts`: the server manual relay and Worker entry point.
- `android/`: Java application, manifest, build/packaging source and Android integration; signing keys and compiled APKs excluded.
- `db/`, `drizzle/`, `drizzle.config.ts`: source-only database scaffolding; no user database.

## Assets and exclusions

Included: committed logos, approved Manual Hunt branding, pictures, wiring illustrations, fonts, PDF.js resources, WASM/ONNX browser runtime, English OCR language resources, licenses and provenance. These bundled runtime files are required by the offline application. Synthetic PDF test fixtures are included; no downloaded user-manual library or user conversation database is exported.

Excluded: node_modules, .git, .next, dist/out, .vinext, .wrangler, .sites-runtime, temporary/build caches, Android generated assets/build output, APK/AAB installers, signing keystore, real environment/credential files, local databases, downloaded LLM weights and prior archives. `EXPORT-EXCLUSIONS.json` lists excluded tracked entries. Generated/ignored working-tree dependencies and caches are not copied at all. Symlinks are not followed outside the project (no source symlinks required).

The optional model is downloaded by the retained app code (366,642,692 bytes for its pinned pack). Manual PDFs are downloaded through the retained catalogue relay. They are deliberately not bundled as user data.

## Validation and limitations

See `EXPORT-VALIDATION.md` for actual commands and outcomes. The web build and type check passed in an isolated copy using existing dependency installations. A clean package download and independent deployment were not performed. APK-specific assertions fail until the intentionally excluded release binaries are supplied. Android signing and version alignment need their own release work; this export does not claim a reproducible signed APK. Existing research contains historical device/browser results, not new physical-device testing performed during export.

The source ZIP includes `SOURCE-FILES.sha256` for every payload file (except the checksum list itself). ZIP CRC verification and package.json parsing were completed. All major functional directories above are present.

# FINDR — GitHub setup

Verified export: **web 0.32.6**, **Site version 69**, source commit `c4bdbb83ff0ed11762b603f3aca6d5dadd795df3`. The source is from the current source repository, not a compiled deployment archive. The original checkout and live website were not changed. Older unfinished local edits are preserved in `WORKSPACE-RECOVERY/` without overwriting newer source. See `SOURCE-INVENTORY.md` and `EXPORT-VALIDATION.md` for exactly what was included and tested.

## Current Panel Pals online configuration

The current deployed source snapshot is recorded in [BACKUP-PROVENANCE.json](BACKUP-PROVENANCE.json); the original export record above is retained for history. Web 0.35.0 adds an optional Groq online mode alongside the existing local models and manual search. Read [online setup and data handling](docs/online-panel-pals.md) before using it.

No provider key belongs in the Site environment, Worker bindings, repository or `.env` file. Each engineer explicitly enters a personal Groq key in the app; the browser retains it only in this tab’s module memory. The same-origin FINDR relay forwards bounded requests to the fixed provider. A server-capable Worker/Sites deployment is required for that route; static GitHub Pages cannot run it. Never embed a shared owner key in static assets. Real authenticated provider inference was not verified during this release; its transport and browser acceptance tests used labelled synthetic provider responses.

Web 0.36.0 also offers [OpenAI API setup](docs/openai-panel-pals.md). This is an explicit paid-API option alongside Groq; a ChatGPT login/subscription does not supply an API key or API credits. Each engineer enters their own key in FINDR for the current in-memory session. No provider key belongs in environment variables, source, or this backup. Authenticated provider inference remains unverified in the release evidence.

## Import into GitHub

1. Extract the ZIP and open its `FINDR/` directory.
2. Create a new, empty GitHub repository under your own account. This export has no `.git` directory or connection to the original source remote.
3. Review `WORKSPACE-RECOVERY/README.md`. The recovery files are inside `original-workspace-files.zip` so old TypeScript cannot enter the current build. Extract that archive outside the project to review it. Do not apply it automatically over the newer files.
4. Run the following with your own GitHub repository URL:

```sh
git init -b main
# Extend the existing ignore rules for future locally generated credentials:
printf '\n*.keystore\n*.jks\n*.p12\n*.pfx\n' >> .gitignore
git add .
# Original ignore rules exclude .env*: include only this sanitized example.
git add -f .env.example
git commit -m "Import complete FINDR v0.32.6 source"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

The owner subsequently authorised uploading this source to `william2535/Findr`. Source upload does not deploy or change the original ChatGPT Site. Use Git rather than GitHub's browser uploader for the full asset tree. The export contains no source file larger than GitHub's 100 MB limit.

## Environment configuration

Read `.env.example`. Ordinary FINDR development does not need a secret API key. If you need optional settings, copy the example to a private `.env.local` and fill in only the variables your deployment actually uses. Keep real values out of Git. Supply Cloudflare deployment credentials through your shell or GitHub Actions secrets. The original Site's identity has been replaced only in the exported `.openai/hosting.json`; the live configuration is untouched.

## What runs where

`app/` contains the React release page and the server endpoint `/api/manual/[id]`. `public/app/` contains the browser application, offline service worker, manual catalogue, pictures, emulator engines, helper conversations, PDF/OCR processing and optional local language runtime. `worker/index.ts` serves the Next-style routes through Vinext on a Cloudflare Worker. Browser data is stored locally with IndexedDB/Cache Storage. The application does not currently require Cloudflare D1 or R2: both bindings are disabled, the Drizzle schema is empty, and the app does not call the database helper.

Keep the vendored PDF/OCR/ONNX browser assets, licences, provenance records and precache manifest. They are runtime inputs committed with the app. The optional SmolLM2 360M model weights are not included; the app downloads the pinned 366,642,692-byte model pack after an explicit action and verifies its hashes. PDF downloads require access to the corresponding publishers through the server relay; source-only or unavailable documents remain subject to their existing download rules.

## Local web development

Requirements: Node.js >=22.13.0 and pnpm 11.25.0, as pinned in `package.json`. Retain `pnpm-lock.yaml` and `pnpm-workspace.yaml` together. Set up that pnpm version with your usual package-manager installation method, then run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The portable development server uses port 5173. No application API key or environment secret is required for ordinary local FINDR use.

For a local production build:

```sh
pnpm build
pnpm start
```

`pnpm start` runs the generated Cloudflare Worker with Wrangler locally; it is not a generic Node.js HTTP production server. The generated configuration lives at `dist/server/wrangler.json` after a successful build.

A fresh export must not contain `.sites-runtime/execution-profile.json`. Its absence intentionally selects the portable framework path. The managed Linux path and `scripts/build-verified.sh` are specific to the Sites environment; the Linux installer additionally requires `flock` and GNU `timeout`. Direct portable `pnpm install --frozen-lockfile` does not invoke that installer.

`vite.config.ts` requires `.openai/hosting.json` to exist. Keep the sanitized placeholder configuration with `d1` and `r2` disabled. Do not carry a previous site's project identifier into a new deployment.

See `EXPORT-VALIDATION.md` for actual test and isolated build outcomes. Installed dependencies were reused during validation; a fresh dependency download is not claimed.

## Tests and asset changes

The Node test files use the built-in test runner. For example:

```sh
node --test tests/helpers-engine.test.mjs tests/helpers-library.test.mjs tests/helpers-store.test.mjs
```

The complete historical suite is `node --test tests/*.test.mjs`. `tests/release-downloads.test.mjs` requires the deliberately excluded historical APK binaries and therefore cannot pass in this source-only archive until those artifacts are restored. The direct `scripts/verify-public-build.mjs` release gate also requires them. The default portable `pnpm build` does not call that gate.

When changing files within `public/app/`, regenerate the offline hashes and prepared images with `python3 scripts/prepare-app.py` before release. This requires Python 3, Pillow, the branding master image and DejaVu font files at the paths used by that script. It mutates prepared public assets. Keep generated manifests consistent with the exact shipped bytes.

Historical browser verification scripts may assume Playwright and browser paths under `/opt/codex/`, `/usr/bin/` or `/workspace/`, and some require original test PDFs. Check each script's `FINDR_*` options before running it outside its original environment.

## Hosting elsewhere

GitHub stores this source; GitHub Pages alone does not supply the server-side manual relay. A full deployment needs a compatible Worker/server runtime and the complete public assets. Cloudflare deployment requires a new worker identity and your own account authentication. Review the generated Wrangler configuration and bind static assets for the chosen account rather than assuming the original Sites control plane is present.

For a new public hostname, review `public/app/version.mjs` (`RELEASE_URL`) and `app/layout.tsx` (canonical/share metadata), plus any references found by searching for the original hostname. The browser app and many public routes use root-absolute paths; host at the origin root unless these paths are intentionally adapted. Service workers and browser storage APIs need localhost or HTTPS.

The retained ChatGPT-auth/connector helpers are Sites integration scaffolding. FINDR's current application flows do not require them. A self-hosted service does not automatically gain ChatGPT sign-in or connected-app bindings.

## Deploy from GitHub to a separate site

Use a new Cloudflare Worker/site owned by you. A GitHub repository can trigger Cloudflare Workers Builds or your own GitHub Actions workflow; it is not necessary to deploy through ChatGPT Sites.

1. Install dependencies and run `pnpm build` in your independent checkout.
2. Inspect `dist/server/wrangler.json`. Set a new, unique Worker `name`, your account configuration, and appropriate static-assets binding. Do not reuse any existing FINDR Worker name, Site ID, routes, custom domains, D1 database IDs or R2 buckets. Relative generated paths must remain relative to their config location.
3. Configure any optional D1/R2 bindings in your own account. Current FINDR needs neither. If you later use `getDb()`, create a new D1 database, bind it as `DB`, set `d1` to `DB` in your checkout's hosting configuration, and use Drizzle to generate the application's schema migrations. No user database is in this archive.
4. Run local preview with `pnpm start` and verify `/app/`, `/api/manual/<catalogue-id>`, model preparation and offline use.
5. After reviewing the generated configuration, deploy from **your separate checkout** using `pnpm exec wrangler deploy --config dist/server/wrangler.json`, with credentials belonging to your own account. Validate all generated paths and platform limits first. This is a deployment recipe, not a claim that independent production deployment was tested.
6. Configure GitHub Actions/Cloudflare Builds to run these same install/build/deploy steps only for that new Worker. No existing `.github` workflow was present in the source.

The release-packaging verifier expects legacy APK artifacts which this source-only export intentionally omits. Obtain separately retained APKs if you want the landing-page Android links and the original complete release verification policy to pass. Do not publish invalid links as working downloads. On platforms with a 25 MiB static-file limit, review `scripts/verify-public-build.mjs` and its native-only asset exclusions. Never invoke Sites publication tools for this backup.

## Android and omitted release files

The export excludes APK/AAB output, signing keys, Android build directories and dependency/build caches. Existing checksums and release-policy source may remain as historical metadata. The landing page still links to the current Android APK, so its download will be unavailable until an APK is provided separately. Historical hosted URLs intentionally return archive notices; those notices are not a source for recovering historical binaries. Obtain historical APKs from the original source repository or a separately retained release archive and check their matching SHA-256 records.

Android source uses the Android 35 platform/build-tools 35.0.0, a Java JDK and Python 3. Set `FINDR_ANDROID_SDK` to the SDK directory. `android/build-apk.py` is the original preview packaging script. It has a checkout-specific SDK fallback and fixed preview-signing behavior; review and configure signing privately before using it. The original signing identity is deliberately excluded, so a newly signed APK cannot replace an installed app signed with the old key.

The exported web 0.32.6 source is ahead of its retained Android release. Its Android script compares the manifest version to `APP_VERSION`, so its unmodified assertion does not permit rebuilding Android 0.14.1 from web 0.32.6. An Android release needs its own deliberate version alignment and verification; this source export does not claim to reproduce the published APK.

## Optional environment variables

Ordinary local web development requires no application secrets. Tooling options include `SITES_RUNTIME_ROOT`, `SITES_PNPM_SHARED_STORE`, `CODEX_SANDBOX`, `WRANGLER_LOG_PATH`, `WRANGLER_REGISTRY_PATH` and `MINIFLARE_REGISTRY_PATH`. Metrics/logging defaults are applied by `scripts/tool-environment.mjs`. Managed scripts additionally use `SITES_BUILD_TIMEOUT`, `SITES_BUILD_KILL_AFTER`, `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER` and pnpm store/bootstrap options; portable developers normally need none of them.

Browser QA scripts use optional `FINDR_QA_*`, `FINDR_MODEL_*`, `FINDR_PDF_*`, `FINDR_PLAYWRIGHT_PATH`, `FINDR_CHROMIUM`, `FINDR_WEBKIT` and fixture-PDF paths. These are test configuration, not application credentials. Keep actual environment files, preview-session state, downloaded model caches and signing files out of Git.

# Panel Pals optional online AI — web 0.35.0

Implemented 11 November 2026. Android remains 0.14.1 / code 26.

## Scope

One explicitly selected online adapter uses Groq's hosted open-weight GPT-OSS 120B. Each engineer supplies a personal Groq Free-plan API key through FINDR's password field, confirms the account plan and accepts sharing the current question, relevant conversation context and selected manual excerpts. FINDR cannot determine the billing tier from a key. Paid-account keys may incur provider charges. There is no shared site-owner credential, paid upgrade, retry loop, alternative provider or automatic cloud fallback.

GitHub remains the editable source backup. Storing model weights there does not provide inference or avoid phone RAM/storage when running that model locally.

The fixed relay validates origin, consent, request size, model, response schema and output bounds; uses a deadline and propagated cancellation; disables redirects/tools; returns safe errors and no-store responses; and neither persists nor logs request contents or credentials. The browser keeps the key only in module memory. Reload loses it. Mode and consent belong to the captured conversation. Imported conversations lose online consent. New jobs remain offline by default.

The model interprets requests and selects source evidence. Existing helper document scopes, page references, reviewed procedures, explicit numerical evidence and diagnostic constraints remain in place. This release does not establish the model's real-world language quality. Manual-search replies remain labelled as such, including direct reviewed-procedure replies that need no inference.

An explicit Local resources action can remove either downloaded local model pack. It invalidates integrity markers before removing pinned chunks and clears only that pack's trial proof. It retains other packs, runtime resources, PDFs, indexes, pals, conversations and fault records. Choosing online mode never deletes a model automatically. Partial removal and busy/storage errors remain visible; the UI does not invent reclaimed-byte totals.

## Verification

- Full regression suite: **1,771 passed, 0 failed**, using `node --test --test-isolation=none tests/*.test.mjs` (36.892 seconds in this Linux execution environment).
- Production build and TypeScript validation passed.
- New online modules pass ESLint. A wider focused run still reports the existing release-page `@next/next/no-html-link-for-pages` error at `app/page.tsx:29` and existing unused-variable/image warnings. That unchanged header anchor is present in the baseline release; whole-repository lint is not claimed clean.
- Deployment public-asset gate passed: 1,443 public files, 187,421,136 build bytes. Deployment-only archived APK exclusions preserve original source artifacts.
- Real compiled relay on local Wrangler: GET capability 200 with `requiresKey:true`, `serviceVerified:false`, and `private, no-store`; POST without a key returns 401 / `ONLINE_KEY_REQUIRED`. These are route checks, not authenticated inference.
- Transport/server tests use synthetic provider responses and test strict source/task/dialogue contracts, deadlines, cancellation, rate/auth errors, size limits, credential isolation and absence of automatic retries.
- Mode/removal tests cover consent, captured job identity, storage failures, imports, cancellation and scoped model deletion.

Browser verification passed 41 checks: Chromium 154.0.8037.57 at 390 × 844 and 1440 × 844, WebKit 26.0 at 390 × 844, and Chromium with networking disabled after setup and reload (offline build `d2c08262902c`). Checks covered dual consent before any request, explicit Retry, correct online provenance, saved-PDF page opening, key absence from storage/logs/exports, fresh imported consent, key loss after reload, quota failures, disconnect/cancel and late response fencing, and manual search without loading a model. No page errors or model downloads occurred. Intended aborted requests are recorded in the evidence.

Browser evidence is stored beside this file. Any provider answers in those checks are explicitly mocked. Synthetic PDFs exercise the actual local PDF extraction, index, source-reference and reader pipelines; they are not manufacturer guidance.

## Limits

No real Groq credential was available, so authenticated cloud inference, semantic accuracy, latency and free-account eligibility remain unverified. The implementation follows the official endpoint and structured-output documentation linked in [setup and data handling](../../docs/online-panel-pals.md). No physical iPhone or installed iOS PWA was tested. Browser width emulation is not a physical keyboard/OS memory test. Online inference requires connectivity; offline manual access must not be described as offline hosted-model inference.

WebKit in this environment has an independently reproduced CacheStorage backend failure; its UI checks cannot establish service-worker/offline readiness. The existing local models and their earlier documented performance limits are unchanged.

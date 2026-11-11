# OpenAI key option — web 0.36.0

Online AI setup now offers Groq and OpenAI explicitly per conversation. OpenAI uses the documented fixed GPT-6 Luna API model, with paid-API acknowledgement plus data-sharing consent. ChatGPT subscriptions do not include these API charges. All keys are per-provider module memory; no keys enter local/session storage, IndexedDB, logs, exports or source. Reload loses keys. Selecting a provider or entering its key does not send an inference request.

The relay permits only configured providers and matching consent versions, forwards a key only to its fixed selected host, and retains strict JSON/source checks, bounded input/output, deadlines, cancellation, no persistence and no retries or automatic fallback. OpenAI requests use `store:false`. This is not a zero-retention promise; see [OpenAI setup and official references](../../docs/openai-panel-pals.md).

Old Groq requests and consent stay compatible. Each new/imported conversation needs its own explicit online choice. Switching providers aborts the owning answer and keeps the original question recoverable. Keys and rate snapshots are isolated. Known foreign-provider key prefixes are rejected before replacing an existing key. OpenAI rate headers are labelled requests/minute and tokens/minute, never remaining paid credits; Groq keeps requests/day and tokens/minute. No extra quota polling occurs.

## Verification

- Full regression suite: **1,800 passed, 0 failed**, `node --test --test-isolation=none tests/*.test.mjs`, 31.234 seconds in the Linux execution environment.
- Production build, TypeScript validation and deployment public-asset gate passed. Gate: 1,457 public files, 188,172,501 build bytes. Offline build `391c5afce610`.
- Focused server tests cover canonical fixed-model routing, consent/provider mismatches, request bounds, output schemas, wrong-model rejection and rate-limit versus insufficient-credit errors. Client tests exercise isolated keys, missing-provider-key refusal, unknown providers, mismatched responses, per-provider cancellation, imports, allowance scope and no fallback.
- Eight normal-entry Chromium 154.0.8037.57 checks at 390 × 844 passed. Existing local PDF processing/indexing and actual saved page opening ran normally; both providers' transport responses and keys were synthetic. Checks cover paid/sharing consent, no send on setup, pending-question Retry, source provenance/page2, provider key separation, OpenAI RPM labels, switching/cancellation/late responses and reload needing a new key.
- The actual compiled local relay returned200 for `GET ?providerId=openai`, identifying the paid API and `serviceVerified:false`; POST without a key returned401. This checks route wiring, not authenticated inference.
- Screenshots and detailed browser results are retained beside this file.

No real OpenAI or Groq key was available. Authenticated inference, actual account entitlement, real usage balances, model language quality and provider response performance remain unverified. No physical iPhone or new network-disabled inference test is claimed. Hosted inference needs a connection; existing saved-manual/offline workflows are preserved. Android remains0.14.1.

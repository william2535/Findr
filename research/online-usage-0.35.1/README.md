# Online allowance display — web 0.35.1

The top-of-app strip uses Groq's actual response headers, passed through the existing fixed relay on normal replies and provider errors. There are no quota polling requests, token estimates or fixed free-plan counters. Before the first response, or after replacing/clearing the session key, the allowance is unknown. Values stay in session memory with the existing key lifecycle, not in job records or browser storage.

Official [Groq rate-limit documentation](https://console.groq.com/docs/rate-limits), checked 11 November 2026, states:

- `x-ratelimit-limit-requests`, `x-ratelimit-remaining-requests`, `x-ratelimit-reset-requests` **always refer to Requests Per Day (RPD)**.
- The corresponding `*-tokens` headers **always refer to Tokens Per Minute (TPM)**.
- Reset values are duration strings, for example `2m59.56s` and `7.66s`.
- `retry-after` is supplied on rate-limit errors.

The UI labels these windows separately, displays the last-report time and counts down each provider reset duration. When a countdown elapses, it says the next reply is needed to confirm a new balance; it never automatically refills counts. Missing or malformed values remain unknown. A reset for one window does not establish that all account limits have cleared. Other applications using the same account/model can change the balance between replies. Remaining RPM and TPD are not provided by these headers and are explicitly identified as unavailable.

Only numeric quota fields and validated durations pass to the browser. Keys and arbitrary provider headers are not exposed. Cancellation/key changes fence late snapshots; older out-of-order responses cannot replace a newer reported snapshot. Disconnect and reload clear account figures.

## Checks

Nine quota regressions cover header windows, zero versus unknown, malformed values, reset expiry without invented credit, successful and 429 relay responses, no polling, key/account isolation, out-of-order responses and cancelled late requests. They use synthetic provider headers, not authenticated Groq usage.

The browser check uses the real Chromium app, transport state, service worker, local storage and portrait bytes, with three explicitly synthetic provider responses. It verifies the top strip at 390 × 844, missing data, rate errors, key removal, and network-disabled reload. All six new portraits must be readable offline with the same SHA-256 as their bundled source files. The first harness run reached those checks but failed while trying to fetch the uncached installation manifest offline for reporting; the corrected harness reads that build identifier from source instead. No application change was needed for that reporting issue.

See `browser.json`, screenshots and `verification.json` for final results. Portrait sources and separate 12-check mobile appearance verification are in [realistic portraits](../realistic-panel-pals-0.35.1/README.md). No real Groq key or physical iPhone was available. Live account allowances and authenticated inference therefore remain unverified; the feature follows documented headers and tested synthetic contracts. No paid fallback, model selection change or Android APK update is included.

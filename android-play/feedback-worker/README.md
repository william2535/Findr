# FINDR Play — voluntary AI reports

This is a separate Cloudflare Worker and D1 database. It has not been deployed by this preparation. Do not replace the existing FINDR Site Worker or database. A working deployment, reviewed privacy policy and support contact are required before the AI-enabled Play release.

The Play-only form sends only engineer-reviewed category, description, optional answer excerpt, app version/package, a random report reference and consent. It does not read IndexedDB, jobs, manuals, hidden conversation context or provider keys. There is no public report-reader endpoint and the Worker never logs request bodies.

## Owner setup

Use the project's pinned Wrangler dependency (or a compatible installed Wrangler), signed in to the owner's Cloudflare account. These commands create new resources and incur the account's normal usage; they are instructions, not evidence of a deployment:

```sh
cd android-play/feedback-worker
cp wrangler.example.json wrangler.json
pnpm exec wrangler d1 create findr-play-feedback
# Set the returned database_id in wrangler.json. Keep a unique rate-limit namespace_id.
# Set FINDR_APPLICATION_ID to the confirmed Play package name.
pnpm exec wrangler d1 migrations apply findr-play-feedback --remote --config wrangler.json
pnpm exec wrangler deploy --config wrangler.json
```

Set the Play build's report URL to the returned HTTPS Worker origin plus `/reports`. `GET /health` must return `ready:true` and the expected application ID. The deployment must be tested from the actual Android build: submit a clearly labelled test report, retry the same report reference, and confirm one durable D1 row. The form must receive `accepted:true` with the same reference before showing success. A mocked test or `/health` alone does not prove end-to-end delivery.

Public policy and support contact must name the actual operator and explain Cloudflare processing. The UI retains a report only in memory while the form is open; failed/cancelled sends can be retried. After closing a failed report, the form contents are discarded. Cancellation cannot retract a report already received; same-reference retries are idempotent. Change the text to generate a new reference.

## Developer review and retention

Review D1 through the authenticated Cloudflare dashboard or Wrangler. Reports are not public and there is no unauthenticated API for reading them. Set up an operational review schedule before release; these files do not automatically notify a developer or establish that reports are reviewed.

Reports expire after 29 days. An hourly Cron Trigger deletes expired rows, leaving normal scheduling margin within the stated 30-day window. Monitor cleanup failures and delete overdue rows promptly. D1 backups/Time Travel and platform security/network logs are separate: establish and disclose their actual retention in the published privacy policy; do not promise zero retention. Avoid exporting reports to uncontrolled logs or public issues. A user may request deletion by supplying the random report reference to the public support contact.

Cloudflare receives normal connection metadata. `CF-Connecting-IP` is used transiently for its approximate, per-location rate-limit binding (10 requests/minute); IP and User-Agent are not stored by this application in D1. This is abuse reduction, not authentication or a strict global cost ceiling. CORS restricts browser origins but does not authenticate a native client. Configure account limits/monitoring appropriately; if adding Turnstile or authentication later, preserve accessible in-app reporting.

## Checks

```sh
node --test android-play/feedback-worker/tests/*.test.mjs
```

Tests use in-memory D1/rate-limit doubles and synthetic reports. They establish request validation, error handling, idempotency, source restrictions, client retry behaviour and scheduled expiry logic. They do not verify a deployed Cloudflare database, Play acceptance or Android network behaviour.

References: [Cloudflare rate-limit bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) and [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), checked 18 November 2026.

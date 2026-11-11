# Groq option for online Panel Pals

OpenAI is also available as an explicitly selected paid API option from web0.36.0; see [OpenAI setup](openai-panel-pals.md). The Groq-specific setup and limits below continue to apply.

Panel Pals can use one shared hosted language model when an engineer explicitly chooses online mode. This is hosted computation, not cloud storage for a local model: the model weights run on Groq, so this option does not require downloading them to the phone. Manuals, extracted text, indexes and conversations remain in FINDR's existing local stores. The compact local model and manual-search fallback remain separate options.

For this option the provider is **Groq**, model **`openai/gpt-oss-120b`**. GPT-OSS is an openly available model; this deployment uses Groq's hosted API, not an OpenAI API account. FINDR does not automatically switch online, upgrade an account, select a paid fallback, or retry a failed inference request.

## Engineer setup and cost boundary

1. Create or use a Groq account and check that it is on the **Free plan** in the provider console.
2. Create a personal API key at <https://console.groq.com/keys>. Enter it only in FINDR's explicit online-mode password field. Do not send it in chat, a GitHub issue or an exported helper.
3. Read and accept the online data disclosure and Free-plan confirmation. The key must be re-entered after this tab's in-memory session ends.
4. Use online mode while connected. To work without a connection, choose saved-manual search or install and select the existing supported local engine.

FINDR **cannot identify the account's billing tier from its API key**. A key belonging to a paid Groq account may incur provider charges. FINDR does not add a payment method or upgrade an account. Its relay stops on rate, quota and billing errors rather than silently trying another service. The current implementation has no shared site-owner API key or funded public proxy.

The documented Free limits checked on **11 November 2026** for this model are 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute and 200,000 tokens/day. These are account/organisation limits, can change, and are not equivalent to a number of FINDR questions: interpretation and source selection may each make a request. The provider console and official rate-limits page are authoritative. Provider-imposed limits may stop a request before FINDR's own size limit is reached.

## Data and credential handling

The browser sends the current bounded inference messages to the **same-origin FINDR relay**, which sends them to Groq. Depending on the step, these contain the question, relevant conversation context, model details and retrieved manual excerpts. This does not upload a whole PDF or the other helpers' libraries. Existing retrieval scoping and source/evidence checks still apply.

The engineer's key is held in browser module memory for the tab. It is sent to FINDR in `X-FINDR-Provider-Key`; the relay sends it to the fixed Groq host in `Authorization: Bearer …`. FINDR application code does not save or log keys, questions, upstream error bodies or manual excerpts. The key is not an environment variable, bundle constant, URL parameter, helper-export field, IndexedDB value, localStorage value or sessionStorage value. No key is shared between requests or users. Disconnecting must clear the module-held credential; reloading requires entering it again.

This is a bring-your-own-key trust boundary: the key passes through the FINDR host and provider. Page scripts, compromised extensions and host-level request inspection remain relevant risks. Host observability tooling must not capture the custom credential header or request bodies. Revoking a key is done in Groq's console. No claim is made that browser memory can protect a credential from a compromised browser or host.

Groq's policy says ordinary inference inputs and outputs are not retained by default, with exceptions including reliability troubleshooting, suspected abuse and legal requirements. Such content may be retained for up to 30 days in the stated troubleshooting/abuse cases. Zero Data Retention can be enabled in Groq's Data Controls; FINDR does not assume it is enabled. Review <https://console.groq.com/docs/your-data> before sending site or customer details. Do not describe this mode as offline or as automatic zero-retention processing.

## Fixed transport contract

Public policy: `public/app/online-language-policy.mjs`. Stateless server implementation: `lib/online-assistant.mjs`. App route: `app/api/assistant/online/route.ts`.

`GET /api/assistant/online` returns Groq public capability metadata by default (use `?providerId=openai` for the other configured provider), including `supported: true`, `requiresKey: true` and `serviceVerified: false`. It is not a successful key test, model load, paid/free account check or offline-readiness statement.

`POST /api/assistant/online` requires JSON, a same-origin browser request, a bounded personal key header, `allowOnline: true` and the exact current `consentVersion`. Its JSON body contains `messages`, optional `providerId` (legacy default: `groq`), optional `maxNewTokens`, and either `choices` or `outputFormat`. Only the two configured providers are accepted, each with its matching consent version. No arbitrary upstream host, provider model, tools, schema or additional fields are accepted.

The relay makes one non-streaming request to `https://api.groq.com/openai/v1/chat/completions`, with redirects disabled and the fixed GPT-OSS model. It does not use code execution, browser search, tools or stateful provider features. The local model's `maxNewTokens` is expanded with a bounded allowance because Groq counts hidden reasoning in its completion budget. Reasoning effort is low, and reasoning text is not requested or returned to the browser.

Limits per inference request:

- 64 KiB request bytes, checked while reading as well as by Content-Length.
- At most 20 text messages; at most 32,768 characters per message.
- At most 1,024 total provider completion tokens, including hidden reasoning.
- At most 128 KiB provider response bytes.
- 45-second deadline covering request processing, upstream headers and body reads.
- Cancellation propagated to the upstream fetch. Cancellation does not guarantee the provider has not already performed billable work on a paid account.

Groq strict JSON Schema constrains source-selection output to the supplied exact label enum. The relay unwraps `{"choice":"S1 Q2"}` to `text: "S1 Q2"`. Dialogue interpretation returns the existing `intent`, `tasks`, `focusTask` and `observations` structure; the compact tasks format returns `tasks`. Every response is checked again locally in the relay. Truncation, refusal, tool calls, unexpected fields and invalid labels are rejected. Schema validity is not evidence that a technical conclusion is correct; FINDR's existing client dialogue, manual citation, prerequisite and evidence checks remain required.

Success returns `{text, modelId, provider: "Groq", backend: "online", metrics}`. Errors return only a fixed `ONLINE_*` code and safe message, with a bounded Retry-After hint for rate limits when available. Provider bodies and arbitrary error strings are not returned. Responses use `Cache-Control: private, no-store`; no CORS allowance is added. The existing app service worker handles neither these POSTs nor this unlisted GET route.

## Deployment

No provider key is needed in the Site environment, Worker bindings, repository or `.env` file. Each engineer supplies their own key in the app. Deploy the new app route and its matching browser/policy assets together through the established FINDR release workflow. A static-only GitHub Pages deployment cannot execute this route: host the server-capable build on the documented Worker/Sites runtime or implement an equivalent private relay on a controlled host. Do not put an owner API key into a static build to work around that limitation.

## Verification and limits

Run the focused server tests with:

```sh
node --test tests/online-assistant.test.mjs
```

The server tests use **labelled synthetic responses**, not a real provider account. They cover consent, keys, origin, byte/message/token caps, exact choice and dialogue shapes, fixed model and endpoint, sanitized failures, rate limits without retries, stalled-body timeouts, cancellation, and request isolation between engineers. They do not measure model intelligence or establish that Groq accepts a particular account's key.

No authenticated inference or provider latency has been measured by this implementation task without an engineer-supplied key. There is no automatic offline equivalent to the hosted model. Public documentation confirms the selected endpoint, model and schema capability; an authenticated end-to-end request remains necessary before reporting successful real cloud inference.

Official references checked for the implementation:

- Model and availability: <https://console.groq.com/docs/model/openai/gpt-oss-120b> and <https://console.groq.com/docs/models>
- Strict JSON Schema: <https://console.groq.com/docs/structured-outputs>
- Chat API and reasoning budget: <https://console.groq.com/docs/api-reference> and <https://console.groq.com/docs/reasoning>
- Account limits: <https://console.groq.com/docs/rate-limits>
- Free/paid billing: <https://console.groq.com/docs/billing-faqs>
- Data handling: <https://console.groq.com/docs/your-data>

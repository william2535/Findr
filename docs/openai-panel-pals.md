# Optional OpenAI API connection

FINDR's online provider menu offers **OpenAI / GPT-6 Luna** alongside the existing Groq option. Select OpenAI deliberately and enter an **OpenAI API key** in the app's password field. This uses OpenAI's paid API; a ChatGPT login or subscription is not an API key or a promise of API credits. Review your API account's billing and limits before connecting. No account is upgraded by FINDR.

OpenAI setup:

- API keys: <https://platform.openai.com/api-keys>
- API billing: <https://platform.openai.com/settings/organization/billing/overview>
- Pricing: <https://openai.com/api/pricing/>
- Data policy: <https://developers.openai.com/api/docs/guides/your-data>

The selected fixed model is `gpt-6-luna`, verified against the current official model page on 11 November 2026. It supports Chat Completions and strict Structured Outputs. The model page lists `gpt-6-luna` as its snapshot; it does not currently document a dated snapshot identifier. The relay accepts only that documented response identity, not arbitrary similarly named models. Future model changes require a reviewed policy/code change.

The same-origin `/api/assistant/online` route accepts `providerId: "openai"` only with `consentVersion: "openai-byok-v1"`. It sends a single bounded request to `https://api.openai.com/v1/chat/completions` using the engineer's request-local API key. It fixes the model, uses `reasoning_effort: "none"`, `store: false`, a strict source-choice or dialogue JSON schema, and a maximum of 1,024 completion tokens. It sends no tools, arbitrary upstream URL, web search, image generation or uploaded PDF. There are no automatic retries or provider fallbacks. Leaving `providerId` out retains the existing Groq protocol, including Groq-specific consent.

The model interprets requests and selects from retrieved evidence. It does not replace FINDR's manual-source, numerical, diagnostic or safety checks. The same local manual library and conversations remain available when the internet is unavailable; hosted OpenAI inference itself requires a connection.

The API key is not saved in helpers, exports, localStorage, sessionStorage or IndexedDB. It passes through the FINDR relay to the selected provider and must be entered again after the in-memory session ends. As with the Groq option, the browser, page scripts, relay operator and provider form the trust boundary. Do not send keys through chat or commit them to GitHub. Host-level logging must exclude the credential header and request bodies.

`store: false` disables Chat Completions application-state storage; it does **not** promise zero retention. OpenAI's API data policy says API data is not used to train models by default unless explicitly opted in, while default abuse-monitoring logs may retain content for up to 30 days, with the policy's stated exceptions. Zero Data Retention requires eligibility and approval. Check the current policy before sending customer or site information.

OpenAI uses HTTP 429 for both rate limits and insufficient account quota. The relay reads only the bounded error machine code and maps `insufficient_quota` to an account/billing error. It does not expose the provider's message. OpenAI response headers describe request/token **per-minute** rate buckets, unlike Groq's request-per-day header bucket; the client must label them using provider identity. Rate-limit headers do not establish remaining prepaid credit, monthly budget or free eligibility.

Verification uses synthetic provider responses only:

```sh
node --test tests/online-assistant.test.mjs tests/online-assistant-openai.test.mjs
```

These tests cover fixed provider routing, matching consent, backwards-compatible Groq defaults, output schemas, bounds, canonical model identity and separate rate/quota failures. No authenticated OpenAI inference, paid-account access or provider latency was verified without an API key. Do not present mocked tests as successful real cloud inference.

Official implementation references:

- <https://developers.openai.com/api/docs/models/gpt-6-luna>
- <https://developers.openai.com/api/docs/guides/structured-outputs>
- <https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create>
- <https://developers.openai.com/api/docs/guides/rate-limits>
- <https://developers.openai.com/api/docs/guides/your-data>

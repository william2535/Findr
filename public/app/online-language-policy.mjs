// Public configuration only. Credentials must never be added to this module.
export const ONLINE_PROVIDER = Object.freeze({
  id: 'groq',
  name: 'Groq',
  modelId: 'openai/gpt-oss-120b',
  modelName: 'GPT-OSS 120B',
  consentVersion: 'groq-byok-v1',
  endpoint: '/api/assistant/online',
  header: 'X-FINDR-Provider-Key',
  credentialMode: 'per-user-memory',
  limits: Object.freeze({maxRequestBytes: 65536, maxMessages: 20, maxOutputTokens: 1024, timeoutMs: 45000}),
  freeTierLimits: Object.freeze({requestsPerMinute: 30, requestsPerDay: 1000, tokensPerMinute: 8000, tokensPerDay: 200000, checkedOn: '2026-11-11'}),
  keyURL: 'https://console.groq.com/keys',
  accountURL: 'https://console.groq.com/settings/organization/billing',
  limitsURL: 'https://console.groq.com/docs/rate-limits',
  billingURL: 'https://console.groq.com/docs/billing-faqs',
  policyURL: 'https://console.groq.com/docs/your-data',
  modelURL: 'https://console.groq.com/docs/model/openai/gpt-oss-120b',
});

// Fixed messages are shared with the browser; never display provider error bodies.
export const ONLINE_ERRORS = Object.freeze({
  ONLINE_CONSENT_REQUIRED: 'Choose online mode and confirm what will be sent before using Groq.',
  ONLINE_KEY_REQUIRED: 'Add your own Groq API key to connect this tab.',
  ONLINE_INVALID_REQUEST: 'This request could not be sent. Shorten it or try again.',
  ONLINE_REQUEST_TOO_LARGE: 'This request is too large for online mode. Try a shorter question.',
  ONLINE_ORIGIN_REJECTED: 'Open FINDR directly and try again.',
  ONLINE_AUTH_FAILED: 'Groq did not accept that API key. Check the key and reconnect.',
  ONLINE_RATE_LIMITED: 'Groq has reached an account limit. Wait before trying again, or use saved-manual search.',
  ONLINE_BILLING_REQUIRED: 'Groq requires an account or billing change. FINDR has stopped; it will not upgrade your account.',
  ONLINE_PROVIDER_UNAVAILABLE: 'Groq could not be reached. Your conversation is still saved.',
  ONLINE_PROVIDER_REJECTED: 'Groq could not process this request. Your conversation is still saved.',
  ONLINE_INVALID_RESPONSE: 'Groq did not return an answer FINDR could verify. Your conversation is still saved.',
  ONLINE_TIMEOUT: 'Groq took too long to reply. Your conversation is still saved.',
  ONLINE_CANCELLED: 'The online request was cancelled. Your conversation is still saved.',
});

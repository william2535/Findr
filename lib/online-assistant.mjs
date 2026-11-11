import {readProviderAllowance} from '../public/app/online-usage.mjs';
import {ONLINE_PROVIDER, ONLINE_ERRORS, getOnlineProvider} from '../public/app/online-language-policy.mjs';

const UPSTREAMS = Object.freeze({groq: 'https://api.groq.com/openai/v1/chat/completions', openai: 'https://api.openai.com/v1/chat/completions'});
// The official GPT-6 Luna page currently lists only this canonical snapshot.
// Add a dated model identity only after it appears in official model documentation.
const RESPONSE_MODELS = Object.freeze({groq: ['openai/gpt-oss-120b'], openai: ['gpt-6-luna']});
const RESPONSE_LIMIT = 131072;
const ALLOWED_FIELDS = new Set(['providerId', 'allowOnline', 'consentVersion', 'messages', 'maxNewTokens', 'choices', 'outputFormat']);
const INTENTS = ['procedure', 'fault', 'followup', 'correction', 'clarification', 'other'];
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const ownKeys = (value, expected) => isObject(value) && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const validString = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\u0000');

class OnlineError extends Error {
  constructor(code, status, retryAfterSeconds) {
    super(ONLINE_ERRORS[code]);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function json(value, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(value), {status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    ...additionalHeaders,
  }});
}

function errorResponse(error, allowance = null) {
  const known = error instanceof OnlineError ? error : new OnlineError('ONLINE_PROVIDER_UNAVAILABLE', 502);
  const retry = known.retryAfterSeconds;
  return json({error: {code: known.code, message: known.message, ...(retry !== undefined ? {retryAfterSeconds: retry} : {})}, ...(allowance ? {allowance} : {})}, known.status,
    retry !== undefined ? {'Retry-After': String(retry)} : {});
}

function aborted(signal) {
  if (signal.aborted) throw signal.reason;
}

// Race every read/fetch against cancellation as well as passing the native signal.
// This bounds stalled response bodies and injected/nonconforming fetch adapters too.
function withAbort(promise, signal) {
  aborted(signal);
  return new Promise((resolve, reject) => {
    const stop = () => {signal.removeEventListener('abort', stop); reject(signal.reason);};
    signal.addEventListener('abort', stop, {once: true});
    Promise.resolve(promise).then(value => {signal.removeEventListener('abort', stop); resolve(value);}, error => {signal.removeEventListener('abort', stop); reject(error);});
  });
}

async function readJSON(body, headers, limit, signal, invalidCode, tooLargeCode) {
  const length = headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new OnlineError(tooLargeCode, tooLargeCode === 'ONLINE_REQUEST_TOO_LARGE' ? 413 : 502);
  if (!body) throw new OnlineError(invalidCode, invalidCode === 'ONLINE_INVALID_REQUEST' ? 400 : 502);
  const reader = body.getReader(), chunks = [];
  let size = 0, finished = false;
  try {
    while (true) {
      aborted(signal);
      const {done, value} = await withAbort(reader.read(), signal);
      if (done) {finished = true; break;}
      size += value.byteLength;
      if (size > limit) throw new OnlineError(tooLargeCode, tooLargeCode === 'ONLINE_REQUEST_TOO_LARGE' ? 413 : 502);
      chunks.push(value);
    }
  } finally {
    if (!finished) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.byteLength;}
  try {return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));}
  catch {throw new OnlineError(invalidCode, invalidCode === 'ONLINE_INVALID_REQUEST' ? 400 : 502);}
}

function validateRequest(value) {
  if (!isObject(value) || Object.keys(value).some(key => !ALLOWED_FIELDS.has(key))) throw new OnlineError('ONLINE_INVALID_REQUEST', 400);
  const provider = getOnlineProvider(value.providerId);
  if (!provider) throw new OnlineError('ONLINE_INVALID_REQUEST', 400);
  if (value.allowOnline !== true || value.consentVersion !== provider.consentVersion) throw new OnlineError('ONLINE_CONSENT_REQUIRED', 403);
  const {messages, choices, outputFormat} = value;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > ONLINE_PROVIDER.limits.maxMessages || !messages.some(message => message?.role === 'user')) throw new OnlineError('ONLINE_INVALID_REQUEST', 400);
  for (const message of messages) {
    if (!ownKeys(message, ['role', 'content']) || !['system', 'user', 'assistant'].includes(message.role) || !validString(message.content, 32768)) throw new OnlineError('ONLINE_INVALID_REQUEST', 400);
  }
  const maxNewTokens = value.maxNewTokens ?? 256;
  if (!Number.isInteger(maxNewTokens) || maxNewTokens < 1 || maxNewTokens > ONLINE_PROVIDER.limits.maxOutputTokens) throw new OnlineError('ONLINE_INVALID_REQUEST', 400);
  if (choices !== undefined && (!Array.isArray(choices) || choices.length < 1 || choices.length > 256 || choices.some(choice => !validString(choice, 40) || !/^(?:S[1-9]\d{0,2}|NONE)(?: Q[1-9]\d{0,2})?$/.test(choice)) || new Set(choices).size !== choices.length)) throw new OnlineError('ONLINE_INVALID_REQUEST', 400);
  if (outputFormat !== undefined && !['tasks', 'json', 'dialogue'].includes(outputFormat) || choices !== undefined && outputFormat !== undefined) throw new OnlineError('ONLINE_INVALID_REQUEST', 400);
  return {messages, choices, outputFormat, maxNewTokens, provider};
}

function structuredFormat(request) {
  const task = {type: 'object', properties: {action: {type: 'string'}, target: {type: 'string'}}, required: ['action', 'target'], additionalProperties: false};
  let schema, name;
  if (request.choices) {
    name = 'findr_source_choice';
    schema = {type: 'object', properties: {choice: {type: 'string', enum: request.choices}}, required: ['choice'], additionalProperties: false};
  } else if (request.outputFormat === 'tasks') {
    name = 'findr_requested_tasks';
    schema = {type: 'object', properties: {tasks: {type: 'array', items: task}}, required: ['tasks'], additionalProperties: false};
  } else {
    name = 'findr_dialogue';
    schema = {type: 'object', properties: {
      intent: {type: 'string', enum: INTENTS},
      tasks: {type: 'array', items: task},
      focusTask: {type: ['integer', 'null']},
      observations: {type: 'array', items: {type: 'string'}},
    }, required: ['intent', 'tasks', 'focusTask', 'observations'], additionalProperties: false};
  }
  return {type: 'json_schema', json_schema: {name, strict: true, schema}};
}

function validatedOutput(response, request) {
  const invalid = () => {throw new OnlineError('ONLINE_INVALID_RESPONSE', 502);};
  if (!isObject(response) || response.model !== undefined && !RESPONSE_MODELS[request.provider.id].includes(response.model) || !Array.isArray(response.choices) || response.choices.length !== 1) invalid();
  const choice = response.choices[0], message = choice?.message;
  if (choice?.finish_reason !== 'stop' || message?.role !== 'assistant' || message?.refusal || message?.tool_calls?.length || !validString(message?.content, 12000)) invalid();
  let value;
  try {value = JSON.parse(message.content);}
  catch {invalid();}
  if (request.choices) {
    if (!ownKeys(value, ['choice']) || !request.choices.includes(value.choice)) invalid();
    return value.choice;
  }
  const tasksOnly = request.outputFormat === 'tasks';
  if (!ownKeys(value, tasksOnly ? ['tasks'] : ['intent', 'tasks', 'focusTask', 'observations']) || !Array.isArray(value.tasks) || value.tasks.length > 12 || value.tasks.some(task => !ownKeys(task, ['action', 'target']) || !validString(task.action, 48) || !validString(task.target, 160))) invalid();
  if (!tasksOnly && (!INTENTS.includes(value.intent) || value.focusTask !== null && (!Number.isInteger(value.focusTask) || value.focusTask < 1 || value.focusTask > 12) || !Array.isArray(value.observations) || value.observations.length > 20 || value.observations.some(observation => !validString(observation, 4000)))) invalid();
  // Client-side dialogue/evidence validation still checks meaning and source spans.
  return JSON.stringify(value);
}

function retryAfter(value, now) {
  if (!value) return undefined;
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - now) / 1000);
  return Number.isFinite(seconds) ? Math.max(1, Math.min(3600, seconds)) : undefined;
}

function upstreamError(response, now) {
  const status = response.status;
  if (status === 401 || status === 403) return new OnlineError('ONLINE_AUTH_FAILED', 401);
  if (status === 402) return new OnlineError('ONLINE_BILLING_REQUIRED', 402);
  if (status === 429) return new OnlineError('ONLINE_RATE_LIMITED', 429, retryAfter(response.headers.get('retry-after'), now));
  if (status >= 500) return new OnlineError('ONLINE_PROVIDER_UNAVAILABLE', 503);
  return new OnlineError('ONLINE_PROVIDER_REJECTED', 502);
}

/** Stateless BYOK relay. No environment keys, persistence, retries or request logs. */
export async function handleOnlineAssistantRequest(request, {fetchImpl = globalThis.fetch, timeoutMs = ONLINE_PROVIDER.limits.timeoutMs, now = Date.now} = {}) {
  if (request.method === 'GET') {
    const provider = getOnlineProvider(new URL(request.url).searchParams.get('providerId') ?? undefined);
    if (!provider) return errorResponse(new OnlineError('ONLINE_INVALID_REQUEST', 400));
    return json({supported: true, providerId: provider.id, provider: provider.name, modelId: provider.modelId, consentVersion: provider.consentVersion, credentialMode: provider.credentialMode, billingType: provider.billingType, requiresKey: true, serviceVerified: false, ...(provider.freeTierLimits ? {freeTierLimits: provider.freeTierLimits} : {}), policyURL: provider.policyURL});
  }
  if (request.method !== 'POST') return json({error: {code: 'ONLINE_INVALID_REQUEST', message: ONLINE_ERRORS.ONLINE_INVALID_REQUEST}}, 405, {Allow: 'GET, POST'});
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') return errorResponse(new OnlineError('ONLINE_ORIGIN_REJECTED', 403));
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return errorResponse(new OnlineError('ONLINE_INVALID_REQUEST', 400));
  const key = request.headers.get(ONLINE_PROVIDER.header);
  if (!key || !/^[\x21-\x7e]{16,512}$/.test(key)) return errorResponse(new OnlineError('ONLINE_KEY_REQUIRED', 401));

  const controller = new AbortController();
  const stop = () => controller.abort(new OnlineError('ONLINE_CANCELLED', 499));
  request.signal.addEventListener('abort', stop, {once: true});
  if (request.signal.aborted) stop();
  const timer = setTimeout(() => controller.abort(new OnlineError('ONLINE_TIMEOUT', 504)), Math.max(1, Math.min(ONLINE_PROVIDER.limits.timeoutMs, timeoutMs)));
  const started = now();
  let allowance = null;
  try {
    aborted(controller.signal);
    const input = validateRequest(await readJSON(request.body, request.headers, ONLINE_PROVIDER.limits.maxRequestBytes, controller.signal, 'ONLINE_INVALID_REQUEST', 'ONLINE_REQUEST_TOO_LARGE'));
    const provider = input.provider;
    const payload = {
      model: provider.modelId,
      messages: input.messages,
      response_format: structuredFormat(input),
      // GPT-OSS counts hidden reasoning in this budget. Local source selection's
      // 24 output tokens need some reasoning headroom, still capped per request.
      max_completion_tokens: provider.id === 'openai' ? Math.min(provider.limits.maxOutputTokens, Math.max(input.choices ? 64 : 384, input.maxNewTokens)) : Math.min(provider.limits.maxOutputTokens, Math.max(512, input.maxNewTokens + 512)),
      ...(provider.id === 'openai' ? {reasoning_effort: 'none', store: false} : {reasoning_effort: 'low', include_reasoning: false, temperature: 0}),
      stream: false,
      n: 1,
    };
    const upstream = await withAbort(fetchImpl(UPSTREAMS[provider.id], {method: 'POST', redirect: 'error', signal: controller.signal, headers: {'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + key}, body: JSON.stringify(payload)}), controller.signal);
    allowance = readProviderAllowance(upstream.headers, now(), provider.id);
    if (!upstream.ok) {
      if (provider.id === 'openai' && upstream.status === 429) {
        // OpenAI uses 429 for both rate limits and exhausted API credits. Read
        // only the machine code; never expose or log the provider's error text.
        let failure;
        try {failure = await readJSON(upstream.body, upstream.headers, 16384, controller.signal, 'ONLINE_INVALID_RESPONSE', 'ONLINE_INVALID_RESPONSE');}
        catch (error) {if (controller.signal.aborted) throw error;}
        if (failure?.error?.code === 'insufficient_quota' || failure?.error?.type === 'insufficient_quota') throw new OnlineError('ONLINE_BILLING_REQUIRED', 402);
        throw upstreamError(upstream, now());
      }
      void upstream.body?.cancel().catch(() => {});
      throw upstreamError(upstream, now());
    }
    const response = await readJSON(upstream.body, upstream.headers, RESPONSE_LIMIT, controller.signal, 'ONLINE_INVALID_RESPONSE', 'ONLINE_INVALID_RESPONSE');
    const text = validatedOutput(response, input), metrics = {elapsedMs: Math.max(0, now() - started)};
    if (Number.isSafeInteger(response.usage?.prompt_tokens) && response.usage.prompt_tokens >= 0) metrics.inputTokens = response.usage.prompt_tokens;
    if (Number.isSafeInteger(response.usage?.completion_tokens) && response.usage.completion_tokens >= 0) metrics.outputTokens = response.usage.completion_tokens;
    return json({text, modelId: provider.modelId, provider: provider.name, providerId: provider.id, backend: 'online', metrics, ...(allowance ? {allowance} : {})});
  } catch (error) {
    // Never log or echo provider bodies, credentials, prompts, manuals or jobs.
    return errorResponse(controller.signal.aborted ? controller.signal.reason : error, allowance);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', stop);
  }
}

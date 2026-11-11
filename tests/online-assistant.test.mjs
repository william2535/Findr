import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOnlineAssistantRequest} from '../lib/online-assistant.mjs';
import {ONLINE_PROVIDER, ONLINE_ERRORS} from '../public/app/online-language-policy.mjs';
import {createOnlineLanguage} from '../public/app/online-language.mjs';
import {buildHelperRequest} from '../public/app/helpers-engine.mjs';
import {buildHelperDialogueRequest} from '../public/app/helper-dialogue.mjs';

// Synthetic transport fixtures only. These do not claim authenticated Groq inference.
const URL = 'https://findr.example/api/assistant/online';
const KEY = 'synthetic-test-key-not-a-credential';
const headers = {'Content-Type': 'application/json', Origin: 'https://findr.example', [ONLINE_PROVIDER.header]: KEY};
const body = changes => ({allowOnline: true, consentVersion: ONLINE_PROVIDER.consentVersion, messages: [{role: 'system', content: 'Select a supplied source.'}, {role: 'user', content: 'SYNTHETIC question'}], choices: ['S1', 'NONE'], maxNewTokens: 24, ...changes});
const request = (changes, init = {}) => new Request(URL, {method: 'POST', headers, body: JSON.stringify(body(changes)), ...init});
const upstream = (value = {choice: 'S1'}, overrides = {}) => Response.json({model: ONLINE_PROVIDER.modelId, choices: [{finish_reason: 'stop', message: {role: 'assistant', content: JSON.stringify(value)}}], usage: {prompt_tokens: 100, completion_tokens: 6}, ...overrides});
const never = () => {throw new Error('Unexpected provider request');};
const decoded = async (req, options = {}) => {const response = await handleOnlineAssistantRequest(req, options); return {response, value: await response.json()};};
const assertError = (result, code, status) => {
  assert.equal(result.response.status, status);
  assert.equal(result.value.error.code, code);
  assert.equal(result.value.error.message, ONLINE_ERRORS[code]);
  assert.match(result.response.headers.get('cache-control'), /no-store/);
  assert.equal(result.response.headers.get('access-control-allow-origin'), null);
};

test('public capability metadata requires a personal key and does not claim verified service or model readiness', async () => {
  const {response, value} = await decoded(new Request(URL), {fetchImpl: never});
  assert.equal(response.status, 200);
  assert.equal(value.supported, true);
  assert.equal(value.requiresKey, true);
  assert.equal(value.serviceVerified, false);
  assert.equal(value.credentialMode, 'per-user-memory');
  assert.equal(value.modelId, 'openai/gpt-oss-120b');
  assert.equal(value.freeTierLimits.requestsPerDay, 1000);
  assert.equal(value.configured, undefined);
  assert.match(response.headers.get('cache-control'), /no-store/);
});

test('one bounded fixed-host request unwraps an exact choice and returns only allowlisted metrics', async () => {
  const calls = [];
  const result = await decoded(request(), {fetchImpl: async (url, init) => {
    calls.push({url, init});
    return upstream({choice: 'S1'}, {extra: KEY, usage: {prompt_tokens: 100, completion_tokens: 6, unsafeExtra: KEY}});
  }});
  assert.equal(result.response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer ' + KEY);
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.model, ONLINE_PROVIDER.modelId);
  assert.equal(sent.stream, false);
  assert.equal(sent.reasoning_effort, 'low');
  assert.equal(sent.include_reasoning, false);
  assert.ok(sent.max_completion_tokens > 24 && sent.max_completion_tokens <= 1024);
  assert.equal(sent.response_format.json_schema.strict, true);
  assert.deepEqual(sent.response_format.json_schema.schema.properties.choice.enum, ['S1', 'NONE']);
  for (const field of ['tools', 'tool_choice', 'store', 'metadata', 'user', 'apiKey']) assert.equal(Object.hasOwn(sent, field), false);
  assert.equal(result.value.text, 'S1');
  assert.equal(result.value.backend, 'online');
  assert.equal(result.value.provider, 'Groq');
  assert.equal(result.value.metrics.inputTokens, 100);
  assert.equal(result.value.metrics.outputTokens, 6);
  assert.ok(result.value.metrics.elapsedMs >= 0);
  assert.equal(JSON.stringify(result.value).includes(KEY), false);
});

test('combined source/question labels round-trip unchanged', async () => {
  const result = await decoded(request({choices: ['S1 Q2', 'NONE Q2']}), {fetchImpl: async () => upstream({choice: 'NONE Q2'})});
  assert.equal(result.value.text, 'NONE Q2');
});

test('explicit consent, personal key, origin, method and JSON are checked before inference', async () => {
  const cases = [
    [request({allowOnline: false}), 'ONLINE_CONSENT_REQUIRED', 403],
    [request({consentVersion: 'old'}), 'ONLINE_CONSENT_REQUIRED', 403],
    [request({}, {headers: {'Content-Type': 'application/json'}}), 'ONLINE_KEY_REQUIRED', 401],
    [request({}, {headers: {...headers, [ONLINE_PROVIDER.header]: 'too short'}}), 'ONLINE_KEY_REQUIRED', 401],
    [request({}, {headers: {...headers, Origin: 'https://another.example'}}), 'ONLINE_ORIGIN_REJECTED', 403],
    [request({}, {headers: {...headers, 'Sec-Fetch-Site': 'cross-site'}}), 'ONLINE_ORIGIN_REJECTED', 403],
    [request({}, {headers: {...headers, 'Content-Type': 'text/plain'}}), 'ONLINE_INVALID_REQUEST', 400],
    [new Request(URL, {method: 'OPTIONS'}), 'ONLINE_INVALID_REQUEST', 405],
  ];
  for (const [req, code, status] of cases) assertError(await decoded(req, {fetchImpl: never}), code, status);
});

test('request validation rejects model/URL/tool overrides and malformed protocol data', async () => {
  const invalid = [
    {model: 'different'}, {url: 'https://attacker.example'}, {tools: []},
    {messages: []}, {messages: Array(21).fill({role: 'user', content: 'test'})},
    {messages: [{role: 'tool', content: 'test'}]}, {messages: [{role: 'system', content: 'test'}]},
    {messages: [{role: 'user', content: {text: 'test'}}]}, {messages: [{role: 'user', content: 'test', name: 'extra'}]},
    {messages: [{role: 'user', content: 'x'.repeat(32769)}]},
    {maxNewTokens: 0}, {maxNewTokens: 1025}, {maxNewTokens: 1.5},
    {choices: []}, {choices: ['S1', 'S1']}, {choices: ['invented prose']},
    {outputFormat: 'tasks'}, {choices: undefined, outputFormat: 'arbitrary-schema'},
  ];
  for (const changes of invalid) assertError(await decoded(request(changes), {fetchImpl: never}), 'ONLINE_INVALID_REQUEST', 400);
  for (const value of ['null', '[]', '{broken', '"text"']) assertError(await decoded(request({}, {body: value}), {fetchImpl: never}), 'ONLINE_INVALID_REQUEST', 400);
});

test('request byte limits apply to declared length and streamed bytes without Content-Length', async () => {
  assertError(await decoded(request({}, {headers: {...headers, 'Content-Length': '65537'}}), {fetchImpl: never}), 'ONLINE_REQUEST_TOO_LARGE', 413);
  assertError(await decoded(request({messages: [{role: 'user', content: '😀'.repeat(18000)}]}), {fetchImpl: never}), 'ONLINE_REQUEST_TOO_LARGE', 413);
});

test('dialogue and tasks schemas return machine-readable structures, not free technical prose', async () => {
  const dialogue = {intent: 'procedure', tasks: [{action: 'disable', target: 'outputs'}, {action: 'replace', target: 'device'}, {action: 'enable', target: 'device'}], focusTask: null, observations: []};
  for (const format of [undefined, 'json', 'dialogue', 'tasks']) {
    const expected = format === 'tasks' ? {tasks: dialogue.tasks} : dialogue;
    let sent;
    const result = await decoded(request({choices: undefined, outputFormat: format, maxNewTokens: 256}), {fetchImpl: async (_url, init) => {sent = JSON.parse(init.body); return upstream(expected);}});
    assert.equal(result.response.status, 200);
    assert.deepEqual(JSON.parse(result.value.text), expected);
    const schema = sent.response_format.json_schema.schema;
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.tasks.items.additionalProperties, false);
    assert.deepEqual(schema.required, Object.keys(schema.properties));
  }
});

test('invalid, truncated, refused, unscoped and extra-field responses never escape as verified output', async () => {
  const bad = [
    () => upstream({choice: 'S99'}),
    () => upstream({choice: 'S1', extra: 'instructions'}),
    () => upstream({choice: 'S1'}, {model: 'unrequested-model'}),
    () => upstream({choice: 'S1'}, {choices: [{finish_reason: 'length', message: {role: 'assistant', content: '{"choice":"S1"}'}}]}),
    () => upstream({choice: 'S1'}, {choices: [{finish_reason: 'stop', message: {role: 'assistant', content: '{"choice":"S1"}', refusal: 'refused'}}]}),
    () => upstream({choice: 'S1'}, {choices: [{finish_reason: 'stop', message: {role: 'assistant', content: '{"choice":"S1"}', tool_calls: [{}]}}]}),
    () => upstream({choice: 'S1'}, {choices: [{finish_reason: 'stop', message: {role: 'assistant', content: 'Press invented buttons.'}}]}),
    () => new Response('not JSON'),
    () => new Response('x'.repeat(131073)),
  ];
  for (const make of bad) assertError(await decoded(request(), {fetchImpl: async () => make()}), 'ONLINE_INVALID_RESPONSE', 502);
  for (const value of [
    {intent: 'confirmed', tasks: [], focusTask: null, observations: []},
    {intent: 'procedure', tasks: [{action: 'test', target: 'panel', performed: true}], focusTask: null, observations: []},
    {intent: 'procedure', tasks: Array(13).fill({action: 'test', target: 'panel'}), focusTask: null, observations: []},
    {intent: 'procedure', tasks: [], focusTask: 0, observations: []},
    {intent: 'procedure', tasks: [], focusTask: null, observations: [{value: 12}]},
    {tasks: []},
  ]) assertError(await decoded(request({choices: undefined}), {fetchImpl: async () => upstream(value)}), 'ONLINE_INVALID_RESPONSE', 502);
});

test('upstream errors are classified without leaking bodies, retrying or choosing another model', async () => {
  for (const [status, code, publicStatus] of [[401, 'ONLINE_AUTH_FAILED', 401], [403, 'ONLINE_AUTH_FAILED', 401], [402, 'ONLINE_BILLING_REQUIRED', 402], [429, 'ONLINE_RATE_LIMITED', 429], [500, 'ONLINE_PROVIDER_UNAVAILABLE', 503], [400, 'ONLINE_PROVIDER_REJECTED', 502], [307, 'ONLINE_PROVIDER_REJECTED', 502]]) {
    let calls = 0;
    const result = await decoded(request(), {fetchImpl: async () => {calls++; return new Response('SENSITIVE PROVIDER BODY ' + KEY, {status, headers: {'Retry-After': '60000'}});}});
    assertError(result, code, publicStatus);
    assert.equal(calls, 1);
    assert.equal(JSON.stringify(result.value).includes(KEY), false);
    if (status === 429) {assert.equal(result.response.headers.get('retry-after'), '3600'); assert.equal(result.value.error.retryAfterSeconds, 3600);}
  }
  assertError(await decoded(request(), {fetchImpl: async () => {throw Error('secret network info ' + KEY);}}), 'ONLINE_PROVIDER_UNAVAILABLE', 502);
});

test('timeout bounds fetch headers and stalled bodies and aborts the provider request', async () => {
  let signal;
  assertError(await decoded(request(), {timeoutMs: 15, fetchImpl: async (_url, init) => {signal = init.signal; return new Promise(() => {});}}), 'ONLINE_TIMEOUT', 504);
  assert.equal(signal.aborted, true);
  let cancelled = false;
  assertError(await decoded(request(), {timeoutMs: 15, fetchImpl: async () => new Response(new ReadableStream({start(controller) {controller.enqueue(new TextEncoder().encode('{'));}, cancel() {cancelled = true;}}))}), 'ONLINE_TIMEOUT', 504);
  assert.equal(cancelled, true);
});

test('caller cancellation stops processing without retry or persisted credential', async () => {
  const controller = new AbortController();
  let calls = 0, upstreamSignal;
  const resultPromise = decoded(request({}, {signal: controller.signal}), {fetchImpl: async (_url, init) => {calls++; upstreamSignal = init.signal; controller.abort(); return new Promise(() => {});}});
  assertError(await resultPromise, 'ONLINE_CANCELLED', 499);
  assert.equal(calls, 1);
  assert.equal(upstreamSignal.aborted, true);
  assertError(await decoded(request({}, {headers: {'Content-Type': 'application/json'}}), {fetchImpl: never}), 'ONLINE_KEY_REQUIRED', 401);
});

test('concurrent engineers never reuse each other’s request-local credentials or messages', async () => {
  const seen = [];
  const fetchImpl = async (_url, init) => {seen.push({key: init.headers.Authorization, question: JSON.parse(init.body).messages.at(-1).content}); await Promise.resolve(); return upstream();};
  await Promise.all(['alpha', 'bravo'].map(name => decoded(request({messages: [{role: 'user', content: name}]}, {headers: {...headers, [ONLINE_PROVIDER.header]: 'synthetic-credential-for-' + name}}), {fetchImpl})));
  assert.deepEqual(seen.map(value => [value.question, value.key]).sort(), [['alpha', 'Bearer synthetic-credential-for-alpha'], ['bravo', 'Bearer synthetic-credential-for-bravo']]);
});

test('actual helper request builders traverse the client and server without protocol translation gaps', async () => {
  const consent = {provider: ONLINE_PROVIDER.id, modelId: ONLINE_PROVIDER.modelId, version: ONLINE_PROVIDER.consentVersion, acceptedAt: 1000, freePlanConfirmed: true};
  const providerCalls = [];
  const language = createOnlineLanguage({getOrigin: () => 'https://findr.example', getOnline: () => true, fetchImpl: (url, init) => {
    assert.equal(url, '/api/assistant/online');
    return handleOnlineAssistantRequest(new Request(URL, {...init, headers: {...init.headers, Origin: 'https://findr.example'}}), {fetchImpl: async (_upstreamURL, options) => {
      const sent = JSON.parse(options.body);
      providerCalls.push(sent);
      const name = sent.response_format.json_schema.name;
      if (name === 'findr_source_choice') return upstream({choice: 'S1 Q2'});
      const tasks = [{action: 'disable', target: 'outputs'}, {action: 'replace', target: 'detector'}, {action: 'enable', target: 'detector'}];
      return upstream(name === 'findr_requested_tasks' ? {tasks} : {intent: 'procedure', tasks, focusTask: null, observations: []});
    }});
  }});
  language.setOnlineKey(KEY);
  const helper = {scope: {brand: 'SYNTHETIC', model: 'Fixture Panel'}};
  const conversation = {messages: [], context: {observations: []}};
  const selection = buildHelperRequest({helper, conversation, question: 'SYNTHETIC loop fault', passages: [{citationId: 'S1', text: 'SYNTHETIC fixture excerpt.'}], questions: [{id: 'Q2', text: 'Is it showing now?'}]});
  assert.equal((await language.generateOnlineReply({...selection, consent})).text, 'S1 Q2');
  for (const format of ['json', 'tasks-json']) {
    const dialogue = buildHelperDialogueRequest({helper, conversation, question: 'Disable outputs, replace the detector and enable the detector.', format});
    const answer = await language.generateOnlineReply({...dialogue, consent});
    assert.equal(JSON.parse(answer.text).tasks.length, 3);
  }
  assert.equal(providerCalls.length, 3);
  assert.ok(providerCalls.every(call => call.model === ONLINE_PROVIDER.modelId));
  language.clearOnlineKey();
});

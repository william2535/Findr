// Synthetic OpenAI transport responses only; no real API key or paid request.
import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOnlineAssistantRequest} from '../lib/online-assistant.mjs';
import {ONLINE_PROVIDER, ONLINE_PROVIDERS, getOnlineProvider} from '../public/app/online-language-policy.mjs';

const provider = getOnlineProvider('openai');
const url = 'https://findr.example/api/assistant/online';
const key = 'SYNTHETIC_OPENAI_TEST_NOT_A_CREDENTIAL';
const body = extra => ({providerId: 'openai', allowOnline: true, consentVersion: provider.consentVersion, messages: [{role: 'user', content: 'SYNTHETIC question'}], choices: ['S1', 'NONE'], maxNewTokens: 24, ...extra});
const request = extra => new Request(url, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: 'https://findr.example', [provider.header]: key}, body: JSON.stringify(body(extra))});
const output = (value = {choice: 'S1'}, extra = {}) => Response.json({model: provider.modelId, choices: [{finish_reason: 'stop', message: {role: 'assistant', content: JSON.stringify(value)}}], usage: {prompt_tokens: 90, completion_tokens: 4}, ...extra});
const run = async (extra, fetchImpl) => {const response = await handleOnlineAssistantRequest(request(extra), {fetchImpl}); return {status: response.status, value: await response.json()};};
const never = () => {throw Error('Unexpected upstream inference');};

test('provider allowlist preserves Groq default and gives OpenAI its own explicit billing/consent boundary', async () => {
  assert.equal(getOnlineProvider(), ONLINE_PROVIDER);
  assert.equal(ONLINE_PROVIDERS.groq, ONLINE_PROVIDER);
  assert.equal(provider.modelId, 'gpt-6-luna');
  assert.equal(provider.billingType, 'paid-api');
  assert.equal(provider.freeTierLimits, undefined);
  assert.equal(provider.consentVersion, 'openai-byok-v1');
  for (const invalid of ['__proto__', 'constructor', 'prototype', '', 'other', null, {}, []]) assert.equal(getOnlineProvider(invalid), null);
  const capability = await handleOnlineAssistantRequest(new Request(url + '?providerId=openai'), {fetchImpl: never});
  const info = await capability.json();
  assert.equal(info.provider, 'OpenAI');
  assert.equal(info.billingType, 'paid-api');
  assert.equal(info.serviceVerified, false);
  assert.equal(info.freeTierLimits, undefined);
  assert.equal((await handleOnlineAssistantRequest(new Request(url + '?providerId=unknown'), {fetchImpl: never})).status, 400);
});

test('OpenAI consent cannot be substituted for Groq consent or an arbitrary provider/model/host', async () => {
  for (const extra of [{providerId: 'groq'}, {consentVersion: ONLINE_PROVIDER.consentVersion}]) {
    const result = await run(extra, never);
    assert.equal(result.status, 403);
    assert.equal(result.value.error.code, 'ONLINE_CONSENT_REQUIRED');
  }
  for (const extra of [{providerId: 'unknown'}, {providerId: null}, {providerId: '__proto__'}, {providerId: 'https://attacker.example'}, {model: 'gpt-anything'}, {upstream: 'https://attacker.example'}]) assert.equal((await run(extra, never)).status, 400);
});

test('OpenAI uses fixed endpoint/model, store false and strict choice output without Groq-only parameters', async () => {
  let called = 0;
  const result = await run({}, async (address, options) => {
    called++;
    assert.equal(address, 'https://api.openai.com/v1/chat/completions');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer ' + key);
    const sent = JSON.parse(options.body);
    assert.equal(sent.model, 'gpt-6-luna');
    assert.equal(sent.store, false);
    assert.equal(sent.reasoning_effort, 'none');
    assert.equal(sent.stream, false);
    assert.equal(sent.n, 1);
    assert.ok(sent.max_completion_tokens >= 24 && sent.max_completion_tokens <= 1024);
    assert.equal(sent.response_format.json_schema.strict, true);
    assert.deepEqual(sent.response_format.json_schema.schema.properties.choice.enum, ['S1', 'NONE']);
    for (const name of ['include_reasoning', 'temperature', 'tools', 'metadata', 'user']) assert.equal(Object.hasOwn(sent, name), false);
    return output();
  });
  assert.equal(called, 1);
  assert.equal(result.status, 200);
  assert.equal(result.value.providerId, 'openai');
  assert.equal(result.value.provider, 'OpenAI');
  assert.equal(result.value.modelId, provider.modelId);
  assert.equal(result.value.text, 'S1');
  assert.equal(JSON.stringify(result.value).includes(key), false);
});

test('OpenAI full dialogue and compact tasks preserve existing schema and reject undocumented model identities', async () => {
  const tasks = [{action: 'view', target: 'event history'}, {action: 'inspect', target: 'power supply'}];
  const dialogue = {intent: 'procedure', tasks, focusTask: null, observations: []};
  for (const outputFormat of [undefined, 'tasks']) {
    const expected = outputFormat === 'tasks' ? {tasks} : dialogue;
    const result = await run({choices: undefined, outputFormat, maxNewTokens: 256}, async () => output(expected));
    assert.equal(result.status, 200);
    assert.deepEqual(JSON.parse(result.value.text), expected);
  }
  // Official GPT-6 Luna docs currently list no dated snapshot. Do not use a
  // wildcard that could accept a different model or unverified future snapshot.
  for (const model of ['gpt-6-luna-2099-01-01', 'gpt-6-astra', 'openai/gpt-oss-120b']) {
    const result = await run({}, async () => output({choice: 'S1'}, {model}));
    assert.equal(result.status, 502);
    assert.equal(result.value.error.code, 'ONLINE_INVALID_RESPONSE');
  }
});

test('OpenAI distinguishes exhausted API credit from rate limiting without leaking provider bodies or retrying', async () => {
  for (const [providerError, expectedCode, status] of [
    [{code: 'insufficient_quota', message: key}, 'ONLINE_BILLING_REQUIRED', 402],
    [{type: 'insufficient_quota', message: key}, 'ONLINE_BILLING_REQUIRED', 402],
    [{code: 'rate_limit_exceeded', message: key}, 'ONLINE_RATE_LIMITED', 429],
  ]) {
    let calls = 0;
    const result = await run({}, async () => {calls++; return Response.json({error: providerError}, {status: 429, headers: {'Retry-After': '12'}});});
    assert.equal(calls, 1);
    assert.equal(result.status, status);
    assert.equal(result.value.error.code, expectedCode);
    assert.equal(JSON.stringify(result.value).includes(key), false);
  }
  const invalidBody = await run({}, async () => new Response('SENSITIVE ' + key, {status: 429}));
  assert.equal(invalidBody.value.error.code, 'ONLINE_RATE_LIMITED');
  assert.equal(JSON.stringify(invalidBody.value).includes(key), false);
});

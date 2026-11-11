import test from 'node:test';
import assert from 'node:assert/strict';
import {describeAppLaunchError, prepareAppLaunch} from '../lib/app-update.mjs';
import {APP_VERSION,isNewerRelease} from '../public/app/version.mjs';

class Events {
  listeners = new Map();
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, properties = {}) {
    for (const fn of [...(this.listeners.get(type) || [])]) fn({type, ...properties});
  }
  listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}
class Channel {
  constructor() {
    const port = () => ({onmessage: null, closed: false, start() {}, close() { this.closed = true; }});
    this.port1 = port();
    this.port2 = port();
    this.port2.postMessage = data => queueMicrotask(() => {
      if (!this.port1.closed) this.port1.onmessage?.({data});
    });
  }
}
class Worker extends Events {
  constructor({state = 'activated', version = '0.5.1', ready = true, automaticReply = true,
    automaticActivationReply = true, activationResponse} = {}) {
    super(); Object.assign(this, {state, version, ready, automaticReply, automaticActivationReply, activationResponse}); this.messages = [];
    this.scriptURL = 'https://findr.example/app/sw.js';
  }
  postMessage(message, ports) {
    this.messages.push({message, ports});
    if (message.type === 'ACTIVATE_UPDATE') {
      if (this.automaticActivationReply) this.reply();
      this.onActivationRequest?.(message);
    } else if (this.automaticReply) this.reply();
  }
  reply() {
    const request = this.messages.at(-1);
    request?.ports[0].postMessage(request.message.type === 'ACTIVATE_UPDATE'
      ? this.activationResponse || {accepted: this.ready, ready: this.ready, version: this.version, build: 'test-build'}
      : {ready: this.ready, version: this.version, build: 'test-build'});
  }
  change(state) { this.state = state; this.emit('statechange'); }
}
class Registration extends Events {
  constructor(active = new Worker()) {
    super(); this.scope = 'https://findr.example/app/'; this.active = active;
    this.installing = null; this.waiting = null; this.updateCalls = 0; this.updateAction = async () => {};
  }
  update() { this.updateCalls++; return this.updateAction(); }
  discover(worker) { this.installing = worker; this.emit('updatefound'); }
  installed(worker) { this.installing = null; this.waiting = worker; worker.change('installed'); }
  activate(worker) {
    this.waiting = null; this.installing = null; this.active = worker; worker.change('activating'); worker.change('activated');
  }
}
function fixture(registration = new Registration()) {
  const serviceWorker = new Events();
  serviceWorker.requests = [];
  serviceWorker.getRegistration = async url => { serviceWorker.requests.push(url); return registration; };
  const updates = [];
  return {registration, serviceWorker, updates,
    // Pin this migration fixture; production's default follows APP_VERSION.
    options: {serviceWorker, origin: 'https://findr.example', expectedVersion: '0.5.1', onProgress: value => updates.push(value),
      timeoutMs: 1000, MessageChannelImpl: Channel}};
}
const turn = () => new Promise(resolve => setImmediate(resolve));
const failure = code => error => error.code === code && error.retryable === true;
const report = (fixture, worker, completed, total = 10) => fixture.serviceWorker.emit('message', {
  source: worker, data: {type: 'OFFLINE_PROGRESS', completed, total},
});
const activationReply = (worker, data) => worker.messages.findLast(item => item.message.type === 'ACTIVATE_UPDATE').ports[0].postMessage(data);
const verifiedWaiting = {phase: 'verified_waiting', ready: true, version: '0.5.1', build: 'test-build'};

test('The default launch target follows the current packaged release', async () => {
  const f = fixture(new Registration(new Worker({version: APP_VERSION})));
  delete f.options.expectedVersion;
  assert.equal((await prepareAppLaunch(f.options)).version, APP_VERSION);
});

test('A fresh browser without a worker or registration can use the network app immediately', async () => {
  assert.deepEqual(await prepareAppLaunch({serviceWorker: null, origin: 'https://findr.example'}), {source: 'network'});
  const f = fixture(null);
  assert.deepEqual(await prepareAppLaunch(f.options), {source: 'network'});
  assert.deepEqual(f.serviceWorker.requests, ['https://findr.example/app/']);
});

test('A different registration scope is rejected before update or messaging', async () => {
  const f = fixture(); f.registration.scope = 'https://findr.example/';
  await assert.rejects(prepareAppLaunch(f.options), failure('scope_mismatch'));
  assert.equal(f.registration.updateCalls, 0);
  assert.equal(f.registration.active.messages.length, 0);
  await assert.rejects(prepareAppLaunch({...f.options, appPath: 'https://other.example/app/'}), failure('scope_mismatch'));
});

test('The current version is verified only after the update check finishes', async () => {
  const f = fixture(); let finishUpdate;
  f.registration.updateAction = () => new Promise(resolve => { finishUpdate = resolve; });
  let finished = false;
  const launch = prepareAppLaunch(f.options).then(result => { finished = true; return result; });
  await turn();
  assert.equal(finished, false);
  assert.equal(f.registration.active.messages.length, 0);
  finishUpdate();
  assert.deepEqual(await launch, {source: 'worker', version: '0.5.1', build: 'test-build'});
  assert.equal(f.registration.updateCalls, 1);
  assert.deepEqual(f.updates.at(-1), {phase: 'ready', version: '0.5.1'});
  assert.equal(f.serviceWorker.listenerCount(), 0);
  assert.equal(f.registration.listenerCount(), 0);
  assert.equal(f.registration.active.listenerCount(), 0);
});

test('Stale-app race: a resolved update call cannot open the old shell while its replacement installs', async () => {
  const old = new Worker({version: undefined}), incoming = new Worker({state: 'installing'});
  // Older CHECK_OFFLINE protocols have no version, even when ready is true.
  old.version = undefined;
  const f = fixture(new Registration(old));
  f.registration.updateAction = async () => { f.registration.discover(incoming); };
  let finished = false;
  const launch = prepareAppLaunch(f.options).then(result => { finished = true; return result; });
  await turn();
  assert.equal(finished, false);
  assert.equal(old.messages.length, 0);
  f.serviceWorker.emit('message', {source: new Worker(), data: {type: 'OFFLINE_PROGRESS', completed: 99, total: 100}});
  assert.ok(!f.updates.some(value => value.percent === 99), 'Foreign worker progress is ignored');
  f.serviceWorker.emit('message', {source: incoming, data: {type: 'OFFLINE_PROGRESS', completed: 5, total: 10}});
  assert.ok(f.updates.some(value => value.percent === 50));
  f.registration.installed(incoming);
  await turn();
  assert.equal(finished, false, 'An installed/waiting worker is not yet the active app');
  assert.equal(f.updates.at(-1).percent,50,'Lifecycle updates preserve the last reported percentage');
  f.registration.activate(incoming);
  assert.equal((await launch).version, '0.5.1');
  assert.equal(incoming.messages.filter(item => item.message.type === 'ACTIVATE_UPDATE').length, 1);
  assert.equal(incoming.messages.filter(item => item.message.type === 'CHECK_OFFLINE').length, 1);
});

test('An installation already in progress is observed without needing another updatefound event', async () => {
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'}); f.registration.installing = incoming;
  const launch = prepareAppLaunch(f.options);
  await turn();
  f.registration.activate(incoming);
  assert.equal((await launch).version, '0.5.1');
});

test('A waiting update receives one activation request and launch still verifies the activated worker', async () => {
  const old = new Worker({version: '0.4.0'}), incoming = new Worker({state: 'installed'});
  const f = fixture(new Registration(old));
  f.registration.waiting = incoming;
  incoming.onActivationRequest = () => queueMicrotask(() => f.registration.activate(incoming));
  assert.equal((await prepareAppLaunch(f.options)).version, '0.5.1');
  assert.deepEqual(incoming.messages.map(item => item.message), [
    {type: 'ACTIVATE_UPDATE', expectedVersion: '0.5.1'},
    {type: 'CHECK_OFFLINE'},
  ]);
  assert.equal(old.messages.length, 0, 'The old ready shell cannot authorise the new release');
  assert.equal(incoming.messages[0].ports[0].closed, true);
});

test('A waiting worker is not asked to activate before the update check settles', async () => {
  const incoming = new Worker({state: 'installed'});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.waiting = incoming;
  let finishUpdate;
  f.registration.updateAction = () => new Promise(resolve => { finishUpdate = resolve; });
  incoming.onActivationRequest = () => queueMicrotask(() => f.registration.activate(incoming));
  const launch = prepareAppLaunch(f.options);
  await turn();
  assert.equal(incoming.messages.length, 0);
  finishUpdate();
  assert.equal((await launch).version, '0.5.1');
  assert.equal(incoming.messages.filter(item => item.message.type === 'ACTIVATE_UPDATE').length, 1);
});

test('An older waiting release is left alone while update discovers the required replacement', async () => {
  const oldWaiting = new Worker({state: 'installed', version: '0.4.0', automaticActivationReply: false});
  const incoming = new Worker({state: 'installing'});
  const f = fixture(new Registration(new Worker({version: '0.3.0'})));
  f.registration.waiting = oldWaiting;
  f.registration.updateAction = async () => { f.registration.discover(incoming); };
  const launch = prepareAppLaunch(f.options);
  await turn();
  assert.equal(oldWaiting.messages.length, 0);
  assert.equal(incoming.messages.length, 0);
  // Real activation may be observed before the message-port acknowledgement.
  incoming.onActivationRequest = () => f.registration.activate(incoming);
  f.registration.installed(incoming);
  assert.equal((await launch).version, '0.5.1');
  assert.equal(oldWaiting.messages.length, 0);
  assert.deepEqual(incoming.messages.map(item => item.message.type), ['ACTIVATE_UPDATE', 'CHECK_OFFLINE']);
});

test('An accepted activation request alone cannot launch or extend a worker that stays waiting', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const incoming = new Worker({state: 'installed'});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.waiting = incoming;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60, overallTimeoutMs: 300});
  const rejected = assert.rejects(launch, error => {
    assert.equal(error.code, 'activation_waiting');
    assert.equal(error.diagnostics.activation.state, 'accepted');
    assert.equal(error.diagnostics.workers.waiting.state, 'installed');
    assert.equal(error.diagnostics.elapsedMs, 60);
    const visible = describeAppLaunchError(error);
    assert.match(visible.message, /Close other FINDR tabs/);
    assert.match(visible.details.join('\n'), /Activation: accepted; release=0.5.1/);
    return true;
  });
  await turn();
  t.mock.timers.tick(40);
  incoming.change('installed');
  incoming.change('installed');
  assert.equal(incoming.messages.length, 1, 'State repeats cannot send further activation requests');
  t.mock.timers.tick(20);
  await rejected;
  assert.equal(f.registration.active.messages.length, 0);
});

test('A verified waiting release can finish native activation after five minutes and still needs the active check', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const incoming = new Worker({state: 'installed', automaticActivationReply: false});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.waiting = incoming;
  let finished = false;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60000}).then(result => { finished = true; return result; });
  await turn();
  activationReply(incoming, verifiedWaiting);
  await turn();
  assert.equal(f.updates.at(-1).phase, 'verified_waiting');
  assert.equal(incoming.messages[0].ports[0].closed, false, 'Keep the port for the native activation result');
  t.mock.timers.tick(300001);
  await turn();
  assert.equal(finished, false, 'Verified saved assets do not authorise navigation');
  assert.equal(incoming.messages.length, 1, 'The native wait does not generate repeated requests');
  activationReply(incoming, {accepted: true, ready: true, version: '0.5.1', build: 'test-build'});
  await turn();
  assert.equal(finished, false, 'The final ACK also does not authorise navigation');
  assert.equal(incoming.messages[0].ports[0].closed, true);
  f.registration.activate(incoming);
  assert.equal((await launch).version, '0.5.1');
  assert.deepEqual(incoming.messages.map(item => item.message.type), ['ACTIVATE_UPDATE', 'CHECK_OFFLINE']);
});

test('Duplicate verified-waiting replies and late asset reports cannot extend the six-minute grace', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const incoming = new Worker({state: 'installed', automaticActivationReply: false});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.waiting = incoming;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60000});
  const rejected = assert.rejects(launch, error => {
    assert.equal(error.code, 'activation_waiting');
    assert.equal(error.diagnostics.timeoutKind, 'activation_grace');
    assert.equal(error.diagnostics.elapsedMs, 360000);
    assert.equal(error.diagnostics.progress.phase, 'verified_waiting');
    return true;
  });
  await turn();
  activationReply(incoming, verifiedWaiting);
  await turn();
  t.mock.timers.tick(300000);
  activationReply(incoming, verifiedWaiting);
  report(f, incoming, 10);
  incoming.change('installed');
  await turn();
  assert.equal(f.updates.at(-1).phase, 'verified_waiting');
  t.mock.timers.tick(60000);
  await rejected;
  assert.equal(incoming.messages.length, 1);
  assert.equal(incoming.messages[0].ports[0].closed, true);
});

test('Verified activation grace never extends the overall ten-minute limit', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const incoming = new Worker({state: 'installing', automaticActivationReply: false});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.installing = incoming;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60000});
  const rejected = assert.rejects(launch, error => {
    assert.equal(error.code, 'timeout');
    assert.equal(error.diagnostics.timeoutKind, 'overall');
    assert.equal(error.diagnostics.elapsedMs, 600000);
    assert.equal(error.diagnostics.activation.state, 'verified_waiting');
    return true;
  });
  await turn();
  for (let completed = 1; completed <= 6; completed++) {
    t.mock.timers.tick(50000);
    report(f, incoming, completed);
  }
  f.registration.installed(incoming);
  activationReply(incoming, verifiedWaiting);
  await turn();
  t.mock.timers.tick(300000);
  await rejected;
});

test('A final native rejection is delivered during the verified waiting grace', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const incoming = new Worker({state: 'installed', automaticActivationReply: false});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.waiting = incoming;
  const launch = prepareAppLaunch(f.options);
  const rejected = assert.rejects(launch, error => {
    assert.equal(error.code, 'activation_failed');
    assert.equal(error.diagnostics.activation.state, 'rejected');
    assert.equal(error.diagnostics.activation.error, 'activation_failed');
    assert.equal(error.diagnostics.activation.message, 'The browser rejected activation.');
    return true;
  });
  await turn();
  activationReply(incoming, verifiedWaiting);
  await turn();
  t.mock.timers.tick(300000);
  activationReply(incoming, {accepted: false, ready: false, version: '0.5.1', error: 'activation_failed', message: 'The browser rejected activation.'});
  await rejected;
  assert.equal(incoming.messages[0].ports[0].closed, true);
});

test('A superseded worker cannot replay its verified phase or grant a second activation grace', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const first = new Worker({state: 'installed', automaticActivationReply: false});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.waiting = first;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60});
  const rejected = assert.rejects(launch, error => {
    assert.equal(error.code, 'activation_waiting');
    assert.equal(error.diagnostics.timeoutKind, 'inactivity');
    assert.equal(error.diagnostics.elapsedMs, 160);
    return true;
  });
  await turn();
  activationReply(first, verifiedWaiting);
  await turn();
  t.mock.timers.tick(100);
  const next = new Worker({state: 'installing', automaticActivationReply: false});
  f.registration.discover(next);
  assert.equal(first.messages[0].ports[0].closed, true);
  activationReply(first, verifiedWaiting);
  f.registration.installed(next);
  activationReply(next, verifiedWaiting);
  await turn();
  t.mock.timers.tick(60);
  await rejected;
  assert.equal(first.messages.length, 1);
  assert.equal(next.messages.length, 1);
});

test('An unresponsive activation check is bounded and closes its message ports', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const incoming = new Worker({state: 'installed', automaticActivationReply: false});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.waiting = incoming;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60, activationTimeoutMs: 20});
  const rejected = assert.rejects(launch, error => {
    assert.equal(error.code, 'activation_unresponsive');
    assert.equal(error.diagnostics.activation.state, 'unresponsive');
    return true;
  });
  await turn();
  t.mock.timers.tick(20);
  await rejected;
  assert.equal(incoming.messages.length, 1);
  assert.equal(incoming.messages[0].ports[0].closed, true);
  incoming.reply();
  await turn();
  assert.equal(f.registration.active.messages.length, 0, 'A late reply cannot trigger launch');
  assert.equal(incoming.listenerCount(), 0);
});

test('Wrong-version and unverified activation replies are rejected with their diagnostics', async () => {
  for (const [response, code] of [
    [{accepted: true, ready: true, version: '0.4.0'}, 'version_mismatch'],
    [{accepted: false, ready: false, version: '0.5.1', error: 'cache_unverified'}, 'activation_failed'],
    [{accepted: true, ready: false, version: '0.5.1'}, 'activation_failed'],
    [{phase: 'verified_waiting', ready: true, version: '0.4.0'}, 'version_mismatch'],
    [{phase: 'verified_waiting', ready: false, version: '0.5.1'}, 'activation_failed'],
  ]) {
    const incoming = new Worker({state: 'installed', activationResponse: response});
    const f = fixture(new Registration(new Worker({version: '0.4.0'})));
    f.registration.waiting = incoming;
    await assert.rejects(prepareAppLaunch(f.options), error => {
      assert.equal(error.code, code);
      assert.equal(error.diagnostics.activation.version, response.version);
      assert.equal(error.diagnostics.activation.error, response.phase === 'verified_waiting' ? 'invalid_verified_waiting' : response.error);
      return true;
    });
    assert.equal(incoming.messages.length, 1);
    assert.equal(f.registration.active.messages.length, 0);
  }
});

test('Superseding a waiting update closes its activation request and verifies only the replacement', async () => {
  const first = new Worker({state: 'installed', automaticActivationReply: false});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.waiting = first;
  const launch = prepareAppLaunch(f.options);
  await turn();
  const next = new Worker({state: 'installing'});
  f.registration.discover(next);
  assert.equal(first.messages[0].ports[0].closed, true);
  first.reply();
  await turn();
  assert.equal(next.messages.length, 0, 'An installing worker is never asked to skip installation');
  next.onActivationRequest = () => queueMicrotask(() => f.registration.activate(next));
  f.registration.installed(next);
  first.change('redundant');
  assert.equal((await launch).version, '0.5.1');
  assert.deepEqual(next.messages.map(item => item.message.type), ['ACTIVATE_UPDATE', 'CHECK_OFFLINE']);
});

test('A successful activation acknowledgement cannot replace the active cache-readiness check', async () => {
  const incoming = new Worker({state: 'installed', ready: false,
    activationResponse: {accepted: true, ready: true, version: '0.5.1'}});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  f.registration.waiting = incoming;
  incoming.onActivationRequest = () => queueMicrotask(() => f.registration.activate(incoming));
  await assert.rejects(prepareAppLaunch(f.options), failure('not_ready'));
  assert.deepEqual(incoming.messages.map(item => item.message.type), ['ACTIVATE_UPDATE', 'CHECK_OFFLINE']);
});

test('Fast activation during update is verified even before update resolves', async () => {
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'});
  f.registration.updateAction = async () => { f.registration.discover(incoming); f.registration.activate(incoming); };
  assert.equal((await prepareAppLaunch(f.options)).version, '0.5.1');
  assert.equal(incoming.messages.length, 1);
});

test('A newer worker appearing during verification invalidates an earlier worker reply', async () => {
  const old = new Worker({automaticReply: false});
  const f = fixture(new Registration(old));
  let finished = false;
  const launch = prepareAppLaunch(f.options).then(result => { finished = true; return result; });
  await turn();
  assert.equal(old.messages.length, 1);
  const incoming = new Worker({state: 'installing'});
  f.registration.discover(incoming);
  old.reply();
  await turn();
  assert.equal(finished, false);
  assert.equal(old.messages[0].ports[0].closed, true);
  f.registration.activate(incoming);
  assert.equal((await launch).version, '0.5.1');
});

test('A superseded installing worker does not prevent its replacement from activating', async () => {
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const first = new Worker({state: 'installing'}), next = new Worker({state: 'installing'});
  f.registration.installing = first;
  const launch = prepareAppLaunch(f.options);
  await turn();
  report(f, first, 10);
  assert.equal(f.updates.at(-1).phase, 'finishing');
  f.registration.discover(next); first.change('redundant');
  assert.deepEqual(f.updates.at(-1), {phase: 'downloading'}, 'The replacement cannot inherit the superseded worker\'s completed count');
  await turn();
  f.registration.activate(next);
  assert.equal((await launch).version, '0.5.1');
});

test('Failed installation cannot fall back silently to an old ready worker', async () => {
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'}); f.registration.installing = incoming;
  const launch = prepareAppLaunch(f.options);
  const rejected = assert.rejects(launch, failure('install_failed'));
  await turn();
  f.registration.installing = null; incoming.change('redundant');
  await rejected;
});

test('A named offline asset failure remains available on the launch error', async () => {
  const f=fixture(new Registration(new Worker({version:'0.4.0'})));
  const incoming=new Worker({state:'installing'});f.registration.installing=incoming;
  const launch=prepareAppLaunch(f.options);
  const rejected=assert.rejects(launch,error=>error.code==='install_failed'&&error.asset==='./data/devices.json');
  await turn();
  f.serviceWorker.emit('message',{source:incoming,data:{type:'OFFLINE_ERROR',asset:'./data/devices.json',code:'asset_integrity'}});
  f.registration.installing=null;incoming.change('redundant');
  await rejected;
});

test('Update failure is tolerable only when the active expected version is independently verified', async () => {
  const current = fixture(); current.registration.updateAction = async () => { throw Error('Offline'); };
  assert.equal((await prepareAppLaunch(current.options)).version, '0.5.1');
  const stale = fixture(new Registration(new Worker({version: '0.4.0'})));
  stale.registration.updateAction = async () => { throw Error('Offline'); };
  await assert.rejects(prepareAppLaunch(stale.options), failure('update_failed'));
});

test('Only an exact version and ready:true handshake authorises the worker launch', async () => {
  for (const version of [undefined, '0.5.0', '0.6.0']) {
    const f = fixture(); f.registration.active.version = version;
    await assert.rejects(prepareAppLaunch(f.options), failure('version_mismatch'));
  }
  const incomplete = fixture(new Registration(new Worker({ready: false})));
  await assert.rejects(prepareAppLaunch(incomplete.options), failure('not_ready'));
});

test('An unfinished download times out and removes its listeners', async () => {
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'}); f.registration.installing = incoming;
  await assert.rejects(prepareAppLaunch({...f.options, timeoutMs: 20}), failure('timeout'));
  assert.equal(f.serviceWorker.listenerCount(), 0);
  assert.equal(f.registration.listenerCount(), 0);
  assert.equal(incoming.listenerCount(), 0);
});

test('The timeout also bounds a non-responsive worker and closes verification ports', async () => {
  const f = fixture(new Registration(new Worker({automaticReply: false})));
  await assert.rejects(prepareAppLaunch({...f.options, timeoutMs: 20}), failure('timeout'));
  assert.equal(f.registration.active.messages[0].ports[0].closed, true);
  assert.equal(f.registration.active.listenerCount(), 0);
});

test('Asset counts cannot round an incomplete download to 100% or authorise launch', async () => {
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'});
  f.registration.installing = incoming;
  let finished = false;
  const launch = prepareAppLaunch(f.options).then(result => { finished = true; return result; });
  await turn();
  report(f, incoming, 1344, 1345);
  assert.deepEqual(f.updates.at(-1), {phase: 'downloading', completed: 1344, total: 1345, percent: 99});
  report(f, incoming, 1345, 1345);
  assert.deepEqual(f.updates.at(-1), {phase: 'finishing', completed: 1345, total: 1345, percent: 100});
  await turn();
  assert.equal(finished, false, 'All asset bytes still need an activated, verified worker');
  assert.equal(incoming.messages.length, 0);
  f.registration.activate(incoming);
  assert.equal((await launch).version, '0.5.1');
});

test('Increasing asset progress renews the inactivity deadline through a long update', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'});
  f.registration.installing = incoming;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60, overallTimeoutMs: 300});
  await turn();
  for (let completed = 1; completed <= 3; completed++) {
    t.mock.timers.tick(40);
    report(f, incoming, completed);
    await turn();
  }
  assert.equal(Date.now(), 120, 'The update has exceeded one inactivity interval while making progress');
  f.registration.activate(incoming);
  assert.equal((await launch).source, 'worker');
  assert.equal(f.serviceWorker.listenerCount(), 0);
});

test('Duplicate, regressive and malformed reports cannot keep a stalled worker alive', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'});
  f.registration.installing = incoming;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60, overallTimeoutMs: 300});
  const rejected = assert.rejects(launch, error => {
    assert.equal(error.code, 'timeout');
    assert.equal(error.diagnostics.timeoutKind, 'inactivity');
    assert.equal(error.diagnostics.elapsedMs, 100);
    assert.deepEqual(error.diagnostics.progress, {phase: 'downloading', completed: 3, total: 10, percent: 30});
    return true;
  });
  await turn();
  t.mock.timers.tick(40);
  report(f, incoming, 3);
  t.mock.timers.tick(40);
  report(f, incoming, 3);
  report(f, incoming, 2);
  report(f, incoming, 4, 11);
  report(f, incoming, 4.5);
  report(f, incoming, 11);
  incoming.change('installing');
  t.mock.timers.tick(20);
  await rejected;
  assert.equal(incoming.listenerCount(), 0);
});

test('Real installation and activation transitions renew the inactivity deadline', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'});
  f.registration.installing = incoming;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60, overallTimeoutMs: 300});
  await turn();
  t.mock.timers.tick(40);
  f.registration.installed(incoming);
  assert.equal(f.updates.at(-1).phase, 'activating');
  t.mock.timers.tick(40);
  f.registration.waiting = null;
  f.registration.active = incoming;
  incoming.change('activating');
  t.mock.timers.tick(40);
  incoming.change('activated');
  assert.equal((await launch).version, '0.5.1');
});

test('A separate overall deadline bounds even continuously advancing downloads', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'});
  f.registration.installing = incoming;
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60, overallTimeoutMs: 150});
  const rejected = assert.rejects(launch, error => {
    assert.equal(error.code, 'timeout');
    assert.equal(error.diagnostics.timeoutKind, 'overall');
    assert.equal(error.diagnostics.elapsedMs, 150);
    assert.equal(error.diagnostics.progress.completed, 3);
    return true;
  });
  await turn();
  for (let completed = 1; completed <= 3; completed++) {
    t.mock.timers.tick(40);
    report(f, incoming, completed);
  }
  t.mock.timers.tick(30);
  await rejected;
  assert.equal(f.serviceWorker.listenerCount(), 0);
  assert.equal(f.registration.listenerCount(), 0);
});

test('Launch failure exposes the exact asset, worker states and last counts as readable details', async () => {
  const f = fixture(new Registration(new Worker({version: '0.4.0'})));
  const incoming = new Worker({state: 'installing'});
  f.registration.installing = incoming;
  const launch = prepareAppLaunch(f.options);
  const rejected = assert.rejects(launch, error => {
    const diagnostic = error.diagnostics;
    assert.equal(error.code, 'install_failed');
    assert.equal(error.asset, './vendor/local-language/ort-wasm-simd-threaded.wasm');
    assert.equal(diagnostic.workers.active.state, 'activated');
    assert.equal(diagnostic.workers.installing, null);
    assert.equal(diagnostic.workerError.code, 'asset_integrity');
    assert.equal(diagnostic.progress.completed, 1344);
    assert.equal(diagnostic.progress.total, 1345);
    const visible = describeAppLaunchError(error);
    assert.match(visible.message, /interrupted/);
    const details = visible.details.join('\n');
    assert.match(details, /Code: install_failed/);
    assert.match(details, /Asset: \.\/vendor\/local-language\/ort-wasm-simd-threaded.wasm/);
    assert.match(details, /installing=none; waiting=none; active=activated/);
    assert.match(details, /Worker script: https:\/\/findr.example\/app\/sw.js/);
    assert.match(details, /1344\/1345 assets \(99%\)/);
    assert.match(details, /Worker error: asset_integrity; Asset does not match release/);
    assert.match(details, /Verification: ready=true; release=0.4.0/);
    return true;
  });
  await turn();
  report(f, incoming, 1344, 1345);
  f.serviceWorker.emit('message', {source: incoming, data: {type: 'OFFLINE_ERROR',
    asset: './vendor/local-language/ort-wasm-simd-threaded.wasm', code: 'asset_integrity',
    message: 'Asset does not match release'}});
  f.registration.installing = null;
  incoming.change('redundant');
  await rejected;
});

test('An unresponsive ready-check identifies the activated worker instead of claiming readiness', async t => {
  t.mock.timers.enable({apis: ['setTimeout', 'Date'], now: 0});
  const f = fixture(new Registration(new Worker({automaticReply: false})));
  const launch = prepareAppLaunch({...f.options, timeoutMs: 60});
  const rejected = assert.rejects(launch, error => {
    const details = describeAppLaunchError(error).details.join('\n');
    assert.match(details, /Code: timeout \(inactivity\)/);
    assert.match(details, /Last progress: verifying/);
    assert.equal(error.diagnostics.workers.active.state, 'activated');
    assert.equal(error.diagnostics.updateCheck, 'finished');
    assert.equal(error.diagnostics.verification, undefined);
    return true;
  });
  await turn();
  t.mock.timers.tick(60);
  await rejected;
  assert.equal(f.registration.active.messages[0].ports[0].closed, true);
});

test('The reload banner ignores equal, older and malformed release identifiers', () => {
  assert.equal(isNewerRelease(APP_VERSION), false);
  assert.equal(isNewerRelease('0.5.0', '0.5.1'), false);
  assert.equal(isNewerRelease('0.5.1', '0.5.1'), false);
  assert.equal(isNewerRelease('0.5.9', '0.5.10'), false);
  for (const malformed of [undefined, null, '', '0.5', '0.5.1.0', 'v0.5.2', '0.5.x', '0.5.2-beta', 123, ['0.5.2'], {}]) {
    assert.equal(isNewerRelease(malformed, '0.5.1'), false, `Invalid candidate: ${String(malformed)}`);
    // undefined intentionally selects the function's APP_VERSION default.
    if (malformed !== undefined) assert.equal(isNewerRelease('0.5.2', malformed), false, `Invalid current version: ${String(malformed)}`);
  }
});

test('Release comparison uses numeric components so patch 10 follows patch 9', () => {
  for (const [candidate,current] of [['0.5.10','0.5.9'], ['0.10.0','0.9.99'], ['1.0.0','0.99.99']]) {
    assert.equal(isNewerRelease(candidate,current), true, `${candidate} should follow ${current}`);
    assert.equal(isNewerRelease(current,candidate), false, `${current} must not cause a downgrade from ${candidate}`);
  }
});

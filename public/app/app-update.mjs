import {APP_VERSION,isNewerRelease} from './version.mjs';

// Chromium can allow an outgoing worker five minutes to finish its requests.
// Grant this grace once, only after the waiting release proves its saved cache.
const VERIFIED_ACTIVATION_GRACE_MS = 360000;

/** Read the current published release outside the /app/ worker's cache scope,
 * then use the same verified update protocol as the release-page launcher.
 * This function never reloads, deletes storage or claims an offline update.
 * The caller must flush current work before acting on needsReload. */
export async function checkForAppUpdate({
  serviceWorker,
  origin,
  currentVersion = APP_VERSION,
  online = globalThis.navigator?.onLine !== false,
  fetchImpl = globalThis.fetch,
  onProgress,
  prepare = prepareAppLaunch,
  releaseTimeoutMs = 20000,
} = {}) {
  if (!online) throw new AppLaunchError('offline', 'You’re offline. Connect to the internet, then tap Update app again.');
  let releaseURL;
  try {
    const base = new URL(origin);
    if (!['https:', 'http:'].includes(base.protocol)) throw Error();
    releaseURL = new URL('/app-release.json', base.origin);
  } catch {
    throw new AppLaunchError('scope_mismatch', 'The FINDR update address could not be checked. Open FINDR in your browser and retry.');
  }
  onProgress?.({phase: 'checking'});
  let release;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), releaseTimeoutMs);
  try {
    const response = await fetchImpl(releaseURL.href, {cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: controller.signal});
    if (!response.ok) throw Error('Release metadata request failed.');
    release = await response.json();
  } catch (cause) {
    const error = new AppLaunchError(controller.signal.aborted ? 'release_timeout' : 'release_unavailable', 'FINDR couldn’t check the latest release. Your saved app is unchanged; check your connection and retry.');
    error.cause = cause;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const version = release?.version;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version) || typeof currentVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(currentVersion)) {
    throw new AppLaunchError('release_invalid', 'The latest FINDR release could not be verified. Your saved app is unchanged; retry shortly.');
  }
  if (isNewerRelease(currentVersion, version)) {
    throw new AppLaunchError('release_older', 'The server is reporting an older FINDR release. Keep using this version and check again later.');
  }
  const result = await prepare({serviceWorker, origin: releaseURL.origin, appPath: '/app/', expectedVersion: version, onProgress});
  const needsReload = isNewerRelease(version, currentVersion);
  return {...result, status: needsReload ? 'ready' : 'current', version, needsReload};
}

class AppLaunchError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AppLaunchError';
    this.code = code;
    this.retryable = true;
  }
}

/** A small, copyable diagnostic for the release page; it contains app update
 * state only, never helpers, conversations or saved-document content. */
export function describeAppLaunchError(error) {
  const diagnostic = error?.diagnostics;
  const details = [];
  if (typeof error?.code === 'string') details.push(`Code: ${error.code}${diagnostic?.timeoutKind ? ` (${diagnostic.timeoutKind})` : ''}`);
  if (typeof error?.asset === 'string') details.push(`Asset: ${error.asset}`);
  if (diagnostic) {
    details.push(`Required release: ${diagnostic.expectedVersion}; update check: ${diagnostic.updateCheck}`);
    details.push('Workers: ' + ['installing', 'waiting', 'active'].map(slot =>
      `${slot}=${diagnostic.workers?.[slot]?.state || 'none'}`).join('; '));
    const scripts = [...new Set(Object.values(diagnostic.workers || {}).map(worker => worker?.scriptURL).filter(Boolean))];
    if (scripts.length) details.push(`Worker script: ${scripts.join('; ')}`);
    const progress = diagnostic.progress;
    if (progress) details.push(`Last progress: ${progress.phase}${Number.isFinite(progress.completed) && Number.isFinite(progress.total)
      ? `; ${progress.completed}/${progress.total} assets (${progress.percent}%)` : ''}`);
    if (diagnostic.workerError) details.push(`Worker error: ${diagnostic.workerError.code || 'unknown'}${diagnostic.workerError.message ? `; ${diagnostic.workerError.message}` : ''}`);
    if (diagnostic.activation) {
      const activation = diagnostic.activation;
      details.push(`Activation: ${activation.state}${activation.version ? `; release=${activation.version}` : ''}${activation.build ? `; build=${activation.build}` : ''}${activation.error ? `; error=${activation.error}` : ''}${activation.message ? `; ${activation.message}` : ''}`);
    }
    if (diagnostic.verification) {
      const reply = diagnostic.verification;
      details.push(`Verification: ready=${String(reply.ready)}; release=${reply.version || 'not supplied'}${reply.build ? `; build=${reply.build}` : ''}${reply.error ? `; error=${reply.error}` : ''}`);
    }
    if (Number.isFinite(diagnostic.elapsedMs)) details.push(`Elapsed: ${Math.round(diagnostic.elapsedMs / 1000)}s`);
  }
  return {
    message: error instanceof AppLaunchError ? error.message
      : 'The update is not ready yet. Stay online and tap again. If this continues, refresh this release page.',
    details,
  };
}

/** Wait for the exact FINDR worker to finish an update and prove its release.
 * A waiting worker receives one verified activation request. Navigation still
 * requires CHECK_OFFLINE from the activated worker. This never navigates,
 * reloads, unregisters workers or changes device storage.
 */
export function prepareAppLaunch({
  serviceWorker,
  origin,
  appPath = '/app/',
  expectedVersion = APP_VERSION,
  onProgress,
  // Real progress renews this inactivity deadline; a separate overall limit
  // still bounds repeated updates or a very slow connection.
  timeoutMs = 60000,
  overallTimeoutMs = 600000,
  activationTimeoutMs = 20000,
  MessageChannelImpl = globalThis.MessageChannel,
}) {
  let lastDownload, lastProgress;
  const progress = value => {
    if (Number.isFinite(value.completed) && Number.isFinite(value.total)) {
      lastDownload = {completed: value.completed, total: value.total, percent: value.percent};
    } else if (lastDownload && ['downloading', 'finishing', 'activating', 'verified_waiting', 'verifying'].includes(value.phase)) {
      value = {...lastDownload, ...value};
    }
    lastProgress = value;
    try { onProgress?.(value); } catch {}
  };
  progress({phase: 'checking'});
  if (!serviceWorker || typeof serviceWorker.getRegistration !== 'function') {
    progress({phase: 'ready'});
    return Promise.resolve({source: 'network'});
  }

  return new Promise((resolve, reject) => {
    let settled = false, registration, initialActive, updating = true;
    let updateFailed = false, installFailed = false, failedAsset, probe = null;
    let workerError, verification, inactivityTimeout, progressWorker;
    let activationProbe = null, activation;
    let activationGrace;
    const workers = new Set(), cleanups = [];
    const activationRequests = new Set();
    const verifiedWaitingWorkers = new Set();
    const states = new Map(), counts = new Map();
    const startedAt = Date.now();
    const overallTimeout = setTimeout(() => fail('timeout',
      'The FINDR update has taken too long. Stay online and tap again to continue checking it.',
      {timeoutKind: 'overall'}), overallTimeoutMs);
    advance();

    function advance() {
      if (settled) return;
      clearTimeout(inactivityTimeout);
      const graceApplies = activationGrace?.worker === registration?.waiting &&
        registration?.waiting?.state === 'installed' && !registration.installing;
      const delay = graceApplies ? Math.max(0, activationGrace.expiresAt - Date.now()) : timeoutMs;
      inactivityTimeout = setTimeout(() => {
        if (!updating && registration?.waiting?.state === 'installed' && !registration.installing) {
          fail('activation_waiting',
            'The update is downloaded, but this browser is keeping the previous version active. Close other FINDR tabs, keep this release page open and tap again.',
            {timeoutKind: graceApplies ? 'activation_grace' : 'inactivity'});
        } else {
          fail('timeout', 'The FINDR update has stopped reporting progress. Stay online and tap again to check it.',
            {timeoutKind: 'inactivity'});
        }
      }, delay);
    }
    function noteState(worker) {
      const rank = {installing: 1, installed: 2, activating: 3, activated: 4}[worker.state];
      if (rank && rank > (states.get(worker) || 0)) {
        states.set(worker, rank);
        advance();
      }
    }

    function listen(target, type, listener) {
      target?.addEventListener?.(type, listener);
      cleanups.push(() => target?.removeEventListener?.(type, listener));
    }
    function cancelProbe() {
      if (!probe) return;
      probe.channel.port1.onmessage = null;
      probe.channel.port1.close?.();
      probe.channel.port2.close?.();
      probe = null;
    }
    function cancelActivationProbe() {
      if (!activationProbe) return;
      clearTimeout(activationProbe.timeout);
      activationProbe.channel.port1.onmessage = null;
      activationProbe.channel.port1.close?.();
      activationProbe.channel.port2.close?.();
      activationProbe = null;
    }
    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(inactivityTimeout);
      clearTimeout(overallTimeout);
      cancelProbe();
      cancelActivationProbe();
      for (const cleanup of cleanups) cleanup();
      error ? reject(error) : resolve(result);
    }
    function fail(code, message, extra = {}) {
      const error = new AppLaunchError(code, message);
      if (failedAsset) error.asset = failedAsset;
      error.diagnostics = {
        expectedVersion,
        elapsedMs: Math.max(0, Date.now() - startedAt),
        updateCheck: updating ? 'pending' : updateFailed ? 'failed' : 'finished',
        workers: Object.fromEntries(['installing', 'waiting', 'active'].map(slot => {
          const worker = registration?.[slot];
          return [slot, worker ? {state: worker.state, ...(worker.scriptURL ? {scriptURL: worker.scriptURL} : {})} : null];
        })),
        progress: {...lastProgress},
        ...(workerError ? {workerError} : {}),
        ...(activation ? {activation: {...activation}} : {}),
        ...(verification ? {verification} : {}),
        ...extra,
      };
      finish(error);
    }
    function requestActivation(worker) {
      if (activationRequests.has(worker)) return;
      activationRequests.add(worker);
      if (typeof MessageChannelImpl !== 'function') {
        fail('verification_failed', 'This browser could not verify the FINDR update. Retry in your browser.');
        return;
      }
      cancelActivationProbe();
      activation = {state: 'requested'};
      try {
        const channel = new MessageChannelImpl();
        const current = activationProbe = {worker, channel, timeout: undefined};
        current.timeout = setTimeout(() => {
          if (settled || activationProbe !== current) return;
          if (registration.waiting !== worker || worker.state !== 'installed' || registration.installing) {
            cancelActivationProbe();
            evaluate();
            return;
          }
          activation = {...activation, state: 'unresponsive'};
          fail('activation_unresponsive',
            'The saved update did not answer its activation check. Close other FINDR tabs, refresh this release page and tap again.');
        }, activationTimeoutMs);
        channel.port1.onmessage = event => {
          if (settled || activationProbe !== current) return;
          if (registration.waiting !== worker || worker.state !== 'installed' || registration.installing) {
            cancelActivationProbe();
            evaluate();
            return;
          }
          const data = event.data;
          if (data?.phase === 'verified_waiting') {
            if (data.version !== expectedVersion || data.ready !== true) {
              activation = {state: 'rejected', error: 'invalid_verified_waiting',
                ...(typeof data.version === 'string' ? {version: data.version.slice(0, 80)} : {})};
              cancelActivationProbe();
              fail(data.version !== expectedVersion ? 'version_mismatch' : 'activation_failed',
                'The waiting update could not prove the required saved release. Refresh this release page and retry.');
              return;
            }
            if (verifiedWaitingWorkers.has(worker)) return;
            verifiedWaitingWorkers.add(worker);
            clearTimeout(current.timeout);
            current.timeout = undefined;
            activation = {state: 'verified_waiting', version: data.version,
              ...(typeof data.build === 'string' ? {build: data.build.slice(0, 120)} : {})};
            if (!activationGrace) {
              activationGrace = {worker, expiresAt: Date.now() + VERIFIED_ACTIVATION_GRACE_MS};
              advance();
            }
            progress({phase: 'verified_waiting'});
            // Keep the port for native skipWaiting's final accepted/rejected
            // result. Neither this phase nor that ACK authorises navigation.
            return;
          }
          activation = {state: data?.accepted === true ? 'accepted' : 'rejected',
            ...(typeof data?.version === 'string' ? {version: data.version.slice(0, 80)} : {}),
            ...(typeof data?.build === 'string' ? {build: data.build.slice(0, 120)} : {}),
            ...(typeof data?.error === 'string' ? {error: data.error.slice(0, 180)} : {}),
            ...(typeof data?.message === 'string' ? {message: data.message.slice(0, 280)} : {})};
          cancelActivationProbe();
          if (data?.version !== expectedVersion) {
            fail('version_mismatch', 'The downloaded update belongs to a different release. Refresh this release page and retry.');
          } else if (data?.accepted !== true || data?.ready !== true) {
            fail('activation_failed', 'The downloaded update could not pass its activation check. Stay online and tap again.');
          }
          // An accepted request is not activation. Keep observing state and
          // require the active worker's independent CHECK_OFFLINE response.
        };
        channel.port1.start?.();
        worker.postMessage({type: 'ACTIVATE_UPDATE', expectedVersion}, [channel.port2]);
      } catch {
        activation = {...activation, state: 'request_failed'};
        fail('activation_failed', 'This browser could not request the saved update to activate. Refresh this release page and retry.');
      }
    }
    function pending() {
      return [registration?.installing, registration?.waiting, registration?.active]
        .some(worker => worker && !['activated', 'redundant'].includes(worker.state));
    }
    function track() {
      for (const worker of [registration?.installing, registration?.waiting, registration?.active]) {
        if (!worker || workers.has(worker)) continue;
        workers.add(worker);
        if (worker !== initialActive && (worker === registration.installing || worker === registration.waiting)) {
          // A replacement installation has its own manifest. Do not display
          // a superseded worker's finished count as the new worker's progress.
          lastDownload = undefined;
          progressWorker = worker;
        }
        noteState(worker);
        listen(worker, 'statechange', () => {
          noteState(worker);
          if (worker !== initialActive && worker.state === 'redundant') installFailed = true;
          evaluate();
        });
      }
    }
    function evaluate() {
      if (settled || !registration) return;
      track();
      if (activationProbe && (registration.waiting !== activationProbe.worker ||
          activationProbe.worker.state !== 'installed' || registration.installing)) cancelActivationProbe();
      if (!updating && !registration.installing && registration.waiting?.state === 'installed') {
        requestActivation(registration.waiting);
        if (settled) return;
      }
      if (updating || pending()) {
        cancelProbe();
        if (pending()) {
          const state = (registration.installing || registration.waiting || registration.active)?.state;
          progress({phase: state === 'installed' && verifiedWaitingWorkers.has(registration.waiting) ? 'verified_waiting'
            : state === 'installed' || state === 'activating' ? 'activating'
            : lastDownload && lastDownload.completed === lastDownload.total ? 'finishing' : 'downloading'});
        }
        return;
      }
      const worker = registration.active;
      if (!worker || worker.state !== 'activated') {
        fail(installFailed ? 'install_failed' : 'no_active_worker',
          'FINDR could not finish installing its update. Stay online and retry.');
        return;
      }
      if (probe?.worker === worker) return;
      cancelProbe();
      if (typeof MessageChannelImpl !== 'function') {
        fail('verification_failed', 'This browser could not verify the FINDR update. Retry in your browser.');
        return;
      }
      try {
        progress({phase: 'verifying'});
        const channel = new MessageChannelImpl();
        const current = probe = {worker, channel};
        channel.port1.onmessage = event => {
          if (settled || probe !== current) return;
          if (updating || pending() || registration.active !== worker || worker.state !== 'activated') {
            cancelProbe();
            evaluate();
            return;
          }
          const data = event.data;
          verification = {ready: data?.ready === true,
            ...(typeof data?.version === 'string' ? {version: data.version.slice(0, 80)} : {}),
            ...(typeof data?.build === 'string' ? {build: data.build.slice(0, 120)} : {}),
            ...(typeof data?.error === 'string' ? {error: data.error.slice(0, 180)} : {})};
          if (data?.ready === true && data.version === expectedVersion) {
            progress({phase: 'ready', version: expectedVersion});
            finish(null, {source: 'worker', version: expectedVersion,
              ...(typeof data.build === 'string' ? {build: data.build} : {})});
          } else if (installFailed) {
            fail('install_failed', 'The FINDR update was interrupted. Stay online and retry.');
          } else if (updateFailed) {
            fail('update_failed', 'FINDR could not check for the required update. Stay online and retry.');
          } else if (data?.version !== expectedVersion) {
            fail('version_mismatch', 'FINDR is still using a different saved version. Refresh this release page and retry.');
          } else {
            fail('not_ready', 'The required FINDR version is not ready offline yet. Stay online and retry.');
          }
        };
        channel.port1.start?.();
        worker.postMessage({type: 'CHECK_OFFLINE'}, [channel.port2]);
      } catch {
        fail('verification_failed', 'FINDR could not verify its saved update. Stay online and retry.');
      }
    }

    void (async () => {
      let appURL;
      try {
        const base = new URL(origin);
        appURL = new URL(appPath, base.origin);
        if (appURL.origin !== base.origin || appURL.search || appURL.hash || !appURL.pathname.endsWith('/')) throw Error();
      } catch {
        fail('scope_mismatch', 'The FINDR app address could not be verified. Refresh the release page and retry.');
        return;
      }
      try {
        registration = await serviceWorker.getRegistration(appURL.href);
      } catch {
        if (!settled) fail('registration_failed', 'FINDR could not check its saved app. Retry in your browser.');
        return;
      }
      if (settled) return;
      if (!registration) {
        progress({phase: 'ready'});
        finish(null, {source: 'network'});
        return;
      }
      if (registration.scope !== appURL.href) {
        fail('scope_mismatch', 'A different saved app controls this address. The FINDR update could not be verified.');
        return;
      }
      initialActive = registration.active;
      listen(registration, 'updatefound', evaluate);
      listen(serviceWorker, 'message', event => {
        // Broadcasts from another worker or registration must not affect FINDR.
        if (settled || !workers.has(event.source)) return;
        const data = event.data;
        if (data?.type === 'OFFLINE_PROGRESS' && Number.isInteger(data.completed) &&
            Number.isInteger(data.total) && data.total > 0 && data.completed >= 0 && data.completed <= data.total) {
          const currentWorker = registration.installing || registration.waiting || registration.active;
          if (event.source !== currentWorker) return;
          // A delayed asset broadcast cannot replace the stronger verified
          // waiting phase or renew its fixed activation deadline.
          if (registration.waiting === currentWorker && verifiedWaitingWorkers.has(currentWorker)) return;
          const previous = counts.get(event.source);
          // A manifest's total is fixed. Duplicate, regressive or malformed
          // reports cannot keep an otherwise stalled installation alive.
          if (previous && (previous.total !== data.total || data.completed <= previous.completed)) return;
          counts.set(event.source, {completed: data.completed, total: data.total});
          if (data.completed > (previous?.completed || 0)) advance();
          if (progressWorker !== event.source) lastDownload = undefined;
          progressWorker = event.source;
          progress({phase: data.completed === data.total ? 'finishing' : 'downloading',
            completed: data.completed, total: data.total,
            percent: data.completed === data.total ? 100 : Math.floor(data.completed / data.total * 100)});
        } else if (data?.type === 'OFFLINE_ERROR' && event.source !== initialActive) {
          installFailed = true;
          if (typeof data.asset === 'string') failedAsset = data.asset.slice(0,180);
          workerError = {code: typeof data.code === 'string' ? data.code.slice(0, 100) : 'asset_failed',
            ...(typeof data.message === 'string' ? {message: data.message.slice(0, 280)} : {})};
          evaluate();
        }
      });
      evaluate();
      try { await registration.update(); } catch { updateFailed = true; }
      if (settled) return;
      updating = false;
      advance();
      evaluate();
    })().catch(() => {
      if (!settled) fail('update_failed', 'The FINDR update could not be completed. Stay online and retry.');
    });
  });
}

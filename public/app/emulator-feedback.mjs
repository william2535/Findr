// Optional sound for FINDR's user-driven hints. This never advances a keypad.
// Call unlock() directly from a trusted tap/key event; rendering stays silent.
export function createHintFeedback(options = {}) {
  const Context = Object.hasOwn(options, 'AudioContext')
    ? options.AudioContext
    : globalThis.AudioContext || globalThis.webkitAudioContext;
  const volume = Math.max(0, Math.min(0.3, Number.isFinite(options.volume) ? options.volume : 0.24));
  let enabled = options.enabled !== false, context = null, master = null, compressor = null;
  let pendingResume = null, epoch = 0, request = 0, session = null, disposed = false;
  const voices = new Set();

  function release(voice) {
    voices.delete(voice);
    try { voice.oscillator.disconnect(); } catch {}
    try { voice.envelope.disconnect(); } catch {}
  }

  function silence() {
    request++;
    const now = context?.currentTime || 0;
    for (const voice of voices) {
      try {
        voice.envelope.gain.cancelScheduledValues(now);
        voice.envelope.gain.setTargetAtTime(0, now, 0.003);
        // Also cancels tones whose start time is still in the future.
        voice.oscillator.stop(now + 0.012);
      } catch { release(voice); }
    }
  }

  function unlock() {
    if (!enabled || disposed || typeof Context !== 'function') return Promise.resolve(false);
    try {
      if (!context || context.state === 'closed') {
        context = new Context();
        master = context.createGain();
        master.gain.setValueAtTime(volume, context.currentTime);
        compressor = context.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-18, context.currentTime);
        compressor.knee.setValueAtTime(12, context.currentTime);
        compressor.ratio.setValueAtTime(4, context.currentTime);
        compressor.attack.setValueAtTime(0.003, context.currentTime);
        compressor.release.setValueAtTime(0.12, context.currentTime);
        master.connect(compressor);
        compressor.connect(context.destination);
      }
      if (context.state === 'running') return Promise.resolve(true);
      if (!pendingResume) {
        // resume() is invoked synchronously inside the original user gesture.
        // The promise only gates sound, never the UI or the learning session.
        const attempt = Promise.resolve(context.resume()).then(
          () => context?.state === 'running', () => false,
        );
        pendingResume = attempt;
        attempt.then(() => { if (pendingResume === attempt) pendingResume = null; });
      }
      return pendingResume;
    } catch {
      // Audio support or browser permission cannot stop the emulator.
      return Promise.resolve(false);
    }
  }

  function tone(frequency, start, duration, peak = 0.22, type = 'triangle') {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    const voice = {oscillator, envelope};
    voices.add(voice);
    oscillator.onended = () => release(voice);
    try {
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(peak, start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      envelope.gain.setValueAtTime(0, start + duration + 0.02);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.035);
    } catch (error) {
      release(voice);
      throw error;
    }
  }

  function play(action) {
    if (!enabled || disposed || !context || !session) return false;
    const stamp = epoch, sequence = ++request;
    const ready = () => {
      if (!enabled || disposed || epoch !== stamp || request !== sequence || context.state !== 'running') return false;
      try { action(context.currentTime + 0.006); return true; }
      catch { silence(); return false; }
    };
    if (context.state === 'running') return ready();
    if (pendingResume) {
      // Only the newest pending reward can sound after an asynchronous resume.
      // Mute, leave, restart or cancellation invalidates this callback.
      pendingResume.then(ok => { if (ok) ready(); });
      return true;
    }
    return false;
  }

  function start(runId) {
    epoch++;
    silence();
    session = runId == null || String(runId) === '' ? null : {
      id: String(runId), highest: 0, scale: null, finished: false,
    };
    return Boolean(session);
  }

  function matches(runId) { return session && String(runId) === session.id; }

  function step({runId, completed, total} = {}) {
    if (!matches(runId) || session.finished || !Number.isInteger(completed) || completed <= session.highest) return false;
    session.highest = completed;
    if (!session.scale) session.scale = Math.max(2, Number.isFinite(total) && total > 0 ? total : 8);
    // A smooth, bounded pitch rise works for short and long routes. A changed
    // route length cannot drop the pitch or replay already rewarded progress.
    const progress = 1 - Math.exp(-completed * 1.8 / session.scale);
    const frequency = 330 * 2 ** (1.4 * progress);
    silence();
    return play(startTime => tone(frequency, startTime, 0.15 + 0.05 * progress));
  }

  function complete({runId} = {}) {
    if (!matches(runId) || session.finished) return false;
    session.finished = true;
    silence();
    return play(startTime => {
      // A short ascending major arpeggio, followed by a soft resolving chord.
      for (const [delay, frequency] of [[0,523.25],[0.10,659.25],[0.20,783.99],[0.31,1046.50]]) {
        tone(frequency, startTime + delay, 0.21, 0.19, 'sine');
      }
      for (const [frequency, peak] of [[1046.50,0.12],[1318.51,0.075],[1567.98,0.05]]) {
        tone(frequency, startTime + 0.49, 0.42, peak, 'sine');
      }
    });
  }

  // Hiding a tab silences it while preserving earned progress for the next tap.
  function pause() { epoch++; silence(); }
  function cancel() { pause(); session = null; }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) silence();
    return enabled;
  }

  function dispose() {
    cancel();
    disposed = true;
    for (const voice of [...voices]) release(voice);
    try { master?.disconnect(); compressor?.disconnect(); } catch {}
    try { context?.close()?.catch?.(() => {}); } catch {}
    context = master = compressor = null;
    pendingResume = null;
  }

  return {start, unlock, step, complete, pause, cancel, setEnabled, dispose,
    isEnabled: () => enabled,
    isAvailable: () => !disposed && typeof Context === 'function',
  };
}

// Visual presentation only. Complete transcript text belongs to the job record;
// this module never changes it or waits before allowing a reply to be saved.
const stringify = value => String(value ?? '');
const defaultScheduler = {
  now: () => globalThis.performance?.now?.() ?? Date.now(),
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: timer => globalThis.clearTimeout(timer),
};
const assistantMessage = message => !['user', 'engineer', 'you'].includes(stringify(message.role).toLowerCase());
const segments = text => {
  if (globalThis.Intl?.Segmenter) {
    return Array.from(new Intl.Segmenter(undefined, {granularity:'grapheme'}).segment(text), item => item.segment);
  }
  return Array.from(text);
};

/**
 * Incremental, resumable visual typing for a real saved transcript.
 *
 * Markup: a row [data-message-id="..."] containing [data-terminal-message-text].
 * First render of an existing visit: reconcile(container, messages, {initial:true}).
 * First render of a brand-new introduction: initial:false (the default).
 * Stable message IDs retain progress across subsequent DOM replacement. Historical
 * entries are never replayed. The caller owns app state, scrolling and persistence.
 */
export function createTerminalTyper({
  onProgress = () => {},
  onFinish = () => {},
  reducedMotion,
  shouldAnimate = assistantMessage,
  scheduler = defaultScheduler,
  characterDelay = 22,
  maximumDuration = 1600,
  frameDelay = 16,
} = {}) {
  const states = new Map();
  const clock = {...defaultScheduler, ...scheduler};
  const delay = Math.max(10, Number(characterDelay) || 22);
  const maximum = Math.max(delay, Number(maximumDuration) || 1600);
  const frame = Math.max(10, Number(frameDelay) || 16);
  const media = reducedMotion === undefined && typeof globalThis.matchMedia === 'function'
    ? globalThis.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let container = null, activeId = null, timer = null, queue = [], destroyed = false;

  const noMotion = () => typeof reducedMotion === 'function' ? !!reducedMotion() : reducedMotion === undefined ? !!media?.matches : !!reducedMotion;
  const activeState = () => activeId === null ? null : states.get(activeId);
  const visibleText = state => state.parts.slice(0, state.visible).join('');

  function status() {
    const active = activeState();
    return {typing: !!active, activeId, queued: queue.length, visible: active?.visible ?? 0, total: active?.parts.length ?? 0};
  }
  function setContainerStatus() {
    if (!container) return;
    container.setAttribute('data-terminal-typing', activeId === null ? 'complete' : 'active');
    if (activeId === null) container.removeAttribute('data-typing-active-id');
    else container.setAttribute('data-typing-active-id', activeId);
  }
  function cancelTimer() {
    if (timer !== null) clock.clearTimeout(timer);
    timer = null;
  }
  function paint(state) {
    if (!state.host) return;
    const shown = visibleText(state);
    const phase = state.complete ? 'complete' : state.id === activeId ? 'active' : 'queued';
    state.row?.setAttribute('data-typing', phase);
    // These attributes expose the immutable complete message to assistive tools
    // and acceptance tests without duplicating a second, visibly rendered copy.
    state.host.setAttribute('aria-label', state.text);
    state.host.setAttribute('aria-live', 'off');
    state.host.setAttribute('data-terminal-full-text', state.text);
    if (!state.visibleNode || state.visibleNode.parentNode !== state.host) {
      const doc = state.host.ownerDocument;
      state.visibleNode = doc.createElement('span');
      state.visibleNode.setAttribute('data-terminal-visible-text', '');
      state.host.replaceChildren(state.visibleNode);
    }
    if (state.visibleNode.textContent !== shown) state.visibleNode.textContent = shown;
    if (phase === 'active') {
      if (!state.cursor || state.cursor.parentNode !== state.host) {
        state.cursor = state.host.ownerDocument.createElement('span');
        state.cursor.className = 'terminal-typing-cursor';
        state.cursor.setAttribute('aria-hidden', 'true');
        state.cursor.textContent = '▌';
        state.host.append(state.cursor);
      }
      state.host.setAttribute('title', 'Tap to reveal this message');
    } else {
      state.cursor?.remove();
      state.cursor = null;
      state.host.removeAttribute('title');
    }
  }
  function notify(state, reason) {
    onProgress({...status(), id:state.id, text:state.text, visibleText:visibleText(state), visible:state.visible, total:state.parts.length, complete:state.complete, reason});
  }
  function complete(state, reason, {announce = true} = {}) {
    if (!state || state.complete) return;
    const wasActive = state.id === activeId;
    if (wasActive) { cancelTimer(); activeId = null; }
    queue = queue.filter(id => id !== state.id);
    state.visible = state.parts.length;
    state.complete = true;
    paint(state);
    setContainerStatus();
    if (announce) {
      notify(state, reason);
      onFinish({id:state.id, text:state.text, reason});
    }
  }
  function tick() {
    timer = null;
    if (destroyed) return;
    if (noMotion()) { reveal({all:true, reason:'reduced-motion'}); return; }
    const state = activeState();
    if (!state) return;
    const elapsed = Math.max(0, clock.now() - state.startedAt);
    const visible = Math.min(state.parts.length, Math.floor(elapsed / state.duration * state.parts.length));
    if (visible >= state.parts.length) {
      complete(state, 'typed');
      startNext();
      return;
    }
    if (visible !== state.visible) {
      state.visible = visible;
      paint(state);
      notify(state, 'typing');
    }
    timer = clock.setTimeout(tick, frame);
  }
  function startNext() {
    if (destroyed || activeId !== null) return;
    while (queue.length) {
      const state = states.get(queue.shift());
      if (!state || state.complete) continue;
      if (noMotion() || !state.parts.length) {
        complete(state, noMotion() ? 'reduced-motion' : 'empty');
        continue;
      }
      activeId = state.id;
      state.startedAt = clock.now();
      state.duration = Math.min(maximum, state.parts.length * delay);
      paint(state);
      setContainerStatus();
      notify(state, 'start');
      // A genuine frame is left with a cursor and no characters; this is visible
      // typing, not a CSS fade of a message that was already displayed in full.
      timer = clock.setTimeout(tick, Math.min(frame, delay));
      return;
    }
    setContainerStatus();
  }
  function onClick(event) {
    const state = activeState();
    if (!state?.host || !event.target?.closest) return;
    if (event.target.closest('[data-terminal-message-text]') === state.host) reveal();
  }
  function bind(nextContainer) {
    if (container === nextContainer) return;
    container?.removeEventListener('click', onClick);
    container = nextContainer;
    container?.addEventListener('click', onClick);
  }

  function reconcile(nextContainer, messages = [], {initial = false} = {}) {
    if (destroyed) return status();
    bind(nextContainer);
    const rows = new Map(Array.from(container?.querySelectorAll('[data-message-id]') || [])
      .map(row => [row.getAttribute('data-message-id'), row]));
    const ids = new Set();
    for (const message of Array.isArray(messages) ? messages : []) {
      if (message?.id === undefined || message?.id === null) continue;
      const id = stringify(message.id), text = stringify(message.text);
      ids.add(id);
      let state = states.get(id);
      const newState = !state;
      let changedText = false;
      if (!state) {
        const parts = segments(text);
        const completeImmediately = initial || message.animate === false || !shouldAnimate(message) || noMotion() || !parts.length;
        state = {id, text, parts, visible:completeImmediately ? parts.length : 0, complete:completeImmediately, host:null, row:null, visibleNode:null, cursor:null};
        states.set(id, state);
        if (!completeImmediately) queue.push(id);
      } else if (state.text !== text) {
        changedText = true;
        // Edited records have a new ID in FINDR. If an integration updates a
        // status line in place, show its current value instead of replaying it.
        state.text = text;
        state.parts = segments(text);
        if (!state.complete) complete(state, 'revised', {announce:false});
        state.visible = state.parts.length;
        state.complete = true;
      }
      const row = rows.get(id) || null;
      const host = row?.querySelector('[data-terminal-message-text]') || null;
      const newHost = host !== state.host;
      if (newHost) {
        state.cursor?.remove();
        state.host = host; state.row = row; state.visibleNode = null; state.cursor = null;
      } else state.row = row;
      if (initial && !state.complete) complete(state, 'history', {announce:false});
      // Virtualised/off-screen history has no characters to paint. Do not keep
      // timers alive for absent rows or delay a later visible message behind it.
      if (!host && !state.complete) complete(state, 'not-rendered', {announce:false});
      if (newState || newHost || changedText || state.id === activeId || initial) paint(state);
    }
    // Removed/virtualised entries must not leave an orphan cursor or block a
    // later output. Their IDs remain known so putting history back cannot replay.
    for (const state of states.values()) {
      if (ids.has(state.id)) continue;
      if (!state.complete) complete(state, 'removed', {announce:false});
      state.host = null; state.row = null; state.visibleNode = null; state.cursor = null;
    }
    if (noMotion()) reveal({all:true, reason:'reduced-motion'});
    else startNext();
    setContainerStatus();
    return status();
  }
  function reveal({all = false, reason = 'revealed'} = {}) {
    if (destroyed) return status();
    const current = activeState();
    if (all) {
      const unfinished = [...states.values()].filter(state => !state.complete);
      cancelTimer(); activeId = null; queue = [];
      for (const state of unfinished) complete(state, reason);
    } else if (current) complete(current, reason);
    startNext();
    return status();
  }
  function onMotionChange() { if (noMotion()) reveal({all:true, reason:'reduced-motion'}); }
  if (media?.addEventListener) media.addEventListener('change', onMotionChange);
  else media?.addListener?.(onMotionChange);
  function destroy() {
    if (destroyed) return;
    // Leaving the screen never destroys or truncates the original job text.
    reveal({all:true, reason:'leaving'});
    destroyed = true;
    cancelTimer();
    container?.removeEventListener('click', onClick);
    if (media?.removeEventListener) media.removeEventListener('change', onMotionChange);
    else media?.removeListener?.(onMotionChange);
    container = null;
  }
  return {reconcile, reveal, status, destroy};
}

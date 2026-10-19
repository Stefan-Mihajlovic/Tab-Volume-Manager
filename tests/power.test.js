const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const load = (name, ctx) => vm.runInContext(fs.readFileSync(`${__dirname}/../${name}`, 'utf8'), ctx);

function audioMocks() {
  const param = () => ({ value: 1, setTargetAtTime(v) { this.value = v; } });
  class AudioNode {
    constructor(context) {
      this.context = context; this.outputs = [];
      for (const k of ['gain', 'frequency', 'Q', 'threshold', 'knee', 'ratio', 'attack', 'release']) this[k] = param();
    }
    connect(dest) { this.outputs.push(dest); return dest; }
    disconnect() { this.outputs = []; }
  }
  class AudioContext {
    constructor() { this.currentTime = 0; this.destination = new AudioNode(this); }
    createGain() { return new AudioNode(this); }
    createBiquadFilter() { return new AudioNode(this); }
    createDynamicsCompressor() { return new AudioNode(this); }
    createChannelSplitter() { return new AudioNode(this); }
    createChannelMerger() { return new AudioNode(this); }
    createAnalyser() { return new AudioNode(this); }
    createMediaStreamSource() { return new AudioNode(this); }
    createMediaElementSource() { return new AudioNode(this); }
    async resume() {}
  }
  return { AudioNode, AudioContext };
}

test('page audio bypasses every processor, including new contexts/media, and restores saved settings', () => {
  const mocks = audioMocks(); let onMessage; let onReady;
  const media = { readyState: 4, addEventListener() {} };
  const window = { AudioContext: mocks.AudioContext, postMessage() {}, addEventListener(t, fn) { onMessage = fn; } };
  const ctx = vm.createContext({ ...mocks, window, setTimeout() {}, clearTimeout() {}, MutationObserver: class { observe() {} },
    document: { readyState: 'loading', addEventListener(t, fn) { onReady = fn; }, querySelectorAll: () => [media] } });
  load('stereo.js', ctx); load('content.js', ctx);
  const manager = window.__zazVolumeManager;
  const send = data => onMessage({ source: window, data });
  const settings = { type: 'ZAZ_VOLUME_UPDATE', volume: 320, effectMode: 'bass', effectAmount: 12, eqBands: Array(10).fill(5) };
  send(settings);
  const audio = new window.AudioContext();
  const chain = manager.nodes.get(audio);
  const source = audio.createGain(); source.connect(audio.destination);
  assert.equal(source.outputs[0], chain.input);
  assert.deepEqual(chain.input.outputs, [audio.destination]);
  onReady();
  const mediaChain = manager.nodes.get(media.__zazCtx);
  assert.deepEqual(mediaChain.input.outputs, [media.__zazCtx.destination]);
  send({ type: 'TVM_POWER', enabled: true });
  assert.deepEqual(chain.input.outputs, [chain.effectBass]);
  assert.deepEqual(mediaChain.input.outputs, [mediaChain.effectBass]);
  assert.equal(chain.gain.gain.value, 3.2);
  assert.equal(chain.effectBass.gain.value, 18);
  for (let i = 0; i < 5; i++) {
    send({ type: 'TVM_POWER', enabled: false });
    send({ ...settings, volume: 0 }); // Updates must never remove the bypass.
    assert.deepEqual(chain.input.outputs, [audio.destination]);
    send(settings);
    send({ type: 'TVM_POWER', enabled: true });
    assert.deepEqual(chain.input.outputs, [chain.effectBass]);
    assert.equal(chain.gain.gain.value, 3.2);
  }
  send({ type: 'TVM_POWER', enabled: false });
  const next = new window.AudioContext();
  assert.deepEqual(manager.nodes.get(next).input.outputs, [next.destination]);
});

test('captured tabs start bypassed when disabled and all restore without new capture', async () => {
  let changed; let pendingStream;
  const mocks = audioMocks();
  const ctx = vm.createContext({ ...mocks, Uint8Array, Float32Array, setInterval() {}, clearInterval() {},
    navigator: { mediaDevices: { getUserMedia: () => new Promise(resolve => { pendingStream = resolve; }) } },
    chrome: { runtime: { sendMessage: async () => ({ enabled: false }),
      onMessage: { addListener(fn) { changed = changes => fn({ target: 'offscreen', type: 'TVM_POWER', enabled: changes.tvmEnabled.newValue }, {}, () => {}); } } } } });
  load('stereo.js', ctx); load('offscreen.js', ctx);
  const creating = vm.runInContext('createSession(1, "stream", { volume: 270, effectMode: "voice", effectAmount: 10 })', ctx);
  await new Promise(resolve => setImmediate(resolve));
  changed({ tvmEnabled: { newValue: true } }, 'local');
  changed({ tvmEnabled: { newValue: false } }, 'local');
  pendingStream({ getAudioTracks: () => [{ addEventListener() {} }] });
  await creating;
  const session = vm.runInContext('sessions.get(1)', ctx);
  assert.deepEqual(session.analyser.outputs, [session.context.destination]);
  changed({ tvmEnabled: { newValue: true } }, 'local');
  assert.deepEqual(session.analyser.outputs, [session.effectBass]);
  assert.equal(session.gain.gain.value, 2.7);
  changed({ tvmEnabled: { newValue: false } }, 'local');
  ctx.session = session;
  vm.runInContext('applySettings(session, { volume: 0, effectMode: "bass", effectAmount: 20 })', ctx);
  assert.deepEqual(session.analyser.outputs, [session.context.destination]);
});

test('storage bridge persists power across page startup and ignores a stale initial read', () => {
  let read; let changed; let message; const sent = [];
  const window = { postMessage: data => sent.push(data), addEventListener: (t, fn) => { if (t === 'message') message = fn; } };
  const ctx = vm.createContext({ window, document: { addEventListener() {} }, chrome: { runtime: { sendMessage: async () => ({ ok: true }) }, storage: {
    local: { get: (key, fn) => { read = fn; } }, onChanged: { addListener: fn => { changed = fn; } }
  } } });
  load('power-bridge.js', ctx);
  changed({ tvmEnabled: { newValue: false } }, 'local');
  read({ tvmEnabled: true });
  message({ source: window, data: { type: 'TVM_POWER_READY' } });
  assert.equal(sent.length, 2);
  assert.ok(sent.every(event => event.enabled === false));
  changed({ tvmEnabled: { newValue: undefined } }, 'local');
  assert.equal(sent.at(-1).enabled, true);
});

test('power off prevents capture and sleep timer execution; cancels scheduled timer', async () => {
  const messages = []; let changed; const cleared = []; const removed = [];
  const noop = { addListener() {} };
  const ctx = vm.createContext({ console, chrome: {
    runtime: { sendMessage: async () => ({}), onConnect: noop, onStartup: noop, onInstalled: noop, onMessage: { addListener: fn => messages.push(fn) } },
    storage: { local: { get: (keys, cb) => cb({ tvmEnabled: false }), remove: (key, cb) => { removed.push(key); cb(); } }, onChanged: { addListener: fn => { changed = fn; } } },
    alarms: { onAlarm: noop, clear: async key => cleared.push(key) }, tabs: { onRemoved: noop }
  } });
  load('background.js', ctx);
  const response = await new Promise(resolve => {
    for (const handler of messages) handler({ type: 'ZAZ_CAPTURE_TAB', tabId: 7 }, {}, resolve);
  });
  assert.equal(response.bypassed, true);
  // No capture, tab queries, muting or script APIs exist in this harness.
  await vm.runInContext('executeSleepTimer({tabIds: [7]})', ctx);
  changed({ tvmEnabled: { newValue: false } }, 'local');
  assert.deepEqual(cleared, ['tvmSleepTimer']);
  assert.deepEqual(removed, ['tvmSleepTimerState']);
});

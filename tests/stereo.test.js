const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function runtime() {
  const context = vm.createContext({ chrome: { runtime: { onMessage: { addListener() {} } } } });
  vm.runInContext(fs.readFileSync(`${__dirname}/../stereo.js`, "utf8"), context);
  return context;
}

test("Stereo input normalization is bounded and preserves legacy defaults", () => {
  const { TvmStereo } = runtime();
  assert.equal(TvmStereo.normalize(undefined).width, 100);
  assert.equal(TvmStereo.normalize(undefined).enabled, false);
  assert.equal(TvmStereo.normalize({ width: Infinity }).width, 100);
  assert.equal(TvmStereo.normalize({ balance: -1000 }).balance, -100);
  assert.equal(TvmStereo.normalize({ width: 1000 }).width, 200);
});

test("Stereo matrix never amplifies bounded channel peaks", () => {
  const { TvmStereo } = runtime();
  for (let width = 0; width <= 200; width += 5) {
    for (let balance = -100; balance <= 100; balance += 10) {
      for (const swap of [false, true]) {
        const [ll, lr, rl, rr] = TvmStereo.coefficients({ enabled: true, width, balance, swap });
        assert.ok(Math.abs(ll) + Math.abs(lr) <= 1.000001);
        assert.ok(Math.abs(rl) + Math.abs(rr) <= 1.000001);
      }
    }
  }
});

test("Offscreen processing rejects stereo controls without a current Pro entitlement", () => {
  const context = runtime();
  vm.runInContext(fs.readFileSync(`${__dirname}/../offscreen.js`, "utf8"), context);
  const parameter = () => ({ setTargetAtTime(value) { this.value = value; } });
  const node = () => Object.fromEntries(["gain", "frequency", "threshold", "knee", "ratio", "attack", "release"].map((key) => [key, parameter()]));
  const session = { context: { currentTime: 0 }, stereo: { matrix: Array.from({ length: 4 }, () => node()) }, filters: Array.from({ length: 10 }, node) };
  for (const key of ["gain", "effectBass", "effectVoice", "dialogueHighpass", "dialogueWarmth", "dialoguePresence", "dialogueCompressor", "adaptiveCompressor", "adaptiveGain", "limiter"]) session[key] = node();
  context.session = session;
  context.settings = { volume: 1500, proValidUntil: 0, pro: { stereo: { enabled: true, swap: true } } };
  vm.runInContext("applySettings(session, settings)", context);
  assert.deepEqual(session.stereo.matrix.map((n) => n.gain.value), [1, 0, 0, 1]);
  assert.equal(session.gain.gain.value, 5);
  context.settings.proValidUntil = Date.now() / 1000 + 60;
  vm.runInContext("applySettings(session, settings)", context);
  assert.deepEqual(session.stereo.matrix.map((n) => n.gain.value), [0, 1, 1, 0]);
  assert.equal(session.gain.gain.value, 15);
  context.settings.proValidUntil = Date.now() / 1000 - 1;
  vm.runInContext("applySettings(session, settings)", context);
  assert.deepEqual(session.stereo.matrix.map((n) => n.gain.value), [1, 0, 0, 1]);
});

test("Page audio contexts created after settings arrive restore stereo, and expiry bypasses it", () => {
  const parameter = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  class AudioNode {
    constructor(context) {
      this.context = context;
      for (const key of ["gain", "frequency", "Q", "threshold", "knee", "ratio", "attack", "release"]) this[key] = parameter();
    }
    connect() {}
  }
  class AudioContext {
    constructor() { this.currentTime = 0; this.destination = new AudioNode(this); }
    createGain() { return new AudioNode(this); }
    createBiquadFilter() { return new AudioNode(this); }
    createDynamicsCompressor() { return new AudioNode(this); }
    createChannelSplitter() { return new AudioNode(this); }
    createChannelMerger() { return new AudioNode(this); }
  }
  let messageHandler;
  let expiryHandler;
  const window = { AudioContext, addEventListener(type, handler) { messageHandler = handler; } };
  const context = vm.createContext({ window, AudioNode, document: { readyState: "loading", addEventListener() {} }, setTimeout(fn) { expiryHandler = fn; return 1; }, clearTimeout() {} });
  vm.runInContext(fs.readFileSync(`${__dirname}/../stereo.js`, "utf8"), context);
  vm.runInContext(fs.readFileSync(`${__dirname}/../content.js`, "utf8"), context);
  messageHandler({ data: { type: "ZAZ_VOLUME_UPDATE", volume: 100, effectAmount: 0, proValidUntil: Date.now() / 1000 + 60, pro: { stereo: { enabled: true, swap: true } } } });
  const audio = new window.AudioContext();
  const chain = window.__zazVolumeManager.nodes.get(audio);
  assert.deepEqual(Array.from(chain.stereo.matrix, (n) => n.gain.value), [0, 1, 1, 0]);
  expiryHandler();
  assert.deepEqual(Array.from(chain.stereo.matrix, (n) => n.gain.value), [1, 0, 0, 1]);
});

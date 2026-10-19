const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function mixerHarness({ captured = false, pageAvailable = true, discarded = false } = {}) {
  const handlers = [];
  const session = {};
  let url = 'https://example.com/video';
  const pageUpdates = [];
  const capturedUpdates = [];
  const noop = { addListener() {} };
  const ctx = vm.createContext({ console, URL, chrome: {
    runtime: {
      onConnect: noop, onStartup: noop, onInstalled: noop,
      onMessage: { addListener: fn => handlers.push(fn) },
      getURL: name => name, getContexts: async () => [{}],
      sendMessage: async message => { capturedUpdates.push(message); return { ok: true }; },
    },
    storage: { local: { get: (keys, cb) => cb({}) }, session: {
      get: async key => ({ [key]: session[key] }), set: async values => Object.assign(session, values),
      remove: async key => { delete session[key]; },
    }, onChanged: noop },
    alarms: { onAlarm: noop }, tabs: { onRemoved: noop, get: async id => ({ id, url, discarded }) },
    tabCapture: { getCapturedTabs: async () => captured ? [{ tabId: 7, status: 'active' }] : [] },
    scripting: { executeScript: async request => {
      pageUpdates.push(request);
      return [{ result: pageAvailable }];
    } },
  } });
  vm.runInContext(fs.readFileSync(`${__dirname}/../background.js`, 'utf8'), ctx);
  return {
    pageUpdates, capturedUpdates, session,
    setAvailable: value => { pageAvailable = value; },
    setUrl: value => { url = value; },
    restore: () => new Promise(resolve => {
      for (const handler of handlers) handler({ type: 'TVM_RESTORE_TAB' }, { tab: { id: 7 } }, resolve);
    }),
    send: settings => new Promise(resolve => {
      for (const handler of handlers) handler({ type: 'ZAZ_CAPTURE_TAB', tabId: 7, allowPageFallback: true, settings }, {}, resolve);
    }),
  };
}

test('quiet mixer targets receive validated settings without starting capture', async () => {
  const harness = mixerHarness();
  const result = await harness.send({ volume: 900, pro: { enabled: true } });
  assert.equal(result.ok, true);
  assert.equal(result.processing, 'page');
  assert.equal(harness.capturedUpdates.length, 0);
  assert.equal(harness.pageUpdates[0].target.tabId, 7);
  assert.equal(harness.pageUpdates[0].args[0].volume, 500);
  assert.equal(harness.pageUpdates[0].args[0].pro, null);
});

test('captured mixer targets keep offscreen processing and neutralize page processing', async () => {
  const harness = mixerHarness({ captured: true });
  assert.equal((await harness.send({ volume: 240, effectMode: 'bass' })).ok, true);
  assert.equal(harness.capturedUpdates[0].settings.volume, 240);
  assert.equal(harness.capturedUpdates[0].settings.effectMode, 'bass');
  const neutral = harness.pageUpdates[0].args[0];
  assert.equal(neutral.volume, 100);
  assert.equal(neutral.effectMode, 'none');
  assert.ok(neutral.eqBands.every(value => value === 0));
  assert.equal(neutral.pro, null);
});

test('unavailable tabs save settings and restore them once ready', async () => {
  const harness = mixerHarness({ pageAvailable: false });
  const result = await harness.send({ volume: 240 });
  assert.equal(result.ok, true);
  assert.equal(result.pending, true);
  assert.equal(harness.session['tvmTabSettings:7'].settings.volume, 240);
  assert.equal(harness.capturedUpdates.length, 0);
  harness.setAvailable(true);
  harness.pageUpdates.length = 0;
  assert.equal((await harness.restore()).ok, true);
  assert.equal(harness.pageUpdates[0].args[0].volume, 240);
});

test('restoration does not apply tab settings after navigating to another origin', async () => {
  const harness = mixerHarness();
  await harness.send({ volume: 240 });
  harness.setUrl('https://another.example/video');
  harness.pageUpdates.length = 0;
  assert.equal((await harness.restore()).ok, true);
  assert.equal(harness.pageUpdates.length, 0);
});

test('restoration and rapid edits share a queue and the last edit wins', async () => {
  const harness = mixerHarness();
  await harness.send({ volume: 150 });
  await Promise.all([harness.restore(), harness.send({ volume: 240 }), harness.restore(), harness.send({ volume: 310 })]);
  const updates = harness.pageUpdates.filter(item => item.args?.[0]?.volume);
  assert.equal(updates.at(-1).args[0].volume, 310);
  assert.equal(harness.session['tvmTabSettings:7'].settings.volume, 310);
});

test('discarded tabs save settings without waking or injecting into the page', async () => {
  const harness = mixerHarness({ discarded: true });
  const result = await harness.send({ volume: 230, effectMode: 'bass', effectAmount: 13, eqBands: [0, 0, 0, 5, 0, 0, 0, 0, 0, 0] });
  assert.equal(result.ok, true);
  assert.equal(result.pending, true);
  assert.equal(harness.pageUpdates.length, 0);
  assert.equal(harness.capturedUpdates.length, 0);
  assert.equal(harness.session['tvmTabSettings:7'].settings.volume, 230);
  assert.equal(harness.session['tvmTabSettings:7'].settings.eqBands[3], 5);
});

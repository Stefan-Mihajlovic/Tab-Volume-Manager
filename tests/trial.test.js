const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');

async function harness() {
  const keys = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await webcrypto.subtle.exportKey('jwk', keys.publicKey);
  const installation = webcrypto.randomUUID();
  const store = { tvmProInstallationId: installation };
  const changes = []; const alarms = new Map();
  const noop = { addListener() {} };
  const context = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, atob, console, setTimeout, clearTimeout,
    chrome: {
      storage: { local: { get(keys, cb) { cb(Object.fromEntries(keys.map(k => [k, store[k]]))); }, set(values, cb) { Object.assign(store, values); cb?.(); }, remove(keys, cb) { for (const k of [].concat(keys)) delete store[k]; cb?.(); } }, onChanged: { addListener(fn) { changes.push(fn); } } },
      runtime: { onConnect: noop, onMessage: noop, onStartup: noop, onInstalled: noop },
      tabs: { onRemoved: noop }, alarms: { onAlarm: noop, create: async (name, value) => alarms.set(name, value), clear: async name => alarms.delete(name) }
    } });
  let source = fs.readFileSync(require.resolve('../background.js'), 'utf8').replace(/const TVM_LICENSE_PUBLIC_JWK = \{[\s\S]*?\};/, `const TVM_LICENSE_PUBLIC_JWK = ${JSON.stringify(jwk)};`);
  vm.runInContext(source, context);
  async function sign(overrides = {}) {
    const now = Math.floor(Date.now() / 1000);
    const payload = { product: 'tab_volume_manager_pro', installation: Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(installation))).toString('hex'), plan: 'trial', exp: now + 100, ...overrides };
    const h = Buffer.from(JSON.stringify({ alg: 'ES256', typ: payload.plan === 'trial' ? 'EXT-TRIAL' : 'TVM-ENT' })).toString('base64url');
    const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const s = Buffer.from(await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, Buffer.from(h + '.' + p))).toString('base64url');
    return { token: `${h}.${p}.${s}`, expiresAt: payload.exp };
  }
  const check = () => { vm.runInContext('entitlementCache.checkedAt = 0', context); return vm.runInContext('sanitizeSettings({ volume: 1400, eqBands: Array(10).fill(4), pro: {smartLimiter: {enabled: true}} })', context); };
  return { store, sign, check, context, alarms };
}
test('signed trials unlock audio, reject wrong product/installation/tampering and enforce expiry', async () => {
  const { store, sign, check } = await harness();
  assert.equal((await check()).volume, 500);
  store.tvmTrial = { entitlement: await sign() };
  let settings = await check(); assert.equal(settings.volume, 1400); assert.equal(settings.proPlan, 'trial'); assert.equal(settings.eqBands[2], 4);
  for (const override of [{ product: 'font_pirate_plus' }, { installation: 'other' }, { exp: Math.floor(Date.now()/1000)-1 }]) {
    store.tvmTrial = { entitlement: await sign(override) }; settings = await check();
    assert.equal(settings.volume, 500); assert.equal(settings.eqBands[2], 0); assert.equal(settings.pro, null);
  }
  const valid = await sign(); store.tvmTrial = { entitlement: { ...valid, token: valid.token.slice(0,-5) + 'AAAAA' } };
  assert.equal((await check()).volume, 500);
});
test('paid licenses take priority over trials and expiry preserves saved settings', async () => {
  const { store, sign, check, context, alarms } = await harness();
  store.tvmTrial = { entitlement: await sign() };
  store.tvmProEntitlement = await sign({ plan: 'lifetime' });
  assert.equal((await check()).proPlan, 'lifetime');
  delete store.tvmProEntitlement;
  await check(); await vm.runInContext('syncTrialAlarm()', context); assert(alarms.has('tvmTrialExpiry'));
  store.savedEqPresets = [{ name: 'Keep me' }]; store.tvmSleepTimerState = { endsAt: Date.now() + 600000 };
  store.tvmTrial = { entitlement: await sign({ exp: Math.floor(Date.now()/1000)-1 }) };
  await check(); await vm.runInContext('syncTrialAlarm()', context);
  assert.equal(store.tvmSleepTimerState, undefined); assert.deepEqual(store.savedEqPresets, [{ name: 'Keep me' }]);
});

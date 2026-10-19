// Run from the repository root with Playwright and a Chromium browser supporting extensions.
const { chromium } = require(process.env.TVM_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tvm-mixer-'));
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(`<title>${req.url === '/first' ? 'First quiet tab' : 'Second quiet tab'}</title><button id="play">Play</button>
      <script>document.querySelector('#play').onclick = async () => {
        window.testContext = new AudioContext();
        window.testSource = testContext.createOscillator();
        testSource.connect(testContext.destination);
        await testContext.resume(); testSource.start();
      };</script>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let context;
  try {
    const root = process.cwd();
    context = await chromium.launchPersistentContext(profile, {
      headless: true,
      ...(process.env.TVM_BROWSER_PATH ? { executablePath: process.env.TVM_BROWSER_PATH } : {}),
      args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
      viewport: { width: 400, height: 600 },
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = worker.url().split('/')[2];
    const processing = await worker.evaluate(async () => {
      await ensureOffscreenDocument();
      return chrome.runtime.sendMessage({ type: 'ZAZ_OFFSCREEN_STATUS', target: 'offscreen' });
    });
    assert.equal(processing.ok, true, 'Offscreen processing must start without unavailable extension APIs');
    const first = await context.newPage();
    const second = await context.newPage();
    const base = `http://127.0.0.1:${server.address().port}`;
    await first.goto(`${base}/first`);
    await second.goto(`${base}/second`);
    await first.waitForFunction(() => window.__zazVolumeManager?.enabled);
    const popup = await context.newPage();
    const errors = [];
    popup.on('pageerror', error => errors.push(error.message));
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.locator('#powerToggle:not([disabled])').waitFor();
    await popup.waitForTimeout(1000);
    // UI fixture only: the background still validates all audio settings normally.
    await popup.evaluate(async () => {
      isProActive = true;
      document.body.classList.add('proActive');
      document.querySelector('#proMarketingContent').classList.add('hidden');
      document.querySelector('#proToolsContent').classList.remove('hidden');
      setActiveTab('pro');
      await refreshMixerTabs();
    });
    assert.equal(await popup.locator('.mixerTabRow').count(), 2, 'Quiet web tabs should be listed, extension pages excluded');
    assert.equal(await popup.locator('.mixerSettingsButton:disabled').count(), 0);
    const row = popup.locator('.mixerTabRow').filter({ hasText: 'First quiet tab' });
    await row.locator('.mixerInlineSlider').evaluate(input => {
      input.value = String(mixerSliderPosition(240)); input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await first.waitForFunction(() => window.__zazVolumeManager.gain === 2.4);
    assert.equal(await second.evaluate(() => window.__zazVolumeManager.gain), 1, 'Preparing one tab must not change another tab');
    assert.equal(await first.evaluate(() => window.testContext), undefined, 'Preparation must not start playback');
    await row.locator('.mixerMuteButton').click();
    await first.waitForFunction(() => window.__zazVolumeManager.gain === 0);
    await row.locator('.mixerMuteButton').click();
    await first.waitForFunction(() => window.__zazVolumeManager.gain === 2.4);
    await first.locator('#play').click();
    await first.waitForFunction(() => testContext.state === 'running');
    await first.waitForTimeout(250);
    assert.ok(Math.abs(await first.evaluate(() => window.__zazVolumeManager.nodes.get(testContext).gain.gain.value) - 2.4) < 1e-5,
      'Audio created after configuration must use the prepared gain');
    await first.evaluate(() => testSource.stop());

    await popup.evaluate(() => refreshMixerTabs());
    assert.equal(await row.locator('.mixerNumberField input').inputValue(), '240');
    await row.locator('.mixerNumberField input').fill('175');
    await row.locator('.mixerNumberField input').press('Enter');
    await first.waitForFunction(() => window.__zazVolumeManager.gain === 1.75);
    await row.locator('.mixerResetButton').click();
    await first.waitForFunction(() => window.__zazVolumeManager.gain === 1);
    await row.locator('.mixerInlineSlider').focus();
    await row.locator('.mixerInlineSlider').press('ArrowRight');
    await first.waitForFunction(() => window.__zazVolumeManager.gain === 1.01);
    await popup.evaluate(() => {
      const row = [...document.querySelectorAll('.mixerTabRow')].find(row => row.textContent.includes('First quiet tab'));
      changeMixerVolume(row, 125); changeMixerVolume(row, 180); changeMixerVolume(row, 235);
    });
    await first.waitForFunction(() => window.__zazVolumeManager.gain === 2.35);
    await popup.waitForFunction(() => [...document.querySelectorAll('.mixerTabRow')].every(row => !row._mixer.saving));
    await popup.evaluate(() => {
      window.originalMixerApply = applyMixerVolume;
      applyMixerVolume = async () => { throw new Error('Test storage failure'); };
    });
    await row.locator('.mixerResetButton').click();
    await row.locator('.mixerRowError:not(.hidden)').waitFor();
    assert.equal(await row.locator('.mixerNumberField input').inputValue(), '235', 'Failed update rolls back');
    await popup.evaluate(() => { applyMixerVolume = window.originalMixerApply; });
    await row.locator('.mixerResetButton').click();
    await first.waitForFunction(() => window.__zazVolumeManager.gain === 1);
    await row.locator('.mixerSettingsButton').click();
    await popup.locator('#mixerSettingsModal').waitFor({ state: 'visible' });
    assert.equal(await popup.locator('#mixerEqGrid input').count(), 10);
    await popup.locator('#mixerQuickEffects [data-mode="bass"]').click();
    await first.waitForFunction(() => window.__zazVolumeManager.effectMode === 'bass');
    await popup.locator('#mixerEffectSlider').evaluate(input => { input.value = '14'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await first.waitForFunction(() => window.__zazVolumeManager.effectAmount === 14);
    await popup.locator('#mixerEqGrid [data-band="3"]').evaluate(input => { input.value = '6'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await first.waitForFunction(() => window.__zazVolumeManager.eqBands[3] === 6);
    assert.equal(await second.evaluate(() => window.__zazVolumeManager.effectMode), 'none');
    assert.equal(await second.evaluate(() => window.__zazVolumeManager.eqBands[3]), 0);
    await popup.waitForFunction(() => [...document.querySelectorAll('.mixerTabRow')].every(row => !row._mixer.saving));
    await popup.locator('#mixerSavePreset').click();
    await popup.locator('#presetNameInput').fill('Mixer target EQ');
    await popup.locator('#confirmSavePreset').click();
    await popup.locator('#mixerSettingsModal').waitFor({ state: 'visible' });
    const saved = await popup.evaluate(async () => (await chrome.storage.local.get('savedEqPresets')).savedEqPresets);
    assert.equal(saved.find(preset => preset.name === 'Mixer target EQ').eqBands[3], 6, 'Save uses target tab EQ');
    await popup.locator('#mixerResetEq').click();
    await first.waitForFunction(() => window.__zazVolumeManager.eqBands[3] === 0);
    await popup.locator('#mixerLoadPreset').click();
    await popup.locator('.presetSlot').filter({ hasText: 'Mixer target EQ' }).click();
    await popup.locator('#mixerSettingsModal').waitFor({ state: 'visible' });
    await first.waitForFunction(() => window.__zazVolumeManager.eqBands[3] === 6);
    assert.equal(await second.evaluate(() => window.__zazVolumeManager.eqBands[3]), 0, 'Load changes only the target tab');
    assert.equal(await popup.evaluate(() => eqBands[3]), 0, 'Mixer preset actions do not change the main tab EQ');
    await popup.locator('#mixerLoadPreset').click();
    await popup.keyboard.press('Escape');
    await popup.locator('#mixerSettingsModal').waitFor({ state: 'visible' });
    await popup.screenshot({ path: '/tmp/tvm-mixer-quick-settings-dark.png', animations: 'disabled' });
    await popup.evaluate(() => applyTheme("light"));
    await popup.waitForTimeout(300);
    await popup.screenshot({ path: '/tmp/tvm-mixer-quick-settings-light.png' });
    await popup.evaluate(() => applyTheme("dark"));
    await popup.locator('[data-close-modal="mixerSettingsModal"]').click();
    await row.locator('.mixerResetButton').click();
    await first.waitForFunction(() => window.__zazVolumeManager.gain === 1);
    assert.equal(await first.evaluate(() => window.__zazVolumeManager.eqBands[3]), 6, 'Changing volume preserves EQ');
    await row.locator('.mixerSettingsButton').click();
    assert.equal(await popup.locator('#mixerEqGrid [data-band="3"]').inputValue(), '6', 'Reopening preserves tab EQ');
    await popup.locator('#mixerQuickEffects [data-mode="voice"]').click();
    await first.waitForFunction(() => window.__zazVolumeManager.effectMode === 'voice');
    await popup.locator('#mixerResetEq').click();
    await first.waitForFunction(() => window.__zazVolumeManager.eqBands.every(value => value === 0));
    assert.equal(await first.evaluate(() => window.__zazVolumeManager.effectMode), 'voice', 'Reset EQ preserves quick effects');
    await popup.locator('#mixerQuickEffects [data-mode="none"]').click();
    await first.waitForFunction(() => window.__zazVolumeManager.effectMode === 'none');
    assert.equal(await popup.locator('#mixerEffectSlider').isDisabled(), true);
    await popup.evaluate(() => { isProActive = false; document.body.classList.remove('proActive'); openMixerSettings(selectedMixerTab, selectedMixerRow); });
    assert.equal(await popup.locator('#mixerEqGrid input').count(), 6);
    await popup.evaluate(() => { isProActive = true; document.body.classList.add('proActive'); openMixerSettings(selectedMixerTab, selectedMixerRow); });

    await popup.locator('[data-close-modal="mixerSettingsModal"]').click();
    await popup.locator('.mixerSection').scrollIntoViewIfNeeded();
    await popup.screenshot({ path: '/tmp/tvm-mixer-redesign-dark.png' });
    await popup.locator('#themeToggle').evaluate(input => input.click());
    await popup.waitForTimeout(300);
    await popup.screenshot({ path: '/tmp/tvm-mixer-redesign-light.png' });
    assert.ok(await popup.evaluate(() => document.documentElement.scrollWidth <= 400), 'No horizontal overflow');
    const third = await context.newPage();
    await third.goto(`${base}/third`);
    await popup.waitForFunction(() => document.querySelectorAll('.mixerTabRow').length === 3);
    await third.close();
    await popup.waitForFunction(() => document.querySelectorAll('.mixerTabRow').length === 2);
    // Prepare two same-origin tabs differently, then close the popup and reload both.
    await popup.evaluate(async () => {
      const rows = [...document.querySelectorAll('.mixerTabRow')];
      const first = rows.find(row => row.textContent.includes('First quiet tab'));
      const second = rows.find(row => row.textContent.includes('Second quiet tab'));
      first._mixer.sound = { effectMode: 'bass', effectAmount: 13, eqBands: [0, 0, 0, 5, 0, 0, 0, 0, 0, 0] };
      await changeMixerVolume(first, 240);
      second._mixer.sound = { effectMode: 'voice', effectAmount: 8, eqBands: Array(10).fill(0) };
      await changeMixerVolume(second, 130);
    });
    await popup.close();
    await first.reload();
    await second.reload();
    await first.waitForFunction(() => window.__zazVolumeManager?.gain === 2.4 && __zazVolumeManager.effectMode === 'bass' && __zazVolumeManager.eqBands[3] === 5);
    await second.waitForFunction(() => window.__zazVolumeManager?.gain === 1.3 && __zazVolumeManager.effectMode === 'voice');
    assert.equal(await first.evaluate(() => window.testContext), undefined, 'Restoring settings must not start playback');
    await first.locator('#play').click();
    await first.waitForTimeout(250);
    assert.ok(Math.abs(await first.evaluate(() => __zazVolumeManager.nodes.get(testContext).gain.gain.value) - 2.4) < 1e-5);
    const reopened = await context.newPage();
    await reopened.goto(`chrome-extension://${id}/popup.html`);
    await reopened.locator('#powerToggle:not([disabled])').waitFor();
    await reopened.evaluate(async () => { isProActive = true; await refreshMixerTabs(); });
    const restoredRows = reopened.locator('.mixerTabRow');
    assert.equal(await restoredRows.filter({ hasText: 'First quiet tab' }).locator('.mixerNumberField input').inputValue(), '240');
    assert.equal(await restoredRows.filter({ hasText: 'Second quiet tab' }).locator('.mixerNumberField input').inputValue(), '130');
    assert.deepEqual(errors, []);
    console.log('Mixer controls, targeted presets, offscreen startup, per-tab reload persistence, popup reopening and future playback passed.');
  } finally {
    if (context) await context.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

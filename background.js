
// Unpacked development only. Store builds always use production signing keys.
const trialDevelopmentConfig = (async () => {
  try {
    if (typeof fetch !== "function" || !chrome.runtime.getManifest ||
        chrome.runtime.getManifest().update_url ||
        ["hnpafnldgablhjgagcfhjjaaalliegef", "pkninbkmgnhgiahpgcifjebbkgmafhoo"].includes(chrome.runtime.id)) return null;
    const response = await fetch(chrome.runtime.getURL ? chrome.runtime.getURL("trial.local.json") : "trial.local.json");
    if (!response.ok) return null;
    const config = await response.json();
    return config.api === "http://127.0.0.1:8789" && config.publicKey?.kty === "EC" ? config : null;
  } catch { return null; }
})();
const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
const TVM_INSTALLATION_ID_KEY = "tvmProInstallationId";
const TVM_TRIAL_KEY = "tvmTrial";
const TRIAL_EXPIRY_ALARM = "tvmTrialExpiry";
const TVM_ENTITLEMENT_KEY = "tvmProEntitlement";
const TVM_LICENSE_PUBLIC_JWK = {
  kty: "EC",
  x: "AZpnxE_j3aaAUwUkzkVbagqa-j7HoVmCbsTLglwGvgs",
  y: "B9jdmU1uF6mSdkPwICYXfov8S5s3WeNQ_Y8susG6d9Y",
  crv: "P-256",
};
const FREE_EQ_INDICES = new Set([0, 1, 3, 5, 7, 8]);
const PRO_PLANS = new Set(["monthly", "yearly", "lifetime"]);
const SLEEP_TIMER_ALARM = "tvmSleepTimer";
const SLEEP_TIMER_KEY = "tvmSleepTimerState";
const SLEEP_FADE_DURATION_MS = 4000;

let creatingOffscreenDocument = null;
const tabTasks = new Map();
const meterSubscribers = new Map();
const latestMeterLevels = new Map();
let entitlementCache = { checkedAt: 0, valid: false, expiresAt: 0, plan: null };

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(values) {
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

function storageRemove(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function installationClaim(installationId) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(installationId));
  return bytesToHex(new Uint8Array(digest));
}

async function verifyStoredEntitlement() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Date.now() - entitlementCache.checkedAt < 30000 &&
      (!entitlementCache.valid || entitlementCache.expiresAt > nowSeconds)) {
    return entitlementCache.valid;
  }
  let valid = false;
  let expiresAt = 0;
  let plan = null;
  try {
    const stored = await storageGet([TVM_INSTALLATION_ID_KEY, TVM_ENTITLEMENT_KEY, TVM_TRIAL_KEY]);
    const installationId = stored[TVM_INSTALLATION_ID_KEY];
    for (const [entitlement, trial] of [[stored[TVM_ENTITLEMENT_KEY], false], [stored[TVM_TRIAL_KEY]?.entitlement, true]]) {
      const parts = entitlement?.token?.split(".") || [];
      if (typeof installationId !== "string" || parts.length !== 3) continue;
      const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
      const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
      if (payload.product !== "tab_volume_manager_pro" || header.alg !== "ES256") continue;
      if (trial ? payload.plan !== "trial" || header.typ !== "EXT-TRIAL" : !PRO_PLANS.has(payload.plan)) continue;
      if (Number.isFinite(payload.exp) && Number.isFinite(entitlement.expiresAt) && payload.exp > nowSeconds && entitlement.expiresAt > nowSeconds &&
          payload.installation === await installationClaim(installationId)) {
        const publicKey = await crypto.subtle.importKey("jwk", (trial && (await trialDevelopmentConfig)?.publicKey) || TVM_LICENSE_PUBLIC_JWK,
          { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
        valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey,
          base64UrlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
        if (valid) {
          expiresAt = Math.min(payload.exp, entitlement.expiresAt);
          plan = payload.plan;
          break;
        }
      }
    }
  } catch (error) {
    valid = false;
  }
  entitlementCache = { checkedAt: Date.now(), valid, expiresAt, plan };
  return valid;
}

function normalizeEqBands(bands) {
  if (Array.isArray(bands) && bands.length === 6) {
    bands = [bands[0], bands[1], 0, bands[2], 0, bands[3], 0, bands[4], bands[5], 0];
  }
  return Array.from({ length: 10 }, (_, index) =>
    Math.max(-15, Math.min(15, Number(bands?.[index]) || 0))
  );
}

async function sanitizeSettings(settings = {}) {
  const proActive = await verifyStoredEntitlement();
  const eqBands = normalizeEqBands(settings.eqBands);
  const maxVolume = proActive ? 1500 : 500;
  return {
    ...settings,
    volume: Math.max(0, Math.min(maxVolume, Number(settings.volume) || 0)),
    eqBands: proActive
      ? eqBands
      : eqBands.map((band, index) => FREE_EQ_INDICES.has(index) ? band : 0),
    pro: proActive ? settings.pro : null,
    proPlan: proActive ? entitlementCache.plan : null,
    proValidUntil: proActive ? entitlementCache.expiresAt : 0,
  };
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.tvmEnabled) {
    void chrome.runtime.sendMessage({ target: "offscreen", type: "TVM_POWER", enabled: changes.tvmEnabled.newValue !== false }).catch(() => {});
  }
  if (changes.tvmEnabled?.newValue === false) {
    void chrome.alarms.clear(SLEEP_TIMER_ALARM);
    void storageRemove(SLEEP_TIMER_KEY);
  }
  if (changes[TVM_ENTITLEMENT_KEY] || changes[TVM_INSTALLATION_ID_KEY] || changes[TVM_TRIAL_KEY]) {
    entitlementCache = { checkedAt: 0, valid: false, expiresAt: 0, plan: null };
    void syncTrialAlarm();
    void refreshAudioAccess();
  }
});

async function syncTrialAlarm() {
  if (await verifyStoredEntitlement() && entitlementCache.plan === "trial") {
    await chrome.alarms.create(TRIAL_EXPIRY_ALARM, { when: entitlementCache.expiresAt * 1000 });
  } else {
    await chrome.alarms.clear(TRIAL_EXPIRY_ALARM);
    if (!await verifyStoredEntitlement()) {
      await chrome.alarms.clear(SLEEP_TIMER_ALARM);
      await storageRemove(SLEEP_TIMER_KEY);
    }
  }
}
chrome.runtime.onStartup.addListener(() => { void syncTrialAlarm(); });
chrome.runtime.onInstalled.addListener(() => { void syncTrialAlarm(); });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === TRIAL_EXPIRY_ALARM) void syncTrialAlarm();
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ZAZ_METER") return;

  let subscribedTabId = null;

  port.onMessage.addListener((message) => {
    if (message?.type !== "ZAZ_METER_SUBSCRIBE" || !Number.isInteger(message.tabId)) return;

    if (subscribedTabId !== null) {
      meterSubscribers.get(subscribedTabId)?.delete(port);
    }

    subscribedTabId = message.tabId;
    if (!meterSubscribers.has(subscribedTabId)) {
      meterSubscribers.set(subscribedTabId, new Set());
    }
    meterSubscribers.get(subscribedTabId).add(port);
  });

  port.onDisconnect.addListener(() => {
    if (subscribedTabId === null) return;
    const subscribers = meterSubscribers.get(subscribedTabId);
    subscribers?.delete(port);
    if (subscribers?.size === 0) meterSubscribers.delete(subscribedTabId);
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ZAZ_GET_EQ_LEVELS" && Number.isInteger(message.tabId)) {
    return false;
  }

  if (message?.type !== "ZAZ_EQ_LEVELS" || message.target !== "background") return false;

  latestMeterLevels.set(message.tabId, message);

  meterSubscribers.get(message.tabId)?.forEach((port) => {
    try {
      port.postMessage(message);
    } catch (error) {
      // The popup may have closed between frames.
    }
  });

  return false;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "ZAZ_GET_EQ_LEVELS" || !Number.isInteger(message.tabId)) return false;
  sendResponse(latestMeterLevels.get(message.tabId) || null);
  return false;
});

async function ensureOffscreenDocument() {
  if (creatingOffscreenDocument) return creatingOffscreenDocument;
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (contexts.length > 0) return;

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ["USER_MEDIA"],
        justification: "Capture and process the current tab audio.",
      })
      .finally(() => {
        creatingOffscreenDocument = null;
      });
  }

  await creatingOffscreenDocument;
}

async function fadeAndPauseTab(tabId, durationMs) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async (fadeDuration) => {
      const manager = window.__zazVolumeManager;
      const powerRevision = manager?.powerRevision;
      if (manager?.contexts && manager?.nodes) {
        manager.contexts.forEach((context) => {
          const gain = manager.nodes.get(context)?.gain?.gain;
          if (!gain) return;
          const now = context.currentTime;
          gain.cancelScheduledValues(now);
          gain.setValueAtTime(gain.value, now);
          gain.linearRampToValueAtTime(0, now + fadeDuration / 1000);
        });
      }
      await new Promise((resolve) => setTimeout(resolve, fadeDuration));
      if (manager?.enabled === false || manager?.powerRevision !== powerRevision) return;
      document.querySelectorAll("video, audio").forEach((media) => media.pause());
    },
    args: [durationMs],
  });
}

async function restoreTabGain(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      const manager = window.__zazVolumeManager;
      if (!manager?.contexts || !manager?.nodes) return;
      manager.contexts.forEach((context) => {
        const gain = manager.nodes.get(context)?.gain?.gain;
        if (!gain) return;
        const now = context.currentTime;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(Number(manager.gain) || 0, now);
      });
    },
  });
}

async function executeSleepTimer(timerState) {
  if ((await storageGet("tvmEnabled")).tvmEnabled === false) return;
  const query = { audible: true };
  if (Number.isInteger(timerState?.windowId)) query.windowId = timerState.windowId;
  const audibleTabs = await chrome.tabs.query(query).catch(() => []);
  const tabIds = Array.from(new Set([
    ...(Array.isArray(timerState?.tabIds) ? timerState.tabIds : []),
    ...audibleTabs.map((tab) => tab.id),
  ].filter(Number.isInteger)));

  const offscreenFade = chrome.runtime.sendMessage({
    type: "ZAZ_OFFSCREEN_FADE",
    target: "offscreen",
    tabIds,
    durationMs: SLEEP_FADE_DURATION_MS,
  }).catch(() => null);
  const pageFades = tabIds.map((tabId) => fadeAndPauseTab(tabId, SLEEP_FADE_DURATION_MS).catch(() => null));
  await Promise.all([offscreenFade, ...pageFades]);
  const currentState = await storageGet(["tvmEnabled", SLEEP_TIMER_KEY]);
  if (currentState.tvmEnabled !== false && currentState[SLEEP_TIMER_KEY]?.endsAt === timerState?.endsAt) {
    await Promise.allSettled(tabIds.map((tabId) => chrome.tabs.update(tabId, { muted: true })));
  }
  await Promise.allSettled([
    chrome.runtime.sendMessage({
      type: "ZAZ_OFFSCREEN_RESTORE",
      target: "offscreen",
      tabIds,
    }),
    ...tabIds.map((tabId) => restoreTabGain(tabId)),
  ]);
  await storageRemove(SLEEP_TIMER_KEY);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SLEEP_TIMER_ALARM) return;
  storageGet(SLEEP_TIMER_KEY)
    .then(async (stored) => {
      if (!await verifyStoredEntitlement()) { await storageRemove(SLEEP_TIMER_KEY); return null; }
      const timerState = stored[SLEEP_TIMER_KEY];
      if (!timerState) return null;
      return executeSleepTimer(timerState);
    })
    .catch(() => storageRemove(SLEEP_TIMER_KEY));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!["ZAZ_SLEEP_TIMER_SET", "ZAZ_SLEEP_TIMER_CANCEL", "ZAZ_SLEEP_TIMER_GET"].includes(message?.type)) {
    return false;
  }

  (async () => {
    if (message.type === "ZAZ_SLEEP_TIMER_GET") {
      const stored = await storageGet(SLEEP_TIMER_KEY);
      const timer = stored[SLEEP_TIMER_KEY];
      const active = Number(timer?.endsAt) > Date.now();
      return { ok: true, active, endsAt: active ? timer.endsAt : 0 };
    }

    if (message.type === "ZAZ_SLEEP_TIMER_CANCEL") {
      await chrome.alarms.clear(SLEEP_TIMER_ALARM);
      await storageRemove(SLEEP_TIMER_KEY);
      return { ok: true };
    }

    if ((await storageGet("tvmEnabled")).tvmEnabled === false) {
      throw new Error("Turn on Tab Volume Manager to start a sleep timer.");
    }
    if (!await verifyStoredEntitlement()) {
      throw new Error("Sleep Timer requires an active Pro license.");
    }
    const durationMinutes = Math.max(1, Math.min(10080, Math.round(Number(message.durationMinutes) || 0)));
    const endsAt = Date.now() + durationMinutes * 60000;
    const timerState = {
      endsAt,
      windowId: Number.isInteger(message.windowId) ? message.windowId : null,
      tabIds: Array.isArray(message.tabIds) ? message.tabIds.filter(Number.isInteger) : [],
    };
    await storageSet({ [SLEEP_TIMER_KEY]: timerState });
    await chrome.alarms.create(SLEEP_TIMER_ALARM, { when: endsAt });
    return { ok: true, endsAt };
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

const tabSettingsKey = tabId => `tvmTabSettings:${tabId}`;

function queueTabTask(tabId, work) {
  const task = (tabTasks.get(tabId) || Promise.resolve()).catch(() => {}).then(work);
  tabTasks.set(tabId, task);
  const cleanup = () => { if (tabTasks.get(tabId) === task) tabTasks.delete(tabId); };
  task.then(cleanup, cleanup);
  return task;
}

async function rememberTabSettings(tabId, settings) {
  const tab = await chrome.tabs.get(tabId);
  if (!/^(https?|file):/.test(tab.url || "")) return;
  await chrome.storage.session.set({ [tabSettingsKey(tabId)]: { origin: new URL(tab.url).origin, settings } });
  return tab;
}

async function savedSettingsForTab(tab) {
  const key = tabSettingsKey(tab.id);
  const saved = (await chrome.storage.session.get(key))[key];
  if (saved?.origin === new URL(tab.url).origin) return saved.settings;
  const hostname = new URL(tab.url).hostname;
  const site = (await storageGet(hostname))[hostname];
  return site ? { ...site, pro: site.proAudio } : null;
}

async function applyPageAudioSettings(tabId, settings) {
  const publish = () => chrome.scripting.executeScript({
    target: { tabId }, world: "MAIN",
    func: (nextSettings) => {
      if (!window.__zazVolumeManager) return false;
      window.postMessage({ ...nextSettings, type: "ZAZ_VOLUME_UPDATE" }, "*");
      return true;
    },
    args: [settings],
  });
  let results = await publish();
  if (!results.some(result => result.result === true)) {
    // Tabs open before an extension reload may not have the audio code yet.
    await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", files: ["stereo.js", "content.js"] });
    results = await publish();
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: ["power-bridge.js"] });
  const enabled = (await storageGet("tvmEnabled")).tvmEnabled !== false;
  await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func: enabled => window.postMessage({ type: "TVM_POWER", enabled }, "*"), args: [enabled] });
  return results.some(result => result.result === true);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "TVM_GET_POWER") {
    storageGet("tvmEnabled").then(stored => sendResponse({ enabled: stored.tvmEnabled !== false }));
    return true;
  }
  if (message?.type !== "TVM_RESTORE_TAB" || !sender.tab?.id) return false;
  const tabId = sender.tab.id;
  queueTabTask(tabId, async () => {
    const tab = await chrome.tabs.get(tabId);
    if (!/^(https?|file):/.test(tab.url || "")) return { ok: false };
    const saved = await savedSettingsForTab(tab);
    if (!saved) return { ok: true };
    const settings = await sanitizeSettings(saved);
    const captured = (await chrome.tabCapture.getCapturedTabs()).some(item => item.tabId === tabId && ["active", "pending"].includes(item.status));
    if (captured) {
      await ensureOffscreenDocument();
      const result = await chrome.runtime.sendMessage({ target: "offscreen", type: "ZAZ_OFFSCREEN_UPDATE", tabId, settings });
      if (result?.ok) {
        await applyPageAudioSettings(tabId, { volume: 100, effectMode: "none", effectAmount: 0, eqBands: Array(10).fill(0), pro: null });
        return result;
      }
    }
    return { ok: await applyPageAudioSettings(tabId, settings) };
  }).then(sendResponse).catch(() => sendResponse({ ok: false, pending: true }));
  return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "ZAZ_CAPTURE_TAB") return false;

  const updateTab = async () => {
    if (!Number.isInteger(message.tabId)) {
      throw new Error("Missing tab id.");
    }

    if ((await storageGet("tvmEnabled")).tvmEnabled === false) return { ok: true, bypassed: true };
    const settings = await sanitizeSettings(message.settings);
    const tab = await rememberTabSettings(message.tabId, settings);
    if (tab?.discarded) return { ok: true, pending: true };
    const preparePage = async () => {
      try {
        if (await applyPageAudioSettings(message.tabId, settings)) return { ok: true, processing: "page" };
      } catch { /* Loading/discarded tabs will restore saved settings when ready. */ }
      return { ok: true, pending: true };
    };
    try {
      if (message.allowPageFallback) {
        const capturedTabs = await chrome.tabCapture.getCapturedTabs();
        const captured = capturedTabs.some(tab => tab.tabId === message.tabId && ["active", "pending"].includes(tab.status));
        if (!captured) {
          return preparePage();
        }
      }
      await ensureOffscreenDocument();

      let response;
      const update = { type: "ZAZ_OFFSCREEN_UPDATE", target: "offscreen", tabId: message.tabId, settings };
      try {
        response = await chrome.runtime.sendMessage(update);
      } catch (error) {
        // An old offscreen document can survive a code reload with no listener.
        await chrome.offscreen.closeDocument().catch(() => {});
        await ensureOffscreenDocument();
        try { response = await chrome.runtime.sendMessage(update); }
        catch (retryError) {
          if (message.allowPageFallback) return preparePage();
          throw retryError;
        }
      }

      if (response?.needsStream) {
        let streamId;
        try {
          streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: message.tabId });
        } catch (error) {
          if (!message.allowPageFallback) throw error;
          return preparePage();
        }

        response = await chrome.runtime.sendMessage({
          type: "ZAZ_OFFSCREEN_UPDATE",
          target: "offscreen",
          tabId: message.tabId,
          streamId,
          settings,
        });
      }

      // A previously prepared page must not apply the same effects twice once captured.
      if (response?.ok) {
        await applyPageAudioSettings(message.tabId, {
          volume: 100, effectMode: "none", effectAmount: 0,
          eqBands: Array(10).fill(0), pro: null, proValidUntil: 0,
        }).catch(() => {});
      }
      if (!response?.ok && message.allowPageFallback) return preparePage();
      return response || { ok: false, error: "Audio processing is not ready." };
    } catch (error) {
      if (message.allowPageFallback) return preparePage();
      throw error;
    }
  };

  queueTabTask(message.tabId, updateTab)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabTasks.delete(tabId);
  void chrome.storage.session.remove(tabSettingsKey(tabId));
  meterSubscribers.delete(tabId);
  latestMeterLevels.delete(tabId);
  chrome.runtime.sendMessage({
    type: "ZAZ_OFFSCREEN_STOP",
    target: "offscreen",
    tabId,
  }).catch(() => {});
});

// Revoke all running processing immediately, while preserving saved presets/settings.
async function refreshAudioAccess() {
  if (await verifyStoredEntitlement()) return;
  await chrome.runtime.sendMessage({ target: "offscreen", type: "TVM_REVOKE_PRO" }).catch(() => {});
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(tabs.filter(tab => tab.id).map(tab => chrome.scripting.executeScript({
    target: { tabId: tab.id }, world: "MAIN",
    func: () => window.postMessage({ type: "TVM_REVOKE_PRO" }, "*")
  })));
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "TVM_REFRESH_ACCESS") return false;
  entitlementCache.checkedAt = 0;
  refreshAudioAccess().then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
  return true;
});

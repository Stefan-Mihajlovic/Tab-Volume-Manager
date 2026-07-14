const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
const TVM_INSTALLATION_ID_KEY = "tvmProInstallationId";
const TVM_ENTITLEMENT_KEY = "tvmProEntitlement";
const TVM_LICENSE_PUBLIC_JWK = {
  kty: "EC",
  x: "AZpnxE_j3aaAUwUkzkVbagqa-j7HoVmCbsTLglwGvgs",
  y: "B9jdmU1uF6mSdkPwICYXfov8S5s3WeNQ_Y8susG6d9Y",
  crv: "P-256",
};
const FREE_EQ_INDICES = new Set([0, 1, 3, 5, 7, 8]);
const PRO_PLANS = new Set(["monthly", "yearly", "lifetime"]);

let creatingOffscreenDocument = null;
const tabTasks = new Map();
const meterSubscribers = new Map();
const latestMeterLevels = new Map();
let entitlementCache = { checkedAt: 0, valid: false, expiresAt: 0, plan: null };

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
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
    const stored = await storageGet([TVM_INSTALLATION_ID_KEY, TVM_ENTITLEMENT_KEY]);
    const installationId = stored[TVM_INSTALLATION_ID_KEY];
    const entitlement = stored[TVM_ENTITLEMENT_KEY];
    const parts = entitlement?.token?.split(".") || [];
    if (typeof installationId === "string" && parts.length === 3) {
      const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp > now && entitlement.expiresAt > now && PRO_PLANS.has(payload.plan) &&
          payload.installation === await installationClaim(installationId)) {
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          TVM_LICENSE_PUBLIC_JWK,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["verify"]
        );
        valid = await crypto.subtle.verify(
          { name: "ECDSA", hash: "SHA-256" },
          publicKey,
          base64UrlToBytes(parts[2]),
          new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
        );
        if (valid) {
          expiresAt = Math.min(payload.exp, entitlement.expiresAt);
          plan = payload.plan;
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
  const maxVolume = proActive && entitlementCache.plan === "lifetime" ? 1500 : 500;
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
  if (changes[TVM_ENTITLEMENT_KEY] || changes[TVM_INSTALLATION_ID_KEY]) {
    entitlementCache = { checkedAt: 0, valid: false, expiresAt: 0, plan: null };
  }
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "ZAZ_CAPTURE_TAB") return false;

  const updateTab = async () => {
    if (!Number.isInteger(message.tabId)) {
      throw new Error("Missing tab id.");
    }

    await ensureOffscreenDocument();
    const settings = await sanitizeSettings(message.settings);

    let response = await chrome.runtime.sendMessage({
      type: "ZAZ_OFFSCREEN_UPDATE",
      target: "offscreen",
      tabId: message.tabId,
      settings,
    });

    if (response?.needsStream) {
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: message.tabId,
      });

      response = await chrome.runtime.sendMessage({
        type: "ZAZ_OFFSCREEN_UPDATE",
        target: "offscreen",
        tabId: message.tabId,
        streamId,
        settings,
      });
    }

    return response || { ok: true };
  };

  const previousTask = tabTasks.get(message.tabId) || Promise.resolve();
  const task = previousTask.catch(() => {}).then(updateTab);
  tabTasks.set(message.tabId, task);

  task
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }))
    .finally(() => {
      if (tabTasks.get(message.tabId) === task) tabTasks.delete(message.tabId);
    });

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabTasks.delete(tabId);
  meterSubscribers.delete(tabId);
  latestMeterLevels.delete(tabId);
  chrome.runtime.sendMessage({
    type: "ZAZ_OFFSCREEN_STOP",
    target: "offscreen",
    tabId,
  }).catch(() => {});
});

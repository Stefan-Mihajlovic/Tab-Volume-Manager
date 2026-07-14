const themeToggle = document.getElementById("themeToggle");
const slider = document.getElementById("volumeSlider");
const effectSlider = document.getElementById("effectSlider");
const bassBoostBtn = document.getElementById("bassBoost");
const voiceBoostBtn = document.getElementById("voiceBoost");
const effectsOffBtn = document.getElementById("effectsOff");
const muteVolumeBtn = document.getElementById("muteVolume");
const resetVolumeBtn = document.getElementById("resetVolume");
const resetEqualizerBtn = document.getElementById("resetEqualizer");
const siteFavicon = document.getElementById("siteFavicon");
const siteName = document.getElementById("siteName");
const volumePC = document.querySelector("#volumePC input");
const volumeBlock = document.querySelector(".volumeBlock");
const volumeDangerWarning = document.getElementById("volumeDangerWarning");
const effectIntensityPC = document.querySelector("#effectIntensityPC input");
const eqSliders = Array.from(document.querySelectorAll(".eqSlider"));
const eqLevelMeters = Array.from(document.querySelectorAll(".eqLevelMeter"));
const tabButtons = Array.from(document.querySelectorAll(".tabButton"));
const tabPanels = Array.from(document.querySelectorAll(".tabPanel"));
const presetStatus = document.getElementById("presetStatus");
const savePresetButton = document.getElementById("savePresetButton");
const loadPresetButton = document.getElementById("loadPresetButton");
const savePresetModal = document.getElementById("savePresetModal");
const loadPresetModal = document.getElementById("loadPresetModal");
const transferLicenseModal = document.getElementById("transferLicenseModal");
const presetNameInput = document.getElementById("presetNameInput");
const presetNameError = document.getElementById("presetNameError");
const confirmSavePreset = document.getElementById("confirmSavePreset");
const savePresetDescription = document.getElementById("savePresetDescription");
const presetSlots = document.getElementById("presetSlots");
const proStatusBadge = document.getElementById("proStatusBadge");
const headerProBadge = document.getElementById("headerProBadge");
const proMarketingContent = document.getElementById("proMarketingContent");
const proToolsContent = document.getElementById("proToolsContent");
const proActivationState = document.getElementById("proActivationState");
const proActiveState = document.getElementById("proActiveState");
const proLicenseKeyInput = document.getElementById("proLicenseKeyInput");
const proLicenseMessage = document.getElementById("proLicenseMessage");
const proLicenseSummary = document.getElementById("proLicenseSummary");
const activateProButton = document.getElementById("activateProButton");
const getProButton = document.getElementById("getProButton");
const manageProButton = document.getElementById("manageProButton");
const transferProButton = document.getElementById("transferProButton");
const transferLicenseKey = document.getElementById("transferLicenseKey");
const transferLicenseMessage = document.getElementById("transferLicenseMessage");
const copyTransferLicenseButton = document.getElementById("copyTransferLicenseButton");
const confirmTransferButton = document.getElementById("confirmTransferButton");
const smartLimiterToggle = document.getElementById("smartLimiterToggle");
const smartLimiterStrength = document.getElementById("smartLimiterStrength");
const smartLimiterValue = document.getElementById("smartLimiterValue");
const adaptiveVolumeToggle = document.getElementById("adaptiveVolumeToggle");
const adaptiveVolumeStrength = document.getElementById("adaptiveVolumeStrength");
const adaptiveVolumeValue = document.getElementById("adaptiveVolumeValue");
const movieDialogueToggle = document.getElementById("movieDialogueToggle");
const movieDialogueStrength = document.getElementById("movieDialogueStrength");
const movieDialogueValue = document.getElementById("movieDialogueValue");
const refreshMixerButton = document.getElementById("refreshMixerButton");
const mixerTabList = document.getElementById("mixerTabList");
const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const FREE_EQ_INDICES = new Set([0, 1, 3, 5, 7, 8]);
const EQ_DEFAULTS = EQ_FREQUENCIES.map(() => 0);
const ACTIVE_TAB_KEY = "activeControlTab";
const SAVED_EQ_PRESET_KEY = "savedEqPreset";
const SAVED_EQ_PRESETS_KEY = "savedEqPresets";
const PRO_AUDIO_SETTINGS_KEY = "tvmProAudioSettings";
const PRO_MIXER_VOLUMES_KEY = "tvmProMixerVolumes";
const TVM_LICENSE_KEY = "tvmProLicenseKey";
const TVM_INSTALLATION_ID_KEY = "tvmProInstallationId";
const TVM_ENTITLEMENT_KEY = "tvmProEntitlement";
const TVM_LICENSE_META_KEY = "tvmProLicenseMeta";
const PRO_PLANS = new Set(["monthly", "yearly", "lifetime"]);
const STANDARD_MAX_VOLUME = 500;
const LIFETIME_MAX_VOLUME = 1500;
const EXTREME_VOLUME_THRESHOLD = 1000;
const TVM_API_URL = "https://tvm-licensing-api-prod.optiflowzoffice.workers.dev";
const TVM_PRO_URL = "https://stefanmihajlovic.com/tab-volume-manager/#pro";
const TVM_LICENSE_PUBLIC_JWK = {
  kty: "EC",
  x: "AZpnxE_j3aaAUwUkzkVbagqa-j7HoVmCbsTLglwGvgs",
  y: "B9jdmU1uF6mSdkPwICYXfov8S5s3WeNQ_Y8susG6d9Y",
  crv: "P-256",
};
const meterPort = chrome.runtime.connect({ name: "ZAZ_METER" });

let activeHostname = null;
let activeTabId = null;
let effectMode = "none";
let effectAmount = 10;
let eqBands = [...EQ_DEFAULTS];
let savedEqPresets = [];
let loadedPresetName = null;
let lastMeterUpdateAt = 0;
let isProActive = false;
let proPlan = null;
let proValidUntil = 0;
let volumeBeforeMute = 100;
let proAudioSettings = {
  smartLimiter: { enabled: false, strength: 70 },
  adaptiveVolume: { enabled: false, strength: 50 },
  movieDialogue: { enabled: false, strength: 60 },
};
let mixerVolumes = {};

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(values) {
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

function storageRemove(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

function normalizeProPlan(plan) {
  return PRO_PLANS.has(plan) ? plan : null;
}

function getPresetLimit() {
  if (!isProActive) return 1;
  return proPlan === "lifetime" ? Infinity : 4;
}

function getMaxVolume() {
  return isProActive && proPlan === "lifetime"
    ? LIFETIME_MAX_VOLUME
    : STANDARD_MAX_VOLUME;
}

function interpolateRgba(from, to, progress) {
  const values = from.map((value, index) => value + (to[index] - value) * progress);
  return `rgba(${Math.round(values[0])}, ${Math.round(values[1])}, ${Math.round(values[2])}, ${values[3].toFixed(3)})`;
}

function updateVolumeDangerState(value = slider.value) {
  const dangerProgress = getMaxVolume() === LIFETIME_MAX_VOLUME
    ? Math.max(0, Math.min(1, (Number(value) - EXTREME_VOLUME_THRESHOLD) /
      (LIFETIME_MAX_VOLUME - EXTREME_VOLUME_THRESHOLD)))
    : 0;
  const isExtreme = dangerProgress > 0;
  slider.style.setProperty(
    "--volumeTrackStart",
    interpolateRgba([74, 107, 255, 1], [255, 129, 95, 1], dangerProgress)
  );
  slider.style.setProperty(
    "--volumeTrackEnd",
    interpolateRgba([74, 107, 255, 0.24], [255, 48, 79, 1], dangerProgress)
  );
  slider.style.setProperty(
    "--volumeSliderThumb",
    interpolateRgba([74, 107, 255, 1], [255, 64, 88, 1], dangerProgress)
  );
  slider.style.setProperty(
    "--volumeSliderShadow",
    interpolateRgba([74, 107, 255, 0.4], [255, 48, 79, 0.48], dangerProgress)
  );
  volumeBlock.classList.toggle("volumeDanger", isExtreme);
  volumeDangerWarning.classList.toggle("hidden", !isExtreme);
}

function syncMuteButton(value = slider.value) {
  const numericValue = Number(value) || 0;
  if (numericValue > 0) volumeBeforeMute = numericValue;
  const muted = numericValue === 0;
  muteVolumeBtn.textContent = muted ? "Unmute" : "Mute";
  muteVolumeBtn.setAttribute("aria-pressed", String(muted));
  muteVolumeBtn.classList.toggle("muted", muted);
}

function syncVolumeTierUi() {
  const maxVolume = getMaxVolume();
  slider.max = String(maxVolume);
  volumePC.max = String(maxVolume);
  const clampedValue = Math.max(0, Math.min(maxVolume, Number(slider.value) || 0));
  slider.value = String(clampedValue);
  updateVolumeProc();
}

function normalizeEqBands(bands) {
  if (!Array.isArray(bands)) return [...EQ_DEFAULTS];
  if (bands.length === 6) {
    return [bands[0], bands[1], 0, bands[2], 0, bands[3], 0, bands[4], bands[5], 0]
      .map((band) => Math.max(-15, Math.min(15, Number(band) || 0)));
  }
  return EQ_DEFAULTS.map((_, index) =>
    Math.max(-15, Math.min(15, Number(bands[index]) || 0))
  );
}

function getEffectiveEqBands(bands = eqBands) {
  const normalized = normalizeEqBands(bands);
  if (isProActive) return normalized;
  return normalized.map((band, index) => FREE_EQ_INDICES.has(index) ? band : 0);
}

function normalizeProTool(tool, defaults) {
  const strength = Number(tool?.strength);
  return {
    enabled: Boolean(tool?.enabled),
    strength: Number.isFinite(strength)
      ? Math.max(0, Math.min(100, strength))
      : defaults.strength,
  };
}

function normalizeProAudioSettings(settings) {
  return {
    smartLimiter: normalizeProTool(settings?.smartLimiter, { strength: 70 }),
    adaptiveVolume: normalizeProTool(settings?.adaptiveVolume, { strength: 50 }),
    movieDialogue: normalizeProTool(settings?.movieDialogue, { strength: 60 }),
  };
}

function getEffectiveProSettings() {
  if (!isProActive) {
    return {
      smartLimiter: { enabled: false, strength: 0 },
      adaptiveVolume: { enabled: false, strength: 0 },
      movieDialogue: { enabled: false, strength: 0 },
    };
  }
  return normalizeProAudioSettings(proAudioSettings);
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function installationClaim(installationId) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(installationId));
  return bytesToHex(new Uint8Array(digest));
}

async function verifyEntitlement(entitlement, installationId) {
  if (!entitlement?.token || typeof entitlement.expiresAt !== "number") return null;
  const parts = entitlement.token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
    const expectedInstallation = await installationClaim(installationId);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now || entitlement.expiresAt <= now) return null;
    if (payload.installation !== expectedInstallation) return null;
    if (!normalizeProPlan(payload.plan)) return null;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      TVM_LICENSE_PUBLIC_JWK,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    return valid ? payload : null;
  } catch (error) {
    return null;
  }
}

async function postLicenseApi(path, body) {
  const response = await fetch(`${TVM_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || "Could not contact the license server.");
    error.code = data.error?.code || "request_failed";
    error.status = response.status;
    throw error;
  }
  return data;
}

async function ensureInstallationId() {
  const stored = await storageGet(TVM_INSTALLATION_ID_KEY);
  if (typeof stored[TVM_INSTALLATION_ID_KEY] === "string" &&
      stored[TVM_INSTALLATION_ID_KEY].length >= 16) {
    return stored[TVM_INSTALLATION_ID_KEY];
  }
  const installationId = crypto.randomUUID();
  await storageSet({ [TVM_INSTALLATION_ID_KEY]: installationId });
  return installationId;
}

function setProMessage(message = "", success = false) {
  proLicenseMessage.textContent = message;
  proLicenseMessage.classList.toggle("success", success);
}

function applyProAccessState(active) {
  isProActive = Boolean(active);
  document.body.classList.toggle("proActive", isProActive);
  document.body.classList.toggle("lifetimeLicense", isProActive && proPlan === "lifetime");
  headerProBadge.classList.toggle("hidden", !isProActive);
  proMarketingContent.classList.toggle("hidden", isProActive);
  proToolsContent.classList.toggle("hidden", !isProActive);
  manageProButton.classList.toggle("hidden", isProActive && proPlan === "lifetime");
  syncVolumeTierUi();
  eqBands = normalizeEqBands(eqBands);
  syncEqualizerUI();
  updateSavedPresetSlots();
  savePresetDescription.textContent = !isProActive
    ? "Save the current six-band equalizer settings. Free includes one preset."
    : proPlan === "lifetime"
      ? "Save the current 10-band equalizer settings. Lifetime includes unlimited presets."
      : "Save the current 10-band equalizer settings. Monthly and Yearly include up to four presets.";

  if (isProActive) refreshMixerTabs();
  if (Number.isInteger(activeTabId)) updateAudio(slider.value);
}

function setProUiActive(license, verifiedPlan, offline = false, expiresAt = 0) {
  proPlan = normalizeProPlan(verifiedPlan);
  proValidUntil = Number(expiresAt) || 0;
  proActivationState.classList.add("hidden");
  proActiveState.classList.remove("hidden");
  proStatusBadge.textContent = "✦ Pro active";
  const planName = proPlan
    ? `${proPlan.charAt(0).toUpperCase()}${proPlan.slice(1)}`
    : "Pro";
  const suffix = license?.lastFour ? ` •••• ${license.lastFour}` : "";
  proLicenseSummary.textContent = `${planName} license${suffix} is active on this installation.`;
  setProMessage(offline ? "Offline verification active. We will sync again when online." : "License verified.", true);
  applyProAccessState(true);
}

function setProUiInactive(message = "") {
  proPlan = null;
  proValidUntil = 0;
  proActiveState.classList.add("hidden");
  proActivationState.classList.remove("hidden");
  proStatusBadge.textContent = "✦ Pro access";
  setProMessage(message);
  applyProAccessState(false);
}

function setProButtonsDisabled(disabled) {
  [activateProButton, getProButton, manageProButton, transferProButton]
    .forEach((button) => { button.disabled = disabled; });
}

async function storeProAccess(licenseKey, result) {
  await storageSet({
    [TVM_LICENSE_KEY]: licenseKey,
    [TVM_ENTITLEMENT_KEY]: result.entitlement,
    [TVM_LICENSE_META_KEY]: result.license,
  });
}

async function activateProLicense() {
  const licenseKey = proLicenseKeyInput.value.trim().toUpperCase();
  if (!/^TVM(?:-[A-Z0-9]{5}){5}$/.test(licenseKey)) {
    setProMessage("Enter a valid TVM license key.");
    proLicenseKeyInput.focus();
    return;
  }

  setProButtonsDisabled(true);
  setProMessage("Activating this installation…");
  try {
    const installationId = await ensureInstallationId();
    const result = await postLicenseApi("/v1/license/activate", {
      licenseKey,
      installationId,
      extensionVersion: chrome.runtime.getManifest().version,
    });
    const entitlementPayload = await verifyEntitlement(result.entitlement, installationId);
    if (!entitlementPayload) {
      throw new Error("The license server returned an invalid entitlement.");
    }
    await storeProAccess(licenseKey, result);
    setProUiActive(result.license, entitlementPayload.plan, false, result.entitlement.expiresAt);
  } catch (error) {
    const messages = {
      license_not_found: "That license key could not be found.",
      license_inactive: "This license is not currently active.",
      activation_limit_reached: "This license is already active on three installations.",
    };
    setProMessage(messages[error.code] || error.message);
  } finally {
    setProButtonsDisabled(false);
  }
}

async function validateStoredProLicense() {
  const stored = await storageGet([
    TVM_LICENSE_KEY,
    TVM_INSTALLATION_ID_KEY,
    TVM_ENTITLEMENT_KEY,
    TVM_LICENSE_META_KEY,
  ]);
  const licenseKey = stored[TVM_LICENSE_KEY];
  if (typeof licenseKey !== "string") {
    setProUiInactive();
    document.body.classList.remove("licensePending");
    return false;
  }

  proLicenseKeyInput.value = licenseKey;
  const installationId = await ensureInstallationId();
  const cachedPayload = await verifyEntitlement(stored[TVM_ENTITLEMENT_KEY], installationId);
  if (cachedPayload) {
    setProUiActive(
      stored[TVM_LICENSE_META_KEY],
      cachedPayload.plan,
      true,
      stored[TVM_ENTITLEMENT_KEY]?.expiresAt
    );
  } else {
    setProUiInactive("Checking your saved license…");
  }
  document.body.classList.remove("licensePending");

  const validateRemotely = async () => {
    try {
      const result = await postLicenseApi("/v1/license/validate", {
        licenseKey,
        installationId,
        extensionVersion: chrome.runtime.getManifest().version,
      });
      const entitlementPayload = await verifyEntitlement(result.entitlement, installationId);
      if (!entitlementPayload) {
        throw new Error("The license server returned an invalid entitlement.");
      }
      await storeProAccess(licenseKey, result);
      setProUiActive(result.license, entitlementPayload.plan, false, result.entitlement.expiresAt);
      return true;
    } catch (error) {
      if ((!error.status || error.status >= 500) && cachedPayload) {
        setProUiActive(
          stored[TVM_LICENSE_META_KEY],
          cachedPayload.plan,
          true,
          stored[TVM_ENTITLEMENT_KEY]?.expiresAt
        );
        return true;
      }
      await storageRemove([TVM_LICENSE_KEY, TVM_ENTITLEMENT_KEY, TVM_LICENSE_META_KEY]);
      const message = error.code === "license_inactive"
        ? "Your Pro license is no longer active."
        : error.code === "installation_not_activated"
          ? "This installation needs to be activated again."
          : "Could not verify the saved license.";
      setProUiInactive(message);
      return false;
    }
  };

  if (cachedPayload) {
    void validateRemotely();
    return true;
  }
  return validateRemotely();
}

async function manageProBilling() {
  setProButtonsDisabled(true);
  setProMessage("Opening secure Stripe billing…");
  try {
    const stored = await storageGet(TVM_LICENSE_KEY);
    const result = await postLicenseApi("/v1/billing/portal", {
      licenseKey: stored[TVM_LICENSE_KEY],
    });
    await chrome.tabs.create({ url: result.url });
  } catch (error) {
    setProMessage(error.message);
  } finally {
    setProButtonsDisabled(false);
  }
}

async function openLicenseTransfer() {
  const stored = await storageGet(TVM_LICENSE_KEY);
  const licenseKey = stored[TVM_LICENSE_KEY];
  if (!licenseKey) {
    setProMessage("The saved license key could not be found.");
    return;
  }

  transferLicenseKey.textContent = licenseKey;
  transferLicenseMessage.textContent = "";
  transferLicenseMessage.classList.add("hidden");
  copyTransferLicenseButton.textContent = "Copy";
  openModal(transferLicenseModal);
}

async function copyTransferLicense() {
  try {
    await navigator.clipboard.writeText(transferLicenseKey.textContent);
    copyTransferLicenseButton.textContent = "Copied";
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(transferLicenseKey);
    selection.removeAllRanges();
    selection.addRange(range);
    copyTransferLicenseButton.textContent = "Selected";
  }
}

async function confirmLicenseTransfer() {
  setProButtonsDisabled(true);
  confirmTransferButton.disabled = true;
  confirmTransferButton.textContent = "Transferring…";
  transferLicenseMessage.classList.add("hidden");

  try {
    const stored = await storageGet([TVM_LICENSE_KEY, TVM_INSTALLATION_ID_KEY]);
    await postLicenseApi("/v1/license/deactivate", {
      licenseKey: stored[TVM_LICENSE_KEY],
      installationId: stored[TVM_INSTALLATION_ID_KEY],
    });
    await storageRemove([TVM_LICENSE_KEY, TVM_ENTITLEMENT_KEY, TVM_LICENSE_META_KEY]);
    proLicenseKeyInput.value = "";
    closeModal(transferLicenseModal);
    setProUiInactive("Transfer ready. Activate the copied key on your other device.");
    setProMessage("This activation slot is now free for your other device.", true);
  } catch (error) {
    transferLicenseMessage.textContent = error.message;
    transferLicenseMessage.classList.remove("hidden");
  } finally {
    setProButtonsDisabled(false);
    confirmTransferButton.disabled = false;
    confirmTransferButton.textContent = "Confirm transfer";
  }
}

function setupProLicensing() {
  proLicenseKeyInput.addEventListener("input", () => {
    proLicenseKeyInput.value = proLicenseKeyInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setProMessage();
  });
  proLicenseKeyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") activateProLicense();
  });
  activateProButton.addEventListener("click", activateProLicense);
  getProButton.addEventListener("click", () => chrome.tabs.create({ url: TVM_PRO_URL }));
  manageProButton.addEventListener("click", manageProBilling);
  transferProButton.addEventListener("click", openLicenseTransfer);
  copyTransferLicenseButton.addEventListener("click", copyTransferLicense);
  confirmTransferButton.addEventListener("click", confirmLicenseTransfer);
}

function applyTheme(theme) {
  const isLight = theme === "light";

  document.body.classList.toggle("lightTheme", isLight);

  document.documentElement.style.setProperty("--bodyBackground", isLight ? "#f4f6fb" : "#10131a");
  document.documentElement.style.setProperty("--panelBackground", isLight ? "#ffffff" : "#181d27");
  document.documentElement.style.setProperty("--panelSecondary", isLight ? "#eef2ff" : "#111723");
  document.documentElement.style.setProperty("--textColor", isLight ? "#131722" : "#f5f7ff");
  document.documentElement.style.setProperty("--mutedText", isLight ? "#5f6b85" : "#9ba6c4");
  document.documentElement.style.setProperty("--accentColor", "#4a6bff");
  document.documentElement.style.setProperty("--accentDarker", "#3450d4");
  document.documentElement.style.setProperty("--buttonColor", isLight ? "#e8ecf7" : "#20283a");
  document.documentElement.style.setProperty("--buttonDarker", isLight ? "#d9e0f0" : "#273146");
  document.documentElement.style.setProperty("--borderColor", isLight ? "rgba(73, 96, 162, 0.14)" : "rgba(155, 175, 255, 0.12)");
  document.documentElement.style.setProperty("--shadowColor", isLight ? "rgba(44, 63, 138, 0.12)" : "rgba(0, 0, 0, 0.35)");
  document.documentElement.style.setProperty("--orbGlow", isLight ? "rgba(74, 107, 255, 0.28)" : "rgba(123, 149, 255, 0.56)");
  document.documentElement.style.setProperty("--orbRingOuter", isLight ? "rgba(74, 107, 255, 0.16)" : "rgba(168, 185, 255, 0.24)");
  document.documentElement.style.setProperty("--orbRingInner", isLight ? "rgba(74, 107, 255, 0.22)" : "rgba(220, 228, 255, 0.34)");
  document.documentElement.style.setProperty("--orbCoreShadow", isLight ? "rgba(74, 107, 255, 0.12)" : "rgba(111, 138, 255, 0.6)");
  document.documentElement.style.setProperty("--orbHalo", isLight ? "rgba(74, 107, 255, 0)" : "rgba(122, 146, 255, 0.06)");
  document.documentElement.style.setProperty("--arrowWrapBg", isLight ? "rgba(74, 107, 255, 0.1)" : "rgba(255, 255, 255, 0.08)");
  document.documentElement.style.setProperty("--arrowWrapBorder", isLight ? "rgba(74, 107, 255, 0.18)" : "rgba(255, 255, 255, 0.05)");
  document.documentElement.style.setProperty("--arrowWrapBgOpen", isLight ? "rgba(74, 107, 255, 0.16)" : "rgba(255, 255, 255, 0.14)");
  document.documentElement.style.setProperty("--arrowStroke", isLight ? "#3450d4" : "#dbe3ff");
  themeToggle.checked = isLight;
}

function setActiveTab(tabName, save = true) {
  const validTab = tabButtons.some((button) => button.dataset.tab === tabName)
    ? tabName
    : "volume";

  tabButtons.forEach((button) => {
    const active = button.dataset.tab === validTab;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== validTab);
  });

  if (save) chrome.storage.local.set({ [ACTIVE_TAB_KEY]: validTab });
}

function setupTabs() {
  tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab);

      if (button.dataset.tab === "pro") {
        button.classList.remove("proTabActivated");
        void button.offsetWidth;
        button.classList.add("proTabActivated");
      }
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabButtons.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabButtons.length - 1;

      tabButtons[nextIndex].focus();
      setActiveTab(tabButtons[nextIndex].dataset.tab);
    });
  });

  chrome.storage.local.get(ACTIVE_TAB_KEY, (result) => {
    setActiveTab(result[ACTIVE_TAB_KEY] || "volume", false);
  });
}

function updatePresetStatus() {
  presetStatus.textContent = loadedPresetName
    ? `Preset "${loadedPresetName}"`
    : "No preset loaded";
}

function applyMeterLevels(message) {
  if (message?.type !== "ZAZ_EQ_LEVELS" || message.tabId !== activeTabId) return;
  if (!Array.isArray(message.levels) || message.levels.length !== eqLevelMeters.length) return;

  lastMeterUpdateAt = Date.now();
  eqLevelMeters.forEach((meter, index) => {
    const level = Math.max(0, Math.min(100, Number(message.levels[index]) || 0));
    meter.style.setProperty("--level", `${level}%`);
  });
}

function clearLoadedPreset() {
  loadedPresetName = null;
  updatePresetStatus();
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function openModal(modal) {
  modal.classList.remove("hidden");
}

function presetBandLabel() {
  return isProActive ? "10-band EQ" : "6-band EQ";
}

function createPresetSlot(preset, sourceIndex, displayIndex) {
  const row = document.createElement("div");
  row.className = "presetSlotRow";

  const loadButton = document.createElement("button");
  loadButton.className = "presetSlot";
  loadButton.type = "button";
  loadButton.innerHTML = `
    <span class="presetSlotNumber">${displayIndex + 1}</span>
    <span class="presetSlotCopy"><strong></strong><small>${presetBandLabel()} • Click to load</small></span>
    <span class="presetSlotAction">Load</span>`;
  loadButton.querySelector("strong").textContent = preset.name;
  loadButton.addEventListener("click", () => {
    eqBands = normalizeEqBands(preset.eqBands);
    loadedPresetName = preset.name;
    syncEqualizerUI();
    updatePresetStatus();
    updateAudio(slider.value);
    savePreset(slider.value, effectMode, effectAmount);
    closeModal(loadPresetModal);
  });
  row.appendChild(loadButton);

  const deleteButton = document.createElement("button");
  deleteButton.className = "presetDelete";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete preset ${preset.name}`);
  deleteButton.textContent = "×";
  deleteButton.addEventListener("click", async () => {
    savedEqPresets.splice(sourceIndex, 1);
    if (loadedPresetName === preset.name) clearLoadedPreset();
    await storageSet({ [SAVED_EQ_PRESETS_KEY]: savedEqPresets });
    updateSavedPresetSlots();
  });
  row.appendChild(deleteButton);
  return row;
}

function updateSavedPresetSlots() {
  if (!presetSlots) return;
  presetSlots.replaceChildren();
  const presetLimit = getPresetLimit();
  const visiblePresets = savedEqPresets
    .map((preset, sourceIndex) => ({ preset, sourceIndex }))
    .filter(({ preset }) => isProActive || !preset.proOnly)
    .slice(0, Number.isFinite(presetLimit) ? presetLimit : undefined);
  visiblePresets.forEach(({ preset, sourceIndex }, displayIndex) =>
    presetSlots.appendChild(createPresetSlot(preset, sourceIndex, displayIndex))
  );

  if (visiblePresets.length === 0) {
    const empty = document.createElement("div");
    empty.className = "presetSlot emptyPresetSlot";
    empty.innerHTML = `<span class="presetSlotNumber">1</span><span class="presetSlotCopy"><strong>Empty preset slot</strong><small>Save an EQ preset first</small></span>`;
    presetSlots.appendChild(empty);
  }

  const shouldShowUpgradeSlot = !isProActive ||
    (proPlan !== "lifetime" && savedEqPresets.length >= presetLimit);
  if (shouldShowUpgradeSlot) {
    const locked = document.createElement("div");
    locked.className = "presetSlot lockedPresetSlot";
    locked.setAttribute("aria-disabled", "true");
    locked.innerHTML = `<span class="presetSlotNumber">∞</span><span class="presetSlotCopy"><strong>${isProActive ? "Unlimited presets" : "More preset slots"}</strong><small>${isProActive ? "Available with Lifetime" : "4 with Pro, unlimited with Lifetime"}</small></span><span class="presetSlotLock" aria-hidden="true">🔒</span>`;
    presetSlots.appendChild(locked);
  }
}

async function loadSavedPresets() {
  const result = await storageGet([SAVED_EQ_PRESETS_KEY, SAVED_EQ_PRESET_KEY]);
  const savedList = Array.isArray(result[SAVED_EQ_PRESETS_KEY])
    ? result[SAVED_EQ_PRESETS_KEY]
    : result[SAVED_EQ_PRESET_KEY]
      ? [result[SAVED_EQ_PRESET_KEY]]
      : [];
  savedEqPresets = savedList
    .filter((preset) => preset && typeof preset.name === "string" && Array.isArray(preset.eqBands))
    .map((preset, index) => ({
      name: preset.name.slice(0, 32),
      eqBands: normalizeEqBands(preset.eqBands),
      proOnly: Boolean(preset.proOnly || index > 0),
    }));
  await storageSet({ [SAVED_EQ_PRESETS_KEY]: savedEqPresets });
  updateSavedPresetSlots();
}

function setupPresetControls() {
  savePresetButton.addEventListener("click", () => {
    presetNameInput.value = loadedPresetName || (!isProActive && savedEqPresets[0]?.name) || "";
    presetNameError.textContent = "Enter a preset name.";
    presetNameError.classList.add("hidden");
    openModal(savePresetModal);
    requestAnimationFrame(() => {
      presetNameInput.focus();
      presetNameInput.select();
    });
  });

  loadPresetButton.addEventListener("click", () => {
    updateSavedPresetSlots();
    openModal(loadPresetModal);
  });

  confirmSavePreset.addEventListener("click", async () => {
    const name = presetNameInput.value.trim();
    if (!name) {
      presetNameError.classList.remove("hidden");
      presetNameInput.focus();
      return;
    }

    const nextPreset = { name, eqBands: getEffectiveEqBands(), proOnly: false };
    if (isProActive) {
      const existingIndex = savedEqPresets.findIndex((preset) => preset.name.toLowerCase() === name.toLowerCase());
      if (existingIndex >= 0) {
        nextPreset.proOnly = savedEqPresets[existingIndex].proOnly;
        savedEqPresets[existingIndex] = nextPreset;
      } else {
        const presetLimit = getPresetLimit();
        if (savedEqPresets.length >= presetLimit) {
          presetNameError.textContent = "Monthly and Yearly support up to 4 presets. Lifetime includes unlimited presets.";
          presetNameError.classList.remove("hidden");
          return;
        }
        nextPreset.proOnly = savedEqPresets.some((preset) => !preset.proOnly);
        savedEqPresets.push(nextPreset);
      }
    } else {
      const freeIndex = savedEqPresets.findIndex((preset) => !preset.proOnly);
      if (freeIndex >= 0) savedEqPresets[freeIndex] = nextPreset;
      else savedEqPresets.unshift(nextPreset);
    }
    loadedPresetName = name;
    updatePresetStatus();
    updateSavedPresetSlots();
    savePreset(slider.value, effectMode, effectAmount);
    await storageSet({ [SAVED_EQ_PRESETS_KEY]: savedEqPresets });
    closeModal(savePresetModal);
  });

  presetNameInput.addEventListener("input", () => {
    presetNameError.textContent = "Enter a preset name.";
    presetNameError.classList.add("hidden");
  });
  presetNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") confirmSavePreset.click();
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(document.getElementById(button.dataset.closeModal));
    });
  });

  [savePresetModal, loadPresetModal, transferLicenseModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeModal(savePresetModal);
    closeModal(loadPresetModal);
    closeModal(transferLicenseModal);
  });
}

function highlightSelectedButton(mode) {
  [bassBoostBtn, voiceBoostBtn, effectsOffBtn].forEach((btn) =>
    btn.classList.remove("selected")
  );

  if (mode === "bass") bassBoostBtn.classList.add("selected");
  else if (mode === "voice") voiceBoostBtn.classList.add("selected");
  else effectsOffBtn.classList.add("selected");
}

function formatSiteName(hostname) {
  const normalized = hostname.replace(/^www\./, "").toLowerCase();
  const knownSites = {
    "music.youtube.com": "YouTube Music",
    "youtube.com": "YouTube",
    "m.youtube.com": "YouTube",
    "open.spotify.com": "Spotify",
    "spotify.com": "Spotify",
    "soundcloud.com": "SoundCloud",
    "music.apple.com": "Apple Music",
    "app.deezer.com": "Deezer",
    "deezer.com": "Deezer",
    "twitch.tv": "Twitch",
    "www.twitch.tv": "Twitch",
    "netflix.com": "Netflix",
    "www.netflix.com": "Netflix",
    "max.com": "Max",
    "www.max.com": "Max",
    "primevideo.com": "Prime Video",
    "www.primevideo.com": "Prime Video",
    "disneyplus.com": "Disney+",
    "www.disneyplus.com": "Disney+",
  };

  if (knownSites[normalized]) {
    return knownSites[normalized];
  }

  const parts = normalized.split(".");
  const secondLevelTlds = new Set(["co", "com", "org", "net", "gov", "edu"]);
  let labelIndex = Math.max(0, parts.length - 2);

  if (parts.length >= 3 && secondLevelTlds.has(parts[parts.length - 2])) {
    labelIndex = parts.length - 3;
  }

  const serviceParts = parts.slice(0, labelIndex + 1);
  const label = serviceParts[serviceParts.length - 1] || normalized;

  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function updateVolumeProc() {
  volumePC.value = slider.value;
  updateVolumeDangerState(slider.value);
  syncMuteButton(slider.value);
}

function updateEffectsIntensityProc() {
  effectIntensityPC.value = effectSlider.value * 5;
}

function updateEqualizerLabels() {
  eqSliders.forEach((eqSlider, index) => {
    const output = document.getElementById(`eqValue${index}`);
    const value = Number(eqSlider.value);
    output.textContent = `${value > 0 ? "+" : ""}${value} dB`;
  });
}

function syncEqualizerUI() {
  eqSliders.forEach((eqSlider, index) => {
    eqSlider.value = eqBands[index];
  });
  updateEqualizerLabels();
}

function syncProToolsUI() {
  const controls = [
    [smartLimiterToggle, smartLimiterStrength, smartLimiterValue, proAudioSettings.smartLimiter],
    [adaptiveVolumeToggle, adaptiveVolumeStrength, adaptiveVolumeValue, proAudioSettings.adaptiveVolume],
    [movieDialogueToggle, movieDialogueStrength, movieDialogueValue, proAudioSettings.movieDialogue],
  ];
  controls.forEach(([toggle, sliderControl, output, settings]) => {
    toggle.checked = settings.enabled;
    sliderControl.value = settings.strength;
    sliderControl.disabled = !settings.enabled;
    output.textContent = `${settings.strength}%`;
    toggle.closest(".proToolSection")?.classList.toggle("enabled", settings.enabled);
  });
}

async function persistProAudioSettings() {
  proAudioSettings = normalizeProAudioSettings(proAudioSettings);
  await storageSet({ [PRO_AUDIO_SETTINGS_KEY]: proAudioSettings });
  savePreset(slider.value, effectMode, effectAmount);
  updateAudio(slider.value);
}

function bindProTool(toggle, strengthInput, valueOutput, settingName) {
  toggle.addEventListener("change", () => {
    proAudioSettings[settingName].enabled = toggle.checked;
    syncProToolsUI();
    persistProAudioSettings();
  });
  strengthInput.addEventListener("input", () => {
    proAudioSettings[settingName].strength = Number(strengthInput.value);
    valueOutput.textContent = `${strengthInput.value}%`;
    persistProAudioSettings();
  });
}

async function sendSettingsToTab(tabId, settings) {
  return chrome.runtime.sendMessage({ type: "ZAZ_CAPTURE_TAB", tabId, settings });
}

function tabDisplayName(tab) {
  try {
    const hostname = new URL(tab.url).hostname;
    if (hostname === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
      return tab.title || hostname;
    }
    return formatSiteName(hostname);
  } catch (error) {
    return tab.title || "Audio tab";
  }
}

async function applyMixerVolume(tab, volume) {
  let hostname = null;
  try { hostname = new URL(tab.url).hostname; } catch (error) { /* restricted tab */ }
  const stored = hostname ? await storageGet(hostname) : {};
  const siteSettings = hostname ? stored[hostname] || {} : {};
  const savedEffectAmount = Number(siteSettings.effectAmount);
  const settings = {
    volume,
    effectMode: siteSettings.effectMode || "none",
    effectAmount: Number.isFinite(savedEffectAmount) ? savedEffectAmount : 10,
    eqBands: getEffectiveEqBands(siteSettings.eqBands),
    pro: getEffectiveProSettings(),
    proValidUntil,
  };
  const result = await sendSettingsToTab(tab.id, settings);
  if (!result?.ok) throw new Error(result?.error || "This tab could not be connected.");
}

async function refreshMixerTabs() {
  if (!isProActive || !mixerTabList) return;
  refreshMixerButton.disabled = true;
  try {
    const [tabs, captureStatus] = await Promise.all([
      chrome.tabs.query({ audible: true, currentWindow: true }),
      chrome.runtime.sendMessage({ type: "ZAZ_OFFSCREEN_STATUS", target: "offscreen" })
        .catch(() => ({ tabIds: [] })),
    ]);
    const capturedTabIds = new Set(Array.isArray(captureStatus?.tabIds) ? captureStatus.tabIds : []);
    mixerTabList.replaceChildren();
    if (!tabs.length) {
      const empty = document.createElement("p");
      empty.className = "mixerEmpty";
      empty.textContent = "No audible tabs right now. Start playback, then refresh.";
      mixerTabList.appendChild(empty);
      return;
    }

    tabs.forEach((tab) => {
      const row = document.createElement("div");
      row.className = "mixerTabRow";
      const identity = document.createElement("div");
      identity.className = "mixerIdentity";
      const favicon = document.createElement("img");
      favicon.src = tab.favIconUrl || "icons/icon32.png";
      favicon.alt = "";
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = tabDisplayName(tab);
      const title = document.createElement("small");
      title.textContent = tab.title || "Playing audio";
      copy.append(name, title);

      const needsConnection = tab.id !== activeTabId && !capturedTabIds.has(tab.id);
      if (needsConnection) {
        const connectionNote = document.createElement("small");
        connectionNote.className = "mixerConnectionNote";
        connectionNote.textContent = "Open TVM on this tab once to connect";
        copy.append(connectionNote);
        row.classList.add("mixerNeedsConnection");
      }
      identity.append(favicon, copy);

      const storedMixerVolume = Number(mixerVolumes[tab.id]);
      const defaultMixerVolume = tab.id === activeTabId ? Number(slider.value) : 100;
      const maxVolume = getMaxVolume();
      const value = Math.max(0, Math.min(maxVolume, Number.isFinite(storedMixerVolume) ? storedMixerVolume : defaultMixerVolume));
      const volumeWrap = document.createElement("label");
      volumeWrap.className = "mixerVolume";
      const output = document.createElement("output");
      output.textContent = `${value}%`;
      const input = document.createElement("input");
      input.type = "range";
      input.min = "0";
      input.max = String(maxVolume);
      input.value = String(value);
      input.setAttribute("aria-label", `${name.textContent} volume`);
      input.disabled = needsConnection;
      input.addEventListener("input", () => {
        const nextVolume = Number(input.value);
        output.textContent = `${nextVolume}%`;
        mixerVolumes[tab.id] = nextVolume;
        storageSet({ [PRO_MIXER_VOLUMES_KEY]: mixerVolumes });
        row.classList.remove("mixerError");
        applyMixerVolume(tab, nextVolume).catch((error) => {
          row.classList.add("mixerError");
          row.title = error.message;
        });
        if (tab.id === activeTabId) {
          slider.value = String(nextVolume);
          updateVolumeProc();
        }
      });
      volumeWrap.append(output, input);
      row.append(identity, volumeWrap);
      mixerTabList.appendChild(row);
    });
  } finally {
    refreshMixerButton.disabled = false;
  }
}

function animateMixerRefresh() {
  refreshMixerButton.classList.remove("refreshing");
  void refreshMixerButton.offsetWidth;
  refreshMixerButton.classList.add("refreshing");
  window.setTimeout(() => refreshMixerButton.classList.remove("refreshing"), 620);
}

async function setupProTools() {
  const stored = await storageGet([PRO_AUDIO_SETTINGS_KEY, PRO_MIXER_VOLUMES_KEY]);
  proAudioSettings = normalizeProAudioSettings(stored[PRO_AUDIO_SETTINGS_KEY]);
  mixerVolumes = stored[PRO_MIXER_VOLUMES_KEY] && typeof stored[PRO_MIXER_VOLUMES_KEY] === "object"
    ? stored[PRO_MIXER_VOLUMES_KEY]
    : {};
  syncProToolsUI();
  bindProTool(smartLimiterToggle, smartLimiterStrength, smartLimiterValue, "smartLimiter");
  bindProTool(adaptiveVolumeToggle, adaptiveVolumeStrength, adaptiveVolumeValue, "adaptiveVolume");
  bindProTool(movieDialogueToggle, movieDialogueStrength, movieDialogueValue, "movieDialogue");
  refreshMixerButton.addEventListener("click", () => {
    animateMixerRefresh();
    refreshMixerTabs();
  });
}

function savePreset(volume, mode, amount, bands = eqBands) {
  if (!activeHostname) return;

  chrome.storage.local.set({
    [activeHostname]: {
      volume: parseInt(volume, 10),
      effectMode: mode,
      effectAmount: parseInt(amount, 10),
      eqBands: normalizeEqBands(bands).map((band) => parseInt(band, 10)),
      eqPresetName: loadedPresetName,
      proAudio: normalizeProAudioSettings(proAudioSettings),
    },
  });
}

async function updateAudio(volume) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const settings = {
    volume: Math.max(0, Math.min(getMaxVolume(), parseInt(volume, 10) || 0)),
    effectMode,
    effectAmount,
    eqBands: getEffectiveEqBands(),
    pro: getEffectiveProSettings(),
    proValidUntil,
  };

  try {
    const result = await sendSettingsToTab(tab.id, settings);

    if (result?.ok) return;
  } catch (error) {
    // Fall through to DOM processing on unsupported/restricted pages.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: (volumeLevel, selectedEffectMode, selectedEffectAmount, customBands, proSettings, entitlementExpiresAt) => {
        window.postMessage(
          {
            type: "ZAZ_VOLUME_UPDATE",
            volume: volumeLevel,
            effectMode: selectedEffectMode,
            effectAmount: selectedEffectAmount,
            eqBands: customBands,
            pro: proSettings,
            proValidUntil: entitlementExpiresAt,
          },
          "*"
        );
      },
      args: [settings.volume, effectMode, effectAmount, settings.eqBands, settings.pro, settings.proValidUntil],
    });
  } catch (error) {
    // Ignore pages where script injection is not allowed.
  }
}

chrome.storage.local.get("theme", ({ theme }) => {
  const resolvedTheme = theme === "light" ? "light" : "dark";
  applyTheme(resolvedTheme);
  if (!theme) {
    chrome.storage.local.set({ theme: "dark" });
  }
});

themeToggle.addEventListener("change", () => {
  const newTheme = themeToggle.checked ? "light" : "dark";
  applyTheme(newTheme);
  chrome.storage.local.set({ theme: newTheme });
});

function initializeActiveTab() {
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url) return;
  activeTabId = tab.id;
  meterPort.postMessage({ type: "ZAZ_METER_SUBSCRIBE", tabId: activeTabId });

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch (error) {
    updateVolumeProc();
    updateEffectsIntensityProc();
    syncEqualizerUI();
    return;
  }
  activeHostname = hostname;

  if (tab.favIconUrl) {
    siteFavicon.src = tab.favIconUrl;
  }
  siteName.textContent = formatSiteName(hostname);

  chrome.storage.local.get([hostname], (result) => {
    const preset = result[hostname];

    if (!preset) {
      loadedPresetName = null;
      updatePresetStatus();
      updateVolumeProc();
      updateEffectsIntensityProc();
      syncEqualizerUI();
      updateAudio(slider.value);
      return;
    }

    slider.value = preset.volume ?? 100;
    effectSlider.value = preset.effectAmount ?? 10;
    effectMode = preset.effectMode ?? "none";
    effectAmount = preset.effectAmount ?? 10;
    eqBands = normalizeEqBands(preset.eqBands);
    if (isProActive && preset.proAudio) {
      proAudioSettings = normalizeProAudioSettings(preset.proAudio);
      syncProToolsUI();
    }
    loadedPresetName = typeof preset.eqPresetName === "string"
      ? preset.eqPresetName
      : null;

    updateEffectsIntensityProc();
    updateVolumeProc();
    syncEqualizerUI();
    highlightSelectedButton(effectMode);
    updatePresetStatus();
    updateAudio(slider.value);
  });
});
}

meterPort.onMessage.addListener(applyMeterLevels);

setInterval(() => {
  if (!Number.isInteger(activeTabId) || Date.now() - lastMeterUpdateAt < 300) return;

  chrome.runtime.sendMessage(
    { type: "ZAZ_GET_EQ_LEVELS", tabId: activeTabId },
    (message) => {
      if (chrome.runtime.lastError || !message) return;
      applyMeterLevels(message);
    }
  );
}, 200);

volumePC.addEventListener("input", (e) => {
  const value = Math.max(0, Math.min(getMaxVolume(), parseInt(e.target.value || "0", 10)));
  slider.value = value;
  updateVolumeProc();
  updateAudio(value);
  savePreset(value, effectMode, effectAmount);
});

effectIntensityPC.addEventListener("input", (e) => {
  const normalized = Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10)));
  effectAmount = Math.round(normalized / 5);
  effectSlider.value = effectAmount;
  updateAudio(slider.value);
  savePreset(slider.value, effectMode, effectAmount);
  updateEffectsIntensityProc();
});

slider.addEventListener("input", (e) => {
  updateAudio(e.target.value);
  updateVolumeProc();
  savePreset(e.target.value, effectMode, effectAmount);
});

effectSlider.addEventListener("input", (e) => {
  effectAmount = parseInt(e.target.value, 10);
  updateAudio(slider.value);
  updateEffectsIntensityProc();
  savePreset(slider.value, effectMode, effectAmount);
});

bassBoostBtn.addEventListener("click", () => {
  effectMode = "bass";
  highlightSelectedButton(effectMode);
  updateAudio(slider.value);
  savePreset(slider.value, effectMode, effectAmount);
});

voiceBoostBtn.addEventListener("click", () => {
  effectMode = "voice";
  highlightSelectedButton(effectMode);
  updateAudio(slider.value);
  savePreset(slider.value, effectMode, effectAmount);
});

effectsOffBtn.addEventListener("click", () => {
  effectMode = "none";
  highlightSelectedButton(effectMode);
  updateAudio(slider.value);
  savePreset(slider.value, effectMode, effectAmount);
});

eqSliders.forEach((eqSlider, index) => {
  eqSlider.addEventListener("input", (e) => {
    clearLoadedPreset();
    eqBands[index] = parseInt(e.target.value, 10);
    updateEqualizerLabels();
    updateAudio(slider.value);
    savePreset(slider.value, effectMode, effectAmount);
  });
});

resetEqualizerBtn.addEventListener("click", () => {
  clearLoadedPreset();
  eqBands = [...EQ_DEFAULTS];
  syncEqualizerUI();
  updateAudio(slider.value);
  savePreset(slider.value, effectMode, effectAmount);
});

muteVolumeBtn.addEventListener("click", () => {
  const currentVolume = Number(slider.value) || 0;
  const nextVolume = currentVolume === 0
    ? Math.max(1, Math.min(getMaxVolume(), volumeBeforeMute || 100))
    : 0;
  if (currentVolume > 0) volumeBeforeMute = currentVolume;
  slider.value = String(nextVolume);
  updateVolumeProc();
  updateAudio(nextVolume);
  savePreset(nextVolume, effectMode, effectAmount);
});

resetVolumeBtn.addEventListener("click", () => {
  slider.value = 100;
  updateAudio(100);
  savePreset(100, effectMode, effectAmount);
  updateVolumeProc();
});

async function initializeExtension() {
  updateVolumeProc();
  updateEffectsIntensityProc();
  syncEqualizerUI();
  highlightSelectedButton(effectMode);
  setupTabs();
  setupPresetControls();
  setupProLicensing();
  await Promise.all([setupProTools(), loadSavedPresets()]);
  await validateStoredProLicense();
  initializeActiveTab();
  updatePresetStatus();
}

initializeExtension();

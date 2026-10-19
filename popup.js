
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
const themeToggle = document.getElementById("themeToggle");
const powerToggle = document.getElementById("powerToggle");
const powerStatus = document.getElementById("powerStatus");
let extensionEnabled = false;
let powerRevision = 0;
function syncPowerUI(enabled) {
  extensionEnabled = enabled;
  powerToggle.setAttribute("aria-pressed", String(enabled));
  powerToggle.title = enabled ? "Turn off Tab Volume Manager" : "Turn on Tab Volume Manager";
  powerStatus.textContent = enabled ? "Audio processing is on." : "Audio processing is off. Original audio is playing.";
  document.body.classList.toggle("powerOff", !enabled);
  document.querySelectorAll(".tabPanel, #mixerSettingsModal").forEach(panel => { panel.inert = !enabled; });
}
const powerReady = chrome.storage.local.get("tvmEnabled").then(stored => {
  if (powerRevision === 0) syncPowerUI(stored.tvmEnabled !== false);
  powerToggle.disabled = false;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.tvmEnabled) {
    powerRevision++;
    syncPowerUI(changes.tvmEnabled.newValue !== false);
  }
  if (changes.tvmSleepTimerState) void syncSleepTimerState();
});
powerToggle.addEventListener("click", async () => {
  powerToggle.disabled = true;
  const next = !extensionEnabled;
  try {
    await chrome.storage.local.set({ tvmEnabled: next });
    syncPowerUI(next);
    if (next) await updateAudio(slider.value);

  } catch (error) {
    powerStatus.textContent = "Could not change power. Please try again.";
    powerToggle.title = powerStatus.textContent;
  } finally {
    powerToggle.disabled = false;
  }
});
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
const eqSpectrum = document.getElementById("eqSpectrum");
const eqSpectrumArea = eqSpectrum.querySelector(".eqSpectrumArea");
const eqSpectrumLines = eqSpectrum.querySelectorAll(".eqSpectrumGlow, .eqSpectrumLine");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
const proWelcomeCelebration = document.getElementById("proWelcomeCelebration");
const proWelcomePlan = document.getElementById("proWelcomePlan");
const proWelcomeDescription = document.getElementById("proWelcomeDescription");
const dismissProWelcome = document.getElementById("dismissProWelcome");
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
const stereoToggle = document.getElementById("stereoToggle");
const stereoBalance = document.getElementById("stereoBalance");
const stereoWidth = document.getElementById("stereoWidth");
const stereoSwap = document.getElementById("stereoSwap");
const resetStereoButton = document.getElementById("resetStereoButton");
const refreshMixerButton = document.getElementById("refreshMixerButton");
const mixerTabList = document.getElementById("mixerTabList");
const mixerSettingsModal = document.getElementById("mixerSettingsModal");
const mixerModalFavicon = document.getElementById("mixerModalFavicon");
const mixerModalName = document.getElementById("mixerModalName");
const mixerSoundControls = document.getElementById("mixerSoundControls");
const mixerQuickEffects = document.getElementById("mixerQuickEffects");
const mixerEffectSlider = document.getElementById("mixerEffectSlider");
const mixerEffectValue = document.getElementById("mixerEffectValue");
const mixerEqGrid = document.getElementById("mixerEqGrid");
const mixerModalMessage = document.getElementById("mixerModalMessage");
const sleepTimerSection = document.getElementById("sleepTimerSection");
const sleepTimerBody = document.getElementById("sleepTimerBody");
const sleepTimerOptions = document.getElementById("sleepTimerOptions");
const sleepTimerStatus = document.getElementById("sleepTimerStatus");
const sleepTimerBadge = document.getElementById("sleepTimerBadge");
const sleepTimerCountdown = document.getElementById("sleepTimerCountdown");
const sleepTimerMessage = document.getElementById("sleepTimerMessage");
const cancelSleepTimerButton = document.getElementById("cancelSleepTimerButton");
const customSleepTimerButton = document.getElementById("customSleepTimerButton");
const customSleepTimerModal = document.getElementById("customSleepTimerModal");
const customSleepHours = document.getElementById("customSleepHours");
const customSleepMinutes = document.getElementById("customSleepMinutes");
const customSleepTimerError = document.getElementById("customSleepTimerError");
const confirmCustomSleepTimer = document.getElementById("confirmCustomSleepTimer");
const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const FREE_EQ_INDICES = new Set([0, 1, 3, 5, 7, 8]);
const EQ_DEFAULTS = EQ_FREQUENCIES.map(() => 0);
const ACTIVE_TAB_KEY = "activeControlTab";
const SAVED_EQ_PRESET_KEY = "savedEqPreset";
const SAVED_EQ_PRESETS_KEY = "savedEqPresets";
const PRO_AUDIO_SETTINGS_KEY = "tvmProAudioSettings";
const PRO_MIXER_VOLUMES_KEY = "tvmProMixerVolumes";
const trialCard = document.getElementById("trialCard");
const startTrialButton = document.getElementById("startTrialButton");
const cancelTrialButton = document.getElementById("cancelTrialButton");
const trialUpgradeButton = document.getElementById("trialUpgradeButton");
const TVM_TRIAL_KEY = "tvmTrial";
let trialState = null;
let trialBusy = false;
const TVM_LICENSE_KEY = "tvmProLicenseKey";
const TVM_INSTALLATION_ID_KEY = "tvmProInstallationId";
const TVM_ENTITLEMENT_KEY = "tvmProEntitlement";
const TVM_LICENSE_META_KEY = "tvmProLicenseMeta";
const PRO_PLANS = new Set(["monthly", "yearly", "lifetime"]);
const STANDARD_MAX_VOLUME = 500;
const LIFETIME_MAX_VOLUME = 1500;
const EXTREME_VOLUME_THRESHOLD = 1000;
const TVM_API_URL = "https://tvm-licensing-api-prod.optiflowzoffice.workers.dev";
const TVM_PRO_URL = "https://stefanmihajlovic.com/tab-volume-manager/#pricing";
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
let meterFrame = 0;
let meterFrameTime = 0;
let spectrumGeometry = null;
const meterTargets = EQ_FREQUENCIES.map(() => 0);
const meterLevels = EQ_FREQUENCIES.map(() => 0);
let isProActive = false;
let proPlan = null;
let proValidUntil = 0;
let proWelcomeTimer = null;
let volumeBeforeMute = 100;
let proAudioSettings = {
  smartLimiter: { enabled: false, strength: 70 },
  adaptiveVolume: { enabled: false, strength: 50 },
  movieDialogue: { enabled: false, strength: 60 },
};
let mixerVolumes = {};
let selectedMixerTab = null;
let selectedMixerRow = null;
let presetMixerTarget = null;
let mixerRefreshTimer = null;
let mixerRefreshRevision = 0;
const mixerRows = new Map();
let sleepTimerEndsAt = 0;
let sleepTimerInterval = null;
let sleepTimerResizeTimer = null;

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
  return Infinity;
}

function getMaxVolume() {
  return isProActive
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
  muteVolumeBtn.querySelector("span").textContent = muted ? "Unmute" : "Mute";
  muteVolumeBtn.querySelector("use").setAttribute("href", muted ? "#tvm-icon-volume" : "#tvm-icon-muted");
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
    stereo: TvmStereo.normalize(settings?.stereo),
  };
}

function getEffectiveProSettings() {
  if (!isProActive) {
    return {
      smartLimiter: { enabled: false, strength: 0 },
      adaptiveVolume: { enabled: false, strength: 0 },
      movieDialogue: { enabled: false, strength: 0 },
      stereo: TvmStereo.normalize(null),
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

async function verifyEntitlement(entitlement, installationId, allowTrial = false) {
  if (!entitlement?.token || typeof entitlement.expiresAt !== "number") return null;
  const parts = entitlement.token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
    const expectedInstallation = await installationClaim(installationId);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(payload.exp) || !Number.isFinite(entitlement.expiresAt) || payload.exp <= now || entitlement.expiresAt <= now) return null;
    if (payload.installation !== expectedInstallation) return null;
    if (payload.product !== "tab_volume_manager_pro") return null;
    if (allowTrial) {
      const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
      if (payload.plan !== "trial" || header.typ !== "EXT-TRIAL" || header.alg !== "ES256") return null;
    } else if (!normalizeProPlan(payload.plan)) return null;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      (allowTrial && (await trialDevelopmentConfig)?.publicKey) || TVM_LICENSE_PUBLIC_JWK,
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
  const api = (path.startsWith("/v1/trial/") && (await trialDevelopmentConfig)?.api) || TVM_API_URL;
  const response = await fetch(`${api}${path}`, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
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

function hideProWelcome() {
  if (proWelcomeCelebration.classList.contains("hidden") ||
      proWelcomeCelebration.classList.contains("isLeaving")) return;
  window.clearTimeout(proWelcomeTimer);
  proWelcomeTimer = null;
  proWelcomeCelebration.classList.remove("isVisible");
  proWelcomeCelebration.classList.add("isLeaving");
  window.setTimeout(() => {
    proWelcomeCelebration.classList.add("hidden");
    proWelcomeCelebration.classList.remove("isLeaving", "lifetimeWelcome");
    (proPlan === "trial" ? trialUpgradeButton : proPlan === "lifetime" ? transferProButton : manageProButton).focus();
  }, 320);
}

function showProWelcome(plan) {
  const verifiedPlan = normalizeProPlan(plan) || "monthly";
  const planName = `${verifiedPlan.charAt(0).toUpperCase()}${verifiedPlan.slice(1)}`;
  const isLifetime = verifiedPlan === "lifetime";
  proWelcomePlan.textContent = `${planName} Pro`;
  proWelcomeDescription.textContent = "Stereo tools, unlimited presets and the 1500% boost are ready.";
  proWelcomeCelebration.classList.toggle("lifetimeWelcome", isLifetime);
  proWelcomeCelebration.classList.remove("hidden", "isLeaving");
  void proWelcomeCelebration.offsetWidth;
  proWelcomeCelebration.classList.add("isVisible");
  window.clearTimeout(proWelcomeTimer);
  proWelcomeTimer = window.setTimeout(hideProWelcome, 7000);
  window.setTimeout(() => {
    if (!proWelcomeCelebration.classList.contains("hidden")) dismissProWelcome.focus();
  }, 620);
}

function applyProAccessState(active) {
  isProActive = Boolean(active);
  document.body.classList.toggle("proActive", isProActive);
  document.body.classList.toggle("lifetimeLicense", isProActive);
  headerProBadge.classList.toggle("hidden", !isProActive);
  proMarketingContent.classList.toggle("hidden", isProActive);
  proToolsContent.classList.toggle("hidden", !isProActive);
  manageProButton.classList.toggle("hidden", isProActive && proPlan === "lifetime");
  syncVolumeTierUi();
  syncStereoUI();
  eqBands = normalizeEqBands(eqBands);
  syncEqualizerUI();
  updateSavedPresetSlots();
  savePresetDescription.textContent = !isProActive
    ? "Save the current six-band equalizer settings. Free includes one preset."
    : "Save the current 10-band equalizer settings. Pro includes unlimited presets.";

  if (isProActive) refreshMixerTabs();
  if (!mixerSettingsModal.classList.contains("hidden") && selectedMixerRow) openMixerSettings(selectedMixerRow._mixer.tab, selectedMixerRow);
  if (Number.isInteger(activeTabId)) updateAudio(slider.value);
}

function setProUiActive(license, verifiedPlan, offline = false, expiresAt = 0) {
  trialCard.classList.add("hidden");
  headerProBadge.textContent = "Pro";
  proPlan = normalizeProPlan(verifiedPlan);
  proValidUntil = Number(expiresAt) || 0;
  proActivationState.classList.add("hidden");
  proActiveState.classList.remove("hidden");
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
  setProMessage(message);
  applyProAccessState(false);
}

function setProButtonsDisabled(disabled) {
  [activateProButton, getProButton, manageProButton, transferProButton, startTrialButton]
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
    showProWelcome(entitlementPayload.plan);
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
    return restoreTrial();
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
      return restoreTrial();
    }
  };

  if (cachedPayload) {
    void validateRemotely();
    return true;
  }
  return validateRemotely();
}

function renderTrial() {
  if (!trialState || (isProActive && proPlan !== "trial")) { trialCard.classList.add("hidden"); return; }
  trialCard.classList.remove("hidden");
  const active = proPlan === "trial" && isProActive;
  const cancelled = trialState.status === "cancelled";
  const expired = trialState.status === "expired" || cancelled;
  const remaining = Math.max(0, (trialState.expiresAt || 0) * 1000 - Date.now());
  const days = Math.ceil(remaining / 86400000);
  document.getElementById("trialTitle").textContent = active ? "All yours. Try it out." : cancelled ? "Your trial is cancelled." : expired ? "Your trial has ended." : "Try every Pro tool.";
  document.getElementById("trialBadge").textContent = active ? (days > 1 ? `${days} days left` : "Less than a day left") : expired ? "Free plan" : "7 days free";
  document.getElementById("trialDescription").textContent = active
    ? `Pro until ${new Date(trialState.expiresAt * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}. No automatic charge.`
    : expired ? "Your presets are safe. Keep Pro to use them all." : "No card. No automatic charge.";
  const progress = document.getElementById("trialProgress");
  progress.classList.toggle("hidden", !active);
  const percent = Math.max(0, Math.min(100, remaining / ((trialState.expiresAt - trialState.startedAt) * 1000) * 100)) || 0;
  progress.setAttribute("aria-valuenow", String(Math.round(percent)));
  progress.firstElementChild.style.width = `${percent}%`;
  startTrialButton.classList.toggle("hidden", active || expired);
  trialUpgradeButton.classList.toggle("hidden", !active && !expired);
  document.getElementById("trialActions").classList.toggle("hidden", !active && !expired);
  cancelTrialButton.classList.toggle("hidden", !active);
  headerProBadge.textContent = active ? "Trial" : "Pro";
}

function applyTrial(result, payload) {
  // A late trial response must never replace paid access.
  if (isProActive && proPlan !== "trial") return;
  trialState = result.trial;
  if (payload) {
    trialState = { ...trialState, status: "active", expiresAt: payload.exp, startedAt: payload.startedAt };
    proPlan = "trial";
    proValidUntil = Math.min(payload.exp, result.entitlement.expiresAt);
    applyProAccessState(true);
    // Purchasing / entering a paid key stays available during the trial.
    proActiveState.classList.add("hidden");
    proActivationState.classList.remove("hidden");
    setProMessage();
  } else {
    setProUiInactive();
  }
  renderTrial();
}

async function restoreTrial() {
  const installationId = await ensureInstallationId();
  const stored = (await storageGet(TVM_TRIAL_KEY))[TVM_TRIAL_KEY];
  const cached = await verifyEntitlement(stored?.entitlement, installationId, true);
  if (cached) applyTrial(stored, cached);
  else if (stored?.trial) applyTrial({ trial: { ...stored.trial, status: stored.trial.status === "cancelled" ? "cancelled" : "expired" } }, null);
  try {
    const result = await postLicenseApi("/v1/trial/status", { product: "tab_volume_manager_pro", installationId });
    const payload = await verifyEntitlement(result.entitlement, installationId, true);
    if (result.trial.status === "active" && !payload) throw new Error("Invalid trial verification.");
    await storageSet({ [TVM_TRIAL_KEY]: result });
    applyTrial(result, payload);
    return Boolean(payload);
  } catch {
    // Offline access is limited by the signature's original expiry; never extend it.
    return Boolean(cached);
  }
}

async function cancelTrial() {
  if (trialBusy || proPlan !== "trial") return;
  trialBusy = true;
  cancelTrialButton.disabled = true;
  const message = document.getElementById("trialMessage");
  message.textContent = "";
  try {
    const installationId = await ensureInstallationId();
    const result = await postLicenseApi("/v1/trial/cancel", { product: "tab_volume_manager_pro", installationId });
    if (result.trial?.status !== "cancelled" || result.entitlement) throw new Error("Could not cancel your trial. Please try again.");
    await storageSet({ [TVM_TRIAL_KEY]: result });
    applyTrial(result, null);
    await chrome.runtime.sendMessage({ type: "TVM_REFRESH_ACCESS" });
    trialUpgradeButton.focus();
  } catch (error) {
    message.textContent = error.message || "Could not cancel your trial. Please try again.";
  } finally {
    trialBusy = false;
    cancelTrialButton.disabled = false;
  }
}

async function startTrial() {
  if (trialBusy || isProActive) return;
  trialBusy = true;
  startTrialButton.disabled = true;
  startTrialButton.textContent = "Starting your trial…";
  const message = document.getElementById("trialMessage");
  message.textContent = "";
  try {
    const installationId = await ensureInstallationId();
    const result = await postLicenseApi("/v1/trial/start", { product: "tab_volume_manager_pro", installationId });
    const payload = await verifyEntitlement(result.entitlement, installationId, true);
    if (result.trial.status === "active" && !payload) throw new Error("Could not verify your trial. Please try again.");
    await storageSet({ [TVM_TRIAL_KEY]: result });
    applyTrial(result, payload);
    if (payload) { trialUpgradeButton.focus(); }
  } catch (error) {
    message.textContent = error.message || "Could not start your trial. Please try again.";
  } finally {
    trialBusy = false;
    startTrialButton.disabled = false;
    startTrialButton.innerHTML = 'Start my 7-day trial <svg class="trialActionIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  }
}

setInterval(() => {
  if (proPlan !== "trial") return;
  if (proValidUntil <= Date.now() / 1000) {
    trialState.status = "expired";
    setProUiInactive();
  }
  renderTrial();
}, 1000);

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
  setTransferCopyState(false);
  openModal(transferLicenseModal);
}

function setTransferCopyState(copied, label = copied ? "License key copied" : "Copy license key") {
  copyTransferLicenseButton.querySelector("use").setAttribute("href", copied ? "#tvm-icon-check" : "#tvm-icon-copy");
  copyTransferLicenseButton.dataset.copied = String(copied);
  copyTransferLicenseButton.setAttribute("aria-label", label);
  copyTransferLicenseButton.title = label;
}

async function copyTransferLicense() {
  try {
    await navigator.clipboard.writeText(transferLicenseKey.textContent);
    setTransferCopyState(true);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(transferLicenseKey);
    selection.removeAllRanges();
    selection.addRange(range);
    setTransferCopyState(false, "License key selected; copy it manually");
    transferLicenseMessage.textContent = "License key selected. Press Ctrl+C (Command+C on Mac) to copy.";
    transferLicenseMessage.classList.remove("hidden");
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
  cancelTrialButton.addEventListener("click", cancelTrial);
  startTrialButton.addEventListener("click", startTrial);
  trialUpgradeButton.addEventListener("click", () => chrome.tabs.create({ url: TVM_PRO_URL }));
  activateProButton.addEventListener("click", activateProLicense);
  getProButton.addEventListener("click", () => chrome.tabs.create({ url: TVM_PRO_URL }));
  manageProButton.addEventListener("click", manageProBilling);
  transferProButton.addEventListener("click", openLicenseTransfer);
  copyTransferLicenseButton.addEventListener("click", copyTransferLicense);
  confirmTransferButton.addEventListener("click", confirmLicenseTransfer);
  dismissProWelcome.addEventListener("click", hideProWelcome);
  proWelcomeCelebration.addEventListener("click", (event) => {
    if (event.target === proWelcomeCelebration) hideProWelcome();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && !proWelcomeCelebration.classList.contains("hidden")) {
      event.preventDefault();
      dismissProWelcome.focus();
      return;
    }
    if (event.key === "Escape" && !proWelcomeCelebration.classList.contains("hidden")) {
      hideProWelcome();
    }
  });
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

let tabIndicatorAnimation = null;

function moveTabIndicator(navigation, index, animate) {
  const indicator = navigation.querySelector(".tabIndicator");
  // Read the visible position before cancelling so rapid clicks remain continuous.
  const from = new DOMMatrixReadOnly(getComputedStyle(indicator).transform);
  tabIndicatorAnimation?.cancel();
  tabIndicatorAnimation = null;
  navigation.style.setProperty("--tab-index", index);
  if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const to = new DOMMatrixReadOnly(getComputedStyle(indicator).transform);
  const distance = to.m41 - from.m41;
  const stretch = Math.min(.16, Math.abs(distance) / indicator.offsetWidth * .1);
  const frames = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    const spring = 1 - Math.exp(-9 * t) * (Math.cos(7 * t) + 9 / 7 * Math.sin(7 * t));
    const pulse = Math.sin(Math.PI * Math.min(t / .7, 1)) ** 2;
    const x = from.m41 + distance * spring;
    const sx = 1 + (from.m11 - 1) * (1 - spring) + stretch * pulse;
    const sy = 1 + (from.m22 - 1) * (1 - spring) - .035 * pulse;
    return { offset: t, transform: `translateX(${x}px) scale(${sx}, ${sy})` };
  });
  frames[frames.length - 1].transform = `translateX(${to.m41}px) scale(1)`;
  tabIndicatorAnimation = indicator.animate(frames, { duration: 540, easing: "linear" });
}

function setActiveTab(tabName, save = true) {
  const validTab = tabButtons.some((button) => button.dataset.tab === tabName)
    ? tabName
    : "volume";

  const navigation = document.querySelector(".tabNavigation");
  const tabChanged = navigation.dataset.active !== validTab;
  if (save) navigation.classList.add("animateIndicator");
  if (tabChanged || !save) moveTabIndicator(navigation, tabButtons.findIndex(button => button.dataset.tab === validTab), save && tabChanged);
  navigation.dataset.active = validTab;

  tabButtons.forEach((button) => {
    const active = button.dataset.tab === validTab;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== validTab);
  });

  if (tabChanged) window.scrollTo({ top: 0, behavior: "instant" });

  if (validTab === "equalizer") {
    measureSpectrum();
    startMeters();
  } else {
    cancelAnimationFrame(meterFrame);
    meterFrame = 0;
  }

  if (validTab === "pro" && isProActive) scheduleMixerRefresh();
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
  if (!Array.isArray(message.levels) || message.levels.length !== EQ_FREQUENCIES.length) return;

  lastMeterUpdateAt = Date.now();
  message.levels.forEach((level, index) => {
    meterTargets[index] = Math.max(0, Math.min(100, Number(level) || 0));
  });
  startMeters();
}

function startMeters() {
  if (meterFrame || document.hidden || document.getElementById("equalizerPanel").classList.contains("hidden")) return;
  if (!spectrumGeometry) measureSpectrum();
  meterFrameTime = performance.now();
  meterFrame = requestAnimationFrame(renderMeters);
}

function renderMeters(time) {
  meterFrame = 0;
  if (document.hidden || document.getElementById("equalizerPanel").classList.contains("hidden")) return;
  const stale = Date.now() - lastMeterUpdateAt > 500;
  const elapsed = Math.min(64, time - meterFrameTime);
  meterFrameTime = time;
  let moving = false;
  meterLevels.forEach((level, index) => {
    const target = stale ? 0 : meterTargets[index];
    const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / (target > level ? 65 : 150));
    const nextLevel = level + (target - level) * blend;
    meterLevels[index] = Math.abs(target - nextLevel) < 0.05 ? target : nextLevel;
    moving ||= meterLevels[index] > 0.05;
    eqLevelMeters[index].style.height = `${meterLevels[index]}%`;
  });

  drawSpectrum(moving);

  if (moving || (!stale && meterTargets.some((level) => level > 0))) {
    meterFrame = requestAnimationFrame(renderMeters);
  }
}

function measureSpectrum() {
  const board = eqSpectrum.parentElement;
  const bounds = board.getBoundingClientRect();
  const rails = eqLevelMeters.map((meter, index) => ({ index, bounds: meter.parentElement.getBoundingClientRect() }))
    .filter((rail) => rail.bounds.height > 0);
  if (!rails.length || !board.clientWidth) {
    spectrumGeometry = null;
    return;
  }
  const height = rails[0].bounds.height;
  const width = board.clientWidth;
  spectrumGeometry = {
    width, height,
    bands: rails.map((rail) => ({ index: rail.index, x: rail.bounds.left + rail.bounds.width / 2 - bounds.left - board.clientLeft })),
  };
  eqSpectrum.style.top = `${rails[0].bounds.top - bounds.top - board.clientTop}px`;
  eqSpectrum.style.height = `${height}px`;
  eqSpectrum.setAttribute("viewBox", `0 0 ${width} ${height}`);
}

function drawSpectrum(moving) {
  if (!spectrumGeometry) return;
  const { width, height, bands } = spectrumGeometry;
  const points = bands.map(({ index, x }) => ({ x, y: height * (1 - meterLevels[index] / 100) }));
  let curve = `M 0 ${points[0].y}`;
  let previous = { x: 0, y: points[0].y };
  for (const point of [...points, { x: width, y: points[points.length - 1].y }]) {
    const middle = (previous.x + point.x) / 2;
    curve += ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
    previous = point;
  }
  eqSpectrumArea.setAttribute("d", `${curve} L ${width} ${height} L 0 ${height} Z`);
  eqSpectrumLines.forEach((line) => line.setAttribute("d", curve));
  eqSpectrum.style.opacity = moving ? "1" : "0";
}

new ResizeObserver(() => {
  measureSpectrum();
  startMeters();
}).observe(eqSpectrum.parentElement.querySelector(".eqGrid"));

document.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(meterFrame);
  meterFrame = 0;
  if (!document.hidden) startMeters();
});

function clearLoadedPreset() {
  loadedPresetName = null;
  updatePresetStatus();
}

function closeModal(modal) {
  const wasOpen = !modal.classList.contains("hidden");
  modal.classList.add("hidden");
  if (wasOpen && presetMixerTarget && [savePresetModal, loadPresetModal].includes(modal)) {
    const row = presetMixerTarget;
    presetMixerTarget = null;
    if (row.isConnected) {
      openMixerSettings(row._mixer.tab, row);
      document.getElementById(modal === savePresetModal ? "mixerSavePreset" : "mixerLoadPreset").focus();
    }
  }
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
    if (presetMixerTarget) {
      const row = presetMixerTarget;
      row._mixer.sound.eqBands = getEffectiveEqBands(preset.eqBands);
      row._mixer.presetName = preset.name;
      changeMixerVolume(row, row._mixer.value);
    } else {
      eqBands = normalizeEqBands(preset.eqBands);
      loadedPresetName = preset.name;
      syncEqualizerUI();
      updatePresetStatus();
      updateAudio(slider.value);
      savePreset(slider.value, effectMode, effectAmount);
    }
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

  const shouldShowUpgradeSlot = !isProActive;
  if (shouldShowUpgradeSlot) {
    const locked = document.createElement("div");
    locked.className = "presetSlot lockedPresetSlot";
    locked.setAttribute("aria-disabled", "true");
    locked.innerHTML = `<span class="presetSlotNumber">∞</span><span class="presetSlotCopy"><strong>${isProActive ? "Unlimited presets" : "More preset slots"}</strong><small>Unlimited with Pro</small></span><span class="presetSlotLock" aria-hidden="true">🔒</span>`;
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

function openPresetDialog(modal, row = null) {
  presetMixerTarget = row;
  if (row) closeModal(mixerSettingsModal);
  if (modal === savePresetModal) {
    presetNameInput.value = (row ? row._mixer.presetName : loadedPresetName) || (!isProActive && savedEqPresets[0]?.name) || "";
    savePresetDescription.textContent = row
      ? "Save this tab’s equalizer settings to your presets."
      : `Save the current ${isProActive ? "10" : "six"}-band equalizer settings.`;
    presetNameError.textContent = "Enter a preset name.";
    presetNameError.classList.add("hidden");
    requestAnimationFrame(() => { presetNameInput.focus(); presetNameInput.select(); });
  } else updateSavedPresetSlots();
  openModal(modal);
}

function setupPresetControls() {
  savePresetButton.addEventListener("click", () => openPresetDialog(savePresetModal));
  loadPresetButton.addEventListener("click", () => openPresetDialog(loadPresetModal));

  confirmSavePreset.addEventListener("click", async () => {
    const name = presetNameInput.value.trim();
    if (!name) {
      presetNameError.classList.remove("hidden");
      presetNameInput.focus();
      return;
    }

    const targetRow = presetMixerTarget;
    const nextPreset = { name, eqBands: getEffectiveEqBands(targetRow ? targetRow._mixer.sound.eqBands : eqBands), proOnly: false };
    if (isProActive) {
      const existingIndex = savedEqPresets.findIndex((preset) => preset.name.toLowerCase() === name.toLowerCase());
      if (existingIndex >= 0) {
        nextPreset.proOnly = savedEqPresets[existingIndex].proOnly;
        savedEqPresets[existingIndex] = nextPreset;
      } else {
        const presetLimit = getPresetLimit();
        if (savedEqPresets.length >= presetLimit) {
          presetNameError.textContent = "Pro includes unlimited presets.";
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
    if (targetRow) targetRow._mixer.presetName = name;
    else {
      loadedPresetName = name;
      updatePresetStatus();
      savePreset(slider.value, effectMode, effectAmount);
    }
    updateSavedPresetSlots();
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

  [savePresetModal, loadPresetModal, transferLicenseModal, mixerSettingsModal, customSleepTimerModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (presetMixerTarget) {
      closeModal(!savePresetModal.classList.contains("hidden") ? savePresetModal : loadPresetModal);
      return;
    }
    closeModal(savePresetModal);
    closeModal(loadPresetModal);
    closeModal(transferLicenseModal);
    closeModal(mixerSettingsModal);
    closeModal(customSleepTimerModal);
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
  syncStereoUI();
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

function syncStereoUI() {
  const stereo = TvmStereo.normalize(proAudioSettings.stereo);
  stereoToggle.checked = stereo.enabled;
  stereoBalance.value = stereo.balance;
  stereoWidth.value = stereo.width;
  stereoSwap.checked = stereo.swap;
  [stereoBalance, stereoWidth, stereoSwap, resetStereoButton].forEach((control) => {
    control.disabled = !isProActive || !stereo.enabled;
  });
  document.getElementById("stereoBalanceValue").textContent = stereo.balance === 0
    ? "Center" : `${Math.abs(stereo.balance)}% ${stereo.balance < 0 ? "left" : "right"}`;
  document.getElementById("stereoWidthValue").textContent = `${stereo.width}%`;
  document.getElementById("stereoToolsSection").classList.toggle("enabled", stereo.enabled);
}

function bindStereoTools() {
  [[stereoToggle, "enabled"], [stereoBalance, "balance"], [stereoWidth, "width"], [stereoSwap, "swap"]].forEach(([control, key]) => {
    control.addEventListener(control.type === "range" ? "input" : "change", () => {
      if (!isProActive) return;
      proAudioSettings.stereo[key] = control.type === "checkbox" ? control.checked : Number(control.value);
      syncStereoUI();
      persistProAudioSettings();
    });
  });
  resetStereoButton.addEventListener("click", () => {
    if (!isProActive) return;
    proAudioSettings.stereo = TvmStereo.normalize({ enabled: true });
    syncStereoUI();
    persistProAudioSettings();
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

async function sendSettingsToTab(tabId, settings, allowPageFallback = false) {
  return chrome.runtime.sendMessage({ type: "ZAZ_CAPTURE_TAB", tabId, settings, allowPageFallback });
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

async function applyMixerVolume(tab, volume, sound = mixerRows.get(tab.id)?._mixer.sound) {
  let hostname = null;
  try { hostname = new URL(tab.url).hostname; } catch (error) { /* restricted tab */ }
  const stored = hostname ? await storageGet(hostname) : {};
  const siteSettings = { ...(hostname ? stored[hostname] || {} : {}), ...sound };
  const savedEffectAmount = Number(siteSettings.effectAmount);
  const settings = {
    volume,
    effectMode: siteSettings.effectMode || "none",
    effectAmount: Number.isFinite(savedEffectAmount) ? savedEffectAmount : 10,
    eqBands: getEffectiveEqBands(siteSettings.eqBands),
    pro: isProActive
      ? normalizeProAudioSettings(siteSettings.proAudio || proAudioSettings)
      : getEffectiveProSettings(),
    proValidUntil,
  };
  const result = await sendSettingsToTab(tab.id, settings, true);
  if (!result?.ok) throw new Error(result?.error || "This tab could not be connected.");
  if (hostname) await storageSet({ [hostname]: { ...siteSettings, volume, ...(sound ? { eqPresetName: null } : {}) } });
  return result;
}

function setMixerModalMessage(message = "", success = false) {
  mixerModalMessage.textContent = message;
  mixerModalMessage.classList.toggle("hidden", !message);
  mixerModalMessage.classList.toggle("success", success);
}

function normalizeMixerSound(settings = {}) {
  return {
    effectMode: ["none", "bass", "voice"].includes(settings.effectMode) ? settings.effectMode : "none",
    effectAmount: Math.max(0, Math.min(20, Number.isFinite(Number(settings.effectAmount)) ? Number(settings.effectAmount) : 10)),
    eqBands: normalizeEqBands(settings.eqBands),
  };
}

function renderMixerSound() {
  if (!selectedMixerRow?._mixer.sound) return;
  const sound = selectedMixerRow._mixer.sound;
  mixerQuickEffects.querySelectorAll("button").forEach(button => {
    const selected = button.dataset.mode === sound.effectMode;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  mixerEffectSlider.value = String(sound.effectAmount);
  mixerEffectSlider.disabled = sound.effectMode === "none";
  mixerEffectValue.textContent = `${sound.effectAmount * 5}%`;
  mixerEffectSlider.closest("label").classList.toggle("isInactive", sound.effectMode === "none");
  mixerEqGrid.querySelectorAll("input").forEach(input => {
    const value = sound.eqBands[Number(input.dataset.band)];
    input.value = String(value);
    input.setAttribute("aria-valuetext", `${value} decibels`);
    input.closest("label").querySelector("output").textContent = `${value > 0 ? "+" : ""}${value}`;
  });
}

function changeMixerSound(mutator) {
  if (!selectedMixerRow || !extensionEnabled || !isProActive) return;
  mutator(selectedMixerRow._mixer.sound);
  renderMixerSound();
  setMixerModalMessage();
  changeMixerVolume(selectedMixerRow, selectedMixerRow._mixer.value);
}

function openMixerSettings(tab, row) {
  selectedMixerTab = tab;
  selectedMixerRow = row;
  if (tab.id === activeTabId && !row._mixer.saving) {
    row._mixer.sound = normalizeMixerSound({ effectMode, effectAmount, eqBands });
    row._mixer.confirmedSound = structuredClone(row._mixer.sound);
  }
  mixerModalFavicon.src = tab.favIconUrl || "icons/icon32.png";
  mixerModalName.textContent = tab.title || tabDisplayName(tab);
  mixerModalName.title = mixerModalName.textContent;
  mixerEqGrid.replaceChildren();
  const indices = EQ_FREQUENCIES.map((_, i) => i).filter(i => isProActive || FREE_EQ_INDICES.has(i));
  mixerEqGrid.style.setProperty("--mixer-bands", indices.length);
  document.getElementById("mixerEqCount").textContent = `${indices.length} bands · dB`;
  for (const index of indices) {
    const band = document.createElement("label");
    band.className = "eqBand";
    const output = document.createElement("output");
    const rail = document.createElement("span");
    rail.className = "eqSliderRail";
    const input = document.createElement("input");
    input.type = "range"; input.className = "eqSlider mixerEqSlider";
    input.min = "-15"; input.max = "15"; input.step = "1";
    input.dataset.band = String(index);
    input.setAttribute("aria-label", `${EQ_FREQUENCIES[index]} Hz gain`);
    input.addEventListener("input", () => changeMixerSound(sound => { sound.eqBands[index] = Number(input.value); }));
    const frequency = document.createElement("strong");
    frequency.textContent = EQ_FREQUENCIES[index] >= 1000 ? `${EQ_FREQUENCIES[index] / 1000}k` : String(EQ_FREQUENCIES[index]);
    frequency.title = `${EQ_FREQUENCIES[index]} Hz`;
    rail.append(input); band.append(output, rail, frequency); mixerEqGrid.append(band);
  }
  mixerSoundControls.disabled = !extensionEnabled || !isProActive;
  renderMixerSound();
  setMixerModalMessage();
  openModal(mixerSettingsModal);
  requestAnimationFrame(() => mixerQuickEffects.querySelector(".selected").focus());
}

function mixerIconButton(icon, label, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `mixerIconButton ${className}`;
  button.title = label;
  button.setAttribute("aria-label", label);
  // Icon names are internal constants; tab names are assigned as text elsewhere.
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#tvm-icon-${icon}"/></svg>`;
  return button;
}

// Give everyday volume levels usable travel while retaining the full Pro boost range.
function mixerSliderPosition(volume) {
  return Math.round(Math.sqrt(volume / getMaxVolume()) * 1000);
}

function renderMixerRowVolume(row, value) {
  const state = row._mixer;
  state.value = value;
  if (value > 0) state.beforeMute = value;
  state.range.value = String(mixerSliderPosition(value));
  state.range.setAttribute("aria-valuetext", `${value} percent`);
  state.number.value = String(value);
  state.range.style.setProperty("--mixer-fill", `${mixerSliderPosition(value) / 10}%`);
  renderMixerRowStatus(row);
}

function renderMixerRowStatus(row) {
  const state = row._mixer;
  const muted = state.value === 0 || state.tab.mutedInfo?.muted;
  state.mute.setAttribute("aria-pressed", String(muted));
  state.mute.setAttribute("aria-label", `${muted ? "Unmute" : "Mute"} ${state.tab.title || tabDisplayName(state.tab)}`);
  state.mute.title = muted ? "Unmute" : "Mute";
  state.mute.querySelector("use").setAttribute("href", `#tvm-icon-${muted ? "muted" : "volume"}`);
  row.classList.toggle("isMuted", muted);
  state.status.textContent = muted ? "Muted" : state.deferred ? "Saved" : state.tab.audible ? "Playing" : "Quiet";
  state.status.classList.toggle("isPlaying", !muted && !!state.tab.audible);
}

async function changeMixerVolume(row, value) {
  if (!extensionEnabled || !isProActive) return;
  const state = row._mixer;
  state.pending = Math.max(0, Math.min(getMaxVolume(), Math.round(Number(value) || 0)));
  renderMixerRowVolume(row, state.pending);
  state.error.classList.add("hidden");
  if (state.saving) return;
  state.saving = true;
  // Keep only the newest queued value while dragging; never race older writes.
  try {
    while (state.pending !== null) {
      const next = state.pending;
      const sound = state.sound ? structuredClone(state.sound) : undefined;
      state.pending = null;
      try {
        const result = await applyMixerVolume(state.tab, next, sound);
        state.deferred = !!result?.pending;
        if (next > 0 && state.tab.mutedInfo?.muted) {
          await chrome.tabs.update(state.tab.id, { muted: false });
          state.tab.mutedInfo = { ...state.tab.mutedInfo, muted: false };
        }
        state.confirmed = next;
        state.confirmedSound = sound;
        mixerVolumes[state.tab.id] = next;
        await storageSet({ [PRO_MIXER_VOLUMES_KEY]: mixerVolumes });
        if (state.tab.id === activeTabId) {
          slider.value = String(next);
          updateVolumeProc();
          if (sound) {
            effectMode = sound.effectMode; effectAmount = sound.effectAmount;
            eqBands = normalizeEqBands(sound.eqBands);
            effectSlider.value = String(effectAmount);
            highlightSelectedButton(effectMode); updateEffectsIntensityProc();
            syncEqualizerUI(); clearLoadedPreset();
          }
        }
        if (state.pending === null) renderMixerRowVolume(row, next);
      } catch (error) {
        if (state.pending !== null) continue;
        renderMixerRowVolume(row, state.confirmed);
        state.sound = structuredClone(state.confirmedSound);
        if (selectedMixerRow === row) renderMixerSound();
        state.error.textContent = error.message;
        state.error.classList.remove("hidden");
        if (selectedMixerRow === row) setMixerModalMessage(error.message);
      }
    }
  } finally {
    state.saving = false;
  }
}

function createMixerRow(tab, value) {
  const row = document.createElement("div");
  row.className = "mixerTabRow";
  const heading = document.createElement("div");
  heading.className = "mixerRowHeading";
  const identity = document.createElement("div");
  identity.className = "mixerIdentity";
  const favicon = document.createElement("img");
  favicon.alt = "";
  favicon.addEventListener("error", () => { favicon.src = "icons/icon32.png"; }, { once: true });
  const copy = document.createElement("span");
  const name = document.createElement("strong");
  const detail = document.createElement("small");
  copy.append(name, detail);
  identity.append(favicon, copy);
  const status = document.createElement("span");
  status.className = "mixerTabStatus";
  const options = mixerIconButton("mixer", "More tab settings", "mixerSettingsButton");
  options.addEventListener("click", () => openMixerSettings(row._mixer.tab, row, row._mixer.value));
  heading.append(identity, status, options);
  const controls = document.createElement("div");
  controls.className = "mixerInlineControls";
  const mute = mixerIconButton("volume", "Mute tab", "mixerMuteButton");
  mute.addEventListener("click", () => {
    const state = row._mixer;
    changeMixerVolume(row, state.value === 0 || state.tab.mutedInfo?.muted ? state.beforeMute : 0);
  });
  const range = document.createElement("input");
  range.type = "range";
  range.className = "mixerInlineSlider";
  range.min = "0"; range.max = "1000"; range.step = "1";
  range.addEventListener("input", () => changeMixerVolume(row, Math.round((Number(range.value) / 1000) ** 2 * getMaxVolume())));
  range.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const direction = ["ArrowLeft", "ArrowDown"].includes(event.key) ? -1 : 1;
    changeMixerVolume(row, row._mixer.value + direction * (event.shiftKey ? 10 : 1));
  });
  const field = document.createElement("label");
  field.className = "mixerNumberField";
  const number = document.createElement("input");
  number.type = "number"; number.min = "0"; number.max = String(getMaxVolume()); number.step = "1";
  number.addEventListener("change", () => changeMixerVolume(row, number.value));
  number.addEventListener("keydown", event => { if (event.key === "Enter") number.blur(); });
  const unit = document.createElement("span");
  unit.textContent = "%";
  field.append(number, unit);
  const reset = mixerIconButton("reset", "Reset volume to 100%", "mixerResetButton");
  reset.addEventListener("click", () => changeMixerVolume(row, 100));
  controls.append(mute, range, field, reset);
  const error = document.createElement("p");
  error.className = "mixerRowError hidden";
  error.setAttribute("role", "status");
  row.append(heading, controls, error);
  row._mixer = { tab, value, confirmed: value, beforeMute: value || 100, pending: null, saving: false,
    favicon, name, detail, status, mute, range, number, error, options };
  return row;
}

async function refreshMixerTabs() {
  if (!isProActive || !mixerTabList) return;
  const revision = ++mixerRefreshRevision;
  refreshMixerButton.disabled = true;
  try {
    const windowTabs = await chrome.tabs.query({ currentWindow: true });
    const tabs = windowTabs.filter(tab => Number.isInteger(tab.id) && /^(https?|file):/.test(tab.url || ""));
    tabs.sort((a, b) => Number(!!b.audible) - Number(!!a.audible) || Number(b.id === activeTabId) - Number(a.id === activeTabId) || a.index - b.index);
    const hostnames = [...new Set(tabs.map(tab => new URL(tab.url).hostname))];
    const savedSites = await storageGet(hostnames);
    const savedTabs = await chrome.storage.session.get(tabs.map(tab => `tvmTabSettings:${tab.id}`));
    if (revision !== mixerRefreshRevision) return;
    for (const [id, row] of mixerRows) {
      if (!tabs.some(tab => tab.id === id)) {
        if (presetMixerTarget === row) {
          presetMixerTarget = null;
          closeModal(savePresetModal); closeModal(loadPresetModal);
        }
        if (selectedMixerRow === row) { closeModal(mixerSettingsModal); selectedMixerTab = null; selectedMixerRow = null; }
        row.remove(); mixerRows.delete(id);
      }
    }
    mixerTabList.querySelectorAll(".mixerEmpty").forEach(node => node.remove());
    if (!tabs.length) {
      const empty = document.createElement("p");
      empty.className = "mixerEmpty";
      empty.textContent = "Your website tabs will appear here. You can adjust them before playback.";
      mixerTabList.appendChild(empty);
    }
    tabs.forEach((tab, index) => {
      let row = mixerRows.get(tab.id);
      const savedTab = savedTabs[`tvmTabSettings:${tab.id}`];
      const tabSettings = savedTab?.origin === new URL(tab.url).origin ? savedTab.settings : null;
      if (!row) {
        const stored = tabSettings ? Number(tabSettings.volume) : NaN;
        const fallback = tab.id === activeTabId ? Number(slider.value) : Number(savedSites[new URL(tab.url).hostname]?.volume ?? 100);
        const value = Math.max(0, Math.min(getMaxVolume(), Number.isFinite(stored) ? stored : fallback));
        row = createMixerRow(tab, value);
        row._mixer.sound = normalizeMixerSound(tabSettings || (tab.id === activeTabId ? { effectMode, effectAmount, eqBands } : savedSites[new URL(tab.url).hostname]));
        row._mixer.confirmedSound = structuredClone(row._mixer.sound);
        mixerRows.set(tab.id, row);
      }
      const state = row._mixer;
      state.tab = tab;
      renderMixerRowStatus(row);
      state.favicon.src = tab.favIconUrl || "icons/icon32.png";
      state.name.textContent = tab.title || tabDisplayName(tab);
      state.name.title = tab.title || tabDisplayName(tab);
      state.detail.textContent = `${new URL(tab.url).hostname || "Local file"}${tab.id === activeTabId ? " · Current tab" : ""}`;
      state.options.setAttribute("aria-label", `More settings for ${state.name.textContent}`);
      state.range.setAttribute("aria-label", `Volume for ${state.name.textContent}`);
      state.number.setAttribute("aria-label", `Volume percentage for ${state.name.textContent}`);
      state.number.max = String(getMaxVolume());
      if (!row.contains(document.activeElement) && !state.saving) {
        const value = tabSettings ? Number(tabSettings.volume) : tab.id === activeTabId ? Number(slider.value) : state.value;
        state.confirmed = Math.max(0, Math.min(getMaxVolume(), value));
        renderMixerRowVolume(row, state.confirmed);
      }
      // Preserve the focused control and its position during editing.
      if (!mixerTabList.contains(document.activeElement) && mixerTabList.children[index] !== row) {
        mixerTabList.insertBefore(row, mixerTabList.children[index] || null);
      } else if (!row.isConnected) mixerTabList.appendChild(row);
    });
  } catch (error) {
    if (!mixerRows.size) {
      const error = document.createElement("p");
      error.className = "mixerEmpty";
      error.textContent = "Tabs could not be loaded. Try refreshing.";
      mixerTabList.replaceChildren(error);
    }
  } finally {
    if (revision === mixerRefreshRevision) refreshMixerButton.disabled = false;
  }
}

function scheduleMixerRefresh() {
  window.clearTimeout(mixerRefreshTimer);
  mixerRefreshTimer = window.setTimeout(() => refreshMixerTabs(), 250);
}

function animateMixerRefresh() {
  refreshMixerButton.classList.remove("refreshing");
  void refreshMixerButton.offsetWidth;
  refreshMixerButton.classList.add("refreshing");
  window.setTimeout(() => refreshMixerButton.classList.remove("refreshing"), 620);
}

function formatSleepTimerRemaining(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function resizeSleepTimerBody(mutator, animate = true) {
  const currentHeight = sleepTimerBody.getBoundingClientRect().height;
  window.clearTimeout(sleepTimerResizeTimer);
  sleepTimerResizeTimer = null;
  sleepTimerBody.classList.remove("isResizing");
  sleepTimerBody.style.height = "auto";
  mutator();
  const targetHeight = sleepTimerBody.getBoundingClientRect().height;

  if (!animate || Math.abs(currentHeight - targetHeight) < 1) return;
  sleepTimerBody.style.height = `${currentHeight}px`;
  void sleepTimerBody.offsetHeight;
  sleepTimerBody.classList.add("isResizing");
  requestAnimationFrame(() => {
    sleepTimerBody.style.height = `${targetHeight}px`;
  });
  sleepTimerResizeTimer = window.setTimeout(() => {
    sleepTimerBody.classList.remove("isResizing");
    sleepTimerBody.style.height = "auto";
    sleepTimerResizeTimer = null;
  }, 360);
}

function renderSleepTimer(animate = true) {
  const active = sleepTimerEndsAt > Date.now();
  resizeSleepTimerBody(() => {
    sleepTimerOptions.classList.toggle("hidden", active);
    sleepTimerStatus.classList.toggle("hidden", !active);
    sleepTimerBadge.classList.toggle("hidden", !active);
    sleepTimerSection.classList.toggle("enabled", active);
    if (active) sleepTimerCountdown.textContent = formatSleepTimerRemaining(sleepTimerEndsAt - Date.now());
  }, animate);

  window.clearInterval(sleepTimerInterval);
  sleepTimerInterval = active
    ? window.setInterval(() => {
        if (sleepTimerEndsAt <= Date.now()) {
          sleepTimerEndsAt = 0;
          renderSleepTimer(true);
          return;
        }
        sleepTimerCountdown.textContent = formatSleepTimerRemaining(sleepTimerEndsAt - Date.now());
      }, 1000)
    : null;
}

function setSleepTimerMessage(message = "", success = false, animate = true) {
  resizeSleepTimerBody(() => {
    sleepTimerMessage.textContent = message;
    sleepTimerMessage.classList.toggle("hidden", !message);
    sleepTimerMessage.classList.toggle("success", success);
  }, animate);
}

function sleepTimerErrorMessage(error) {
  const message = String(error?.message || "");
  if (/receiving end|message port|cannot read properties of undefined|alarms/i.test(message)) {
    return "Reload Tab Volume Manager in chrome://extensions to finish enabling Sleep Timer.";
  }
  return message || "The sleep timer could not be started.";
}

async function startSleepTimer(totalMinutes) {
  const durationMinutes = Math.max(1, Math.min(10080, Math.round(Number(totalMinutes) || 0)));
  const buttons = Array.from(sleepTimerOptions.querySelectorAll("button"));
  buttons.forEach((button) => { button.disabled = true; });
  if (!chrome.alarms) {
    buttons.forEach((button) => { button.disabled = false; });
    setSleepTimerMessage("Reload Tab Volume Manager in chrome://extensions to finish enabling Sleep Timer.");
    return;
  }
  setSleepTimerMessage("Preparing audible tabs for a smooth fade…");

  try {
    const tabs = await chrome.tabs.query({ audible: true, currentWindow: true });
    if (tabs.length === 0) {
      setSleepTimerMessage("No audio is playing right now. The timer will still start and stop audio that is playing when it ends.");
    }
    await Promise.allSettled(tabs.map((tab) => {
      const storedVolume = Number(mixerVolumes[tab.id]);
      const fallbackVolume = tab.id === activeTabId ? Number(slider.value) : 100;
      return applyMixerVolume(tab, Number.isFinite(storedVolume) ? storedVolume : fallbackVolume);
    }));
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const targetTabIds = Array.from(new Set(tabs.map((tab) => tab.id)));
    const result = await chrome.runtime.sendMessage({
      type: "ZAZ_SLEEP_TIMER_SET",
      durationMinutes,
      windowId: currentTab?.windowId,
      tabIds: targetTabIds,
    });
    if (!result) {
      throw new Error("Reload Tab Volume Manager in chrome://extensions to finish enabling Sleep Timer.");
    }
    if (!result.ok) throw new Error(result.error || "The sleep timer could not be started.");
    sleepTimerEndsAt = Number(result.endsAt) || (Date.now() + durationMinutes * 60000);
    renderSleepTimer(true);
    const durationLabel = durationMinutes < 60
      ? `${durationMinutes} minutes`
      : durationMinutes === 60
        ? "1 hour"
        : formatSleepTimerRemaining(durationMinutes * 60000);
    const noAudioNote = tabs.length === 0
      ? " No audio is playing yet; anything playing when the timer ends will still be stopped."
      : "";
    setSleepTimerMessage(`Timer set for ${durationLabel}.${noAudioNote}`, true);
    window.setTimeout(() => setSleepTimerMessage(), 2600);
  } catch (error) {
    setSleepTimerMessage(sleepTimerErrorMessage(error));
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function cancelSleepTimer() {
  cancelSleepTimerButton.disabled = true;
  try {
    const result = await chrome.runtime.sendMessage({ type: "ZAZ_SLEEP_TIMER_CANCEL" });
    if (!result?.ok) throw new Error(result?.error || "The sleep timer could not be cancelled.");
    sleepTimerEndsAt = 0;
    renderSleepTimer(true);
    setSleepTimerMessage("Sleep timer cancelled.", true);
    window.setTimeout(() => setSleepTimerMessage(), 2200);
  } catch (error) {
    setSleepTimerMessage(error.message);
  } finally {
    cancelSleepTimerButton.disabled = false;
  }
}

async function syncSleepTimerState() {
  try {
    const result = await chrome.runtime.sendMessage({ type: "ZAZ_SLEEP_TIMER_GET" });
    sleepTimerEndsAt = result?.active ? Number(result.endsAt) || 0 : 0;
  } catch (error) {
    sleepTimerEndsAt = 0;
  }
  renderSleepTimer(false);
}

function setupSleepTimer() {
  sleepTimerOptions.querySelectorAll("[data-sleep-minutes]").forEach((button) => {
    button.addEventListener("click", () => startSleepTimer(Number(button.dataset.sleepMinutes)));
  });
  customSleepTimerButton.addEventListener("click", () => {
    customSleepTimerError.classList.add("hidden");
    openModal(customSleepTimerModal);
    requestAnimationFrame(() => customSleepHours.focus());
  });
  confirmCustomSleepTimer.addEventListener("click", () => {
    const hours = Math.max(0, Math.min(168, Number(customSleepHours.value) || 0));
    const minutes = Math.max(0, Math.min(59, Number(customSleepMinutes.value) || 0));
    const totalMinutes = Math.round(hours * 60 + minutes);
    if (totalMinutes < 1) {
      customSleepTimerError.classList.remove("hidden");
      customSleepMinutes.focus();
      return;
    }
    closeModal(customSleepTimerModal);
    startSleepTimer(totalMinutes);
  });
  [customSleepHours, customSleepMinutes].forEach((input) => {
    input.addEventListener("input", () => customSleepTimerError.classList.add("hidden"));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") confirmCustomSleepTimer.click();
    });
  });
  cancelSleepTimerButton.addEventListener("click", cancelSleepTimer);
  syncSleepTimerState();
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
  bindStereoTools();
  refreshMixerButton.addEventListener("click", () => {
    animateMixerRefresh();
    refreshMixerTabs();
  });
  mixerQuickEffects.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => changeMixerSound(sound => { sound.effectMode = button.dataset.mode; }));
  });
  mixerEffectSlider.addEventListener("input", () => changeMixerSound(sound => { sound.effectAmount = Number(mixerEffectSlider.value); }));
  document.getElementById("mixerSavePreset").addEventListener("click", () => openPresetDialog(savePresetModal, selectedMixerRow));
  document.getElementById("mixerLoadPreset").addEventListener("click", () => openPresetDialog(loadPresetModal, selectedMixerRow));
  document.getElementById("mixerResetEq").addEventListener("click", () => changeMixerSound(sound => { sound.eqBands = [...EQ_DEFAULTS]; }));
  chrome.tabs.onCreated.addListener(scheduleMixerRefresh);
  chrome.tabs.onRemoved.addListener(scheduleMixerRefresh);
  chrome.tabs.onUpdated.addListener((id, changes) => {
    if (["audible", "mutedInfo", "title", "url", "status"].some(key => key in changes)) scheduleMixerRefresh();
  });
  mixerTabList.addEventListener("focusout", scheduleMixerRefresh);
  setupSleepTimer();
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
  await powerReady;
  if (!extensionEnabled) return;
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
chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
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

  const savedTab = (await chrome.storage.session.get(`tvmTabSettings:${tab.id}`))[`tvmTabSettings:${tab.id}`];
  chrome.storage.local.get([hostname], (result) => {
    const preset = savedTab?.origin === new URL(tab.url).origin
      ? { ...savedTab.settings, proAudio: savedTab.settings.pro }
      : result[hostname];

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

// Distribution IDs distinguish Chrome Store installs even when running in Edge.
function reviewStore(extensionId, userAgent) {
  const isEdge = extensionId === "pkninbkmgnhgiahpgcifjebbkgmafhoo" ||
    (extensionId !== "hnpafnldgablhjgagcfhjjaaalliegef" && /Edg\//.test(userAgent));
  return isEdge
    ? { name: "Edge Add-ons", url: "https://microsoftedge.microsoft.com/addons/detail/pkninbkmgnhgiahpgcifjebbkgmafhoo" }
    : { name: "Chrome Web Store", url: "https://chromewebstore.google.com/detail/tab-volume-manager/hnpafnldgablhjgagcfhjjaaalliegef" };
}
const ratingStore = reviewStore(chrome.runtime.id, navigator.userAgent);
const ratingLink = document.getElementById("rateExtension");
ratingLink.textContent = `Rate the extension on ${ratingStore.name}`;
ratingLink.href = ratingStore.url;

const REVIEW_LINK_OPENED_KEY = "tvmReviewLinkOpened";
storageGet(REVIEW_LINK_OPENED_KEY).then(stored => {
  ratingLink.classList.toggle("hidden", Boolean(stored[REVIEW_LINK_OPENED_KEY]));
});
ratingLink.addEventListener("click", () => {
  ratingLink.classList.add("hidden");
  void storageSet({ [REVIEW_LINK_OPENED_KEY]: true });
});

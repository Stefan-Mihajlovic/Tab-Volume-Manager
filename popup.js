const themeToggle = document.getElementById("themeToggle");
const slider = document.getElementById("volumeSlider");
const effectSlider = document.getElementById("effectSlider");
const bassBoostBtn = document.getElementById("bassBoost");
const voiceBoostBtn = document.getElementById("voiceBoost");
const effectsOffBtn = document.getElementById("effectsOff");
const resetVolumeBtn = document.getElementById("resetVolume");
const resetEqualizerBtn = document.getElementById("resetEqualizer");
const siteFavicon = document.getElementById("siteFavicon");
const siteName = document.getElementById("siteName");
const volumePC = document.querySelector("#volumePC input");
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
const presetNameInput = document.getElementById("presetNameInput");
const presetNameError = document.getElementById("presetNameError");
const confirmSavePreset = document.getElementById("confirmSavePreset");
const savedPresetSlot = document.getElementById("savedPresetSlot");
const savedPresetName = document.getElementById("savedPresetName");
const savedPresetSummary = document.getElementById("savedPresetSummary");
const proStatusBadge = document.getElementById("proStatusBadge");
const proActivationState = document.getElementById("proActivationState");
const proActiveState = document.getElementById("proActiveState");
const proLicenseKeyInput = document.getElementById("proLicenseKeyInput");
const proLicenseMessage = document.getElementById("proLicenseMessage");
const proLicenseSummary = document.getElementById("proLicenseSummary");
const activateProButton = document.getElementById("activateProButton");
const getProButton = document.getElementById("getProButton");
const manageProButton = document.getElementById("manageProButton");
const deactivateProButton = document.getElementById("deactivateProButton");
const EQ_DEFAULTS = [0, 0, 0, 0, 0, 0];
const ACTIVE_TAB_KEY = "activeControlTab";
const SAVED_EQ_PRESET_KEY = "savedEqPreset";
const TVM_LICENSE_KEY = "tvmProLicenseKey";
const TVM_INSTALLATION_ID_KEY = "tvmProInstallationId";
const TVM_ENTITLEMENT_KEY = "tvmProEntitlement";
const TVM_LICENSE_META_KEY = "tvmProLicenseMeta";
const TVM_API_URL = "https://tvm-licensing-api.optiflowzoffice.workers.dev";
const TVM_PRO_URL = "https://stefanmihajlovic.com/tab-volume-manager/#pro";
const TVM_LICENSE_PUBLIC_JWK = {
  kty: "EC",
  x: "8Fd8yVpXuwL877LWa4AJv4gYG-km1QeQfH21XDgyp9Q",
  y: "M74OitFNOHGF8jxQpXyEEZJ5Z5BcHGcxxB4ykIet7r8",
  crv: "P-256",
};
const meterPort = chrome.runtime.connect({ name: "ZAZ_METER" });

let activeHostname = null;
let activeTabId = null;
let effectMode = "none";
let effectAmount = 10;
let eqBands = [...EQ_DEFAULTS];
let savedEqPreset = null;
let loadedPresetName = null;
let lastMeterUpdateAt = 0;

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(values) {
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

function storageRemove(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
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
  if (!entitlement?.token || typeof entitlement.expiresAt !== "number") return false;
  const parts = entitlement.token.split(".");
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
    const expectedInstallation = await installationClaim(installationId);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now || entitlement.expiresAt <= now) return false;
    if (payload.installation !== expectedInstallation) return false;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      TVM_LICENSE_PUBLIC_JWK,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
    return crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
  } catch (error) {
    return false;
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

function setProUiActive(license, offline = false) {
  proActivationState.classList.add("hidden");
  proActiveState.classList.remove("hidden");
  proStatusBadge.textContent = "✦ Pro active";
  const planName = license?.plan
    ? `${license.plan.charAt(0).toUpperCase()}${license.plan.slice(1)}`
    : "Pro";
  const suffix = license?.lastFour ? ` •••• ${license.lastFour}` : "";
  proLicenseSummary.textContent = `${planName} license${suffix} is active on this installation.`;
  setProMessage(offline ? "Offline verification active. We will sync again when online." : "License verified.", true);
}

function setProUiInactive(message = "") {
  proActiveState.classList.add("hidden");
  proActivationState.classList.remove("hidden");
  proStatusBadge.textContent = "✦ Pro access";
  setProMessage(message);
}

function setProButtonsDisabled(disabled) {
  [activateProButton, getProButton, manageProButton, deactivateProButton]
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
    if (!await verifyEntitlement(result.entitlement, installationId)) {
      throw new Error("The license server returned an invalid entitlement.");
    }
    await storeProAccess(licenseKey, result);
    setProUiActive(result.license);
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
    return;
  }

  proLicenseKeyInput.value = licenseKey;
  const installationId = await ensureInstallationId();
  try {
    const result = await postLicenseApi("/v1/license/validate", {
      licenseKey,
      installationId,
      extensionVersion: chrome.runtime.getManifest().version,
    });
    if (!await verifyEntitlement(result.entitlement, installationId)) {
      throw new Error("The license server returned an invalid entitlement.");
    }
    await storeProAccess(licenseKey, result);
    setProUiActive(result.license);
  } catch (error) {
    const cachedIsValid = await verifyEntitlement(stored[TVM_ENTITLEMENT_KEY], installationId);
    if ((!error.status || error.status >= 500) && cachedIsValid) {
      setProUiActive(stored[TVM_LICENSE_META_KEY], true);
      return;
    }
    await storageRemove([TVM_LICENSE_KEY, TVM_ENTITLEMENT_KEY, TVM_LICENSE_META_KEY]);
    const message = error.code === "license_inactive"
      ? "Your Pro license is no longer active."
      : error.code === "installation_not_activated"
        ? "This installation needs to be activated again."
        : "Could not verify the saved license.";
    setProUiInactive(message);
  }
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

async function deactivateProLicense() {
  setProButtonsDisabled(true);
  setProMessage("Deactivating this installation…");
  try {
    const stored = await storageGet([TVM_LICENSE_KEY, TVM_INSTALLATION_ID_KEY]);
    await postLicenseApi("/v1/license/deactivate", {
      licenseKey: stored[TVM_LICENSE_KEY],
      installationId: stored[TVM_INSTALLATION_ID_KEY],
    });
    await storageRemove([TVM_LICENSE_KEY, TVM_ENTITLEMENT_KEY, TVM_LICENSE_META_KEY]);
    proLicenseKeyInput.value = "";
    setProUiInactive("This installation was deactivated. The slot is free again.");
    setProMessage("This installation was deactivated. The slot is free again.", true);
  } catch (error) {
    setProMessage(error.message);
  } finally {
    setProButtonsDisabled(false);
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
  deactivateProButton.addEventListener("click", deactivateProLicense);
  validateStoredProLicense();
}

function applyTheme(theme) {
  const isLight = theme === "light";

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

function updateSavedPresetSlot() {
  const hasPreset = Boolean(savedEqPreset);
  savedPresetSlot.disabled = !hasPreset;
  savedPresetSlot.classList.toggle("emptyPresetSlot", !hasPreset);
  savedPresetName.textContent = hasPreset ? savedEqPreset.name : "Empty preset slot";
  savedPresetSummary.textContent = hasPreset
    ? "6-band EQ • Click to load"
    : "Save an EQ preset first";
}

function setupPresetControls() {
  chrome.storage.local.get(SAVED_EQ_PRESET_KEY, (result) => {
    const preset = result[SAVED_EQ_PRESET_KEY];
    if (
      preset &&
      typeof preset.name === "string" &&
      Array.isArray(preset.eqBands) &&
      preset.eqBands.length === 6
    ) {
      savedEqPreset = {
        name: preset.name,
        eqBands: preset.eqBands.map((band) => Math.max(-15, Math.min(15, Number(band) || 0))),
      };
    }
    updateSavedPresetSlot();
  });

  savePresetButton.addEventListener("click", () => {
    presetNameInput.value = savedEqPreset?.name || "";
    presetNameError.classList.add("hidden");
    openModal(savePresetModal);
    requestAnimationFrame(() => presetNameInput.focus());
  });

  loadPresetButton.addEventListener("click", () => {
    updateSavedPresetSlot();
    openModal(loadPresetModal);
  });

  confirmSavePreset.addEventListener("click", () => {
    const name = presetNameInput.value.trim();
    if (!name) {
      presetNameError.classList.remove("hidden");
      presetNameInput.focus();
      return;
    }

    savedEqPreset = { name, eqBands: eqBands.map(Number) };
    loadedPresetName = name;
    updatePresetStatus();
    updateSavedPresetSlot();
    savePreset(slider.value, effectMode, effectAmount);
    chrome.storage.local.set({ [SAVED_EQ_PRESET_KEY]: savedEqPreset });
    closeModal(savePresetModal);
  });

  presetNameInput.addEventListener("input", () => presetNameError.classList.add("hidden"));
  presetNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") confirmSavePreset.click();
  });

  savedPresetSlot.addEventListener("click", () => {
    if (!savedEqPreset) return;
    eqBands = [...savedEqPreset.eqBands];
    loadedPresetName = savedEqPreset.name;
    syncEqualizerUI();
    updatePresetStatus();
    updateAudio(slider.value);
    savePreset(slider.value, effectMode, effectAmount);
    closeModal(loadPresetModal);
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(document.getElementById(button.dataset.closeModal));
    });
  });

  [savePresetModal, loadPresetModal].forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeModal(savePresetModal);
    closeModal(loadPresetModal);
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

function savePreset(volume, mode, amount, bands = eqBands) {
  if (!activeHostname) return;

  chrome.storage.local.set({
    [activeHostname]: {
      volume: parseInt(volume, 10),
      effectMode: mode,
      effectAmount: parseInt(amount, 10),
      eqBands: bands.map((band) => parseInt(band, 10)),
      eqPresetName: loadedPresetName,
    },
  });
}

async function updateAudio(volume) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const settings = {
    volume: parseInt(volume, 10),
    effectMode,
    effectAmount,
    eqBands: eqBands.map(Number),
  };

  try {
    const result = await chrome.runtime.sendMessage({
      type: "ZAZ_CAPTURE_TAB",
      tabId: tab.id,
      settings,
    });

    if (result?.ok) return;
  } catch (error) {
    // Fall through to DOM processing on unsupported/restricted pages.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: (volumeLevel, selectedEffectMode, selectedEffectAmount, customBands) => {
        window.postMessage(
          {
            type: "ZAZ_VOLUME_UPDATE",
            volume: volumeLevel,
            effectMode: selectedEffectMode,
            effectAmount: selectedEffectAmount,
            eqBands: customBands,
          },
          "*"
        );
      },
      args: [settings.volume, effectMode, effectAmount, settings.eqBands],
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
    eqBands = Array.isArray(preset.eqBands) && preset.eqBands.length === 6
      ? preset.eqBands.map((band) => parseInt(band, 10) || 0)
      : [...EQ_DEFAULTS];
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
  const value = Math.max(0, Math.min(500, parseInt(e.target.value || "0", 10)));
  slider.value = value;
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

resetVolumeBtn.addEventListener("click", () => {
  slider.value = 100;
  updateAudio(100);
  savePreset(100, effectMode, effectAmount);
  updateVolumeProc();
});

updateVolumeProc();
updateEffectsIntensityProc();
syncEqualizerUI();
highlightSelectedButton(effectMode);
setupTabs();
setupPresetControls();
setupProLicensing();
updatePresetStatus();

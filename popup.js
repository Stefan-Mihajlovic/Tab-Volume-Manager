const themeToggle = document.getElementById("themeToggle");
const slider = document.getElementById("volumeSlider");
const effectSlider = document.getElementById("effectSlider");
const bassBoostBtn = document.getElementById("bassBoost");
const voiceBoostBtn = document.getElementById("voiceBoost");
const effectsOffBtn = document.getElementById("effectsOff");
const resetVolumeBtn = document.getElementById("resetVolume");
const toggleEqualizerBtn = document.getElementById("toggleEqualizer");
const equalizerPanel = document.getElementById("equalizerPanel");
const equalizerArrow = document.getElementById("equalizerArrow");
const resetEqualizerBtn = document.getElementById("resetEqualizer");
const siteFavicon = document.getElementById("siteFavicon");
const siteName = document.getElementById("siteName");
const volumePC = document.querySelector("#volumePC input");
const effectIntensityPC = document.querySelector("#effectIntensityPC input");
const eqSliders = Array.from(document.querySelectorAll(".eqSlider"));
const eqAreaPath = document.getElementById("eqAreaPath");
const eqLinePath = document.getElementById("eqLinePath");
const eqPointsGroup = document.getElementById("eqPoints");
const EQ_DEFAULTS = [0, 0, 0, 0, 0, 0];

let activeHostname = null;
let effectMode = "none";
let effectAmount = 10;
let eqBands = [...EQ_DEFAULTS];
let isEqualizerOpen = false;

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

function setEqualizerOpen(open) {
  isEqualizerOpen = open;
  equalizerPanel.classList.toggle("hidden", !open);
  equalizerPanel.setAttribute("aria-hidden", String(!open));
  toggleEqualizerBtn.setAttribute("aria-expanded", String(open));
  equalizerArrow.classList.toggle("open", open);
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

function createSmoothPath(points) {
  if (!points.length) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}

function renderEqualizerCurve() {
  const width = 320;
  const height = 62;
  const paddingX = 24;
  const topPadding = 11;
  const bottomPadding = 12;
  const usableHeight = height - topPadding - bottomPadding;
  const centerY = topPadding + usableHeight / 2;
  const maxDb = 12;

  const points = eqBands.map((band, index) => {
    const x = paddingX + ((width - paddingX * 2) / (eqBands.length - 1)) * index;
    const normalized = Math.max(-maxDb, Math.min(maxDb, Number(band)));
    const y = centerY - (normalized / maxDb) * (usableHeight / 2);
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });

  const linePath = createSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - bottomPadding} L ${points[0].x} ${height - bottomPadding} Z`;

  eqLinePath.setAttribute("d", linePath);
  eqAreaPath.setAttribute("d", areaPath);

  eqPointsGroup.innerHTML = points
    .map(
      (point) =>
        `<circle class="eqPointNode" cx="${point.x}" cy="${point.y}" r="4.5"></circle>`
    )
    .join("");
}

function syncEqualizerUI() {
  eqSliders.forEach((eqSlider, index) => {
    eqSlider.value = eqBands[index];
  });
  updateEqualizerLabels();
  renderEqualizerCurve();
}

function savePreset(volume, mode, amount, bands = eqBands) {
  if (!activeHostname) return;

  chrome.storage.local.set({
    [activeHostname]: {
      volume: parseInt(volume, 10),
      effectMode: mode,
      effectAmount: parseInt(amount, 10),
      eqBands: bands.map((band) => parseInt(band, 10)),
    },
  });
}

async function updateAudio(volume) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

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
      args: [parseInt(volume, 10), effectMode, effectAmount, eqBands.map(Number)],
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

    updateEffectsIntensityProc();
    updateVolumeProc();
    syncEqualizerUI();
    highlightSelectedButton(effectMode);
    updateAudio(slider.value);
  });
});

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

toggleEqualizerBtn.addEventListener("click", () => {
  setEqualizerOpen(!isEqualizerOpen);
});

eqSliders.forEach((eqSlider, index) => {
  eqSlider.addEventListener("input", (e) => {
    eqBands[index] = parseInt(e.target.value, 10);
    updateEqualizerLabels();
    renderEqualizerCurve();
    updateAudio(slider.value);
    savePreset(slider.value, effectMode, effectAmount);
  });
});

resetEqualizerBtn.addEventListener("click", () => {
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
setEqualizerOpen(false);
highlightSelectedButton(effectMode);

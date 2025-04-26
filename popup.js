const themeToggle = document.getElementById("themeToggle");
// Load theme preference
chrome.storage.local.get("theme", ({ theme }) => {
    if(theme === "light"){
        document.documentElement.style.setProperty("--bodyBackground", "#ffffff");
        document.documentElement.style.setProperty("--textColor", "black");
        document.documentElement.style.setProperty("--accentColor", "#4751e7");
        document.documentElement.style.setProperty("--accentDarker", "#313bc4");
        document.documentElement.style.setProperty("--buttonColor", "#dfdfdf");
        document.documentElement.style.setProperty("--buttonDarker", "#c3c6d4");
        themeToggle.checked = true;
      }else{
        document.documentElement.style.setProperty("--bodyBackground", "#16161b");
        document.documentElement.style.setProperty("--textColor", "white");
        document.documentElement.style.setProperty("--accentColor", "#4751e7");
        document.documentElement.style.setProperty("--accentDarker", "#313bc4");
        document.documentElement.style.setProperty("--buttonColor", "#414141");
        document.documentElement.style.setProperty("--buttonDarker", "#2d3036");
        themeToggle.checked = false;
      }
});

// Save theme preference
themeToggle.addEventListener("change", () => {
  const newTheme = themeToggle.checked ? "light" : "dark";
  if(newTheme === "light"){
    document.documentElement.style.setProperty("--bodyBackground", "#ffffff");
    document.documentElement.style.setProperty("--textColor", "black");
    document.documentElement.style.setProperty("--accentColor", "#4751e7");
    document.documentElement.style.setProperty("--accentDarker", "#313bc4");
    document.documentElement.style.setProperty("--buttonColor", "#dfdfdf");
    document.documentElement.style.setProperty("--buttonDarker", "#c3c6d4");
  }else{
    document.documentElement.style.setProperty("--bodyBackground", "#16161b");
    document.documentElement.style.setProperty("--textColor", "white");
    document.documentElement.style.setProperty("--accentColor", "#4751e7");
    document.documentElement.style.setProperty("--accentDarker", "#313bc4");
    document.documentElement.style.setProperty("--buttonColor", "#414141");
    document.documentElement.style.setProperty("--buttonDarker", "#2d3036");
  }
  chrome.storage.local.set({ theme: newTheme });
});

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  const hostname = new URL(tab.url).hostname;
  document.querySelector("#volumePC").parentElement.querySelector("p").innerHTML = `<img src="${tab.favIconUrl}">Volume`;
  chrome.storage.local.get([hostname], (result) => {
    const preset = result[hostname];
    if (preset) {
      slider.value = preset.volume;
      effectSlider.value = preset.effectAmount;
      effectMode = preset.effectMode;
      effectAmount = preset.effectAmount;
      updateEffectsIntensityProc();
      updateVolumeProc();
      highlightSelectedButton(effectMode);
      updateAudio(preset.volume);
    }
  });
});

function savePreset(volume, mode, amount) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const hostname = new URL(tab.url).hostname;
    chrome.storage.local.set({
      [hostname]: {
        volume: parseInt(volume),
        effectMode: mode,
        effectAmount: parseInt(amount),
      },
    });
  });
}

const slider = document.getElementById("volumeSlider");
const effectSlider = document.getElementById("effectSlider");
const bassBoostBtn = document.getElementById("bassBoost");
const voiceBoostBtn = document.getElementById("voiceBoost");
const effectsOffBtn = document.getElementById("effectsOff");
const resetVolumeBtn = document.getElementById("resetVolume");
let effectMode = "none";
let effectAmount = 10;

function highlightSelectedButton(mode) {
  [bassBoostBtn, voiceBoostBtn, effectsOffBtn].forEach((btn) =>
    btn.classList.remove("selected")
  );
  if (mode === "bass") bassBoostBtn.classList.add("selected");
  else if (mode === "voice") voiceBoostBtn.classList.add("selected");
  else effectsOffBtn.classList.add("selected");
}

async function updateAudio(volume) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log("[Popup] Applying audio settings:", {
    volume,
    effectMode,
    effectAmount,
  });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (volume, effectMode, effectAmount) => {
      const audios = document.querySelectorAll("video, audio");
      audios.forEach((el) => {
        if (!el._ctx) {
          el._ctx = new AudioContext();
          el._source = el._ctx.createMediaElementSource(el);
          el._gainNode = el._ctx.createGain();
        }

        el._bassNode = el._ctx.createBiquadFilter();
        el._bassNode.type = "lowshelf";
        el._bassNode.frequency.value = 200;
        el._bassNode.gain.value = effectMode === "bass" ? effectAmount : 0;

        el._voiceNode = el._ctx.createBiquadFilter();
        el._voiceNode.type = "peaking";
        el._voiceNode.frequency.value = 1500;
        el._voiceNode.Q.value = 1;
        el._voiceNode.gain.value = effectMode === "voice" ? effectAmount : 0;

        el._source.disconnect();
        el._gainNode.disconnect();
        try {
          el._bassNode.disconnect();
          el._voiceNode.disconnect();
        } catch (_) {}

        if (effectMode === "bass") {
          el._source
            .connect(el._bassNode)
            .connect(el._gainNode)
            .connect(el._ctx.destination);
        } else if (effectMode === "voice") {
          el._source
            .connect(el._voiceNode)
            .connect(el._gainNode)
            .connect(el._ctx.destination);
        } else {
          el._source.connect(el._gainNode).connect(el._ctx.destination);
        }

        el._gainNode.gain.value = volume / 100;
      });
    },
    args: [parseInt(volume), effectMode, effectAmount],
  });
}

const volumePC = document.querySelector("#volumePC input");
const effectIntensityPC = document.querySelector("#effectIntensityPC input");
volumePC.addEventListener("input", (e) => {
  updateAudio(e.target.value);
  savePreset(e.target.value, effectMode, effectAmount);
  slider.value = e.target.value;
});

effectIntensityPC.addEventListener("input", (e) => {
  effectAmount = parseInt(e.target.value / 5);
  updateAudio(slider.value);
  savePreset(slider.value, effectMode, effectAmount);
  effectSlider.value = effectAmount;
});

slider.addEventListener("input", (e) => {
  updateAudio(e.target.value);
  updateVolumeProc();
  savePreset(e.target.value, effectMode, effectAmount);
});

effectSlider.addEventListener("input", (e) => {
  effectAmount = parseInt(e.target.value);
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

resetVolumeBtn.addEventListener("click", () => {
  slider.value = 100;
  updateAudio(100);
  savePreset(100, effectMode, effectAmount);
  updateVolumeProc();
});

function updateVolumeProc() {
  volumePC.value = slider.value;
}

function updateEffectsIntensityProc() {
  effectIntensityPC.value = effectSlider.value * 5;
}
const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_Q_VALUES = [0.8, 1, 1, 1, 1, 1.1, 1.1, 1.2, 1, 0.8];
const sessions = new Map();
const METER_INTERVAL_MS = 50;
const METER_FLOOR_DB = -72;
const METER_CEILING_DB = -14;
const BASS_EFFECT_MULTIPLIER = 1.5;

function createFilter(context, index) {
  const filter = context.createBiquadFilter();
  filter.type = index === 0
    ? "lowshelf"
    : index === EQ_FREQUENCIES.length - 1
      ? "highshelf"
      : "peaking";
  filter.frequency.value = EQ_FREQUENCIES[index];
  filter.Q.value = EQ_Q_VALUES[index];
  return filter;
}

function effectCurve(mode, amount) {
  if (mode === "bass") {
    const boostedAmount = amount * BASS_EFFECT_MULTIPLIER;
    return [
      boostedAmount,
      boostedAmount * 0.72,
      boostedAmount * 0.4,
      boostedAmount * 0.2,
      boostedAmount * 0.08,
      0,
      -boostedAmount * 0.05,
      -boostedAmount * 0.12,
      -boostedAmount * 0.1,
      -boostedAmount * 0.08,
    ];
  }
  if (mode === "voice") {
    return [-amount * 0.15, -amount * 0.12, -amount * 0.05, amount * 0.1, amount * 0.25, amount * 0.55, amount * 0.75, amount * 0.85, amount * 0.3, amount * 0.1];
  }
  return EQ_FREQUENCIES.map(() => 0);
}

function readProTool(settings, name) {
  const tool = settings?.pro?.[name];
  return {
    enabled: Boolean(tool?.enabled),
    strength: Math.max(0, Math.min(100, Number(tool?.strength) || 0)),
  };
}

function applySettings(session, settings = {}) {
  const proIsCurrent = Number(settings.proValidUntil) > Date.now() / 1000;
  const effectiveSettings = proIsCurrent ? settings : { ...settings, pro: null };
  const maxVolume = proIsCurrent && settings.proPlan === "lifetime" ? 1500 : 500;
  const volume = Math.max(0, Math.min(maxVolume, Number(settings.volume) || 0));
  const amount = Math.max(0, Math.min(20, Number(settings.effectAmount) || 0));
  const mode = ["bass", "voice"].includes(settings.effectMode)
    ? settings.effectMode
    : "none";
  const bands = Array.isArray(settings.eqBands) ? settings.eqBands : [];
  const curve = effectCurve(mode, amount);
  const now = session.context.currentTime;
  const limiter = readProTool(effectiveSettings, "smartLimiter");
  const adaptive = readProTool(effectiveSettings, "adaptiveVolume");
  const dialogue = readProTool(effectiveSettings, "movieDialogue");
  session.lastSettings = effectiveSettings;

  session.gain.gain.setTargetAtTime(volume / 100, now, 0.015);
  session.effectBass.gain.setTargetAtTime(
    mode === "bass" ? amount * BASS_EFFECT_MULTIPLIER : 0,
    now,
    0.015
  );
  session.effectVoice.gain.setTargetAtTime(mode === "voice" ? amount : 0, now, 0.015);
  session.visualBandDb = [];
  session.filters.forEach((filter, index) => {
    const manual = Math.max(-15, Math.min(15, Number(bands[index]) || 0));
    const totalGainDb = manual + curve[index];
    filter.gain.setTargetAtTime(totalGainDb, now, 0.015);
    session.visualBandDb[index] = totalGainDb;
  });

  const dialogueAmount = dialogue.enabled ? dialogue.strength / 100 : 0;
  session.dialogueHighpass.frequency.setTargetAtTime(20 + dialogueAmount * 75, now, 0.03);
  session.dialogueWarmth.gain.setTargetAtTime(-3.5 * dialogueAmount, now, 0.03);
  session.dialoguePresence.gain.setTargetAtTime(6 * dialogueAmount, now, 0.03);
  session.dialogueCompressor.threshold.setTargetAtTime(dialogue.enabled ? -25 : 0, now, 0.03);
  session.dialogueCompressor.knee.setTargetAtTime(dialogue.enabled ? 16 : 0, now, 0.03);
  session.dialogueCompressor.ratio.setTargetAtTime(dialogue.enabled ? 1.5 + dialogueAmount * 2.5 : 1, now, 0.03);
  session.dialogueCompressor.attack.setTargetAtTime(0.008, now, 0.03);
  session.dialogueCompressor.release.setTargetAtTime(0.22, now, 0.03);

  const adaptiveAmount = adaptive.enabled ? adaptive.strength / 100 : 0;
  session.adaptiveCompressor.threshold.setTargetAtTime(adaptive.enabled ? -18 - adaptiveAmount * 20 : 0, now, 0.04);
  session.adaptiveCompressor.knee.setTargetAtTime(adaptive.enabled ? 12 + adaptiveAmount * 16 : 0, now, 0.04);
  session.adaptiveCompressor.ratio.setTargetAtTime(adaptive.enabled ? 1.5 + adaptiveAmount * 4.5 : 1, now, 0.04);
  session.adaptiveCompressor.attack.setTargetAtTime(0.012, now, 0.04);
  session.adaptiveCompressor.release.setTargetAtTime(0.35, now, 0.04);
  session.adaptiveGain.gain.setTargetAtTime(
    adaptive.enabled ? Math.pow(10, (adaptiveAmount * 5) / 20) : 1,
    now,
    0.04
  );

  const limiterAmount = limiter.enabled ? limiter.strength / 100 : 0;
  session.limiter.threshold.setTargetAtTime(limiter.enabled ? -1 - limiterAmount * 3.5 : 0, now, 0.015);
  session.limiter.knee.setTargetAtTime(limiter.enabled ? 1.5 : 0, now, 0.015);
  session.limiter.ratio.setTargetAtTime(limiter.enabled ? 8 + limiterAmount * 12 : 1, now, 0.015);
  session.limiter.attack.setTargetAtTime(0.002, now, 0.015);
  session.limiter.release.setTargetAtTime(0.12, now, 0.015);
}

async function createSession(tabId, streamId, settings) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  const effectBass = context.createBiquadFilter();
  const effectVoice = context.createBiquadFilter();
  const filters = EQ_FREQUENCIES.map((_, index) => createFilter(context, index));
  const dialogueHighpass = context.createBiquadFilter();
  const dialogueWarmth = context.createBiquadFilter();
  const dialoguePresence = context.createBiquadFilter();
  const dialogueCompressor = context.createDynamicsCompressor();
  const adaptiveCompressor = context.createDynamicsCompressor();
  const adaptiveGain = context.createGain();
  const gain = context.createGain();
  const limiter = context.createDynamicsCompressor();

  effectBass.type = "lowshelf";
  effectBass.frequency.value = 180;
  effectBass.gain.value = 0;
  effectVoice.type = "peaking";
  effectVoice.frequency.value = 2200;
  effectVoice.Q.value = 1.1;
  effectVoice.gain.value = 0;
  dialogueHighpass.type = "highpass";
  dialogueHighpass.frequency.value = 20;
  dialogueWarmth.type = "lowshelf";
  dialogueWarmth.frequency.value = 220;
  dialoguePresence.type = "peaking";
  dialoguePresence.frequency.value = 2600;
  dialoguePresence.Q.value = 1.05;

  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0.42;
  analyser.minDecibels = -100;
  analyser.maxDecibels = -10;

  source.connect(analyser);
  analyser.connect(effectBass);
  effectBass.connect(effectVoice);
  let current = effectVoice;
  filters.forEach((filter) => {
    current.connect(filter);
    current = filter;
  });
  current.connect(dialogueHighpass);
  dialogueHighpass.connect(dialogueWarmth);
  dialogueWarmth.connect(dialoguePresence);
  dialoguePresence.connect(dialogueCompressor);
  dialogueCompressor.connect(adaptiveCompressor);
  adaptiveCompressor.connect(adaptiveGain);
  adaptiveGain.connect(gain);
  gain.connect(limiter);
  limiter.connect(context.destination);
  await context.resume();

  const session = {
    context,
    stream,
    analyser,
    frequencyData: new Uint8Array(analyser.frequencyBinCount),
    floatFrequencyData: new Float32Array(analyser.frequencyBinCount),
    previousFrequencyData: new Uint8Array(analyser.frequencyBinCount),
    displayedLevels: EQ_FREQUENCIES.map(() => 0),
    staleSpectrumFrames: 0,
    effectBass,
    effectVoice,
    filters,
    dialogueHighpass,
    dialogueWarmth,
    dialoguePresence,
    dialogueCompressor,
    adaptiveCompressor,
    adaptiveGain,
    gain,
    limiter,
    visualBandDb: EQ_FREQUENCIES.map(() => 0),
    meterTimer: null,
    lastSettings: null,
  };
  sessions.set(tabId, session);
  applySettings(session, settings);
  startMeter(tabId, session);

  stream.getAudioTracks()[0]?.addEventListener("ended", () => {
    if (sessions.get(tabId) === session) sessions.delete(tabId);
    clearInterval(session.meterTimer);
    context.close().catch(() => {});
  });
}

function readBandLevels(session) {
  session.analyser.getByteFrequencyData(session.frequencyData);
  session.analyser.getFloatFrequencyData(session.floatFrequencyData);
  const nyquist = session.context.sampleRate / 2;
  const binHz = nyquist / session.frequencyData.length;
  let spectrumChange = 0;
  let spectrumPeak = 0;

  for (let bin = 1; bin < session.frequencyData.length; bin += 16) {
    const value = session.frequencyData[bin];
    spectrumChange += Math.abs(value - session.previousFrequencyData[bin]);
    spectrumPeak = Math.max(spectrumPeak, value);
  }

  session.previousFrequencyData.set(session.frequencyData);
  session.staleSpectrumFrames = spectrumChange < 24
    ? session.staleSpectrumFrames + 1
    : 0;

  const spectrumInactive = spectrumPeak < 3 || session.staleSpectrumFrames >= 5;

  const targetLevels = EQ_FREQUENCIES.map((center, index) => {
    const lowerCenter = EQ_FREQUENCIES[index - 1] || center / 2;
    const upperCenter = EQ_FREQUENCIES[index + 1] || Math.min(nyquist, center * 2);
    const lowHz = Math.sqrt(lowerCenter * center);
    const highHz = Math.sqrt(center * upperCenter);
    const startBin = Math.max(1, Math.floor(lowHz / binHz));
    const endBin = Math.min(session.frequencyData.length - 1, Math.ceil(highHz / binHz));
    let powerSum = 0;
    let peakDb = -Infinity;
    let count = 0;

    for (let bin = startBin; bin <= endBin; bin += 1) {
      const db = session.floatFrequencyData[bin];
      if (!Number.isFinite(db)) continue;
      powerSum += Math.pow(10, db / 10);
      peakDb = Math.max(peakDb, db);
      count += 1;
    }

    const averagePowerDb = count && powerSum > 0
      ? 10 * Math.log10(powerSum / count)
      : METER_FLOOR_DB;
    const signalDb = Math.max(averagePowerDb, peakDb - 5);
    const bandDb = Number(session.visualBandDb[index] || 0);
    const adjustedDb = signalDb + bandDb * 2;
    const adjustedPercent =
      ((adjustedDb - METER_FLOOR_DB) / (METER_CEILING_DB - METER_FLOOR_DB)) * 100;

    return spectrumInactive
      ? 0
      : Math.max(0, Math.min(100, adjustedPercent));
  });

  return targetLevels.map((target, index) => {
    const previous = session.displayedLevels[index] || 0;
    const response = target > previous ? 0.74 : 0.34;
    let displayed = previous + (target - previous) * response;

    if (target === 0 && displayed < 0.5) displayed = 0;
    session.displayedLevels[index] = displayed;
    return Math.round(displayed);
  });
}

function startMeter(tabId, session) {
  session.meterTimer = setInterval(() => {
    if (sessions.get(tabId) !== session) return;

    try {
      if (session.lastSettings?.pro && Number(session.lastSettings.proValidUntil) <= Date.now() / 1000) {
        applySettings(session, { ...session.lastSettings, pro: null, proValidUntil: 0 });
      }
      chrome.runtime.sendMessage(
        {
          type: "ZAZ_EQ_LEVELS",
          target: "background",
          tabId,
          levels: readBandLevels(session),
        },
        () => void chrome.runtime.lastError
      );
    } catch (error) {
      // The background worker may be restarting between meter frames.
    }
  }, METER_INTERVAL_MS);
}

async function stopSession(tabId) {
  const session = sessions.get(tabId);
  if (!session) return;
  sessions.delete(tabId);
  clearInterval(session.meterTimer);
  session.stream.getTracks().forEach((track) => track.stop());
  await session.context.close().catch(() => {});
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ZAZ_OFFSCREEN_STATUS" && message.target === "offscreen") {
    sendResponse({ ok: true, tabIds: Array.from(sessions.keys()) });
    return false;
  }

  if (message?.target !== "offscreen") return false;

  (async () => {
    if (message.type === "ZAZ_OFFSCREEN_STOP") {
      await stopSession(message.tabId);
      return { ok: true };
    }

    if (message.type !== "ZAZ_OFFSCREEN_UPDATE") return { ok: false };

    const existing = sessions.get(message.tabId);
    if (existing) {
      applySettings(existing, message.settings);
    } else if (message.streamId) {
      await createSession(message.tabId, message.streamId, message.settings);
    } else {
      return { ok: false, needsStream: true };
    }
    return { ok: true };
  })()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

const EQ_FREQUENCIES = [32, 64, 250, 1000, 4000, 8000];
const EQ_Q_VALUES = [0.8, 1, 1, 1.1, 1.2, 0.8];
const sessions = new Map();
const METER_INTERVAL_MS = 50;
const METER_FLOOR_DB = -72;
const METER_CEILING_DB = -14;

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
    return [amount, amount * 0.55, amount * 0.2, 0, -amount * 0.15, -amount * 0.1];
  }
  if (mode === "voice") {
    return [-amount * 0.15, -amount * 0.1, amount * 0.25, amount * 0.55, amount * 0.85, amount * 0.2];
  }
  return [0, 0, 0, 0, 0, 0];
}

function applySettings(session, settings = {}) {
  const volume = Math.max(0, Math.min(500, Number(settings.volume) || 0));
  const amount = Math.max(0, Math.min(20, Number(settings.effectAmount) || 0));
  const mode = ["bass", "voice"].includes(settings.effectMode)
    ? settings.effectMode
    : "none";
  const bands = Array.isArray(settings.eqBands) ? settings.eqBands : [];
  const curve = effectCurve(mode, amount);
  const now = session.context.currentTime;

  session.gain.gain.setTargetAtTime(volume / 100, now, 0.015);
  session.visualBandDb = [];
  session.filters.forEach((filter, index) => {
    const manual = Math.max(-12, Math.min(12, Number(bands[index]) || 0));
    const totalGainDb = manual + curve[index];
    filter.gain.setTargetAtTime(totalGainDb, now, 0.015);
    session.visualBandDb[index] = totalGainDb;
  });
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
  const filters = EQ_FREQUENCIES.map((_, index) => createFilter(context, index));
  const gain = context.createGain();

  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0.42;
  analyser.minDecibels = -100;
  analyser.maxDecibels = -10;

  source.connect(analyser);
  let current = analyser;
  filters.forEach((filter) => {
    current.connect(filter);
    current = filter;
  });
  current.connect(gain);
  gain.connect(context.destination);
  await context.resume();

  const session = {
    context,
    stream,
    analyser,
    frequencyData: new Uint8Array(analyser.frequencyBinCount),
    floatFrequencyData: new Float32Array(analyser.frequencyBinCount),
    previousFrequencyData: new Uint8Array(analyser.frequencyBinCount),
    displayedLevels: [0, 0, 0, 0, 0, 0],
    staleSpectrumFrames: 0,
    filters,
    gain,
    visualBandDb: [0, 0, 0, 0, 0, 0],
    meterTimer: null,
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

    chrome.runtime.sendMessage({
      type: "ZAZ_EQ_LEVELS",
      target: "background",
      tabId,
      levels: readBandLevels(session),
    }).catch(() => {});
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

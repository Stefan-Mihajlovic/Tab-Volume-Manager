const EQ_FREQUENCIES = [32, 64, 250, 1000, 4000, 8000];
const EQ_Q_VALUES = [0.8, 1, 1, 1.1, 1.2, 0.8];
const sessions = new Map();

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
  session.filters.forEach((filter, index) => {
    const manual = Math.max(-12, Math.min(12, Number(bands[index]) || 0));
    filter.gain.setTargetAtTime(manual + curve[index], now, 0.015);
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
  const filters = EQ_FREQUENCIES.map((_, index) => createFilter(context, index));
  const gain = context.createGain();

  let current = source;
  filters.forEach((filter) => {
    current.connect(filter);
    current = filter;
  });
  current.connect(gain);
  gain.connect(context.destination);

  const session = { context, stream, filters, gain };
  sessions.set(tabId, session);
  applySettings(session, settings);

  stream.getAudioTracks()[0]?.addEventListener("ended", () => {
    if (sessions.get(tabId) === session) sessions.delete(tabId);
    context.close().catch(() => {});
  });
}

async function stopSession(tabId) {
  const session = sessions.get(tabId);
  if (!session) return;
  sessions.delete(tabId);
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

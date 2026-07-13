(function () {
  "use strict";

  const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const EQ_Q_VALUES = [0.8, 1, 1, 1, 1, 1.1, 1.1, 1.2, 1, 0.8];
  const BASS_EFFECT_MULTIPLIER = 1.5;

  window.__zazVolumeManager = {
    gain: 1,
    effectMode: "none",
    effectAmount: 0,
    eqBands: EQ_FREQUENCIES.map(() => 0),
    pro: null,
    proValidUntil: 0,
    proExpiryTimer: null,
    nodes: new WeakMap(),
    contexts: new Set(),
  };

  const manager = window.__zazVolumeManager;

  function createEqFilter(ctx, index) {
    const filter = ctx.createBiquadFilter();

    if (index === 0) {
      filter.type = "lowshelf";
    } else if (index === EQ_FREQUENCIES.length - 1) {
      filter.type = "highshelf";
    } else {
      filter.type = "peaking";
    }

    filter.frequency.value = EQ_FREQUENCIES[index];
    filter.Q.value = EQ_Q_VALUES[index];
    filter.gain.value = 0;

    return filter;
  }

  function createProcessingChain(ctx) {
    const gain = ctx.createGain();
    const effectBass = ctx.createBiquadFilter();
    const effectVoice = ctx.createBiquadFilter();
    const eqFilters = EQ_FREQUENCIES.map((_, index) => createEqFilter(ctx, index));
    const dialogueHighpass = ctx.createBiquadFilter();
    const dialogueWarmth = ctx.createBiquadFilter();
    const dialoguePresence = ctx.createBiquadFilter();
    const dialogueCompressor = ctx.createDynamicsCompressor();
    const adaptiveCompressor = ctx.createDynamicsCompressor();
    const adaptiveGain = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();

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

    gain.gain.value = manager.gain;

    effectBass.connect(effectVoice);

    let currentNode = effectVoice;
    eqFilters.forEach((filter) => {
      currentNode.connect(filter);
      currentNode = filter;
    });

    currentNode.connect(dialogueHighpass);
    dialogueHighpass.connect(dialogueWarmth);
    dialogueWarmth.connect(dialoguePresence);
    dialoguePresence.connect(dialogueCompressor);
    dialogueCompressor.connect(adaptiveCompressor);
    adaptiveCompressor.connect(adaptiveGain);
    adaptiveGain.connect(gain);
    gain.connect(limiter);
    limiter.connect(ctx.destination);

    return {
      gain, effectBass, effectVoice, eqFilters, dialogueHighpass, dialogueWarmth,
      dialoguePresence, dialogueCompressor, adaptiveCompressor, adaptiveGain, limiter,
    };
  }

  function getEffectCurve(mode, amount) {
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

  function readProTool(name) {
    const tool = manager.pro?.[name];
    return {
      enabled: Boolean(tool?.enabled),
      strength: Math.max(0, Math.min(100, Number(tool?.strength) || 0)),
    };
  }

  function applySettings() {
    const effectCurve = getEffectCurve(manager.effectMode, manager.effectAmount);

    manager.contexts.forEach((ctx) => {
      const nodes = manager.nodes.get(ctx);
      if (!nodes) return;

      nodes.gain.gain.value = manager.gain;
      nodes.effectBass.gain.value = manager.effectMode === "bass"
        ? manager.effectAmount * BASS_EFFECT_MULTIPLIER
        : 0;
      nodes.effectVoice.gain.value = manager.effectMode === "voice" ? manager.effectAmount : 0;

      nodes.eqFilters.forEach((filter, index) => {
        const manualEq = Number(manager.eqBands[index] ?? 0);
        filter.gain.value = manualEq + effectCurve[index];
      });

      const now = ctx.currentTime;
      const dialogue = readProTool("movieDialogue");
      const dialogueAmount = dialogue.enabled ? dialogue.strength / 100 : 0;
      nodes.dialogueHighpass.frequency.setTargetAtTime(20 + dialogueAmount * 75, now, 0.03);
      nodes.dialogueWarmth.gain.setTargetAtTime(-3.5 * dialogueAmount, now, 0.03);
      nodes.dialoguePresence.gain.setTargetAtTime(6 * dialogueAmount, now, 0.03);
      nodes.dialogueCompressor.threshold.setTargetAtTime(dialogue.enabled ? -25 : 0, now, 0.03);
      nodes.dialogueCompressor.knee.setTargetAtTime(dialogue.enabled ? 16 : 0, now, 0.03);
      nodes.dialogueCompressor.ratio.setTargetAtTime(dialogue.enabled ? 1.5 + dialogueAmount * 2.5 : 1, now, 0.03);

      const adaptive = readProTool("adaptiveVolume");
      const adaptiveAmount = adaptive.enabled ? adaptive.strength / 100 : 0;
      nodes.adaptiveCompressor.threshold.setTargetAtTime(adaptive.enabled ? -18 - adaptiveAmount * 20 : 0, now, 0.04);
      nodes.adaptiveCompressor.knee.setTargetAtTime(adaptive.enabled ? 12 + adaptiveAmount * 16 : 0, now, 0.04);
      nodes.adaptiveCompressor.ratio.setTargetAtTime(adaptive.enabled ? 1.5 + adaptiveAmount * 4.5 : 1, now, 0.04);
      nodes.adaptiveGain.gain.setTargetAtTime(adaptive.enabled ? Math.pow(10, (adaptiveAmount * 5) / 20) : 1, now, 0.04);

      const limiter = readProTool("smartLimiter");
      const limiterAmount = limiter.enabled ? limiter.strength / 100 : 0;
      nodes.limiter.threshold.setTargetAtTime(limiter.enabled ? -1 - limiterAmount * 3.5 : 0, now, 0.015);
      nodes.limiter.knee.setTargetAtTime(limiter.enabled ? 1.5 : 0, now, 0.015);
      nodes.limiter.ratio.setTargetAtTime(limiter.enabled ? 8 + limiterAmount * 12 : 1, now, 0.015);
    });
  }

  const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;

  if (OriginalAudioContext) {
    const originalConnect = AudioNode.prototype.connect;

    function PatchedAudioContext(...args) {
      const ctx = new OriginalAudioContext(...args);
      const chain = createProcessingChain(ctx);

      manager.nodes.set(ctx, chain);
      manager.contexts.add(ctx);

      ctx.__zazDestination = chain.effectBass;
      ctx.__realDestination = ctx.destination;

      return ctx;
    }

    PatchedAudioContext.prototype = OriginalAudioContext.prototype;
    Object.setPrototypeOf(PatchedAudioContext, OriginalAudioContext);

    AudioNode.prototype.connect = function (dest, ...args) {
      const ctx = this.context;
      if (
        dest === ctx.destination &&
        ctx.__zazDestination &&
        this !== manager.nodes.get(ctx)?.gain
      ) {
        return originalConnect.call(this, ctx.__zazDestination, ...args);
      }

      return originalConnect.call(this, dest, ...args);
    };

    window.AudioContext = PatchedAudioContext;
    if (window.webkitAudioContext) {
      window.webkitAudioContext = PatchedAudioContext;
    }
  }

  function processMediaElement(el) {
    if (el.__zazProcessed) return;
    el.__zazProcessed = true;

    const setup = () => {
      try {
        if (el.__zazCtx || !OriginalAudioContext) return;

        const ctx = new OriginalAudioContext();
        const source = ctx.createMediaElementSource(el);
        const chain = createProcessingChain(ctx);

        source.connect(chain.effectBass);

        el.__zazCtx = ctx;
        manager.nodes.set(ctx, chain);
        manager.contexts.add(ctx);

        applySettings();
      } catch (e) {
        // Ignore media that cannot be patched.
      }
    };

    if (el.readyState >= 1) {
      setup();
    } else {
      el.addEventListener("loadedmetadata", setup, { once: true });
    }
  }

  function observeMedia() {
    document.querySelectorAll("video, audio").forEach(processMediaElement);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeName === "VIDEO" || node.nodeName === "AUDIO") {
            processMediaElement(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll("video, audio").forEach(processMediaElement);
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeMedia);
  } else {
    observeMedia();
  }

  window.addEventListener("message", (e) => {
    if (e.data?.type === "ZAZ_VOLUME_UPDATE") {
      manager.gain = e.data.volume / 100;
      manager.effectMode = e.data.effectMode;
      manager.effectAmount = e.data.effectAmount;
      manager.eqBands = Array.isArray(e.data.eqBands) && e.data.eqBands.length === 10
        ? e.data.eqBands.map((band) => Number(band) || 0)
        : EQ_FREQUENCIES.map(() => 0);
      manager.proValidUntil = Number(e.data.proValidUntil) || 0;
      manager.pro = manager.proValidUntil > Date.now() / 1000 ? e.data.pro || null : null;
      clearTimeout(manager.proExpiryTimer);
      if (manager.pro) {
        const expiryDelay = Math.max(0, Math.min(2147483647, manager.proValidUntil * 1000 - Date.now()));
        manager.proExpiryTimer = setTimeout(() => {
          manager.pro = null;
          manager.proValidUntil = 0;
          applySettings();
        }, expiryDelay);
      }
      applySettings();
    }
  });
})();

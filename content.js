(function () {
  "use strict";

  const EQ_FREQUENCIES = [32, 64, 250, 1000, 4000, 8000];
  const EQ_Q_VALUES = [0.8, 1, 1, 1.1, 1.2, 0.8];

  window.__zazVolumeManager = {
    gain: 1,
    effectMode: "none",
    effectAmount: 0,
    eqBands: [0, 0, 0, 0, 0, 0],
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

    effectBass.type = "lowshelf";
    effectBass.frequency.value = 180;
    effectBass.gain.value = 0;

    effectVoice.type = "peaking";
    effectVoice.frequency.value = 2200;
    effectVoice.Q.value = 1.1;
    effectVoice.gain.value = 0;

    gain.gain.value = manager.gain;

    effectBass.connect(effectVoice);

    let currentNode = effectVoice;
    eqFilters.forEach((filter) => {
      currentNode.connect(filter);
      currentNode = filter;
    });

    currentNode.connect(gain);
    gain.connect(ctx.destination);

    return { gain, effectBass, effectVoice, eqFilters };
  }

  function getEffectCurve(mode, amount) {
    if (mode === "bass") {
      return [amount, amount * 0.55, amount * 0.2, 0, -amount * 0.15, -amount * 0.1];
    }

    if (mode === "voice") {
      return [-amount * 0.15, -amount * 0.1, amount * 0.25, amount * 0.55, amount * 0.85, amount * 0.2];
    }

    return [0, 0, 0, 0, 0, 0];
  }

  function applySettings() {
    const effectCurve = getEffectCurve(manager.effectMode, manager.effectAmount);

    manager.contexts.forEach((ctx) => {
      const nodes = manager.nodes.get(ctx);
      if (!nodes) return;

      nodes.gain.gain.value = manager.gain;
      nodes.effectBass.gain.value = manager.effectMode === "bass" ? manager.effectAmount : 0;
      nodes.effectVoice.gain.value = manager.effectMode === "voice" ? manager.effectAmount : 0;

      nodes.eqFilters.forEach((filter, index) => {
        const manualEq = Number(manager.eqBands[index] ?? 0);
        filter.gain.value = manualEq + effectCurve[index];
      });
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
      manager.eqBands = Array.isArray(e.data.eqBands) && e.data.eqBands.length === 6
        ? e.data.eqBands.map((band) => Number(band) || 0)
        : [0, 0, 0, 0, 0, 0];
      applySettings();
    }
  });
})();

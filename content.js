(function () {
  "use strict";

  // Global state
  window.__zazVolumeManager = {
    gain: 1,
    effectMode: "none",
    effectAmount: 0,
    nodes: new WeakMap(),
    contexts: new Set(),
  };

  const manager = window.__zazVolumeManager;

  // Create processing chain for a context
  function createProcessingChain(ctx) {
    const gain = ctx.createGain();
    const bass = ctx.createBiquadFilter();
    const voice = ctx.createBiquadFilter();

    bass.type = "lowshelf";
    bass.frequency.value = 200;
    bass.gain.value = 0;

    voice.type = "peaking";
    voice.frequency.value = 1500;
    voice.Q.value = 1;
    voice.gain.value = 0;

    gain.gain.value = manager.gain;

    return { gain, bass, voice };
  }

  // Apply current settings to all contexts
  function applySettings() {
    manager.contexts.forEach((ctx) => {
      const nodes = manager.nodes.get(ctx);
      if (!nodes) return;

      nodes.gain.gain.value = manager.gain;
      nodes.bass.gain.value = manager.effectMode === "bass" ? manager.effectAmount : 0;
      nodes.voice.gain.value = manager.effectMode === "voice" ? manager.effectAmount : 0;
    });
  }

  // Override AudioContext
  const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;

  if (OriginalAudioContext) {
    const originalConnect = AudioNode.prototype.connect;

    function PatchedAudioContext(...args) {
      const ctx = new OriginalAudioContext(...args);
      const chain = createProcessingChain(ctx);

      // Connect chain: bass -> voice -> gain -> destination
      chain.bass.connect(chain.voice);
      chain.voice.connect(chain.gain);
      chain.gain.connect(ctx.destination);

      manager.nodes.set(ctx, chain);
      manager.contexts.add(ctx);

      // Create a proxy destination
      ctx.__zazDestination = chain.bass;
      ctx.__realDestination = ctx.destination;

      return ctx;
    }

    PatchedAudioContext.prototype = OriginalAudioContext.prototype;
    Object.setPrototypeOf(PatchedAudioContext, OriginalAudioContext);

    // Intercept connections to destination
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

  // Handle <audio> and <video> elements
  function processMediaElement(el) {
    if (el.__zazProcessed) return;
    el.__zazProcessed = true;

    // Wait for the element to be ready
    const setup = () => {
      try {
        if (el.__zazCtx) return;

        const ctx = new OriginalAudioContext();
        const source = ctx.createMediaElementSource(el);
        const chain = createProcessingChain(ctx);

        source.connect(chain.bass);
        chain.bass.connect(chain.voice);
        chain.voice.connect(chain.gain);
        chain.gain.connect(ctx.destination);

        el.__zazCtx = ctx;
        manager.nodes.set(ctx, chain);
        manager.contexts.add(ctx);

        applySettings();
      } catch (e) {
        // CORS or already connected - ignore
      }
    };

    if (el.readyState >= 1) {
      setup();
    } else {
      el.addEventListener("loadedmetadata", setup, { once: true });
    }
  }

  // Observe DOM for media elements
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

  // Listen for messages from popup
  window.addEventListener("message", (e) => {
    if (e.data?.type === "ZAZ_VOLUME_UPDATE") {
      manager.gain = e.data.volume / 100;
      manager.effectMode = e.data.effectMode;
      manager.effectAmount = e.data.effectAmount;
      applySettings();
    }
  });
})();
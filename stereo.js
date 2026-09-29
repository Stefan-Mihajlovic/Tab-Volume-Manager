(function () {
  "use strict";

  function bounded(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function normalize(settings) {
    return {
      enabled: Boolean(settings?.enabled),
      balance: bounded(settings?.balance, -100, 100, 0),
      width: bounded(settings?.width, 0, 200, 100),
      swap: Boolean(settings?.swap),
    };
  }

  function coefficients(settings) {
    const stereo = normalize(settings);
    if (!stereo.enabled) return [1, 0, 0, 1];
    const width = stereo.width / 100;
    // Mid/side width, with headroom so widening cannot amplify channel peaks.
    const headroom = Math.max(1, width);
    const direct = (1 + width) / (2 * headroom);
    const cross = (1 - width) / (2 * headroom);
    const left = 1 - Math.max(0, stereo.balance / 100);
    const right = 1 + Math.min(0, stereo.balance / 100);
    return stereo.swap
      ? [cross * left, direct * left, direct * right, cross * right]
      : [direct * left, cross * left, cross * right, direct * right];
  }

  function create(context) {
    const input = context.createGain();
    // Upmix mono to both channels before splitting; preserve stereo channels.
    input.channelCount = 2;
    input.channelCountMode = "explicit";
    input.channelInterpretation = "speakers";
    const splitter = context.createChannelSplitter(2);
    const output = context.createChannelMerger(2);
    const matrix = Array.from({ length: 4 }, () => context.createGain());
    input.connect(splitter);
    matrix.forEach((gain, index) => {
      gain.gain.value = index === 0 || index === 3 ? 1 : 0;
      splitter.connect(gain, index % 2);
      gain.connect(output, 0, Math.floor(index / 2));
    });
    return { input, output, matrix };
  }

  function apply(nodes, settings, now) {
    coefficients(settings).forEach((value, index) => {
      nodes.matrix[index].gain.setTargetAtTime(value, now, 0.015);
    });
  }

  globalThis.TvmStereo = Object.freeze({ normalize, coefficients, create, apply });
})();

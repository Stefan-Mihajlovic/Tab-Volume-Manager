(async function () {
  const cases = [
    ["Original stereo", { enabled: true }, [0.2, -0.1], [0.2, -0.1]],
    ["Disabled tools bypass all controls", { enabled: false, balance: 100, width: 0, swap: true }, [0.2, -0.1], [0.2, -0.1]],
    ["Mono averages both channels", { enabled: true, width: 0 }, [0.2, -0.1], [0.05, 0.05]],
    ["Full right balance silences left", { enabled: true, balance: 100 }, [0.2, -0.1], [0, -0.1]],
    ["Full left balance silences right", { enabled: true, balance: -100 }, [0.2, -0.1], [0.2, 0]],
    ["Channel swap", { enabled: true, swap: true }, [0.2, -0.1], [-0.1, 0.2]],
    ["Swap then output balance", { enabled: true, swap: true, balance: 100 }, [0.2, -0.1], [0, 0.2]],
    ["Wide stereo with headroom", { enabled: true, width: 200 }, [0.2, -0.1], [0.175, -0.125]],
    ["Mono input plays in both ears", { enabled: true }, [0.2], [0.2, 0.2]],
    ["Mono input channel swap", { enabled: true, swap: true }, [0.2], [0.2, 0.2]],
    ["Opposite phase mono cancellation", { enabled: true, width: 0 }, [0.2, -0.2], [0, 0]],
  ];
  const lines = [];
  try {
    for (const [name, settings, inputs, expected] of cases) {
      const context = new OfflineAudioContext(2, 4800, 48000);
      const buffer = context.createBuffer(inputs.length, 4800, 48000);
      inputs.forEach((value, channel) => buffer.getChannelData(channel).fill(value));
      const source = context.createBufferSource();
      source.buffer = buffer;
      const stereo = TvmStereo.create(context);
      source.connect(stereo.input);
      stereo.output.connect(context.destination);
      TvmStereo.apply(stereo, settings, 0);
      source.start();
      const output = await context.startRendering();
      expected.forEach((value, channel) => {
        const actual = output.getChannelData(channel)[4799];
        if (Math.abs(actual - value) > 0.001) throw Error(`${name}: channel ${channel}, expected ${value}, got ${actual}`);
      });
      lines.push(`PASS: ${name}`);
    }
    lines.push(`${cases.length}/${cases.length} audio renders passed`);
  } catch (error) {
    lines.push(`FAIL: ${error.message}`);
  }
  document.getElementById("results").textContent = lines.join("\n");
})();

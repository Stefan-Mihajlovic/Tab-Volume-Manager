<h1>
  <img src="./icons/icon128.png" alt="Tab Volume Manager logo" width="48" height="48" align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/tab-volume-manager-wordmark-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/tab-volume-manager-wordmark-light.svg">
    <img src="./assets/tab-volume-manager-wordmark-light.svg" alt="Tab Volume Manager" height="48" align="center">
  </picture>
</h1>

Tab Volume Manager is a browser audio workspace for controlling and enhancing the sound of every tab. It combines per-site volume control, quick effects, a visual equalizer, saved presets, and an optional Pro audio suite. Version 1.5 adds a free 7-day Pro trial.

## Free

- Per-tab volume control up to 500%
- Instant mute and volume reset
- Bass Boost and Voice Clarity effects
- Adjustable effect intensity
- Six-band equalizer
- One custom EQ preset
- Per-site settings saved locally
- Light and dark themes

## Pro

Try every Pro tool free for 7 days, without a card or automatic charge. Cancel early at any time; your saved presets stay safe.

- Smart Limiter for cleaner high-volume playback
- Adaptive Volume for balanced loudness
- Movie Dialogue enhancement
- Full 10-band equalizer
- Multi-tab Mixer for every audible tab
- Sleep Timer with a gentle fade-out
- Stereo Tools: left/right balance, channel swap, and stereo width (mono to wide)
- Unlimited presets and volume boost up to 1500%

Pro costs $12.49 as a one-time payment for a lifetime license, including the complete Pro audio suite, unlimited presets, and the extended volume range. Existing licenses remain supported.

Settings and presets stay in local extension storage. Tab audio is captured and processed only while Tab Volume Manager is active, and Pro licenses are verified through the licensing service.

## License

Copyright (c) 2025-2026 Stefan Mihajlovic. Tab Volume Manager is proprietary software and all rights are reserved. No permission is granted to use, copy, modify, or distribute its source code. See the [LICENSE](./LICENSE) file for the full terms.

## Verification

Run `node --test tests/*.test.js` for stereo bounds, headroom, trial expiry/cancellation, and Pro entitlement gating. Serve the project locally and open `tests/stereo.html` to render and verify 11 stereo and mono cases with the browser’s OfflineAudioContext.

## Packaging

Run `python3 scripts/package-release.py` to create the store ZIP in `dist/`. The package includes runtime files only and always uses production licensing. Local trial configuration and generated archives are excluded from Git.

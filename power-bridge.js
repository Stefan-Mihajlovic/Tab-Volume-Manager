// Isolated-world bridge: MAIN-world audio code cannot read extension storage.
(() => {
  if (globalThis.__tvmPowerBridge) return;
  globalThis.__tvmPowerBridge = true;
  const key = "tvmEnabled";
  let revision = 0;
  let enabled;
  let restoring = false;
  const restore = async () => {
    if (restoring) return;
    restoring = true;
    try { await chrome.runtime.sendMessage({ type: "TVM_RESTORE_TAB" }); }
    catch { /* The extension may be reloading; retry at the next playback. */ }
    finally { restoring = false; }
  };
  window.addEventListener("pageshow", restore);
  document.addEventListener("play", restore, true);
  restore();
  const publish = () => {
    if (enabled !== undefined) window.postMessage({ type: "TVM_POWER", enabled }, "*");
  };
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[key]) return;
    revision++;
    enabled = changes[key].newValue !== false;
    publish();
  });
  window.addEventListener("message", (event) => {
    if (event.source === window && event.data?.type === "TVM_POWER_READY") publish();
  });
  const initialRevision = revision;
  chrome.storage.local.get(key, (stored) => {
    if (revision !== initialRevision) return;
    enabled = stored[key] !== false;
    publish();
  });
})();

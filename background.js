const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

let creatingOffscreenDocument = null;
const tabTasks = new Map();

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (contexts.length > 0) return;

  if (!creatingOffscreenDocument) {
    creatingOffscreenDocument = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ["USER_MEDIA"],
        justification: "Capture and process the current tab audio.",
      })
      .finally(() => {
        creatingOffscreenDocument = null;
      });
  }

  await creatingOffscreenDocument;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "ZAZ_CAPTURE_TAB") return false;

  const updateTab = async () => {
    if (!Number.isInteger(message.tabId)) {
      throw new Error("Missing tab id.");
    }

    await ensureOffscreenDocument();

    let response = await chrome.runtime.sendMessage({
      type: "ZAZ_OFFSCREEN_UPDATE",
      target: "offscreen",
      tabId: message.tabId,
      settings: message.settings,
    });

    if (response?.needsStream) {
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: message.tabId,
      });

      response = await chrome.runtime.sendMessage({
        type: "ZAZ_OFFSCREEN_UPDATE",
        target: "offscreen",
        tabId: message.tabId,
        streamId,
        settings: message.settings,
      });
    }

    return response || { ok: true };
  };

  const previousTask = tabTasks.get(message.tabId) || Promise.resolve();
  const task = previousTask.catch(() => {}).then(updateTab);
  tabTasks.set(message.tabId, task);

  task
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }))
    .finally(() => {
      if (tabTasks.get(message.tabId) === task) tabTasks.delete(message.tabId);
    });

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabTasks.delete(tabId);
  chrome.runtime.sendMessage({
    type: "ZAZ_OFFSCREEN_STOP",
    target: "offscreen",
    tabId,
  }).catch(() => {});
});

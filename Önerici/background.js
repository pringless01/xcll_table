// Sekme kapatma + sekme ileri/geri (log’lu)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Aktif sekmeyi kapat
  if (msg?.type === "CLOSE_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs && tabs[0];
      if (t?.id) chrome.tabs.remove(t.id, () => {
        if (chrome.runtime.lastError) {
          console.warn("CLOSE_ACTIVE_TAB error:", chrome.runtime.lastError);
          sendResponse({ ok: false, err: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true });
        }
      });
      else sendResponse({ ok: false, err: "No active tab" });
    });
    return true; // async
  }

  // Sekme ileri/geri
  if (msg?.type === "SWITCH_TAB") {
    const dir = msg.direction === "prev" ? -1 : 1;
    const steps = Math.max(1, Math.min(64, Number(msg.steps) || 1));

    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn("tabs.query error:", chrome.runtime.lastError);
        sendResponse({ ok: false, err: chrome.runtime.lastError.message });
        return;
      }
      if (!tabs || !tabs.length) { sendResponse({ ok: false, err: "No tabs" }); return; }

      tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const activeIdx = tabs.findIndex(t => t.active);
      if (activeIdx < 0) { sendResponse({ ok: false, err: "No active index" }); return; }

      // wrap-around
      const len = tabs.length;
      let targetIdx = (activeIdx + dir * steps) % len;
      if (targetIdx < 0) targetIdx += len;

      const target = tabs[targetIdx];
      if (!target?.id) { sendResponse({ ok: false, err: "No target tab" }); return; }

      chrome.tabs.update(target.id, { active: true }, () => {
        if (chrome.runtime.lastError) {
          console.warn("tabs.update error:", chrome.runtime.lastError);
          sendResponse({ ok: false, err: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true, targetIdx });
        }
      });
    });
    return true; // async
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'open-links') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selected = document.querySelectorAll('.selected-cell a');
          selected.forEach((a) => {
            if (a.href) window.open(a.href, '_blank');
          });
        },
      });
    });
  }
  // ==== Reco / Sekme İşlemleri (iki tip: RECO_* ve orijinal) ====
  const closeTypes = new Set(['RECO_CLOSE_ACTIVE_TAB', 'CLOSE_ACTIVE_TAB']);
  const switchTypes = new Set(['RECO_SWITCH_TAB', 'SWITCH_TAB']);

  if (closeTypes.has(msg.type)) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs && tabs[0];
      if (t?.id) {
        chrome.tabs.remove(t.id, () => {
          if (chrome.runtime.lastError) {
            sendResponse &&
              sendResponse({
                ok: false,
                err: chrome.runtime.lastError.message,
              });
          } else {
            sendResponse && sendResponse({ ok: true });
          }
        });
      } else {
        sendResponse && sendResponse({ ok: false, err: 'No active tab' });
      }
    });
    return true; // async
  }
  if (switchTypes.has(msg.type)) {
    const dir = msg.direction === 'prev' ? -1 : 1;
    const steps = Math.max(1, Math.min(64, Number(msg.steps) || 1));
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        sendResponse &&
          sendResponse({ ok: false, err: chrome.runtime.lastError.message });
        return;
      }
      if (!tabs || !tabs.length) {
        sendResponse && sendResponse({ ok: false, err: 'No tabs' });
        return;
      }
      tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const activeIdx = tabs.findIndex((t) => t.active);
      if (activeIdx < 0) {
        sendResponse && sendResponse({ ok: false, err: 'No active index' });
        return;
      }
      const len = tabs.length;
      let targetIdx = (activeIdx + dir * steps) % len;
      if (targetIdx < 0) targetIdx += len;
      const target = tabs[targetIdx];
      if (!target?.id) {
        sendResponse && sendResponse({ ok: false, err: 'No target tab' });
        return;
      }
      chrome.tabs.update(target.id, { active: true }, () => {
        if (chrome.runtime.lastError) {
          sendResponse &&
            sendResponse({ ok: false, err: chrome.runtime.lastError.message });
        } else {
          sendResponse && sendResponse({ ok: true, targetIdx });
        }
      });
    });
    return true; // async
  }
});

function toggleToolbarOnTab(tabId) {
  if (!tabId) return;
  try {
    chrome.tabs.sendMessage(tabId, { type: 'toggle-toolbar' });
  } catch {}
}

// Eklenti ikonuna tıklayınca toolbar aç/kapat
chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.id) toggleToolbarOnTab(tab.id);
});

// Klavye komutu (manifest commands) -> toggle
chrome.commands &&
  chrome.commands.onCommand.addListener((cmd) => {
    if (cmd === 'toggle-toolbar') {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) toggleToolbarOnTab(tab.id);
      });
    }
  });

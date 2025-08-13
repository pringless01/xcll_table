// background-extra.js - tab kontrol mesajları
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'RECO_CLOSE_ACTIVE_TAB') {
    if (sender.tab && sender.tab.id) {
      chrome.tabs.remove(sender.tab.id);
    }
  } else if (msg.type === 'RECO_SWITCH_TAB') {
    // {type, direction}
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (!sender.tab) return;
      const idx = tabs.findIndex((t) => t.id === sender.tab.id);
      if (idx < 0) return;
      let targetIdx = msg.direction === 'prev' ? idx - 1 : idx + 1;
      if (targetIdx < 0) targetIdx = tabs.length - 1;
      if (targetIdx >= tabs.length) targetIdx = 0;
      const target = tabs[targetIdx];
      if (target && target.id) {
        chrome.tabs.update(target.id, { active: true });
      }
    });
  }
});

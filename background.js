chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "open-links") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selected = document.querySelectorAll(".selected-cell a");
          selected.forEach(a => { if (a.href) window.open(a.href, '_blank'); });
        }
      });
    });
  }
});

function toggleToolbarOnTab(tabId){
  if(!tabId) return;
  try { chrome.tabs.sendMessage(tabId,{type:'toggle-toolbar'}); } catch(e) {}
}

// Eklenti ikonuna tıklayınca toolbar aç/kapat
chrome.action.onClicked.addListener(tab=>{ if(tab && tab.id) toggleToolbarOnTab(tab.id); });

// Klavye komutu (manifest commands) -> toggle
chrome.commands && chrome.commands.onCommand.addListener(cmd=>{ if(cmd==='toggle-toolbar'){ chrome.tabs.query({active:true,currentWindow:true},([tab])=>{ if(tab?.id) toggleToolbarOnTab(tab.id); }); } });

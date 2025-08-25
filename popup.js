document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:10px;font:13px system-ui;min-width:180px;';
  wrap.innerHTML = `<button id="toggleToolbar" style="width:100%;padding:8px;border-radius:5px;border:1px solid #0078D4;background:#0078D4;color:#fff;cursor:pointer;font-weight:600;">Toolbar Göster/Gizle (Ctrl+Shift+E)</button>`;
  document.body.appendChild(wrap);

  function update(btn, visible) {
    btn.textContent = visible ? 'Toolbar Gizle' : 'Toolbar Göster';
  }

  const btn = wrap.querySelector('#toggleToolbar');
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, { type: 'ping-toolbar-state' }, (resp) => {
      if (resp && typeof resp.visible === 'boolean') update(btn, resp.visible);
    });
  });

  btn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return;
      chrome.tabs.sendMessage(tab.id, { type: 'toggle-toolbar' }, (resp) => {
        if (resp && typeof resp.visible === 'boolean')
          update(btn, resp.visible);
      });
    });
  });
});

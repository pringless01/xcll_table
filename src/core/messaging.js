// messaging.js - popup <-> content iletişim köprüsü
(function () {
  const bus = (window.ExcelHelperNS && window.ExcelHelperNS.eventBus) || {
    emit: () => {},
  };
  function sumSelection() {
    const cells = window.ExcelHelperNS.getSelectedCells();
    if (!cells.length) return { success: false, message: 'Seçim yok' };
    const nums = cells
      .map((c) => window.ExcelHelperNS.parseNumericValue(c.textContent))
      .filter((v) => !isNaN(v));
    const total = nums.reduce((a, b) => a + b, 0);
    return { success: true, total, count: nums.length };
  }
  function copySelection() {
    const aoa = window.ExcelHelperNS.getSelectionAOA();
    if (!aoa.length) return { success: false, message: 'Seçim yok' };
    const tsvEscape = (s) =>
      /["\t\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    const cellToString = (cell) => {
      if (cell == null) return '';
      if (typeof cell === 'object') {
        const v = 'v' in cell ? cell.v : cell;
        if (v instanceof Date) {
          // Lokal saat damgasını ISO benzeri biçime çeviriyoruz
          const adj = new Date(v.getTime() - v.getTimezoneOffset() * 60000);
          return adj.toISOString().replace('T', ' ').replace('Z', '');
        }
        return String(v ?? '');
      }
      return String(cell);
    };
    const text = aoa
      .map((row) => row.map((c) => tsvEscape(cellToString(c))).join('\t'))
      .join('\n');
    try {
      navigator.clipboard.writeText(text);
      return {
        success: true,
        count: aoa.reduce((a, r) => a + r.filter((v) => v !== '').length, 0),
      };
    } catch {
      return { success: false, message: 'Clipboard erişilemedi' };
    }
  }
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'toggle-selection') {
      window.ExcelHelperNS.updateSettings({ selectionMode: msg.state });
      bus.emit('selection:mode-changed', { state: msg.state });
      sendResponse && sendResponse({ success: true });
    } else if (
      msg.type === 'copy-selection' ||
      msg.type === 'fast-copy-selection'
    ) {
      // fast-copy-selection ayni islev
      sendResponse && sendResponse(copySelection());
    } else if (msg.type === 'sum-selection') {
      sendResponse && sendResponse(sumSelection());
    } else if (msg.type === 'get-selected-data') {
      const aoa = window.ExcelHelperNS.getSelectionAOA();
      sendResponse && sendResponse({ success: !!aoa.length, data: aoa });
    } else if (msg.type === 'toggle-toolbar') {
      let bar = document.getElementById('excel-helper-toolbar');
      if (!bar) {
        try {
          window.ExcelHelperNS.initToolbar();
          bar = document.getElementById('excel-helper-toolbar');
        } catch {}
      }
      if (!bar) {
        sendResponse && sendResponse({ visible: false });
        return true;
      }
      const isHidden = bar.style.display === 'none';
      if (isHidden) {
        bar.style.display = 'block';
        window.ExcelHelperNS.toggleToolbarVisible(true);
      } else {
        bar.style.display = 'none';
        window.ExcelHelperNS.toggleToolbarVisible(false);
      }
      sendResponse && sendResponse({ visible: bar.style.display !== 'none' });
    } else if (msg.type === 'ping-toolbar-state') {
      const bar = document.getElementById('excel-helper-toolbar');
      sendResponse &&
        sendResponse({ visible: !!(bar && bar.style.display !== 'none') });
    }
    return true; // async izin
  });
})();

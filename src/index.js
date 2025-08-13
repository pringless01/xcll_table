// index.js - global bootstrap
(function () {
  async function init() {
    if (window.top !== window) {
      // iframe: sadece temel şeyler
      window.ExcelHelperNS.ensureStyle();
      window.ExcelHelperNS.initHeaders();
      window.ExcelHelperNS.attachSelectionHandlers();
      return;
    }
    if (window.__EXCEL_HELPER_INIT_DONE__) return;
    window.__EXCEL_HELPER_INIT_DONE__ = true;
    window.__EXCEL_HELPER_MODULAR__ = true;
    const tStart = performance.now();
    try {
      await window.ExcelHelperNS.loadSettings();
    } catch (e) {
      console.error('[EH][init] settings', e);
    }
    try {
      window.ExcelHelperNS.ensureStyle();
    } catch (e) {
      console.error('[EH][init] style', e);
    }
    try {
      window.ExcelHelperNS.initHeaders();
    } catch (e) {
      console.error('[EH][init] headers', e);
    }
    try {
      window.ExcelHelperNS.initToolbar();
    } catch (e) {
      console.error('[EH][init] toolbar', e);
    }
    try {
      window.ExcelHelperNS.initStatusPanel();
    } catch (e) {
      console.error('[EH][init] status', e);
    }
    try {
      window.ExcelHelperNS.initTotals();
    } catch (e) {
      console.error('[EH][init] totals', e);
    }
    try {
      window.ExcelHelperNS.attachSelectionHandlers();
    } catch (e) {
      console.error('[EH][init] selection handlers', e);
    }
    window.ExcelHelperNS.ready = true;
    const dur = (performance.now() - tStart).toFixed(1);
    console.log('[ExcelHelper][Modular Global] Başlatıldı (' + dur + 'ms)');
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();

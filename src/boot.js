// boot.js - İlk enjekte edilen script (diagnostic)
(function () {
  try {
    const t0 = performance.now();
    console.log('[ExcelHelper][Boot] injecting...');
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    window.ExcelHelperNS.__bootTime = t0;
    window.ExcelHelperNS.__bootFrame = window.top === window ? 'top' : 'iframe';
    // Basit guard: aynı çerçevede iki kez çalışmayı önle
    if (window.__EXCEL_HELPER_BOOT_RAN__) {
      console.log('[ExcelHelper][Boot] already ran, skipping');
      return;
    }
    window.__EXCEL_HELPER_BOOT_RAN__ = true;
  } catch (e) {
    console.error('[ExcelHelper][Boot] error', e);
  }
})();

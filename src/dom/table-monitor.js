// table-monitor.js - yeni eklenen tabloları izler
(function () {
  const bus = (window.ExcelHelperNS && window.ExcelHelperNS.eventBus) || {
    emit: () => {},
  };
  let observer = null;
  const SCAN_BATCH = 50;
  let __scanIndex = 0;
  function scan() {
    const tables = document.querySelectorAll('table');
    const added = [];
    let count = 0;
    for (; __scanIndex < tables.length && count < SCAN_BATCH; __scanIndex++) {
      const t = tables[__scanIndex];
      if (!t.__excelHelperProcessed) {
        if (window.ExcelHelperNS._processTable) {
          window.ExcelHelperNS._processTable(t);
        }
        added.push(t);
      }
      count++;
    }
    if (added.length) bus.emit('tables:added', { tables: added });
    if (__scanIndex < tables.length) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(scan, { timeout: 60 });
      } else {
        setTimeout(scan, 16);
      }
    } else {
      __scanIndex = 0; // sona geldik, bir sonraki tetikte başa dön
    }
  }
  function startMonitoring() {
    if (observer) return;
    scan();
    observer = new MutationObserver((muts) => {
      let need = false;
      for (const m of muts) {
        if (m.addedNodes && m.addedNodes.length) {
          need = true;
          break;
        }
      }
      if (need) scan();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    const stop = () => {
      try {
        observer && observer.disconnect();
      } catch {}
      observer = null;
    };
    window.addEventListener('pagehide', stop, { once: true });
  }
  window.ExcelHelperNS = window.ExcelHelperNS || {};
  Object.assign(window.ExcelHelperNS, { startTableMonitor: startMonitoring });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', startMonitoring);
  else startMonitoring();
})();

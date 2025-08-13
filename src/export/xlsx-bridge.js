(function () {
  try {
    if (window.__EH_XLSX_BRIDGE_INSTALLED) return;
    window.__EH_XLSX_BRIDGE_INSTALLED = true;
    var scriptEl = document.currentScript;
    var xlsxSrc = scriptEl && scriptEl.getAttribute('data-xlsx-src');
    var ready = (typeof window.XLSX !== 'undefined');
    var queue = [];
    function consume(d) {
      try {
        var aoa = (d && d.aoa) || [];
        var ws = window.XLSX.utils.aoa_to_sheet(aoa);
        var wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'SeciliVeriler');
        var name = (d && d.filename) || ('secili-veriler-' + new Date().toISOString().slice(0, 10) + '.xlsx');
        window.XLSX.writeFile(wb, name);
      } catch (e) {
        console.error('[EH][xlsx-bridge] export failed', e);
      }
    }
    // Dinleyici hazır: içerik tarafı bu event ile export tetikleyecek
    document.addEventListener('excel-helper:export-xlsx', function (e) {
      var d = (e && e.detail) || {};
      if (!ready) {
        queue.push(d);
        return;
      }
      consume(d);
    }, false);
    // Köprü hazır sinyali
    try {
      document.dispatchEvent(new CustomEvent('excel-helper:bridge-ready'));
    } catch {}

    if (!ready) {
      if (!xlsxSrc) {
        console.warn('[EH][xlsx-bridge] No data-xlsx-src provided');
        return;
      }
      var s = document.createElement('script');
      s.src = xlsxSrc;
      s.onload = function () {
        ready = true;
        try {
          while (queue.length) consume(queue.shift());
        } catch (_e) {}
      };
      (document.head || document.documentElement).appendChild(s);
    }
  } catch (err) {
    console.error('[EH][xlsx-bridge] init failed', err);
  }
})();

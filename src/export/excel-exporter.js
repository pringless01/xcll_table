// excel-exporter.js - global exporter
(function () {
  async function ensureXLSX() {
    if (typeof XLSX !== 'undefined') return true;
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('libs/xlsx.full.min.js');
      s.onload = () => resolve(true);
      document.head.appendChild(s);
    });
  }
  // Basit değer parse (sayı / tarih / metin)
  function parseCellValue(raw) {
    if (raw == null) return { kind: 'text', value: '' };
    const s = raw.trim();
    if (!s) return { kind: 'text', value: '' };
    // number (virgül ya da nokta)
    const numStr = s.replace(/\u00A0/g, ' ').replace(/,/g, '.');
    if (/^[+-]?[0-9]+(\.[0-9]+)?$/.test(numStr)) {
      const n = Number(numStr);
      if (!isNaN(n)) return { kind: 'number', value: n };
    }
    // date dd-MM-yy[yy][ HH:MM[:SS]]
    const dtRe =
      /(^\d{2})[.\/-](\d{2})[.\/-](\d{2}|\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
    let m = s.match(dtRe);
    let ts = null;
    if (m) {
      let [, dd, MM, yy, HH, mm, SS] = m;
      dd = parseInt(dd, 10);
      MM = parseInt(MM, 10) - 1;
      let year = parseInt(yy, 10);
      if (yy.length === 2) year = 2000 + year;
      HH = HH ? parseInt(HH, 10) : 0;
      mm = mm ? parseInt(mm, 10) : 0;
      SS = SS ? parseInt(SS, 10) : 0;
      const d = new Date(year, MM, dd, HH, mm, SS, 0);
      if (!isNaN(d.getTime())) ts = d.getTime();
    }
    if (ts === null) {
      const norm = s.replace(/\./g, '-').replace(/\//g, '-');
      const parsed = Date.parse(norm);
      if (!isNaN(parsed)) ts = parsed;
    }
    if (ts !== null) return { kind: 'date', value: new Date(ts) };
    return { kind: 'text', value: s };
  }
  function wrapForSheet(parsed) {
    if (parsed.kind === 'number') return { v: parsed.value, t: 'n' };
    if (parsed.kind === 'date')
      return { v: parsed.value, t: 'd', z: 'yyyy-mm-dd hh:mm:ss' }; // düzeltildi
    return parsed.value;
  }
  function optimizeAOA(aoa) {
    if (!aoa.length) return aoa;
    // Tablalar arası ayraç boş satırlar korunacak, sadece veri satırları içinde kolon kırpma yapılır
    let globalMin = null,
      globalMax = null;
    for (const row of aoa) {
      if (row.length === 0) continue; // ayraç
      for (let i = 0; i < row.length; i++) {
        const v = row[i];
        if (
          v !== '' &&
          v != null &&
          !(typeof v === 'object' && Object.keys(v).length === 0)
        ) {
          if (globalMin === null || i < globalMin) globalMin = i;
          if (globalMax === null || i > globalMax) globalMax = i;
        }
      }
    }
    if (globalMin == null) return aoa; // tamamen boş
    if (globalMin === 0 && globalMax === aoa[0].length - 1) return aoa; // kırpılacak yok
    return aoa.map((r) => (r.length ? r.slice(globalMin, globalMax + 1) : r));
  }
  function buildAOA(cells) {
    const tableMap = new Map();
    cells.forEach((cell) => {
      const table = cell.closest('table');
      if (!table) return;
      if (!tableMap.has(table)) tableMap.set(table, new Set());
      tableMap.get(table).add(cell);
    });
    const aoa = [];
    tableMap.forEach((cellSet, table) => {
      for (let r = 0; r < table.rows.length; r++) {
        const row = table.rows[r];
        const rowData = [];
        let any = false;
        for (let c = 0; c < row.cells.length; c++) {
          const cell = row.cells[c];
          if (cellSet.has(cell) || cell.classList.contains('eh-selected')) {
            const txt = cell.textContent || '';
            const parsed = parseCellValue(txt);
            rowData.push(wrapForSheet(parsed));
            any = true;
          } else {
            rowData.push('');
          }
        }
        if (any) aoa.push(rowData);
      }
      aoa.push([]);
    });
    if (aoa.length && aoa[aoa.length - 1].length === 0) aoa.pop();
    return optimizeAOA(aoa);
  }
  async function exportSelectionToExcel() {
    const cells = window.ExcelHelperNS.getSelectedCells();
    if (!cells.length) {
      alert('Lütfen önce seçim yapın');
      return;
    }
    await ensureXLSX();
    const aoa = buildAOA(cells);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SeciliVeriler');
    const filename =
      'secili-veriler-' + new Date().toISOString().slice(0, 10) + '.xlsx';
    XLSX.writeFile(wb, filename);
  }
  function getSelectionAOA() {
    const cells = window.ExcelHelperNS.getSelectedCells();
    if (!cells.length) return [];
    return buildAOA(cells);
  }
  function exportSelectionToCSV() {
    const cells = window.ExcelHelperNS.getSelectedCells
      ? window.ExcelHelperNS.getSelectedCells()
      : [];
    if (!cells.length) {
      alert('Lütfen önce seçim yapın');
      return;
    }
    const aoa =
      (window.ExcelHelperNS && window.ExcelHelperNS.getSelectionAOA)
        ? window.ExcelHelperNS.getSelectionAOA()
        : getSelectionAOA();
    if (!aoa.length) {
      alert('Veri yok');
      return;
    }
    const lines = aoa.map((row) =>
      row
        .map((cell) => {
          if (cell == null) return '';
          if (typeof cell === 'object') {
            // SheetJS hücresi olabilir {v,t,z}
            const v = 'v' in cell ? cell.v : cell;
            const sv =
              v instanceof Date
                ? new Date(v.getTime() - v.getTimezoneOffset() * 60000)
                    .toISOString()
                    .replace('T', ' ')
                    .replace('Z', '')
                : v;
            return csvEscape(String(sv ?? ''));
          }
          return csvEscape(String(cell));
        })
        .join(',')
    );
    const blob = new Blob([lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download =
      'secili-veriler-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function csvEscape(s) {
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }
  window.ExcelHelperNS = window.ExcelHelperNS || {};
  Object.assign(window.ExcelHelperNS, {
    exportSelectionToExcel,
    getSelectionAOA,
    exportSelectionToCSV,
  });
  // test hooks (no runtime impact)
  try {
    window.ExcelHelperNS.__test = Object.assign(
      window.ExcelHelperNS.__test || {},
      {
        ensureXLSX,
        parseCellValue,
        wrapForSheet,
        optimizeAOA,
      }
    );
  } catch {}
})();

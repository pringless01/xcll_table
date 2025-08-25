// totals.js - Lightweight selection totals + on-demand grand total (aligned + SPA safe)
(function () {
  const GRAND_CHUNK_ROWS = 300;
  const GRAND_CELL_LIMIT = 300000;
  const WIDTH_MEASURE_THROTTLE = 180; // ms
  let panel,
    lastTable = null,
    grandTotals = null,
    grandProgress = 0,
    grandWorking = false;
  let tableResizeObserver = null,
    domObserver = null;

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'eh-floating-totals';
    panel.style.cssText =
      'position:fixed;left:0;bottom:0;z-index:2147483647;background:rgba(14,15,19,0.92);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);border-top:1px solid rgba(255,255,255,.06);padding:6px 8px;max-width:100%;overflow:auto;font:12px system-ui;color:#e7e7ea;box-shadow:0 -8px 24px rgba(0,0,0,.28);';
    document.body.appendChild(panel);
    return panel;
  }
  function hidePanel() {
    if (panel) panel.style.display = 'none';
  }
  function fmt(n) {
    return window.ExcelHelperNS && window.ExcelHelperNS.formatNumber
      ? window.ExcelHelperNS.formatNumber(n)
      : '' + n;
  }
  function getSelectedCells() {
    if (window.ExcelHelperNS && window.ExcelHelperNS.getSelectedCells)
      return window.ExcelHelperNS.getSelectedCells();
    return Array.from(document.querySelectorAll('.eh-selected'));
  }

  function computeSelectionTotals(table) {
    const cells = getSelectedCells().filter(
      (c) => c.closest('table') === table
    );
    if (!cells.length) return null;
    const colMap = new Map();
    cells.forEach((cell) => {
      const v =
        cell._ehNum !== undefined
          ? cell._ehNum
          : window.ExcelHelperNS.parseNumericValue(cell.textContent.trim());
      if (v === null) return;
      const idx = cell.cellIndex;
      const d = colMap.get(idx) || { sum: 0, count: 0 };
      d.sum += v;
      d.count++;
      colMap.set(idx, d);
    });
    return colMap.size ? colMap : null;
  }

  // Width measurement & caching
  let lastWidthMeasure = 0;
  function getColumnWidths(table) {
    const now = performance.now();
    if (table.__ehColWidths && now - lastWidthMeasure < WIDTH_MEASURE_THROTTLE)
      return table.__ehColWidths;
    const header = table.rows[0];
    if (!header) return [];
    const widths = [];
    const max = header.cells.length;
    for (let i = 0; i < max; i++) {
      const cell = header.cells[i];
      if (!cell) {
        widths.push(60);
        continue;
      }
      const rect = cell.getBoundingClientRect();
      widths.push(Math.max(40, Math.round(rect.width)));
    }
    table.__ehColWidths = widths;
    lastWidthMeasure = now;
    return widths;
  }

  function buildSelectionRow(colMap, widths) {
    if (!colMap || !widths.length) return '';
    let tds = [];
    tds.push(
  `<td style="width:${widths[0]}px;font-weight:600;background:#141824;padding:4px 8px;border:1px solid rgba(255,255,255,.06);white-space:nowrap;border-radius:6px 0 0 6px;">${(window.ExcelHelperNS&&window.ExcelHelperNS.t&&window.ExcelHelperNS.t('totals_selection_label'))||'SEÇİM'}</td>`
    );
    for (let i = 1; i < widths.length; i++) {
      const w = widths[i];
      if (colMap.has(i)) {
        const d = colMap.get(i);
        const extra = d.count > 1 ? ` <span style=\"opacity:.6\">(${d.count})</span>` : '';
        tds.push(
          `<td style="width:${w}px;max-width:${w}px;text-align:right;padding:4px 8px;border:1px solid rgba(255,255,255,.06);background:#161a22;white-space:nowrap;overflow:hidden;">`+
          `<strong>${fmt(d.sum)}</strong>${extra}</td>`
        );
      } else {
        tds.push(
          `<td style="width:${w}px;max-width:${w}px;text-align:center;padding:4px 8px;border:1px solid rgba(255,255,255,.06);color:#9aa3b2;background:#12151c;white-space:nowrap;">-</td>`
        );
      }
    }
    return `<table style='border-collapse:collapse;font:12px system-ui;margin:0 0 6px 0;table-layout:fixed;'><tr>${tds.join('')}</tr></table>`;
  }
  function buildGrandRow(colMap, widths) {
    if (!colMap || !widths.length) return '';
    let tds = [];
    tds.push(
  `<td style="width:${widths[0]}px;font-weight:600;background:#1b1e28;padding:4px 8px;border:1px solid rgba(255,255,255,.06);white-space:nowrap;border-radius:6px 0 0 6px;">${(window.ExcelHelperNS&&window.ExcelHelperNS.t&&window.ExcelHelperNS.t('totals_grand_label'))||'GENEL'}</td>`
    );
    for (let i = 1; i < widths.length; i++) {
      const w = widths[i];
      if (colMap.has(i)) {
        const d = colMap.get(i);
        const extra = d.count > 1 ? ` <span style='opacity:.6'>(${d.count})</span>` : '';
        tds.push(
          `<td style="width:${w}px;max-width:${w}px;text-align:right;padding:4px 8px;border:1px solid rgba(255,255,255,.06);background:#161a22;white-space:nowrap;overflow:hidden;"><strong>${fmt(d.sum)}</strong>${extra}</td>`
        );
      } else {
        tds.push(
          `<td style="width:${w}px;max-width:${w}px;text-align:center;padding:4px 8px;border:1px solid rgba(255,255,255,.06);color:#9aa3b2;background:#12151c;white-space:nowrap;">-</td>`
        );
      }
    }
    return `<table style='border-collapse:collapse;font:12px system-ui;margin:0;table-layout:fixed;'><tr>${tds.join('')}</tr></table>`;
  }

  function render(table) {
    try {
      const p = ensurePanel();
      if (!table) {
        hidePanel();
        return;
      }
      const selMap = computeSelectionTotals(table);
      if (!selMap) {
        hidePanel();
        return;
      }
      p.style.display = 'block';
      const rect = table.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      p.style.left = left + 'px';
      p.style.maxWidth = window.innerWidth - left - 4 + 'px';
      const widths = getColumnWidths(table);
      let html = buildSelectionRow(selMap, widths);
      if (grandWorking) {
  html += `<div style='font:11px system-ui;margin:4px 0;color:#9aa3b2;'>${(window.ExcelHelperNS&&window.ExcelHelperNS.t&&window.ExcelHelperNS.t('totals_compute_progress',[Math.round(grandProgress*100)]))||('GENEL HESAPLANIYOR %'+Math.round(grandProgress*100))}</div>`;
      } else if (grandTotals) {
        html += buildGrandRow(grandTotals, widths);
      } else {
  html += `<button id='eh-grand-btn' style='padding:6px 10px;font:12px system-ui;border:1px solid rgba(255,255,255,.06);background:#2B6EFF;color:#fff;border-radius:8px;cursor:pointer;'>${(window.ExcelHelperNS&&window.ExcelHelperNS.t&&window.ExcelHelperNS.t('totals_grand_button'))||'GENEL TOPLAM'}</button>`;
      }
      p.innerHTML = html;
      const btn = p.querySelector('#eh-grand-btn');
      if (btn) {
        btn.addEventListener('click', () => startGrandCompute(table));
      }
    } catch (err) {
      console.warn('Totals render error', err);
    }
  }

  function startGrandCompute(table) {
    if (grandWorking || grandTotals) return;
    const rowCount = table.rows.length;
    const colCount = table.rows[0] ? table.rows[0].cells.length : 0;
    if (!rowCount || !colCount) return;
    if (rowCount * colCount > GRAND_CELL_LIMIT) {
  alert((window.ExcelHelperNS&&window.ExcelHelperNS.t&&window.ExcelHelperNS.t('too_big_cancelled'))||'Tablo çok büyük, genel toplam iptal (limit)');
      return;
    }
    grandWorking = true;
    grandProgress = 0;
    grandTotals = new Map();
    let r = 1;
    function step() {
      try {
        const end = Math.min(rowCount, r + GRAND_CHUNK_ROWS);
        for (; r < end; r++) {
          const row = table.rows[r];
          if (!row || row.style.display === 'none') continue;
          for (let c = 0; c < colCount; c++) {
            const cell = row.cells[c];
            if (!cell) continue;
            const v =
              cell._ehNum !== undefined
                ? cell._ehNum
                : window.ExcelHelperNS.parseNumericValue(
                    cell.textContent.trim()
                  );
            if (v === null) continue;
            const d = grandTotals.get(c) || { sum: 0, count: 0 };
            d.sum += v;
            d.count++;
            grandTotals.set(c, d);
          }
        }
        grandProgress = r / rowCount;
        render(table);
        if (r < rowCount) {
          if ('requestIdleCallback' in window) {
            requestIdleCallback(step, { timeout: 120 });
          } else {
            setTimeout(step, 16);
          }
        } else {
          grandWorking = false;
          render(table);
        }
      } catch (e) {
        grandWorking = false;
        console.warn('Grand total step error', e);
      }
    }
    step();
  }

  function updateAllTableTotals() {
    const cells = getSelectedCells();
    if (!cells.length) {
      hidePanel();
      lastTable = null;
      return;
    }
    const tbl = cells[0].closest('table');
    if (tbl !== lastTable) {
      detachResizeObserver();
      lastTable = tbl;
      grandTotals = null;
      grandWorking = false;
      grandProgress = 0;
      attachResizeObserver(tbl);
    }
    render(tbl);
  }
  function reposition() {
    if (!lastTable) return;
    render(lastTable);
  }
  function attachResizeObserver(table) {
    if (!('ResizeObserver' in window) || !table) return;
    tableResizeObserver =
      tableResizeObserver ||
      new ResizeObserver(() => {
        reposition();
      });
    tableResizeObserver.observe(table);
  }
  function detachResizeObserver() {
    if (tableResizeObserver && lastTable) {
      try {
        tableResizeObserver.unobserve(lastTable);
      } catch {}
    }
  }
  function observeDOM() {
    if (domObserver) return;
    const target = document.body;
    if (!target || !('MutationObserver' in window)) return;
    domObserver = new MutationObserver(() => {
      if (lastTable && !lastTable.isConnected) {
        lastTable = null;
        grandTotals = null;
        grandWorking = false;
        hidePanel();
        window.ExcelHelperNS &&
          window.ExcelHelperNS.clearSelection &&
          window.ExcelHelperNS.clearSelection();
      }
    });
    domObserver.observe(target, { subtree: true, childList: true });
  }
  function initTotals() {
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    observeDOM();
  }

  window.ExcelHelperNS = window.ExcelHelperNS || {};
  Object.assign(window.ExcelHelperNS, {
    initTotals,
    updateAllTableTotals,
    hideTotals: hidePanel,
  });
})();

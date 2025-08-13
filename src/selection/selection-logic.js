// selection-logic.js - fixed selectionStart & mode keys
(function () {
  // guard if already loaded
  if (window.__EH_SELECTION_LOGIC_LOADED_FIX) return;
  window.__EH_SELECTION_LOGIC_LOADED_FIX = true;
  let isMouseDown = false;
  let selectionType = 'cell';
  let selectionStart = null;
  let activeTable = null;
  let lastPreventTS = 0;
  let additive = false;
  let baseSnapshot = null;
  let lastHoverKey = '';
  let frameScheduled = false;
  let pendingRect = null;
  let prevRect = null;
  // autoscroll state
  let lastPointerX = 0;
  let lastPointerY = 0;
  let autoScrollRAF = 0;
  let scrollContainer = null;
  const EDGE_THRESHOLD = 60; // px
  const MAX_SPEED = 24; // px per frame (~1440px/s at 60fps)

  function suppressNative(e) {
    if (!window.ExcelHelperNS.getSettings().selectionMode) return;
    if (isMouseDown) {
      e.preventDefault();
    }
  }

  function onTableMouseDown(e) {
    const settings = window.ExcelHelperNS.getSettings();
    if (!settings.selectionMode) return;
    if (
      e.target.closest('.table-filter-row') ||
      e.target.closest('.eh-value-dropdown') ||
      e.target.closest('.eh-date-quick-panel')
    )
      return;
    const cell = e.target.closest('td, th');
    if (!cell) return;
    const table = cell.closest('table');
    activeTable = table;
    const rowIndex = cell.parentElement.rowIndex;
    const colIndex = cell.cellIndex;
    additive = e.ctrlKey || e.metaKey;
    if (additive) {
      baseSnapshot = new Set(window.ExcelHelperNS.getSelectedCells());
    } else {
      window.ExcelHelperNS.clearSelection();
      baseSnapshot = null;
    }
    // mode keys: Shift -> row selection, Alt -> column selection (sadece ilk basışta)
    if (e.shiftKey) {
      selectionType = 'row';
      selectionStart = rowIndex;
    } else if (e.altKey) {
      selectionType = 'col';
      selectionStart = colIndex;
    } else {
      selectionType = 'cell';
      selectionStart = { row: rowIndex, col: colIndex };
    }
    isMouseDown = true;
  // determine scroll container once per drag
  scrollContainer = findScrollContainer(activeTable) || document.scrollingElement || document.documentElement;
  startAutoScroll();
    prevRect = null;
    document.body.classList.add('eh-selecting');
    e.preventDefault();
    window.ExcelHelperNS.beginSelectionBatch();
    window.ExcelHelperNS.updateStatusPanel &&
      window.ExcelHelperNS.updateStatusPanel('lite');
    // Tek tıklamada da başlangıç öğesini hemen seç (drag olmasa bile)
    try {
      if (selectionType === 'cell') {
        window.ExcelHelperNS.addCell && window.ExcelHelperNS.addCell(cell);
        prevRect = { minR: rowIndex, maxR: rowIndex, minC: colIndex, maxC: colIndex };
      } else if (selectionType === 'row') {
        addRowRange(rowIndex, rowIndex);
        prevRect = { minR: rowIndex, maxR: rowIndex, minC: 0, maxC: cell.parentElement.cells.length - 1 };
      } else if (selectionType === 'col') {
        addColumnRange(colIndex, colIndex);
        prevRect = { minR: 0, maxR: activeTable.rows.length - 1, minC: colIndex, maxC: colIndex };
      }
    } catch {}
  }

  function addRowRange(minR, maxR) {
    for (let r = minR; r <= maxR; r++) {
      const row = activeTable.rows[r];
      if (!row) continue;
      window.ExcelHelperNS.addRow(row);
    }
  }
  function addColumnRange(minC, maxC) {
    for (let c = minC; c <= maxC; c++) {
      window.ExcelHelperNS.addColumn(activeTable, c);
    }
  }
  function addCellRectangle(minR, maxR, minC, maxC, forceFull) {
    if (forceFull) {
      for (let r = minR; r <= maxR; r++) {
        const row = activeTable.rows[r];
        if (!row) continue;
        for (let c = minC; c <= maxC; c++) {
          const cc = row.cells[c];
          if (cc) window.ExcelHelperNS.addCell(cc);
        }
      }
      prevRect = { minR, maxR, minC, maxC };
      return;
    }
    if (!prevRect) {
      addCellRectangle(minR, maxR, minC, maxC, true);
      return;
    }
    if (
      minR > prevRect.minR ||
      maxR < prevRect.maxR ||
      minC > prevRect.minC ||
      maxC < prevRect.maxC
    ) {
      window.ExcelHelperNS.clearSelection();
      if (baseSnapshot) {
        baseSnapshot.forEach((c) => {
          if (c.isConnected) window.ExcelHelperNS.addCell(c);
        });
      }
      addCellRectangle(minR, maxR, minC, maxC, true);
      return;
    }
    if (minR < prevRect.minR) {
      for (let r = minR; r < prevRect.minR; r++) {
        const row = activeTable.rows[r];
        if (!row) continue;
        for (let c = minC; c <= maxC; c++) {
          const cc = row.cells[c];
          if (cc) window.ExcelHelperNS.addCell(cc);
        }
      }
    }
    if (maxR > prevRect.maxR) {
      for (let r = prevRect.maxR + 1; r <= maxR; r++) {
        const row = activeTable.rows[r];
        if (!row) continue;
        for (let c = minC; c <= maxC; c++) {
          const cc = row.cells[c];
          if (cc) window.ExcelHelperNS.addCell(cc);
        }
      }
    }
    if (minC < prevRect.minC) {
      for (
        let r = Math.max(minR, prevRect.minR);
        r <= Math.min(maxR, prevRect.maxR);
        r++
      ) {
        const row = activeTable.rows[r];
        if (!row) continue;
        for (let c = minC; c < prevRect.minC; c++) {
          const cc = row.cells[c];
          if (cc) window.ExcelHelperNS.addCell(cc);
        }
      }
    }
    if (maxC > prevRect.maxC) {
      for (
        let r = Math.max(minR, prevRect.minR);
        r <= Math.min(maxR, prevRect.maxR);
        r++
      ) {
        const row = activeTable.rows[r];
        if (!row) continue;
        for (let c = prevRect.maxC + 1; c <= maxC; c++) {
          const cc = row.cells[c];
          if (cc) window.ExcelHelperNS.addCell(cc);
        }
      }
    }
    prevRect = {
      minR: Math.min(prevRect.minR, minR),
      maxR: Math.max(prevRect.maxR, maxR),
      minC: Math.min(prevRect.minC, minC),
      maxC: Math.max(prevRect.maxC, maxC),
    };
  }

  function processRect() {
    if (!pendingRect) return;
    const { rowIndex, colIndex } = pendingRect;
    if (!isMouseDown || !selectionStart || !activeTable) return;
    if (selectionType === 'col') {
      const [minC, maxC] = [
        Math.min(selectionStart, colIndex),
        Math.max(selectionStart, colIndex),
      ];
      window.ExcelHelperNS.clearSelection();
      if (baseSnapshot)
        baseSnapshot.forEach((c) => {
          if (c.isConnected) window.ExcelHelperNS.addCell(c);
        });
      addColumnRange(minC, maxC);
      prevRect = { minR: 0, maxR: activeTable.rows.length - 1, minC, maxC };
    } else if (selectionType === 'row') {
      const [minR, maxR] = [
        Math.min(selectionStart, rowIndex),
        Math.max(selectionStart, rowIndex),
      ];
      window.ExcelHelperNS.clearSelection();
      if (baseSnapshot)
        baseSnapshot.forEach((c) => {
          if (c.isConnected) window.ExcelHelperNS.addCell(c);
        });
      addRowRange(minR, maxR);
      prevRect = {
        minR,
        maxR,
        minC: 0,
        maxC: activeTable.rows[0] ? activeTable.rows[0].cells.length - 1 : 0,
      };
    } else {
      const [minR, maxR] = [
        Math.min(selectionStart.row, rowIndex),
        Math.max(selectionStart.row, rowIndex),
      ];
      const [minC, maxC] = [
        Math.min(selectionStart.col, colIndex),
        Math.max(selectionStart.col, colIndex),
      ];
      addCellRectangle(minR, maxR, minC, maxC, false);
    }
    pendingRect = null;
  }

  function scheduleFrame() {
    if (frameScheduled) return;
    frameScheduled = true;
    requestAnimationFrame(() => {
      frameScheduled = false;
      window.ExcelHelperNS.beginSelectionBatch();
      processRect();
      window.ExcelHelperNS.endSelectionBatch();
      window.ExcelHelperNS.updateToolbarStats &&
        window.ExcelHelperNS.updateToolbarStats();
    });
  }
  function onMouseMove(e) {
    if (!isMouseDown) return;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  }
  function findScrollContainer(el) {
    try {
      let node = el;
      while (node && node !== document.body && node !== document.documentElement) {
        const cs = window.getComputedStyle(node);
        const ovY = cs.overflowY;
        if ((ovY === 'auto' || ovY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
          return node;
        }
        node = node.parentElement;
      }
    } catch (_) {
      // no-op
    }
    return document.scrollingElement || document.documentElement;
  }
  function startAutoScroll() {
    if (autoScrollRAF) return;
    const step = () => {
      autoScrollRAF = 0;
      if (!isMouseDown || !selectionStart) return; // stop
      // detect proximity to viewport edges
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const topDist = lastPointerY;
      const botDist = vh - lastPointerY;
      let dy = 0;
      if (topDist >= 0 && topDist < EDGE_THRESHOLD) {
        const ratio = (EDGE_THRESHOLD - topDist) / EDGE_THRESHOLD;
        dy = -Math.ceil(ratio * MAX_SPEED);
      } else if (botDist >= 0 && botDist < EDGE_THRESHOLD) {
        const ratio = (EDGE_THRESHOLD - botDist) / EDGE_THRESHOLD;
        dy = Math.ceil(ratio * MAX_SPEED);
      }
      if (dy !== 0 && scrollContainer) {
        const maxScroll = (scrollContainer.scrollHeight || 0) - (scrollContainer.clientHeight || 0);
        const cur = scrollContainer.scrollTop || 0;
        const next = Math.max(0, Math.min(maxScroll, cur + dy));
        if (next !== cur) {
          scrollContainer.scrollTop = next;
          // As content moves under pointer, ensure selection keeps updating even if mouseover doesn't fire.
          const el = document.elementFromPoint(lastPointerX, lastPointerY);
          if (el && activeTable && (el.closest && el.closest('table') === activeTable)) {
            const cell = el.closest('td, th');
            if (cell) {
              const rowIndex = cell.parentElement.rowIndex;
              const colIndex = cell.cellIndex;
              const key = rowIndex + ':' + colIndex;
              if (key !== lastHoverKey) {
                lastHoverKey = key;
                pendingRect = { rowIndex, colIndex };
                scheduleFrame();
              }
            }
          }
        }
      }
      autoScrollRAF = requestAnimationFrame(step);
    };
    autoScrollRAF = requestAnimationFrame(step);
  }
  function onTableMouseEnter(e) {
    if (!isMouseDown || !selectionStart) return;
    const cell = e.target.closest('td, th');
    if (!cell) return;
    if (cell.closest('table') !== activeTable) return;
    const rowIndex = cell.parentElement.rowIndex;
    const colIndex = cell.cellIndex;
    const key = rowIndex + ':' + colIndex;
    if (key === lastHoverKey) return;
    lastHoverKey = key;
    pendingRect = { rowIndex, colIndex };
    scheduleFrame();
    if (performance.now() - lastPreventTS > 30) {
      lastPreventTS = performance.now();
      e.preventDefault();
    }
  }
  function onMouseUp() {
    if (isMouseDown) {
      processRect();
      window.ExcelHelperNS.endSelectionBatch();
      window.ExcelHelperNS.finalizeSelection &&
        window.ExcelHelperNS.finalizeSelection();
      window.ExcelHelperNS.updateAllTableTotals &&
        window.ExcelHelperNS.updateAllTableTotals();
      window.ExcelHelperNS.updateToolbarStats &&
        window.ExcelHelperNS.updateToolbarStats();
    }
    isMouseDown = false;
    selectionStart = null;
    activeTable = null;
    baseSnapshot = null;
    prevRect = null;
    if (autoScrollRAF) {
      cancelAnimationFrame(autoScrollRAF);
      autoScrollRAF = 0;
    }
    document.body.classList.remove('eh-selecting');
  }
  function onDocumentClick(e) {
    const settings = window.ExcelHelperNS.getSettings();
    if (!settings.selectionMode) return;
    const toolbar = document.getElementById('excel-helper-toolbar');
    if (toolbar && (toolbar === e.target || toolbar.contains(e.target))) return;
  // Reco UI (kopyala baloncuğu ve diğerleri) içinde tıklama seçimleri temizlememeli
  const recoRoot = document.getElementById('hkyy-root');
  if (recoRoot && (recoRoot === e.target || recoRoot.contains(e.target))) return;
    const totals = document.getElementById('eh-floating-totals');
    if (totals && (totals === e.target || totals.contains(e.target))) return;
    if (
      e.target.closest('.table-filter-row') ||
      e.target.closest('.eh-value-dropdown') ||
      e.target.closest('.eh-date-quick-panel')
    )
      return;
    if (e.target.closest('table')) return;
    if (window.ExcelHelperNS.getSelectedCells().length) {
      window.ExcelHelperNS.clearSelection();
    }
  }
  function attachSelectionHandlers() {
    if (window.__EH_SELECTION_EVENTS_ATTACHED) return;
    window.__EH_SELECTION_EVENTS_ATTACHED = true;
    document.addEventListener('mousedown', onTableMouseDown, { capture: true });
  document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseover', onTableMouseEnter, true);
    document.addEventListener('mouseup', onMouseUp, true);
    document.addEventListener('selectstart', suppressNative, true);
    document.addEventListener('click', onDocumentClick, true);
  }
  window.ExcelHelperNS = window.ExcelHelperNS || {};
  Object.assign(window.ExcelHelperNS, { attachSelectionHandlers });
})();

// header-init.js - global
(function () {
  function processTable(table) {
    if (!table || table.__excelHelperProcessed) return;
    if (!table.rows.length) {
      table.__excelHelperProcessed = true;
      return;
    }
    const firstRow = table.rows[0];
    for (let c = 0; c < firstRow.cells.length; c++) {
      firstRow.cells[c].classList.add('col-header');
    }
    for (let r = 1; r < table.rows.length; r++) {
      const row = table.rows[r];
      if (row && row.cells.length) {
        row.cells[0].classList.add('row-header');
      }
    }
    table.__excelHelperProcessed = true;
  }
  function initHeaders() {
    document.querySelectorAll('table').forEach(processTable);
  }
  window.ExcelHelperNS = window.ExcelHelperNS || {};
  Object.assign(window.ExcelHelperNS, {
    initHeaders,
    _processTable: processTable,
  });
})();

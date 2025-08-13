// aggregate.js - computeStats global
(function () {
  function computeStats(cells) {
    if (!cells || !cells.length) return base();
    const numbers = [];
    let totalCells = 0;
    cells.forEach((cell) => {
      if (!cell) return;
      totalCells++;
      const val = window.ExcelHelperNS.parseNumericValue(
        cell.textContent.trim()
      );
      if (val !== null) numbers.push(val);
    });
    if (!numbers.length) return { ...base(), totalCells };
    let sum = 0,
      min = numbers[0],
      max = numbers[0];
    for (let i = 0; i < numbers.length; i++) {
      const n = numbers[i];
      sum += n;
      if (n < min) min = n;
      if (n > max) max = n;
    }
    return {
      totalCells,
      count: numbers.length,
      sum,
      avg: sum / numbers.length,
      min,
      max,
      numbers,
    };
  }
  function base() {
    return {
      totalCells: 0,
      count: 0,
      sum: 0,
      avg: 0,
      min: 0,
      max: 0,
      numbers: [],
    };
  }
  window.ExcelHelperNS = window.ExcelHelperNS || {};
  Object.assign(window.ExcelHelperNS, { computeStats });
})();

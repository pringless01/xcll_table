describe('excel-exporter ensureXLSX early return and buildAOA no-table branch', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\export\\excel-exporter.js');
  });

  test('ensureXLSX resolves immediately when XLSX already present', async () => {
    global.XLSX = global.XLSX || { utils: {}, writeFile: () => {} };
    const { ensureXLSX } = window.ExcelHelperNS.__test;
    const t0 = Date.now();
    await ensureXLSX();
    const dt = Date.now() - t0;
    expect(dt).toBeLessThan(50);
  });

  test('getSelectionAOA skips cells without a table', () => {
    const td = document.createElement('td'); // not in any table
    window.ExcelHelperNS.getSelectedCells = () => [td];
    const aoa = window.ExcelHelperNS.getSelectionAOA();
    expect(Array.isArray(aoa)).toBe(true);
    expect(aoa.length).toBe(0);
  });
});

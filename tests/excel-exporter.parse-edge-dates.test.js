describe('excel-exporter parse edge date branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\export\\excel-exporter.js');
  });

  test('parseCellValue two-digit year and time missing seconds', () => {
    const { parseCellValue } = window.ExcelHelperNS.__test;
    const p1 = parseCellValue('31-12-24 23:59');
    expect(p1.kind).toBe('date');
    const p2 = parseCellValue('01/01/2025');
    expect(p2.kind).toBe('date');
  });
});

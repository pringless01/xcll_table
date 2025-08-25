describe('excel-exporter parse more number branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\export\\excel-exporter.js');
  });

  test('non-breaking space and negative number parsing', () => {
    const { parseCellValue } = window.ExcelHelperNS.__test;
    expect(parseCellValue('\u00A0-12,50').kind).toBe('number');
    expect(parseCellValue(' -0.75 ').value).toBe(-0.75);
  });
});

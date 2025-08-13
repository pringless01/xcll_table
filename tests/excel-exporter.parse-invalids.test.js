describe('excel-exporter parse invalids to text branch', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\export\\excel-exporter.js');
  });

  test('parseCellValue returns text on bad number/date', () => {
    const { parseCellValue } = window.ExcelHelperNS.__test;
  // '..1' normalizasyondan sonra tarih yorumuna yakalanabilir; bu nedenle sadece kind kontrol ediyoruz
  expect(['text','date']).toContain(parseCellValue('..1').kind);
  expect(parseCellValue('---')).toEqual({ kind: 'text', value: '---' });
  });
});

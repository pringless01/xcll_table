describe('excel-exporter optimizeAOA branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\export\\excel-exporter.js');
  });

  test('optimizeAOA returns same when fully populated (no trim)', () => {
    const { optimizeAOA } = window.ExcelHelperNS.__test;
    const aoa = [[1, 2, 3]];
    const out = optimizeAOA(aoa);
    expect(out).toEqual(aoa);
  });

  test('optimizeAOA keeps empty separator rows and trims outer blanks', () => {
    const { optimizeAOA } = window.ExcelHelperNS.__test;
    const aoa = [
      ['', { v: 1, t: 'n' }, ''],
      [],
      ['', '', 'x']
    ];
    const out = optimizeAOA(aoa);
    expect(out).toEqual([
      [{ v: 1, t: 'n' }, ''],
      [],
      ['', 'x']
    ]);
  });

  test('optimizeAOA early return on empty aoa', () => {
    const { optimizeAOA } = window.ExcelHelperNS.__test;
    expect(optimizeAOA([])).toEqual([]);
  });
});

describe('number-utils parse and format branches', () => {
  beforeAll(() => {
    global.window = window;
    require('..\\src\\core\\number-utils.js');
  });

  test('parseNumericValue handles currency, negatives, thousand separators', () => {
    expect(window.ExcelHelperNS.parseNumericValue('₺ 1.234,56')).toBeCloseTo(1234.56);
    expect(window.ExcelHelperNS.parseNumericValue('(1.234,56)')).toBeCloseTo(-1234.56);
    expect(window.ExcelHelperNS.parseNumericValue('−2.500')).toBeCloseTo(-2500); // minus sign
    expect(window.ExcelHelperNS.parseNumericValue('abc')).toBeNull();
  });

  test('formatNumber caches and formats correctly', () => {
    expect(window.ExcelHelperNS.formatNumber(0)).toBe('0');
    const v1 = window.ExcelHelperNS.formatNumber(1234.56);
    const v2 = window.ExcelHelperNS.formatNumber(1234.56);
    expect(v1).toBe(v2);
  });
});

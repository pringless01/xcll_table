describe('i18n helper t()', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    // chrome.i18n intentionally absent to trigger fallback
    delete chrome.i18n;
    require('..\\src\\core\\i18n.js');
  });

  test('returns TR fallback when chrome.i18n not available', () => {
    expect(window.ExcelHelperNS.t('prev_tab')).toBe('Önceki sekme');
  });

  test('replaces placeholders like $1 with provided subs', () => {
    expect(window.ExcelHelperNS.t('search_will', ['ABC'])).toBe('Aranacak: ABC');
  });
});

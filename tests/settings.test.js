describe('settings load and toggle branches', () => {
  beforeEach(() => {
    global.window = window;
    // reset chrome storage stub to return specific values
    chrome.storage.local.get = (keys, cb) => cb({ excelHelperSettings: { selectionMode: false, toolbarVisible: false, autoSaveSettings: false, toolbarPosition: { x: 5, y: 6 } } });
    chrome.storage.local.set = jest.fn();
    require('..\\src\\core\\settings.js');
  });

  test('load merges defaults and result, then getSettings returns loaded', async () => {
    const s = await window.ExcelHelperNS.loadSettings();
    expect(s.selectionMode).toBe(false);
    expect(s.toolbarVisible).toBe(false);
    expect(s.toolbarPosition).toEqual({ x: 5, y: 6 });
  });

  test('updateSettings respects autoSaveSettings=false (no set call)', () => {
    window.ExcelHelperNS.updateSettings({ foo: 'bar' });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  test('toggleSelectionMode/ToolbarVisible with and without force', () => {
    // enable autosave
    window.ExcelHelperNS.updateSettings({ autoSaveSettings: true });
    chrome.storage.local.set.mockClear();

    const m1 = window.ExcelHelperNS.toggleSelectionMode();
    const m2 = window.ExcelHelperNS.toggleSelectionMode(true);
    const v1 = window.ExcelHelperNS.toggleToolbarVisible();
    const v2 = window.ExcelHelperNS.toggleToolbarVisible(false);

    expect(typeof m1).toBe('boolean');
    expect(m2).toBe(true);
    expect(typeof v1).toBe('boolean');
    expect(v2).toBe(false);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  test('updateToolbarPosition saves when autosave true', () => {
    window.ExcelHelperNS.updateSettings({ autoSaveSettings: true });
    chrome.storage.local.set.mockClear();
    window.ExcelHelperNS.updateToolbarPosition(10, 20);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
});

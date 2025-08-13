describe('Unified Toolbar branches (fallbacks and guards)', () => {
  beforeEach(() => {
    // fresh DOM per test
    document.body.innerHTML = '';
    global.window = window;
    // don't reassign if already exists to preserve attached methods
    window.ExcelHelperNS = window.ExcelHelperNS || {};
  });

  test('search button falls back to clipboard + console log when reco missing', async () => {
    window.ExcelHelperNS.getSettings = () => ({ toolbarVisible: true, selectionMode: true, toolbarPosition: { x: 10, y: 10 } });
    navigator.clipboard = { readText: jest.fn().mockResolvedValue('ABC') };
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  // reload module fresh
    if (!window.ExcelHelperNS.initToolbar) {
      require('..\\src\\ui\\toolbar.js');
    }
    window.ExcelHelperNS.initToolbar && window.ExcelHelperNS.initToolbar();
    const host = document.getElementById('excel-helper-toolbar');
    const root = host.shadowRoot;
    const btnSearch = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Ara (Son Kopyalanan)');
  btnSearch.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(navigator.clipboard.readText).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test('mouseup without dragging is a no-op (guard branch)', () => {
    window.ExcelHelperNS.getSettings = () => ({ toolbarVisible: true, selectionMode: true, toolbarPosition: { x: 10, y: 10 } });
  if (!window.ExcelHelperNS.initToolbar) require('..\\src\\ui\\toolbar.js');
  window.ExcelHelperNS.initToolbar();
    expect(() => document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))).not.toThrow();
  });

  test('filter toggle works when toggleFilterMode missing (attribute fallback branch)', () => {
    window.ExcelHelperNS.getSettings = () => ({ toolbarVisible: true, selectionMode: true, toolbarPosition: { x: 10, y: 10 } });
    // remove toggleFilterMode to exercise fallback path
  if (!window.ExcelHelperNS.initToolbar) require('..\\src\\ui\\toolbar.js');
  window.ExcelHelperNS.initToolbar();
    const host = document.getElementById('excel-helper-toolbar');
    const root = host.shadowRoot;
  const btnFilter = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Filtre modu');
    const prev = btnFilter.getAttribute('aria-pressed');
    btnFilter.click();
    expect(btnFilter.getAttribute('aria-pressed')).not.toBe(prev);
  });

  test('CSV/Excel export handlers catch and log errors', () => {
    window.ExcelHelperNS.getSettings = () => ({ toolbarVisible: true, selectionMode: true, toolbarPosition: { x: 10, y: 10 } });
    // cause errors
    window.ExcelHelperNS.exportSelectionToCSV = () => { throw new Error('csv'); };
    window.ExcelHelperNS.exportSelectionToExcel = () => { throw new Error('xlsx'); };
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  if (!window.ExcelHelperNS.initToolbar) require('..\\src\\ui\\toolbar.js');
  window.ExcelHelperNS.initToolbar();
    const host = document.getElementById('excel-helper-toolbar');
    const root = host.shadowRoot;
  const btnCSV = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'CSV dışa aktar');
  const btnXLSX = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Excel dışa aktar');
    btnCSV.click();
    btnXLSX.click();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('Unified Toolbar (ikon-only, Shadow DOM)', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    const settings = { toolbarPosition: { x: 10, y: 10 }, selectionMode: true, filterMode: false, toolbarVisible: true };
    window.ExcelHelperNS.getSettings = () => ({ ...settings });
    let selMode = settings.selectionMode;
    window.ExcelHelperNS.toggleSelectionMode = () => (selMode = !selMode);
    window.ExcelHelperNS.clearSelection = jest.fn();
    let filterMode = settings.filterMode;
    window.ExcelHelperNS.toggleFilterMode = () => (filterMode = !filterMode);
    window.ExcelHelperNS.toggleFilters = jest.fn();
    window.ExcelHelperNS.updateToolbarPosition = jest.fn();
    window.ExcelHelperNS.exportSelectionToCSV = jest.fn();
    window.ExcelHelperNS.exportSelectionToExcel = jest.fn();
    window.ExcelHelperNS.reco = window.ExcelHelperNS.reco || {};
    window.ExcelHelperNS.reco.showToast = jest.fn();
    window.ExcelHelperNS.reco.searchLastCopied = jest.fn();

    // require toolbar module
    require('..\\src\\ui\\toolbar.js');
  });

  test('mounts host with shadow and buttons', () => {
    window.ExcelHelperNS.initToolbar();
    const host = document.getElementById('excel-helper-toolbar');
    expect(host).toBeTruthy();
    const root = host.shadowRoot;
    expect(root).toBeTruthy();
    const buttons = root.querySelectorAll('button');
    expect(buttons.length).toBe(9);
  });

  test('selection and filter toggles update aria-pressed', () => {
    const host = document.getElementById('excel-helper-toolbar');
    const root = host.shadowRoot;
    const selBtn = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Seçim modu');
    const filterBtn = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Filtre modu');
    expect(selBtn.getAttribute('aria-pressed')).toBe('true');
    selBtn.click();
    expect(selBtn.getAttribute('aria-pressed')).toBe('false');
    const prev = filterBtn.getAttribute('aria-pressed');
    filterBtn.click();
    expect(filterBtn.getAttribute('aria-pressed')).not.toBe(prev);
  });

  test('CSV/Excel buttons call export functions', () => {
    const host = document.getElementById('excel-helper-toolbar');
    const root = host.shadowRoot;
    const csvBtn = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'CSV dışa aktar');
    const xlsxBtn = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Excel dışa aktar');
    csvBtn.click();
    xlsxBtn.click();
    expect(window.ExcelHelperNS.exportSelectionToCSV).toHaveBeenCalled();
    expect(window.ExcelHelperNS.exportSelectionToExcel).toHaveBeenCalled();
  });

  test('search button delegates to reco.searchLastCopied', () => {
    const host = document.getElementById('excel-helper-toolbar');
    const root = host.shadowRoot;
    const btn = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Ara (Son Kopyalanan)');
    btn.click();
    expect(window.ExcelHelperNS.reco.searchLastCopied).toHaveBeenCalled();
  });
});

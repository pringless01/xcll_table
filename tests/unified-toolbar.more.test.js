describe('Unified Toolbar interactions (shortcuts, drag, tab ops)', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    const settings = { toolbarPosition: { x: 10, y: 10 }, selectionMode: true, filterMode: false, toolbarVisible: true };
    window.ExcelHelperNS.getSettings = () => ({ ...settings });
    let selMode = settings.selectionMode;
    window.ExcelHelperNS.toggleSelectionMode = () => (selMode = !selMode);
    let filterMode = settings.filterMode;
    window.ExcelHelperNS.toggleFilterMode = () => (filterMode = !filterMode);
    window.ExcelHelperNS.toggleFilters = jest.fn();
    window.ExcelHelperNS.updateToolbarPosition = jest.fn();
    window.ExcelHelperNS.exportSelectionToCSV = jest.fn();
    window.ExcelHelperNS.exportSelectionToExcel = jest.fn();
    window.ExcelHelperNS.reco = window.ExcelHelperNS.reco || {};
    window.ExcelHelperNS.reco.showToast = jest.fn();
    window.ExcelHelperNS.reco.searchLastCopied = jest.fn();
    navigator.clipboard = navigator.clipboard || {};
    navigator.clipboard.writeText = jest.fn().mockResolvedValue();

    // stub chrome.runtime.sendMessage
    chrome.runtime.sendMessage = jest.fn((msg, cb) => cb && cb({ ok: true }));

    require('..\\src\\ui\\toolbar.js');
    window.ExcelHelperNS.initToolbar();
  });

  test('keyboard shortcuts trigger actions', () => {
    // Ctrl+F
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: false, key: 'f' }));
    expect(window.ExcelHelperNS.reco.searchLastCopied).toHaveBeenCalled();
    // Ctrl+Shift+S (selection)
    const host = document.getElementById('excel-helper-toolbar');
    const root = host.shadowRoot;
    const selBtn = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Seçim modu');
    const prev = selBtn.getAttribute('aria-pressed');
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 's' }));
    expect(selBtn.getAttribute('aria-pressed')).not.toBe(prev);
    // Ctrl+Shift+F (filter)
    const filterBtn = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Filtre modu');
    const fprev = filterBtn.getAttribute('aria-pressed');
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'f' }));
    expect(filterBtn.getAttribute('aria-pressed')).not.toBe(fprev);
    // Ctrl+Shift+C (csv)
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'c' }));
    expect(window.ExcelHelperNS.exportSelectionToCSV).toHaveBeenCalled();
    // Ctrl+Shift+E (excel)
    document.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'e' }));
    expect(window.ExcelHelperNS.exportSelectionToExcel).toHaveBeenCalled();
  });

  test('drag host updates persisted position', () => {
    const host = document.getElementById('excel-helper-toolbar');
    const r = host.getBoundingClientRect();
    host.dispatchEvent(new MouseEvent('mousedown', { clientX: r.left + 5, clientY: r.top + 5, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + 25, clientY: r.top + 35, bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(window.ExcelHelperNS.updateToolbarPosition).toHaveBeenCalled();
  });

  test('tab prev/next and close send runtime messages', () => {
    const host = document.getElementById('excel-helper-toolbar');
    const root = host.shadowRoot;
    const [btnPrev, btnNext, btnSearch, btnCopyId, btnClose] = root.querySelectorAll('button');
    btnPrev.click();
    btnNext.click();
    btnClose.click();
    const payloads = chrome.runtime.sendMessage.mock.calls.map((c) => c[0]);
    expect(payloads.some((p) => p && p.type === 'SWITCH_TAB' && p.direction === 'prev')).toBe(true);
    expect(payloads.some((p) => p && p.type === 'SWITCH_TAB' && p.direction === 'next')).toBe(true);
    expect(payloads.some((p) => p && p.type === 'CLOSE_ACTIVE_TAB')).toBe(true);
  });

  test('copy-id uses hash and clipboard', async () => {
    const host = document.getElementById('excel-helper-toolbar');
    const root = host.shadowRoot;
    // change hash to include id
    window.location.hash = '#/customers/detail/1234567';
    const btnCopyId = Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'ID kopyala');
    await btnCopyId.click();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1234567');
  });
});

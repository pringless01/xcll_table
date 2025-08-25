describe('messaging extra branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {
      updateSettings: jest.fn(),
      getSelectionAOA: () => [],
      getSelectedCells: () => []
    };
    require('..\\src\\core\\messaging.js');
  });

  test('toggle-selection updates settings', (done) => {
    chrome.runtime.sendMessage({ type: 'toggle-selection', state: true }, (res) => {
      expect(res.success).toBe(true);
      expect(window.ExcelHelperNS.updateSettings).toHaveBeenCalledWith({ selectionMode: true });
      done();
    });
  });

  test('get-selected-data returns success=false when aoa empty', (done) => {
    window.ExcelHelperNS.getSelectionAOA = () => [];
    chrome.runtime.sendMessage({ type: 'get-selected-data' }, (res) => {
      expect(res.success).toBe(false);
      done();
    });
  });

  test('get-selected-data returns data when aoa present', (done) => {
    window.ExcelHelperNS.getSelectionAOA = () => [[{ t: 'n', v: 1 }, 'a']];
    chrome.runtime.sendMessage({ type: 'get-selected-data' }, (res) => {
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      done();
    });
  });

  test('ping-toolbar-state false without bar, true with visible bar', (done) => {
    chrome.runtime.sendMessage({ type: 'ping-toolbar-state' }, (res1) => {
      expect(res1.visible).toBe(false);
      const d = document.createElement('div'); d.id = 'excel-helper-toolbar'; d.style.display = 'block'; document.body.appendChild(d);
      chrome.runtime.sendMessage({ type: 'ping-toolbar-state' }, (res2) => {
        expect(res2.visible).toBe(true);
        done();
      });
    });
  });
});


describe('messaging', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {
      getSelectedCells: () => [],
      updateSettings: () => {},
      getSelectionAOA: () => [],
      parseNumericValue: (s) => { const n = Number(String(s).replace(',','.')); return isNaN(n) ? null : n; }
    };
  require('..\\src\\core\\messaging.js');
  });

  test('copy-selection returns success false when nothing selected', (done) => {
    chrome.runtime.sendMessage({ type: 'copy-selection' }, (res) => {
      expect(res.success).toBe(false);
      done();
    });
  });

  test('sum-selection computes numeric sum', (done) => {
    const td1 = document.createElement('td'); td1.textContent = '10,5';
    const td2 = document.createElement('td'); td2.textContent = '20.5';
    window.ExcelHelperNS.getSelectedCells = () => [td1, td2];
    chrome.runtime.sendMessage({ type: 'sum-selection' }, (res) => {
      expect(res.success).toBe(true);
      expect(res.total).toBeCloseTo(31, 1);
      expect(res.count).toBe(2);
      done();
    });
  });
});

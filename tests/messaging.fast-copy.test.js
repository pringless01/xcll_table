describe('messaging fast-copy-selection success', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    window.ExcelHelperNS.getSelectionAOA = () => [[{ v: 1, t: 'n' }, { v: new Date('2024-01-02T03:04:05Z'), t: 'd' }]];
    navigator.clipboard.writeText = jest.fn();
    require('..\\src\\core\\messaging.js');
  });

  test('returns success true and count', (done) => {
    chrome.runtime.sendMessage({ type: 'fast-copy-selection' }, (res) => {
      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      done();
    });
  });
});

describe('messaging clipboard error branch', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {
      getSelectionAOA: () => [[{ v: 'a', t: 's' }]]
    };
    // Force clipboard to throw
    navigator.clipboard.writeText = () => { throw new Error('denied'); };
    require('..\\src\\core\\messaging.js');
  });

  test('copy-selection returns error when clipboard fails', (done) => {
    chrome.runtime.sendMessage({ type: 'copy-selection' }, (res) => {
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Clipboard/);
      done();
    });
  });
});

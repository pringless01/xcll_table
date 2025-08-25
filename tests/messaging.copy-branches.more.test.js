describe('messaging copy-selection deep branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    const d = new Date('2024-01-02T03:04:05Z');
    window.ExcelHelperNS.getSelectionAOA = () => [[ null, {}, { v: d }, { v: 7 }, 'a"b', 'x\ty', 'm\nn' ]];
    navigator.clipboard.writeText = jest.fn();
    require('..\\src\\core\\messaging.js');
  });

  test('copy-selection escapes and stringifies complex cells', (done) => {
    chrome.runtime.sendMessage({ type: 'copy-selection' }, (res) => {
      expect(res.success).toBe(true);
      const text = navigator.clipboard.writeText.mock.calls[0][0];
      // expect quoting on cells with quotes, tabs or newlines
      expect(text).toMatch(/"a""b"/);
      expect(text).toMatch(/"x\ty"/);
      expect(text).toMatch(/"m\nn"/);
      done();
    });
  });
});

describe('messaging copy-selection tsvEscape branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    window.ExcelHelperNS.getSelectionAOA = () => [[ 'a\tb', 'c"d', 'x\ny' ]];
    navigator.clipboard.writeText = jest.fn();
    require('..\\src\\core\\messaging.js');
  });

  test('quotes and tabs/newlines are escaped and clipboard is called', (done) => {
    chrome.runtime.sendMessage({ type: 'copy-selection' }, (res) => {
      expect(res.success).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      const text = navigator.clipboard.writeText.mock.calls[0][0];
      expect(text).toMatch(/^"a\tb"\t"c""d"\t"x\ny"$/);
      done();
    });
  });
});

describe('messaging ping-toolbar-state when hidden', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\core\\messaging.js');
  });

  test('returns visible=false when toolbar exists but display none', (done) => {
    const d = document.createElement('div');
    d.id = 'excel-helper-toolbar';
    d.style.display = 'none';
    document.body.appendChild(d);
    chrome.runtime.sendMessage({ type: 'ping-toolbar-state' }, (res) => {
      expect(res.visible).toBe(false);
      done();
    });
  });
});

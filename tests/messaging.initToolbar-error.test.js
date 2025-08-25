describe('messaging initToolbar error branch', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {
      initToolbar: () => { throw new Error('boom'); },
      toggleToolbarVisible: () => {}
    };
    require('..\\src\\core\\messaging.js');
  });

  test('toggle-toolbar responds false when initToolbar fails', (done) => {
    chrome.runtime.sendMessage({ type: 'toggle-toolbar' }, (res) => {
      expect(res.visible).toBe(false);
      done();
    });
  });
});

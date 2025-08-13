describe('messaging toolbar more branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {
      initToolbar: () => { const d=document.createElement('div'); d.id='excel-helper-toolbar'; d.style.display='block'; document.body.appendChild(d); },
      toggleToolbarVisible: jest.fn()
    };
    require('..\\src\\core\\messaging.js');
  });

  test('toggle-toolbar when bar exists toggles visible->hidden', (done) => {
    const bar = document.createElement('div');
    bar.id = 'excel-helper-toolbar';
    bar.style.display = 'block';
    document.body.appendChild(bar);
    chrome.runtime.sendMessage({ type: 'toggle-toolbar' }, (res) => {
      expect(res.visible).toBe(false);
      expect(window.ExcelHelperNS.toggleToolbarVisible).toHaveBeenCalledWith(false);
      done();
    });
  });
});

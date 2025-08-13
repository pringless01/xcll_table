describe('messaging toggle-toolbar branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {
      initToolbar: ()=>{ const d=document.createElement('div'); d.id='excel-helper-toolbar'; d.style.display='none'; document.body.appendChild(d); },
      toggleToolbarVisible: ()=>{}
    };
    require('..\\src\\core\\messaging.js');
  });

  test('toggle-toolbar init if missing and switch visibility', (done) => {
    const bar0 = document.getElementById('excel-helper-toolbar');
    expect(bar0).toBeNull();
    chrome.runtime.sendMessage({ type: 'toggle-toolbar' }, (res1) => {
      const bar1 = document.getElementById('excel-helper-toolbar');
      expect(bar1).not.toBeNull();
      expect(res1.visible).toBe(true);
      chrome.runtime.sendMessage({ type: 'toggle-toolbar' }, (res2) => {
        expect(res2.visible).toBe(false);
        done();
      });
    });
  });
});

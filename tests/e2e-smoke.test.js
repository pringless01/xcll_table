describe('E2E smoke – toolbar toggle + message flow', () => {
  beforeAll(() => {
    // Simulate content environment
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {
      initToolbar() {
        const d = document.createElement('div');
        d.id = 'excel-helper-toolbar';
        d.style.display = 'none';
        document.body.appendChild(d);
      },
      toggleToolbarVisible() {},
      updateSettings() {},
    };

    // inject messaging.js to handle toggle-toolbar
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'core', 'messaging.js'),
      'utf8'
    );
    const script = document.createElement('script');
    script.textContent = code;
    document.head.appendChild(script);
  });

  test('toggle toolbar visible state cycles', (done) => {
    const bar = document.getElementById('excel-helper-toolbar');
    expect(bar).toBeNull();
    chrome.runtime.sendMessage({ type: 'toggle-toolbar' }, (res1) => {
      const b1 = document.getElementById('excel-helper-toolbar');
      expect(b1).not.toBeNull();
      expect(res1.visible).toBe(true);

      chrome.runtime.sendMessage({ type: 'toggle-toolbar' }, (res2) => {
        expect(res2.visible).toBe(false);
        done();
      });
    });
  });
});

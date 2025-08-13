describe('toolbar storage sync', () => {
  let listeners = [];
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    window.ExcelHelperNS.getSettings = () => ({ toolbarVisible: true, selectionMode: true, toolbarPosition: { x: 10, y: 10 } });
    // prepare storage.onChanged before requiring toolbar
    if (!chrome.storage) chrome.storage = {};
    chrome.storage.onChanged = { addListener: (fn) => listeners.push(fn) };
    require('..\\src\\ui\\toolbar.js');
    window.ExcelHelperNS.initToolbar();
  });

  test('applies position when chrome.storage.onChanged fires for excelHelperSettings', () => {
    const host = document.getElementById('excel-helper-toolbar');
    expect(host).toBeTruthy();
    const oldLeft = host.style.left;
    const oldTop = host.style.top;
    // simulate storage change event
    const newPos = { x: 222, y: 333 };
  const changes = { excelHelperSettings: { newValue: { toolbarPosition: newPos } } };
  // trigger registered listeners
  listeners.forEach((fn) => fn(changes, 'local'));
    expect(host.style.left === oldLeft && host.style.top === oldTop).toBe(false);
    expect(host.style.left).toBe(newPos.x + 'px');
    expect(host.style.top).toBe(newPos.y + 'px');
  });
});

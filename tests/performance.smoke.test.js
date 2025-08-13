describe('performance smoke', () => {
  test('toolbar drag and selection updates are responsive', () => {
    // Mount minimal toolbar host
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\ui\\toolbar.js');
    // init toolbar
    window.ExcelHelperNS.getSettings = () => ({ toolbarVisible: true, selectionMode: true, toolbarPosition: { x: 10, y: 10 } });
    window.ExcelHelperNS.initToolbar();
    const host = document.getElementById('excel-helper-toolbar');
    expect(host).toBeTruthy();

    const start = performance.now();
    // Simulate quick drag moves
    const down = new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 });
    const move1 = new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 70 });
    const move2 = new MouseEvent('mousemove', { bubbles: true, clientX: 130, clientY: 90 });
    const up = new MouseEvent('mouseup', { bubbles: true });

    const sr = host.shadowRoot;
    const handle = sr.querySelector('.drag-handle');
    expect(handle).toBeTruthy();
    handle.dispatchEvent(down);
    document.dispatchEvent(move1);
    document.dispatchEvent(move2);
    document.dispatchEvent(up);
    const end = performance.now();

    // Should complete within a modest budget in test env
    expect(end - start).toBeLessThan(100);
  });
});

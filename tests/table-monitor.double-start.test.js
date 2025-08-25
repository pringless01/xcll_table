describe('table-monitor double start and processed tables', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    window.ExcelHelperNS.eventBus = { emit: jest.fn() };
  });

  test('does not re-initialize when already started', () => {
    require('..\\src\\dom\\table-monitor.js');
    const fn = window.ExcelHelperNS.startTableMonitor;
    expect(typeof fn).toBe('function');
    // call second time should early-return without throwing
    fn();
    // No assertion apart from no-throw; but we can dispatch pagehide to clean up
    window.dispatchEvent(new Event('pagehide'));
  });

  test('skips tables already processed (__excelHelperProcessed)', (done) => {
    window.ExcelHelperNS._processTable = jest.fn();
    const t = document.createElement('table');
    t.__excelHelperProcessed = true;
    const tr = document.createElement('tr');
    tr.appendChild(document.createElement('td'));
    t.appendChild(tr);
    document.body.appendChild(t);
    require('..\\src\\dom\\table-monitor.js');
    setTimeout(() => {
      expect(window.ExcelHelperNS.eventBus.emit).not.toHaveBeenCalled();
      expect(window.ExcelHelperNS._processTable).not.toHaveBeenCalled();
      done();
    }, 20);
  });
});

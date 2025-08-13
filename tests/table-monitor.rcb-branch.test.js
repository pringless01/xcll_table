describe('table-monitor requestIdleCallback branch', () => {
  beforeAll(() => {
    document.body.innerHTML = '';
    // stub requestIdleCallback
    window.requestIdleCallback = (cb) => setTimeout(cb, 0);
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    window.ExcelHelperNS.eventBus = { emit: jest.fn() };
    require('..\\src\\dom\\table-monitor.js');
  });

  test('continues scanning via requestIdleCallback', (done) => {
    // create more than SCAN_BATCH tables (50) to force continuation
    for (let i = 0; i < 55; i++) {
      const t = document.createElement('table');
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      tr.appendChild(td); t.appendChild(tr); document.body.appendChild(t);
    }
    setTimeout(() => {
      expect(window.ExcelHelperNS.eventBus.emit).toHaveBeenCalled();
      done();
    }, 30);
  });
});

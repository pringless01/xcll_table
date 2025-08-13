describe('table-monitor edge branches', () => {
  beforeAll(() => {
    document.body.innerHTML = '';
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    window.ExcelHelperNS.eventBus = { emit: jest.fn() };
    require('..\\src\\dom\\table-monitor.js');
  });

  test('scan with no tables and later add triggers emit once', (done) => {
    // initially no tables => no emit
    expect(window.ExcelHelperNS.eventBus.emit).not.toHaveBeenCalled();

    // add a table later to trigger MutationObserver path
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    tr.appendChild(td);
    table.appendChild(tr);
    document.body.appendChild(table);

    setTimeout(() => {
      expect(window.ExcelHelperNS.eventBus.emit).toHaveBeenCalledWith('tables:added', expect.any(Object));
      done();
    }, 30);
  });
});

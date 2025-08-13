describe('excel-exporter CSV date/object branch', () => {
  beforeAll(() => {
    // clean DOM and load module
    document.body.innerHTML = '';
    // minimal table with a date value to produce {v: Date, t:'d'}
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = '12.01.2024 10:20:30';
    td.className = 'eh-selected';
    tr.appendChild(td);
    table.appendChild(tr);
    document.body.appendChild(table);

    // stub selection to return that td
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    window.ExcelHelperNS.getSelectedCells = () => [td];

    // require exporter (defines getSelectionAOA/exportSelectionToCSV)
    require('..\\src\\export\\excel-exporter.js');
  });

  test('exportSelectionToCSV handles Date inside cell objects', () => {
    jest.useFakeTimers();
    // spy on alert to ensure not called on happy path
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    // hook URL to avoid errors
    const revokeSpy = jest
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});

    // Execute
  window.ExcelHelperNS.exportSelectionToCSV();
  // revoke zamanlayıcı ile çağrılır, zamanlayıcıları çalıştır
  jest.runOnlyPendingTimers();

    expect(alertSpy).not.toHaveBeenCalled();
    // ensure revoke was scheduled
    expect(revokeSpy).toHaveBeenCalled();

    alertSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});

describe('excel-exporter CSV deeper branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\export\\excel-exporter.js');
  });

  test('exportSelectionToCSV covers null/object-no-v/object-v(date)/object-v(non-date)/primitives', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const revokeSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    jest.useFakeTimers();

    const d = new Date('2024-05-06T07:08:09Z');
  // seçim varmış gibi davranması için en az bir hücre ver
  const dummy = document.createElement('td');
  window.ExcelHelperNS.getSelectedCells = () => [dummy];
    window.ExcelHelperNS.getSelectionAOA = () => [[
      null,                 // null branch
      {},                   // object without v
      { v: d, t: 'd' },     // object v is Date
      { v: 123, t: 'n' },   // object v is number (non-date)
      42,                   // primitive number
      'a"b,c'              // primitive string with quotes & comma
    ]];

    window.ExcelHelperNS.exportSelectionToCSV();
    jest.runOnlyPendingTimers();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();

    alertSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});

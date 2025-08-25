describe('excel-exporter alert branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\export\\excel-exporter.js');
  });

  test('exportSelectionToExcel alerts when no selection', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    window.ExcelHelperNS.getSelectedCells = () => [];
    await window.ExcelHelperNS.exportSelectionToExcel();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test('exportSelectionToCSV alerts when no selection', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    window.ExcelHelperNS.getSelectedCells = () => [];
    window.ExcelHelperNS.exportSelectionToCSV();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test('exportSelectionToCSV alerts when aoa empty', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const td = document.createElement('td');
    window.ExcelHelperNS.getSelectedCells = () => [td];
    // force empty aoa
    const orig = window.ExcelHelperNS.getSelectionAOA;
    window.ExcelHelperNS.getSelectionAOA = () => [];
    window.ExcelHelperNS.exportSelectionToCSV();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/Veri yok|No data/i));
    // restore
    window.ExcelHelperNS.getSelectionAOA = orig;
    alertSpy.mockRestore();
  });
});

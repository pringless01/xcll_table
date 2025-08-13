// Coverage için dosyayı require ile yüklüyoruz

describe('excel-exporter buildAOA', () => {
  beforeAll(() => {
    // inject minimal ExcelHelperNS and exporter script
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};

  require('..\\src\\export\\excel-exporter.js');
  });

  test('wraps numbers and dates correctly and exports CSV', () => {
    // Build a simple table
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = '123,45';
    const td2 = document.createElement('td');
    td2.textContent = '01-02-2024 10:20';
    const td3 = document.createElement('td');
    td3.textContent = 'text';
    tr.append(td1, td2, td3);
    table.append(tr);
    document.body.appendChild(table);

    window.ExcelHelperNS.getSelectedCells = () => [td1, td2, td3];

    const aoa = window.ExcelHelperNS.getSelectionAOA();
    expect(aoa.length).toBe(1);
    expect(aoa[0][0].t).toBe('n');
    expect(aoa[0][1].t).toBe('d');
    expect(aoa[0][2]).toBe('text');

    // CSV export shouldn't throw
    window.ExcelHelperNS.exportSelectionToCSV();
  });
});

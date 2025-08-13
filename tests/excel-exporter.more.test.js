
describe('excel-exporter extra', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
  require('..\\src\\export\\excel-exporter.js');
  });

  test('getSelectionAOA trims outer empty columns', () => {
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = ''; // boş kolon
    const td2 = document.createElement('td'); td2.textContent = 'X';
    const td3 = document.createElement('td'); td3.textContent = ''; // boş kolon
    tr.append(td1, td2, td3);
    table.append(tr);
    document.body.appendChild(table);

    window.ExcelHelperNS.getSelectedCells = () => [td2];

    const aoa = window.ExcelHelperNS.getSelectionAOA();
    expect(aoa[0].length).toBe(1);
    expect(aoa[0][0]).toBe('X');
  });
});

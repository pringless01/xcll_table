describe('excel-exporter CSV escape', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    require('..\\src\\export\\excel-exporter.js');
  });

  test('quotes, commas and newlines are escaped', () => {
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = 'text,with,comma';
    const td2 = document.createElement('td'); td2.textContent = '"quoted"';
    const td3 = document.createElement('td'); td3.textContent = 'line\nbreak';
    tr.append(td1, td2, td3); table.append(tr); document.body.appendChild(table);

    window.ExcelHelperNS.getSelectedCells = () => [td1, td2, td3];

  let captured = null;
    const OldBlob = global.Blob;
  global.Blob = function(data, opts){ captured = String(data[0]); return { __blob: true, data, opts }; };
    const oldURL = global.URL.createObjectURL;
    global.URL.createObjectURL = () => 'blob://capture';

    window.ExcelHelperNS.exportSelectionToCSV();

  expect(typeof captured).toBe('string');
  expect(captured).toContain('"text,with,comma"');
  expect(captured).toContain('"""quoted"""');
  expect(captured).toContain('"line\nbreak"');

    // restore
    global.Blob = OldBlob;
    global.URL.createObjectURL = oldURL;
  });
});

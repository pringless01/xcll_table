describe('excel-exporter parse branches', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    // Stub document.createElement to auto-fire script onload (ensureXLSX branch)
    const realCreate = document.createElement.bind(document);
    document.createElement = (tag) => {
      const el = realCreate(tag);
      if (tag.toLowerCase() === 'script') {
        setTimeout(() => { if (typeof el.onload === 'function') el.onload(); }, 0);
      }
      return el;
    };
    require('..\\src\\export\\excel-exporter.js');
  });

  test('parse number, invalid number -> text, and date fallback', () => {
    const table = document.createElement('table');
    const tr = document.createElement('tr');
    const td1 = document.createElement('td'); td1.textContent = '  42.5 ';
    const td2 = document.createElement('td'); td2.textContent = 'abc';
    const td3 = document.createElement('td'); td3.textContent = '2024/01/02 03:04:05';
    const td4 = document.createElement('td'); td4.textContent = '01-02-24'; // 2-digit year
    tr.append(td1, td2, td3, td4); table.append(tr); document.body.appendChild(table);
    window.ExcelHelperNS.getSelectedCells = () => [td1, td2, td3, td4];
    const aoa = window.ExcelHelperNS.getSelectionAOA();
    expect(aoa[0][0].t).toBe('n');
    expect(typeof aoa[0][0].v).toBe('number');
    expect(aoa[0][1]).toBe('abc');
    expect(aoa[0][2].t).toBe('d');
    expect(aoa[0][3].t).toBe('d');
  });

  test('exportSelectionToExcel ensures XLSX present via ensureXLSX', async () => {
    delete global.XLSX;
    // Provide minimal XLSX after ensureXLSX fires onload
    setTimeout(() => {
      global.XLSX = {
        utils: {
          aoa_to_sheet: (aoa)=>({ aoa }),
          book_new: ()=>({ sheets: [] }),
          book_append_sheet: (wb, ws)=>{ wb.sheets.push(ws); }
        },
        writeFile: jest.fn()
      };
    }, 0);
    // Minimal selection for export
    const td = document.createElement('td'); td.textContent = '1';
    window.ExcelHelperNS.getSelectedCells = () => [td];
    await window.ExcelHelperNS.exportSelectionToExcel();
    expect(global.XLSX && global.XLSX.writeFile).toBeTruthy();
  });
});

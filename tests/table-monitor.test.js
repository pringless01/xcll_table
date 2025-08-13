const fs = require('fs');
const path = require('path');

describe('table-monitor', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    // EventBus'ı önceden hazırla; emit çağrılarını testin atadığı callback'e yönlendir.
    window.__tm_onemit = null;
    window.ExcelHelperNS.eventBus = { emit: (evt, payload) => { if (window.__tm_onemit) window.__tm_onemit(evt, payload); } };
  require('..\\src\\dom\\table-monitor.js');
  });

  test('processes added tables and emits event', (done) => {
    window.ExcelHelperNS._processTable = (tbl) => {
      tbl.setAttribute('data-excel-processed', '1');
    };
    window.__tm_onemit = (evt, payload) => {
      if (evt === 'tables:added' && payload.tables.length === 1) {
        expect(payload.tables[0].getAttribute('data-excel-processed')).toBe('1');
        done();
      }
    };
    const tbl = document.createElement('table');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = '1';
    tr.appendChild(td);
    tbl.appendChild(tr);
    document.body.appendChild(tbl);
  });
});

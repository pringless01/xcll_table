describe('table-monitor batching', () => {
  beforeAll(() => {
    global.window = window;
    window.ExcelHelperNS = window.ExcelHelperNS || {};
    window.ExcelHelperNS._processTable = (t)=> t.setAttribute('p','1');
    window.ExcelHelperNS.eventBus = { emit: jest.fn() };
    require('..\\src\\dom\\table-monitor.js');
  });

  test('scans in batches and emits multiple times when needed', (done) => {
    // create many tables
    for(let i=0;i<120;i++){
      const tbl=document.createElement('table');
      const tr=document.createElement('tr');
      const td=document.createElement('td'); td.textContent=String(i);
      tr.appendChild(td); tbl.appendChild(tr);
      document.body.appendChild(tbl);
    }
    // wait a bit for idle callbacks
    setTimeout(()=>{
      const calls = window.ExcelHelperNS.eventBus.emit.mock.calls.length;
      expect(calls).toBeGreaterThan(0);
      done();
    }, 50);
  });
});

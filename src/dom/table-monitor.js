// table-monitor.js - yeni eklenen tabloları izler
(function(){
  const bus = (window.ExcelHelperNS && window.ExcelHelperNS.eventBus) || { emit:()=>{} };
  let observer=null;
  function scan(){
    const added=[];
    document.querySelectorAll('table').forEach(t=>{ if(!t.__excelHelperProcessed){ window.ExcelHelperNS._processTable && window.ExcelHelperNS._processTable(t); added.push(t);} });
    if(added.length) bus.emit('tables:added',{tables:added});
  }
  function startMonitoring(){
    if(observer) return; scan();
    observer = new MutationObserver(muts=>{
      let need=false;
      for(const m of muts){ if(m.addedNodes && m.addedNodes.length){ need=true; break; } }
      if(need) scan();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
  window.ExcelHelperNS = window.ExcelHelperNS || {}; Object.assign(window.ExcelHelperNS,{startTableMonitor:startMonitoring});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',startMonitoring); else startMonitoring();
})();

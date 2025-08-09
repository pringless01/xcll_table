// status-panel.js - global
(function(){
  let el; let lightweight=true; let lastLiteCount=0; let rafId=null;
  function ensureEl(){ if(el) return el; el=document.createElement('div'); el.id='selection-status'; el.style.cssText='position:fixed;bottom:10px;right:10px;background:#333;color:#fff;padding:8px 12px;border-radius:5px;font:11px monospace;z-index:10000;max-width:300px;line-height:1.4;'; document.body.appendChild(el); return el; }
  function renderLite(count){ ensureEl(); el.style.display='block'; el.innerHTML='Hücre: '+count; }
  function renderFull(){ const snap=window.ExcelHelperNS.snapshot(); if(!snap.cells.length){ if(el) el.style.display='none'; return; } ensureEl(); el.style.display='block'; const stats=window.ExcelHelperNS.computeStats(snap.cells); let lines=['Hücre: '+snap.cells.length]; if(stats.count){ lines.push('Toplam: '+window.ExcelHelperNS.formatNumber(stats.sum)+' | Sayı: '+stats.count); if(stats.count>1) lines.push('Min: '+window.ExcelHelperNS.formatNumber(stats.min)+' Max: '+window.ExcelHelperNS.formatNumber(stats.max)+' Avg: '+window.ExcelHelperNS.formatNumber(stats.avg)); } el.innerHTML=lines.join('<br>'); }
  function scheduleLite(count){ if(count===lastLiteCount) return; lastLiteCount=count; if(rafId) cancelAnimationFrame(rafId); rafId=requestAnimationFrame(()=>renderLite(count)); }
  function updateStatusPanel(mode){ if(mode==='full'){ lightweight=false; renderFull(); } else { lightweight=true; renderLite(window.ExcelHelperNS.getSelectedCells().length); } }
  function initStatusPanel(){ const bus=window.ExcelHelperNS.eventBus; if(!bus) return; bus.on('selection:changed',()=>{ if(lightweight) scheduleLite(window.ExcelHelperNS.getSelectedCells().length); }); }
  function finalizeSelection(){ lightweight=false; renderFull(); setTimeout(()=>{ lightweight=true; },50); }
  window.ExcelHelperNS = window.ExcelHelperNS || {}; Object.assign(window.ExcelHelperNS,{initStatusPanel,updateStatusPanel,finalizeSelection});
})();

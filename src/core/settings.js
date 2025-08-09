// settings.js - Global settings (non-ESM build)

(function(){
  const DEFAULTS = { toolbarPosition:{x:10,y:10}, selectionMode:true, autoSaveSettings:true, toolbarVisible:true };
  let current = { ...DEFAULTS }; let loaded=false;
  async function loadSettings(){ if(loaded) return current; try { const result = await new Promise(r=>chrome.storage.local.get(['excelHelperSettings'],d=>r(d.excelHelperSettings||{}))); current={...DEFAULTS,...result}; loaded=true; } catch(e){ console.warn('[settings] load failed',e);} return current; }
  function getSettings(){ return current; }
  function updateSettings(patch){ current={...current,...patch}; if(current.autoSaveSettings) chrome.storage.local.set({excelHelperSettings:current}); return current; }
  function updateToolbarPosition(x,y){ current.toolbarPosition={x,y}; if(current.autoSaveSettings) chrome.storage.local.set({excelHelperSettings:current}); }
  function toggleSelectionMode(force){ const nm = typeof force==='boolean'?force:!current.selectionMode; current.selectionMode=nm; if(current.autoSaveSettings) chrome.storage.local.set({excelHelperSettings:current}); return nm; }
  function toggleToolbarVisible(force){ const ns = typeof force==='boolean'?force:!current.toolbarVisible; current.toolbarVisible=ns; if(current.autoSaveSettings) chrome.storage.local.set({excelHelperSettings:current}); return ns; }
  window.ExcelHelperNS = window.ExcelHelperNS || {}; Object.assign(window.ExcelHelperNS,{loadSettings,getSettings,updateSettings,updateToolbarPosition,toggleSelectionMode,toggleToolbarVisible});
})();

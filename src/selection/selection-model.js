// selection-model.js - global selection model (unified class + flag + SPA safe)
(function(){
  if(window.__EH_SELECTION_MODEL_LOADED) return; window.__EH_SELECTION_MODEL_LOADED=true;
  const state={ cells:new Set(), version:0 };
  let lastSnapshotVersion=-1; let lastSnapshot=null;
  let batching=0; let pendingEmit=false;
  const CLS='eh-selected';
  function emitChange(){ const bus=window.ExcelHelperNS.eventBus; if(bus) bus.emit('selection:changed',{version:state.version,count:state.cells.size}); }
  function scheduleEmit(){ if(batching>0){ pendingEmit=true; } else { emitChange(); } }
  function beginSelectionBatch(){ batching++; }
  function endSelectionBatch(){ if(batching>0) batching--; if(batching===0 && pendingEmit){ pendingEmit=false; emitChange(); } }
  function clearSelection(){ if(!state.cells.size) return; state.cells.forEach(c=>{ c.classList.remove(CLS,'selected-cell','selected-row','selected-col'); c._ehSel=false; }); state.cells.clear(); state.version++; scheduleEmit(); }
  function addCell(cell){ if(!cell || cell._ehSel) return; cell.classList.add(CLS); cell._ehSel=true; state.cells.add(cell); state.version++; scheduleEmit(); }
  function addRow(rowEl){ if(!rowEl) return; let added=false; for(const td of rowEl.cells){ if(!td._ehSel){ td.classList.add(CLS); td._ehSel=true; state.cells.add(td); added=true; } } if(added){ state.version++; scheduleEmit(); } }
  function addColumn(table,colIndex){ if(!table) return; let added=false; for(let r=0;r<table.rows.length;r++){ const row=table.rows[r]; if(!row||row.classList.contains('table-filter-row')) continue; const cell=row.cells[colIndex]; if(cell && !cell._ehSel){ cell.classList.add(CLS); cell._ehSel=true; state.cells.add(cell); added=true; } } if(added){ state.version++; scheduleEmit(); } }
  function getSelectedCells(){ return Array.from(state.cells); }
  function snapshot(){ if(lastSnapshot&&lastSnapshotVersion===state.version) return lastSnapshot; const cells=getSelectedCells(); const numericValues=[]; cells.forEach(c=>{ if(c._ehNum!==undefined){ if(c._ehNum!==null) numericValues.push(c._ehNum); return; } const v=window.ExcelHelperNS.parseNumericValue(c.textContent.trim()); c._ehNum=v; if(v!==null) numericValues.push(v); }); lastSnapshot={cells,numericValues,version:state.version}; lastSnapshotVersion=state.version; return lastSnapshot; }
  // Orphan cleanup (SPA route değişimi sonrası DOM'dan kopan hücreleri ayıkla)
  function sweepOrphans(){ let removed=0; state.cells.forEach(c=>{ if(!c.isConnected){ state.cells.delete(c); removed++; } }); if(removed){ state.version++; emitChange(); } }
  setInterval(sweepOrphans,5000);
  window.ExcelHelperNS = window.ExcelHelperNS || {}; Object.assign(window.ExcelHelperNS,{clearSelection,addCell,addRow,addColumn,getSelectedCells,snapshot,beginSelectionBatch,endSelectionBatch});
})();

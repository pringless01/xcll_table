// selection-logic.js - global selection logic (SPA safe)
(function(){
  if(window.__EH_SELECTION_LOGIC_LOADED) return; window.__EH_SELECTION_LOGIC_LOADED=true;
  let isMouseDown=false; let selectionType='cell'; let selectionStart=null; let activeTable=null; let lastPreventTS=0; let additive=false; let baseSnapshot=null; let lastHoverKey=''; let frameScheduled=false;
  let pendingRect=null; let prevRect=null; // prevRect: {minR,maxR,minC,maxC}

  function suppressNative(e){ if(!window.ExcelHelperNS.getSettings().selectionMode) return; if(isMouseDown){ e.preventDefault(); } }

  function onTableMouseDown(e){ const settings=window.ExcelHelperNS.getSettings(); if(!settings.selectionMode) return; const cell=e.target.closest('td, th'); if(!cell) return; const table=cell.closest('table'); activeTable=table; const rowIndex=cell.parentElement.rowIndex; const colIndex=cell.cellIndex; additive = e.ctrlKey || e.metaKey; if(additive){ baseSnapshot = new Set(window.ExcelHelperNS.getSelectedCells()); } else { window.ExcelHelperNS.clearSelection(); baseSnapshot=null; }
    if(cell.classList.contains('col-header')){ selectionType='col'; selectionStart=colIndex; addColumnRange(colIndex,colIndex); }
    else if(cell.classList.contains('row-header')){ selectionType='row'; selectionStart=rowIndex; addRowRange(rowIndex,rowIndex); }
    else { selectionType='cell'; selectionStart={row:rowIndex,col:colIndex}; addCellRectangle(rowIndex,rowIndex,colIndex,colIndex,true); }
    isMouseDown=true; prevRect=null; document.body.classList.add('eh-selecting'); e.preventDefault(); window.ExcelHelperNS.beginSelectionBatch(); window.ExcelHelperNS.updateStatusPanel && window.ExcelHelperNS.updateStatusPanel('lite'); }

  function addRowRange(minR,maxR){ for(let r=minR;r<=maxR;r++){ const row=activeTable.rows[r]; if(!row) continue; window.ExcelHelperNS.addRow(row); } }
  function addColumnRange(minC,maxC){ for(let c=minC;c<=maxC;c++){ window.ExcelHelperNS.addColumn(activeTable,c); } }

  function addCellRectangle(minR,maxR,minC,maxC,forceFull){
    if(forceFull){ for(let r=minR;r<=maxR;r++){ const row=activeTable.rows[r]; if(!row) continue; for(let c=minC;c<=maxC;c++){ const cc=row.cells[c]; if(cc) window.ExcelHelperNS.addCell(cc); } } prevRect={minR,maxR,minC,maxC}; return; }
    if(!prevRect){ addCellRectangle(minR,maxR,minC,maxC,true); return; }
    // shrink detection
    if(minR>prevRect.minR || maxR<prevRect.maxR || minC>prevRect.minC || maxC<prevRect.maxC){
      // Fallback: tam yeniden inşa (additive ise baseSnapshot üzerine)
      window.ExcelHelperNS.clearSelection();
      if(baseSnapshot){ baseSnapshot.forEach(c=>{ if(c.isConnected) window.ExcelHelperNS.addCell(c); }); }
      addCellRectangle(minR,maxR,minC,maxC,true); return;
    }
    // Only expansions processed
    // Top expansion
    if(minR < prevRect.minR){ for(let r=minR; r<prevRect.minR; r++){ const row=activeTable.rows[r]; if(!row) continue; for(let c=minC;c<=maxC;c++){ const cc=row.cells[c]; if(cc) window.ExcelHelperNS.addCell(cc); } } }
    // Bottom expansion
    if(maxR > prevRect.maxR){ for(let r=prevRect.maxR+1; r<=maxR; r++){ const row=activeTable.rows[r]; if(!row) continue; for(let c=minC;c<=maxC;c++){ const cc=row.cells[c]; if(cc) window.ExcelHelperNS.addCell(cc); } } }
    // Left expansion (excluding corners already handled)
    if(minC < prevRect.minC){ for(let r=Math.max(minR,prevRect.minR); r<=Math.min(maxR,prevRect.maxR); r++){ const row=activeTable.rows[r]; if(!row) continue; for(let c=minC; c<prevRect.minC; c++){ const cc=row.cells[c]; if(cc) window.ExcelHelperNS.addCell(cc); } } }
    // Right expansion
    if(maxC > prevRect.maxC){ for(let r=Math.max(minR,prevRect.minR); r<=Math.min(maxR,prevRect.maxR); r++){ const row=activeTable.rows[r]; if(!row) continue; for(let c=prevRect.maxC+1; c<=maxC; c++){ const cc=row.cells[c]; if(cc) window.ExcelHelperNS.addCell(cc); } } }
    prevRect={
      minR: Math.min(prevRect.minR,minR),
      maxR: Math.max(prevRect.maxR,maxR),
      minC: Math.min(prevRect.minC,minC),
      maxC: Math.max(prevRect.maxC,maxC)
    };
  }

  function processRect(){ if(!pendingRect) return; const {rowIndex,colIndex}=pendingRect; if(!isMouseDown||!selectionStart||!activeTable) return; if(selectionType==='col'){ const [minC,maxC]=[Math.min(selectionStart,colIndex),Math.max(selectionStart,colIndex)]; if(!prevRect){ addColumnRange(minC,maxC); prevRect={minR:0,maxR:activeTable.rows.length-1,minC,maxC}; } else {
        // simple fallback: full rebuild for columns (less frequent)
        window.ExcelHelperNS.clearSelection(); if(baseSnapshot) baseSnapshot.forEach(c=>{ if(c.isConnected) window.ExcelHelperNS.addCell(c); }); addColumnRange(minC,maxC); prevRect={minR:0,maxR:activeTable.rows.length-1,minC,maxC};
      }
    }
    else if(selectionType==='row'){ const [minR,maxR]=[Math.min(selectionStart,rowIndex),Math.max(selectionStart,rowIndex)]; if(!prevRect){ addRowRange(minR,maxR); prevRect={minR,maxR,minC:0,maxC:activeTable.rows[0]?activeTable.rows[0].cells.length-1:0}; } else {
        window.ExcelHelperNS.clearSelection(); if(baseSnapshot) baseSnapshot.forEach(c=>{ if(c.isConnected) window.ExcelHelperNS.addCell(c); }); addRowRange(minR,maxR); prevRect={minR,maxR,minC:0,maxC:activeTable.rows[0]?activeTable.rows[0].cells.length-1:0};
      }
    }
    else { const [minR,maxR]=[Math.min(selectionStart.row,rowIndex),Math.max(selectionStart.row,rowIndex)]; const [minC,maxC]=[Math.min(selectionStart.col,colIndex),Math.max(selectionStart.col,colIndex)]; addCellRectangle(minR,maxR,minC,maxC,false); }
    pendingRect=null; }

  function scheduleFrame(){ if(frameScheduled) return; frameScheduled=true; requestAnimationFrame(()=>{ frameScheduled=false; window.ExcelHelperNS.beginSelectionBatch(); processRect(); window.ExcelHelperNS.endSelectionBatch(); }); }

  function onTableMouseEnter(e){ if(!isMouseDown||!selectionStart) return; const cell=e.target.closest('td, th'); if(!cell) return; if(cell.closest('table')!==activeTable) return; const rowIndex=cell.parentElement.rowIndex; const colIndex=cell.cellIndex; const key=rowIndex+':'+colIndex; if(key===lastHoverKey) return; lastHoverKey=key; pendingRect={rowIndex,colIndex}; scheduleFrame(); if(performance.now()-lastPreventTS>30){ lastPreventTS=performance.now(); e.preventDefault(); } }

  function onMouseUp(){ if(isMouseDown){ processRect(); window.ExcelHelperNS.endSelectionBatch(); window.ExcelHelperNS.finalizeSelection && window.ExcelHelperNS.finalizeSelection(); window.ExcelHelperNS.updateAllTableTotals && window.ExcelHelperNS.updateAllTableTotals(); }
    isMouseDown=false; selectionStart=null; activeTable=null; baseSnapshot=null; prevRect=null; document.body.classList.remove('eh-selecting'); }

  function onDocumentClick(e){ const settings=window.ExcelHelperNS.getSettings(); if(!settings.selectionMode) return; const toolbar=document.getElementById('excel-helper-toolbar'); if(toolbar && (toolbar===e.target || toolbar.contains(e.target))) return; const totals=document.getElementById('eh-floating-totals'); if(totals && (totals===e.target || totals.contains(e.target))) return; if(e.target.closest('table')) return; if(window.ExcelHelperNS.getSelectedCells().length){ window.ExcelHelperNS.clearSelection(); } }

  function attachSelectionHandlers(){ if(window.__EH_SELECTION_EVENTS_ATTACHED) return; window.__EH_SELECTION_EVENTS_ATTACHED=true; document.addEventListener('mousedown',onTableMouseDown,{capture:true}); document.addEventListener('mouseover',onTableMouseEnter,true); document.addEventListener('mouseup',onMouseUp,true); document.addEventListener('selectstart',suppressNative,true); document.addEventListener('click',onDocumentClick,true); }
  window.ExcelHelperNS = window.ExcelHelperNS || {}; Object.assign(window.ExcelHelperNS,{attachSelectionHandlers});
})();

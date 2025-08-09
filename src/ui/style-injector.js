// style-injector.js - global
(function(){
  function ensureStyle(){ if(document.getElementById('excel-helper-style')) return; const style=document.createElement('style'); style.id='excel-helper-style'; style.textContent=`.selected-cell{background:#E7F3FF!important;border:2px solid #0078D4!important}.selected-row{background:#F0F8FF!important}.selected-col{background:#F0F8FF!important}.eh-selected{background:#E7F3FF!important;outline:1px solid #3994d6!important}.eh-selecting, .eh-selecting *{user-select:none!important;-webkit-user-select:none!important;-moz-user-select:none!important}`; document.head.appendChild(style);} 
  window.ExcelHelperNS = window.ExcelHelperNS || {}; Object.assign(window.ExcelHelperNS,{ensureStyle});
})();

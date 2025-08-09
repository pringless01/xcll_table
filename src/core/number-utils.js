// number-utils.js - Global number utils (non-ESM)

(function(){
  const numericValueCache = new Map();
  const formatCache = new Map();
  const numberFormatter = new Intl.NumberFormat('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:2});
  function parseNumericValue(text){ if(!text||typeof text!=='string') return null; if(numericValueCache.has(text)) return numericValueCache.get(text); const original=text.trim(); if(!/[\d,.\-−₺₸₼$€£¥₹₽₾()%]/.test(original)){ numericValueCache.set(text,null); return null;} const isNeg=/^[-−]|^\(|\(-|\(\s*\d/.test(original); let cleaned=original.replace(/[₺₸₼$€£¥₹₽₾%\s()−]/g,m=>{switch(m){case'−':return'-';default:return'';}}).replace(/^-+/,'-'); const commaCount=(cleaned.match(/,/g)||[]).length; const dotCount=(cleaned.match(/\./g)||[]).length; if(commaCount&&dotCount){ cleaned=cleaned.replace(/,(?=\d{3})/g,''); } else if(commaCount===1){ const ci=cleaned.indexOf(','); const after=cleaned.substring(ci+1); if(after.length<=3&&after.length>0&&/^\d+$/.test(after)){ cleaned=cleaned.replace(/\./g,'').replace(',', '.'); } else { cleaned=cleaned.replace(/,/g,''); } } const number=parseFloat(cleaned); const result=isNaN(number)?null:(isNeg&&number>0?-number:number); if(numericValueCache.size>=100) numericValueCache.delete(numericValueCache.keys().next().value); numericValueCache.set(text,result); return result; }
  function formatNumber(num){ if(num===0) return '0'; if(formatCache.has(num)) return formatCache.get(num); const res = numberFormatter.format(num); if(formatCache.size>=50) formatCache.delete(formatCache.keys().next().value); formatCache.set(num,res); return res; }
  window.ExcelHelperNS = window.ExcelHelperNS || {}; Object.assign(window.ExcelHelperNS,{parseNumericValue,formatNumber}); window.parseNumericValue=parseNumericValue;
})();

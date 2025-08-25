// reco/aux-apply.js (simplified) – Mouse 4/5 geri/ileri engelle + apply tetikle (manifest'e eklenmiş olması yeterli)
(function(){
  const NS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  NS.reco = NS.reco || {}; const R = NS.reco;
  if(R._auxApplySimple) return; R._auxApplySimple = true;
  const BTN = new Set([3,4]);
  let lastTs = 0;
  function onAuxClick(e){
    if(e.pointerType && e.pointerType!=='mouse') return;
    if(!BTN.has(e.button)) return;
    const y = window.scrollY, x = window.scrollX;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    // Bazı sitelerde DOM odak değişip scroll tepeye gidebiliyor -> microtask'te restore
    queueMicrotask(()=>{ if(window.scrollY!==y || window.scrollX!==x) window.scrollTo(x,y); });
    const now=Date.now(); if(now - lastTs < 120) return; lastTs = now;
    if(/https:\/\/backoffice\.betcoapps\.com\//i.test(location.href)){
      try { R.triggerApply && R.triggerApply('mouse'+e.button); } catch {}
      if(R.showToast) R.showToast('Apply (yan tuş)');
    } else {
      if(R.showToast) R.showToast('Yan tuş bloklandı');
    }
  }
  // Yalnızca auxclick'i blokla; mousedown/pointerdown serbest kalsın ki layout / focus yan etkileri azalacak
  window.addEventListener('auxclick', onAuxClick, true);
})();

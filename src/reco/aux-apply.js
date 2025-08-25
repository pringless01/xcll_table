// reco/aux-apply.js (simplified) – Mouse 4/5 geri/ileri engelle + apply tetikle (manifest'e eklenmiş olması yeterli)
(function(){
  const NS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  NS.reco = NS.reco || {}; const R = NS.reco;
  if(R._auxApplySimple) return; R._auxApplySimple = true;
  const BTN = new Set([3,4]);
  let lastTs = 0;
  function handlerFactory(block){
    return function(e){
      if(e.pointerType && e.pointerType!=='mouse') return;
      if(!BTN.has(e.button)) return;
      if(block){ e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
      if(block){
        const now=Date.now();
        if(now - lastTs < 120) return; lastTs = now;
        if(/https:\/\/backoffice\.betcoapps\.com\//i.test(location.href)){
          try { R.triggerApply && R.triggerApply('mouse'+e.button); } catch {}
          if(R.showToast) R.showToast('Apply (yan tuş)');
        } else {
          if(R.showToast) R.showToast('Yan tuş bloklandı');
        }
      }
    };
  }
  window.addEventListener('pointerdown', handlerFactory(false), true); // sadece erken tespit (iptal yok)
  window.addEventListener('mousedown', handlerFactory(true), true); // asıl blok
  window.addEventListener('auxclick', handlerFactory(true), true);  // güvence
  // mouseup iptal edilmez; scroll sekmesi vs. etkilenmesin
})();

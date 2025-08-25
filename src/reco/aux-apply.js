// reco/aux-apply.js - yan (mouse 4/5) tuşlarıyla apply tetikleme (izole)
(function(){
  const NS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  NS.reco = NS.reco || {};
  const R = NS.reco;
  if (R._auxApplyReady) return; R._auxApplyReady = true;
  const AUX_BUTTONS = new Set([3,4]); // 3: X1(back), 4: X2(forward)
  let lastFireTs = 0;
  const TRAP_KEY='__hkyy_aux_trap__';
  let trapArmed=false;
  let originalBack=null, originalForward=null;
  const LOCK_KEY='__hkyy_side_btn_lock__';
  const HARD_KEY='__hkyy_side_btn_hard__';
  let hardMode = true; // varsayılan
  try { const saved = localStorage.getItem(HARD_KEY); if(saved!==null) hardMode = saved==='1'; } catch {}
  const FULL_KEY='__hkyy_side_btn_full__';
  let fullBlock=false; // ekstra agresif mod
  try { const savedF = localStorage.getItem(FULL_KEY); if(savedF!==null) fullBlock = savedF==='1'; } catch {}

  function init(){
    // Global engelleme: domain fark etmeksizin side buttons devre dışı
    window.addEventListener('pointerdown', handler, true);
    window.addEventListener('mousedown', handler, true);
    window.addEventListener('mouseup', handler, true);
    window.addEventListener('auxclick', handler, true);
    window.addEventListener('popstate', onPop, false);
  window.addEventListener('pageshow', reinforce, false);
  window.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') setTimeout(reinforce,30); }, false);
  window.addEventListener('keydown', onToggle, true);
  try { sessionStorage.setItem(LOCK_KEY,'1'); } catch {}
  // İlk yükte trap kur
  armTrap();
  announce();
  }
  function handler(e){
    if(e.pointerType && e.pointerType!=='mouse') return;
    if(!AUX_BUTTONS.has(e.button)) return;
    const path = e.composedPath ? e.composedPath() : [];
    if(path.some(el=> el instanceof Element && el.id==='hkyy-root')) return;
    const now=Date.now();
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(hardMode){ try { Object.defineProperty(e,'button',{value: -999, configurable:false}); } catch {} }
    if(now - lastFireTs < 120){ return; }
    lastFireTs = now; armTrap();
    if(/https:\/\/backoffice\.betcoapps\.com\//i.test(location.href)){
      try { R.triggerApply && R.triggerApply('Mouse button '+e.button); } catch {}
    }
  }
  function onToggle(e){
    if(e.altKey && e.shiftKey && e.code==='KeyL'){
      hardMode = !hardMode;
      try { localStorage.setItem(HARD_KEY, hardMode?'1':'0'); } catch {}
      announce();
      e.preventDefault(); e.stopImmediatePropagation();
    }
    if(e.altKey && e.shiftKey && e.code==='KeyB'){
      fullBlock = !fullBlock;
      try { localStorage.setItem(FULL_KEY, fullBlock?'1':'0'); } catch {}
      if(fullBlock) buildWall();
      announce();
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }
  function announce(){
    if(R.showToast){ R.showToast('Yan tuş kilidi: '+ (hardMode?'HARD':'SOFT') + (fullBlock?' + WALL':''),'1900'); }
  }
  function armTrap(){
    try {
      if(!trapArmed){
        // Çoklayarak 3 sentinel ekle (ardışık back spam'ı emsin)
        history.replaceState(Object.assign({}, history.state||{}, {[TRAP_KEY]:'base'}),'' );
        for(let i=0;i<3;i++) history.pushState({[TRAP_KEY]:'trap', layer:i},'');
        originalBack = originalBack || history.back;
        originalForward = originalForward || history.forward;
        // Geçici override (yan tuş native çağrı öncesi JS back tetiklenirse no-op olsun)
        history.back = function(){};
        history.forward = function(){};
        trapArmed=true;
        // 5 saniye sonra hafiflet (override kaldır, sentinel'ler kalsın)
        setTimeout(()=>{
          try { if(originalBack) history.back = originalBack; if(originalForward) history.forward = originalForward; } catch {}
        },5000);
      } else {
        // Mevcutsa üstüne bir sentinel daha ekle (zamanla yenileme)
        history.pushState({[TRAP_KEY]:'trap', layer:Date.now()},'');
      }
    } catch {}
  }
  function onPop(ev){
    try {
      if(!(ev.state && ev.state[TRAP_KEY]==='trap')) {
        // Trap dışı (gerçek) history back oldu; ileri gitmeyi zorla ve trap'i tazele
        try {
          if(sessionStorage.getItem(LOCK_KEY)==='1') {
            history.forward();
            setTimeout(armTrap,50);
          }
        } catch {}
        return;
      }
      // Kullanıcı geri yaptı => tekrar birkaç sentinel ekle
      for(let i=0;i<2;i++) history.pushState({[TRAP_KEY]:'trap', refuel:i},'');
    } catch {}
  }
  function reinforce(){
    try {
      if(sessionStorage.getItem(LOCK_KEY)==='1') {
        // BFCache dönüşü veya yeniden görünürlük sonrası sentinel yenile
        if(trapArmed) history.pushState({[TRAP_KEY]:'trap', reinforce:Date.now()},'');
        else armTrap();
      }
    } catch {}
  }

  // Hard mode ek koruma: beforeunload üzerinden gereksiz navigation engelle denemesi (yan tuş native kaçarsa hızlı geri ileri sarsıntısını azaltır)
  window.addEventListener('beforeunload', function(ev){
    if(!hardMode) return;
    // Çok hızlı yan tuş spam tespiti (son 400ms içinde tetiklendiyse)
    if(Date.now()-lastFireTs < 400){
      ev.preventDefault();
      ev.returnValue='';
      setTimeout(()=>{ try { history.forward(); } catch {} }, 60);
    }
  });

  // WALL mode: history yığınında dev buffer koruma
  function buildWall(){
    if(!fullBlock) return;
    try {
      // mevcut state'i işaretle
      const base = history.state||{};
      history.replaceState(Object.assign({}, base, {[TRAP_KEY]:'wall-base'}), '');
      // 40 sentinel push (fazla büyük ama amaç buffer tüketip kullanıcı geri bastığında sadece sentineller arasında kalması)
      for(let i=0;i<40;i++) history.pushState({[TRAP_KEY]:'wall', idx:i, t:Date.now()}, '');
      trapArmed=true;
    } catch {}
  }
  // Düzenli wall yenile (tamamen yok edilirse tekrar kur)
  setInterval(()=>{ if(fullBlock){ buildWall(); } }, 5000);

  R.initAuxApply = init;
  init();
  try {
    chrome.runtime.onMessage.addListener((msg)=>{
      if(!msg || msg.type!=='reco-mouse-nav-block') return;
      // Sadece engelle ve gerekli ise apply
      armTrap();
      if(msg.dir==='back'){
        if(/https:\/\/backoffice\.betcoapps\.com\//i.test(location.href)){
          try { R.triggerApply && R.triggerApply('Cmd back'); } catch {}
        }
        if(R.showToast) R.showToast('Back engellendi');
      } else if(msg.dir==='forward') {
        if(R.showToast) R.showToast('Forward engellendi');
      }
    });
  } catch {}
  try {
    chrome.runtime.onMessage.addListener((msg)=>{
      if(!msg || msg.type!=='reco-force-forward') return;
      setTimeout(()=>{ try { history.forward(); } catch {}; armTrap(); }, 80);
      if(R.showToast) R.showToast('Forward düzeltme');
    });
  } catch {}
})();

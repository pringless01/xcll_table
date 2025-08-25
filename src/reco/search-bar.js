// chrome benzeri bul çubuğu (Ctrl+F)
(function(){
  const rootNS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  rootNS.reco = rootNS.reco || {};
  const R = rootNS.reco;
  if (R._findBarReady) return; R._findBarReady = true;
  const { state } = R;

  // Dahili durum
  const findState = {
    container: null,
    input: null,
    countLabel: null,
    btnPrev: null,
    btnNext: null,
    btnClose: null,
    matches: [], // {span, order, index}
    activeIndex: -1,
    cache: null, // {nodes:[Text], builtAt}
    building: false,
    lastQuery: '',
    scanToken: null,
    observer: null,
  postPasteAdvance: false,
  };
  const MAX_MATCHES = 2000; // yeterli limit

  function buildUI(){
    if (findState.container) return;
    const host = document.createElement('div');
    host.className = 'hkyy-findbar';
  host.style.cssText = 'position:fixed;top:8px;right:16px;z-index:2147483647;display:flex;gap:8px;align-items:center;background:var(--hkyy-bg,rgba(32,32,40,.92));color:var(--hkyy-fg,#fff);padding:10px 12px;border:1px solid var(--hkyy-border,#444);border-radius:8px;font:13px/1.35 system-ui,Arial,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.40);backdrop-filter:blur(6px)';
    const input = document.createElement('input');
    input.type='text';
    input.placeholder='Ara';
  input.style.cssText='width:260px;background:#1118;border:1px solid #555;color:#fff;padding:6px 8px;border-radius:6px;outline:none;font:13px system-ui';
    const count = document.createElement('span');
    count.textContent='0/0';
  count.style.cssText='min-width:70px;text-align:center;font:12px system-ui;color:#ccc;';
    const btnPrev = document.createElement('button');
    const btnNext = document.createElement('button');
    const btnClose = document.createElement('button');
  [btnPrev,btnNext,btnClose].forEach(b=>{b.type='button';b.style.cssText='background:#222a;border:1px solid #555;color:#ddd;padding:6px 8px;border-radius:6px;cursor:pointer;font:12px system-ui;line-height:1';b.onmouseenter=()=>b.style.background='#333c';b.onmouseleave=()=>b.style.background='#222a';});
    btnPrev.textContent='‹'; btnNext.textContent='›'; btnClose.textContent='✕';
    btnPrev.title='Önceki (Shift+Enter)';
    btnNext.title='Sonraki (Enter)';
    btnClose.title='Kapat (Esc)';
    host.append(input,count,btnPrev,btnNext,btnClose);
    document.documentElement.appendChild(host);
    findState.container=host; findState.input=input; findState.countLabel=count; findState.btnPrev=btnPrev; findState.btnNext=btnNext; findState.btnClose=btnClose;
    btnClose.addEventListener('click', closeFindBar);
    btnNext.addEventListener('click', ()=> jumpRelative(+1));
    btnPrev.addEventListener('click', ()=> jumpRelative(-1));
  input.addEventListener('input', ()=> { input.dataset.userEdited='1'; scheduleSearch(); });
  input.addEventListener('paste', ()=> { input.dataset.userEdited='1'; findState.postPasteAdvance=true; setTimeout(searchNow,0); });
    input.addEventListener('keydown', (e)=>{
      if (e.key==='Enter'){ e.preventDefault(); jumpRelative(e.shiftKey?-1:+1);} else if (e.key==='Escape'){ e.preventDefault(); closeFindBar(); }
    });
  }

  function openFindBar(preset){
    buildUI();
    findState.container.style.display='flex';
    const inp=findState.input;
    if (preset){ inp.value=preset; }
    inp.dataset.userEdited='0';
    // Async clipboard read (overwrite only if user not edited yet)
    (async()=>{
      try {
        const clip = await navigator.clipboard.readText();
        if (inp.dataset.userEdited==='0' && clip && clip.trim() && (!inp.value || inp.value.trim()===preset)) {
          inp.value = clip.trim();
        }
      } catch {}
      if (inp.dataset.userEdited==='0') searchNow();
    })();
    queueMicrotask(()=>{ inp.focus(); inp.select(); searchNow(); });
  }
  function closeFindBar(){
    if (!findState.container) return;
    findState.container.style.display='none';
    clearMatches();
  }

  function ensureObserver(){
    if(findState.observer) return;
    try {
      findState.observer = new MutationObserver(()=>{ findState.cache = null; });
      findState.observer.observe(document.body, {subtree:true, childList:true, characterData:true});
    } catch {}
  }
  function collectTextNodes(){
    ensureObserver();
    if(findState.cache && Date.now() - findState.cache.builtAt < 60000){ return findState.cache.nodes; }
    const nodes=[]; const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode(n){
      const pe=n.parentElement; if(!pe||pe.closest('#hkyy-root')||pe.closest('.hkyy-findbar')||!n.nodeValue||!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const st=getComputedStyle(pe); if(st && (st.display==='none'||st.visibility==='hidden')) return NodeFilter.FILTER_REJECT; if(n.nodeValue.length>200000) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT;}});
    let t; while((t=walker.nextNode())) nodes.push(t);
    findState.cache = {nodes, builtAt: Date.now()};
    return nodes;
  }

  function clearMatches(){
    // remove span wrappers
    if (findState.matches.length){
      for(const m of findState.matches){ const span=m.span; if(!span.isConnected) continue; const parent=span.parentNode; if(!parent) continue; parent.replaceChild(document.createTextNode(span.textContent), span); parent.normalize && parent.normalize(); }
    }
    findState.matches=[]; findState.activeIndex=-1; updateCount();
  }
  function updateCount(){
    if (!findState.countLabel) return; const total=findState.matches.length; const cur = total? (findState.activeIndex+1):0; findState.countLabel.textContent=`${cur}/${total}`;
  }
  let searchTimer=null;
  function scheduleSearch(){ if (searchTimer) clearTimeout(searchTimer); searchTimer=setTimeout(searchNow,150); }

  function searchNow(){
    const q = findState.input.value.trim();
    if(q === findState.lastQuery && findState.matches.length){ // aynı sorgu
      // Eğer paste sonrası otomatik ilerleme isteniyorsa uygula
      if(findState.postPasteAdvance){
        findState.postPasteAdvance=false;
        if(findState.matches.length>1){
          jumpRelative(+1);
        } else {
          // tek eşleşme - sadece aktifliği yenile
          activateCurrent(); updateCount();
        }
      } else {
        updateCount();
      }
      return;
    }
    // yeni sorgu -> eskileri temizle
    clearMatches();
    findState.lastQuery = q;
    if(!q){ return; }
    const qLower = q.toLowerCase();
    const nodes = collectTextNodes();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
    let orderCounter = 0;
    let idx = 0;
    const startTs = performance.now();
    const token = Symbol('scan');
    findState.scanToken = token;
    function processSlice(deadline){
      if(token !== findState.scanToken) return; // iptal
      const budgeted = deadline && typeof deadline.timeRemaining === 'function';
      while(idx < nodes.length && findState.matches.length < MAX_MATCHES){
        if(budgeted && deadline.timeRemaining() <= 0) break;
        const node = nodes[idx++];
        if(!node || !node.nodeValue) continue;
        regex.lastIndex = 0; // her node başa
        const text = node.nodeValue;
        if(!text.toLowerCase().includes(qLower)) continue;
        const intervals=[]; let m; while((m = regex.exec(text))){ intervals.push([m.index, m.index + m[0].length]); if(findState.matches.length + intervals.length >= MAX_MATCHES) break; }
        if(!intervals.length) continue;
        const frag = document.createDocumentFragment(); let last = 0;
        for(const [s,e] of intervals){
          if(s>last) frag.appendChild(document.createTextNode(text.slice(last,s)));
          const span=document.createElement('span'); span.className='hkyy-highlight'; span.textContent=text.slice(s,e); frag.appendChild(span); findState.matches.push({span, order: orderCounter++}); last=e; if(findState.matches.length>=MAX_MATCHES) break;
        }
        if(last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode && node.parentNode.replaceChild(frag,node);
        if(findState.activeIndex === -1 && findState.matches.length){
          findState.matches.forEach((m,i)=>{ m.index=i; });
          findState.activeIndex = 0; activateCurrent(); updateCount();
          if(window.__HKYY_PERF_FIND) console.log('[FIND] first match in', (performance.now()-startTs).toFixed(1),'ms');
          if(findState.postPasteAdvance && findState.matches.length>1){
            findState.postPasteAdvance=false;
            jumpRelative(+1);
          }
        }
      }
      if(idx >= nodes.length || findState.matches.length >= MAX_MATCHES){
        // tamamlandı
        findState.matches.forEach((m,i)=>{ m.index=i; });
        if(findState.activeIndex === -1 && findState.matches.length){ findState.activeIndex=0; activateCurrent(); }
        updateCount();
        if(window.__HKYY_PERF_FIND) console.log('[FIND] total', findState.matches.length,'in', (performance.now()-startTs).toFixed(1),'ms');
      } else {
        // devam
        scheduleNext();
      }
    }
    function scheduleNext(){
      if('requestIdleCallback' in window){
        requestIdleCallback(processSlice,{timeout:60});
      } else {
        setTimeout(()=>processSlice({timeRemaining:()=>5}), 0);
      }
    }
    // İlk dilim: ilk eşleşmeyi garanti etmek için 12ms'e kadar bloklu tarama (Chrome benzeri anında geri bildirim)
    const hardStart = performance.now();
    while(idx < nodes.length && findState.matches.length < 1 && (performance.now() - hardStart) < 12){
      const node = nodes[idx++];
      if(!node || !node.nodeValue) continue;
      regex.lastIndex = 0;
      const text = node.nodeValue;
      if(!text.toLowerCase().includes(qLower)) continue;
      const intervals=[]; let m; while((m = regex.exec(text))){ intervals.push([m.index, m.index + m[0].length]); if(intervals.length>=1) break; }
      if(!intervals.length) continue;
      const frag=document.createDocumentFragment(); let last=0;
      const [s,e] = intervals[0];
      if(s>last) frag.appendChild(document.createTextNode(text.slice(last,s)));
      const span=document.createElement('span'); span.className='hkyy-highlight'; span.textContent=text.slice(s,e); frag.appendChild(span); findState.matches.push({span, order:0}); last=e;
      if(last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode && node.parentNode.replaceChild(frag,node);
      findState.matches.forEach((m,i)=>{ m.index=i; });
      findState.activeIndex = 0; activateCurrent(); updateCount();
      if(window.__HKYY_PERF_FIND) console.log('[FIND] first match (sync) in', (performance.now()-startTs).toFixed(1),'ms');
      if(findState.postPasteAdvance && findState.matches.length>1){
        findState.postPasteAdvance=false;
        jumpRelative(+1);
      }
    }
    if(findState.matches.length === 0){
      // henüz ilk eşleşme yoksa normal dilimli taramaya devam
      processSlice({timeRemaining:()=>8});
    }
    if(idx < nodes.length && findState.matches.length < MAX_MATCHES) scheduleNext();
  }

  function activateCurrent(){
    findState.matches.forEach((m,i)=>{ if(m.span) m.span.classList.toggle('hkyy-highlight-active', i===findState.activeIndex); });
    const cur = findState.matches[findState.activeIndex];
    if(cur && cur.span){
      try {
        const r = cur.span.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        if(r.top < 0 || r.bottom > vh){ cur.span.scrollIntoView({block:'center', inline:'nearest'}); }
      } catch {}
    }
  }
  function jumpRelative(delta){
    if (!findState.matches.length){ // boşsa yeni aramayı tetikle
      searchNow(); if(!findState.matches.length) return; }
    findState.activeIndex = (findState.activeIndex + delta + findState.matches.length) % findState.matches.length;
    activateCurrent(); updateCount();
  }

  // Kısayollar
  window.addEventListener('keydown', async (e)=>{
    if (e.defaultPrevented) return;
    if ((e.ctrlKey||e.metaKey) && e.key==='f'){
      // Chrome davranışı: her Ctrl+F sadece çubuğu açar ve input'u seçer; ileri gitmez
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (findState.container && findState.container.style.display!=='none'){
        // zaten açık: sadece odakla & seç
        try { findState.input.focus(); findState.input.select(); } catch {}
        return;
      }
      // Kapalıysa aç ve preset uygula
      let preset='';
      try { const sel=String(getSelection()); if(sel.trim()) preset=sel.trim(); else if (state.lastCopied) preset=state.lastCopied.trim(); else { const clip=await navigator.clipboard.readText(); if(clip && clip.trim()) preset=clip.trim(); } } catch{}
      openFindBar(preset);
    }
  }, true);

  function apiOpenAndSearch(preset){ openFindBar(preset); }
  function apiNext(){ jumpRelative(+1); }
  R.findAPI = { open: apiOpenAndSearch, next: apiNext };
  // Geri uyum: eski testler searchLastCopied bekliyor
  if(!R.searchLastCopied){
    R.searchLastCopied = function(){
      // Seçili metin ya da lastCopied'i preset yap
      let preset='';
      try { const sel=String(getSelection()); if(sel.trim()) preset=sel.trim(); else if (state.lastCopied) preset=state.lastCopied.trim(); } catch {}
      apiOpenAndSearch(preset);
    };
  }
})();

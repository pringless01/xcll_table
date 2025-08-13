// reco/search-bar.js - gelişmiş arama & sekme kontrol barı (HKYY port)
(function () {
  const rootNS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  rootNS.reco = rootNS.reco || {};
  const R = rootNS.reco;
  if (R._searchBarEnhanced) return;
  R._searchBarEnhanced = true;
  const {
    state,
    ensureRoot,
    showToast,
    escapeRegExp,
    clearHighlights,
    smoothCenter,
    cacheLastCopied,
    saveToolbarPos,
    applyToolbarPos,
    loadInitialState,
  } = R;

  let __boundHandlers = null;
  let __domObserver = null;
  let __searchToken = 0; // concurrency token
  let __lastSearchTs = 0;
  const SEARCH_MIN_INTERVAL = 500; // ms: peş peşe spam engelle
  const SEARCH_MAX_DURATION = 15000; // güvenlik için 15s sonra otomatik sonlandır

  function ensureSearchBar() {
    if (window.__EH_NO_SEARCHBAR_UI) return null;
  ensureRoot();
    if (state.els.searchBar) return state.els.searchBar;
    const bar = document.createElement('div');
    bar.className = 'hkyy-searchbar';
    bar.innerHTML = `<div class="hkyy-grip"></div>
  <button id="hkyy-btn-tab-prev" title="${(rootNS.t&&rootNS.t('prev_tab'))||'Önceki sekme'}">◀</button>
  <button id="hkyy-btn-tab-next" title="${(rootNS.t&&rootNS.t('next_tab'))||'Sonraki sekme'}">▶</button>
      <span class="hkyy-icon" aria-hidden="true"></span>
  <span style="font-size:13px;">${(rootNS.t&&rootNS.t('search_last_copied'))||'Ara'}</span>
  <button id="hkyy-btn-search">${(rootNS.t&&rootNS.t('search_last_copied'))||'Son Kopyalanan'}</button>
  <button id="hkyy-btn-copyid" title="URL sonundaki ID'yi kopyala">${(rootNS.t&&rootNS.t('copy_id'))||'ID Kopyala'}</button>
      <button id="hkyy-btn-clear">Temizle</button>
  <button id="hkyy-btn-close" title="${(rootNS.t&&rootNS.t('close_tab'))||'Sekmeyi kapat'}">Sekmeyi Kapat</button>`;
    state.els.root.appendChild(bar);
    state.els.searchBar = bar;
    // --- Merkez transform'unu sabit piksel konumuna çevir (drag kaymasını engelle) ---
    requestAnimationFrame(() => {
      const cs = getComputedStyle(bar);
      if (
        cs.transform &&
        (cs.transform.includes('matrix') || cs.transform.includes('translateX'))
      ) {
        const r = bar.getBoundingClientRect();
        bar.style.left = r.left + 'px';
        bar.style.top = r.top + 'px';
        bar.style.transform = 'none'; // kalıcı kaldır
      }
    });
    state.els.btn.search = bar.querySelector('#hkyy-btn-search');
    state.els.btn.clear = bar.querySelector('#hkyy-btn-clear');
    state.els.btn.copyId = bar.querySelector('#hkyy-btn-copyid');
    state.els.btn.close = bar.querySelector('#hkyy-btn-close');
    state.els.btn.tabPrev = bar.querySelector('#hkyy-btn-tab-prev');
    state.els.btn.tabNext = bar.querySelector('#hkyy-btn-tab-next');

    state.els.btn.search.addEventListener('click', searchLastCopied);
    state.els.btn.clear.addEventListener('click', clearHighlights);
    state.els.btn.copyId.addEventListener('click', copyCustomerIdFromUrl);
    state.els.btn.close.addEventListener('click', closeActiveTab);
    state.els.btn.tabPrev.addEventListener('click', () => switchTab('prev', 1));
    state.els.btn.tabNext.addEventListener('click', () => switchTab('next', 1));

    enableTabScroll(bar);
    enableDrag(bar);

    loadInitialState().then(() => {
      if (state.toolbarPos) applyToolbarPos(state.toolbarPos);
    });
    updateCopyIdButtonState();
  return bar;
  }
  function switchTab(direction, steps = 1) {
    try {
      chrome.runtime.sendMessage(
        { type: 'SWITCH_TAB', direction, steps },
        (res) => {
          if (res && res.ok) return;
          if (chrome.runtime.lastError)
      showToast(((rootNS.t&&rootNS.t('close_tab'))||'Sekme') + ' değişmedi: ' + chrome.runtime.lastError.message);
          else if (res && res.err) showToast(((rootNS.t&&rootNS.t('close_tab'))||'Sekme') + ' değişmedi: ' + res.err);
        }
      );
    } catch {
  showToast('Sekme değiştirilemedi (background yok)');
    }
  }
  function enableTabScroll(bar) {
    let lastTime = 0,
      burst = 0;
    bar.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = performance.now();
        const dt = now - lastTime;
        lastTime = now;
        if (dt < 250) burst = Math.min(3, burst + 1);
        else burst = 0;
        const accel = [1, 2, 4, 8][burst] || 1;
        const steps = accel;
        const direction = e.deltaY < 0 ? 'prev' : 'next';
        switchTab(direction, steps);
      },
      { passive: false }
    );
  }
  function closeActiveTab() {
    try {
      chrome.runtime.sendMessage({ type: 'CLOSE_ACTIVE_TAB' }, (res) => {
        if (!res?.ok) {
          if (chrome.runtime.lastError)
            showToast('Kapatılamadı: ' + chrome.runtime.lastError.message);
          else if (res?.err) showToast('Kapatılamadı: ' + res.err);
        }
      });
    } catch {
  showToast('Sekme kapatılamadı (background yok)');
    }
  }
  function getPoint(e) {
    if (!e) return null;
    if (typeof e.clientX === 'number') return { x: e.clientX, y: e.clientY };
    if (e.touches && e.touches[0])
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0])
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return null;
  }
  function enableDrag(el) {
    let dragging = false,
      startX = 0,
      startY = 0,
      startLeft = 0,
      startTop = 0,
      framePending = false,
      targetLeft = 0,
      targetTop = 0;
    // Tek seferlik normalize
    (function initNormalize() {
      const cs = getComputedStyle(el);
      if (cs.transform && cs.transform !== 'none') {
        const r = el.getBoundingClientRect();
        el.style.left = r.left + 'px';
        el.style.top = r.top + 'px';
        el.style.transform = 'none';
      }
    })();
    el.style.willChange = 'left, top';
    function onDown(e) {
      if (e.target && e.target.tagName === 'BUTTON') return;
      if (e.type === 'mousedown' && e.button !== 0) return;
      const p = getPoint(e);
      if (!p) return;
      dragging = true;
      startX = p.x;
      startY = p.y;
      // Mevcut inline yoksa rect'ten al
      startLeft = parseFloat(el.style.left) || el.getBoundingClientRect().left;
      startTop = parseFloat(el.style.top) || el.getBoundingClientRect().top;
      targetLeft = startLeft;
      targetTop = startTop;
      el.classList.add('hkyy-dragging');
      e.preventDefault();
    }
    function apply() {
      framePending = false;
      el.style.left = Math.max(0, Math.round(targetLeft)) + 'px';
      el.style.top = Math.max(0, Math.round(targetTop)) + 'px';
    }
    const onMove = (e) => {
      if (!dragging) return;
      const p = getPoint(e);
      if (!p) return;
      targetLeft = startLeft + (p.x - startX);
      targetTop = startTop + (p.y - startY);
      if (!framePending) {
        framePending = true;
        requestAnimationFrame(apply);
      }
    };
    function onUp() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('hkyy-dragging'); // Stil uzerindeki mevcut degerleri kaydet
      const savedLeft = parseFloat(el.style.left) || 0;
      const savedTop = parseFloat(el.style.top) || 0;
      saveToolbarPos({
        top: Math.max(0, Math.round(savedTop)),
        left: Math.max(0, Math.round(savedLeft)),
      });
    }
    if (window.PointerEvent) {
      el.addEventListener('pointerdown', onDown, { passive: false });
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
    } else {
      el.addEventListener('mousedown', onDown, { passive: false });
      window.addEventListener('mousemove', onMove, true);
      window.addEventListener('mouseup', onUp, true);
      el.addEventListener('touchstart', onDown, { passive: false });
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp, true);
      window.addEventListener('touchcancel', onUp, true);
    }
  }
  function getCustomerIdFromLocationHref() {
    try {
      const href = location.href;
      const hostOk = /:\/\/backoffice\.betcoapps\.com\//i.test(href);
      if (!hostOk) return null;
      const m = href.match(/#\/customers\/detail\/(\d{5,15})$/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }
  function updateCopyIdButtonState() {
    ensureSearchBar();
    const id = getCustomerIdFromLocationHref();
    const btn = state.els.btn.copyId;
    if (!btn) return;
    if (id) {
      btn.removeAttribute('disabled');
  btn.title = `ID: ${id} — Kopyalamak için tıkla`;
    } else {
      btn.setAttribute('disabled', 'true');
  btn.title = (rootNS.t&&rootNS.t('id_not_found'))||'Bu sayfada kopyalanacak ID bulunamadı';
    }
  }
  function copyCustomerIdFromUrl() {
    const id = getCustomerIdFromLocationHref();
    if (!id) {
  showToast((rootNS.t&&rootNS.t('id_not_found'))||'ID bulunamadı');
      updateCopyIdButtonState();
      return;
    }
    navigator.clipboard
      .writeText(id)
      .then(() => {
        cacheLastCopied(id);
  showToast(((rootNS.t&&rootNS.t('id_copied'))||'ID kopyalandı') + `: ${id}`);
      })
  .catch(() => showToast((rootNS.t&&rootNS.t('id_copy_failed'))||'ID kopyalanamadı'));
  }
  async function searchLastCopied() {
    const now = Date.now();
    if (now - __lastSearchTs < SEARCH_MIN_INTERVAL) {
      showToast('Arama çok sık tekrarlandı');
      return;
    }
    __lastSearchTs = now;
    // Yeni token üret ve önceki aramayı iptal et
    const myToken = ++__searchToken;
    if (R._searchInProgress) {
      // Eski süreç requestIdleCallback/setTimeout döngülerinde token uyuşmazlığında kendiliğinden duracak
      showToast('Önceki arama iptal ediliyor...');
    }
    R._searchInProgress = true;
    ensureSearchBar();
    let q = (state.lastCopied || '').trim();
    if (!q) {
      try {
        const txt = await navigator.clipboard.readText();
        if (txt && txt.trim()) q = txt.trim();
      } catch {}
    }
    if (!q) {
  showToast((rootNS.t&&rootNS.t('clipboard_empty'))||'Kopyalanan yok');
      if (myToken === __searchToken) R._searchInProgress = false;
      return;
    }
    clearHighlights();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const pe = node.parentElement;
          if (!node.nodeValue || !node.nodeValue.trim())
            return NodeFilter.FILTER_REJECT;
          if (!pe || pe.closest('#hkyy-root')) return NodeFilter.FILTER_REJECT;
          const st = getComputedStyle(pe);
          if (st && (st.display === 'none' || st.visibility === 'hidden'))
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    const regex = new RegExp(escapeRegExp(q), 'gi');
    let count = 0;
    const hits = [];
    function processChunk() {
      if (myToken !== __searchToken) { // iptal edildi
        R._searchInProgress = false;
        return;
      }
      let n = 0;
      while (n++ < 400 && count < state.MAX_HIGHLIGHTS) {
        const node = walker.nextNode();
        if (!node) break;
        const txt = node.nodeValue;
        if (!regex.test(txt)) continue;
        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        txt.replace(regex, (m, idx) => {
          if (idx > lastIdx)
            frag.appendChild(document.createTextNode(txt.slice(lastIdx, idx)));
          const span = document.createElement('span');
          span.className = 'hkyy-highlight';
          span.textContent = m;
          frag.appendChild(span);
          state.highlights.push(span);
          hits.push(span);
          count++;
          lastIdx = idx + m.length;
          return m;
        });
        if (lastIdx < txt.length)
          frag.appendChild(document.createTextNode(txt.slice(lastIdx)));
        node.parentNode.replaceChild(frag, node);
        if (count >= state.MAX_HIGHLIGHTS) break;
      }
      if (count < state.MAX_HIGHLIGHTS && walker.nextNode()) {
        if (myToken !== __searchToken) {
          R._searchInProgress = false;
          return;
        }
        if ('requestIdleCallback' in window) {
          requestIdleCallback(processChunk, { timeout: 100 });
        } else setTimeout(processChunk, 0);
      } else {
        if (myToken === __searchToken) {
          showToast(count ? `Bulunan: ${count}` : 'Bulunamadı');
          if (hits[0]) smoothCenter(hits[0]);
          R._searchInProgress = false;
        }
      }
    }
    processChunk();
    // Hard timeout koruması
    setTimeout(() => {
      if (myToken === __searchToken && R._searchInProgress) {
        __searchToken++; // iptal
        R._searchInProgress = false;
        showToast('Arama süresi aşıldı (iptal)');
      }
    }, SEARCH_MAX_DURATION);
  }
  function bindGlobalHandlers() {
    if (__boundHandlers) return;
    const onHash = () => updateCopyIdButtonState();
    const onPop = () => updateCopyIdButtonState();
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onPop);
    __domObserver = new MutationObserver(() => updateCopyIdButtonState());
    __domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    __boundHandlers = { onHash, onPop };
  }

  function cleanup() {
    try {
      if (__boundHandlers) {
        window.removeEventListener('hashchange', __boundHandlers.onHash);
        window.removeEventListener('popstate', __boundHandlers.onPop);
        __boundHandlers = null;
      }
      if (__domObserver) {
        __domObserver.disconnect();
        __domObserver = null;
      }
    } catch {}
  }

  // Export API
  R.searchLastCopied = searchLastCopied;
  R.initSearchBar = function initSearchBar() {
    // UI devre dışı ise sadece handlerları bağla
    if (!window.__EH_NO_SEARCHBAR_UI) ensureSearchBar();
    bindGlobalHandlers();
    window.addEventListener('pagehide', cleanup, { once: true });
  };

  // init
  R.initSearchBar();
})();

(function waitForCore() {
  if (!window.HKYY) return setTimeout(waitForCore, 10);
  const {
    NS, state, ensureRoot, showToast, escapeRegExp, clearHighlights, smoothCenter,
    cacheLastCopied, saveToolbarPos, applyToolbarPos, loadInitialState, throttle
  } = window.HKYY;

  function ensureSearchBar() {
    ensureRoot();
    if (state.els.searchBar) return state.els.searchBar;

    const bar = document.createElement("div");
    bar.className = `${NS}-searchbar`;
    bar.innerHTML = `
      <div class="${NS}-grip"></div>
      <button id="${NS}-btn-tab-prev" title="Önceki sekme">◀</button>
      <button id="${NS}-btn-tab-next" title="Sonraki sekme">▶</button>
      <span class="${NS}-icon" aria-hidden="true"></span>
      <span style="font-size:13px;">Ara</span>
      <button id="${NS}-btn-search">Son Kopyalanan</button>
      <button id="${NS}-btn-copyid" title="URL sonundaki ID'yi kopyala">ID Kopyala</button>
      <button id="${NS}-btn-clear">Temizle</button>
      <button id="${NS}-btn-close" title="Sekmeyi kapat">Sekmeyi Kapat</button>
    `;
    state.els.root.appendChild(bar);
    state.els.searchBar = bar;

    state.els.btn.search  = bar.querySelector(`#${NS}-btn-search`);
    state.els.btn.clear   = bar.querySelector(`#${NS}-btn-clear`);
    state.els.btn.copyId  = bar.querySelector(`#${NS}-btn-copyid`);
    state.els.btn.close   = bar.querySelector(`#${NS}-btn-close`);
    state.els.btn.tabPrev = bar.querySelector(`#${NS}-btn-tab-prev`);
    state.els.btn.tabNext = bar.querySelector(`#${NS}-btn-tab-next`);

    state.els.btn.search.addEventListener("click", searchLastCopied);
    state.els.btn.clear.addEventListener("click", clearHighlights);
    state.els.btn.copyId.addEventListener("click", copyCustomerIdFromUrl);
    state.els.btn.close.addEventListener("click", closeActiveTab);

    // --- Sekme okları (tek tık) ---
    state.els.btn.tabPrev.addEventListener("click", () => switchTab("prev", 1));
    state.els.btn.tabNext.addEventListener("click", () => switchTab("next", 1));

    // --- Scroll ile sekme değiştir (ivmeli) ---
    enableTabScroll(bar);

    // --- Sürükle-bırak (pointer-safe) ---
    enableDrag(bar);

    // İlk pozisyonu yükle/uygula
    loadInitialState().then(() => {
      if (state.toolbarPos) applyToolbarPos(state.toolbarPos);
    });

    updateCopyIdButtonState();
    return bar;
  }

  // === Sekme değiştirme mesajı ===
  function switchTab(direction, steps=1) {
    try {
      chrome.runtime.sendMessage({ type: "SWITCH_TAB", direction, steps }, (res) => {
        // Başarısızsa küçük uyarı verelim (sessiz hatalar yerine)
        if (res && res.ok) return;
        if (chrome.runtime.lastError) {
          showToast(`Sekme değişmedi: ${chrome.runtime.lastError.message}`);
        } else if (res && res.err) {
          showToast(`Sekme değişmedi: ${res.err}`);
        }
      });
    } catch {
      showToast("Sekme değiştirilemedi (background yok)");
    }
  }

  // === Scroll @ toolbar -> tab switch (ivmeli) ===
  function enableTabScroll(bar){
    let lastTime = 0;
    let burst = 0;

    bar.addEventListener("wheel", (e) => {
      // Sadece bizim bar üzerinde çalışsın
      e.preventDefault();
      e.stopPropagation();

      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      // 250ms içinde ardışık scroll gelirse ivmeyi artır
      if (dt < 250) burst = Math.min(3, burst + 1); // 1,2,3
      else burst = 0;

      const accel = [1, 2, 4, 8][burst] || 1;
      const steps = accel;
      const direction = e.deltaY < 0 ? "prev" : "next";
      switchTab(direction, steps);
    }, { passive: false });
  }

  // === Sekme kapatma ===
  function closeActiveTab(){
    try {
      chrome.runtime.sendMessage({ type: "CLOSE_ACTIVE_TAB" }, (res) => {
        if (!res?.ok) {
          if (chrome.runtime.lastError) showToast(`Kapatılamadı: ${chrome.runtime.lastError.message}`);
          else if (res?.err) showToast(`Kapatılamadı: ${res.err}`);
        }
      });
    } catch {
      showToast("Sekme kapatılamadı (background yok)");
    }
  }

  // === Drag helpers (pointer-safe) ===
  function getPoint(e) {
    if (!e) return null;
    if (typeof e.clientX === "number") return { x: e.clientX, y: e.clientY };
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return null;
  }
  function enableDrag(el){
    let dragging=false, sx=0, sy=0, ox=0, oy=0;

    const onDown = (e) => {
      if (e.target && e.target.tagName === "BUTTON") return; // butona basılırsa sürükleme yok
      if (e.type === "mousedown" && e.button !== 0) return;  // sadece sol tık
      const p = getPoint(e); if (!p) return;

      dragging = true; sx = p.x; sy = p.y;
      const r = el.getBoundingClientRect();
      ox = r.left + window.scrollX; oy = r.top + window.scrollY;
      el.style.transform = ""; // merkezlenmeyi bırak, mutlak konum
      e.preventDefault();
    };
    const onMove = throttle((e) => {
      if (!dragging) return;
      const p = getPoint(e); if (!p) return;
      const nx = ox + (p.x - sx);
      const ny = oy + (p.y - sy);
      el.style.left = `${Math.max(0, Math.round(nx))}px`;
      el.style.top  = `${Math.max(0, Math.round(ny))}px`;
      el.style.right = ""; el.style.bottom = "";
    }, 16);
    const onUp = () => {
      if (!dragging) return;
      dragging=false;
      const r = el.getBoundingClientRect();
      const pos = { top: Math.max(0, Math.round(r.top + window.scrollY)), left: Math.max(0, Math.round(r.left + window.scrollX)) };
      saveToolbarPos(pos); // kalıcı + realtime
    };

    if (window.PointerEvent) {
      el.addEventListener("pointerdown", onDown, { passive: false });
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    } else {
      el.addEventListener("mousedown", onDown, { passive: false });
      window.addEventListener("mousemove", onMove, true);
      window.addEventListener("mouseup", onUp, true);
      el.addEventListener("touchstart", onDown, { passive: false });
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp, true);
      window.addEventListener("touchcancel", onUp, true);
    }
  }

  // === ID kopya / arama ===
  function getCustomerIdFromLocationHref() {
    try {
      const href = location.href;
      const hostOk = /:\/\/backoffice\.betcoapps\.com\//i.test(href);
      if (!hostOk) return null;
      const m = href.match(/#\/customers\/detail\/(\d{5,15})$/);
      return m ? m[1] : null;
    } catch { return null; }
  }
  function updateCopyIdButtonState() {
    ensureSearchBar();
    const id = getCustomerIdFromLocationHref();
    const btn = state.els.btn.copyId;
    if (!btn) return;
    if (id) { btn.removeAttribute("disabled"); btn.title = `ID: ${id} — Kopyalamak için tıkla`; }
    else    { btn.setAttribute("disabled","true"); btn.title = "Bu sayfada kopyalanacak ID bulunamadı"; }
  }
  function copyCustomerIdFromUrl() {
    const id = getCustomerIdFromLocationHref();
    if (!id) { showToast("ID bulunamadı"); updateCopyIdButtonState(); return; }
    navigator.clipboard.writeText(id).then(() => { cacheLastCopied(id); showToast(`ID kopyalandı: ${id}`); })
      .catch(() => showToast("ID kopyalanamadı"));
  }

  async function searchLastCopied() {
    ensureSearchBar();
    let q = (state.lastCopied || "").trim();
    if (!q) {
      try { const txt = await navigator.clipboard.readText(); if (txt && txt.trim()) q = txt.trim(); } catch {}
    }
    if (!q) { showToast("Kopyalanan yok"); return; }

    clearHighlights();

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const pe = node.parentElement;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (!pe || pe.closest(`#${NS}-root`)) return NodeFilter.FILTER_REJECT;
        const st = getComputedStyle(pe);
        if (st && (st.display === "none" || st.visibility === "hidden")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const regex = new RegExp(escapeRegExp(q), "gi");
    let count = 0;
    const hits = [];

    function processChunk() {
      let n = 0;
      while (n++ < 400 && count < state.MAX_HIGHLIGHTS) {
        const node = walker.nextNode();
        if (!node) break;
        const txt = node.nodeValue;
        if (!regex.test(txt)) continue;

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        txt.replace(regex, (m, idx) => {
          if (idx > lastIdx) frag.appendChild(document.createTextNode(txt.slice(lastIdx, idx)));
          const span = document.createElement("span");
          span.className = `${NS}-highlight`;
          span.textContent = m;
          frag.appendChild(span);
          state.highlights.push(span);
          hits.push(span);
          count++; lastIdx = idx + m.length;
          return m;
        });
        if (lastIdx < txt.length) frag.appendChild(document.createTextNode(txt.slice(lastIdx)));
        node.parentNode.replaceChild(frag, node);
        if (count >= state.MAX_HIGHLIGHTS) break;
      }
      if (count < state.MAX_HIGHLIGHTS && walker.nextNode()) {
        if ("requestIdleCallback" in window) requestIdleCallback(processChunk, { timeout: 100 });
        else setTimeout(processChunk, 0);
      } else {
        showToast(count ? `Bulunan: ${count}` : "Bulunamadı");
        if (hits[0]) smoothCenter(hits[0]);
      }
    }
    processChunk();
  }

  // init
  ensureSearchBar();
  window.addEventListener("hashchange", updateCopyIdButtonState);
  window.addEventListener("popstate",  updateCopyIdButtonState);
  const obs = new MutationObserver(() => updateCopyIdButtonState());
  obs.observe(document.documentElement, { childList:true, subtree:true });
})();

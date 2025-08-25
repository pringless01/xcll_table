// reco/copy-bubble.js - gelişmiş kopya balonu (HKYY port)
(function () {
  const rootNS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  rootNS.reco = rootNS.reco || {};
  const R = rootNS.reco;
  if (R._copyBubbleEnhanced) return;
  R._copyBubbleEnhanced = true;
  const { state, ensureRoot, showToast, cacheLastCopied, throttle } = R;
  const bus = (window.ExcelHelperNS && window.ExcelHelperNS.eventBus) || null;

  function ensureCopyBubble() {
    ensureRoot();
    if (state.els.copyBubble) return state.els.copyBubble;
    const el = document.createElement('div');
    el.className = 'hkyy-copy-bubble';
  el.textContent = (rootNS.t&&rootNS.t('copy_bubble_label'))||'Kopyala';
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    el.addEventListener('click', onCopyClick);
    state.els.root.appendChild(el);
    state.els.copyBubble = el;
    return el;
  }

  function getSelectedText() {
    try {
      return String(document.getSelection()?.toString() || '');
    } catch {
      return '';
    }
  }

  function computeEHSelectionRect() {
    try {
      const cells = (rootNS.getSelectedCells && rootNS.getSelectedCells()) || [];
      if (!cells.length) return null;
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      for (const c of cells) {
        if (!c || !c.isConnected) continue;
        const rect = c.getBoundingClientRect();
        if (!rect) continue;
        l = Math.min(l, rect.left);
        t = Math.min(t, rect.top);
        r = Math.max(r, rect.right);
        b = Math.max(b, rect.bottom);
      }
      if (!(isFinite(l) && isFinite(t) && isFinite(r) && isFinite(b))) return null;
      return { left: l, top: t, right: r, bottom: b, width: Math.max(0, r - l), height: Math.max(0, b - t) };
    } catch { return null; }
  }

  function buildTSVFromAOA(aoa) {
    const tsvEscape = (s) => (/[",\t\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
    const cellToString = (cell) => {
      if (cell == null) return '';
      if (typeof cell === 'object') {
        const v = 'v' in cell ? cell.v : cell;
        if (v instanceof Date) {
          const adj = new Date(v.getTime() - v.getTimezoneOffset() * 60000);
          return adj.toISOString().replace('T', ' ').replace('Z', '');
        }
        return String(v ?? '');
      }
      return String(cell);
    };
    return aoa.map((row) => row.map((c) => tsvEscape(cellToString(c))).join('\t')).join('\n');
  }

  const updateFromSelection = throttle(() => {
    const bubble = ensureCopyBubble();
    const text = getSelectedText().trim();
    if (!text) {
      if (Date.now() >= state.copyBubbleStickyUntil) hide(bubble);
      return;
    }
    state.copyBubbleStickyUntil = Date.now() + state.COPY_STICKY_MS;
    requestAnimationFrame(() => {
      const sel = document.getSelection();
      if (!sel || !sel.toString().trim()) {
        if (Date.now() >= state.copyBubbleStickyUntil) hide(bubble);
        return;
      }
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          if (Date.now() >= state.copyBubbleStickyUntil) hide(bubble);
          return;
        }
        bubble.style.top = window.scrollY + rect.bottom + 6 + 'px';
        bubble.style.left = window.scrollX + rect.left + Math.min(rect.width / 2, 120) + 'px';
        bubble.style.display = 'inline-block';
      } catch {
        if (Date.now() >= state.copyBubbleStickyUntil) hide(bubble);
      }
    });
  }, 60);

  const updateFromEHSelection = throttle(() => {
    try {
      const settings = rootNS.getSettings ? rootNS.getSettings() : { selectionMode: false };
      if (!settings.selectionMode) return;
      const cells = rootNS.getSelectedCells ? rootNS.getSelectedCells() : [];
      const bubble = ensureCopyBubble();
      if (!cells || !cells.length) {
        if (Date.now() >= state.copyBubbleStickyUntil) hide(bubble);
        return;
      }
      const rect = computeEHSelectionRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        if (Date.now() >= state.copyBubbleStickyUntil) hide(bubble);
        return;
      }
      state.copyBubbleStickyUntil = Date.now() + state.COPY_STICKY_MS;
      bubble.style.top = window.scrollY + rect.bottom + 6 + 'px';
      bubble.style.left = window.scrollX + rect.left + Math.min(rect.width / 2, 120) + 'px';
      bubble.style.display = 'inline-block';
    } catch {}
  }, 60);

  function onCopyClick() {
    const bubble = ensureCopyBubble();
    const settings = rootNS.getSettings ? rootNS.getSettings() : { selectionMode: false };
    const hasEHSelection = !!(settings.selectionMode && rootNS.getSelectedCells && rootNS.getSelectedCells().length);
    if (hasEHSelection && rootNS.getSelectionAOA) {
      try {
        const aoa = rootNS.getSelectionAOA();
        if (!aoa || !aoa.length) {
          hide(bubble);
          showToast((rootNS.t&&rootNS.t('selection_none'))||'Seçim yok');
          return;
        }
        const text = buildTSVFromAOA(aoa);
        navigator.clipboard.writeText(text).then(() => {
          cacheLastCopied(text);
          hide(bubble);
          showToast((rootNS.t&&rootNS.t('copied'))||'Kopyalandı');
        }).catch(() => {
          hide(bubble);
          showToast((rootNS.t&&rootNS.t('copy_denied'))||'Kopyalama reddedildi');
        });
        return;
      } catch {}
    }
    const text = getSelectedText();
    if (!text.trim()) {
      hide(bubble);
  showToast((rootNS.t&&rootNS.t('selection_none'))||'Seçim yok');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      cacheLastCopied(text);
      hide(bubble);
  showToast((rootNS.t&&rootNS.t('copied'))||'Kopyalandı');
    }).catch(() => {
      hide(bubble);
  showToast((rootNS.t&&rootNS.t('copy_denied'))||'Kopyalama reddedildi');
    });
  }

  function hide(el) {
    if (el) el.style.display = 'none';
  }

  // Olaylar
  document.addEventListener('selectionchange', updateFromSelection, { passive: true });
  window.addEventListener('scroll', updateFromSelection, { passive: true });
  window.addEventListener('resize', updateFromSelection, { passive: true });

  // EH seçim akışı için ek konumlandırma
  window.addEventListener('scroll', updateFromEHSelection, { passive: true });
  window.addEventListener('resize', updateFromEHSelection, { passive: true });
  try { bus && bus.on && bus.on('selection:changed', updateFromEHSelection); } catch {}

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(state.els.copyBubble); }, true);
  document.addEventListener('click', (e) => {
    const root = state.els.root;
    if (!root) return;
    const insideUI = e.composedPath().some((x) => x instanceof Element && x.id === 'hkyy-root');
    if (!insideUI && !getSelectedText().trim() && Date.now() >= state.copyBubbleStickyUntil)
      hide(state.els.copyBubble);
  }, { capture: true });
  document.addEventListener('copy', () => hide(state.els.copyBubble), true);
  document.addEventListener('cut', () => hide(state.els.copyBubble), true);
})();

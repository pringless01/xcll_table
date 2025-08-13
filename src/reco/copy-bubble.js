// reco/copy-bubble.js - gelişmiş kopya balonu (HKYY port)
(function () {
  const rootNS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  rootNS.reco = rootNS.reco || {};
  const R = rootNS.reco;
  if (R._copyBubbleEnhanced) return;
  R._copyBubbleEnhanced = true;
  const { state, ensureRoot, showToast, cacheLastCopied, throttle } = R;
  function ensureCopyBubble() {
    ensureRoot();
    if (state.els.copyBubble) return state.els.copyBubble;
    const el = document.createElement('div');
    el.className = 'hkyy-copy-bubble';
    el.textContent = 'Kopyala';
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
        bubble.style.left =
          window.scrollX + rect.left + Math.min(rect.width / 2, 120) + 'px';
        bubble.style.display = 'inline-block';
      } catch {
        if (Date.now() >= state.copyBubbleStickyUntil) hide(bubble);
      }
    });
  }, 60);
  function onCopyClick() {
    const bubble = ensureCopyBubble();
    const text = getSelectedText();
    if (!text.trim()) {
      hide(bubble);
      showToast('Seçim yok');
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        cacheLastCopied(text);
        hide(bubble);
        showToast('Kopyalandı');
      })
      .catch(() => {
        hide(bubble);
        showToast('Kopyalama reddedildi');
      });
  }
  function hide(el) {
    if (el) el.style.display = 'none';
  }
  // Olaylar
  document.addEventListener('selectionchange', updateFromSelection, {
    passive: true,
  });
  window.addEventListener('scroll', updateFromSelection, { passive: true });
  window.addEventListener('resize', updateFromSelection, { passive: true });
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') hide(state.els.copyBubble);
    },
    true
  );
  document.addEventListener(
    'click',
    (e) => {
      const root = state.els.root;
      if (!root) return;
      const insideUI = e
        .composedPath()
        .some((x) => x instanceof Element && x.id === 'hkyy-root');
      if (
        !insideUI &&
        !getSelectedText().trim() &&
        Date.now() >= state.copyBubbleStickyUntil
      )
        hide(state.els.copyBubble);
    },
    { capture: true }
  );
  document.addEventListener('copy', () => hide(state.els.copyBubble), true);
  document.addEventListener('cut', () => hide(state.els.copyBubble), true);
})();

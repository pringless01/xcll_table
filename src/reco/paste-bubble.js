// reco/paste-bubble.js - gelişmiş yapıştır balonu (HKYY port)
(function () {
  const rootNS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  rootNS.reco = rootNS.reco || {};
  const R = rootNS.reco;
  if (R._pasteBubbleEnhanced) return;
  R._pasteBubbleEnhanced = true;
  const { state, ensureRoot, showToast, throttle } = R;
  function ensurePasteBubble() {
    ensureRoot();
    if (state.els.pasteBubble) return state.els.pasteBubble;
    const el = document.createElement('div');
    el.className = 'hkyy-paste-bubble';
    el.innerHTML =
      '<div class="hkyy-paste-row"><button class="hkyy-btn" id="hkyy-btn-paste">Yapıştır</button><button class="hkyy-btn primary" id="hkyy-btn-clearpaste">Boşalt & Yapıştır</button></div>';
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    state.els.root.appendChild(el);
    state.els.pasteBubble = el;
    el.querySelector('#hkyy-btn-paste').addEventListener('click', () =>
      onPaste(false)
    );
    el.querySelector('#hkyy-btn-clearpaste').addEventListener('click', () =>
      onPaste(true)
    );
    return el;
  }
  function positionFor(el) {
    const bubble = ensurePasteBubble();
    const r = el.getBoundingClientRect();
    bubble.style.visibility = 'hidden';
    bubble.style.display = 'inline-block';
    const bh = bubble.offsetHeight;
    let top = window.scrollY + r.top - bh - 6;
    let left = window.scrollX + r.left;
    if (top < window.scrollY) top = window.scrollY + r.top + 2;
    bubble.style.top = top + 'px';
    bubble.style.left = left + 'px';
    bubble.style.visibility = 'visible';
  }
  async function onPaste(clearBefore) {
    const target = state.currentPasteTarget;
    if (!target || !(target instanceof Element)) {
      hide(ensurePasteBubble());
      return;
    }
    try {
      target.focus();
    } catch {}
    requestAnimationFrame(async () => {
      let text = '';
      try {
        text = await navigator.clipboard.readText();
      } catch {}
      if (!text && state.lastCopied) text = state.lastCopied;
      insertText(target, text || '', clearBefore);
      hide(ensurePasteBubble());
      showToast(clearBefore ? 'Boşaltıldı & Yapıştırıldı' : 'Yapıştırıldı');
    });
  }
  function insertText(el, text, clearBefore) {
    const isInput =
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable;
    if (!isInput) return;
    if (el.isContentEditable) {
      if (clearBefore) el.textContent = '';
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        if (!clearBefore) sel.deleteFromDocument();
        const t = document.createTextNode(text);
        sel.getRangeAt(0).insertNode(t);
        sel.collapseToEnd();
      } else {
        el.append(text);
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      return;
    }
    if (clearBefore) {
      el.value = text;
      try {
        el.selectionStart = el.selectionEnd = el.value.length;
      } catch {}
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    const pos = start + text.length;
    try {
      el.selectionStart = el.selectionEnd = pos;
    } catch {}
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function hide(el) {
    if (el) el.style.display = 'none';
  }
  document.addEventListener(
    'focusin',
    (e) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t?.isContentEditable
      ) {
        state.currentPasteTarget = t;
        positionFor(t);
        state.pasteBubbleStickyUntil = Date.now() + state.PASTE_STICKY_MS;
        ensurePasteBubble().style.display = 'inline-block';
      } else {
        hide(ensurePasteBubble());
        state.currentPasteTarget = null;
      }
    },
    { passive: true }
  );
  const rePos = throttle(() => {
    if (state.currentPasteTarget) positionFor(state.currentPasteTarget);
  }, 60);
  window.addEventListener('scroll', rePos, { passive: true });
  window.addEventListener('resize', rePos, { passive: true });
  document.addEventListener(
    'click',
    (e) => {
      const insideUI = e
        .composedPath()
        .some((x) => x instanceof Element && x.id === 'hkyy-root');
      const clickedTarget = e.composedPath().includes(state.currentPasteTarget);
      if (
        !insideUI &&
        !clickedTarget &&
        Date.now() >= state.pasteBubbleStickyUntil
      )
        hide(ensurePasteBubble());
    },
    { capture: true }
  );
})();

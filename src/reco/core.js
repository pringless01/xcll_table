// reco/core.js - HKYY core adapted into ExcelHelperNS.reco namespace
(function () {
  if (
    window.ExcelHelperNS &&
    window.ExcelHelperNS.reco &&
    window.ExcelHelperNS.reco.coreReady
  )
    return;
  window.ExcelHelperNS = window.ExcelHelperNS || {};
  const NS = 'hkyy';
  const state = {
    lastCopied: '',
    copyBubbleStickyUntil: 0,
    pasteBubbleStickyUntil: 0,
    COPY_STICKY_MS: 3000,
    PASTE_STICKY_MS: 4000,
    currentPasteTarget: null,
    highlights: [],
    MAX_HIGHLIGHTS: 200,
    els: {
      root: null,
      copyBubble: null,
      pasteBubble: null,
      searchBar: null,
      toast: null,
      btn: {},
    },
    toolbarPos: { top: 8, left: null, right: null },
  };
  function ensureRoot() {
    if (state.els.root) return state.els.root;
    const root = document.createElement('div');
    root.id = `${NS}-root`;
    root.className = `${NS}-root`;
    document.documentElement.appendChild(root);
    const toast = document.createElement('div');
    toast.className = `${NS}-toast`;
    root.appendChild(toast);
    state.els.root = root;
    state.els.toast = toast;
    return root;
  }
  function showToast(text, ms = 1400) {
    ensureRoot();
    state.els.toast.textContent = text;
    state.els.toast.style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      state.els.toast.style.display = 'none';
    }, ms);
  }
  function throttle(fn, wait = 50) {
    let last = 0,
      tid = null,
      pending = null;
    return function (...args) {
      const now = Date.now();
      pending = args;
      const run = () => {
        last = now;
        tid = null;
        fn.apply(this, pending);
        pending = null;
      };
      if (!last || now - last >= wait) {
        run();
      } else if (!tid) {
        tid = setTimeout(run, wait - (now - last));
      }
    };
  }
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function cacheLastCopied(text) {
    state.lastCopied = text;
    try {
      chrome.storage.local.set({ lastCopied: text });
    } catch {}
  }
  async function refreshClipboardCache() {
    try {
      const txt = await navigator.clipboard.readText();
      if (txt && typeof txt === 'string' && txt !== state.lastCopied)
        cacheLastCopied(txt);
    } catch {}
  }
  function clearHighlights() {
    for (const node of state.highlights) {
      const parent = node?.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(node.textContent), node);
      parent.normalize();
    }
    state.highlights = [];
    showToast('Temizlendi');
  }
  function smoothCenter(el) {
    setTimeout(() => {
      try {
        el.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: 'smooth',
        });
      } catch {
        const r = el.getBoundingClientRect();
        window.scrollTo({
          top: window.scrollY + r.top - window.innerHeight * 0.4,
          behavior: 'smooth',
        });
      }
    }, 30);
  }
  function saveToolbarPos(pos) {
    state.toolbarPos = pos;
    chrome.storage.local.set({ hkyy_toolbar_pos: pos });
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.hkyy_toolbar_pos && state.els.searchBar) {
      const v = changes.hkyy_toolbar_pos.newValue;
      if (v) applyToolbarPos(v);
    }
    if (changes.lastCopied) {
      state.lastCopied = changes.lastCopied.newValue || '';
    }
  });
  function applyToolbarPos(pos) {
    const el = state.els.searchBar;
    if (!el) return;
    el.style.top = pos.top != null ? pos.top + 'px' : '';
    el.style.bottom = pos.bottom != null ? pos.bottom + 'px' : '';
    el.style.left = pos.left != null ? pos.left + 'px' : '';
    el.style.right = pos.right != null ? pos.right + 'px' : '';
    el.style.transform = '';
  }
  async function loadInitialState() {
    return new Promise((res) => {
      chrome.storage.local.get(['lastCopied', 'hkyy_toolbar_pos'], (out) => {
        if (typeof out.lastCopied === 'string')
          state.lastCopied = out.lastCopied;
        if (out.hkyy_toolbar_pos) state.toolbarPos = out.hkyy_toolbar_pos;
        res();
      });
    });
  }
  const api = {
    NS,
    state,
    ensureRoot,
    showToast,
    escapeRegExp,
    cacheLastCopied,
    refreshClipboardCache,
    clearHighlights,
    smoothCenter,
    throttle,
    saveToolbarPos,
    applyToolbarPos,
    loadInitialState,
  };
  window.ExcelHelperNS.reco = Object.assign(
    window.ExcelHelperNS.reco || {},
    api,
    { coreReady: true }
  );
})();

// Hızlı Kopyala • Yapıştır • Ara — PROTOTİP v0.1.4
// Yeni: Üst bar'a "ID Kopyala" eklendi.
//  - Sadece https://backoffice.betcoapps.com/#/customers/detail/<ID> (ID: 5-15 rakam) sayfalarında aktif.
//  - Tıklayınca ID'yi panoya kopyalar ve lastCopied olarak cache'ler.

(() => {
  const NS = "hkyy";
  let lastCopied = "";
  let copyBubble, pasteBubble, searchBar, toastEl;
  let currentPasteTarget = null;
  let btnSearch, btnClear, btnCopyId;
  let highlights = [];
  const MAX_HIGHLIGHTS = 200;

  // sticky süreleri
  let copyBubbleStickyUntil = 0;
  const COPY_STICKY_MS = 3000;
  let pasteBubbleStickyUntil = 0;
  const PASTE_STICKY_MS = 4000;

  // --- UI ---
  function ensureUI() {
    if (document.getElementById(`${NS}-root`)) return;

    const root = document.createElement("div");
    root.id = `${NS}-root`;
    root.className = `${NS}-root`;
    document.documentElement.appendChild(root);

    // Kopyala balonu
    copyBubble = document.createElement("div");
    copyBubble.className = `${NS}-copy-bubble`;
    copyBubble.textContent = "Kopyala";
    copyBubble.addEventListener("mousedown", e => { e.preventDefault(); e.stopPropagation(); });
    copyBubble.addEventListener("click", onCopyClick);
    root.appendChild(copyBubble);

    // Yapıştır balonu
    pasteBubble = document.createElement("div");
    pasteBubble.className = `${NS}-paste-bubble`;
    pasteBubble.innerHTML = `
      <div class="${NS}-paste-row">
        <button class="${NS}-btn" id="${NS}-btn-paste">Yapıştır</button>
        <button class="${NS}-btn primary" id="${NS}-btn-clearpaste">Boşalt & Yapıştır</button>
      </div>
    `;
    pasteBubble.addEventListener("mousedown", e => { e.preventDefault(); e.stopPropagation(); });
    root.appendChild(pasteBubble);
    document.getElementById(`${NS}-btn-paste`).addEventListener("click", () => onPasteClick(false));
    document.getElementById(`${NS}-btn-clearpaste`).addEventListener("click", () => onPasteClick(true));

    // Üst arama barı + ID Kopyala
    searchBar = document.createElement("div");
    searchBar.className = `${NS}-searchbar`;
    searchBar.innerHTML = `
      <span class="${NS}-icon" aria-hidden="true"></span>
      <span style="font-size:13px;">Ara</span>
      <button id="${NS}-btn-search">Son Kopyalanan</button>
      <button id="${NS}-btn-copyid" title="URL sonundaki ID'yi kopyala">ID Kopyala</button>
      <button id="${NS}-btn-clear">Temizle</button>
    `;
    root.appendChild(searchBar);

    btnSearch = document.getElementById(`${NS}-btn-search`);
    btnClear  = document.getElementById(`${NS}-btn-clear`);
    btnCopyId = document.getElementById(`${NS}-btn-copyid`);

    btnSearch.addEventListener("click", searchLastCopied);
    btnClear.addEventListener("click", clearHighlights);
    btnCopyId.addEventListener("click", copyCustomerIdFromUrl);

    // Toast
    toastEl = document.createElement("div");
    toastEl.className = `${NS}-toast`;
    root.appendChild(toastEl);

    // İlk durum: butonu sayfaya göre aktif/pasif yap
    updateCopyIdButtonState();
  }

  function showToast(text, ms = 1400) {
    toastEl.textContent = text;
    toastEl.style.display = "block";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (toastEl.style.display = "none"), ms);
  }

  // --- ID yakalama & kopyalama ---
  function getCustomerIdFromLocationHref() {
    try {
      const href = location.href;
      // host ve rota kontrolü + sonda 5-15 rakam
      // Örn: https://backoffice.betcoapps.com/#/customers/detail/258235875
      const hostOk = /:\/\/backoffice\.betcoapps\.com\//i.test(href);
      if (!hostOk) return null;

      const m = href.match(/#\/customers\/detail\/(\d{5,15})$/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  function updateCopyIdButtonState() {
    if (!btnCopyId) return;
    const id = getCustomerIdFromLocationHref();
    if (id) {
      btnCopyId.removeAttribute("disabled");
      btnCopyId.title = `ID: ${id} — Kopyalamak için tıkla`;
    } else {
      btnCopyId.setAttribute("disabled", "true");
      btnCopyId.title = "Bu sayfada kopyalanacak ID bulunamadı";
    }
  }

  function copyCustomerIdFromUrl() {
    const id = getCustomerIdFromLocationHref();
    if (!id) {
      showToast("ID bulunamadı");
      updateCopyIdButtonState();
      return;
    }
    navigator.clipboard.writeText(id).then(() => {
      cacheLastCopied(id);
      showToast(`ID kopyalandı: ${id}`);
    }).catch(() => {
      showToast("ID kopyalanamadı");
    });
  }

  // --- Kopyala balonu (sticky) ---
  function updateCopyBubbleFromSelection() {
    const sel = document.getSelection();
    const text = sel ? String(sel.toString()).trim() : "";

    if (!text) {
      if (Date.now() < copyBubbleStickyUntil) return;
      hide(copyBubble);
      return;
    }

    copyBubbleStickyUntil = Date.now() + COPY_STICKY_MS;

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) { 
        if (Date.now() >= copyBubbleStickyUntil) hide(copyBubble);
        return; 
      }

      const top = window.scrollY + rect.bottom + 6;
      const left = window.scrollX + rect.left + Math.min(rect.width / 2, 120);
      copyBubble.style.top = `${top}px`;
      copyBubble.style.left = `${left}px`;
      copyBubble.style.display = "inline-block";
    } catch {
      if (Date.now() >= copyBubbleStickyUntil) hide(copyBubble);
    }
  }

  function onCopyClick() {
    const sel = document.getSelection();
    const text = sel ? String(sel.toString()) : "";
    if (!text.trim()) {
      hide(copyBubble);
      showToast("Seçim yok");
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      cacheLastCopied(text);
      hide(copyBubble);
      showToast("Kopyalandı");
    }).catch(() => {
      hide(copyBubble);
      showToast("Kopyalama reddedildi");
    });
  }

  // --- Yapıştır balonu ---
  function positionPasteBubbleFor(el) {
    const r = el.getBoundingClientRect();

    // Balonu ölçmek için geçici görünür yap
    pasteBubble.style.visibility = "hidden";
    pasteBubble.style.display = "inline-block";
    const bh = pasteBubble.offsetHeight;

    // DIŞ sol-üst
    let top = window.scrollY + r.top - bh - 6;
    let left = window.scrollX + r.left;

    // Üstte yer yoksa İÇ sol-üst
    if (top < window.scrollY) {
      top = window.scrollY + r.top + 2;
    }

    pasteBubble.style.top = `${top}px`;
    pasteBubble.style.left = `${left}px`;
    pasteBubble.style.visibility = "visible";
  }

  function showPasteBubbleFor(el) {
    currentPasteTarget = el;
    positionPasteBubbleFor(el);
    pasteBubbleStickyUntil = Date.now() + PASTE_STICKY_MS;
    pasteBubble.style.display = "inline-block";
  }

  function onPasteClick(clearBefore) {
    if (!currentPasteTarget || !(currentPasteTarget instanceof Element)) {
      hide(pasteBubble);
      return;
    }

    try { currentPasteTarget.focus(); } catch {}

    requestAnimationFrame(async () => {
      let text = "";
      try { text = await navigator.clipboard.readText(); } catch {}
      if (!text && lastCopied) text = lastCopied;

      insertText(currentPasteTarget, text || "", clearBefore);
      hide(pasteBubble);
      showToast(clearBefore ? "Boşaltıldı & Yapıştırıldı" : "Yapıştırıldı");
    });
  }

  function insertText(el, text, clearBefore) {
    const isInput =
      el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.isContentEditable;

    if (!isInput) return;

    if (el.isContentEditable) {
      if (clearBefore) el.textContent = "";
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        if (!clearBefore) sel.deleteFromDocument();
        const t = document.createTextNode(text);
        sel.getRangeAt(0).insertNode(t);
        sel.collapseToEnd();
      } else {
        el.append(text);
      }
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return;
    }

    if (clearBefore) {
      el.value = text;
      try { el.selectionStart = el.selectionEnd = el.value.length; } catch {}
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    el.value = before + text + after;
    const pos = start + text.length;
    try { el.selectionStart = el.selectionEnd = pos; } catch {}
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // --- Arama ---
  function clearHighlights() {
    for (const node of highlights) {
      const parent = node.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(node.textContent), node);
      parent.normalize();
    }
    highlights = [];
    showToast("Temizlendi");
  }

  async function searchLastCopied() {
    let q = (lastCopied || "").trim();
    if (!q) {
      try {
        const txt = await navigator.clipboard.readText();
        if (txt && txt.trim()) q = txt.trim();
      } catch {}
    }
    if (!q) { showToast("Kopyalanan yok"); return; }

    clearHighlights();

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest(`#${NS}-root`)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const regex = new RegExp(escapeRegExp(q), "gi");
    let count = 0;
    while (count < MAX_HIGHLIGHTS) {
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
        highlights.push(span);
        count++;
        lastIdx = idx + m.length;
        return m;
      });
      if (lastIdx < txt.length) frag.appendChild(document.createTextNode(txt.slice(lastIdx)));
      node.parentNode.replaceChild(frag, node);
      if (count >= MAX_HIGHLIGHTS) break;
    }

    showToast(count ? `Bulunan: ${count}` : "Bulunamadı");

    if (highlights[0]) {
      setTimeout(() => {
        try {
          highlights[0].scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        } catch {
          const r = highlights[0].getBoundingClientRect();
          window.scrollTo({ top: window.scrollY + r.top - (window.innerHeight * 0.4), behavior: "smooth" });
        }
      }, 30);
    }
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // --- Cache helpers ---
  function cacheLastCopied(text) {
    lastCopied = text;
    chrome.storage.local.set({ lastCopied: text });
  }
  async function refreshClipboardCache() {
    try {
      const txt = await navigator.clipboard.readText();
      if (txt && typeof txt === "string" && txt !== lastCopied) {
        cacheLastCopied(txt);
      }
    } catch {}
  }

  // --- Olaylar ---
  function onSelectionChange() { updateCopyBubbleFromSelection(); }
  function onMouseUp() { updateCopyBubbleFromSelection(); }

  function onFocusIn(e) {
    const t = e.target;
    if (!t) return;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable) {
      showPasteBubbleFor(t);
    } else {
      hide(pasteBubble);
      currentPasteTarget = null;
    }
  }

  function onScrollOrResize() {
    const sel = document.getSelection();
    if (sel && sel.toString().trim()) updateCopyBubbleFromSelection();
    if (currentPasteTarget) positionPasteBubbleFor(currentPasteTarget);
  }

  function onClickPage(e) {
    const path = e.composedPath ? e.composedPath() : [];
    const insideUI = path.some(el => el instanceof Element && el.id === `${NS}-root`);
    const clickedPasteTarget = path.includes(currentPasteTarget);

    if (!insideUI && !clickedPasteTarget) {
      if (Date.now() >= pasteBubbleStickyUntil) hide(pasteBubble);
    }
    if (!insideUI && Date.now() >= copyBubbleStickyUntil) hide(copyBubble);
  }

  function onCopyCut(e) {
    let txt = "";
    const sel = document.getSelection();
    if (sel && sel.toString()) txt = sel.toString();
    try {
      if (!txt && e && e.clipboardData) {
        txt = e.clipboardData.getData("text/plain") || e.clipboardData.getData("text") || "";
      }
    } catch {}
    if (txt) cacheLastCopied(txt);
  }

  function onVisibilityChange() { if (!document.hidden) refreshClipboardCache(); }

  // SPA/hash değişimlerinde ID butonunu güncel tut
  window.addEventListener("hashchange", updateCopyIdButtonState);
  window.addEventListener("popstate", updateCopyIdButtonState);

  // --- Başlat ---
  function init() {
    ensureUI();

    chrome.storage.local.get(["lastCopied"], (res) => {
      if (typeof res.lastCopied === "string") lastCopied = res.lastCopied;
    });

    document.addEventListener("selectionchange", onSelectionChange, { passive: true });
    document.addEventListener("mouseup", onMouseUp, { passive: true });
    document.addEventListener("focusin", onFocusIn, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    document.addEventListener("click", onClickPage, { capture: true });

    document.addEventListener("copy", onCopyCut, true);
    document.addEventListener("cut", onCopyCut, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refreshClipboardCache);

    // SPA: UI kökünü koru ve paste bubble pozisyonunu güncelle
    const observer = new MutationObserver(() => {
      const root = document.getElementById(`${NS}-root`);
      if (root && root.parentElement !== document.documentElement) {
        document.documentElement.appendChild(root);
      }
      if (currentPasteTarget) positionPasteBubbleFor(currentPasteTarget);
      updateCopyIdButtonState();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // --- Utils ---
  function hide(el) { if (el) el.style.display = "none"; }
})();

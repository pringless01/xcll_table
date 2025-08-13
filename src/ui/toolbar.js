// Unified Toolbar (ikon-only, Shadow DOM) - mounts as #excel-helper-toolbar
(function () {
  // Reco arama paneli UI'ını devre dışı bırak (sadece fonksiyonları kullanacağız)
  window.__EH_NO_SEARCHBAR_UI = true;

  const NS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  const SVG = {
    // Minimal Lucide benzeri ikonlar
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    right:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    hash:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="9" x2="19" y2="9"/><line x1="5" y1="15" x2="19" y2="15"/><line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#E5484D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    cursor:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7 17 2-7 7-2z"/></svg>',
    filter:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3"/></svg>',
    file:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    sheet:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
  };

  const CSS = `:host, .unified-toolbar {position:fixed;top:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:#0E0F13;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:6px 10px;box-shadow:0 8px 24px rgba(0,0,0,.28);z-index:2147483647}
  .unified-toolbar button{width:32px;height:32px;display:grid;place-items:center;border-radius:8px;outline:none;border:none;background:transparent;cursor:pointer;color:#e7e7ea}
  .unified-toolbar button:hover{background:rgba(255,255,255,.08)}
  .unified-toolbar button[aria-pressed="true"]{box-shadow:inset 0 0 0 2px #2B6EFF}
  .unified-toolbar .btn-close svg{stroke:#E5484D}
  .unified-toolbar svg{width:18px;height:18px}`;

  function ensureHost(settings) {
    let host = document.getElementById('excel-helper-toolbar');
    if (host) return host;
    host = document.createElement('div');
    host.id = 'excel-helper-toolbar';
    // Konum persist
    if (settings && settings.toolbarPosition) {
      host.style.position = 'fixed';
      host.style.left = settings.toolbarPosition.x + 'px';
      host.style.top = settings.toolbarPosition.y + 'px';
    }
    document.body.appendChild(host);
    return host;
  }

  function makeButton({ icon, label, cls, pressed }) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls || '';
    btn.innerHTML = icon;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    if (typeof pressed === 'boolean') btn.setAttribute('aria-pressed', String(pressed));
    return btn;
  }

  function copyIdToast(msg) {
    try {
      const T = NS.reco && NS.reco.showToast;
      T ? T(msg) : console.log('[ExcelHelper]', msg);
    } catch {}
  }

  function tryGetCustomerId() {
    try {
      const href = location.href;
      const m = href.match(/#\/customers\/detail\/(\d{5,15})$/);
      return m ? m[1] : null;
    } catch { return null; }
  }

  function mountUnifiedToolbar() {
    const settings = NS.getSettings ? NS.getSettings() : { selectionMode: true, toolbarVisible: true, toolbarPosition: { x: 10, y: 10 } };
    const host = ensureHost(settings);

    // Shadow root
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    // Clear shadow
    root.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = CSS;
    const wrap = document.createElement('div');
    wrap.className = 'unified-toolbar';

    // Buttons
    const btnPrev = makeButton({ icon: SVG.left, label: 'Önceki sekme' });
    const btnNext = makeButton({ icon: SVG.right, label: 'Sonraki sekme' });
    const btnSearch = makeButton({ icon: SVG.search, label: 'Ara (Son Kopyalanan)' });
    const btnCopyId = makeButton({ icon: SVG.hash, label: 'ID kopyala' });
    const btnClose = makeButton({ icon: SVG.close, label: 'Sekmeyi kapat', cls: 'btn-close' });
    const btnSelect = makeButton({ icon: SVG.cursor, label: 'Seçim modu', pressed: !!settings.selectionMode });
  const btnFilter = makeButton({ icon: SVG.filter, label: 'Filtre modu', pressed: !!settings.filterMode });
    const btnCSV = makeButton({ icon: SVG.file, label: 'CSV dışa aktar' });
    const btnXLSX = makeButton({ icon: SVG.sheet, label: 'Excel dışa aktar' });

    // Handlers
    btnPrev.addEventListener('click', () => {
      try { chrome.runtime.sendMessage({ type: 'SWITCH_TAB', direction: 'prev', steps: 1 }); } catch {}
    });
    btnNext.addEventListener('click', () => {
      try { chrome.runtime.sendMessage({ type: 'SWITCH_TAB', direction: 'next', steps: 1 }); } catch {}
    });
    btnClose.addEventListener('click', () => {
      try { chrome.runtime.sendMessage({ type: 'CLOSE_ACTIVE_TAB' }); } catch {}
    });
    btnSearch.addEventListener('click', async () => {
      // Reco search fonksiyonu varsa kullan, yoksa basit clipboard -> toast
      try {
        if (NS.reco && typeof NS.reco.searchLastCopied === 'function') {
          NS.reco.searchLastCopied();
        } else {
          const txt = (await navigator.clipboard.readText?.()) || '';
          copyIdToast(txt ? `Aranacak: ${txt}` : 'Kopyalanan yok');
        }
      } catch {}
    });
    btnCopyId.addEventListener('click', async () => {
      const id = tryGetCustomerId();
      if (!id) { copyIdToast('ID bulunamadı'); return; }
      try { await navigator.clipboard.writeText(id); copyIdToast('ID kopyalandı'); } catch { copyIdToast('ID kopyalanamadı'); }
    });
    btnSelect.addEventListener('click', () => {
      const nm = NS.toggleSelectionMode ? NS.toggleSelectionMode() : false;
      btnSelect.setAttribute('aria-pressed', String(!!nm));
      if (!nm) {
        try { NS.clearSelection && NS.clearSelection(); NS.updateStatusPanel && NS.updateStatusPanel(); } catch {}
      }
    });
    btnFilter.addEventListener('click', () => {
      try { NS.toggleFilters && NS.toggleFilters(); } catch {}
      const nm = NS.toggleFilterMode ? NS.toggleFilterMode() : (btnFilter.getAttribute('aria-pressed') !== 'true');
      btnFilter.setAttribute('aria-pressed', String(!!nm));
    });
    btnCSV.addEventListener('click', () => {
      try { NS.exportSelectionToCSV && NS.exportSelectionToCSV(); } catch (e) { console.error('CSV dışa aktarım hatası', e); }
    });
    btnXLSX.addEventListener('click', () => {
      try { NS.exportSelectionToExcel && NS.exportSelectionToExcel(); } catch (e) { console.error('Excel dışa aktarım hatası', e); }
    });

    wrap.append(btnPrev, btnNext, btnSearch, btnCopyId, btnClose, btnSelect, btnFilter, btnCSV, btnXLSX);
    root.append(style, wrap);

    // Toolbar görünürlük/persist
    host.style.display = settings.toolbarVisible ? 'block' : 'none';

    // Kısayollar
    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (e.ctrlKey && !e.shiftKey && k === 'f') { e.preventDefault(); btnSearch.click(); }
      if (e.ctrlKey && e.shiftKey && k === 's') { e.preventDefault(); btnSelect.click(); }
      if (e.ctrlKey && e.shiftKey && k === 'f') { e.preventDefault(); btnFilter.click(); }
      if (e.ctrlKey && e.shiftKey && k === 'c') { e.preventDefault(); btnCSV.click(); }
      if (e.ctrlKey && e.shiftKey && k === 'e') { /* manifest komutuyla çakışabilir, sadece export yap */ e.preventDefault(); btnXLSX.click(); }
    }, true);

    // Drag (host taşınır)
    let dragging=false, sx=0, sy=0, ox=0, oy=0;
    host.style.cursor = 'move';
    host.addEventListener('mousedown', (e) => {
      // Shadow içindeki buton tıklamaları drag olmasın
      const path = e.composedPath && e.composedPath();
      if (path && path.find((el) => el instanceof HTMLElement && el.tagName === 'BUTTON')) return;
      dragging = true; sx = e.clientX; sy = e.clientY; const r = host.getBoundingClientRect(); ox = r.left; oy = r.top;
    });
    document.addEventListener('mousemove', (e) => { if (!dragging) return; host.style.left = ox + (e.clientX-sx) + 'px'; host.style.top = oy + (e.clientY-sy) + 'px'; });
    document.addEventListener('mouseup', () => { if (!dragging) return; dragging=false; const r = host.getBoundingClientRect(); try { NS.updateToolbarPosition && NS.updateToolbarPosition(r.left, r.top); } catch {} });
  }

  function initToolbar() {
    mountUnifiedToolbar();
  }

  // Export to namespace
  Object.assign(NS, { initToolbar });
})();

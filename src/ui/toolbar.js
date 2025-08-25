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
    grip:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="17" r="1"/></svg>',
  };

  const CSS = `:host, .unified-toolbar {position:fixed;top:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;background:#0E0F13;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:6px 10px;box-shadow:0 8px 24px rgba(0,0,0,.28);z-index:2147483647}
  .unified-toolbar button{width:32px;height:32px;display:grid;place-items:center;border-radius:8px;outline:none;border:none;background:transparent;cursor:pointer;color:#e7e7ea}
  .unified-toolbar button:hover{background:rgba(255,255,255,.08)}
  .unified-toolbar button[aria-pressed="true"]{box-shadow:inset 0 0 0 2px #2B6EFF}
  .unified-toolbar .btn-close svg{stroke:#E5484D}
  .unified-toolbar svg{width:18px;height:18px}
  .unified-toolbar .drag-handle{cursor:move}
  .unified-toolbar .drag-handle[aria-pressed="true"]{box-shadow:none}
  `;

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
  host.style.transform = 'none';
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

  // Drag handle: sadece bu butondan sürükleme başlayacak
  const btnDrag = makeButton({ icon: SVG.grip, label: (NS.t&&NS.t('drag_handle_label'))||'Sürükle', cls: 'drag-handle' });

    // Buttons
    const btnPrev = makeButton({ icon: SVG.left, label: (NS.t&&NS.t('prev_tab'))||'Önceki sekme' });
    const btnNext = makeButton({ icon: SVG.right, label: (NS.t&&NS.t('next_tab'))||'Sonraki sekme' });
    const btnSearch = makeButton({ icon: SVG.search, label: (NS.t&&NS.t('search_last_copied'))||'Ara (Son Kopyalanan)' });
    const btnCopyId = makeButton({ icon: SVG.hash, label: (NS.t&&NS.t('copy_id'))||'ID kopyala' });
    const btnClose = makeButton({ icon: SVG.close, label: (NS.t&&NS.t('close_tab'))||'Sekmeyi kapat', cls: 'btn-close' });
    const btnSelect = makeButton({ icon: SVG.cursor, label: (NS.t&&NS.t('selection_mode'))||'Seçim modu', pressed: !!settings.selectionMode });
  const btnFilter = makeButton({ icon: SVG.filter, label: (NS.t&&NS.t('filter_mode'))||'Filtre modu', pressed: !!settings.filterMode });
    const btnCSV = makeButton({ icon: SVG.file, label: (NS.t&&NS.t('export_csv'))||'CSV dışa aktar' });
    const btnXLSX = makeButton({ icon: SVG.sheet, label: (NS.t&&NS.t('export_excel'))||'Excel dışa aktar' });

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
      try {
        // Önce geri uyum stub'ını tetikle (testler bunu izliyor)
        if (NS.reco && typeof NS.reco.searchLastCopied === 'function') {
          try { NS.reco.searchLastCopied(); } catch {}
        }
        const api = NS.reco && NS.reco.findAPI;
        if (api) {
          const bar = document.querySelector('.hkyy-findbar');
          if (!bar || bar.style.display==='none') {
            let preset='';
            try { const sel=String(getSelection()); if(sel.trim()) preset=sel.trim(); else if (NS.state && NS.state.lastCopied) preset=NS.state.lastCopied.trim(); else { const clip=await navigator.clipboard.readText(); if(clip && clip.trim()) preset=clip.trim(); } } catch{}
            api.open(preset);
          } else {
            api.next();
          }
        }
      } catch {}
    });
    btnCopyId.addEventListener('click', async () => {
      const id = tryGetCustomerId();
  if (!id) { copyIdToast((NS.t&&NS.t('id_not_found'))||'ID bulunamadı'); return; }
  try { await navigator.clipboard.writeText(id); copyIdToast((NS.t&&NS.t('id_copied'))||'ID kopyalandı'); } catch { copyIdToast((NS.t&&NS.t('id_copy_failed'))||'ID kopyalanamadı'); }
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

  wrap.append(btnDrag, btnPrev, btnNext, btnSearch, btnCopyId, btnClose, btnSelect, btnFilter, btnCSV, btnXLSX);
    root.append(style, wrap);

    // Toolbar görünürlük/persist
    host.style.display = settings.toolbarVisible ? 'block' : 'none';

    // Toolbar üstünde scroll ile sekme değiştir (ivmeli)
    let lastWheelTs = 0;
    let wheelBurst = 0; // 0..3
    wrap.addEventListener(
      'wheel',
      (e) => {
        try {
          e.preventDefault();
          e.stopPropagation();
          const now = performance.now();
          const dt = now - lastWheelTs;
          lastWheelTs = now;
          wheelBurst = dt < 250 ? Math.min(3, wheelBurst + 1) : 0;
          const accel = [1, 2, 4, 8][wheelBurst] || 1;
          const axis = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          const direction = axis < 0 ? 'prev' : 'next';
          const steps = accel;
          try { chrome.runtime.sendMessage({ type: 'SWITCH_TAB', direction, steps }); } catch {}
        } catch {}
      },
      { passive: false }
    );

    // Kısayollar
    let lastCtrlF = 0;
    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (e.ctrlKey && !e.shiftKey && k === 'f') {
        const now = Date.now();
        if (now - lastCtrlF < 600) { e.preventDefault(); return; } // spam engelle
        lastCtrlF = now;
        e.preventDefault();
        btnSearch.click();
      }
      if (e.ctrlKey && e.shiftKey && k === 's') { e.preventDefault(); btnSelect.click(); }
      if (e.ctrlKey && e.shiftKey && k === 'f') { e.preventDefault(); btnFilter.click(); }
      if (e.ctrlKey && e.shiftKey && k === 'c') { e.preventDefault(); btnCSV.click(); }
      if (e.ctrlKey && e.shiftKey && k === 'e') { e.preventDefault(); btnXLSX.click(); }
    }, true);

  // Drag (SADECE grip butonu)
  let dragging=false, sx=0, sy=0, ox=0, oy=0, lastSent=0;
    function clampPosition(x, y) {
      // Ölçüleri al
      const r = host.getBoundingClientRect();
      const margin = 8;
      const maxX = (window.innerWidth || document.documentElement.clientWidth) - r.width - margin;
      const maxY = (window.innerHeight || document.documentElement.clientHeight) - r.height - margin;
      const nx = Math.min(Math.max(margin, x), Math.max(margin, maxX));
      const ny = Math.min(Math.max(margin, y), Math.max(margin, maxY));
      host.style.left = nx + 'px';
      host.style.top = ny + 'px';
      host.style.transform = 'none';
      return { x: nx, y: ny };
    }
    function clampCurrentAndPersist() {
      const r = host.getBoundingClientRect();
      const { x, y } = clampPosition(r.left, r.top);
      try { NS.updateToolbarPosition && NS.updateToolbarPosition(x, y); } catch {}
    }
    const startDrag = (e) => {
      if(e.button!==0) return; // sadece sol klik
      dragging = true; sx = e.clientX; sy = e.clientY; const r = host.getBoundingClientRect(); ox = r.left; oy = r.top;
      host.style.transform='none'; e.preventDefault();
    };
    const moveDrag = (e) => {
      if(!dragging) return;
      const nx = ox + (e.clientX - sx);
      const ny = oy + (e.clientY - sy);
      const clamped = clampPosition(nx, ny);
      const now = Date.now();
      if (now - lastSent > 50) { lastSent = now; try { NS.updateToolbarPosition && NS.updateToolbarPosition(clamped.x, clamped.y); } catch {} }
    };
    const endDrag = () => { if(!dragging) return; dragging=false; clampCurrentAndPersist(); };
    btnDrag.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);

    // Eski tam-yüzey drag kalıntısı varsa temizle (önceki versiyonlardan kalan event leak'lerini azaltma)
    wrap.onclick = wrap.onclick || null;

    // Sekmeler arası eşzamanlılık: storage değişimini dinle ve konumu uygula
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        const ent = changes && changes.excelHelperSettings;
        if (!ent) return;
        const nv = ent.newValue || {};
        const tp = nv.toolbarPosition;
        if (!tp || dragging) return; // drag sırasında zıplama yapma
        clampPosition(tp.x, tp.y);
      });
    } catch {}

    // Mount sonrası ilk clamp (persist edilmiş konum görünür alan dışındaysa içeri çek)
    requestAnimationFrame(() => {
      const r = host.getBoundingClientRect();
      const margin = 8;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.right < margin || r.left > vw - margin || r.bottom < margin || r.top > vh - margin) {
        clampCurrentAndPersist();
      }
    });

    // Resize ile ekran daralırsa içeri geri çek
    let resizeRAF = 0;
    window.addEventListener('resize', () => {
      if (resizeRAF) return;
      resizeRAF = requestAnimationFrame(() => { resizeRAF = 0; clampCurrentAndPersist(); });
    });
  }

  function initToolbar() {
    mountUnifiedToolbar();
  }

  // Export to namespace
  Object.assign(NS, { initToolbar });
})();

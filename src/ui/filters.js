// filters.js - consolidated clean version (advanced filters + quick date + value list incremental + include/exclude)
(function () {
  // STATE HOLDER
  function getTableState(table) {
    if (!table.__ehFilters)
      table.__ehFilters = {
        cols: new Map(),
        typeCache: new Map(),
        valueFilters: new Map(),
      };
    return table.__ehFilters;
  }

  // INCREMENTAL DISTINCT BUILDER (for large tables up to 10k rows)
  function incrementalDistinctBuilder(table, col) {
    const filterRow = table.querySelector('.table-filter-row');
    const start = filterRow ? 2 : 1;
    let r = start;
    const rows = table.rows;
    const counts = new Map();
    return {
      next(batch = 500) {
        let processed = 0;
        for (; r < rows.length && processed < batch; r++) {
          const row = rows[r];
          if (!row || row.style.display === 'none') continue;
          if (
            row.classList.contains('table-total-row') ||
            row.classList.contains('table-grand-total-row')
          )
            continue;
          const cell = row.cells[col];
          if (!cell) continue;
          const v = (cell.textContent || '').trim();
          if (!v) continue;
          counts.set(v, (counts.get(v) || 0) + 1);
          processed++;
        }
        return { done: r >= rows.length, processed };
      },
      getData() {
        return Array.from(counts.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([value, count]) => ({ value, count }));
      },
    };
  }

  // Küresel parse cache (metin -> parsed). 5000 üstünde temizlenir.
  const _EH_PARSE_CACHE = new Map();
  function cachedParseValue(str, direct) {
    // direct=true ise cache bypass (örn: filter expr parse)
    if (str == null) return { type: 'text', value: '' };
    if (direct) {
      return parseValue(str);
    }
    const key = str;
    let v = _EH_PARSE_CACHE.get(key);
    if (v) return v;
    v = parseValue(str);
    if (_EH_PARSE_CACHE.size > 5000) _EH_PARSE_CACHE.clear();
    _EH_PARSE_CACHE.set(key, v);
    return v;
  }

  // VALUE PARSER (number / date / text)
  function parseValue(str) {
    if (str == null) return { type: 'text', value: '' };
    const s = str.trim();
    if (!s) return { type: 'text', value: '' }; // number
    const num =
      window.ExcelHelperNS && window.ExcelHelperNS.parseNumericValue
        ? window.ExcelHelperNS.parseNumericValue(s)
        : (function () {
            const n = Number(s.replace(/,/g, '.'));
            return isNaN(n) ? null : n;
          })();
    if (num !== null && isFinite(num)) return { type: 'number', value: num };
    // date formats dd-MM-yy[yy][ HH:MM[:SS]]
    let ts = null;
    const dateTimeRegex =
      /(^\d{2})[.\/-](\d{2})[.\/-](\d{2}|\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
    let m = s.match(dateTimeRegex);
    if (m) {
      let [match, dd, MM, yy, HH, mm, SS] = m;
      void match;
      dd = parseInt(dd, 10);
      MM = parseInt(MM, 10) - 1;
      let year = parseInt(yy, 10);
      if (yy.length === 2) year = 2000 + year;
      HH = HH ? parseInt(HH, 10) : 0;
      mm = mm ? parseInt(mm, 10) : 0;
      SS = SS ? parseInt(SS, 10) : 0;
      const d = new Date(year, MM, dd, HH, mm, SS, 0);
      if (!isNaN(d.getTime())) ts = d.getTime();
    }
    if (ts === null) {
      const norm = s.replace(/\./g, '-').replace(/\//g, '-');
      ts = Date.parse(norm);
      if (isNaN(ts)) {
        if (/^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$/.test(s)) {
          const today = new Date();
          const parts = s.split(':').map((p) => parseInt(p, 10));
          today.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
          ts = today.getTime();
        }
      }
    }
    if (!isNaN(ts)) return { type: 'date', value: ts };
    return { type: 'text', value: s.toLowerCase() };
  }

  // FILTER INPUT PARSER
  const OP_REGEX = /^(>=|<=|==|=|!=|>|<|!)/;
  function parseFilterInput(raw) {
    const txt = (raw || '').trim();
    if (!txt) return null;
    const parts = [];
    txt.split(';').forEach((seg) => {
      const s = seg.trim();
      if (!s) return;
      let m = s.match(OP_REGEX);
      if (m) {
        const op = m[1];
        const rest = s.slice(op.length).trim();
        if (!rest) return;
        const v = parseValue(rest);
        parts.push({ kind: 'op', op: op === '==' ? '=' : op, v });
      } else if (/\.\./.test(s)) {
        const [a, b] = s.split('..');
        const va = parseValue(a);
        const vb = parseValue(b);
        if (va && vb) parts.push({ kind: 'range', a: va, b: vb });
      } else {
        const v = parseValue(s);
        parts.push({ kind: 'contains', v });
      }
    });
    return parts.length ? { raw: txt, exprs: parts } : null;
  }

  // EXPRESSION EVAL (ANY)
  function valueMatchesExpressions(cellText, filterDef) {
    if (!filterDef || !filterDef.exprs.length) return true;
    const parsedCell = cachedParseValue(cellText);
    return filterDef.exprs.some((ex) => {
      if (ex.kind === 'contains') {
        if (ex.v.type === 'text') {
          if (parsedCell.type === 'text')
            return parsedCell.value.includes(ex.v.value);
          return (cellText || '').toLowerCase().includes(ex.v.value);
        }
        if (parsedCell.type === ex.v.type)
          return parsedCell.value === ex.v.value;
        return false;
      } else if (ex.kind === 'op') {
        if (ex.v.type === 'number' && parsedCell.type === 'number') {
          const a = parsedCell.value,
            b = ex.v.value;
          switch (ex.op) {
            case '>':
              return a > b;
            case '<':
              return a < b;
            case '>=':
              return a >= b;
            case '<=':
              return a <= b;
            case '=':
              return a === b;
            case '!':
            case '!=':
              return a !== b;
          }
        } else if (ex.v.type === 'date' && parsedCell.type === 'date') {
          const a = parsedCell.value,
            b = ex.v.value;
          switch (ex.op) {
            case '>':
              return a > b;
            case '<':
              return a < b;
            case '>=':
              return a >= b;
            case '<=':
              return a <= b;
            case '=':
              return a === b;
            case '!':
            case '!=':
              return a !== b;
          }
        } else {
          const a = (cellText || '').toLowerCase();
          const b = (ex.v.value + '').toLowerCase();
          if (ex.op === '=') return a === b;
          if (ex.op === '!=' || ex.op === '!') return a !== b;
          if (ex.op === '>') return a > b;
          if (ex.op === '<') return a < b;
          if (ex.op === '>=') return a >= b;
          if (ex.op === '<=') return a <= b;
        }
        return false;
      } else if (ex.kind === 'range') {
        if (parsedCell.type !== ex.a.type || parsedCell.type !== ex.b.type)
          return false;
        const val = parsedCell.value;
        const min = Math.min(ex.a.value, ex.b.value);
        const max = Math.max(ex.a.value, ex.b.value);
        return val >= min && val <= max;
      }
      return true;
    });
  }

  // QUICK DATE HELPERS
  function ymd(d) {
    return d.toISOString().slice(0, 10);
  }
  function monthRange(d) {
    const y = d.getFullYear(),
      m = d.getMonth();
    const first = new Date(y, m, 1);
    const next = new Date(y, m + 1, 1);
    const last = new Date(next - 86400000);
    return [ymd(first), ymd(last)];
  }
  function yearRange(d) {
    const y = d.getFullYear();
    return [y + '-01-01', y + '-12-31'];
  }
  function detectColumnIsDate(table, col) {
    const state = getTableState(table);
    if (state.typeCache.has(col)) return state.typeCache.get(col) === 'date';
    let tested = 0,
      dateHits = 0;
    for (let r = 2; r < table.rows.length && tested < 50; r++) {
      const row = table.rows[r];
      if (!row) continue;
      const cell = row.cells[col];
      if (!cell) continue;
      const txt = (cell.textContent || '').trim();
      if (!txt) continue;
      tested++;
      const pv = parseValue(txt);
      if (pv.type === 'date') dateHits++;
    }
    const isDate = tested > 0 && dateHits / tested >= 0.6;
    state.typeCache.set(col, isDate ? 'date' : 'other');
    return isDate;
  }
  function buildQuickDatePanel(input, table, col) {
    if (input._ehDatePanelBuilt) return;
    input._ehDatePanelBuilt = true;
    const wrap = document.createElement('div');
    wrap.className = 'eh-date-quick-panel';
    wrap.style.cssText =
      'position:absolute;left:2px;right:2px;top:100%;z-index:999;background:#fff;border:1px solid #ccc;padding:3px;display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;box-shadow:0 2px 4px rgba(0,0,0,.15);';
    const btns = [
      {
        label: 'Bugün',
        act: () => {
          const d = new Date();
          input.value = '=' + ymd(d);
          input.dispatchEvent(new Event('input'));
        },
      },
      {
        label: 'Bu Ay',
        act: () => {
          const d = new Date();
          const [a, b] = monthRange(d);
          input.value = a + '..' + b;
          input.dispatchEvent(new Event('input'));
        },
      },
      {
        label: 'Bu Yıl',
        act: () => {
          const d = new Date();
          const [a, b] = yearRange(d);
          input.value = a + '..' + b;
          input.dispatchEvent(new Event('input'));
        },
      },
      {
        label: '>',
        act: () => {
          if (!input.value.startsWith('>')) {
            input.value = '>' + input.value;
            input.dispatchEvent(new Event('input'));
          }
        },
      },
      {
        label: '<',
        act: () => {
          if (!input.value.startsWith('<')) {
            input.value = '<' + input.value;
            input.dispatchEvent(new Event('input'));
          }
        },
      },
      {
        label: 'Temizle',
        act: () => {
          input.value = '';
          input.dispatchEvent(new Event('input'));
        },
      },
    ];
    btns.forEach((b) => {
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.textContent = b.label;
      bt.style.cssText =
        'font-size:10px;padding:2px 4px;cursor:pointer;border:1px solid #bbb;background:#f5f5f5;border-radius:3px;';
      bt.onclick = (e) => {
        e.preventDefault();
        b.act();
      };
      wrap.appendChild(bt);
    });
    const parent = input.parentElement;
    parent.style.position = 'relative';
    parent.appendChild(wrap);
    function hide() {
      wrap.style.display = 'none';
    }
    function show() {
      wrap.style.display = 'flex';
    }
    input.addEventListener('focus', () => {
      if (detectColumnIsDate(table, col)) show();
    });
    input.addEventListener('blur', () => {
      setTimeout(hide, 150);
    });
  }

  // VALUE DROPDOWN (include/exclude + search + incremental)
  function ensureValueDropdown(input, table, col) {
    if (input._ehValueDD) {
      input._ehValueDD.style.display = 'block';
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'eh-value-dropdown';
    wrap.style.cssText =
      'position:absolute;left:0;top:100%;z-index:1000;background:#fff;border:1px solid #ccc;max-height:360px;overflow:auto;min-width:220px;font-size:11px;box-shadow:0 2px 6px rgba(0,0,0,.2);padding:4px;';
    const state = getTableState(table);
    const existingVF = state.valueFilters.get(col);
    const vf = existingVF || {
      selected: null,
      all: new Set(),
      _builder: null,
      mode: 'include',
    };
    state.valueFilters.set(col, vf);
    const topBar = document.createElement('div');
    topBar.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;';
    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Ara...';
    search.style.cssText = 'flex:1;padding:2px 4px;';
    const modeBtn = document.createElement('button');
    modeBtn.type = 'button';
    modeBtn.style.cssText =
      'padding:2px 6px;font-size:11px;cursor:pointer;border:1px solid #bbb;background:#f0f0f0;';
    function syncModeBtn() {
      modeBtn.textContent = vf.mode === 'include' ? 'Dahil' : 'Hariç';
      modeBtn.title =
        vf.mode === 'include'
          ? 'Seçilen değerler görünür'
          : 'Seçilen değerler gizli';
    }
    syncModeBtn();
    modeBtn.onclick = () => {
      vf.mode = vf.mode === 'include' ? 'exclude' : 'include';
      syncModeBtn();
      applyFilters(table);
    };
    topBar.appendChild(search);
    topBar.appendChild(modeBtn);
    wrap.appendChild(topBar);
    const allLabel = document.createElement('label');
    allLabel.style.cssText =
      'display:flex;align-items:center;gap:4px;margin-bottom:4px;font-weight:bold;border-bottom:1px solid #eee;padding-bottom:4px;';
    const allCb = document.createElement('input');
    allCb.type = 'checkbox';
    allLabel.appendChild(allCb);
    const allSpan = document.createElement('span');
    allSpan.textContent = 'Tümü';
    allLabel.appendChild(allSpan);
    wrap.appendChild(allLabel);
    const items = document.createElement('div');
    wrap.appendChild(items);
    const moreWrap = document.createElement('div');
    moreWrap.style.cssText = 'margin-top:6px;';
    wrap.appendChild(moreWrap);
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '×';
    closeBtn.style.cssText =
      'position:absolute;right:4px;top:2px;cursor:pointer;font-weight:bold;';
    closeBtn.onclick = () => (wrap.style.display = 'none');
    wrap.appendChild(closeBtn);
    function syncAll() {
      if (vf.mode === 'include')
        allCb.checked =
          vf.selected && vf.selected.size === vf.all.size && vf.all.size > 0;
      else
        allCb.checked =
          vf.selected && vf.selected.size === vf.all.size && vf.all.size > 0;
    }
    allCb.onchange = () => {
      if (!vf.selected)
        vf.selected = vf.mode === 'include' ? new Set(vf.all) : new Set();
      if (allCb.checked) {
        vf.selected = new Set(vf.all);
      } else {
        vf.selected.clear();
      }
      applyFilters(table);
      renderItems();
    };
    function renderItems() {
      const q = search.value.trim().toLowerCase();
      items.innerHTML = '';
      const data = Array.from(vf.all.values()).sort((a, b) =>
        a.localeCompare(b)
      );
      const filtered = q
        ? data.filter((v) => v.toLowerCase().includes(q))
        : data;
      if (!vf.selected)
        vf.selected = vf.mode === 'include' ? new Set(vf.all) : new Set();
      filtered.forEach((val) => {
        const lab = document.createElement('label');
        lab.style.cssText =
          'display:flex;align-items:center;gap:4px;padding:2px 0;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = vf.selected.has(val);
        cb.onchange = () => {
          if (cb.checked) vf.selected.add(val);
          else vf.selected.delete(val);
          syncAll();
          applyFilters(table);
        };
        const sp = document.createElement('span');
        sp.textContent = val;
        lab.appendChild(cb);
        lab.appendChild(sp);
        items.appendChild(lab);
      });
      syncAll();
    }
    search.oninput = renderItems;
    function addValues(newVals) {
      const hadAll = vf.selected && vf.selected.size === vf.all.size;
      newVals.forEach((v) => {
        if (!vf.all.has(v)) vf.all.add(v);
      });
      if (!vf.selected) {
        vf.selected = vf.mode === 'include' ? new Set(vf.all) : new Set();
      }
      if (hadAll) newVals.forEach((v) => vf.selected.add(v));
    }
    if (!vf._builder) vf._builder = incrementalDistinctBuilder(table, col);
    function loadInitial() {
      const { done } = vf._builder.next(400);
      addValues(vf._builder.getData().map((d) => d.value));
      renderItems();
      if (!done) showMore();
      else moreWrap.textContent = '';
    }
    function showMore() {
      moreWrap.innerHTML = '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Daha Fazla Yükle';
      btn.style.cssText =
        'padding:3px 6px;font-size:11px;cursor:pointer;border:1px solid #bbb;background:#f2f2f2;';
      btn.onclick = () => {
        btn.disabled = true;
        btn.textContent = 'Yükleniyor...';
        setTimeout(() => {
          const { done } = vf._builder.next(800);
          addValues(vf._builder.getData().map((d) => d.value));
          renderItems();
          if (done) moreWrap.textContent = 'Tümü yüklendi';
          else showMore();
        }, 10);
      };
      moreWrap.appendChild(btn);
    }
    loadInitial();
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(wrap);
    input._ehValueDD = wrap;
    document.addEventListener(
      'mousedown',
      function onDoc(e) {
        if (
          !wrap.contains(e.target) &&
          e.target !== input &&
          e.target !== input._ehValueBtn
        ) {
          wrap.style.display = 'none';
          document.removeEventListener('mousedown', onDoc);
        }
      },
      { capture: true }
    );
  }

  // CREATE FILTER ROW
  function createFilterRow(table) {
    const header = table.rows[0];
    if (!header) return;
    const existing = table.querySelector('.table-filter-row');
    if (existing) existing.remove();
    const filterRow = table.insertRow(1);
    filterRow.className = 'table-filter-row';
    const state = getTableState(table);
    for (let i = 0; i < header.cells.length; i++) {
      const td = filterRow.insertCell();
      td.style.position = 'relative';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = i === 0 ? '🔍 Filtre (>,<,=,!=,..,; )' : 'Filtre';
      input.style.cssText =
        'width:100%;box-sizing:border-box;padding:2px 18px 2px 4px;font-size:11px;';
      input.value = state.cols.get(i)?.raw || '';
      input.addEventListener('input', () => {
        const parsed = parseFilterInput(input.value);
        if (parsed) state.cols.set(i, parsed);
        else state.cols.delete(i);
        applyFilters(table);
      });
      td.appendChild(input);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '⋯';
      btn.title = 'Değer listesi';
      btn.style.cssText =
        'position:absolute;right:1px;top:1px;height:18px;width:16px;padding:0;border:1px solid #ccc;background:#fafafa;cursor:pointer;font-size:11px;line-height:16px;';
      btn.onclick = (e) => {
        e.preventDefault();
        ensureValueDropdown(input, table, i);
      };
      input._ehValueBtn = btn;
      td.appendChild(btn);
      input.addEventListener('focus', () => {
        if (detectColumnIsDate(table, i)) buildQuickDatePanel(input, table, i);
      });
    }
  }

  // APPLY FILTERS
  function applyFilters(table) {
    const state = getTableState(table);
    const filterRow = table.querySelector('.table-filter-row');
    const hasText = state.cols.size > 0 && filterRow;
    const hasValue = state.valueFilters.size > 0;
    for (let r = filterRow ? 2 : 1; r < table.rows.length; r++) {
      const row = table.rows[r];
      if (!row) continue;
      if (
        row.classList.contains('table-total-row') ||
        row.classList.contains('table-grand-total-row')
      )
        continue;
      let vis = true;
      if (hasText) {
        for (const [col, def] of state.cols.entries()) {
          const cell = row.cells[col];
          const txt = cell ? cell.textContent : '';
          if (!valueMatchesExpressions(txt, def)) {
            vis = false;
            break;
          }
        }
      }
      if (vis && hasValue) {
        for (const [col, vf] of state.valueFilters.entries()) {
          const cell = row.cells[col];
          const txt = (cell ? cell.textContent : '').trim();
          const sel = vf.selected || new Set();
          if (vf.mode === 'include') {
            if (sel.size === 0) {
              vis = false;
              break;
            }
            if (txt) {
              if (!sel.has(txt)) {
                vis = false;
                break;
              }
            } else if (!sel.has('')) {
              vis = false;
              break;
            }
          } else {
            if (sel.size > 0) {
              if ((txt && sel.has(txt)) || (!txt && sel.has(''))) {
                vis = false;
                break;
              }
            }
          }
        }
      }
      row.style.display = vis ? '' : 'none';
      if (!vis && row.querySelector('.eh-selected')) {
        Array.from(row.querySelectorAll('.eh-selected')).forEach((c) => {
          c.classList.remove('eh-selected');
          c._ehSel = false;
        });
      }
    }
    window.ExcelHelperNS &&
      window.ExcelHelperNS.updateAllTableTotals &&
      window.ExcelHelperNS.updateAllTableTotals();
    updateFilterIndicators(table);
    window.ExcelHelperNS &&
      window.ExcelHelperNS.updateToolbarStats &&
      window.ExcelHelperNS.updateToolbarStats();
  }
  // Aktif filtre göstergesi
  function ensureFilterIndicatorStyle() {
    if (document.getElementById('eh-filter-indicator-style')) return;
    const st = document.createElement('style');
    st.id = 'eh-filter-indicator-style';
    st.textContent = `.eh-filter-active{box-shadow:inset 0 -2px 0 #ff9800;background:#fff7e6 !important;}
  .table-filter-row input.eh-filter-active{background:#fff3d9; border-color:#ffb347;}`;
    document.head.appendChild(st);
  }
  function updateFilterIndicators(table) {
    ensureFilterIndicatorStyle();
    const state = getTableState(table);
    const header = table.rows[0];
    if (!header) return;
    const filterRow = table.querySelector('.table-filter-row');
    for (let i = 0; i < header.cells.length; i++) {
      const th = header.cells[i];
      th.classList.remove('eh-filter-active');
      if (filterRow) {
        const inp = filterRow.cells[i]?.querySelector('input');
        if (inp) inp.classList.remove('eh-filter-active');
      }
    }
    const activeCols = new Set();
    state.cols.forEach((def, col) => {
      if (def && def.raw && def.raw.trim() !== '') activeCols.add(col);
    });
    state.valueFilters.forEach((vf, col) => {
      if (!vf) return;
      const allSize = vf.all ? vf.all.size : 0;
      const sel = vf.selected;
      if (vf.mode === 'include') {
        if (sel && sel.size > 0 && sel.size !== allSize) activeCols.add(col);
      } else {
        if (sel && sel.size > 0) activeCols.add(col);
      }
    });
    activeCols.forEach((col) => {
      const th = header.cells[col];
      if (th) th.classList.add('eh-filter-active');
      if (filterRow) {
        const inp = filterRow.cells[col]?.querySelector('input');
        if (inp) inp.classList.add('eh-filter-active');
      }
    });
    if (window.ExcelHelperNS && window.ExcelHelperNS.updateSettings) {
      window.ExcelHelperNS.updateSettings({
        lastFilterActiveCount: activeCols.size,
      });
    }
  }
  // TOGGLE FILTERS
  function toggleFilters() {
    document.querySelectorAll('table').forEach((table) => {
      const state = getTableState(table);
      const has = table.querySelector('.table-filter-row');
      if (has) {
        has.remove();
        state.cols.clear();
        state.valueFilters.clear();
        for (let r = 1; r < table.rows.length; r++) {
          const row = table.rows[r];
          if (row) row.style.display = '';
        } // temizle highlight
        const header = table.rows[0];
        if (header)
          for (let i = 0; i < header.cells.length; i++)
            header.cells[i].classList.remove('eh-filter-active');
      } else {
        createFilterRow(table);
      }
      applyFilters(table);
    });
  }

  // CLEAR ALL FILTERS
  function clearAllFilters() {
    document.querySelectorAll('table').forEach((table) => {
      const state = getTableState(table);
      if (!state) return;
      state.cols.clear();
      state.valueFilters.clear();
      const fr = table.querySelector('.table-filter-row');
      if (fr) {
        Array.from(fr.querySelectorAll('input[type="text"]')).forEach(
          (inp) => (inp.value = '')
        );
      }
      applyFilters(table);
    });
  }

  // EXPORT
  window.ExcelHelperNS = window.ExcelHelperNS || {};
  Object.assign(window.ExcelHelperNS, {
    toggleFilters,
    applyFilters,
    clearAllFilters,
  });
})();

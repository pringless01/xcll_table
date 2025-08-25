// reco/apply-bind.js - gelişmiş apply tetikleyici (HKYY port)
(function () {
  const rootNS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  rootNS.reco = rootNS.reco || {};
  const R = rootNS.reco;
  if (R._applyBindEnhanced) return;
  R._applyBindEnhanced = true;
  const { showToast } = R;
  // Bu dosya artık sadece temel apply tetikleme mantığını içerir.
  function init() {
    if (!/https:\/\/backoffice\.betcoapps\.com\//i.test(location.href)) return;
    window.addEventListener('keydown', (e)=>{
      if (e.altKey && e.shiftKey && e.code==='KeyA') { e.preventDefault(); fireApply('Alt+Shift+A'); }
    }, true);
  }
  function fireApply(source) {
    const btn = findApplyButton();
    if (btn) {
      flash(btn);
      try {
        btn.focus({ preventScroll: true });
      } catch {}
      setTimeout(() => btn.click(), 0);
      showToast && showToast('Apply tetiklendi (' + source + ')');
      return;
    }
    const form = findApplyForm();
    if (form) {
      flash(form);
      try {
        form.dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        );
      } catch {}
      showToast && showToast('Apply (form submit) tetiklendi (' + source + ')');
      return;
    }
    showToast && showToast('Apply butonu/formu bulunamadı');
  }
  function findApplyButton() {
    const selector = [
      'button[ng-click*="apply"]',
      'button[ng-submit*="apply"]',
      'button.bc-apply',
      'button[title*="Apply" i]',
      'button[data-action="apply"]',
    ].join(',');
    const strict = document.querySelector(selector);
    if (strict) return strict;
    const candidates = document.querySelectorAll(
      'button, input[type="submit"], a[role="button"], div[role="button"]'
    );
    const re = /\bapply\b/i;
    for (const el of candidates) {
      if (el.tagName === 'INPUT') {
        const v = (el.getAttribute('value') || '').trim();
        if (re.test(v)) return el;
      }
      const txt = (el.textContent || '').trim();
      if (re.test(txt)) return el;
      const ngc =
        el.getAttribute &&
        (el.getAttribute('ng-click') || el.getAttribute('data-ng-click') || '');
      if (/\bapply\s*\(/i.test(ngc)) return el;
    }
    return null;
  }
  function findApplyForm() {
    const specific = document.querySelector(
      'form[ng-submit*="apply"], form[name="CasionBetForm"]'
    );
    if (specific) return specific;
    const forms = document.querySelectorAll('form');
    const re = /\bapply\b/i;
    for (const f of forms) {
      const btn = f.querySelector(
        'button[type="submit"], input[type="submit"]'
      );
      if (!btn) continue;
      const label = (
        btn.tagName === 'INPUT'
          ? btn.getAttribute('value') || ''
          : btn.textContent || ''
      ).trim();
      if (re.test(label)) return f;
    }
    return null;
  }
  function flash(el) {
    try {
      const prev = el.style.boxShadow;
      el.style.transition = 'box-shadow .2s ease';
      el.style.boxShadow = '0 0 0 2px #1f6feb, 0 0 12px rgba(31,110,235,.6)';
      setTimeout(() => {
        el.style.boxShadow = prev || '';
      }, 400);
    } catch {}
  }
  R.triggerApply = fireApply; // dış modüller için
  R.initApplyBind = init; // orijinal isim korunur
  init();
})();

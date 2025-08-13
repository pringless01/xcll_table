(function waitForCore() {
  if (!window.HKYY) return setTimeout(waitForCore, 10);
  const { showToast } = window.HKYY;

  const AUX_BUTTONS = new Set([3, 4]);
  if (!/https:\/\/backoffice\.betcoapps\.com\//i.test(location.href)) return;

  window.addEventListener("pointerdown", onAuxTrigger, true);
  window.addEventListener("mousedown",   onAuxTrigger, true);
  window.addEventListener("auxclick",    onAuxTrigger, true);
  window.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyA") {
      e.preventDefault(); fireApply("Alt+Shift+A");
    }
  }, true);

  function onAuxTrigger(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    if (!AUX_BUTTONS.has(e.button)) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (path.some(el => el instanceof Element && el.id === "hkyy-root")) return;
    e.preventDefault(); e.stopPropagation();
    fireApply(`Mouse button ${e.button}`);
  }

  function fireApply(source) {
    const btn = findApplyButton();
    if (btn) {
      flash(btn); try { btn.focus({ preventScroll: true }); } catch {}
      setTimeout(() => btn.click(), 0);
      showToast(`Apply tetiklendi (${source})`);
      return;
    }
    const form = findApplyForm();
    if (form) {
      flash(form);
      try { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); } catch {}
      showToast(`Apply (form submit) tetiklendi (${source})`);
      return;
    }
    showToast("Apply butonu/formu bulunamadı");
  }

  function findApplyButton() {
    const strict = document.querySelector([
      'button[ng-click*="apply"]',
      'button[ng-submit*="apply"]',
      'button.bc-apply',
      'button[title*="Apply" i]',
      'button[data-action="apply"]'
    ].join(','));
    if (strict) return strict;

    const candidates = document.querySelectorAll('button, input[type="submit"], a[role="button"], div[role="button"]');
    const re = /\bapply\b/i;
    for (const el of candidates) {
      if (el.tagName === "INPUT") {
        const v = (el.getAttribute("value") || "").trim();
        if (re.test(v)) return el;
      }
      const txt = (el.textContent || "").trim();
      if (re.test(txt)) return el;
      const ngc = el.getAttribute && (el.getAttribute("ng-click") || el.getAttribute("data-ng-click") || "");
      if (/\bapply\s*\(/i.test(ngc)) return el;
    }
    return null;
  }
  function findApplyForm() {
    const specific = document.querySelector('form[ng-submit*="apply"], form[name="CasionBetForm"]');
    if (specific) return specific;
    const forms = document.querySelectorAll('form');
    const re = /\bapply\b/i;
    for (const f of forms) {
      const btn = f.querySelector('button[type="submit"], input[type="submit"]');
      if (!btn) continue;
      const label = (btn.tagName === "INPUT" ? (btn.getAttribute("value") || "") : (btn.textContent || "")).trim();
      if (re.test(label)) return f;
    }
    return null;
  }
  function flash(el) {
    try {
      const prev = el.style.boxShadow;
      el.style.transition = "box-shadow .2s ease";
      el.style.boxShadow = "0 0 0 2px #1f6feb, 0 0 12px rgba(31,110,235,.6)";
      setTimeout(() => { el.style.boxShadow = prev || ""; }, 400);
    } catch {}
  }
})();

(function () {
  function whenCore(cb){ if (window.HKYY) return cb(); setTimeout(() => whenCore(cb), 10); }
  whenCore(() => {
    const { state, refreshClipboardCache, loadInitialState, applyToolbarPos } = window.HKYY;

    loadInitialState().then(() => {
      if (state.toolbarPos) applyToolbarPos(state.toolbarPos);
    });

    window.addEventListener("focus", refreshClipboardCache);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshClipboardCache(); });

    // UI kökünü koru ve hedef hareket ederse yeniden konumla
    const obs = new MutationObserver(() => {
      const root = document.getElementById("hkyy-root");
      if (root && root.parentElement !== document.documentElement) {
        document.documentElement.appendChild(root);
      }
      if (state.currentPasteTarget) {
        const ev = new Event("resize");
        window.dispatchEvent(ev);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  });
})();

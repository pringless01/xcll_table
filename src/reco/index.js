// reco/index.js - orchestrate reco feature init
(function () {
  const NS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  NS.reco = NS.reco || {};
  if (NS.reco._booted) return;
  NS.reco._booted = true;
  // ensure style + toast first
  try {
    NS.reco.showToast =
      NS.reco.showToast ||
      function (msg) {
        console.log('[reco toast]', msg);
      };
  } catch {}
  // init sequence (lazy per feature via shortcuts)
  NS.reco.bootstrap = function () {
    try {
      NS.reco.initCopyBubble && NS.reco.initCopyBubble();
    } catch (e) {
      console.warn('copyBubble init fail', e);
    }
    try {
      NS.reco.initPasteBubble && NS.reco.initPasteBubble();
    } catch (e) {
      console.warn('pasteBubble init fail', e);
    }
    try {
      NS.reco.initSearchBar && NS.reco.initSearchBar();
    } catch (e) {
      console.warn('searchBar init fail', e);
    }
    try {
      NS.reco.initApplyBind && NS.reco.initApplyBind();
    } catch (e) {
      console.warn('applyBind init fail', e);
    }
  };
  // Auto-init minimal essentials
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => NS.reco.bootstrap());
  else NS.reco.bootstrap();
})();

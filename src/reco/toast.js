// reco/toast.js
(function () {
  const NS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  NS.reco = NS.reco || {};
  if (NS.reco.showToast) return;
  let toast;
  NS.reco.showToast = function (msg, timeout = 1600) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'hkyy-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(NS.reco._toastTimer);
    NS.reco._toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, timeout);
  };
})();

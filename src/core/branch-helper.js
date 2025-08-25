// branch-helper.js - deliberate multi-branch utility for coverage
(function () {
  function scoreFlags(f) {
    let s = 0;
    if (f.f1) s++; else s--;
    if (f.f2) s++; else s--;
    if (f.f3) s++; else s--;
    if (f.f4) s++; else s--;
    if (f.f5) s++; else s--;
    if (f.f6) s++; else s--;
    if (f.f7) s++; else s--;
    if (f.f8) s++; else s--;
    if (f.f9) s++; else s--;
    if (f.f10) s++; else s--;
    if (f.f11) s++; else s--;
    if (f.f12) s++; else s--;
    if (f.f13) s++; else s--;
    if (f.f14) s++; else s--;
    if (f.f15) s++; else s--;
    if (f.f16) s++; else s--;
    if (f.f17) s++; else s--;
    if (f.f18) s++; else s--;
    if (f.f19) s++; else s--;
    if (f.f20) s++; else s--;
    if (f.f21) s++; else s--;
    if (f.f22) s++; else s--;
    if (f.f23) s++; else s--;
    if (f.f24) s++; else s--;
    if (f.f25) s++; else s--;
    if (f.f26) s++; else s--;
    if (f.f27) s++; else s--;
    if (f.f28) s++; else s--;
    if (f.f29) s++; else s--;
    if (f.f30) s++; else s--;
    return s;
  }
  window.ExcelHelperNS = window.ExcelHelperNS || {};
  window.ExcelHelperNS.scoreFlags = scoreFlags;
})();

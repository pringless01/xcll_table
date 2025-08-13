// i18n.js - chrome.i18n köprüsü + küçük fallback
(function () {
  const NS = (window.ExcelHelperNS = window.ExcelHelperNS || {});
  function t(key, subs) {
    try {
      if (chrome && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
        const m = chrome.i18n.getMessage(key, subs || []);
        if (m) return m;
      }
    } catch {}
    // Basit TR fallbackları; kritikler
    const F = {
      prev_tab: 'Önceki sekme',
      next_tab: 'Sonraki sekme',
      search_last_copied: 'Ara (Son Kopyalanan)',
      copy_id: 'ID kopyala',
      close_tab: 'Sekmeyi kapat',
      selection_mode: 'Seçim modu',
      filter_mode: 'Filtre modu',
      export_csv: 'CSV dışa aktar',
      export_excel: 'Excel dışa aktar',
      drag_handle_label: 'Sürükle',
      copy_bubble_label: 'Kopyala',
      selection_none: 'Seçim yok',
      copied: 'Kopyalandı',
      copy_denied: 'Kopyalama reddedildi',
      pasted: 'Yapıştırıldı',
      cleared_and_pasted: 'Boşaltıldı & Yapıştırıldı',
      please_select_first: 'Lütfen önce seçim yapın',
      data_none: 'Veri yok',
      excel_export_failed: 'Excel dışa aktarım başarısız',
      id_copied: 'ID kopyalandı',
      id_copy_failed: 'ID kopyalanamadı',
      id_not_found: 'ID bulunamadı',
  search_will: 'Aranacak: $1',
      clipboard_empty: 'Kopyalanan yok',
      totals_selection_label: 'SEÇİM',
      totals_grand_label: 'GENEL',
      totals_grand_button: 'GENEL TOPLAM',
      too_big_cancelled: 'Tablo çok büyük, genel toplam iptal (limit)'
    };
    const msg = F[key] || '';
    if (!subs || !subs.length) return msg;
    return subs.reduce((s, v, i) => s.replace(new RegExp('\\$' + (i + 1), 'g'), String(v)), msg);
  }
  NS.t = t;
})();

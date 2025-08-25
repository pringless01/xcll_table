# Toolbar Birleştirme Notları

Bu doküman, eski “Excel Helper” paneli ve siyah-mavi arama/sekme barını tek bir ikon-only Unified Toolbar altında birleştirme değişikliklerini özetler.

## Mevcut dosyalar (ilgili)
- manifest.json: İçerik scriptleri (ui/toolbar.js, reco/search-bar.js dahil)
- src/ui/toolbar.js: Eski “Excel Helper” paneli → Unified Toolbar ile değiştirildi (Shadow DOM, ikon-only)
- src/reco/search-bar.js: Arama, sekme geçişi, ID kopyalama vb. mantıklar (UI’si devre dışı)
- src/export/excel-exporter.js: CSV/XLSX dışa aktarım mantığı
- src/ui/filters.js: Filtre modunun iş mantığı

## Kaldırılanlar / Devre Dışı
- Eski “Excel Helper” panelinin metinli arayüzü (başlık, buton metinleri, Temizle vb.)
- Reco arama barının UI oluşturması (window.__EH_NO_SEARCHBAR_UI bayrağı ile devre dışı)

## Yeni Bileşenler
- Unified Toolbar (src/ui/toolbar.js):
  - Shadow DOM ile izole stil
  - İkon-only butonlar (Lucide benzeri inline SVG)
  - İşlevler: sekme geri/ileri, arama tetikleme, ID kopyala, sekmeyi kapat, seçim modu toggle, filtre modu toggle, CSV/Excel dışa aktarım
  - Klavye kısayolları: Ctrl+F (arama), Ctrl+Shift+S (seçim), Ctrl+Shift+F (filtre), Ctrl+Shift+C (CSV), Ctrl+Shift+E (Excel)

## Stil
- Arka plan #0E0F13
- 32px kare buton, 8px aralık, hover ve active durumları
- Kapat (x) ikonunda #E5484D

## Mount Guard ve Persist
- Host: #excel-helper-toolbar
- Tekil mount, mevcut konumu settings.toolbarPosition ile korunur
- Görünürlük settings.toolbarVisible ile yönetilir

## Notlar
- Export fonksiyonları mevcut excel-exporter.js içinden kullanılır.
- Reco mantığı (search, toast) gerektiğinde çağrılır, UI enjekte edilmez.

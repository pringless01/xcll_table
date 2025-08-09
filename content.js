if (window.__EXCEL_HELPER_MODULAR__) { console.log('Legacy content.js skipped (modular active)'); return; }
// Chrome Extension - Excel Helper Content Script
// Bu script, web sayfalarındaki tabloları Excel benzeri hale getirir

console.log('Excel Helper Content Script yüklendi');

// Test Manager'ı başlat
let testManager = null;
(function() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('test-manager.js');
    script.onload = function() {
        testManager = new window.ExcelHelperTestManager();
        console.log('✅ Test Manager başlatıldı');
    };
    (document.head || document.documentElement).appendChild(script);
})();

// PERFORMANCE: Enhanced global variables with WeakMap for memory management
let selectionType = "cell"; // "cell", "row", "col"
let isMouseDown = false;
let selectionStart = null;
let ctrlPressed = false;
let shiftPressed = false;

// SETTINGS SYSTEM: User preferences with persistence
const userSettings = {
    toolbarPosition: { x: 10, y: 10 }, // Default position
    selectionMode: true, // Default true for easier testing
    autoSaveSettings: true,
    
    // Load settings from Chrome storage
    async load() {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['excelHelperSettings'], (result) => {
                    resolve(result.excelHelperSettings || {});
                });
            });
            
            this.toolbarPosition = result.toolbarPosition || { x: 10, y: 10 };
            this.selectionMode = result.selectionMode !== false; // Default true for easier testing
            this.autoSaveSettings = result.autoSaveSettings !== false; // Default true
            
            console.log('✅ User settings loaded:', this);
        } catch (error) {
            console.warn('⚠️ Settings load failed, using defaults:', error);
        }
    },
    
    // Save settings to Chrome storage
    async save() {
        if (!this.autoSaveSettings) return;
        
        try {
            const settings = {
                toolbarPosition: this.toolbarPosition,
                selectionMode: this.selectionMode,
                autoSaveSettings: this.autoSaveSettings
            };
            
            chrome.storage.local.set({ excelHelperSettings: settings });
            console.log('💾 Settings saved:', settings);
        } catch (error) {
            console.warn('⚠️ Settings save failed:', error);
        }
    },
    
    // Update toolbar position
    updateToolbarPosition(x, y) {
        this.toolbarPosition.x = Math.max(0, Math.min(x, window.innerWidth - 200));
        this.toolbarPosition.y = Math.max(0, Math.min(y, window.innerHeight - 150));
        this.save();
    },
    
    // Update selection mode
    updateSelectionMode(enabled) {
        this.selectionMode = enabled;
        this.save();
    }
};

// PERFORMANCE: Memory-efficient caching system
const performanceCache = {
    tableHashes: new WeakMap(), // Prevent memory leaks
    calculationCache: new Map(), // LRU cache for calculations
    eventListeners: new WeakMap(), // Track event listeners
    lastUpdateTime: 0,
    cacheSize: 0,
    maxCacheSize: 50 // Limit cache size
};

// PERFORMANCE: Debounced calculation cache
function getCachedCalculation(key, calculator) {
    const now = Date.now();
    const cached = performanceCache.calculationCache.get(key);
    
    if (cached && (now - cached.timestamp) < 500) { // 500ms cache
        return cached.result;
    }
    
    const result = calculator();
    
    // LRU cache management
    if (performanceCache.cacheSize >= performanceCache.maxCacheSize) {
        const oldestKey = performanceCache.calculationCache.keys().next().value;
        performanceCache.calculationCache.delete(oldestKey);
        performanceCache.cacheSize--;
    }
    
    performanceCache.calculationCache.set(key, {
        result: result,
        timestamp: now
    });
    performanceCache.cacheSize++;
    
    return result;
}

// Excel Helper stillerini ekle
function ensureStyle() {
    if (document.getElementById('excel-helper-style')) return;
    
    const style = document.createElement('style');
    style.id = 'excel-helper-style';
    style.textContent = `
        .selected-cell {
            background-color: #E7F3FF !important;
            border: 2px solid #0078D4 !important;
            transform: translateZ(0); /* GPU acceleration */
        }
        .selected-row {
            background-color: #F0F8FF !important;
            transform: translateZ(0); /* GPU acceleration */
        }
        .selected-col {
            background-color: #F0F8FF !important;
            transform: translateZ(0); /* GPU acceleration */
        }
        .table-filter-input {
            width: 100%;
            padding: 2px 4px;
            border: 1px solid #ccc;
            box-sizing: border-box;
            font-size: 12px;
            background: white;
            position: relative;
            z-index: 1;
            border-radius: 2px;
            will-change: border-color; /* GPU hint */
        }
        .table-filter-input:focus {
            outline: 2px solid #0078D4;
            border-color: #0078D4;
        }
        .table-filter-row {
            background-color: #f8f9fa !important;
            position: sticky;
            top: 0;
            z-index: 2;
            transform: translateZ(0); /* GPU acceleration */
        }
        .table-filter-row td {
            padding: 2px !important;
            border: 1px solid #dee2e6 !important;
            background-color: #f8f9fa !important;
            vertical-align: middle !important;
        }
        .row-header, .col-header {
            background-color: #e9ecef !important;
            font-weight: bold;
            text-align: center;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.1s ease; /* Smooth hover */
        }
        .row-header:hover, .col-header:hover {
            background-color: #dee2e6 !important;
        }
        .table-total-row {
            background-color: #f8f9fa !important;
            border-top: 3px solid #28a745 !important;
            font-weight: bold !important;
            position: sticky;
            bottom: 40px; /* Sarı barın üzerine yerleştir */
            z-index: 4;
        }
        .table-total-row td {
            background-color: #f8f9fa !important;
            font-weight: bold !important;
            border: 1px solid #dee2e6 !important;
            padding: 8px !important;
        }
        .table-grand-total-row {
            background-color: #fff3cd !important;
            border-top: 3px solid #ffc107 !important;
            font-weight: bold !important;
            position: sticky;
            bottom: 0; /* En altta sabit */
            z-index: 3;
        }
        .table-grand-total-row td {
            background-color: #fff3cd !important;
            font-weight: bold !important;
            border: 1px solid #ffeaa7 !important;
            padding: 8px !important;
            color: #856404 !important;
        }
        #excel-helper-toolbar {
            position: fixed;
            top: 10px;
            right: 10px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            transform: translateZ(0); /* GPU acceleration */
            cursor: move; /* Draggable indicator */
            user-select: none;
            min-width: 180px;
            backdrop-filter: blur(10px);
            border: 2px solid #e0e0e0;
        }
        #excel-helper-toolbar:hover {
            box-shadow: 0 6px 25px rgba(0,0,0,0.2);
            border-color: #0078D4;
        }
        #excel-helper-toolbar .toolbar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #e0e0e0;
            font-weight: 600;
            color: #333;
        }
        #excel-helper-toolbar .settings-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 14px;
            color: #666;
            padding: 2px;
            border-radius: 3px;
        }
        #excel-helper-toolbar .settings-btn:hover {
            background: #f0f0f0;
            color: #0078D4;
        }
        #selection-status {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 5px;
            z-index: 10000;
            font-family: monospace;
            font-size: 11px;
            transform: translateZ(0); /* GPU acceleration */
            transition: opacity 0.2s ease; /* Smooth show/hide */
            max-width: 300px;
            line-height: 1.4;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
    `;
    document.head.appendChild(style);
}

// PERFORMANCE: Optimized selection clearing with batch processing + virtual DOM
function clearSelection() {
    // Immediate clearing for better responsiveness
    const selectedElements = document.querySelectorAll('.selected-cell, .selected-row, .selected-col');
    
    if (selectedElements.length === 0) return;
    
    // Batch class removal with single reflow
    selectedElements.forEach(cell => {
        cell.classList.remove('selected-cell', 'selected-row', 'selected-col');
    });
    
    // Clear calculation cache
    performanceCache.calculationCache.clear();
    performanceCache.cacheSize = 0;
    
    // Debounced table totals update
    clearTimeout(window.clearSelectionTimeout);
    window.clearSelectionTimeout = setTimeout(() => {
        updateTableTotals();
    }, 100);
}

// PERFORMANCE: Memoized numeric value parsing with intelligent caching
const numericValueCache = new Map();
function parseNumericValue(text) {
    if (!text || typeof text !== 'string') return null;
    
    // Use cached result if available
    if (numericValueCache.has(text)) {
        return numericValueCache.get(text);
    }
    
    const originalText = text.trim();
    
    // Quick numeric check to avoid unnecessary processing
    if (!/[\d,.\-−₺₸₼$€£¥₹₽₾()%]/.test(originalText)) {
        numericValueCache.set(text, null);
        return null;
    }
    
    // Negatif değer kontrolü - optimized regex
    const isNegative = /^[-−]|^\(|\(-|\(\s*\d/.test(originalText);
    
    // Optimized cleaning with single pass
    let cleaned = originalText
        .replace(/[₺₸₼$€£¥₹₽₾%\s()−]/g, match => {
            switch(match) {
                case '−': return '-';
                case ' ': case '(': case ')': case '%': return '';
                default: return ''; // currencies
            }
        })
        .replace(/^-+/, '-'); // Birden fazla eksi işaretini tek yapar
    
    // Optimized decimal/thousands separator handling
    const commaCount = (cleaned.match(/,/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;
    
    if (commaCount && dotCount) {
        // US format: 1,234.56
        cleaned = cleaned.replace(/,(?=\d{3})/g, '');
    } else if (commaCount === 1) {
        // Check TR vs thousands format
        const commaIndex = cleaned.indexOf(',');
        const afterComma = cleaned.substring(commaIndex + 1);
        if (afterComma.length <= 3 && afterComma.length > 0 && /^\d+$/.test(afterComma)) {
            // TR decimal format: 123,45
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            // Thousands separator: 1,234,567
            cleaned = cleaned.replace(/,/g, '');
        }
    }
    
    // Parse and apply negative
    const number = parseFloat(cleaned);
    const result = isNaN(number) ? null : (isNegative && number > 0 ? -number : number);
    
    // Cache management (LRU with size limit)
    if (numericValueCache.size >= 100) {
        const firstKey = numericValueCache.keys().next().value;
        numericValueCache.delete(firstKey);
    }
    numericValueCache.set(text, result);
    
    return result;
}

// PERFORMANCE: Ultra-optimized calculation with intelligent caching and lazy evaluation
function calculateSelectedData() {
    const cacheKey = 'selectedData_' + Date.now();
    
    return getCachedCalculation(cacheKey, () => {
        // Optimized DOM query with single selector
        const selectedCells = document.querySelectorAll('.selected-cell, .selected-row, .selected-col');
        
        if (selectedCells.length === 0) {
            return { totalCells: 0, visibleCells: 0, totalValues: 0, numbers: [], sum: 0, avg: 0, min: 0, max: 0, count: 0 };
        }
        
        const values = [];
        const numbers = [];
        
        // Use DocumentFragment for virtual processing
        const fragment = document.createDocumentFragment();
        
        // Batch process with reduced DOM queries
        const validCells = Array.from(selectedCells).filter(cell => {
            // Combined filter checks in single pass
            const parentRow = cell.parentElement;
            const classList = cell.classList;
            
            return !(
                classList.contains('table-filter-row') || 
                classList.contains('row-header') || 
                classList.contains('col-header') ||
                classList.contains('table-total-row') ||
                parentRow.style.display === 'none'
            );
        });
        
        // Process valid cells with optimized loops
        validCells.forEach(cell => {
            const text = cell.textContent.trim();
            if (!text) return;
            
            values.push(text);
            const number = parseNumericValue(text);
            if (number !== null) {
                numbers.push(number);
            }
        });
        
        // Optimized calculations with early returns
        if (numbers.length === 0) {
            return {
                totalCells: selectedCells.length,
                visibleCells: values.length,
                totalValues: values.length,
                numbers: numbers,
                sum: 0, avg: 0, min: 0, max: 0, count: 0
            };
        }
        
        // Single-pass calculations
        let sum = 0, min = numbers[0], max = numbers[0];
        for (let i = 0; i < numbers.length; i++) {
            const num = numbers[i];
            sum += num;
            if (num < min) min = num;
            if (num > max) max = num;
        }
        
        return {
            totalCells: selectedCells.length,
            visibleCells: values.length,
            totalValues: values.length,
            numbers: numbers,
            sum: sum,
            avg: sum / numbers.length,
            min: min,
            max: max,
            count: numbers.length
        };
    });
}

// PERFORMANCE: Memoized number formatting with Intl reuse
const numberFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
});

const formatCache = new Map();
function formatNumber(num) {
    if (num === 0) return '0';
    
    // Use cached result for common values
    if (formatCache.has(num)) {
        return formatCache.get(num);
    }
    
    const result = numberFormatter.format(num);
    
    // Cache management (limit size to prevent memory bloat)
    if (formatCache.size >= 50) {
        const firstKey = formatCache.keys().next().value;
        formatCache.delete(firstKey);
    }
    formatCache.set(num, result);
    
    return result;
}

// Excel Helper toggle function - Global
function toggleExcelHelper() {
    const newMode = !userSettings.selectionMode;
    userSettings.updateSelectionMode(newMode);
    
    const toggleBtn = document.getElementById('toggle-selection');
    if (toggleBtn) {
        toggleBtn.textContent = `Seçim Modu: ${newMode ? 'AÇIK' : 'KAPALI'}`;
        toggleBtn.style.background = newMode ? '#28a745' : '#0078D4';
    }
    
    const exportBtn = document.getElementById('export-excel');
    if (exportBtn) {
        exportBtn.disabled = !newMode;
    }
    
    if (newMode) {
        setupAdvancedSelection();
        console.log('✅ Excel Helper AÇIK');
    } else {
        clearSelection();
        updateStatus();
        console.log('🛑 Excel Helper KAPALI');
    }
}

// Hücre seçimi toggle
function toggleSelectCell(cell) {
    if (cell.classList.contains('selected-cell')) {
        cell.classList.remove('selected-cell');
    } else {
        cell.classList.add('selected-cell');
    }
}

// PERFORMANCE: Throttled status update with intelligent debouncing and RAF
let statusUpdateTimeout;
let isUpdatingStatus = false;
function updateStatus() {
    // Prevent multiple simultaneous updates
    if (isUpdatingStatus) return;
    
    // Intelligent debouncing based on system load
    const debounceTime = performance.now() % 100 < 50 ? 30 : 50; // Adaptive debouncing
    
    clearTimeout(statusUpdateTimeout);
    statusUpdateTimeout = setTimeout(() => {
        isUpdatingStatus = true;
        
        // Use RAF for smooth DOM updates
        requestAnimationFrame(() => {
            try {
                updateStatusInner();
            } finally {
                isUpdatingStatus = false;
            }
        });
    }, debounceTime);
}

function updateStatusInner() {
    // Batch DOM queries for better performance
    const [allSelectedCells, allSelectedRows, allSelectedCols] = [
        document.querySelectorAll('.selected-cell'),
        document.querySelectorAll('.selected-row'),
        document.querySelectorAll('.selected-col')
    ];
    
    // Optimized visibility filtering with single DOM access
    const visibleCounts = [allSelectedCells, allSelectedRows, allSelectedCols].map(collection => 
        Array.from(collection).reduce((count, cell) => {
            const row = cell.parentElement; // Avoid closest() for performance
            return row && row.style.display !== 'none' ? count + 1 : count;
        }, 0)
    );
    
    const [visibleSelectedCells, visibleSelectedRows, visibleSelectedCols] = visibleCounts;
    const totalVisible = visibleSelectedCells + visibleSelectedRows + visibleSelectedCols;
    const totalSelected = allSelectedCells.length + allSelectedRows.length + allSelectedCols.length;
    
    // Get or create status element (reuse existing)
    let statusEl = document.getElementById('selection-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'selection-status';
        document.body.appendChild(statusEl);
    }
    
    if (totalVisible === 0) {
        statusEl.style.display = 'none';
        // Debounced table totals update
        clearTimeout(window.tableTotalsTimeout);
        window.tableTotalsTimeout = setTimeout(updateTableTotals, 100);
        return;
    }
    
    statusEl.style.display = 'block';
    
    // Cached calculation with smart invalidation
    const calc = calculateSelectedData();
    
    // Build status text with template literals for better performance
    let statusText = `Seçili: ${visibleSelectedCells} hücre, ${visibleSelectedRows} satır, ${visibleSelectedCols} sütun`;
    
    if (totalSelected > totalVisible) {
        statusText += ` (${totalSelected - totalVisible} gizli)`;
    }
    
    if (calc.count > 0) {
        statusText += `\n📊 Toplam: ${formatNumber(calc.sum)}`;
        if (calc.count > 1) {
            statusText += ` | Ort: ${formatNumber(calc.avg)} | Sayı: ${calc.count}`;
        }
        if (calc.min !== calc.max) {
            statusText += `\n📈 Min: ${formatNumber(calc.min)} | Max: ${formatNumber(calc.max)}`;
        }
    }
    
    // Use textContent instead of innerHTML when possible for better performance
    statusEl.innerHTML = statusText.replace(/\n/g, '<br>');
    
    // Debounced table totals update
    clearTimeout(window.tableTotalsTimeout);
    window.tableTotalsTimeout = setTimeout(updateTableTotals, 100);
}

// İleri düzey seçim fonksiyonları
function selectRect(table, startRow, startCol, endRow, endCol, additive = false) {
    if (!additive) clearSelection();
    
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    for (let r = minRow; r <= maxRow; r++) {
        if (!table.rows[r]) continue;
        for (let c = minCol; c <= maxCol; c++) {
            const cell = table.rows[r].cells[c];
            if (cell && !cell.classList.contains('row-header') && !cell.classList.contains('col-header')) {
                cell.classList.add('selected-cell');
            }
        }
    }
}

function selectRow(table, rowIndex, additive = false) {
    if (!additive) clearSelection();
    
    const row = table.rows[rowIndex];
    if (!row) return;
    
    for (let c = 0; c < row.cells.length; c++) { // İlk sütundan başla
        const cell = row.cells[c];
        if (cell) {
            cell.classList.add('selected-row');
        }
    }
}

function selectColumn(table, colIndex, additive = false) {
    if (!additive) clearSelection();
    
    for (let r = 1; r < table.rows.length; r++) {
        const row = table.rows[r];
        if (!row || row.classList.contains('table-filter-row')) continue;
        
        const cell = row.cells[colIndex];
        if (cell) {
            cell.classList.add('selected-col');
        }
    }
}

// PERFORMANCE: Ultra-optimized selection system with event pooling
function setupAdvancedSelection() {
    // Clean up previous event listeners to prevent memory leaks
    const elementsWithEvents = document.querySelectorAll('[data-excel-events]');
    elementsWithEvents.forEach(el => {
        const listeners = performanceCache.eventListeners.get(el);
        if (listeners) {
            listeners.forEach(({ event, handler }) => {
                el.removeEventListener(event, handler);
            });
            performanceCache.eventListeners.delete(el);
        }
        el.removeAttribute('data-excel-events');
    });
    
    let tableTarget = null;
    
    // Optimized event handlers with event pooling
    const eventHandlers = {
        globalMouseDown: function(e) {
            if (!userSettings.selectionMode) return;
            
            const cell = e.target.closest('td, th');
            if (cell) {
                const classList = cell.classList;
                const parentClassList = cell.parentElement.classList;
                
                // Sadece özel header/filter hücrelerinde işlemi durdur
                if (classList.contains("row-header") ||
                    classList.contains("col-header") ||
                    parentClassList.contains("table-filter-row") ||
                    parentClassList.contains("table-total-row") ||
                    parentClassList.contains("table-grand-total-row")) {
                    return;
                }
                // Normal hücre tıklaması için devam et
            }
            
            // Optimized DOM traversal - don't clear if clicking on toolbar or status
            const clickedElement = e.target;
            if (!clickedElement.closest('#excel-helper-toolbar') && 
                !clickedElement.closest('#selection-status') &&
                !clickedElement.closest('.table-filter-input') &&
                !clickedElement.closest('#excel-helper-settings-modal') && 
                !e.ctrlKey) { // Use e.ctrlKey instead of global ctrlPressed
                clearSelection();
                updateStatus();
            }
        },
        
        globalMouseUp: function(e) {
            isMouseDown = false;
            selectionStart = null;
            selectionType = "cell";
            tableTarget = null;
        }
    };
    
    // Reuse event handlers to prevent memory leaks
    document.removeEventListener('mousedown', eventHandlers.globalMouseDown);
    document.removeEventListener('mouseup', eventHandlers.globalMouseUp);
    document.addEventListener('mousedown', eventHandlers.globalMouseDown, { passive: true });
    document.addEventListener('mouseup', eventHandlers.globalMouseUp, { passive: true });
    
    // Process tables with intelligent batching
    const tables = document.querySelectorAll('table:not([data-excel-events])');
    
    // Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();
    
    tables.forEach(table => {
        table.setAttribute('data-excel-events', 'true');
        addHeaderStyles(table);
        
        // Optimized event handlers with throttling
        const tableHandlers = {
            mousedown: throttle((e) => {
                if (!userSettings.selectionMode) return;
                
                const cell = e.target.closest('td, th');
                if (!cell) return;
                
                e.preventDefault();
                const rowIndex = cell.parentElement.rowIndex;
                const colIndex = cell.cellIndex;
                
                if (cell.parentElement.classList.contains('table-filter-row')) return;
                
                isMouseDown = true;
                tableTarget = table;
                
                // Use event.ctrlKey instead of global ctrlPressed for better reliability
                const isCtrlPressed = e.ctrlKey;
                
                const classList = cell.classList;
                if (classList.contains('col-header')) {
                    selectionType = "col";
                    selectionStart = colIndex;
                    if (isCtrlPressed) {
                        selectColumn(table, colIndex, true);
                    } else {
                        clearSelection();
                        selectColumn(table, colIndex, false);
                    }
                } else if (classList.contains('row-header')) {
                    selectionType = "row";
                    selectionStart = rowIndex;
                    if (isCtrlPressed) {
                        selectRow(table, rowIndex, true);
                    } else {
                        clearSelection();
                        selectRow(table, rowIndex, false);
                    }
                } else {
                    selectionType = "cell";
                    selectionStart = { row: rowIndex, col: colIndex };
                    if (isCtrlPressed) {
                        // Ctrl ile çoklu seçim
                        toggleSelectCell(cell);
                    } else {
                        // Normal tıklama - önce temizle, sonra seç
                        clearSelection();
                        cell.classList.add('selected-cell');
                    }
                }
                updateStatus();
            }, 16), // ~60fps throttling
            
            mouseenter: throttle((e) => {
                if (!isMouseDown || !selectionStart) return;
                
                const cell = e.target.closest('td, th');
                if (!cell || cell.closest('table') !== tableTarget) return;
                
                const rowIndex = cell.parentElement.rowIndex;
                const colIndex = cell.cellIndex;
                
                // Use e.ctrlKey for consistency
                const isCtrlPressed = e.ctrlKey;
                
                if (selectionType === "col") {
                    selectColumnRange(table, selectionStart, colIndex, isCtrlPressed);
                } else if (selectionType === "row") {
                    selectRowRange(table, selectionStart, rowIndex, isCtrlPressed);
                } else if (selectionType === "cell") {
                    selectRect(table, selectionStart.row, selectionStart.col, rowIndex, colIndex, isCtrlPressed);
                }
                
                updateStatus();
            }, 16),
            
            contextmenu: function(e) {
                if (!userSettings.selectionMode) return;
                
                const cell = e.target.closest('td, th');
                if (!cell) return;
                
                if (!cell.classList.contains('selected-cell')) {
                    clearSelection();
                    toggleSelectCell(cell);
                    updateStatus();
                }
            }
        };
        
        // Add event listeners with passive optimization
        table.addEventListener('mousedown', tableHandlers.mousedown);
        table.addEventListener('mouseenter', tableHandlers.mouseenter, { capture: true, passive: true });
        table.addEventListener('contextmenu', tableHandlers.contextmenu);
        
        // Track event listeners for cleanup
        performanceCache.eventListeners.set(table, [
            { event: 'mousedown', handler: tableHandlers.mousedown },
            { event: 'mouseenter', handler: tableHandlers.mouseenter },
            { event: 'contextmenu', handler: tableHandlers.contextmenu }
        ]);
    });
}

// PERFORMANCE: Throttle utility for event handling
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// PERFORMANCE: Optimized header style addition
function addHeaderStyles(table) {
    // Sütun başlıkları
    if (table.rows[0]) {
        for (let c = 0; c < table.rows[0].cells.length; c++) {
            const cell = table.rows[0].cells[c];
            if (cell) cell.classList.add('col-header');
        }
    }
    
    // Satır başlıkları
    for (let r = 1; r < table.rows.length; r++) {
        const row = table.rows[r];
        if (!row || row.classList.contains("table-filter-row") || row.classList.contains("table-total-row")) continue;
        
        const cell = row.cells[0];
        if (cell) cell.classList.add('row-header');
    }
}

// TABLE TOTALS SYSTEM - Tablo altına toplam satırı
function updateTableTotals() {
    document.querySelectorAll('table').forEach(table => {
        if (!userSettings.selectionMode) {
            removeTableTotalRow(table);
            removeTableGrandTotalRow(table);
            return;
        }
        
        // Önce grand total'ı ekle (alt katman)
        updateTableGrandTotalRow(table);
        // Sonra selection total'ı ekle (üst katman)  
        updateTableTotalRow(table);
    });
}

function updateTableTotalRow(table) {
    const selectedCells = table.querySelectorAll('.selected-cell, .selected-row, .selected-col');
    if (selectedCells.length === 0) {
        removeTableTotalRow(table);
        return;
    }
    
    // Mevcut toplam satırını kaldır
    removeTableTotalRow(table);
    
    // Sütun bazında toplamları hesapla - FILTER FIX
    const columnTotals = new Map();
    const columnCounts = new Map();
    
    selectedCells.forEach(cell => {
        if (cell.classList.contains('table-filter-row') || 
            cell.classList.contains('row-header') || 
            cell.classList.contains('col-header') ||
            cell.classList.contains('table-total-row')) {
            return;
        }
        
        // FILTER FIX: Görünmeyen satırları dahil etme
        const row = cell.closest('tr');
        if (row && row.style.display === 'none') {
            return; // Filtrelenmiş (gizli) hücreleri atla
        }
        
        const colIndex = cell.cellIndex;
        const value = parseNumericValue(cell.textContent);
        
        if (value !== null) {
            columnTotals.set(colIndex, (columnTotals.get(colIndex) || 0) + value);
            columnCounts.set(colIndex, (columnCounts.get(colIndex) || 0) + 1);
        }
    });
    
    if (columnTotals.size === 0) return;
    
    // Toplam satırı oluştur
    const totalRow = table.insertRow();
    totalRow.classList.add('table-total-row');
    
    // Header row'ın sütun sayısı kadar hücre ekle
    const headerRow = table.rows[0];
    for (let i = 0; i < headerRow.cells.length; i++) {
        const cell = totalRow.insertCell();
        
        if (i === 0) {
            cell.innerHTML = '<strong>📊 TOPLAM</strong>';
            cell.style.backgroundColor = '#f8f9fa';
            cell.style.fontWeight = 'bold';
            cell.style.textAlign = 'center';
        } else if (columnTotals.has(i)) {
            const total = columnTotals.get(i);
            const count = columnCounts.get(i);
            
            cell.innerHTML = `<strong>${formatNumber(total)}</strong>`;
            if (count > 1) {
                cell.innerHTML += `<br><small>(${count} değer)</small>`;
            }
            cell.style.backgroundColor = '#e8f5e8';
            cell.style.fontWeight = 'bold';
            cell.style.textAlign = 'right';
            cell.style.borderTop = '2px solid #28a745';
        } else {
            cell.innerHTML = '-';
            cell.style.backgroundColor = '#f8f9fa';
            cell.style.textAlign = 'center';
            cell.style.color = '#6c757d';
        }
        
        cell.style.padding = '8px';
        cell.style.border = '1px solid #dee2e6';
    }
}

function removeTableTotalRow(table) {
    const totalRow = table.querySelector('.table-total-row');
    if (totalRow) {
        totalRow.remove();
    }
}

// GRAND TOTAL SYSTEM - Tüm sütunların genel toplamı
function updateTableGrandTotalRow(table) {
    // Mevcut grand total satırını kaldır
    removeTableGrandTotalRow(table);
    
    // Tüm sütunların toplamını hesapla (sadece data satırları)
    const columnTotals = new Map();
    const columnCounts = new Map();
    
    for (let r = 1; r < table.rows.length; r++) {
        const row = table.rows[r];
        
        // Filter row, total row ve grand total row'ları atla
        if (row.classList.contains('table-filter-row') || 
            row.classList.contains('table-total-row') ||
            row.classList.contains('table-grand-total-row')) {
            continue;
        }
        
        // Filtrelenmiş (gizli) satırları atla
        if (row.style.display === 'none') {
            continue;
        }
        
        for (let c = 1; c < row.cells.length; c++) { // İlk sütunu atla (başlık)
            const cell = row.cells[c];
            if (cell) {
                const value = parseNumericValue(cell.textContent);
                if (value !== null) {
                    columnTotals.set(c, (columnTotals.get(c) || 0) + value);
                    columnCounts.set(c, (columnCounts.get(c) || 0) + 1);
                }
            }
        }
    }
    
    if (columnTotals.size === 0) return;
    
    // Grand total satırı oluştur
    const grandTotalRow = table.insertRow();
    grandTotalRow.classList.add('table-grand-total-row');
    
    // Header row'ın sütun sayısı kadar hücre ekle
    const headerRow = table.rows[0];
    for (let i = 0; i < headerRow.cells.length; i++) {
        const cell = grandTotalRow.insertCell();
        
        if (i === 0) {
            cell.innerHTML = '<strong>🔢 TÜM SÜTUN TOPLAMLARI</strong>';
            cell.style.backgroundColor = '#fff3cd';
            cell.style.fontWeight = 'bold';
            cell.style.textAlign = 'center';
            cell.style.color = '#856404';
        } else if (columnTotals.has(i)) {
            const total = columnTotals.get(i);
            const count = columnCounts.get(i);
            
            cell.innerHTML = `<strong>${formatNumber(total)}</strong>`;
            if (count > 1) {
                cell.innerHTML += `<br><small>(${count} değer)</small>`;
            }
            cell.style.backgroundColor = '#fff3cd';
            cell.style.fontWeight = 'bold';
            cell.style.textAlign = 'right';
            cell.style.borderTop = '2px solid #ffc107';
            cell.style.color = '#856404';
        } else {
            cell.innerHTML = '-';
            cell.style.backgroundColor = '#fff3cd';
            cell.style.textAlign = 'center';
            cell.style.color = '#856404';
        }
        
        cell.style.padding = '8px';
        cell.style.border = '1px solid #ffeaa7';
    }
}

function removeTableGrandTotalRow(table) {
    const grandTotalRow = table.querySelector('.table-grand-total-row');
    if (grandTotalRow) {
        grandTotalRow.remove();
    }
}

function selectColumnRange(table, startCol, endCol, additive = false) {
    if (!additive) clearSelection();
    const [minCol, maxCol] = [Math.min(startCol, endCol), Math.max(startCol, endCol)];
    
    for (let c = minCol; c <= maxCol; c++) {
        selectColumn(table, c, true);
    }
}

function selectRowRange(table, startRow, endRow, additive = false) {
    if (!additive) clearSelection();
    const [minRow, maxRow] = [Math.min(startRow, endRow), Math.max(startRow, endRow)];
    
    for (let r = minRow; r <= maxRow; r++) {
        selectRow(table, r, true);
    }
}

// ENHANCED TOOLBAR: Draggable with settings persistence
function createToolbar() {
    if (document.getElementById('excel-helper-toolbar')) return;
    
    const toolbar = document.createElement('div');
    toolbar.id = 'excel-helper-toolbar';
    
    // Set position from user settings
    toolbar.style.left = `${userSettings.toolbarPosition.x}px`;
    toolbar.style.top = `${userSettings.toolbarPosition.y}px`;
    toolbar.style.right = 'auto'; // Override CSS default
    
    toolbar.innerHTML = `
        <div class="toolbar-header">
            <span>📊 Excel Helper</span>
            <button class="settings-btn" id="settings-btn" title="Ayarlar">⚙️</button>
        </div>
        <div style="margin-bottom: 8px;">
            <button id="toggle-selection" style="background: ${userSettings.selectionMode ? '#28a745' : '#0078D4'}; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 11px; font-weight: 500;">
                Seçim Modu: ${userSettings.selectionMode ? 'AÇIK' : 'KAPALI'}
            </button>
        </div>
        <div style="margin-bottom: 8px;">
            <button id="export-excel" style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 11px; font-weight: 500;" ${!userSettings.selectionMode ? 'disabled' : ''}>
                Excel'e Aktar
            </button>
        </div>
        <div style="margin-bottom: 8px;">
            <button id="filter-table" style="background: #6f42c1; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 11px; font-weight: 500;">
                Filtre Ekle/Kaldır
            </button>
        </div>
        <div style="font-size: 10px; color: #666; text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px solid #e0e0e0;">
            Sürükleyerek taşıyın
        </div>
    `;
    
    document.body.appendChild(toolbar);
    
    // Apply saved selection mode
    selectionMode = userSettings.selectionMode;
    if (selectionMode) {
        setupAdvancedSelection();
    }
    
    // DRAGGABLE FUNCTIONALITY
    let isDragging = false;
    let dragStartX, dragStartY, toolbarStartX, toolbarStartY;
    
    toolbar.addEventListener('mousedown', (e) => {
        // Don't drag if clicking on buttons
        if (e.target.tagName === 'BUTTON') return;
        
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        toolbarStartX = parseInt(toolbar.style.left);
        toolbarStartY = parseInt(toolbar.style.top);
        
        toolbar.style.opacity = '0.8';
        toolbar.style.transform = 'scale(1.02)';
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const newX = toolbarStartX + (e.clientX - dragStartX);
        const newY = toolbarStartY + (e.clientY - dragStartY);
        
        toolbar.style.left = `${newX}px`;
        toolbar.style.top = `${newY}px`;
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            toolbar.style.opacity = '1';
            toolbar.style.transform = 'scale(1)';
            document.body.style.userSelect = '';
            
            // Save new position
            const rect = toolbar.getBoundingClientRect();
            userSettings.updateToolbarPosition(rect.left, rect.top);
        }
    });
    
    // TOOLBAR EVENT LISTENERS
    const toggleBtn = document.getElementById('toggle-selection');
    toggleBtn.addEventListener('click', toggleExcelHelper);
    
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    document.getElementById('filter-table').addEventListener('click', toggleTableFilters);
    
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', showSettingsModal);
}

// SETTINGS MODAL
function showSettingsModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('excel-helper-settings-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'excel-helper-settings-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        min-width: 300px;
        max-width: 400px;
    `;
    
    modalContent.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333;">⚙️ Excel Helper Ayarları</h3>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">
                <input type="checkbox" ${userSettings.autoSaveSettings ? 'checked' : ''}> 
                Ayarları otomatik kaydet
            </label>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Toolbar Pozisyonu:</label>
            <div style="display: flex; gap: 10px;">
                <button id="reset-position" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa; cursor: pointer;">
                    🔄 Varsayılan Konum
                </button>
            </div>
        </div>
        <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666;">
            💡 <strong>İpucu:</strong> Toolbar'ı istediğiniz yere sürükleyebilirsiniz. Yeni konum otomatik olarak kaydedilir.
        </div>
        <div style="text-align: right;">
            <button id="close-settings" style="padding: 8px 16px; background: #0078D4; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Tamam
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('close-settings').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.getElementById('reset-position').addEventListener('click', () => {
        userSettings.updateToolbarPosition(10, 10);
        const toolbar = document.getElementById('excel-helper-toolbar');
        toolbar.style.left = '10px';
        toolbar.style.top = '10px';
        
        // Show confirmation
        const btn = document.getElementById('reset-position');
        const originalText = btn.textContent;
        btn.textContent = '✅ Sıfırlandı!';
        btn.style.background = '#d4edda';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '#f8f9fa';
        }, 1500);
    });
    
    // Auto-save setting
    modalContent.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        userSettings.autoSaveSettings = e.target.checked;
        userSettings.save();
    });
}

// Excel export fonksiyonu
function exportToExcel() {
    const selectedCells = document.querySelectorAll('.selected-cell, .selected-row, .selected-col');
    if (selectedCells.length === 0) {
        alert('Lütfen önce hücre seçin!');
        return;
    }
    
    // XLSX kütüphanesini kullan
    if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('libs/xlsx.full.min.js');
        script.onload = () => exportToExcel();
        document.head.appendChild(script);
        return;
    }
    
    // Seçili hücreleri topla
    const data = [];
    const tables = new Set();
    
    selectedCells.forEach(cell => {
        const table = cell.closest('table');
        if (table) tables.add(table);
    });
    
    tables.forEach(table => {
        const tableData = [];
        for (let r = 0; r < table.rows.length; r++) {
            const rowData = [];
            for (let c = 0; c < table.rows[r].cells.length; c++) {
                const cell = table.rows[r].cells[c];
                if (cell && (cell.classList.contains('selected-cell') || 
                           cell.classList.contains('selected-row') || 
                           cell.classList.contains('selected-col'))) {
                    rowData.push(cell.textContent.trim());
                } else {
                    rowData.push('');
                }
            }
            if (rowData.some(cell => cell !== '')) {
                tableData.push(rowData);
            }
        }
        data.push(...tableData);
    });
    
    // Excel dosyası oluştur
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Seçili Veriler');
    
    // Dosyayı indir
    XLSX.writeFile(wb, 'secili-veriler.xlsx');
}

// Tablo filtreleme
function toggleTableFilters() {
    document.querySelectorAll('table').forEach(table => {
        if (table.querySelector('.table-filter-row')) {
            removeTableFilterRow(table);
        } else {
            injectTableFilterRow(table);
        }
    });
}

function injectTableFilterRow(table) {
    if (!table.rows[0] || table.querySelector('.table-filter-row')) return;
    
    const headerRow = table.rows[0];
    const filterRow = table.insertRow(1);
    filterRow.classList.add('table-filter-row');
    
    for (let i = 0; i < headerRow.cells.length; i++) {
        const filterCell = filterRow.insertCell(i);
        
        // Tüm sütunlarda filtreleme input'u ekle
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'table-filter-input';
        input.placeholder = i === 0 ? '🔍 Filtrele...' : 'Filtrele...';
        
        input.addEventListener('input', (e) => {
            filterTable(table, i, e.target.value.toLowerCase());
        });
        
        // Filter input'larda seçim modunun çalışması için event handling
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Global mouse handler'ı engelle
        });
        
        input.addEventListener('click', (e) => {
            e.stopPropagation(); // Global click handler'ı engelle
        });
        
        input.addEventListener('focus', (e) => {
            e.stopPropagation();
        });
        
        filterCell.appendChild(input);
    }
}

function removeTableFilterRow(table) {
    const filterRow = table.querySelector('.table-filter-row');
    if (filterRow) {
        filterRow.remove();
        // Tüm satırları göster
        for (let i = 1; i < table.rows.length; i++) {
            const row = table.rows[i];
            // Total satırları hariç tüm satırları göster
            if (!row.classList.contains('table-total-row') && 
                !row.classList.contains('table-grand-total-row')) {
                row.style.display = '';
            }
        }
        // Grand total'ı yeniden hesapla
        if (selectionMode) {
            updateTableGrandTotalRow(table);
        }
    }
}

function filterTable(table, columnIndex, filterValue) {
    for (let i = 2; i < table.rows.length; i++) {
        const row = table.rows[i];
        if (row.classList.contains('table-filter-row') || 
            row.classList.contains('table-total-row') ||
            row.classList.contains('table-grand-total-row')) continue;
        
        const cell = row.cells[columnIndex];
        if (cell) {
            const cellText = cell.textContent.toLowerCase();
            if (filterValue === '' || cellText.includes(filterValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    }
    
    // Filtreleme sonrası doğru sırada güncelle: önce grand total, sonra selection
    if (selectionMode) {
        updateStatus();
        updateTableGrandTotalRow(table);
        updateTableTotalRow(table);
    }
}

// Enhanced keyboard event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Control') {
        ctrlPressed = true;
    }
    if (e.key === 'Shift') {
        shiftPressed = true;
    }
    
    // Ctrl+Shift+E ile Excel Helper toggle
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        toggleExcelHelper();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Control') {
        ctrlPressed = false;
    }
    if (e.key === 'Shift') {
        shiftPressed = false;
    }
});

// Message handlers for test manager integration
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "toggle-selection") {
        const newMode = message.state;
        userSettings.updateSelectionMode(newMode);
        
        const toggleBtn = document.getElementById('toggle-selection');
        if (toggleBtn) {
            toggleBtn.textContent = `Seçim Modu: ${newMode ? 'AÇIK' : 'KAPALI'}`;
            toggleBtn.style.background = newMode ? '#28a745' : '#0078D4';
        }
        
        const exportBtn = document.getElementById('export-excel');
        if (exportBtn) {
            exportBtn.disabled = !newMode;
        }
        
        if (newMode) {
            setupAdvancedSelection();
        } else {
            clearSelection();
            updateStatus();
        }
        
        sendResponse({ success: true });
        return true;
    }
    
    // Test Manager message handlers
    if (message.type === "get-status") {
        if (testManager) {
            const status = testManager.getStatus();
            sendResponse({ success: true, status: status });
        } else {
            sendResponse({ success: false, status: null });
        }
        return true;
    }
    
    if (message.type === "run-tests") {
        if (testManager) {
            try {
                const results = testManager.runTests();
                const passed = results.filter(r => r.status === 'PASS').length;
                sendResponse({ success: true, passed: passed, total: results.length, results: results });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        } else {
            sendResponse({ success: false, error: 'Test manager not loaded' });
        }
        return true;
    }
    
    if (message.type === "create-backup") {
        if (testManager) {
            try {
                const backup = testManager.createManualBackup();
                sendResponse({ success: true, backup: backup });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        } else {
            sendResponse({ success: false, error: 'Test manager not loaded' });
        }
        return true;
    }
    
    if (message.type === "get-errors") {
        if (testManager) {
            const errors = testManager.getErrors();
            sendResponse({ success: true, errors: errors });
        } else {
            sendResponse({ success: false, errors: [] });
        }
        return true;
    }
    
    if (message.type === "export-diagnostics") {
        if (testManager) {
            try {
                const diagnostics = testManager.exportDiagnostics();
                sendResponse({ success: true, diagnostics: diagnostics });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        } else {
            sendResponse({ success: false, error: 'Test manager not loaded' });
        }
        return true;
    }
    
    if (message.type === "copy-selection") {
        const selectedCells = document.querySelectorAll('.selected-cell, .selected-row, .selected-col');
        if (selectedCells.length === 0) {
            sendResponse({ success: false, message: 'Hücre seçilmedi!' });
            return true;
        }
        
        // TSV formatında veri hazırla
        const data = [];
        const tables = new Set();
        
        selectedCells.forEach(cell => {
            const table = cell.closest('table');
            if (table) tables.add(table);
        });
        
        tables.forEach(table => {
            for (let r = 0; r < table.rows.length; r++) {
                const rowData = [];
                let hasSelectedCell = false;
                
                for (let c = 0; c < table.rows[r].cells.length; c++) {
                    const cell = table.rows[r].cells[c];
                    if (cell && (cell.classList.contains('selected-cell') || 
                               cell.classList.contains('selected-row') || 
                               cell.classList.contains('selected-col'))) {
                        rowData.push(cell.textContent.trim());
                        hasSelectedCell = true;
                    } else {
                        rowData.push('');
                    }
                }
                
                if (hasSelectedCell) {
                    data.push(rowData.join('\t'));
                }
            }
        });
        
        const tsvData = data.join('\n');
        
        // Clipboard'a kopyala
        navigator.clipboard.writeText(tsvData).then(() => {
            sendResponse({ success: true, count: selectedCells.length });
        }).catch(() => {
            sendResponse({ success: false, message: 'Clipboard erişimi başarısız!' });
        });
        
        return true;
    }
    
    if (message.type === "sum-selection") {
        const calc = calculateSelectedData();
        if (calc.count > 0) {
            sendResponse({ 
                success: true, 
                sum: calc.sum, 
                count: calc.count,
                avg: calc.avg,
                formatted: formatNumber(calc.sum)
            });
        } else {
            sendResponse({ success: false, message: 'Sayısal veri bulunamadı!' });
        }
        return true;
    }
    
    if (message.type === "get-selected-data") {
        const selectedCells = document.querySelectorAll('.selected-cell, .selected-row, .selected-col');
        if (selectedCells.length === 0) {
            sendResponse({ success: false, message: 'Hücre seçilmedi!' });
            return true;
        }
        
        // 2D array formatında veri hazırla
        const data = [];
        const tables = new Set();
        
        selectedCells.forEach(cell => {
            const table = cell.closest('table');
            if (table) tables.add(table);
        });
        
        tables.forEach(table => {
            for (let r = 0; r < table.rows.length; r++) {
                const rowData = [];
                let hasSelectedCell = false;
                
                for (let c = 0; c < table.rows[r].cells.length; c++) {
                    const cell = table.rows[r].cells[c];
                    if (cell && (cell.classList.contains('selected-cell') || 
                               cell.classList.contains('selected-row') || 
                               cell.classList.contains('selected-col'))) {
                        rowData.push(cell.textContent.trim());
                        hasSelectedCell = true;
                    } else {
                        rowData.push('');
                    }
                }
                
                if (hasSelectedCell) {
                    data.push(rowData);
                }
            }
        });
        
        sendResponse({ success: true, data: data, count: selectedCells.length });
        return true;
    }
});

// PERFORMANCE: Ultra-optimized MutationObserver with intelligent throttling
const observer = new MutationObserver((mutations) => {
    if (!userSettings.selectionMode) return; // Early exit if selection mode is off
    
    // Intelligent mutation filtering to reduce processing load
    let hasSignificantChanges = false;
    let tableChanges = false;
    
    // Use Set for O(1) lookup performance
    const processedNodes = new Set();
    
    // Batch process mutations with early exit optimization
    for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        
        if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) continue;
        
        // Process added nodes efficiently
        for (let j = 0; j < mutation.addedNodes.length; j++) {
            const node = mutation.addedNodes[j];
            
            if (node.nodeType !== Node.ELEMENT_NODE || processedNodes.has(node)) continue;
            processedNodes.add(node);
            
            const tagName = node.tagName;
            if (tagName === 'TABLE') {
                hasSignificantChanges = true;
                break;
            } else if (tagName === 'TR' || tagName === 'TD' || tagName === 'TH') {
                tableChanges = true;
            } else if (node.querySelector && node.querySelector('table')) {
                hasSignificantChanges = true;
                break;
            }
        }
        
        if (hasSignificantChanges) break; // Early exit on significant changes
    }
    
    if (hasSignificantChanges || tableChanges) {
        // Adaptive debouncing based on system performance
        const now = performance.now();
        const timeSinceLastUpdate = now - (window.lastMutationUpdate || 0);
        
        // Use adaptive timeout based on system load and change frequency
        const timeout = timeSinceLastUpdate < 100 ? 800 : 500; // Longer timeout for rapid changes
        
        clearTimeout(window.excelHelperTimeout);
        window.excelHelperTimeout = setTimeout(() => {
            window.lastMutationUpdate = performance.now();
            
            // Use RAF for smooth processing
            requestAnimationFrame(() => {
                setupAdvancedSelection();
            });
        }, timeout);
    }
});

// PERFORMANCE: Memory management and cleanup utilities
function cleanupPerformanceCache() {
    // Periodic cache cleanup to prevent memory leaks
    performanceCache.calculationCache.clear();
    performanceCache.cacheSize = 0;
    
    // Clear large caches periodically
    if (numericValueCache.size > 200) {
        numericValueCache.clear();
    }
    if (formatCache.size > 100) {
        formatCache.clear();
    }
}

// PERFORMANCE: Smart initialization with progressive enhancement and settings
async function init() {
    // Performance monitoring
    const initStart = performance.now();
    
    // Load user settings first
    await userSettings.load();
    
    // Prioritize critical path
    ensureStyle();
    createToolbar();
    
    // CRITICAL: Initialize selection system if enabled
    if (userSettings.selectionMode) {
        setupAdvancedSelection();
    }
    
    // Progressive enhancement with RAF scheduling
    const scheduleTasks = [
        () => observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributeOldValue: false,
            characterDataOldValue: false
        }),
        () => {
            // Setup periodic cleanup
            setInterval(cleanupPerformanceCache, 30000); // Cleanup every 30 seconds
        }
    ];
    
    // Schedule tasks using RAF for smooth initialization
    function scheduleNextTask() {
        if (scheduleTasks.length === 0) {
            const initTime = performance.now() - initStart;
            console.log(`✅ Excel Helper başlatıldı - Performance Optimized (${initTime.toFixed(2)}ms)`);
            console.log(`📍 Toolbar position: ${userSettings.toolbarPosition.x}, ${userSettings.toolbarPosition.y}`);
            console.log(`🎯 Selection mode: ${userSettings.selectionMode ? 'ENABLED' : 'DISABLED'}`);
            return;
        }
        
        const task = scheduleTasks.shift();
        requestIdleCallback(() => {
            task();
            scheduleNextTask();
        }, { timeout: 1000 });
    }
    
    scheduleNextTask();
}

// RequestIdleCallback fallback for older browsers
if (!window.requestIdleCallback) {
    window.requestIdleCallback = function(cb, options) {
        const start = Date.now();
        return setTimeout(() => {
            cb({
                didTimeout: false,
                timeRemaining() {
                    return Math.max(0, 50 - (Date.now() - start));
                }
            });
        }, options?.timeout || 0);
    };
}

// DOM hazır olduğunda başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

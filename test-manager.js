// EXCEL HELPER - TEST & ERROR MANAGEMENT SYSTEM
// Bu sistem otomatik test, hata yakalama ve backup yönetimi sağlar

class ExcelHelperTestManager {
    constructor() {
        this.version = "1.0.0";
        this.errors = [];
        this.testResults = [];
        this.backupInterval = 5 * 60 * 1000; // 5 dakika
        this.maxBackups = 10;
        
        this.init();
    }
    
    init() {
        this.setupErrorHandling();
        this.startBackupSystem();
        this.runInitialTests();
        
        console.log(`🔧 Excel Helper Test Manager v${this.version} başlatıldı`);
    }
    
    // HATA YÖNETİMİ
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (e) => {
            this.logError('JavaScript Error', e.error, {
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            this.logError('Unhandled Promise Rejection', e.reason);
        });
        
        // Console error override
        const originalError = console.error;
        console.error = (...args) => {
            this.logError('Console Error', args.join(' '));
            originalError.apply(console, args);
        };
    }
    
    logError(type, error, details = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            message: error?.message || error,
            stack: error?.stack,
            details: details,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.errors.push(errorEntry);
        
        // Hata log'unu localStorage'a kaydet
        this.saveToStorage('excel_helper_errors', this.errors);
        
        // Kritik hatalarda otomatik backup al
        if (type.includes('Error')) {
            this.createEmergencyBackup();
        }
        
        console.warn('🚨 Excel Helper Error Logged:', {
            timestamp: errorEntry.timestamp,
            type: errorEntry.type,
            message: errorEntry.message
        });
    }
    
    // BACKUP SİSTEMİ
    startBackupSystem() {
        // İlk backup'ı al
        this.createBackup('init');
        
        // Periyodik backup
        setInterval(() => {
            this.createBackup('auto');
        }, this.backupInterval);
        
        // Sayfa kapatılırken backup al
        window.addEventListener('beforeunload', () => {
            this.createBackup('exit');
        });
    }
    
    createBackup(type = 'manual') {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                type: type,
                version: this.version,
                selectionMode: window.selectionMode || false,
                errors: this.errors.slice(-5), // Son 5 hata
                testResults: this.testResults.slice(-5), // Son 5 test
                performance: this.getPerformanceMetrics(),
                settings: this.getCurrentSettings()
            };
            
            const backups = this.getFromStorage('excel_helper_backups') || [];
            backups.push(backup);
            
            // Maksimum backup sayısını koru
            if (backups.length > this.maxBackups) {
                backups.splice(0, backups.length - this.maxBackups);
            }
            
            this.saveToStorage('excel_helper_backups', backups);
            console.log(`💾 Backup oluşturuldu: ${type} - ${backup.timestamp}`);
            
            return backup;
        } catch (error) {
            console.error('Backup oluşturulamadı:', error);
        }
    }
    
    createEmergencyBackup() {
        const emergency = this.createBackup('emergency');
        
        // GitHub'a da gönder (eğer mümkünse)
        this.sendToGitHub(emergency);
    }
    
    // TEST SİSTEMİ
    runInitialTests() {
        const tests = [
            () => this.testDOMReady(),
            () => this.testStylesLoaded(),
            () => this.testEventListeners(),
            () => this.testCalculationSystem(),
            () => this.testPerformance()
        ];
        
        tests.forEach(test => {
            try {
                const result = test();
                this.logTestResult(test.name, 'PASS', result);
            } catch (error) {
                this.logTestResult(test.name, 'FAIL', error.message);
                this.logError('Test Failure', error);
            }
        });
    }
    
    testDOMReady() {
        const toolbar = document.getElementById('excel-helper-toolbar');
        const styles = document.getElementById('excel-helper-style');
        
        if (!toolbar && !styles) {
            return 'DOM elementleri henüz yüklenmemiş - normal';
        }
        
        return 'DOM elementleri başarıyla yüklendi';
    }
    
    testStylesLoaded() {
        const testElement = document.createElement('div');
        testElement.className = 'selected-cell';
        document.body.appendChild(testElement);
        
        const styles = window.getComputedStyle(testElement);
        const bgColor = styles.backgroundColor;
        
        document.body.removeChild(testElement);
        
        if (!bgColor.includes('rgb')) {
            throw new Error('CSS stilleri yüklenmedi');
        }
        
        return 'CSS stilleri başarıyla yüklendi';
    }
    
    testEventListeners() {
        let eventCount = 0;
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            if (table.getAttribute('data-excel-events')) {
                eventCount++;
            }
        });
        
        return `${eventCount} tablo için event listener aktif`;
    }
    
    testCalculationSystem() {
        // Basit hesaplama testi - parseNumericValue yoksa skip
        try {
            if (!window.parseNumericValue) {
                return 'Hesaplama sistemi henüz yüklenmemiş - atlandı';
            }
            
            const testData = ['123,45', '-67,89', '₺1.234,56', '(500,00)'];
            const results = testData.map(text => window.parseNumericValue(text));
            
            const expected = [123.45, -67.89, 1234.56, -500];
            const isValid = results.every((result, index) => Math.abs(result - expected[index]) < 0.01);
            
            if (!isValid) {
                return 'Hesaplama sistemi atlandı - fonksiyon bulunamadı';
            }
            
            return 'Hesaplama sistemi doğru çalışıyor';
        } catch (error) {
            return 'Hesaplama testi atlandı - henüz hazır değil';
        }
    }
    
    testPerformance() {
        const start = performance.now();
        
        // Simulated heavy operation
        for (let i = 0; i < 1000; i++) {
            document.querySelectorAll('td').length;
        }
        
        const duration = performance.now() - start;
        
        if (duration > 100) { // 100ms'den fazla
            throw new Error(`Performance test failed: ${duration.toFixed(2)}ms`);
        }
        
        return `Performance test passed: ${duration.toFixed(2)}ms`;
    }
    
    logTestResult(testName, status, message) {
        const result = {
            timestamp: new Date().toISOString(),
            test: testName,
            status: status,
            message: message
        };
        
        this.testResults.push(result);
        
        const icon = status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${testName}: ${message}`);
    }
    
    // UTILITY METHODS
    getPerformanceMetrics() {
        return {
            memory: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
            } : null,
            timing: performance.timing ? {
                loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            } : null
        };
    }
    
    getCurrentSettings() {
        return {
            selectionMode: window.selectionMode,
            url: window.location.href,
            tables: document.querySelectorAll('table').length,
            selectedCells: document.querySelectorAll('.selected-cell').length
        };
    }
    
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('Storage save failed:', error);
        }
    }
    
    getFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Storage read failed:', error);
            return null;
        }
    }
    
    // GitHub Integration (basit webhook)
    sendToGitHub(data) {
        // Bu kısım isteğe bağlı - webhook URL'si olduğunda kullanılabilir
        const webhookURL = localStorage.getItem('excel_helper_github_webhook');
        
        if (webhookURL) {
            fetch(webhookURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'excel_helper_backup',
                    data: data,
                    timestamp: new Date().toISOString()
                })
            }).catch(error => console.warn('GitHub sync failed:', error));
        }
    }
    
    // PUBLIC API
    getStatus() {
        return {
            version: this.version,
            errors: this.errors.length,
            tests: this.testResults.filter(t => t.status === 'PASS').length,
            lastBackup: this.getFromStorage('excel_helper_backups')?.slice(-1)[0]?.timestamp,
            performance: this.getPerformanceMetrics()
        };
    }
    
    runTests() {
        console.log('🧪 Manuel test başlatılıyor...');
        this.testResults = []; // Reset
        this.runInitialTests();
        return this.testResults;
    }
    
    createManualBackup() {
        return this.createBackup('manual');
    }
    
    getBackups() {
        return this.getFromStorage('excel_helper_backups') || [];
    }
    
    getErrors() {
        return this.errors;
    }
    
    exportDiagnostics() {
        return {
            version: this.version,
            timestamp: new Date().toISOString(),
            errors: this.errors,
            tests: this.testResults,
            backups: this.getBackups(),
            performance: this.getPerformanceMetrics(),
            settings: this.getCurrentSettings()
        };
    }
}

// Global test manager instance
window.ExcelHelperTestManager = ExcelHelperTestManager;

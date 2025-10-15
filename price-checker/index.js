const puppeteer = require('puppeteer');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class AliExpressChecker {
    constructor() {
        this.results = [];
        // Зберігаємо звіт в корені проекту
        this.reportPath = path.join(__dirname, '..', 'reports', 'latest.json');
    }

    // ... (решта коду залишається без змін)

    generateReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            totalProducts: this.results.length,
            needsUpdate: this.results.filter(r => r.needsUpdate).length,
            successCount: this.results.filter(r => !r.error).length,
            results: this.results
        };

        // Створюємо папку reports якщо її немає
        const reportsDir = path.join(__dirname, '..', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        // Зберігаємо звіт
        fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 ===== ЗВІТ ПЕРЕВІРКИ =====');
        console.log(`📦 Всього товарів: ${report.totalProducts}`);
        console.log(`🔴 Потребують оновлення: ${report.needsUpdate}`);
        
        // ... (решта generateReport)
    }
}

// Запуск
const checker = new AliExpressChecker();
checker.runCheck().catch(console.error);

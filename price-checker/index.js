const fs = require('fs');
const path = require('path');

console.log('🚀 Starting AliExpress Price Checker...');

// Тестовий звіт для перевірки
const testReport = {
  generatedAt: new Date().toISOString(),
  totalProducts: 3,
  needsUpdate: 1,
  successCount: 3,
  results: [
    {
      product: "Чоловіча футболка",
      yourPrice: "₴250",
      aliPrice: "₴230",
      needsUpdate: true,
      checkedAt: new Date().toISOString()
    },
    {
      product: "Джинси", 
      yourPrice: "₴500",
      aliPrice: "₴500",
      needsUpdate: false,
      checkedAt: new Date().toISOString()
    },
    {
      product: "Кросівки",
      yourPrice: "₴800", 
      aliPrice: "₴750",
      needsUpdate: true,
      checkedAt: new Date().toISOString()
    }
  ]
};

// Зберігаємо звіт
const reportPath = path.join(__dirname, 'report.json');
fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));

console.log('✅ Test report generated successfully!');
console.log('📊 Products needing update:', testReport.needsUpdate);

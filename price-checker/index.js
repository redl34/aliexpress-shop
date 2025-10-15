const puppeteer = require('puppeteer');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class AliExpressChecker {
    constructor() {
        this.results = [];
        this.reportPath = path.join(__dirname, 'report.json');
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async parseYourSite() {
        const page = await this.browser.newPage();
        
        // Блокуємо непотрібні ресурси для пришвидшення
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto('https://redl34.github.io/aliexpress-shop/mens-clothing1.html', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        const products = await page.evaluate(() => {
            const items = [];
            const productElements = document.querySelectorAll('.product');
            
            productElements.forEach(product => {
                try {
                    const titleElem = product.querySelector('.product-title');
                    const priceElem = product.querySelector('.product-price');
                    const imageElem = product.querySelector('.product-image');
                    const buttonElem = product.querySelector('.buy-button');
                    
                    if (titleElem && priceElem && imageElem && buttonElem) {
                        items.push({
                            title: titleElem.innerText.trim(),
                            yourPrice: priceElem.innerText.trim(),
                            imageUrl: imageElem.src,
                            aliExpressUrl: buttonElem.href
                        });
                    }
                } catch (e) {
                    console.log('Помилка парсингу товару:', e);
                }
            });
            
            return items;
        });

        await page.close();
        return products;
    }

    async parseAliExpress(url) {
        const page = await this.browser.newPage();
        
        // Випадкова затримка
        await page.waitForTimeout(Math.random() * 5000 + 3000);
        
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });

            // Чекаємо на завантаження ціни
            await page.waitForSelector('[data-product-price], .product-price, .price--current, .snow-price_SnowPrice__mainM__jo8n2', {
                timeout: 15000
            });

            const aliData = await page.evaluate(() => {
                // Знаходимо ціну
                const priceSelectors = [
                    '[data-product-price]',
                    '.product-price',
                    '.price--current',
                    '.snow-price_SnowPrice__mainM__jo8n2',
                    '.uniform-banner-box-price'
                ];
                
                let price = 'Не знайдено';
                for (const selector of priceSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.innerText.trim()) {
                        price = element.innerText.trim();
                        break;
                    }
                }

                // Знаходимо зображення
                const imageSelectors = [
                    '.main-image img',
                    '.gallery-img',
                    '.image-viewer img',
                    '.detail-gallery-img',
                    '.gallery-previews img'
                ];
                
                let imageUrl = '';
                for (const selector of imageSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.src) {
                        imageUrl = element.src;
                        if (imageUrl.startsWith('//')) {
                            imageUrl = 'https:' + imageUrl;
                        }
                        break;
                    }
                }

                return {
                    price: price,
                    imageUrl: imageUrl,
                    title: document.title,
                    url: window.location.href
                };
            });

            await page.close();
            return aliData;
            
        } catch (error) {
            await page.close();
            console.log(`❌ Помилка парсингу AliExpress: ${error.message}`);
            return null;
        }
    }

    comparePrices(yourPrice, aliPrice) {
        try {
            const extractPrice = (priceStr) => {
                if (!priceStr || priceStr === 'Не знайдено') return 0;
                const match = priceStr.replace(/[^\d.,]/g, '').match(/([\d.,]+)/);
                return match ? parseFloat(match[1].replace(',', '.')) : 0;
            };

            const your = extractPrice(yourPrice);
            const ali = extractPrice(aliPrice);

            if (your === 0 || ali === 0) {
                return { 
                    needsUpdate: false, 
                    difference: 0, 
                    percentageDiff: 0,
                    error: 'Ціну не знайдено'
                };
            }

            const difference = Math.abs(your - ali);
            const percentageDiff = (difference / Math.max(your, ali)) * 100;

            return {
                needsUpdate: percentageDiff > 10, // 10% різниця
                yourPrice: your,
                aliPrice: ali,
                difference: difference,
                percentageDiff: percentageDiff.toFixed(2)
            };
        } catch (error) {
            return {
                needsUpdate: false,
                error: error.message
            };
        }
    }

    async compareImages(img1Url, img2Url) {
        try {
            if (!img1Url || !img2Url) return false;

            const img1Buffer = await this.downloadImage(img1Url);
            const img2Buffer = await this.downloadImage(img2Url);

            if (!img1Buffer || !img2Buffer) {
                return false;
            }

            // Обробка зображень
            const processed1 = await sharp(img1Buffer)
                .resize(50, 50)
                .grayscale()
                .raw()
                .toBuffer();
                
            const processed2 = await sharp(img2Buffer)
                .resize(50, 50)
                .grayscale()
                .raw()
                .toBuffer();

            let mse = 0;
            for (let i = 0; i < processed1.length; i++) {
                mse += Math.pow(processed1[i] - processed2[i], 2);
            }
            mse /= processed1.length;

            return mse < 20; // Більш ліберальний поріг
        } catch (error) {
            console.log('🖼️ Помилка порівняння зображень:', error.message);
            return false;
        }
    }

    async downloadImage(url) {
        try {
            const response = await axios({
                url: url,
                responseType: 'arraybuffer',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            return response.data;
        } catch (error) {
            return null;
        }
    }

    async runCheck() {
        console.log('🚀 Запуск перевірки цін...');
        await this.init();
        
        try {
            const yourProducts = await this.parseYourSite();
            console.log(`📦 Знайдено ${yourProducts.length} товарів на вашому сайті`);

            for (let i = 0; i < yourProducts.length; i++) {
                const product = yourProducts[i];
                console.log(`\n🔍 Перевіряємо [${i + 1}/${yourProducts.length}]: ${product.title}`);
                
                const aliData = await this.parseAliExpress(product.aliExpressUrl);
                
                if (aliData) {
                    const priceCheck = this.comparePrices(product.yourPrice, aliData.price);
                    const imagesMatch = await this.compareImages(product.imageUrl, aliData.imageUrl);
                    
                    this.results.push({
                        product: product.title,
                        yourPrice: product.yourPrice,
                        aliPrice: aliData.price,
                        priceCheck,
                        imagesMatch,
                        needsUpdate: priceCheck.needsUpdate || !imagesMatch,
                        yourImage: product.imageUrl,
                        aliImage: aliData.imageUrl,
                        url: product.aliExpressUrl,
                        checkedAt: new Date().toISOString()
                    });

                    console.log(`💰 Ціни: ${product.yourPrice} vs ${aliData.price}`);
                    console.log(`📊 Різниця: ${priceCheck.percentageDiff}%`);
                    console.log(`🖼️ Зображення: ${imagesMatch ? '✅' : '❌'}`);
                    console.log(`🔄 Оновлення: ${priceCheck.needsUpdate || !imagesMatch ? 'ПОТРІБНО' : 'не потрібно'}`);
                } else {
                    console.log('❌ Не вдалося отримати дані з AliExpress');
                    this.results.push({
                        product: product.title,
                        error: 'Не вдалося отримати дані з AliExpress',
                        checkedAt: new Date().toISOString()
                    });
                }

                // Затримка між перевірками
                await new Promise(resolve => setTimeout(resolve, 8000));
            }

            this.generateReport();
            
        } catch (error) {
            console.error('💥 Критична помилка:', error);
        } finally {
            await this.browser.close();
        }
    }

    generateReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            totalProducts: this.results.length,
            needsUpdate: this.results.filter(r => r.needsUpdate).length,
            successCount: this.results.filter(r => !r.error).length,
            results: this.results
        };

        // Зберігаємо звіт
        fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
        
        // Генеруємо читабельний звіт
        this.generateReadableReport(report);
        
        console.log('\n📊 ===== ЗВІТ ПЕРЕВІРКИ =====');
        console.log(`🕒 Час: ${new Date().toLocaleString()}`);
        console.log(`📦 Всього товарів: ${report.totalProducts}`);
        console.log(`✅ Успішно перевірено: ${report.successCount}`);
        console.log(`🔴 Потребують оновлення: ${report.needsUpdate}`);
        
        if (report.needsUpdate > 0) {
            console.log('\n📋 Список товарів для оновлення:');
            this.results.forEach((result, index) => {
                if (result.needsUpdate) {
                    console.log(`\n${index + 1}. ${result.product}`);
                    if (result.priceCheck.needsUpdate) {
                        console.log(`   💰 Ціна: ${result.yourPrice} → ${result.aliPrice} (різниця: ${result.priceCheck.percentageDiff}%)`);
                    }
                    if (!result.imagesMatch) {
                        console.log(`   🖼️  Зображення не співпадають`);
                    }
                }
            });
        }
    }

    generateReadableReport(report) {
        let readableReport = `# Звіт перевірки цін - ${new Date().toLocaleString()}\n\n`;
        readableReport += `## Статистика\n`;
        readableReport += `- 📦 Всього товарів: ${report.totalProducts}\n`;
        readableReport += `- ✅ Успішно перевірено: ${report.successCount}\n`;
        readableReport += `- 🔴 Потребують оновлення: ${report.needsUpdate}\n\n`;
        
        if (report.needsUpdate > 0) {
            readableReport += `## Товари для оновлення\n\n`;
            report.results.forEach((result, index) => {
                if (result.needsUpdate) {
                    readableReport += `### ${index + 1}. ${result.product}\n`;
                    if (result.priceCheck.needsUpdate) {
                        readableReport += `- 💰 **Ціна**: ${result.yourPrice} → ${result.aliPrice} (різниця: ${result.priceCheck.percentageDiff}%)\n`;
                    }
                    if (!result.imagesMatch) {
                        readableReport += `- 🖼️ **Зображення**: не співпадають\n`;
                    }
                    readableReport += `- 🔗 [Посилання](${result.url})\n\n`;
                }
            });
        }
        
        fs.writeFileSync(path.join(__dirname, 'README_REPORT.md'), readableReport);
    }
}

// Запуск
const checker = new AliExpressChecker();
checker.runCheck().catch(console.error);
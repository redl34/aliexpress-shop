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

    // Парсинг вашого сайту - старий працюючий код з додаванням артикулу
    async parseYourSite() {
        const page = await this.browser.newPage();
        await page.goto('https://redl34.github.io/aliexpress-shop/mens-clothing1.html', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const products = await page.evaluate(() => {
            const items = [];
            const productElements = document.querySelectorAll('.product');
            
            productElements.forEach(product => {
                const titleElem = product.querySelector('.product-title');
                const priceElem = product.querySelector('.product-price');
                const imageElem = product.querySelector('.product-image');
                const buttonElem = product.querySelector('.buy-button');
                
                // Шукаємо артикул - шукаємо текст "арт." у всьому блоці товару
                let article = '';
                const productText = product.textContent;
                const articleMatch = productText.match(/арт\.\s*([^\s\n\r]+)/i);
                if (articleMatch) {
                    article = articleMatch[1]; // Беремо текст після "арт."
                }
                
                if (titleElem && priceElem && imageElem && buttonElem) {
                    items.push({
                        article: article || 'Артикул не знайдено', // Додаємо артикул
                        title: titleElem.innerText.trim(),
                        yourPrice: priceElem.innerText.trim(),
                        imageUrl: imageElem.src,
                        aliExpressUrl: buttonElem.href
                    });
                }
            });
            
            return items;
        });

        await page.close();
        return products;
    }

    // Парсинг AliExpress (старий працюючий код)
    async parseAliExpress(url) {
        const page = await this.browser.newPage();
        
        // Додаємо випадкову затримку
        await page.waitForTimeout(Math.random() * 3000 + 2000);
        
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // Очікуємо завантаження ціни
            await page.waitForSelector('[data-product-price], .product-price, .price--current', {
                timeout: 10000
            });

            const aliData = await page.evaluate(() => {
                // Спробуємо різні селектори для ціни
                const priceSelectors = [
                    '[data-product-price]',
                    '.product-price',
                    '.price--current',
                    '.uniform-banner-box-price',
                    '.snow-price_SnowPrice__mainM__jo8n2'
                ];
                
                let price = '';
                for (const selector of priceSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        price = element.innerText.trim();
                        break;
                    }
                }

                // Селектори для зображення
                const imageSelectors = [
                    '.main-image img',
                    '.gallery-img',
                    '.image-viewer img',
                    '.detail-gallery-img'
                ];
                
                let imageUrl = '';
                for (const selector of imageSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.src) {
                        imageUrl = element.src;
                        break;
                    }
                }

                return {
                    price: price,
                    imageUrl: imageUrl,
                    title: document.title
                };
            });

            await page.close();
            return aliData;
            
        } catch (error) {
            await page.close();
            console.log(`Помилка парсингу ${url}:`, error.message);
            return null;
        }
    }

    // Порівняння цін (старий працюючий код)
    comparePrices(yourPrice, aliPrice) {
        // Видаляємо всі символи крім цифр і крапки
        const extractPrice = (priceStr) => {
            if (!priceStr) return 0;
            const match = priceStr.replace(/[^\d.,]/g, '').match(/([\d.,]+)/);
            return match ? parseFloat(match[1].replace(',', '.')) : 0;
        };

        const your = extractPrice(yourPrice);
        const ali = extractPrice(aliPrice);

        if (your === 0 || ali === 0) {
            return { needsUpdate: false, difference: 0 };
        }

        const difference = Math.abs(your - ali);
        const percentageDiff = (difference / your) * 100;

        return {
            needsUpdate: percentageDiff > 5, // 5% допустима різниця
            yourPrice: your,
            aliPrice: ali,
            difference: difference,
            percentageDiff: percentageDiff.toFixed(2)
        };
    }

    // Порівняння зображень (старий працюючий код)
    async compareImages(img1Url, img2Url) {
        try {
            // Завантажуємо зображення
            const img1Buffer = await this.downloadImage(img1Url);
            const img2Buffer = await this.downloadImage(img2Url);

            if (!img1Buffer || !img2Buffer) {
                return false;
            }

            // Обробляємо зображення за допомогою Sharp
            const img1 = sharp(img1Buffer).resize(100, 100).grayscale();
            const img2 = sharp(img2Buffer).resize(100, 100).grayscale();

            // Отримуємо буфери
            const [img1Data, img2Data] = await Promise.all([
                img1.raw().toBuffer(),
                img2.raw().toBuffer()
            ]);

            // Обчислюємо середнє квадратичне відхилення
            let mse = 0;
            for (let i = 0; i < img1Data.length; i++) {
                mse += Math.pow(img1Data[i] - img2Data[i], 2);
            }
            mse /= img1Data.length;

            // Нормалізуємо MSE до 0-100
            const normalizedMse = mse / 255;

            return normalizedMse < 10; // Поріг схожості
        } catch (error) {
            console.log('Помилка порівняння зображень:', error.message);
            return false;
        }
    }

    async downloadImage(url) {
        try {
            const response = await axios({
                url: url,
                responseType: 'arraybuffer',
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            return null;
        }
    }

    // Головна функція перевірки з додаванням артикулу до результатів
    async runCheck() {
        console.log('🚀 Запуск перевірки цін...');
        await this.init();
        
        try {
            const yourProducts = await this.parseYourSite();
            console.log(`📦 Знайдено ${yourProducts.length} товарів на вашому сайті`);

            for (let i = 0; i < yourProducts.length; i++) {
                const product = yourProducts[i];
                console.log(`\n🔍 Перевіряємо товар ${i + 1}: ${product.title}`);
                console.log(`📋 Артикул: ${product.article}`);
                
                const aliData = await this.parseAliExpress(product.aliExpressUrl);
                
                if (aliData && aliData.price) {
                    // Порівняння цін
                    const priceCheck = this.comparePrices(product.yourPrice, aliData.price);
                    
                    // Порівняння зображень
                    const imagesMatch = await this.compareImages(product.imageUrl, aliData.imageUrl);
                    
                    this.results.push({
                        article: product.article, // Додаємо артикул до звіту
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

                    console.log(`💰 Ціна: ${product.yourPrice} vs ${aliData.price}`);
                    console.log(`📊 Різниця: ${priceCheck.percentageDiff}%`);
                    console.log(`🖼️ Зображення: ${imagesMatch ? '✓ Співпадають' : '✗ Різні'}`);
                    console.log(`🔄 Потрібно оновлення: ${priceCheck.needsUpdate || !imagesMatch ? 'ТАК' : 'НІ'}`);
                    
                } else {
                    console.log('❌ Не вдалося отримати дані з AliExpress');
                    this.results.push({
                        article: product.article, // Додаємо артикул навіть при помилці
                        product: product.title,
                        error: 'Не вдалося отримати дані з AliExpress',
                        checkedAt: new Date().toISOString()
                    });
                }

                // Затримка між запитами
                await new Promise(resolve => setTimeout(resolve, 5000));
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

        fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
        
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
                    console.log(`   📋 Артикул: ${result.article}`);
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
}

// Запуск
const checker = new AliExpressChecker();
checker.runCheck().catch(console.error);

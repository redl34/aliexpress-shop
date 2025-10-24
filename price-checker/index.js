const puppeteer = require('puppeteer');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class AliExpressChecker {
    constructor() {
        this.results = [];
        this.reportPath = path.join(__dirname, 'report.json');
        // Список всіх сторінок з товарами
        this.productPages = [
            'https://redl34.github.io/aliexpress-shop/mens-clothing1.html',
            'https://redl34.github.io/aliexpress-shop/mens-clothing2.html', 
            'https://redl34.github.io/aliexpress-shop/womens-clothing1.html',
            'https://redl34.github.io/aliexpress-shop/womens-clothing2.html',
            'https://redl34.github.io/aliexpress-shop/kids-clothing1.html',
            'https://redl34.github.io/aliexpress-shop/electronics1.html',
            'https://redl34.github.io/aliexpress-shop/home-garden1.html'
            // Додайте інші сторінки за необхідності
        ];
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    // Парсинг всіх сторінок з товарами
    async parseAllPages() {
        let allProducts = [];
        
        for (const pageUrl of this.productPages) {
            console.log(`🔍 Парсинг сторінки: ${pageUrl}`);
            try {
                const products = await this.parseSinglePage(pageUrl);
                allProducts = allProducts.concat(products);
                console.log(`✅ Знайдено товарів на сторінці: ${products.length}`);
            } catch (error) {
                console.log(`❌ Помилка парсингу сторінки ${pageUrl}:`, error.message);
            }
            
            // Затримка між сторінками
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return allProducts;
    }

    // Парсинг однієї сторінки - ВИПРАВЛЕНА ВЕРСІЯ
    async parseSinglePage(pageUrl) {
        const page = await this.browser.newPage();
        
        await page.goto(pageUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const products = await page.evaluate((url) => {
            const items = [];
            
            // Шукаємо всі блоки товарів
            const productElements = document.querySelectorAll('.product');
            
            productElements.forEach((product, index) => {
                try {
                    const titleElem = product.querySelector('.product-title');
                    const priceElem = product.querySelector('.product-price');
                    const imageElem = product.querySelector('.product-image');
                    const buttonElem = product.querySelector('.buy-button');
                    
                    // ПОКРАЩЕНИЙ ПОШУК АРТИКУЛУ - шукаємо тільки текст між "арт." і ціною
                    let article = '';
                    const productText = product.textContent || '';
                    
                    // Шукаємо "арт." і беремо тільки наступне слово (без пробілів)
                    const articleMatch = productText.match(/арт\.\s*([A-Za-z0-9]+)/i);
                    if (articleMatch) {
                        article = articleMatch[1].trim(); // Беремо тільки артикул без ціни
                    }

                    if (imageElem && titleElem && priceElem && buttonElem) {
                        items.push({
                            article: article || `ART_${index + 1}`,
                            title: titleElem.textContent.trim(),
                            yourPrice: priceElem.textContent.trim(), // Ціна з вашого сайту
                            yourPriceRaw: priceElem.textContent.trim(), // Додаємо окреме поле для ціни
                            imageUrl: imageElem.src,
                            aliExpressUrl: buttonElem.href,
                            pageUrl: url,
                            pageName: url.split('/').pop()
                        });
                    }
                    
                } catch (e) {
                    console.log('Помилка парсингу товару:', e);
                }
            });
            
            return items;
        }, pageUrl);

        await page.close();
        return products;
    }

    // Парсинг AliExpress - ОНОВЛЕНА ВЕРСІЯ
    async parseAliExpress(url) {
        const page = await this.browser.newPage();
        
        await page.waitForTimeout(Math.random() * 5000 + 3000);
        
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });

            // Додаємо більше селекторів для ціни
            await page.waitForSelector('[data-product-price], .product-price, .price--current, .snow-price_SnowPrice__mainM__jo8n2, .uniform-banner-box-price, [class*="price"]', {
                timeout: 15000
            });

            const aliData = await page.evaluate(() => {
                const priceSelectors = [
                    '[data-product-price]',
                    '.product-price',
                    '.price--current',
                    '.snow-price_SnowPrice__mainM__jo8n2',
                    '.uniform-banner-box-price',
                    '[class*="price"]'
                ];
                
                let price = 'Не знайдено';
                for (const selector of priceSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.innerText && element.innerText.trim()) {
                        price = element.innerText.trim();
                        break;
                    }
                }

                // Спрощуємо пошук зображення
                const imageElem = document.querySelector('img');
                let imageUrl = imageElem ? imageElem.src : '';

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

    // Порівняння цін
    comparePrices(yourPrice, aliPrice) {
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
            needsUpdate: percentageDiff > 5,
            yourPrice: your,
            aliPrice: ali,
            difference: difference,
            percentageDiff: percentageDiff.toFixed(2)
        };
    }

    // Порівняння зображень
    async compareImages(img1Url, img2Url) {
        try {
            const img1Buffer = await this.downloadImage(img1Url);
            const img2Buffer = await this.downloadImage(img2Url);

            if (!img1Buffer || !img2Buffer) {
                return false;
            }

            const img1 = sharp(img1Buffer).resize(100, 100).grayscale();
            const img2 = sharp(img2Buffer).resize(100, 100).grayscale();

            const [img1Data, img2Data] = await Promise.all([
                img1.raw().toBuffer(),
                img2.raw().toBuffer()
            ]);

            let mse = 0;
            for (let i = 0; i < img1Data.length; i++) {
                mse += Math.pow(img1Data[i] - img2Data[i], 2);
            }
            mse /= img1Data.length;

            const normalizedMse = mse / 255;
            return normalizedMse < 10;
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

    // Головна функція перевірки
    async runCheck() {
        console.log('🚀 Запуск перевірки цін...');
        await this.init();
        
        try {
            console.log(`📄 Перевіряємо ${this.productPages.length} сторінок з товарами`);
            const yourProducts = await this.parseAllPages();
            console.log(`📦 Всього знайдено ${yourProducts.length} товарів`);

            for (let i = 0; i < yourProducts.length; i++) {
                const product = yourProducts[i];
                console.log(`\n🔍 Перевіряємо товар ${i + 1}/${yourProducts.length}:`);
                console.log(`   Назва: ${product.title}`);
                console.log(`   Артикул: ${product.article}`);
                console.log(`   Сторінка: ${product.pageName}`);
                
                const aliData = await this.parseAliExpress(product.aliExpressUrl);
                
                if (aliData && aliData.price) {
                    const priceCheck = this.comparePrices(product.yourPrice, aliData.price);
                    const imagesMatch = await this.compareImages(product.imageUrl, aliData.imageUrl);
                    
                    // ОНОВЛЕНА СТРУКТУРА РЕЗУЛЬТАТУ
                    this.results.push({
                        article: product.article,
                        product: product.title,
                        yourPrice: product.yourPrice, // Ціна з вашого сайту
                        yourPriceRaw: product.yourPriceRaw, // Додаємо окреме поле для ціни
                        aliPrice: aliData.price, // Ціна з AliExpress
                        priceCheck,
                        imagesMatch,
                        needsUpdate: priceCheck.needsUpdate || !imagesMatch,
                        yourImage: product.imageUrl,
                        aliImage: aliData.imageUrl,
                        url: product.aliExpressUrl,
                        pageUrl: product.pageUrl,
                        pageName: product.pageName,
                        checkedAt: new Date().toISOString()
                    });

                    console.log(`   💰 Ціна на сайті: ${product.yourPrice}`);
                    console.log(`   💰 Ціна на AliExpress: ${aliData.price}`);
                    console.log(`   📊 Різниця: ${priceCheck.percentageDiff}%`);
                    console.log(`   🖼️ Зображення: ${imagesMatch ? '✓ Співпадають' : '✗ Різні'}`);
                    console.log(`   🔄 Оновлення: ${priceCheck.needsUpdate || !imagesMatch ? 'ТАК' : 'НІ'}`);
                    
                } else {
                    console.log('   ❌ Не вдалося отримати дані з AliExpress');
                    this.results.push({
                        article: product.article,
                        product: product.title,
                        pageUrl: product.pageUrl,
                        pageName: product.pageName,
                        error: 'Не вдалося отримати дані з AliExpress',
                        checkedAt: new Date().toISOString()
                    });
                }

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
            pagesChecked: this.productPages.length,
            results: this.results
        };

        fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 ===== ЗВІТ ПЕРЕВІРКИ =====');
        console.log(`📄 Перевірено сторінок: ${report.pagesChecked}`);
        console.log(`📦 Всього товарів: ${report.totalProducts}`);
        console.log(`✅ Успішно перевірено: ${report.successCount}`);
        console.log(`🔴 Потребують оновлення: ${report.needsUpdate}`);
        
        if (report.needsUpdate > 0) {
            console.log('\n📋 Список товарів для оновлення:');
            this.results.forEach((result, index) => {
                if (result.needsUpdate) {
                    console.log(`\n${index + 1}. ${result.product}`);
                    console.log(`   📋 Артикул: ${result.article}`);
                    console.log(`   📄 Сторінка: ${result.pageName}`);
                    console.log(`   💰 Ціна на сайті: ${result.yourPrice}`);
                    console.log(`   💰 Ціна на AliExpress: ${result.aliPrice}`);
                    if (result.priceCheck && result.priceCheck.needsUpdate) {
                        console.log(`   📊 Різниця: ${result.priceCheck.percentageDiff}%`);
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

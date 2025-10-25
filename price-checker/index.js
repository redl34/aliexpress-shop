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
            'https://redl34.github.io/aliexpress-shop/mens-clothing1.html'
            // Додайте інші сторінки коли буде готово
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
        
        console.log(`📄 Завантаження сторінки: ${pageUrl}`);
        await page.goto(pageUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const products = await page.evaluate((url) => {
            const items = [];
            
            // Шукаємо всі блоки товарів за класом .product-card
            const productElements = document.querySelectorAll('.product-card');
            console.log(`Знайдено .product-card елементів: ${productElements.length}`);
            
            productElements.forEach((product, index) => {
                try {
                    // Отримуємо дані з правильних селекторів
                    const titleElem = product.querySelector('.product-details h3');
                    const priceElem = product.querySelector('.product-details .price');
                    const articleElem = product.querySelector('.product-details .articul');
                    const imageElem = product.querySelector('.carousel-image.active');
                    const buttonElem = product.querySelector('.product-details a[href*="aliexpress"]');
                    
                    // Отримуємо артикул з data-атрибуту
                    const dataArticle = product.getAttribute('data-articul');
                    
                    // Отримуємо артикул з тексту
                    let articleFromText = '';
                    if (articleElem) {
                        const articleText = articleElem.textContent || '';
                        const articleMatch = articleText.match(/арт\.\s*([A-Za-z0-9]+)/i);
                        if (articleMatch) {
                            articleFromText = articleMatch[1].trim();
                        }
                    }
                    
                    // Використовуємо data-атрибут або текст
                    const article = dataArticle || articleFromText || `ART_${index + 1}`;

                    if (titleElem && priceElem && imageElem && buttonElem) {
                        const productData = {
                            article: article,
                            title: titleElem.textContent.trim(),
                            yourPrice: priceElem.textContent.trim(),
                            imageUrl: imageElem.src,
                            aliExpressUrl: buttonElem.href,
                            pageUrl: url,
                            pageName: url.split('/').pop()
                        };
                        
                        console.log(`✅ Товар ${index + 1}:`, {
                            article: productData.article,
                            title: productData.title,
                            price: productData.yourPrice
                        });
                        
                        items.push(productData);
                    } else {
                        console.log(`❌ Товар ${index + 1} не має всіх необхідних елементів:`, {
                            title: !!titleElem,
                            price: !!priceElem,
                            image: !!imageElem,
                            button: !!buttonElem
                        });
                    }
                    
                } catch (e) {
                    console.log(`❌ Помилка парсингу товару ${index + 1}:`, e);
                }
            });
            
            console.log(`📊 Всього знайдено товарів: ${items.length}`);
            return items;
        }, pageUrl);

        await page.close();
        return products;
    }

    // Парсинг AliExpress - ПОКРАЩЕНА ВЕРСІЯ
    async parseAliExpress(url) {
        const page = await this.browser.newPage();
        
        console.log(`🔗 Перехід на AliExpress: ${url}`);
        await page.waitForTimeout(Math.random() * 5000 + 3000);
        
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });

            // Чекаємо на завантаження ціни
            await page.waitForSelector('[data-product-price], .product-price, .price--current, .uniform-banner-box-price, [class*="price"]', {
                timeout: 15000
            }).catch(() => {
                console.log('⚠️ Не знайдено селекторів ціни, спробуємо знайти будь-яку ціну');
            });

            const aliData = await page.evaluate(() => {
                // Список селекторів для пошуку ціни
                const priceSelectors = [
                    '[data-product-price]',
                    '.product-price',
                    '.price--current',
                    '.uniform-banner-box-price',
                    '.snow-price_SnowPrice__mainM__jo8n2',
                    '[class*="price"]'
                ];
                
                let price = 'Не знайдено';
                for (const selector of priceSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.trim()) {
                        const priceText = element.textContent.trim();
                        // Перевіряємо, чи текст містить цифри (ціну)
                        if (/\d/.test(priceText)) {
                            price = priceText;
                            console.log(`✅ Знайдено ціну за селектором ${selector}: ${price}`);
                            break;
                        }
                    }
                }

                // Спрощений пошук зображення
                let imageUrl = '';
                const imageSelectors = [
                    '.main-image img',
                    '.gallery-img',
                    '.image-viewer img',
                    'img[src*="jpg"], img[src*="png"], img[src*="jpeg"]'
                ];
                
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
                    title: document.title,
                    url: window.location.href
                };
            });

            console.log(`✅ Отримано дані з AliExpress: ${aliData.price}`);
            await page.close();
            return aliData;
            
        } catch (error) {
            console.log(`❌ Помилка парсингу AliExpress ${url}:`, error.message);
            await page.close();
            return null;
        }
    }

    // Порівняння цін
    comparePrices(yourPrice, aliPrice) {
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
                error: 'Не вдалося отримати ціну для порівняння'
            };
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
            if (!img1Url || !img2Url) {
                console.log('❌ Одна з URL зображень відсутня');
                return false;
            }

            const img1Buffer = await this.downloadImage(img1Url);
            const img2Buffer = await this.downloadImage(img2Url);

            if (!img1Buffer || !img2Buffer) {
                console.log('❌ Не вдалося завантажити зображення для порівняння');
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
            const result = normalizedMse < 10;
            console.log(`🖼️ Порівняння зображень: ${result ? 'Схожі' : 'Різні'} (MSE: ${normalizedMse.toFixed(2)})`);
            return result;

        } catch (error) {
            console.log('❌ Помилка порівняння зображень:', error.message);
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
            console.log(`❌ Помилка завантаження зображення ${url}:`, error.message);
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
                console.log(`   Ціна на сайті: ${product.yourPrice}`);
                console.log(`   Сторінка: ${product.pageName}`);
                
                const aliData = await this.parseAliExpress(product.aliExpressUrl);
                
                if (aliData && aliData.price && aliData.price !== 'Не знайдено') {
                    const priceCheck = this.comparePrices(product.yourPrice, aliData.price);
                    const imagesMatch = await this.compareImages(product.imageUrl, aliData.imageUrl);
                    
                    this.results.push({
                        article: product.article,
                        product: product.title,
                        yourPrice: product.yourPrice,
                        aliPrice: aliData.price,
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

                    console.log(`   💰 Ціна на AliExpress: ${aliData.price}`);
                    console.log(`   📊 Різниця: ${priceCheck.percentageDiff}%`);
                    console.log(`   🖼️ Зображення: ${imagesMatch ? '✓ Співпадають' : '✗ Різні'}`);
                    console.log(`   🔄 Потрібно оновлення: ${priceCheck.needsUpdate || !imagesMatch ? 'ТАК' : 'НІ'}`);
                    
                } else {
                    console.log('   ❌ Не вдалося отримати дані з AliExpress');
                    this.results.push({
                        article: product.article,
                        product: product.title,
                        yourPrice: product.yourPrice,
                        pageUrl: product.pageUrl,
                        pageName: product.pageName,
                        error: 'Не вдалося отримати дані з AliExpress',
                        aliError: aliData ? 'Ціну не знайдено' : 'Помилка завантаження сторінки',
                        checkedAt: new Date().toISOString()
                    });
                }

                // Затримка між перевірками товарів
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
                    if (result.priceCheck.needsUpdate) {
                        console.log(`   💰 Ціна: ${result.yourPrice} → ${result.aliPrice} (різниця: ${result.priceCheck.percentageDiff}%)`);
                    }
                    if (!result.imagesMatch) {
                        console.log(`   🖼️  Зображення не співпадають`);
                    }
                }
            });
        }
        
        // Показуємо товари з помилками
        const errorResults = this.results.filter(r => r.error);
        if (errorResults.length > 0) {
            console.log('\n❌ Товари з помилками:');
            errorResults.forEach((result, index) => {
                console.log(`\n${index + 1}. ${result.product}`);
                console.log(`   📋 Артикул: ${result.article}`);
                console.log(`   💰 Ціна на сайті: ${result.yourPrice}`);
                console.log(`   ❌ Помилка: ${result.error}`);
                if (result.aliError) {
                    console.log(`   🔗 Деталі: ${result.aliError}`);
                }
            });
        }
    }
}

// Запуск
const checker = new AliExpressChecker();
checker.runCheck().catch(console.error);

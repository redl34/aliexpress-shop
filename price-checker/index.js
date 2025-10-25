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
            // Додаємо заголовки для обходу блокування
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // Чекаємо на завантаження сторінки
            await page.waitForTimeout(5000);

            const aliData = await page.evaluate(() => {
                // ПОКРАЩЕНИЙ ПОШУК ЦІНИ
                let price = 'Не знайдено';
                
                // Список селекторів для пошуку актуальної ціни
                const priceSelectors = [
                    '.product-price-value',
                    '.price--current',
                    '.uniform-banner-box-price',
                    '[data-product-price]',
                    '.snow-price_SnowPrice__mainM__jo8n2',
                    '.snow-price_SnowPrice__main__1pOJ_',
                    '.product-price-current'
                ];
                
                for (const selector of priceSelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        if (element && element.textContent) {
                            const text = element.textContent.trim();
                            // Шукаємо числове значення ціни
                            const priceMatch = text.match(/[£$€]?(\d+\.?\d*)/);
                            if (priceMatch) {
                                price = text;
                                console.log(`✅ Знайдено ціну: ${price}`);
                                break;
                            }
                        }
                    }
                    if (price !== 'Не знайдено') break;
                }

                // ПОКРАЩЕНИЙ ПОШУК ЗОБРАЖЕННЯ
                let imageUrl = '';
                const imageSelectors = [
                    '.magnifier-image',
                    '.main-image img',
                    '.gallery-image img',
                    '.detail-gallery-img',
                    '.image-viewer img',
                    '[class*="image"] img',
                    'img[src*="jpg"], img[src*="png"], img[src*="jpeg"]'
                ];
                
                for (const selector of imageSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.src && !element.src.includes('blank') && !element.src.includes('placeholder')) {
                        imageUrl = element.src;
                        if (imageUrl.startsWith('//')) {
                            imageUrl = 'https:' + imageUrl;
                        }
                        console.log(`✅ Знайдено зображення: ${imageUrl.substring(0, 50)}...`);
                        break;
                    }
                }

                // Визначаємо валюту
                let currency = 'UAH';
                if (price.includes('£')) currency = 'GBP';
                if (price.includes('$')) currency = 'USD';
                if (price.includes('€')) currency = 'EUR';

                return {
                    price: price,
                    imageUrl: imageUrl,
                    currency: currency,
                    title: document.title,
                    url: window.location.href
                };
            });

            console.log(`✅ Отримано дані з AliExpress: ${aliData.price} (${aliData.currency})`);
            await page.close();
            return aliData;
            
        } catch (error) {
            console.log(`❌ Помилка парсингу AliExpress ${url}:`, error.message);
            await page.close();
            return null;
        }
    }

    // Порівняння цін з конвертацією валют
    comparePrices(yourPrice, aliPrice, aliCurrency) {
        const extractPrice = (priceStr) => {
            if (!priceStr || priceStr === 'Не знайдено') return 0;
            const match = priceStr.replace(/[^\d.,]/g, '').match(/([\d.,]+)/);
            return match ? parseFloat(match[1].replace(',', '.')) : 0;
        };

        const your = extractPrice(yourPrice);
        let ali = extractPrice(aliPrice);

        // Конвертація валют (приблизні курси)
        const exchangeRates = {
            'GBP': 45,  // Фунт до гривні
            'USD': 38,   // Долар до гривні  
            'EUR': 41,   // Євро до гривні
            'UAH': 1     // Гривня до гривні
        };

        // Конвертуємо ціну з AliExpress в гривні
        if (aliCurrency && aliCurrency !== 'UAH' && exchangeRates[aliCurrency]) {
            ali = ali * exchangeRates[aliCurrency];
            console.log(`💰 Конвертація: ${aliPrice} ${aliCurrency} → ${ali.toFixed(2)} UAH`);
        }

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
            needsUpdate: percentageDiff > 10, // Збільшимо поріг до 10%
            yourPrice: your,
            aliPrice: ali,
            aliPriceOriginal: aliPrice,
            aliCurrency: aliCurrency,
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
                    const priceCheck = this.comparePrices(product.yourPrice, aliData.price, aliData.currency);
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

                    console.log(`   💰 Ціна на AliExpress: ${aliData.price} (${aliData.currency})`);
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

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

    // Парсинг вашого сайту
    async parseYourSite() {
        const page = await this.browser.newPage();
        
        // Додаємо логування для налагодження
        page.on('console', msg => {
            console.log('PAGE LOG:', msg.text());
        });

        await page.goto('https://redl34.github.io/aliexpress-shop/mens-clothing1.html', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Чекаємо завантаження товарів
        await page.waitForSelector('.product, [class*="product"], .item, .card', {
            timeout: 10000
        }).catch(() => {
            console.log('⚠️ Не знайдено основних селекторів товарів');
        });

        const products = await page.evaluate(() => {
            const items = [];
            
            // Спроба 1: Шукаємо всі можливі контейнери товарів
            const possibleSelectors = [
                '.product',
                '.item', 
                '.card',
                '.goods',
                '[class*="product"]',
                '[class*="item"]',
                '[class*="card"]'
            ];
            
            let productElements = [];
            
            for (const selector of possibleSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`✅ Знайдено елементів з селектором ${selector}:`, elements.length);
                    productElements = Array.from(elements);
                    break;
                }
            }
            
            // Якщо не знайшли, шукаємо будь-які блоки з зображеннями та цінами
            if (productElements.length === 0) {
                console.log('🔍 Шукаємо будь-які елементи з зображеннями...');
                const allElements = document.querySelectorAll('div, article, section');
                productElements = Array.from(allElements).filter(el => {
                    return el.querySelector('img') && el.querySelector('[class*="price"]');
                });
                console.log('✅ Знайдено елементів з зображеннями та цінами:', productElements.length);
            }

            productElements.forEach((product, index) => {
                try {
                    console.log(`\n🔍 Аналіз елемента ${index + 1}:`, product);
                    
                    // Шукаємо назву товару
                    const titleSelectors = [
                        '.product-title',
                        '.title',
                        '.name',
                        'h2', 'h3', 'h4',
                        '[class*="title"]',
                        '[class*="name"]'
                    ];
                    
                    let titleElem = null;
                    for (const selector of titleSelectors) {
                        titleElem = product.querySelector(selector);
                        if (titleElem && titleElem.textContent.trim()) {
                            break;
                        }
                    }
                    
                    // Шукаємо ціну
                    const priceSelectors = [
                        '.product-price',
                        '.price',
                        '.cost',
                        '[class*="price"]',
                        '[class*="cost"]'
                    ];
                    
                    let priceElem = null;
                    for (const selector of priceSelectors) {
                        priceElem = product.querySelector(selector);
                        if (priceElem && priceElem.textContent.trim()) {
                            break;
                        }
                    }
                    
                    // Шукаємо зображення
                    const imageElem = product.querySelector('img');
                    
                    // Шукаємо кнопку купити
                    const buttonSelectors = [
                        '.buy-button',
                        '.buy-now',
                        '.btn-buy',
                        'a[href*="aliexpress"]',
                        'a[href*="alibaba"]',
                        'button',
                        'a'
                    ];
                    
                    let buttonElem = null;
                    for (const selector of buttonSelectors) {
                        buttonElem = product.querySelector(selector);
                        if (buttonElem && buttonElem.href && buttonElem.href.includes('aliexpress')) {
                            break;
                        }
                    }
                    
                    // Шукаємо артикул
                    let article = '';
                    const articleSelectors = [
                        '.article',
                        '.sku',
                        '.product-id',
                        '[class*="article"]',
                        '[class*="sku"]',
                        '[class*="id"]'
                    ];
                    
                    for (const selector of articleSelectors) {
                        const articleElem = product.querySelector(selector);
                        if (articleElem && articleElem.textContent.trim()) {
                            article = articleElem.textContent.trim();
                            break;
                        }
                    }
                    
                    // Якщо знайшли мінімум зображення та назву/ціну
                    if (imageElem && (titleElem || priceElem)) {
                        const productData = {
                            article: article || `ITEM_${index + 1}`,
                            title: titleElem ? titleElem.textContent.trim() : 'Без назви',
                            yourPrice: priceElem ? priceElem.textContent.trim() : 'Ціна не вказана',
                            imageUrl: imageElem.src,
                            aliExpressUrl: buttonElem ? buttonElem.href : '',
                            elementIndex: index
                        };
                        
                        console.log('✅ Знайдено товар:', productData);
                        items.push(productData);
                    } else {
                        console.log('❌ Елемент не містить достатньо даних');
                    }
                    
                } catch (e) {
                    console.log('❌ Помилка парсингу товару:', e);
                }
            });
            
            console.log(`📊 Всього знайдено товарів: ${items.length}`);
            return items;
        });

        await page.close();
        return products;
    }

    // Парсинг AliExpress (залишаємо без змін)
    async parseAliExpress(url) {
        const page = await this.browser.newPage();
        
        await page.waitForTimeout(Math.random() * 5000 + 3000);
        
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 45000
            });

            await page.waitForSelector('[data-product-price], .product-price, .price--current, .snow-price_SnowPrice__mainM__jo8n2', {
                timeout: 15000
            });

            const aliData = await page.evaluate(() => {
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

    // Порівняння цін (залишаємо без змін)
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
                needsUpdate: percentageDiff > 10,
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

    // Порівняння зображень (залишаємо без змін)
    async compareImages(img1Url, img2Url) {
        try {
            if (!img1Url || !img2Url) return false;

            const img1Buffer = await this.downloadImage(img1Url);
            const img2Buffer = await this.downloadImage(img2Url);

            if (!img1Buffer || !img2Buffer) {
                return false;
            }

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

            return mse < 20;
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

    // Головна функція перевірки
    async runCheck() {
        console.log('🚀 Запуск перевірки цін...');
        await this.init();
        
        try {
            const yourProducts = await this.parseYourSite();
            console.log(`📦 Знайдено ${yourProducts.length} товарів на вашому сайті`);

            for (let i = 0; i < yourProducts.length; i++) {
                const product = yourProducts[i];
                console.log(`\n🔍 Перевіряємо [${i + 1}/${yourProducts.length}]: ${product.title}`);
                console.log(`📋 Артикул: ${product.article}`);
                
                const aliData = await this.parseAliExpress(product.aliExpressUrl);
                
                if (aliData) {
                    const priceCheck = this.comparePrices(product.yourPrice, aliData.price);
                    const imagesMatch = await this.compareImages(product.imageUrl, aliData.imageUrl);
                    
                    this.results.push({
                        article: product.article, // Додаємо артикул до результату
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
                        article: product.article, // Додаємо артикул навіть при помилці
                        product: product.title,
                        error: 'Не вдалося отримати дані з AliExpress',
                        checkedAt: new Date().toISOString()
                    });
                }

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

        fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 ===== ЗВІТ ПЕРЕВІРКИ =====');
        console.log(`📦 Всього товарів: ${report.totalProducts}`);
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

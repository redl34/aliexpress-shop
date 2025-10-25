const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class SimplePriceChecker {
    constructor() {
        this.results = [];
        this.reportPath = path.join(__dirname, 'simple-report.json');
        this.productPages = [
            'https://redl34.github.io/aliexpress-shop/mens-clothing1.html'
        ];
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: "new", // Виправляємо попередження
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async parseAllPages() {
        let allProducts = [];
        
        for (const pageUrl of this.productPages) {
            console.log(`🔍 Парсинг сторінки: ${pageUrl}`);
            const products = await this.parseSinglePage(pageUrl);
            allProducts = allProducts.concat(products);
            console.log(`✅ Знайдено товарів: ${products.length}`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return allProducts;
    }

    async parseSinglePage(pageUrl) {
        const page = await this.browser.newPage();
        
        await page.goto(pageUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const products = await page.evaluate((url) => {
            const items = [];
            const productElements = document.querySelectorAll('.product-card');
            
            console.log(`Знайдено .product-card елементів: ${productElements.length}`);
            
            productElements.forEach((product, index) => {
                try {
                    // ПОКРАЩЕНИЙ ПОШУК НАЗВИ
                    const titleSelectors = ['h3', '.product-details h3', '[class*="title"]'];
                    let titleElem = null;
                    
                    for (const selector of titleSelectors) {
                        titleElem = product.querySelector(selector);
                        if (titleElem && titleElem.textContent && titleElem.textContent.trim()) {
                            break;
                        }
                    }
                    
                    const priceElem = product.querySelector('.product-details .price');
                    const articleElem = product.querySelector('.product-details .articul');
                    const buttonElem = product.querySelector('.product-details a[href*="aliexpress"]');
                    
                    // Отримуємо артикул
                    const dataArticle = product.getAttribute('data-articul');
                    
                    let articleFromText = '';
                    if (articleElem) {
                        const articleText = articleElem.textContent || '';
                        const articleMatch = articleText.match(/арт\.\s*([A-Za-z0-9]+)/i);
                        if (articleMatch) {
                            articleFromText = articleMatch[1].trim();
                        }
                    }
                    
                    const article = dataArticle || articleFromText || `ART_${index + 1}`;
                    const title = titleElem ? titleElem.textContent.trim() : 'Без назви';

                    if (priceElem && buttonElem) {
                        console.log(`✅ Товар ${index + 1}: "${title}" (${article})`);
                        
                        items.push({
                            article: article,
                            title: title,
                            yourPrice: priceElem.textContent.trim(),
                            aliExpressUrl: buttonElem.href,
                            pageUrl: url,
                            pageName: url.split('/').pop(),
                            checkDate: new Date().toLocaleString('uk-UA')
                        });
                    } else {
                        console.log(`❌ Товар ${index + 1} не має ціни або посилання`);
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

    async runCheck() {
        console.log('🚀 Запуск спрощеної перевірки...');
        await this.init();
        
        try {
            const products = await this.parseAllPages();
            
            const report = {
                generatedAt: new Date().toISOString(),
                totalProducts: products.length,
                pagesChecked: this.productPages.length,
                note: 'Ця система тільки збирає дані з вашого сайту. Ціни на AliExpress потрібно перевіряти вручну.',
                instruction: 'Відкрийте посилання на AliExpress і порівняйте ціни вручну',
                results: products
            };
            
            fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
            
            console.log('\n📊 ===== ЗВІТ =====');
            console.log(`📦 Всього товарів: ${products.length}`);
            console.log(`📄 Перевірено сторінок: ${this.productPages.length}`);
            console.log(`📁 Звіт збережено: simple-report.json`);
            console.log('\n💡 Що робити далі:');
            console.log('1. Відкрийте simple-report.json');
            console.log('2. Перейдіть за посиланнями на AliExpress');
            console.log('3. Порівняйте ціни вручну');
            console.log('4. Оновіть ціни на вашому сайті при необхідності');
            
            // Показуємо товари
            console.log('\n📋 Список товарів для перевірки:');
            products.forEach((product, index) => {
                console.log(`${index + 1}. ${product.title}`);
                console.log(`   📋 Артикул: ${product.article}`);
                console.log(`   💰 Ваша ціна: ${product.yourPrice}`);
                console.log(`   🔗 Посилання: ${product.aliExpressUrl}`);
                console.log('');
            });
            
        } catch (error) {
            console.error('💥 Помилка:', error);
        } finally {
            await this.browser.close();
        }
    }
}

// Запуск
const checker = new SimplePriceChecker();
checker.runCheck().catch(console.error);
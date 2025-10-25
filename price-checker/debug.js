const puppeteer = require('puppeteer');

async function debugPage() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('🔍 Аналіз сторінки mens-clothing1.html...');
    await page.goto('https://redl34.github.io/aliexpress-shop/mens-clothing1.html', {
        waitUntil: 'networkidle2',
        timeout: 30000
    });

    // Отримуємо всю структуру сторінки
    const pageStructure = await page.evaluate(() => {
        const structure = {
            title: document.title,
            totalElements: document.querySelectorAll('*').length,
            products: document.querySelectorAll('.product').length,
            items: document.querySelectorAll('.item').length,
            cards: document.querySelectorAll('.card').length,
            
            // Знаходимо всі елементи з класом, що містить "product"
            allProductElements: Array.from(document.querySelectorAll('[class*="product"]')).map(el => ({
                className: el.className,
                tagName: el.tagName,
                text: el.textContent?.substring(0, 100) || '',
                hasImage: !!el.querySelector('img'),
                hasButton: !!el.querySelector('button, a[href*="aliexpress"]'),
                hasPrice: el.textContent?.includes('грн') || el.textContent?.includes('₴')
            })),
            
            // Знаходимо всі зображення
            images: Array.from(document.querySelectorAll('img')).map(img => ({
                src: img.src,
                className: img.className,
                parentClass: img.parentElement?.className || ''
            })),
            
            // Знаходимо всі кнопки
            buttons: Array.from(document.querySelectorAll('button, a')).map(btn => ({
                text: btn.textContent?.trim(),
                href: btn.href,
                className: btn.className
            })).filter(btn => btn.text && btn.text.length > 0),
            
            // Знаходимо всі ціни
            prices: Array.from(document.querySelectorAll('*')).filter(el => {
                const text = el.textContent || '';
                return text.includes('грн') || text.includes('₴') || /\d+\.\d+/.test(text);
            }).map(el => ({
                text: el.textContent?.trim(),
                className: el.className,
                tagName: el.tagName
            }))
        };
        
        return structure;
    });

    console.log('\n📊 РЕЗУЛЬТАТИ АНАЛІЗУ:');
    console.log('📄 Заголовок сторінки:', pageStructure.title);
    console.log('🔢 Всього елементів:', pageStructure.totalElements);
    console.log('🛍️ Елементів .product:', pageStructure.products);
    console.log('🛍️ Елементів .item:', pageStructure.items);
    console.log('🛍️ Елементів .card:', pageStructure.cards);
    
    console.log('\n🔍 Елементи з "product" у класі:');
    pageStructure.allProductElements.forEach((el, index) => {
        console.log(`  ${index + 1}. Клас: "${el.className}"`);
        console.log(`     Тег: ${el.tagName}, Зображення: ${el.hasImage}, Кнопка: ${el.hasButton}, Ціна: ${el.hasPrice}`);
        console.log(`     Текст: "${el.text}"`);
    });
    
    console.log('\n🖼️ Знайдені зображення:');
    pageStructure.images.forEach((img, index) => {
        if (index < 5) { // Показуємо тільки перші 5
            console.log(`  ${index + 1}. src: ${img.src}`);
            console.log(`     class: "${img.className}", parent: "${img.parentClass}"`);
        }
    });
    
    console.log('\n💰 Знайдені ціни:');
    pageStructure.prices.forEach((price, index) => {
        if (index < 10) { // Показуємо тільки перші 10
            console.log(`  ${index + 1}. "${price.text}"`);
            console.log(`     class: "${price.className}", tag: ${price.tagName}`);
        }
    });
    
    console.log('\n🔗 Кнопки та посилання:');
    pageStructure.buttons.forEach((btn, index) => {
        if (index < 10) { // Показуємо тільки перші 10
            console.log(`  ${index + 1}. "${btn.text}" -> ${btn.href}`);
            console.log(`     class: "${btn.className}"`);
        }
    });

    await browser.close();
}

debugPage().catch(console.error);

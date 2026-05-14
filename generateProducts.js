const fs = require('fs');
const path = require('path');

function getHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getHtmlFiles(filePath));
        } else if (file.endsWith('.html') && !file.includes('search')) {
            results.push(filePath);
        }
    });
    return results;
}

function extractProduct(cardHtml) {
    // Шукаємо артикул
    const articulMatch = /data-articul="([^"]+)"/.exec(cardHtml);
    if (!articulMatch) return null;
    const articul = articulMatch[1];
    
    // Шукаємо назву товару
    const titleMatch = /<h3>([^<]+)<\/h3>/.exec(cardHtml);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Шукаємо опис товару (звичайний тег p після h3)
    let description = '';
    const h3ClosePos = cardHtml.indexOf('</h3>');
    if (h3ClosePos !== -1) {
        const pOpenPos = cardHtml.indexOf('<p>', h3ClosePos);
        if (pOpenPos !== -1) {
            const pClosePos = cardHtml.indexOf('</p>', pOpenPos);
            if (pClosePos !== -1) {
                description = cardHtml.substring(pOpenPos + 3, pClosePos).trim();
            }
        }
    }
    
    // Шукаємо ціну
    const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(cardHtml);
    const price = priceMatch ? priceMatch[1].trim() : '';
    
    // Шукаємо всі зображення
    const images = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(cardHtml)) !== null) {
        images.push(imgMatch[1]);
    }
    
    // Шукаємо посилання
    const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(cardHtml);
    const link = linkMatch ? linkMatch[1] : '';
    
    return { articul, title, description, price, images, link };
}

function main() {
    const allProducts = [];
    const rootDir = '.';
    const htmlFiles = getHtmlFiles(rootDir);
    
    htmlFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        let startIdx = 0;
        
        while (true) {
            // Знаходимо початок картки
            const cardStart = content.indexOf('<div class="product-card"', startIdx);
            if (cardStart === -1) break;
            
            // Знаходимо кінець картки: шукаємо закриття div.product-card
            // Кожна картка закривається двома закриваючими div: один для product-details, один для product-card
            let divCount = 0;
            let cardEnd = cardStart;
            let found = false;
            
            for (let i = cardStart; i < content.length; i++) {
                if (content.substr(i, 5) === '<div ') {
                    divCount++;
                    i += 4;
                } else if (content.substr(i, 6) === '</div>') {
                    divCount--;
                    if (divCount === 0) {
                        cardEnd = i + 6;
                        found = true;
                        break;
                    }
                    i += 5;
                }
            }
            
            if (!found) break;
            
            // Витягуємо HTML картки
            const cardHtml = content.substring(cardStart, cardEnd);
            const product = extractProduct(cardHtml);
            
            if (product && product.articul) {
                let category = 'other';
                if (filePath.includes('electronics')) category = 'electronics';
                else if (filePath.includes('clothing') || filePath.includes('Men\'s_clothing') || filePath.includes('Women\'s_clothing')) category = 'clothing';
                else if (filePath.includes('garden')) category = 'garden';
                allProducts.push({ ...product, category, sourceFile: path.basename(filePath) });
                console.log(`Знайдено: ${product.articul} - ${product.title} (${path.basename(filePath)})`);
            }
            
            startIdx = cardEnd;
        }
    });
    
    // Сортуємо товари за артикулом
    allProducts.sort((a, b) => a.articul.localeCompare(b.articul));
    
    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\n✅ Згенеровано ${allProducts.length} товарів з ${htmlFiles.length} файлів`);
    
    // Виводимо статистику по категоріях
    const categories = {};
    allProducts.forEach(p => {
        categories[p.category] = (categories[p.category] || 0) + 1;
    });
    console.log('📊 Статистика за категоріями:', categories);
}

main();

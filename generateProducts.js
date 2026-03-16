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

function extractBetween(text, startMarker, endMarker) {
    const startIdx = text.indexOf(startMarker);
    if (startIdx === -1) return '';
    const contentStart = startIdx + startMarker.length;
    const endIdx = text.indexOf(endMarker, contentStart);
    if (endIdx === -1) return '';
    return text.substring(contentStart, endIdx).trim();
}

function extractProduct(cardHtml) {
    // Артикул
    const articulMatch = /data-articul="([^"]+)"/.exec(cardHtml);
    const articul = articulMatch ? articulMatch[1] : '';
    
    // Назва
    const title = extractBetween(cardHtml, '<h3>', '</h3>');
    
    // Опис (перший <p> без класу)
    const descMatch = /<p>([^<]+)<\/p>/.exec(cardHtml);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Ціна
    const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(cardHtml);
    const price = priceMatch ? priceMatch[1].trim() : '';
    
    // Зображення
    const images = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(cardHtml)) !== null) {
        images.push(imgMatch[1]);
    }
    
    // Посилання
    const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(cardHtml);
    const link = linkMatch ? linkMatch[1] : '';
    
    return { articul, title, description, price, images, link };
}

function main() {
    const allProducts = [];
    const rootDir = '.';
    const htmlFiles = getHtmlFiles(rootDir);
    console.log(`Знайдено HTML-файлів: ${htmlFiles.length}`);
    
    htmlFiles.forEach(filePath => {
        console.log(`\nОбробка файлу: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`Розмір файлу: ${content.length} байт`);
        
        const parts = content.split('<div class="product-card"');
        console.log(`Знайдено частин: ${parts.length}`);
        
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const endIdx = part.indexOf('</div></div></div>');
            if (endIdx === -1) {
                console.log(`  Частина ${i}: не знайдено кінець картки, пропускаємо`);
                continue;
            }
            const cardHtml = '<div class="product-card"' + part.substring(0, endIdx + 18);
            console.log(`  Частина ${i}: знайдено картку, довжина ${cardHtml.length}`);
            
            const product = extractProduct(cardHtml);
            if (product.articul) {
                // Визначаємо категорію
                let category = 'other';
                if (filePath.includes('electronics')) category = 'electronics';
                else if (filePath.includes('clothing')) category = 'clothing';
                else if (filePath.includes('garden')) category = 'garden';
                
                allProducts.push({ ...product, category });
                console.log(`    -> Артикул: ${product.articul}, назва: "${product.title}"`);
            } else {
                console.log(`    -> Артикул не знайдено, пропускаємо`);
            }
        }
    });
    
    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\nЗгенеровано ${allProducts.length} товарів у products.json`);
}

main();

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
    // Артикул
    const articulMatch = /data-articul="([^"]+)"/.exec(cardHtml);
    const articul = articulMatch ? articulMatch[1] : '';
    if (!articul) return null;

    // Назва: все що між <h3> і </h3>
    const titleMatch = /<h3>([^<]+)<\/h3>/.exec(cardHtml);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Опис: після </h3> шукаємо <p> і беремо його вміст
    let description = '';
    const h3ClosePos = cardHtml.indexOf('</h3>');
    if (h3ClosePos !== -1) {
        // Шукаємо перший <p> після h3ClosePos
        const pOpenPos = cardHtml.indexOf('<p>', h3ClosePos);
        if (pOpenPos !== -1) {
            const pClosePos = cardHtml.indexOf('</p>', pOpenPos);
            if (pClosePos !== -1) {
                description = cardHtml.substring(pOpenPos + 3, pClosePos).trim();
            }
        }
    }

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

    console.log('Знайдено HTML-файлів (крім search.html):', htmlFiles.length);
    htmlFiles.forEach((f, i) => console.log(`${i+1}. ${f}`));

    htmlFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        const parts = content.split('<div class="product-card"');
        
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const endIdx = part.indexOf('</div></div></div>');
            if (endIdx === -1) continue;
            
            const cardHtml = '<div class="product-card"' + part.substring(0, endIdx + 18);
            const product = extractProduct(cardHtml);
            
            if (product && product.articul) {
                // Визначаємо категорію
                let category = 'other';
                if (filePath.includes('electronics')) category = 'electronics';
                else if (filePath.includes('clothing')) category = 'clothing';
                else if (filePath.includes('garden')) category = 'garden';
                
                allProducts.push({ ...product, category });
                console.log(`Знайдено: арт. ${product.articul}, назва: "${product.title}"`);
            }
        }
    });

    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\nЗгенеровано ${allProducts.length} товарів у products.json`);
}

main();

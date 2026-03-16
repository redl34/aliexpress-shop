const fs = require('fs');
const path = require('path');

// Рекурсивний пошук HTML-файлів
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

// Витягування назви з HTML картки
function extractTitle(cardHtml) {
    // Шукаємо <h3> в межах блоку product-details
    const detailsStart = cardHtml.indexOf('<div class="product-details">');
    if (detailsStart === -1) return '';
    const detailsEnd = cardHtml.indexOf('</div>', detailsStart);
    const detailsBlock = cardHtml.substring(detailsStart, detailsEnd);
    
    const titleMatch = /<h3>([^<]+)<\/h3>/.exec(detailsBlock);
    return titleMatch ? titleMatch[1].trim() : '';
}

// Витягування опису (перший <p> без класу)
function extractDescription(cardHtml) {
    const descMatch = /<p>([^<]+)<\/p>/.exec(cardHtml);
    return descMatch ? descMatch[1].trim() : '';
}

// Витягування ціни
function extractPrice(cardHtml) {
    const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(cardHtml);
    return priceMatch ? priceMatch[1].trim() : '';
}

// Витягування всіх зображень
function extractImages(cardHtml) {
    const images = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(cardHtml)) !== null) {
        images.push(imgMatch[1]);
    }
    return images;
}

// Витягування посилання на AliExpress
function extractLink(cardHtml) {
    const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(cardHtml);
    return linkMatch ? linkMatch[1] : '';
}

function main() {
    const allProducts = [];
    const rootDir = '.';
    const htmlFiles = getHtmlFiles(rootDir);

    console.log('Знайдено HTML-файлів (крім search.html):', htmlFiles.length);
    htmlFiles.forEach((f, i) => console.log(`${i+1}. ${f}`));

    htmlFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Розбиваємо на картки
        const parts = content.split('<div class="product-card"');
        
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const endIdx = part.indexOf('</div></div></div>');
            if (endIdx === -1) continue;
            
            const cardHtml = '<div class="product-card"' + part.substring(0, endIdx + 18);
            
            // Артикул
            const articulMatch = /data-articul="([^"]+)"/.exec(cardHtml);
            const articul = articulMatch ? articulMatch[1] : '';
            
            if (!articul) continue;
            
            const title = extractTitle(cardHtml);
            const description = extractDescription(cardHtml);
            const price = extractPrice(cardHtml);
            const images = extractImages(cardHtml);
            const link = extractLink(cardHtml);
            
            // Визначаємо категорію
            let category = 'other';
            if (filePath.includes('electronics')) category = 'electronics';
            else if (filePath.includes('clothing')) category = 'clothing';
            else if (filePath.includes('garden')) category = 'garden';
            
            allProducts.push({
                articul,
                title,
                description,
                price,
                image: images.length > 0 ? images[0] : '',
                images,
                link,
                category
            });
        }
    });

    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\nЗгенеровано ${allProducts.length} товарів у products.json`);
}

main();

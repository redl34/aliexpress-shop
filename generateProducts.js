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
    const articulMatch = /data-articul="([^"]+)"/.exec(cardHtml);
    if (!articulMatch) return null;
    const articul = articulMatch[1];
    
    const titleMatch = /<h3>([^<]+)<\/h3>/.exec(cardHtml);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // ВИПРАВЛЕНИЙ ПОШУК ОПИСУ - шукаємо перший <p після </h3> (з будь-якими атрибутами)
    let description = '';
    const h3ClosePos = cardHtml.indexOf('</h3>');
    if (h3ClosePos !== -1) {
        // Шукаємо будь-який відкриваючий тег <p після </h3>
        const pOpenPos = cardHtml.indexOf('<p', h3ClosePos);
        if (pOpenPos !== -1) {
            // Знаходимо символ > після відкриття тегу
            const tagEndPos = cardHtml.indexOf('>', pOpenPos);
            if (tagEndPos !== -1) {
                // Знаходимо закриття </p>
                const pClosePos = cardHtml.indexOf('</p>', tagEndPos);
                if (pClosePos !== -1) {
                    description = cardHtml.substring(tagEndPos + 1, pClosePos).trim();
                }
            }
        }
    }
    
    const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(cardHtml);
    const price = priceMatch ? priceMatch[1].trim() : '';
    
    const images = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(cardHtml)) !== null) {
        images.push(imgMatch[1]);
    }
    
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
            const cardStart = content.indexOf('<div class="product-card"', startIdx);
            if (cardStart === -1) break;
            
            const nextCardStart = content.indexOf('<div class="product-card"', cardStart + 1);
            let cardEnd;
            if (nextCardStart === -1) {
                const possibleEnd = content.indexOf('</div></div>', cardStart);
                if (possibleEnd === -1) break;
                cardEnd = possibleEnd + 12;
            } else {
                cardEnd = nextCardStart;
            }
            
            const cardHtml = content.substring(cardStart, cardEnd);
            const product = extractProduct(cardHtml);
            if (product && product.articul) {
                let category = 'other';
                if (filePath.includes('electronics')) category = 'electronics';
                else if (filePath.includes('clothing')) category = 'clothing';
                else if (filePath.includes('garden')) category = 'garden';
                allProducts.push({ ...product, category });
                console.log(`Знайдено: ${product.articul} - ${product.title} | опис: ${product.description.substring(0, 50)}...`);
            }
            
            startIdx = cardEnd;
        }
    });
    
    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\n✅ Згенеровано ${allProducts.length} товарів у файл products.json`);
}

main();

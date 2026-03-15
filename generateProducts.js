const fs = require('fs');
const path = require('path');

// Рекурсивний пошук всіх HTML-файлів (крім search.html)
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

// Функція для безпечного витягування тексту між тегами
function extractBetween(html, startTag, endTag) {
    const startIdx = html.indexOf(startTag);
    if (startIdx === -1) return '';
    const contentStart = startIdx + startTag.length;
    const endIdx = html.indexOf(endTag, contentStart);
    if (endIdx === -1) return '';
    return html.substring(contentStart, endIdx).trim();
}

// Основна функція парсингу
function parseProductCard(cardHtml) {
    // Артикул (з data-articul)
    const articulMatch = /data-articul="([^"]+)"/.exec(cardHtml);
    const articul = articulMatch ? articulMatch[1] : '';

    // Назва (в <h3>)
    const title = extractBetween(cardHtml, '<h3>', '</h3>');

    // Опис (перший <p> без класу)
    // Шукаємо <p> після якого не йде class=
    const descMatch = /<p>([^<]+)<\/p>/.exec(cardHtml);
    const description = descMatch ? descMatch[1].trim() : '';

    // Артикул текстом (з <p class="articul">)
    const articulTextMatch = /<p class="articul">[^>]*>([^<]+)<\/p>/.exec(cardHtml);
    const articulText = articulTextMatch ? articulTextMatch[1].replace(/арт\.?\s*/i, '').trim() : articul;

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

    // Посилання на AliExpress
    const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(cardHtml);
    const link = linkMatch ? linkMatch[1] : '';

    return {
        articul,
        title,
        description,
        price,
        image: images.length > 0 ? images[0] : '',
        images,
        link,
    };
}

// Головна функція
function main() {
    const allProducts = [];
    const rootDir = '.';
    const htmlFiles = getHtmlFiles(rootDir);

    console.log('Знайдено HTML-файлів (крім search.html):', htmlFiles.length);
    htmlFiles.forEach((f, i) => console.log(`${i+1}. ${f}`));

    htmlFiles.forEach(filePath => {
        console.log(`\nОбробка файлу: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');

        // Визначаємо категорію за назвою файлу
        let category = 'other';
        if (filePath.includes('electronics')) category = 'electronics';
        else if (filePath.includes('clothing')) category = 'clothing';
        else if (filePath.includes('garden')) category = 'garden';

        // Розбиваємо HTML на частини, використовуючи початок картки товару
        const parts = content.split('<div class="product-card"');
        // Перша частина - це все до першого товару, її пропускаємо
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            // Шукаємо кінець картки (три закриваючі div)
            const endIdx = part.indexOf('</div></div></div>');
            if (endIdx === -1) continue; // не знайдено кінець, пропускаємо
            const cardHtml = '<div class="product-card"' + part.substring(0, endIdx + 18); // +18 for the closing tags
            const product = parseProductCard(cardHtml);
            if (product.articul) {
                product.category = category;
                allProducts.push(product);
                console.log(`  Знайдено товар: арт. ${product.articul}, назва: "${product.title}"`);
            }
        }
    });

    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\nЗгенеровано ${allProducts.length} товарів у products.json`);
}

main();

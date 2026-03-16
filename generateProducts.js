const fs = require('fs');
const path = require('path');

// Рекурсивний пошук HTML-файлів (крім search.html)
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

// Функція для витягування тексту між маркерами
function extractBetween(text, startMarker, endMarker) {
    const startIdx = text.indexOf(startMarker);
    if (startIdx === -1) return '';
    const contentStart = startIdx + startMarker.length;
    const endIdx = text.indexOf(endMarker, contentStart);
    if (endIdx === -1) return '';
    return text.substring(contentStart, endIdx).trim();
}

// Парсинг однієї картки товару
function extractProduct(cardHtml) {
    // Артикул з data-articul
    const articulMatch = /data-articul="([^"]+)"/.exec(cardHtml);
    const articul = articulMatch ? articulMatch[1] : '';
    
    // Назва з <h3>
    const title = extractBetween(cardHtml, '<h3>', '</h3>');
    
    // Опис (перший <p> без класу)
    const descMatch = /<p>([^<]+)<\/p>/.exec(cardHtml);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Ціна з <p class="price">
    const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(cardHtml);
    const price = priceMatch ? priceMatch[1].trim() : '';
    
    // Усі зображення
    const images = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(cardHtml)) !== null) {
        images.push(imgMatch[1]);
    }
    
    // Посилання на AliExpress
    const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(cardHtml);
    const link = linkMatch ? linkMatch[1] : '';
    
    return { articul, title, description, price, images, link };
}

function main() {
    const allProducts = [];
    const rootDir = '.'; // поточна папка (корінь репозиторію)
    const htmlFiles = getHtmlFiles(rootDir);

    console.log('Знайдено HTML-файлів (крім search.html):', htmlFiles.length);
    htmlFiles.forEach((f, i) => console.log(`${i+1}. ${f}`));

    htmlFiles.forEach(filePath => {
        console.log(`\nОбробка файлу: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`Розмір файлу: ${content.length} байт`);

        // Розбиваємо на частини за початком картки товару
        const parts = content.split('<div class="product-card"');
        console.log(`Знайдено частин (включаючи преамбулу): ${parts.length}`);

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            console.log(`\n  Частина ${i}, перші 100 символів: ${part.substring(0, 100).replace(/\n/g, ' ')}`);

            // Шукаємо кінець картки (три закриваючі div)
            const endIdx = part.indexOf('</div></div></div>');
            if (endIdx === -1) {
                console.log('    Не знайдено кінець картки, пропускаємо');
                continue;
            }

            // Відновлюємо повний HTML картки
            const cardHtml = '<div class="product-card"' + part.substring(0, endIdx + 18);
            console.log(`    Знайдено картку, довжина HTML: ${cardHtml.length}`);

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
                console.log('    -> Артикул не знайдено, пропускаємо');
            }
        }
    });

    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\nЗгенеровано ${allProducts.length} товарів у products.json`);
}

main();

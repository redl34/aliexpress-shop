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

// Парсинг однієї картки товару
function parseProductCard(cardHtml) {
    console.log('  Парсимо картку, довжина:', cardHtml.length);
    
    // Артикул (з data-articul)
    const articulMatch = /data-articul="([^"]+)"/.exec(cardHtml);
    const articul = articulMatch ? articulMatch[1] : '';
    console.log('    articul:', articul);

    // Назва (в <h3>)
    const titleMatch = /<h3>([^<]+)<\/h3>/.exec(cardHtml);
    const title = titleMatch ? titleMatch[1].trim() : '';
    console.log('    title:', title);

    // Опис (перший <p> без класу)
    const descMatch = /<p>([^<]+)<\/p>/.exec(cardHtml);
    const description = descMatch ? descMatch[1].trim() : '';
    console.log('    description (перші 50 символів):', description.substring(0, 50));

    // Ціна (з <p class="price">)
    const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(cardHtml);
    const price = priceMatch ? priceMatch[1].trim() : '';
    console.log('    price:', price);

    // Усі зображення
    const images = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(cardHtml)) !== null) {
        images.push(imgMatch[1]);
    }
    console.log('    images count:', images.length);

    // Посилання на AliExpress
    const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(cardHtml);
    const link = linkMatch ? linkMatch[1] : '';
    console.log('    link:', link ? 'є' : 'немає');

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

function main() {
    const allProducts = [];
    const rootDir = '.'; // поточна папка (корінь репозиторію)
    const htmlFiles = getHtmlFiles(rootDir);

    console.log('Знайдено HTML-файлів (крім search.html):', htmlFiles.length);
    htmlFiles.forEach((f, i) => console.log(`${i+1}. ${f}`));

    htmlFiles.forEach(filePath => {
        console.log(`\nОбробка файлу: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        console.log('Розмір файлу:', content.length, 'байт');
        
        // Визначаємо категорію
        let category = 'other';
        if (filePath.includes('electronics')) category = 'electronics';
        else if (filePath.includes('clothing')) category = 'clothing';
        else if (filePath.includes('garden')) category = 'garden';
        console.log('Категорія:', category);

        // Розбиваємо HTML на частини за початком картки товару
        const parts = content.split('<div class="product-card"');
        console.log('Знайдено частин (включаючи преамбулу):', parts.length);
        
        // Перша частина (індекс 0) — це все до першого товару, пропускаємо
        for (let i = 1; i < parts.length; i++) {
            console.log(`\n  Частина ${i}, перші 100 символів: ${parts[i].substring(0, 100).replace(/\n/g, ' ')}`);
            const part = parts[i];
            // Шукаємо кінець картки (три закриваючі div)
            const endIdx = part.indexOf('</div></div></div>');
            if (endIdx === -1) {
                console.log('    Не знайдено кінець картки, пропускаємо');
                continue;
            }
            // Відновлюємо повний HTML картки
            const cardHtml = '<div class="product-card"' + part.substring(0, endIdx + 18); // 18 = довжина '</div></div></div>'
            console.log('    Знайдено картку, довжина HTML:', cardHtml.length);
            
            const product = parseProductCard(cardHtml);
            if (product.articul) {
                product.category = category;
                allProducts.push(product);
                console.log('    -> Товар додано');
            } else {
                console.log('    -> Товар не має артикула, пропущено');
            }
        }
    });

    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\nЗгенеровано ${allProducts.length} товарів у products.json`);
}

main();

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

// Парсинг товарів з HTML-коду однієї сторінки
function extractProducts(htmlContent, category) {
    const products = [];
    
    // Розділяємо HTML на окремі картки товарів (вони йдуть поспіль)
    // Шукаємо всі блоки, що починаються з <div class="product-card" і закінчуються на </div></div></div>
    const productRegex = /<div class="product-card" data-articul="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;
    
    while ((match = productRegex.exec(htmlContent)) !== null) {
        const articul = match[1];
        const productHtml = match[2];

        // --- Назва (в <h3>) ---
        const titleMatch = /<h3>([^<]+)<\/h3>/.exec(productHtml);
        const title = titleMatch ? titleMatch[1].trim() : '';

        // --- Опис (перший <p> без класу) ---
        // Шукаємо <p>, після якого не йде class="articul" або class="price"
        const descMatch = /<p>([^<]+)<\/p>/.exec(productHtml);
        let description = descMatch ? descMatch[1].trim() : '';

        // --- Артикул (текст з <p class="articul">) ---
        const articulSpanMatch = /<p class="articul">[^0-9]*([^<]+)<\/p>/.exec(productHtml);
        const articulText = articulSpanMatch ? articulSpanMatch[1].trim() : articul;

        // --- Ціна ---
        const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(productHtml);
        const price = priceMatch ? priceMatch[1].trim() : '';

        // --- Усі зображення ---
        const images = [];
        const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
        let imgMatch;
        while ((imgMatch = imgRegex.exec(productHtml)) !== null) {
            images.push(imgMatch[1]);
        }

        // --- Посилання на AliExpress ---
        const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(productHtml);
        const link = linkMatch ? linkMatch[1] : '';

        // Додаємо товар, тільки якщо є артикул
        if (articul) {
            products.push({
                articul: articul,
                title: title,
                description: description,
                price: price,
                image: images.length > 0 ? images[0] : '',
                images: images,
                link: link,
                category: category
            });
        }
    }
    return products;
}

// Основна функція
function main() {
    const allProducts = [];
    const rootDir = '.';   // поточна папка
    const htmlFiles = getHtmlFiles(rootDir);

    htmlFiles.forEach(filePath => {
        const content = fs.readFileSync(filePath, 'utf8');
        // Визначаємо категорію за шляхом до файлу
        let category = 'other';
        if (filePath.includes('electronics')) category = 'electronics';
        else if (filePath.includes('clothing')) category = 'clothing';
        else if (filePath.includes('garden')) category = 'garden';

        const products = extractProducts(content, category);
        allProducts.push(...products);
    });

    // Записуємо результат у products.json
    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`Згенеровано ${allProducts.length} товарів у products.json`);
}

main();

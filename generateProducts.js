const fs = require('fs');
const path = require('path');

// Пошук всіх HTML-файлів (крім search.html)
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

// Парсинг товарів
function extractProducts(htmlContent, category) {
    const products = [];
    
    // Регулярний вираз для пошуку блоків .product-card
    // Враховуємо, що можуть бути зайві пробіли між атрибутами
    const productRegex = /<div class="product-card"\s+data-articul="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    
    let match;
    let count = 0;
    
    while ((match = productRegex.exec(htmlContent)) !== null) {
        count++;
        const articul = match[1];
        const productHtml = match[2];

        // Назва: <h3>...</h3>
        const titleMatch = /<h3>([^<]+)<\/h3>/.exec(productHtml);
        const title = titleMatch ? titleMatch[1].trim() : '';

        // Опис: перший <p> без класу
        const descMatch = /<p>([^<]+)<\/p>/.exec(productHtml);
        const description = descMatch ? descMatch[1].trim() : '';

        // Артикул: <p class="articul">арт. 1234</p>
        const articulSpanMatch = /<p class="articul">[^>]*>([^<]+)<\/p>/.exec(productHtml);
        // Якщо не знайшлося, використовуємо data-articul
        const articulText = articulSpanMatch ? articulSpanMatch[1].replace(/арт\.?\s*/i, '').trim() : articul;

        // Ціна: <p class="price">123 грн</p>
        const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(productHtml);
        const price = priceMatch ? priceMatch[1].trim() : '';

        // Зображення: всі <img> всередині
        const images = [];
        const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
        let imgMatch;
        while ((imgMatch = imgRegex.exec(productHtml)) !== null) {
            images.push(imgMatch[1]);
        }

        // Посилання на AliExpress
        const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(productHtml);
        const link = linkMatch ? linkMatch[1] : '';

        // Логування для діагностики
        console.log(`Товар #${count}: арт. ${articul}, назва: "${title}", ціна: "${price}", зображень: ${images.length}`);

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
    console.log(`Знайдено товарів у файлі: ${count}`);
    return products;
}

// Головна функція
function main() {
    const allProducts = [];
    const rootDir = '.';   // поточна папка (корінь репозиторію)
    const htmlFiles = getHtmlFiles(rootDir);

    console.log('Знайдено HTML-файлів (крім search.html):', htmlFiles.length);
    htmlFiles.forEach((f, i) => console.log(`${i+1}. ${f}`));

    htmlFiles.forEach(filePath => {
        console.log(`\nОбробка файлу: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        
        let category = 'other';
        if (filePath.includes('electronics')) category = 'electronics';
        else if (filePath.includes('clothing')) category = 'clothing';
        else if (filePath.includes('garden')) category = 'garden';
        
        const products = extractProducts(content, category);
        allProducts.push(...products);
    });

    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\nЗгенеровано ${allProducts.length} товарів у products.json`);
}

main();

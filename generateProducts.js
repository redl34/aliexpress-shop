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

function extractProducts(htmlContent, category) {
    const products = [];
    // Більш гнучкий регулярний вираз
    const productRegex = /<div class="product-card"[^>]*data-articul="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;
    let count = 0;
    while ((match = productRegex.exec(htmlContent)) !== null) {
        count++;
        const articul = match[1];
        const productHtml = match[2];

        console.log(`  - Знайдено товар #${count}, артикул: ${articul}`);

        const titleMatch = /<h3>([^<]+)<\/h3>/.exec(productHtml);
        const title = titleMatch ? titleMatch[1].trim() : '';
        console.log(`    Назва: "${title}"`);

        const descMatch = /<p>([^<]+)<\/p>/.exec(productHtml);
        const description = descMatch ? descMatch[1].trim() : '';
        console.log(`    Опис: "${description.substring(0,50)}..."`);

        const articulSpanMatch = /<p class="articul">[^0-9]*([^<]+)<\/p>/.exec(productHtml);
        const articulText = articulSpanMatch ? articulSpanMatch[1].trim() : articul;

        const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(productHtml);
        const price = priceMatch ? priceMatch[1].trim() : '';
        console.log(`    Ціна: "${price}"`);

        const images = [];
        const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
        let imgMatch;
        while ((imgMatch = imgRegex.exec(productHtml)) !== null) {
            images.push(imgMatch[1]);
        }
        console.log(`    Зображень: ${images.length}`);

        const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(productHtml);
        const link = linkMatch ? linkMatch[1] : '';
        console.log(`    Посилання: ${link ? 'є' : 'немає'}`);

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
    console.log(`  Усього в цьому файлі знайдено товарів: ${count}`);
    return products;
}

function main() {
    const allProducts = [];
    const rootDir = '.';
    const htmlFiles = getHtmlFiles(rootDir);
    console.log('Знайдено HTML-файлів (без search.html):', htmlFiles.length);
    htmlFiles.forEach((f, i) => console.log(`  ${i+1}. ${f}`));

    htmlFiles.forEach(filePath => {
        console.log(`\nОбробка файлу: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        let category = 'other';
        if (filePath.includes('electronics')) category = 'electronics';
        else if (filePath.includes('clothing')) category = 'clothing';
        else if (filePath.includes('garden')) category = 'garden';
        console.log(`  Категорія: ${category}`);

        const products = extractProducts(content, category);
        allProducts.push(...products);
    });

    fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
    console.log(`\nЗгенеровано ${allProducts.length} товарів у products.json`);
}

main();

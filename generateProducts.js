const fs = require('fs');
const path = require('path');

// Функція для отримання всіх HTML-файлів у папці (рекурсивно)
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

// Функція для парсингу товарів з HTML
function extractProducts(htmlContent, category) {
  const products = [];
  // Шукаємо кожен блок .product-card
  const productRegex = /<div class="product-card" data-articul="([^"]+)">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match;
  while ((match = productRegex.exec(htmlContent)) !== null) {
    const articul = match[1];
    const productHtml = match[2];

    // Назва (в <h3>)
    const titleMatch = /<h3>([^<]+)<\/h3>/.exec(productHtml);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Опис: перший <p> без класу (або будь-який <p>, що не містить articul/price)
    // Краще шукати <p> без class=
    const descMatch = /<p>([^<]+)<\/p>/.exec(productHtml); // перший параграф без класу
    let description = descMatch ? descMatch[1].trim() : '';
    
    // Артикул (з класом articul)
    const articulSpanMatch = /<p class="articul">[^0-9]*([^<]+)<\/p>/.exec(productHtml);
    // Якщо не знайшлося, пробуємо інший варіант
    let articulText = articulSpanMatch ? articulSpanMatch[1].trim() : articul;

    // Ціна
    const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(productHtml);
    const price = priceMatch ? priceMatch[1].trim() : '';

    // Усі зображення (з каруселі)
    const images = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(productHtml)) !== null) {
      images.push(imgMatch[1]);
    }

    // Посилання на AliExpress
    const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(productHtml);
    const link = linkMatch ? linkMatch[1] : '';

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
  return products;
}

// Основна функція
function main() {
  const allProducts = [];
  // Поточна папка (там, де запущено скрипт)
  const rootDir = '.';
  const htmlFiles = getHtmlFiles(rootDir);

  htmlFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    // Визначаємо категорію з назви файлу або шляху
    let category = 'other';
    if (filePath.includes('electronics')) category = 'electronics';
    else if (filePath.includes('clothing')) category = 'clothing';
    else if (filePath.includes('garden')) category = 'garden';

    const products = extractProducts(content, category);
    allProducts.push(...products);
  });

  fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
  console.log(`Згенеровано ${allProducts.length} товарів у products.json`);
}

main();

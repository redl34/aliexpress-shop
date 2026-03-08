const fs = require('fs');
const path = require('path');

// Функція для отримання всіх HTML-файлів у папці
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
  const productRegex = /<div class="product-card" data-articul="([^"]+)">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match;
  while ((match = productRegex.exec(htmlContent)) !== null) {
    const articul = match[1];
    const productHtml = match[2];

    // Назва
    const titleMatch = /<h3>([^<]+)<\/h3>/.exec(productHtml);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Опис
    const descMatch = /<p>([^<]+)<\/p>/.exec(productHtml);
    const description = descMatch ? descMatch[1].trim() : '';

    // Ціна
    const priceMatch = /<p class="price">([^<]+)<\/p>/.exec(productHtml);
    const price = priceMatch ? priceMatch[1].trim() : '';

    // Зображення (перше)
    const imgMatch = /<img[^>]*src="([^"]+)"[^>]*>/.exec(productHtml);
    const image = imgMatch ? imgMatch[1] : '';

    // Усі зображення
    const allImages = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatchAll;
    while ((imgMatchAll = imgRegex.exec(productHtml)) !== null) {
      allImages.push(imgMatchAll[1]);
    }

    // Посилання на AliExpress
    const linkMatch = /<a href="([^"]+)"[^>]*>Купити на AliExpress<\/a>/.exec(productHtml);
    const link = linkMatch ? linkMatch[1] : '';

    products.push({
      articul,
      title,
      description,
      price,
      image: allImages[0] || '',
      images: allImages,
      link,
      category
    });
  }
  return products;
}

// Основна функція
function main() {
  const allProducts = [];
  const htmlFiles = getHtmlFiles('.'); // поточна папка

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
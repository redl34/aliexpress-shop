const fs = require('fs');
const path = require('path');

// Список всіх HTML-сторінок з товарами
const PAGES = [
    'electronics_page_1.html',
    'electronics_page_2.html', 
    'electronics_page_3.html',
    'electronics_page_4.html',
    'clothing.html',
    'garden_page_1.html'
    // Додайте інші сторінки, якщо є
];

let allProducts = [];

// Функція для парсингу HTML і витягування товарів
function parseProducts(html, fileName) {
    const products = [];
    
    // Простий парсинг за допомогою регулярних виразів (не потребує бібліотек)
    const productCards = html.match(/<div class="product-card" data-articul="(.*?)">(.*?)<\/div>\s*<\/div>\s*<\/div>/gs);
    
    if (!productCards) return products;
    
    // Визначаємо категорію з назви файлу
    let category = 'other';
    if (fileName.includes('electronics')) category = 'electronics';
    else if (fileName.includes('clothing')) category = 'clothing';
    else if (fileName.includes('garden')) category = 'garden';
    
    productCards.forEach(card => {
        try {
            // Артикул
            const articulMatch = card.match(/data-articul="(.*?)"/);
            const articul = articulMatch ? articulMatch[1] : '';
            
            // Назва товару
            const titleMatch = card.match(/<h3>(.*?)<\/h3>/);
            const title = titleMatch ? titleMatch[1].trim() : '';
            
            // Опис (перший p після h3)
            const descMatch = card.match(/<\/h3>\s*<p>(.*?)<\/p>/);
            const description = descMatch ? descMatch[1].trim() : '';
            
            // Ціна
            const priceMatch = card.match(/<p class="price">(.*?)<\/p>/);
            const price = priceMatch ? priceMatch[1].trim() : '';
            
            // Посилання
            const linkMatch = card.match(/<a href="(.*?)".*?>Купити на AliExpress<\/a>/);
            const link = linkMatch ? linkMatch[1] : '';
            
            // Зображення
            const images = [];
            const imgRegex = /<img[^>]*src="(.*?)"[^>]*class="carousel-image"/g;
            let imgMatch;
            while ((imgMatch = imgRegex.exec(card)) !== null) {
                if (!imgMatch[1].includes('svg')) {
                    images.push(imgMatch[1]);
                }
            }
            
            if (articul) {
                products.push({
                    articul,
                    title,
                    description,
                    price,
                    images: [...new Set(images)], // Унікальні зображення
                    link,
                    category
                });
            }
        } catch (e) {
            console.error('Помилка парсингу товару:', e);
        }
    });
    
    return products;
}

// Головна функція
async function buildDatabase() {
    console.log('Починаємо збір даних...');
    
    for (const page of PAGES) {
        try {
            const filePath = path.join(__dirname, '..', page);
            const html = fs.readFileSync(filePath, 'utf8');
            const products = parseProducts(html, page);
            allProducts = allProducts.concat(products);
            console.log(`✓ ${page}: знайдено ${products.length} товарів`);
        } catch (error) {
            console.error(`✗ Помилка читання ${page}:`, error.message);
        }
    }
    
    // Зберігаємо результат
    const outputPath = path.join(__dirname, '..', 'products.json');
    fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2));
    
    console.log('\n' + '='.repeat(50));
    console.log(`ГОТОВО! Загальна кількість товарів: ${allProducts.length}`);
    console.log(`Файл збережено: products.json`);
    console.log('='.repeat(50));
}

buildDatabase();

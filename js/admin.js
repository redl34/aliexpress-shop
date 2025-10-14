// Адмін-панель - автоматично зчитує товари зі сторінок сайту

let products = [];
let categories = [];
let currentEditingProduct = null;
let priceChecker = new PriceChecker();

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Admin panel loading...');
    
    // Проста авторизація
    const isAuthenticated = localStorage.getItem('adminAuthenticated');
    if (!isAuthenticated) {
        const password = prompt('Введіть пароль адміністратора:');
        if (password === 'admin123') {
            localStorage.setItem('adminAuthenticated', 'true');
        } else {
            alert('Невірний пароль!');
            window.location.href = 'index.html';
            return;
        }
    }
    
    initializeAdmin();
});

async function initializeAdmin() {
    console.log('🚀 Initializing admin panel...');
    
    await loadProductsFromPages();
    setupEventListeners();
    setupNavigation();
    updateDashboard();
    displayAllProducts();
    displayProductsForDeletion();
    
    console.log('✅ Admin panel ready');
}

// ОСНОВНА ФУНКЦІЯ: Зчитування товарів зі сторінок сайту
async function loadProductsFromPages() {
    console.log('📥 Loading products from website pages...');
    
    try {
        // Зчитуємо товари з кожної сторінки
        const pages = [
            { url: 'index.html', category: 'featured' },
            { url: 'mens-clothing1.html', category: 'mens-clothing' },
            { url: 'womens-clothing1.html', category: 'womens-clothing' },
            { url: 'electronics1.html', category: 'electronics' }
        ];
        
        products = [];
        
        for (const page of pages) {
            const pageProducts = await extractProductsFromPage(page.url, page.category);
            products = products.concat(pageProducts);
        }
        
        console.log(`✅ Loaded ${products.length} products from website pages`);
        
        // Зберігаємо в localStorage для подальшого використання
        localStorage.setItem('extractedProducts', JSON.stringify(products));
        
    } catch (error) {
        console.error('❌ Error loading products from pages:', error);
        // Спробуємо завантажити з localStorage
        loadProductsFromStorage();
    }
}

// Функція парсингу товарів з HTML сторінки
async function extractProductsFromPage(pageUrl, category) {
    try {
        console.log(`🔍 Extracting products from: ${pageUrl}`);
        
        const response = await fetch(pageUrl);
        const html = await response.text();
        
        // Створюємо тимчасовий DOM для парсингу
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const products = [];
        
        // Шукаємо товари за різними селекторами
        const productSelectors = [
            '.product-item',
            '.product-card', 
            '.product',
            '[class*="product"]',
            '.item',
            '.goods-item'
        ];
        
        let productElements = [];
        
        for (const selector of productSelectors) {
            const elements = doc.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`Found ${elements.length} products with selector: ${selector}`);
                productElements = elements;
                break;
            }
        }
        
        // Парсимо кожен товар
        productElements.forEach((element, index) => {
            try {
                const product = parseProductElement(element, category, index);
                if (product && product.name) {
                    products.push(product);
                }
            } catch (error) {
                console.warn('Error parsing product element:', error);
            }
        });
        
        console.log(`📦 Extracted ${products.length} products from ${pageUrl}`);
        return products;
        
    } catch (error) {
        console.error(`Error extracting from ${pageUrl}:`, error);
        return [];
    }
}

// Парсинг окремого елементу товару
function parseProductElement(element, category, index) {
    const product = {
        id: generateId() + index,
        category: category,
        status: 'active'
    };
    
    // Спроба отримати назву
    product.name = getTextContent(element, [
        'h3', 'h4', '.product-name', '.name', '.title',
        '[class*="name"]', '[class*="title"]'
    ]) || `Товар ${index + 1}`;
    
    // Спроба отримати ціну
    const priceText = getTextContent(element, [
        '.product-price', '.price', '.cost', '.value',
        '[class*="price"]', '[class*="cost"]'
    ]);
    
    if (priceText) {
        // Вилучаємо числа з тексту ціни
        const priceMatch = priceText.match(/(\d+[\.,]?\d*)/);
        if (priceMatch) {
            product.price = parseFloat(priceMatch[1].replace(',', '.'));
        }
    }
    
    if (!product.price) {
        product.price = Math.floor(Math.random() * 1000) + 100; // Запасна ціна
    }
    
    // Спроба отримати зображення
    product.image = getImageSrc(element, [
        'img', '.product-image', '.image', 
        '[class*="image"]', '[class*="img"]'
    ]) || 'images/placeholder.jpg';
    
    // Спроба отримати опис
    product.description = getTextContent(element, [
        '.product-description', '.description', '.desc',
        '[class*="description"]', '[class*="desc"]', 'p'
    ]) || 'Опис товару';
    
    // Посилання на AliExpress (спочатку пусте - заповнюється вручну)
    product.aliExpressUrl = '';
    
    return product;
}

// Допоміжні функції для парсингу
function getTextContent(element, selectors) {
    for (const selector of selectors) {
        const found = element.querySelector(selector);
        if (found && found.textContent.trim()) {
            return found.textContent.trim();
        }
    }
    return element.textContent.trim().substring(0, 100);
}

function getImageSrc(element, selectors) {
    for (const selector of selectors) {
        const found = element.querySelector(selector);
        if (found && found.src) {
            return found.src;
        }
    }
    return null;
}

// Завантаження з localStorage (якщо парсинг не вдався)
function loadProductsFromStorage() {
    const stored = localStorage.getItem('extractedProducts');
    if (stored) {
        products = JSON.parse(stored);
        console.log(`📦 Loaded ${products.length} products from storage`);
    } else {
        createFallbackProducts();
    }
}

// Запасні дані
function createFallbackProducts() {
    console.log('🛠 Creating fallback products...');
    
    products = [
        {
            id: 1,
            name: "Чоловіча футболка Basic",
            category: "mens-clothing",
            price: 299,
            image: "https://via.placeholder.com/300x300/007bff/ffffff?text=T-Shirt",
            description: "Зручна чоловіча футболка з бавовни",
            aliExpressUrl: "",
            status: "active"
        },
        {
            id: 2,
            name: "Джинси Classic",
            category: "mens-clothing",
            price: 799,
            image: "https://via.placeholder.com/300x300/28a745/ffffff?text=Jeans",
            description: "Класичні чоловічі джинси",
            aliExpressUrl: "",
            status: "active"
        }
    ];
    
    showNotification('Використовуються тестові дані', 'warning');
}

// Решта функцій залишаються незмінними...
function setupEventListeners() {
    document.getElementById('check-all-prices')?.addEventListener('click', checkAllProducts);
    document.getElementById('stop-checking')?.addEventListener('click', stopPriceChecking);
    document.getElementById('update-prices')?.addEventListener('click', updateAllPrices);
    document.getElementById('delete-checked')?.addEventListener('click', deleteFailedProducts);
    document.getElementById('add-product-btn')?.addEventListener('click', showProductModal);
    document.getElementById('product-form')?.addEventListener('submit', handleProductSubmit);
    document.getElementById('cancel-edit')?.addEventListener('click', resetProductModal);
    document.querySelector('.close')?.addEventListener('click', resetProductModal);
    document.getElementById('reload-products')?.addEventListener('click', reloadProducts);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
}

// Оновлення товарів зі сторінок
async function reloadProducts() {
    showNotification('🔄 Оновлення товарів зі сторінок...', 'info');
    await loadProductsFromPages();
    displayAllProducts();
    displayProductsForDeletion();
    updateDashboard();
    showNotification('✅ Товари оновлено');
}

// Відображення всіх товарів
function displayAllProducts() {
    const tbody = document.getElementById('all-products-body');
    if (!tbody) return;
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Товари не знайдено</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => {
        const check = priceChecker.getCheckResult(product.id);
        const statusIcon = priceChecker.getStatusIcon(check?.status || 'pending');
        const statusText = priceChecker.getStatusText(check?.status || 'pending');
        
        return `
            <tr>
                <td>${product.id}</td>
                <td>
                    <img src="${product.image}" alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                         onerror="this.src='images/placeholder.jpg'">
                </td>
                <td>${product.name}</td>
                <td>${getCategoryName(product.category)}</td>
                <td>${product.price} грн</td>
                <td>
                    <div class="check-status">
                        <span class="status-icon" title="${statusText}">${statusIcon}</span>
                        ${check?.message || 'Ще не перевірено'}
                    </div>
                </td>
                <td>
                    <button class="btn-check-single" onclick="checkSingleProduct(${product.id})" 
                            title="Перевірити цей товар">🔍</button>
                    <button class="btn-edit" onclick="editProduct(${product.id})">✏️</button>
                    <button class="btn-delete" onclick="deleteSingleProduct(${product.id})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Решта функцій (displayProductsForDeletion, updateDashboard, etc.)...
// ... залишаються такими ж як у попередній версії

function getCategoryName(category) {
    const categories = {
        'mens-clothing': 'Чоловічий одяг',
        'womens-clothing': 'Жіночий одяг',
        'electronics': 'Електроніка',
        'featured': 'Рекомендовані'
    };
    return categories[category] || category;
}

function generateId() {
    return Date.now();
}

// Глобальні функції
window.editProduct = editProduct;
window.checkSingleProduct = checkSingleProduct;
window.deleteSingleProduct = deleteSingleProduct;
window.reloadProducts = reloadProducts;
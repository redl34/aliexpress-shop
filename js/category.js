// JavaScript для сторінки категорій

let currentProducts = [];
let currentCategory = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('📁 Category page initialized');
    initializeCategoryPage();
    updateCartCounter();
});

// Ініціалізація сторінки категорії
async function initializeCategoryPage() {
    // Отримуємо категорію з URL
    const urlParams = new URLSearchParams(window.location.search);
    currentCategory = urlParams.get('category') || 'mens-clothing';
    
    console.log(`🔄 Loading category: ${currentCategory}`);
    
    await loadCategoryData();
    updatePageInfo();
    displayProducts();
    setupEventListeners();
}

// Завантаження даних категорії
async function loadCategoryData() {
    try {
        const response = await fetch('./data/products.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Фільтруємо товари по категорії
        currentProducts = data.products.filter(product => 
            product.category === currentCategory && product.status === 'active'
        );
        
        console.log(`✅ Loaded ${currentProducts.length} products for ${currentCategory}`);
        
    } catch (error) {
        console.error('❌ Error loading category data:', error);
        showError('Не вдалося завантажити товари категорії');
        loadFallbackProducts();
    }
}

// Запасні дані для категорії
function loadFallbackProducts() {
    const fallbackData = {
        'mens-clothing': [
            {
                id: 1,
                name: "Чоловіча футболка Basic",
                category: "mens-clothing",
                price: 299,
                image: "https://via.placeholder.com/300x300/007bff/ffffff?text=T-Shirt",
                description: "Зручна чоловіча футболка з бавовни"
            },
            {
                id: 2,
                name: "Джинси Classic",
                category: "mens-clothing",
                price: 799,
                image: "https://via.placeholder.com/300x300/28a745/ffffff?text=Jeans",
                description: "Класичні чоловічі джинси"
            }
        ],
        'womens-clothing': [
            {
                id: 3,
                name: "Жіноча сукня Elegant",
                category: "womens-clothing",
                price: 1299,
                image: "https://via.placeholder.com/300x300/e83e8c/ffffff?text=Dress",
                description: "Елегантна жіноча сукня"
            }
        ],
        'electronics': [
            {
                id: 4,
                name: "Смартфон SmartX",
                category: "electronics",
                price: 8999,
                image: "https://via.placeholder.com/300x300/6f42c1/ffffff?text=Phone",
                description: "Сучасний смартфон"
            }
        ]
    };
    
    currentProducts = fallbackData[currentCategory] || [];
}

// Оновлення інформації на сторінці
function updatePageInfo() {
    const categoryData = getCategoryData(currentCategory);
    
    // Оновлюємо заголовок сторінки
    document.title = `${categoryData.name} - AliExpress Shop`;
    
    // Оновлюємо заголовок категорії
    const titleElement = document.getElementById('category-title');
    const descElement = document.getElementById('category-description');
    const breadcrumbElement = document.getElementById('breadcrumb-category');
    
    if (titleElement) titleElement.textContent = categoryData.name;
    if (descElement) descElement.textContent = categoryData.description;
    if (breadcrumbElement) breadcrumbElement.textContent = categoryData.name;
}

// Отримання даних категорії
function getCategoryData(category) {
    const categories = {
        'mens-clothing': {
            name: 'Чоловічий одяг',
            description: 'Стильний одяг для чоловіків'
        },
        'womens-clothing': {
            name: 'Жіночий одяг',
            description: 'Елегантний одяг для жінок'
        },
        'electronics': {
            name: 'Електроніка',
            description: 'Сучасна техніка та гаджети'
        }
    };
    
    return categories[category] || {
        name: 'Категорія',
        description: 'Товари категорії'
    };
}

// Відображення товарів
function displayProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    if (currentProducts.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <h3>Товари не знайдено</h3>
                <p>У цій категорії поки що немає товарів</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentProducts.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image"
                 onerror="this.src='images/placeholder.jpg'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <p class="product-price">${product.price} грн</p>
                <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                    Додати в кошик
                </button>
            </div>
        </div>
    `).join('');
}

// Налаштування слухачів подій
function setupEventListeners() {
    // Пошук товарів
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            searchProducts(e.target.value);
        });
    }
}

// Пошук товарів
function searchProducts(query) {
    if (!query.trim()) {
        displayProducts();
        return;
    }
    
    const filteredProducts = currentProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase())
    );
    
    displayFilteredProducts(filteredProducts);
}

// Відображення відфільтрованих товарів
function displayFilteredProducts(filteredProducts) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <h3>Товари не знайдено</h3>
                <p>Спробуйте змінити запит пошуку</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredProducts.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image"
                 onerror="this.src='images/placeholder.jpg'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <p class="product-price">${product.price} грн</p>
                <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                    Додати в кошик
                </button>
            </div>
        </div>
    `).join('');
}

// Додавання в кошик
function addToCart(productId) {
    const product = currentProducts.find(p => p.id === productId);
    
    if (!product) {
        showNotification('Товар не знайдено', 'error');
        return;
    }
    
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCounter();
    showNotification('Товар додано в кошик!');
}

// Оновлення лічильника кошика
function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cart-counter');
    
    if (counter) {
        counter.textContent = totalItems;
        counter.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Сповіщення
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type === 'error' ? 'error' : ''}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Показати помилку
function showError(message) {
    const container = document.getElementById('products-container');
    if (container) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Глобальні функції
window.addToCart = addToCart;
window.searchProducts = searchProducts;
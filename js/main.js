// Головний JavaScript для сайту

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentProducts = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('🛍 AliExpress Shop initialized');
    initializePage();
    updateCartCounter();
});

// Ініціалізація сторінки
function initializePage() {
    loadFeaturedProducts();
    setupEventListeners();
}

// Завантаження рекомендованих товарів
async function loadFeaturedProducts() {
    try {
        console.log('🔄 Loading featured products...');
        
        const response = await fetch('./data/products.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Беремо по 2 товари з кожної категорії
        const mensProducts = data.products.filter(p => p.category === 'mens-clothing').slice(0, 2);
        const womensProducts = data.products.filter(p => p.category === 'womens-clothing').slice(0, 2);
        const electronicsProducts = data.products.filter(p => p.category === 'electronics').slice(0, 2);
        
        currentProducts = [...mensProducts, ...womensProducts, ...electronicsProducts];
        
        console.log(`✅ Loaded ${currentProducts.length} featured products`);
        displayProducts(currentProducts);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showError('Не вдалося завантажити товари. Спробуйте оновити сторінку.');
        loadFallbackProducts();
    }
}

// Запасні дані
function loadFallbackProducts() {
    console.log('🛠 Using fallback products');
    
    currentProducts = [
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
        },
        {
            id: 3,
            name: "Жіноча сукня Elegant",
            category: "womens-clothing",
            price: 1299,
            image: "https://via.placeholder.com/300x300/e83e8c/ffffff?text=Dress",
            description: "Елегантна жіноча сукня"
        }
    ];
    
    displayProducts(currentProducts);
}

// Відображення товарів
function displayProducts(products) {
    const container = document.getElementById('featured-products');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<div class="no-products">Товари не знайдено</div>';
        return;
    }
    
    container.innerHTML = products.map(product => `
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
    
    console.log('🛒 Cart updated:', cart);
}

// Оновлення лічильника кошика
function updateCartCounter() {
    const counter = document.getElementById('cart-counter');
    if (counter) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        counter.textContent = totalItems;
        counter.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// Налаштування слухачів подій
function setupEventListeners() {
    // Навігація по категоріям
    const categoryLinks = document.querySelectorAll('.category-card');
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.getAttribute('data-category');
            if (category) {
                window.location.href = `category.html?category=${category}`;
            }
        });
    });
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
    const container = document.getElementById('featured-products');
    if (container) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Глобальні функції
window.addToCart = addToCart;
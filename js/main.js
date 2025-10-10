// Глобальні змінні
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentProducts = [];

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    updateCartCounter();
});

// Ініціалізація сторінки
function initializePage() {
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'mens-clothing':
            loadProducts('./data/mens_clothing1.json');
            break;
        case 'womens-clothing':
            loadProducts('./data/womens_clothing1.json');
            break;
        case 'electronics':
            loadProducts('./data/electronics1.json');
            break;
        case 'home':
        default:
            loadFeaturedProducts();
            break;
    }
    
    // Ініціалізація пошуку
    initializeSearch();
}

// Отримання поточної сторінки
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('mens-clothing')) return 'mens-clothing';
    if (path.includes('womens-clothing')) return 'womens-clothing';
    if (path.includes('electronics')) return 'electronics';
    return 'home';
}

// Завантаження товарів
async function loadProducts(jsonPath) {
    try {
        showLoading();
        
        const response = await fetch(jsonPath);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentProducts = data.products || [];
        
        displayProducts(currentProducts);
        
    } catch (error) {
        console.error('Помилка завантаження товарів:', error);
        showError('Не вдалося завантажити товари. Спробуйте оновити сторінку.');
        
        // Заглушка для тестування
        loadFallbackProducts();
    } finally {
        hideLoading();
    }
}

// Завантаження рекомендованих товарів (для головної сторінки)
async function loadFeaturedProducts() {
    try {
        // Завантажуємо товари з різних категорій
        const responses = await Promise.all([
            fetch('./data/mens_clothing1.json').catch(() => null),
            fetch('./data/womens_clothing1.json').catch(() => null),
            fetch('./data/electronics1.json').catch(() => null)
        ]);
        
        let allProducts = [];
        
        for (const response of responses) {
            if (response && response.ok) {
                const data = await response.json();
                if (data.products) {
                    // Беремо перші 4 товари з кожної категорії
                    allProducts = allProducts.concat(data.products.slice(0, 4));
                }
            }
        }
        
        currentProducts = allProducts;
        displayProducts(currentProducts);
        
    } catch (error) {
        console.error('Помилка завантаження рекомендованих товарів:', error);
        loadFallbackProducts();
    }
}

// Заглушка для тестування
function loadFallbackProducts() {
    const fallbackProducts = [
        {
            id: 1,
            name: "Тестовий товар",
            price: 999,
            image: "images/placeholder.jpg",
            category: "Тест",
            description: "Тимчасовий товар для тестування"
        },
        {
            id: 2,
            name: "Тестовий товар 2",
            price: 1499,
            image: "images/placeholder.jpg",
            category: "Тест",
            description: "Ще один тестовий товар"
        }
    ];
    
    currentProducts = fallbackProducts;
    displayProducts(currentProducts);
}

// Відображення товарів
function displayProducts(products) {
    const container = document.getElementById('products-container');
    if (!container) {
        console.error('Контейнер для товарів не знайдено');
        return;
    }
    
    if (products.length === 0) {
        container.innerHTML = '<p class="no-products">Товари не знайдено</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-item" data-id="${product.id}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" 
                     onerror="this.src='images/placeholder.jpg'">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <p class="product-category">Категорія: ${product.category}</p>
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
    
    // Зберігаємо в localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Оновлюємо лічильник
    updateCartCounter();
    
    showNotification('Товар додано в кошик!', 'success');
}

// Оновлення лічильника кошика
function updateCartCounter() {
    const cartCounter = document.getElementById('cart-counter');
    if (cartCounter) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCounter.textContent = totalItems;
        cartCounter.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

// Пошук товарів
function initializeSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            if (e.target.value.length >= 2) {
                searchProducts(e.target.value);
            } else if (e.target.value.length === 0) {
                // Показати всі товари при очищенні пошуку
                displayProducts(currentProducts);
            }
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProducts(e.target.value);
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchProducts(searchInput.value);
            }
        });
    }
}

function searchProducts(query) {
    if (!query.trim()) {
        displayProducts(currentProducts);
        return;
    }
    
    const filteredProducts = currentProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    
    displayProducts(filteredProducts);
}

// Утиліти
function showLoading() {
    const container = document.getElementById('products-container');
    if (container) {
        container.innerHTML = '<div class="loading">Завантаження товарів...</div>';
    }
}

function hideLoading() {
    // Можна додати анімацію завантаження
}

function showError(message) {
    const container = document.getElementById('products-container');
    if (container) {
        container.innerHTML = `<div class="error">${message}</div>`;
    }
}

function showNotification(message, type = 'info') {
    // Створюємо сповіщення
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Стилі для сповіщення
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Автоматично видаляємо через 3 секунди
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Глобальні функції для HTML
window.addToCart = addToCart;
window.searchProducts = searchProducts;
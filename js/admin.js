// Адмін-панель для магазину

let products = [];
let categories = [];
let currentEditingProduct = null;

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
    
    await loadAllData();
    setupEventListeners();
    setupNavigation();
    updateDashboard();
    displayProducts();
    displayCategories();
    
    console.log('✅ Admin panel ready');
}

// Завантаження даних
async function loadAllData() {
    try {
        console.log('📥 Loading data from products.json...');
        
        const response = await fetch('./data/products.json');
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Data loaded successfully:', data);
        
        products = data.products || [];
        
        // Створюємо категорії
        categories = [
            { id: 'mens-clothing', name: 'Чоловічий одяг' },
            { id: 'womens-clothing', name: 'Жіночий одяг' },
            { id: 'electronics', name: 'Електроніка' }
        ];
        
        console.log(`📊 Loaded: ${products.length} products, ${categories.length} categories`);
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showNotification('Не вдалося завантажити товари з JSON файлів', 'error');
        
        // Створюємо тестові дані
        createFallbackData();
    }
}

// Тестові дані
function createFallbackData() {
    console.log('🛠 Creating fallback data...');
    
    products = [
        {
            id: 1,
            name: "Чоловіча футболка Basic",
            category: "mens-clothing",
            price: 299,
            image: "https://via.placeholder.com/300x300/007bff/ffffff?text=T-Shirt",
            description: "Зручна чоловіча футболка з бавовни",
            status: "active"
        },
        {
            id: 2,
            name: "Джинси Classic",
            category: "mens-clothing",
            price: 799,
            image: "https://via.placeholder.com/300x300/28a745/ffffff?text=Jeans",
            description: "Класичні чоловічі джинси",
            status: "active"
        }
    ];
    
    categories = [
        { id: "mens-clothing", name: "Чоловічий одяг" },
        { id: "womens-clothing", name: "Жіночий одяг" },
        { id: "electronics", name: "Електроніка" }
    ];
    
    showNotification('Використовуються тестові дані', 'warning');
}

// Налаштування подій
function setupEventListeners() {
    // Додати товар
    document.getElementById('add-product-btn')?.addEventListener('click', showProductModal);
    
    // Форма товару
    document.getElementById('product-form')?.addEventListener('submit', handleProductSubmit);
    
    // Скасування
    document.getElementById('cancel-edit')?.addEventListener('click', resetProductModal);
    
    // Закриття модалки
    document.querySelector('.close')?.addEventListener('click', resetProductModal);
    
    // Пошук
    document.getElementById('product-search')?.addEventListener('input', function(e) {
        searchProducts(e.target.value);
    });
    
    // Вихід
    document.getElementById('logout-btn')?.addEventListener('click', function() {
        if (confirm('Вийти з адмін-панелі?')) {
            localStorage.removeItem('adminAuthenticated');
            window.location.href = 'index.html';
        }
    });
}

// Навігація
function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item a');
    const sections = document.querySelectorAll('.content-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Оновлюємо активне меню
            menuItems.forEach(i => i.parentElement.classList.remove('active'));
            this.parentElement.classList.add('active');
            
            // Показуємо секцію
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// Оновлення статистики
function updateDashboard() {
    document.getElementById('total-products').textContent = products.length;
    document.getElementById('total-categories').textContent = categories.length;
}

// Відображення товарів
function displayProducts(productsToShow = products) {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;
    
    if (productsToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Товари не знайдено</td></tr>';
        return;
    }
    
    tbody.innerHTML = productsToShow.map(product => `
        <tr>
            <td>${product.id}</td>
            <td>
                <img src="${product.image || 'https://via.placeholder.com/50x50/ecf0f1/666?text=IMG'}" 
                     alt="${product.name}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                     onerror="this.src='https://via.placeholder.com/50x50/ecf0f1/666?text=IMG'">
            </td>
            <td>${product.name}</td>
            <td>${getCategoryName(product.category)}</td>
            <td>${product.price} грн</td>
            <td>
                <span class="status-badge ${product.status === 'active' ? 'active' : 'inactive'}">
                    ${product.status === 'active' ? 'Активний' : 'Неактивний'}
                </span>
            </td>
            <td>
                <button class="btn-edit" onclick="editProduct(${product.id})">Редагувати</button>
                <button class="btn-delete" onclick="deleteProduct(${product.id})">Видалити</button>
            </td>
        </tr>
    `).join('');
}

// Відображення категорій
function displayCategories() {
    const container = document.getElementById('categories-list');
    const categorySelect = document.getElementById('product-category');
    
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Оберіть категорію</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
    
    if (container) {
        container.innerHTML = categories.map(category => {
            const productCount = products.filter(p => p.category === category.id).length;
            return `
                <div class="category-card">
                    <h3>${category.name}</h3>
                    <p>${getCategoryDescription(category.id)}</p>
                    <span class="product-count">Товарів: ${productCount}</span>
                </div>
            `;
        }).join('');
    }
}

// Пошук товарів
function searchProducts(query) {
    if (!query.trim()) {
        displayProducts(products);
        return;
    }
    
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(query.toLowerCase())) ||
        (product.category && getCategoryName(product.category).toLowerCase().includes(query.toLowerCase()))
    );
    
    displayProducts(filteredProducts);
}

// Модальне вікно товару
function showProductModal() {
    currentEditingProduct = null;
    document.getElementById('modal-title').textContent = 'Додати товар';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-modal').style.display = 'block';
}

function resetProductModal() {
    document.getElementById('product-modal').style.display = 'none';
    currentEditingProduct = null;
}

// Редагування товару
function editProduct(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    
    currentEditingProduct = product;
    document.getElementById('modal-title').textContent = 'Редагувати товар';
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-image').value = product.image || '';
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-modal').style.display = 'block';
}

// Видалення товару
function deleteProduct(productId) {
    if (!confirm('Ви впевнені, що хочете видалити цей товар?')) return;
    
    products = products.filter(p => p.id != productId);
    displayProducts();
    updateDashboard();
    displayCategories();
    showNotification('Товар успішно видалено');
}

// Обробка форми
function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = {
        id: document.getElementById('product-id').value || generateId(),
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        image: document.getElementById('product-image').value,
        description: document.getElementById('product-description').value,
        status: 'active'
    };
    
    // Валідація
    if (!formData.name || !formData.category || !formData.price) {
        showNotification('Будь ласка, заповніть обовязкові поля', 'error');
        return;
    }
    
    if (currentEditingProduct) {
        // Оновлення
        const index = products.findIndex(p => p.id == currentEditingProduct.id);
        if (index !== -1) {
            products[index] = { ...currentEditingProduct, ...formData };
            showNotification('Товар успішно оновлено');
        }
    } else {
        // Додавання
        products.push(formData);
        showNotification('Товар успішно додано');
    }
    
    displayProducts();
    updateDashboard();
    displayCategories();
    resetProductModal();
}

// Допоміжні функції
function getCategoryName(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
}

function getCategoryDescription(categoryId) {
    const descriptions = {
        'mens-clothing': 'Стильний одяг для чоловіків',
        'womens-clothing': 'Елегантний одяг для жінок',
        'electronics': 'Сучасна техніка та гаджети'
    };
    return descriptions[categoryId] || 'Опис категорії';
}

function generateId() {
    return Date.now();
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Глобальні функції
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

// Додаємо стилі
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    .status-badge.active {
        background: #d4edda;
        color: #155724;
    }
    .status-badge.inactive {
        background: #f8d7da;
        color: #721c24;
    }
    .btn-edit {
        background: #f39c12;
        color: white;
        border: none;
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.8rem;
        margin-right: 0.25rem;
    }
    .btn-delete {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.8rem;
    }
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
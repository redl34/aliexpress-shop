// Глобальні змінні адмін-панелі
let allProducts = [];
let currentEditingProduct = null;

// Ініціалізація адмін-панелі
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

// Ініціалізація адмін-панелі
async function initializeAdmin() {
    await loadAllProducts();
    setupEventListeners();
    updateStats();
}

// Завантаження всіх товарів
async function loadAllProducts() {
    try {
        showAdminLoading();
        
        const categories = [
            { name: 'mens-clothing', path: './data/mens_clothing1.json' },
            { name: 'womens-clothing', path: './data/womens_clothing1.json' },
            { name: 'electronics', path: './data/electronics1.json' }
        ];
        
        allProducts = [];
        
        for (const category of categories) {
            try {
                const response = await fetch(category.path);
                if (response.ok) {
                    const data = await response.json();
                    if (data.products) {
                        // Додаємо категорію до кожного товару
                        const productsWithCategory = data.products.map(product => ({
                            ...product,
                            category: category.name
                        }));
                        allProducts = allProducts.concat(productsWithCategory);
                    }
                } else {
                    console.warn(`Не вдалося завантажити ${category.name}: ${response.status}`);
                }
            } catch (error) {
                console.error(`Помилка завантаження ${category.name}:`, error);
            }
        }
        
        displayAdminProducts(allProducts);
        
    } catch (error) {
        console.error('Критична помилка завантаження товарів:', error);
        showAdminError('Не вдалося завантажити товари. Перевірте підключення до інтернету та наявність JSON файлів.');
    } finally {
        hideAdminLoading();
    }
}

// Відображення товарів в адмін-панелі
function displayAdminProducts(products) {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-products">Товари не знайдено</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr data-id="${product.id}">
            <td>${product.id}</td>
            <td>
                <img src="${product.image}" alt="${product.name}" 
                     onerror="this.src='images/placeholder.jpg'" 
                     class="product-thumbnail">
            </td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.price} грн</td>
            <td>${product.description}</td>
            <td class="actions">
                <button class="btn-edit" onclick="editProduct(${product.id})">
                    Редагувати
                </button>
                <button class="btn-delete" onclick="deleteProduct(${product.id})">
                    Видалити
                </button>
            </td>
        </tr>
    `).join('');
}

// Налаштування слухачів подій
function setupEventListeners() {
    // Пошук в адмін-панелі
    const adminSearch = document.getElementById('admin-search');
    if (adminSearch) {
        adminSearch.addEventListener('input', function(e) {
            searchAdminProducts(e.target.value);
        });
    }
    
    // Форма додавання/редагування товару
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
    
    // Кнопка додавання нового товару
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductForm);
    }
    
    // Кнопка скасування в формі
    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetProductForm);
    }
    
    // Експорт даних
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
}

// Пошук в адмін-панелі
function searchAdminProducts(query) {
    if (!query.trim()) {
        displayAdminProducts(allProducts);
        return;
    }
    
    const filteredProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase()) ||
        product.id.toString().includes(query)
    );
    
    displayAdminProducts(filteredProducts);
}

// Показати форму додавання товару
function showAddProductForm() {
    currentEditingProduct = null;
    resetProductForm();
    
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    
    if (modalTitle) {
        modalTitle.textContent = 'Додати новий товар';
    }
    
    if (modal) {
        modal.style.display = 'block';
    }
}

// Редагування товару
function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    currentEditingProduct = product;
    
    // Заповнюємо форму даними товару
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-image').value = product.image;
    document.getElementById('product-description').value = product.description;
    
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    
    if (modalTitle) {
        modalTitle.textContent = 'Редагувати товар';
    }
    
    if (modal) {
        modal.style.display = 'block';
    }
}

// Обробка відправки форми
function handleProductSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = {
        id: parseInt(formData.get('id')) || generateNewId(),
        name: formData.get('name'),
        price: parseFloat(formData.get('price')),
        category: formData.get('category'),
        image: formData.get('image'),
        description: formData.get('description')
    };
    
    // Валідація
    if (!productData.name || !productData.price || !productData.category) {
        showAdminNotification('Будь ласка, заповніть обовʼязкові поля', 'error');
        return;
    }
    
    if (currentEditingProduct) {
        // Оновлення існуючого товару
        updateProduct(productData);
    } else {
        // Додавання нового товару
        addNewProduct(productData);
    }
    
    // Закриваємо модальне вікно
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Додавання нового товару
function addNewProduct(productData) {
    allProducts.push(productData);
    displayAdminProducts(allProducts);
    updateStats();
    showAdminNotification('Товар успішно додано!', 'success');
    
    // Тут має бути логіка збереження в JSON файл
    console.log('Новий товар:', productData);
}

// Оновлення товару
function updateProduct(productData) {
    const index = allProducts.findIndex(p => p.id === productData.id);
    if (index !== -1) {
        allProducts[index] = productData;
        displayAdminProducts(allProducts);
        updateStats();
        showAdminNotification('Товар успішно оновлено!', 'success');
        
        // Тут має бути логіка збереження в JSON файл
        console.log('Оновлений товар:', productData);
    }
}

// Видалення товару
function deleteProduct(productId) {
    if (!confirm('Ви впевнені, що хочете видалити цей товар?')) {
        return;
    }
    
    const index = allProducts.findIndex(p => p.id === productId);
    if (index !== -1) {
        allProducts.splice(index, 1);
        displayAdminProducts(allProducts);
        updateStats();
        showAdminNotification('Товар успішно видалено!', 'success');
        
        // Тут має бути логіка збереження в JSON файл
        console.log('Видалено товар з ID:', productId);
    }
}

// Генерація нового ID
function generateNewId() {
    return allProducts.length > 0 ? Math.max(...allProducts.map(p => p.id)) + 1 : 1;
}

// Скидання форми
function resetProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    currentEditingProduct = null;
}

// Оновлення статистики
function updateStats() {
    const totalProducts = document.getElementById('total-products');
    const totalCategories = document.getElementById('total-categories');
    
    if (totalProducts) {
        totalProducts.textContent = allProducts.length;
    }
    
    if (totalCategories) {
        const categories = new Set(allProducts.map(p => p.category));
        totalCategories.textContent = categories.size;
    }
}

// Експорт даних
function exportData() {
    const data = {
        exportDate: new Date().toISOString(),
        totalProducts: allProducts.length,
        products: allProducts
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `products_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Утиліти адмін-панелі
function showAdminLoading() {
    const tbody = document.getElementById('products-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading">Завантаження товарів...</td>
            </tr>
        `;
    }
}

function hideAdminLoading() {
    // Можна додати анімацію
}

function showAdminError(message) {
    const tbody = document.getElementById('products-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="error">${message}</td>
            </tr>
        `;
    }
}

function showAdminNotification(message, type = 'info') {
    // Проста реалізація сповіщення для адмін-панелі
    alert(`${type.toUpperCase()}: ${message}`);
}

// Глобальні функції для HTML
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
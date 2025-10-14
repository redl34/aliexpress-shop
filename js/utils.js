// Спільні утиліти для всього сайту

// Форматування ціни
function formatPrice(price, currency = 'UAH') {
    return new Intl.NumberFormat('uk-UA', {
        style: 'currency',
        currency: currency
    }).format(price);
}

// Генерація унікального ID
function generateUniqueId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// Перевірка email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Локалізація дати
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('uk-UA', options);
}

// Обмеження тексту
function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

// Перевірка на пустий об'єкт
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

// Глибока копія об'єкта
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Дебаг функція
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
}

// Збереження в LocalStorage з обробкою помилок
function safeSetLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Помилка збереження в LocalStorage:', error);
        return false;
    }
}

// Читання з LocalStorage з обробкою помилок
function safeGetLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Помилка читання з LocalStorage:', error);
        return defaultValue;
    }
}

// Валідація форми
function validateForm(formData, rules) {
    const errors = {};
    
    for (const [field, rule] of Object.entries(rules)) {
        const value = formData[field];
        
        if (rule.required && (!value || value.trim() === '')) {
            errors[field] = rule.required;
        } else if (rule.minLength && value.length < rule.minLength) {
            errors[field] = `Мінімальна довжина: ${rule.minLength} символів`;
        } else if (rule.pattern && !rule.pattern.test(value)) {
            errors[field] = rule.message || 'Некоректний формат';
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// Функція затримки
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Експорт функцій для використання в інших файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatPrice,
        generateUniqueId,
        isValidEmail,
        formatDate,
        truncateText,
        isEmpty,
        deepClone,
        debugLog,
        safeSetLocalStorage,
        safeGetLocalStorage,
        validateForm,
        delay
    };
}
/* Стилі для сповіщень */
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: #4CAF50;
    color: white;
    border-radius: 5px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
}

.notification.error { background: #f44336; }
.notification.info { background: #2196F3; }

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

/* Стилі для завантаження та помилок */
.loading, .error, .no-products {
    text-align: center;
    padding: 40px;
    font-size: 18px;
}

.loading { color: #2196F3; }
.error { color: #f44336; }
.no-products { color: #666; }

/* Стилі для адмін-панелі */
.product-thumbnail {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 4px;
}

.actions {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
}

.btn-edit, .btn-delete {
    padding: 5px 10px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
}

.btn-edit { background: #4CAF50; color: white; }
.btn-delete { background: #f44336; color: white; }

.btn-edit:hover { background: #45a049; }
.btn-delete:hover { background: #da190b; }

/* Посилання на сторінки */
.page-link {
    color: #2196F3;
    text-decoration: none;
    font-size: 12px;
    word-break: break-all;
}

.page-link:hover {
    text-decoration: underline;
}

/* Модальне вікно */
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
}

.modal-content {
    background-color: white;
    margin: 5% auto;
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
}

/* Комірка з описом */
.description-cell {
    max-width: 200px;
    word-wrap: break-word;
}

/* Адаптивність для адмін таблиці */
@media (max-width: 768px) {
    .actions {
        flex-direction: column;
    }
    
    .description-cell {
        max-width: 150px;
    }
}

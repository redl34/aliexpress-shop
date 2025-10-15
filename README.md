# 🤖 Автоматична перевірка цін

Цей проект автоматично перевіряє ціни та зображення товарів з AliExpress.

## 📊 Останній звіт

[![Price Check](https://github.com/redl34/aliexpress-shop/actions/workflows/check-prices.yml/badge.svg)](https://github.com/redl34/aliexpress-shop/actions/workflows/check-prices.yml)

[📈 Переглянути останній звіт](./reports/latest.json)

## 🔧 Як це працює

1. 🤖 GitHub Action запускається щодня о 8:00 UTC
2. 🔍 Скрипт парсить ваш сайт та AliExpress
3. 💰 Порівнює ціни та зображення
4. 📊 Генерує звіт у папці `reports/`
5. 🔄 Автоматично комітить звіт у репозиторій

## 🚀 Запуск вручну

1. Перейдіть в [Actions](https://github.com/redl34/aliexpress-shop/actions)
2. Виберіть "Check AliExpress Prices"
3. Натисніть "Run workflow"
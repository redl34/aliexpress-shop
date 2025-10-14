// Оновлена функція перевірки для реальних товарів
class PriceChecker {
    // ... інші методи залишаються ...

    async checkProduct(product) {
        console.log(`🔍 Checking product: ${product.name}`);
        
        // Якщо немає посилання на AliExpress - пропускаємо
        if (!product.aliExpressUrl || product.aliExpressUrl.trim() === '') {
            return {
                success: false,
                status: 'no_url',
                message: 'Додайте посилання на AliExpress'
            };
        }

        try {
            // Симулюємо перевірку (в реальності - парсинг AliExpress)
            const aliData = await this.simulateAliExpressCheck(product.aliExpressUrl);
            
            if (!aliData) {
                return {
                    success: false,
                    status: 'check_failed',
                    message: 'Не вдалося отримати дані з AliExpress'
                };
            }

            // Перевірка ціни
            const priceMatch = this.checkPrice(product.price, aliData.price);
            
            // Визначення статусу
            let status, message, needsPriceUpdate = false, newPrice = product.price;

            if (!priceMatch.isMatch) {
                status = 'price_updated';
                message = `Ціну оновлено: ${product.price} → ${priceMatch.aliPrice} грн`;
                needsPriceUpdate = true;
                newPrice = priceMatch.aliPrice;
            } else {
                status = 'success';
                message = '✅ Ціна актуальна';
            }

            // Зберігаємо результат
            this.saveCheckResult(product.id, {
                status,
                message,
                originalPrice: product.price,
                newPrice,
                aliPrice: aliData.price,
                checkedAt: new Date().toISOString(),
                needsPriceUpdate
            });

            return {
                success: true,
                status,
                message,
                needsPriceUpdate,
                newPrice,
                aliData
            };

        } catch (error) {
            console.error('Check error:', error);
            return {
                success: false,
                status: 'error',
                message: `Помилка: ${error.message}`
            };
        }
    }

    // ... інші методи ...
}
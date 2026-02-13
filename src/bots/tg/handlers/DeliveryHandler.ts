/**
 * Заглушка для обработчика расчетов доставки
 */

import { ExtendedContext, DeliveryRequest, DeliveryResponse } from '../types';

export class DeliveryHandler {
  async calculateDelivery(request: DeliveryRequest): Promise<DeliveryResponse[]> {
    // Заглушка - всегда возвращаем фиксированные результаты
    return [
      {
        service: 'СДЭК',
        cost: 500,
        deliveryTime: '2-3 дня',
        trackingUrl: 'https://cdek.ru/track',
      },
      {
        service: 'Почта России',
        cost: 350,
        deliveryTime: '5-7 дней',
        trackingUrl: 'https://www.pochta.ru/tracking',
      },
      {
        service: 'Деловые Линии',
        cost: 450,
        deliveryTime: '3-4 дня',
        trackingUrl: 'https://www.dellin.ru/tracker/',
      },
      {
        service: 'ПЭК',
        cost: 400,
        deliveryTime: '4-5 дней',
        trackingUrl: 'https://pecom.ru/services/tracking/',
      },
      {
        service: 'Байкал Сервис',
        cost: 380,
        deliveryTime: '4-6 дней',
        trackingUrl: 'https://baikalsr.ru/track/',
      },
    ];
  }

  async handleDeliveryRequest(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('📦 Запрос на расчет доставки получен (заглушка)');
    
    // Показываем пример результатов
    const results = await this.calculateDelivery({
      from: { city: 'Москва' },
      to: { city: 'Санкт-Петербург' },
      weight: 5,
    });

    let message = '📊 Результаты расчета (заглушка):\n\n';
    results.forEach(result => {
      message += `🚚 ${result.service}: ${result.cost}₽, ${result.deliveryTime}\n`;
    });

    await ctx.reply(message);
  }
}

export default new DeliveryHandler();

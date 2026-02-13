/**
 * Заглушка для адаптера Деловых Линий
 */

import { DeliveryRequest, DeliveryResponse } from '../../types';

export class BusinessLinesAdapter {
  async calculateDelivery(_request: DeliveryRequest): Promise<DeliveryResponse> {
    return {
      service: 'Деловые Линии',
      cost: 450,
      deliveryTime: '3-4 дня',
      trackingUrl: 'https://www.dellin.ru/tracker/',
    };
  }

  async trackDelivery(trackingNumber: string): Promise<any> {
    return {
      service: 'Деловые Линии',
      trackingNumber,
      status: 'В пути',
      lastUpdate: new Date().toISOString(),
    };
  }
}

export default new BusinessLinesAdapter();

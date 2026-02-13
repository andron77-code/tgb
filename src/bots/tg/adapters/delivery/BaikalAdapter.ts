/**
 * Заглушка для адаптера Байкал Сервис
 */

import { DeliveryRequest, DeliveryResponse } from '../../types';

export class BaikalAdapter {
  async calculateDelivery(_request: DeliveryRequest): Promise<DeliveryResponse> {
    return {
      service: 'Байкал Сервис',
      cost: 380,
      deliveryTime: '4-6 дней',
      trackingUrl: 'https://baikalsr.ru/track/',
    };
  }

  async trackDelivery(trackingNumber: string): Promise<any> {
    return {
      service: 'Байкал Сервис',
      trackingNumber,
      status: 'В пути',
      lastUpdate: new Date().toISOString(),
    };
  }
}

export default new BaikalAdapter();

/**
 * Заглушка для адаптера ПЭК
 */

import { DeliveryRequest, DeliveryResponse } from '../../types';

export class PekAdapter {
  async calculateDelivery(_request: DeliveryRequest): Promise<DeliveryResponse> {
    return {
      service: 'ПЭК',
      cost: 400,
      deliveryTime: '4-5 дней',
      trackingUrl: 'https://pecom.ru/services/tracking/',
    };
  }

  async trackDelivery(trackingNumber: string): Promise<any> {
    return {
      service: 'ПЭК',
      trackingNumber,
      status: 'В пути',
      lastUpdate: new Date().toISOString(),
    };
  }
}

export default new PekAdapter();

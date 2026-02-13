/**
 * Заглушка для адаптера Почты России
 */

import { DeliveryRequest, DeliveryResponse, PickupPoint } from '../../types';

export class RussianPostAdapter {
  async calculateDelivery(_request: DeliveryRequest): Promise<DeliveryResponse> {
    return {
      service: 'Почта России',
      cost: 350,
      deliveryTime: '5-7 дней',
      trackingUrl: 'https://www.pochta.ru/tracking',
      pickupPoints: await this.getPickupPoints(_request.from.city),
    };
  }

  async getPickupPoints(city: string): Promise<PickupPoint[]> {
    return [
      {
        id: 'russian-post-1',
        name: 'Почтовое отделение №123',
        address: `г. ${city}, ул. Тверская, д. 10`,
        workHours: '09:00-20:00',
        coordinates: { latitude: 55.7558, longitude: 37.6176 },
      },
    ];
  }

  async trackDelivery(trackingNumber: string): Promise<any> {
    return {
      service: 'Почта России',
      trackingNumber,
      status: 'В пути',
      lastUpdate: new Date().toISOString(),
    };
  }
}

export default new RussianPostAdapter();

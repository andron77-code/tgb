/**
 * Заглушка для адаптера СДЭК
 */

import { DeliveryRequest, DeliveryResponse, PickupPoint } from '../../types';

export class CdekAdapter {
  async calculateDelivery(_request: DeliveryRequest): Promise<DeliveryResponse> {
    return {
      service: 'СДЭК',
      cost: 500,
      deliveryTime: '2-3 дня',
      trackingUrl: 'https://cdek.ru/track',
      pickupPoints: await this.getPickupPoints(_request.from.city),
    };
  }

  async getPickupPoints(city: string): Promise<PickupPoint[]> {
    return [
      {
        id: 'cdek-1',
        name: 'ПВЗ СДЭК ТЦ "Европейский"',
        address: `г. ${city}, пл. Киевского вокзала, д. 2`,
        workHours: '10:00-22:00',
        coordinates: { latitude: 55.7756, longitude: 37.6588 },
      },
    ];
  }

  async trackDelivery(trackingNumber: string): Promise<any> {
    return {
      service: 'СДЭК',
      trackingNumber,
      status: 'В пути',
      lastUpdate: new Date().toISOString(),
    };
  }
}

export default new CdekAdapter();

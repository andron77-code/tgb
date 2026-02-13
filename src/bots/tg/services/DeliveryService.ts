/**
 * Заглушка для сервиса доставки
 */

import { DeliveryRequest, DeliveryResponse, PickupPoint } from '../types';

export class DeliveryService {
  async calculateDelivery(request: DeliveryRequest): Promise<DeliveryResponse[]> {
    // Заглушка - всегда возвращаем фиксированные результаты
    return [
      {
        service: 'СДЭК',
        cost: 500,
        deliveryTime: '2-3 дня',
        trackingUrl: 'https://cdek.ru/track',
        pickupPoints: [
          {
            id: 'cdek-1',
            name: 'ПВЗ СДЭК ТЦ "Европейский"',
            address: 'г. Москва, пл. Киевского вокзала, д. 2',
            workHours: '10:00-22:00',
            coordinates: { latitude: 55.7756, longitude: 37.6588 },
          },
        ],
      },
      {
        service: 'Почта России',
        cost: 350,
        deliveryTime: '5-7 дней',
        trackingUrl: 'https://www.pochta.ru/tracking',
        pickupPoints: [
          {
            id: 'russian-post-1',
            name: 'Почтовое отделение №123',
            address: 'г. Москва, ул. Тверская, д. 10',
            workHours: '09:00-20:00',
            coordinates: { latitude: 55.7558, longitude: 37.6176 },
          },
        ],
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

  async getPickupPoints(city: string, service?: string): Promise<PickupPoint[]> {
    // Заглушка - возвращаем фиксированные пункты выдачи
    return [
      {
        id: 'pickup-1',
        name: 'Пункт выдачи заказов №1',
        address: `г. ${city}, ул. Центральная, д. 1`,
        workHours: '10:00-20:00',
        coordinates: { latitude: 55.7558, longitude: 37.6176 },
      },
      {
        id: 'pickup-2',
        name: 'Пункт выдачи заказов №2',
        address: `г. ${city}, ул. Советская, д. 5`,
        workHours: '09:00-21:00',
        coordinates: { latitude: 55.7558, longitude: 37.6176 },
      },
    ];
  }

  async trackDelivery(service: string, trackingNumber: string): Promise<any> {
    // Заглушка
    return {
      service,
      trackingNumber,
      status: 'В пути',
      lastUpdate: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async saveCalculation(userId: number, request: DeliveryRequest, results: DeliveryResponse[]): Promise<string> {
    // Заглушка - возвращаем ID расчета
    return `calc_${userId}_${Date.now()}`;
  }

  async getCalculationHistory(userId: number): Promise<any[]> {
    // Заглушка
    return [];
  }
}

export default new DeliveryService();

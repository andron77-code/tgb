/**
 * Конфигурация служб доставки
 */

export interface DeliveryServiceConfig {
  apiUrl: string;
  timeout?: number;
  retries?: number;
}

export interface CDEKConfig extends DeliveryServiceConfig {
  apiKey: string;
  account: string;
}

export interface RussianPostConfig extends DeliveryServiceConfig {
  token: string;
}

export interface BusinessLinesConfig extends DeliveryServiceConfig {
  apiKey: string;
}

export interface PEKConfig extends DeliveryServiceConfig {
  login: string;
  password: string;
}

export interface BaikalConfig extends DeliveryServiceConfig {
  token: string;
}

export const cdekConfig: CDEKConfig = {
  apiUrl: process.env.CDEK_API_URL || 'https://api.cdek.ru/v2',
  apiKey: process.env.CDEK_API_KEY || '',
  account: process.env.CDEK_ACCOUNT || '',
  timeout: parseInt(process.env.CDEK_TIMEOUT || '10000', 10),
  retries: parseInt(process.env.CDEK_RETRIES || '3', 10),
};

export const russianPostConfig: RussianPostConfig = {
  apiUrl: process.env.RUSSIAN_POST_API_URL || 'https://tracking.russianpost.ru',
  token: process.env.RUSSIAN_POST_TOKEN || '',
  timeout: parseInt(process.env.RUSSIAN_POST_TIMEOUT || '10000', 10),
  retries: parseInt(process.env.RUSSIAN_POST_RETRIES || '3', 10),
};

export const businessLinesConfig: BusinessLinesConfig = {
  apiUrl: process.env.BUSINESS_LINES_API_URL || 'https://api.dellin.ru/v2',
  apiKey: process.env.BUSINESS_LINES_API_KEY || '',
  timeout: parseInt(process.env.BUSINESS_LINES_TIMEOUT || '10000', 10),
  retries: parseInt(process.env.BUSINESS_LINES_RETRIES || '3', 10),
};

export const pekConfig: PEKConfig = {
  apiUrl: process.env.PEK_API_URL || 'https://ktt.pecom.ru/v2',
  login: process.env.PEK_LOGIN || '',
  password: process.env.PEK_PASSWORD || '',
  timeout: parseInt(process.env.PEK_TIMEOUT || '10000', 10),
  retries: parseInt(process.env.PEK_RETRIES || '3', 10),
};

export const baikalConfig: BaikalConfig = {
  apiUrl: process.env.BAIKAL_API_URL || 'https://api.baikalsr.ru',
  token: process.env.BAIKAL_TOKEN || '',
  timeout: parseInt(process.env.BAIKAL_TIMEOUT || '10000', 10),
  retries: parseInt(process.env.BAIKAL_RETRIES || '3', 10),
};

export const deliveryServices = {
  cdek: cdekConfig,
  russianPost: russianPostConfig,
  businessLines: businessLinesConfig,
  pek: pekConfig,
  baikal: baikalConfig,
};

export default {
  cdek: cdekConfig,
  russianPost: russianPostConfig,
  businessLines: businessLinesConfig,
  pek: pekConfig,
  baikal: baikalConfig,
  services: deliveryServices,
};

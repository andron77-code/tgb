/**
 * Основная конфигурация Telegram бота
 */

import { BotConfig } from '../types';

export const botConfig: BotConfig = {
  token: process.env.TG_BOT_TOKEN || '',
  webhookUrl: process.env.TG_WEBHOOK_URL,
  polling: process.env.TG_POLLING !== 'false',
};

export const sessionConfig = {
  ttl: parseInt(process.env.SESSION_TTL || '3600', 10), // 1 час
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
};

export const databaseConfig = {
  postgres: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DATABASE || 'telegram_bot',
    username: process.env.PG_USERNAME || 'postgres',
    password: process.env.PG_PASSWORD || '',
    ssl: process.env.PG_SSL === 'true',
    maxConnections: parseInt(process.env.PG_MAX_CONNECTIONS || '20', 10),
  },
};

export const deliveryConfig = {
  cdek: {
    apiUrl: process.env.CDEK_API_URL || 'https://api.cdek.ru/v2',
    apiKey: process.env.CDEK_API_KEY || '',
    account: process.env.CDEK_ACCOUNT || '',
  },
  russianPost: {
    apiUrl: process.env.RUSSIAN_POST_API_URL || 'https://tracking.russianpost.ru',
    token: process.env.RUSSIAN_POST_TOKEN || '',
  },
  businessLines: {
    apiUrl: process.env.BUSINESS_LINES_API_URL || 'https://api.dellin.ru/v2',
    apiKey: process.env.BUSINESS_LINES_API_KEY || '',
  },
  pek: {
    apiUrl: process.env.PEK_API_URL || 'https://ktt.pecom.ru/v2',
    login: process.env.PEK_LOGIN || '',
    password: process.env.PEK_PASSWORD || '',
  },
  baikal: {
    apiUrl: process.env.BAIKAL_API_URL || 'https://api.baikalsr.ru',
    token: process.env.BAIKAL_TOKEN || '',
  },
};

export const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT || 'json',
  file: process.env.LOG_FILE,
};

export const cacheConfig = {
  deliveryCalculations: {
    ttl: parseInt(process.env.CACHE_DELIVERY_TTL || '1800', 10), // 30 минут
  },
  userSessions: {
    ttl: parseInt(process.env.CACHE_SESSION_TTL || '3600', 10), // 1 час
  },
};

export const securityConfig = {
  maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '30', 10),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520', 10), // 20MB
  allowedUsers: process.env.ALLOWED_USERS?.split(',').map(id => parseInt(id.trim(), 10)) || [],
  adminUsers: process.env.ADMIN_USERS?.split(',').map(id => parseInt(id.trim(), 10)) || [],
};

export default {
  bot: botConfig,
  session: sessionConfig,
  database: databaseConfig,
  delivery: deliveryConfig,
  logging: loggingConfig,
  cache: cacheConfig,
  security: securityConfig,
};

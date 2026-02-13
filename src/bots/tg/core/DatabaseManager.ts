/**
 * Менеджер баз данных - унифицированный интерфейс для работы с PostgreSQL и Redis
 */

import { PostgreSQLAdapter } from '../adapters/database/PostgreSQLAdapter';
import { RedisAdapter } from '../adapters/database/RedisAdapter';
import { postgresConfig, redisConfig, redisEnabled } from '../config/database';
import { SessionData, DeliveryRequest, DeliveryResponse } from '../types';
import { logger } from '../../../helpers';

export class DatabaseManager {
  private postgres: PostgreSQLAdapter;
  private redis: RedisAdapter;
  private isInitialized: boolean = false;

  constructor() {
    this.postgres = new PostgreSQLAdapter(postgresConfig);
    this.redis = new RedisAdapter(redisConfig);
    logger.info('Database manager created');
  }

  async initialize(): Promise<void> {
    try {
      // Инициализация PostgreSQL
      await this.postgres.initializeSchema();
      
      // Подключение к Redis (если включен)
      if (redisEnabled) {
        await this.redis.connect();
        logger.info('Redis connected successfully');
      } else {
        logger.info('Redis is disabled, skipping connection');
      }
      
      this.isInitialized = true;
      logger.info('Database manager initialized successfully');
    } catch (error) {
      logger.error('Database manager initialization failed:', error);
      throw error;
    }
  }

  // Проверка инициализации
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database manager not initialized');
    }
  }

  // === Работа с пользователями ===

  async createUser(userData: {
    telegramId: number;
    username?: string;
    firstName: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<void> {
    this.ensureInitialized();
    await this.postgres.createUser(userData);
  }

  async getUser(telegramId: number) {
    this.ensureInitialized();
    return await this.postgres.getUser(telegramId);
  }

  // === Работа с сессиями ===

  async getSession(chatId: number): Promise<SessionData | null> {
    this.ensureInitialized();
    if (!redisEnabled) {
      logger.warn('Redis is disabled, getSession returning null');
      return null;
    }
    return await this.redis.getSession(chatId);
  }

  async setSession(chatId: number, sessionData: Omit<SessionData, 'createdAt' | 'updatedAt'>, ttl?: number): Promise<void> {
    this.ensureInitialized();
    if (!redisEnabled) {
      logger.warn('Redis is disabled, setSession skipped');
      return;
    }
    await this.redis.setSession(chatId, sessionData, ttl);
  }

  async updateSession(chatId: number, updates: Partial<SessionData>): Promise<void> {
    this.ensureInitialized();
    if (!redisEnabled) {
      logger.warn('Redis is disabled, updateSession skipped');
      return;
    }
    await this.redis.updateSession(chatId, updates);
  }

  async deleteSession(chatId: number): Promise<void> {
    this.ensureInitialized();
    if (!redisEnabled) {
      logger.warn('Redis is disabled, deleteSession skipped');
      return;
    }
    await this.redis.deleteSession(chatId);
  }

  // === Работа с ролями и правами ===

  async assignRole(telegramId: number, roleName: string, assignedBy: number): Promise<void> {
    this.ensureInitialized();
    await this.postgres.assignRole(telegramId, roleName, assignedBy);
  }

  async getUserRoles(telegramId: number) {
    this.ensureInitialized();
    return await this.postgres.getUserRoles(telegramId);
  }

  async hasPermission(telegramId: number, permission: string): Promise<boolean> {
    this.ensureInitialized();
    return await this.postgres.hasPermission(telegramId, permission);
  }

  // === Работа с расчетами доставки ===

  async saveDeliveryCalculation(userId: number, request: DeliveryRequest, results: DeliveryResponse[]): Promise<string> {
    // Заглушка - возвращаем фиксированный ID
    const calculationId = `calc_${userId}_${Date.now()}`;
    logger.info('Mock: saveDeliveryCalculation', { userId, calculationId });
    return calculationId;
  }

  async getDeliveryHistory(telegramId: number, limit: number = 10) {
    // Заглушка - возвращаем пустую историю
    logger.info('Mock: getDeliveryHistory', { telegramId, limit });
    return { rows: [] };
  }

  // === Работа с кэшем ===

  async cacheDeliveryCalculation(cacheKey: string, data: any, ttl: number): Promise<void> {
    // Заглушка - ничего не делаем
    logger.info('Mock: cacheDeliveryCalculation', { cacheKey, ttl });
  }

  async getCachedDeliveryCalculation(cacheKey: string): Promise<any | null> {
    // Заглушка - возвращаем null (кэш не найден)
    logger.info('Mock: getCachedDeliveryCalculation', cacheKey);
    return null;
  }

  async invalidateDeliveryCache(pattern: string): Promise<void> {
    // Заглушка - ничего не делаем
    logger.info('Mock: invalidateDeliveryCache', pattern);
  }

  // === Проверка работоспособности ===

  async healthCheck(): Promise<{ postgres: boolean; redis: boolean }> {
    // Заглушка - всегда возвращаем true
    logger.info('Mock: healthCheck');
    return { postgres: true, redis: true };
  }

  async checkPostgresHealth(): Promise<boolean> {
    // Заглушка - всегда true
    logger.info('Mock: checkPostgresHealth');
    return true;
  }

  async checkRedisHealth(): Promise<boolean> {
    // Заглушка - всегда true
    logger.info('Mock: checkRedisHealth');
    return true;
  }

  // === Статистика ===

  async getStatistics(): Promise<{
    totalUsers: number;
    activeSessions: number;
    totalCalculations: number;
    calculationsToday: number;
  }> {
    // Заглушка - возвращаем нулевую статистику
    logger.info('Mock: getStatistics');
    return {
      totalUsers: 0,
      activeSessions: 0,
      totalCalculations: 0,
      calculationsToday: 0,
    };
  }

  // === Прямой доступ к PostgreSQL для сложных запросов ===

  async query(text: string, params?: any[]): Promise<any> {
    // Заглушка - возвращаем пустой результат
    logger.info('Mock: query', { text, params });
    return { rows: [] };
  }

  // === Резервное копирование ===

  async backupData(): Promise<{
    users: any;
    roles: any;
    calculations: any;
  }> {
    // Заглушка - возвращаем пустые данные
    logger.info('Mock: backupData');
    return {
      users: [],
      roles: [],
      calculations: [],
    };
  }

  // === Очистка ===

  async cleanupExpiredSessions(): Promise<number> {
    // Заглушка - возвращаем 0 удаленных сессий
    logger.info('Mock: cleanupExpiredSessions');
    return 0;
  }

  async close(): Promise<void> {
    try {
      this.isInitialized = false;
      logger.info('Database manager closed (mock mode)');
    } catch (error) {
      logger.error('Error closing database manager:', error);
      throw error;
    }
  }
}

export default DatabaseManager;

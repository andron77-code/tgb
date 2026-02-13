/**
 * Менеджер баз данных - унифицированный интерфейс для работы с PostgreSQL и Redis
 */

import { PostgreSQLAdapter, RedisAdapter } from '../adapters';
import { postgresConfig, redisConfig } from '../config/database';
import { SessionData, DeliveryRequest, DeliveryResponse } from '../types';
import { logger } from '../../../helpers';

export class DatabaseManager {
  private postgres: PostgreSQLAdapter;
  private redis: RedisAdapter;
  private isInitialized: boolean = false;

  constructor() {
    // Временно закомментировано для работы без реальных баз данных
    // this.postgres = new PostgreSQLAdapter(postgresConfig);
    // this.redis = new RedisAdapter(redisConfig);
    
    // Создаем заглушки вместо реальных адаптеров
    this.postgres = null as any;
    this.redis = null as any;
    
    logger.info('Database manager created in mock mode');
  }

  async initialize(): Promise<void> {
    try {
      // Временно закомментировано для работы без реальных баз данных
      // Инициализация PostgreSQL
      // await this.postgres.initializeSchema();
      
      // Подключение к Redis
      // await this.redis.connect();
      
      this.isInitialized = true;
      logger.info('Database manager initialized in mock mode');
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
    // Заглушка - ничего не делаем
    logger.info('Mock: createUser', userData);
  }

  async getUser(telegramId: number) {
    // Заглушка - возвращаем пустой результат
    logger.info('Mock: getUser', telegramId);
    return { rows: [] };
  }

  // === Работа с сессиями ===

  async getSession(chatId: number): Promise<SessionData | null> {
    // Заглушка - возвращаем null
    logger.info('Mock: getSession', chatId);
    return null;
  }

  async setSession(chatId: number, sessionData: Omit<SessionData, 'createdAt' | 'updatedAt'>, ttl?: number): Promise<void> {
    // Заглушка - ничего не делаем
    logger.info('Mock: setSession', chatId);
  }

  async updateSession(chatId: number, updates: Partial<SessionData>): Promise<void> {
    // Заглушка - ничего не делаем
    logger.info('Mock: updateSession', chatId);
  }

  async deleteSession(chatId: number): Promise<void> {
    // Заглушка - ничего не делаем
    logger.info('Mock: deleteSession', chatId);
  }

  // === Работа с ролями и правами ===

  async assignRole(telegramId: number, roleId: string, assignedBy: number): Promise<void> {
    // Заглушка - ничего не делаем
    logger.info('Mock: assignRole', { telegramId, roleId, assignedBy });
  }

  async getUserRoles(telegramId: number) {
    // Заглушка - возвращаем пустой результат
    logger.info('Mock: getUserRoles', telegramId);
    return { rows: [] };
  }

  async hasPermission(telegramId: number, permission: string): Promise<boolean> {
    // Заглушка - всегда разрешаем (для тестирования)
    logger.info('Mock: hasPermission', { telegramId, permission });
    return true;

      // Проверяем разрешения для каждой роли
      for (const role of roles) {
        const permissionsQuery = `
          SELECT p.* FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          WHERE rp.role_id = $1 AND p.id = $2
        `;
        const permissionResult = await this.postgres.query(permissionsQuery, [role.id, permission]);
        
        if (permissionResult.rows.length > 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }

  // === Работа с расчетами доставки ===

  async saveDeliveryCalculation(calculation: {
    userId: number;
    service: string;
    fromCity: string;
    toCity: string;
    cost: number;
    deliveryTime: string;
    requestData: any;
    responseData: any;
  }): Promise<void> {
    this.ensureInitialized();
    await this.postgres.saveDeliveryCalculation(calculation);
  }

  async getDeliveryHistory(telegramId: number, limit: number = 10) {
    this.ensureInitialized();
    return await this.postgres.getDeliveryHistory(telegramId, limit);
  }

  // === Работа с кэшем ===

  async cacheDeliveryCalculation(cacheKey: string, data: any, ttl?: number): Promise<void> {
    this.ensureInitialized();
    await this.redis.cacheDeliveryCalculation(cacheKey, data, ttl);
  }

  async getCachedDeliveryCalculation(cacheKey: string): Promise<any | null> {
    this.ensureInitialized();
    return await this.redis.getCachedDeliveryCalculation(cacheKey);
  }

  async invalidateDeliveryCache(pattern?: string): Promise<void> {
    this.ensureInitialized();
    await this.redis.invalidateDeliveryCache(pattern);
  }

  // === Утилиты ===

  async healthCheck(): Promise<{ postgres: boolean; redis: boolean }> {
    try {
      const postgresHealth = await this.checkPostgresHealth();
      const redisHealth = await this.checkRedisHealth();
      
      return {
        postgres: postgresHealth,
        redis: redisHealth,
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        postgres: false,
        redis: false,
      };
    }
  }

  private async checkPostgresHealth(): Promise<boolean> {
    try {
      await this.postgres.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('PostgreSQL health check failed:', error);
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      await this.redis.set('health_check', 'ok', 10);
      const result = await this.redis.get('health_check');
      await this.redis.del('health_check');
      return result === 'ok';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // === Статистика ===

  async getStatistics(): Promise<{
    totalUsers: number;
    activeSessions: number;
    totalCalculations: number;
    calculationsToday: number;
  }> {
    this.ensureInitialized();

    try {
      const usersQuery = 'SELECT COUNT(*) as count FROM users';
      const calculationsQuery = 'SELECT COUNT(*) as count FROM delivery_calculations';
      const calculationsTodayQuery = `
        SELECT COUNT(*) as count FROM delivery_calculations 
        WHERE DATE(created_at) = CURRENT_DATE
      `;

      const [usersResult, calculationsResult, calculationsTodayResult] = await Promise.all([
        this.postgres.query(usersQuery),
        this.postgres.query(calculationsQuery),
        this.postgres.query(calculationsTodayQuery),
      ]);

      // Для активных сессий нужно будет реализовать счетчик в Redis
      const activeSessions = 0; // Временное значение

      return {
        totalUsers: parseInt(usersResult.rows[0].count),
        activeSessions,
        totalCalculations: parseInt(calculationsResult.rows[0].count),
        calculationsToday: parseInt(calculationsTodayResult.rows[0].count),
      };
    } catch (error) {
      logger.error('Error getting statistics:', error);
      throw error;
    }
  }

  // === Прямой доступ к PostgreSQL для сложных запросов ===

  async query(text: string, params?: any[]): Promise<any> {
    this.ensureInitialized();
    return await this.postgres.query(text, params);
  }

  async close(): Promise<void> {
    try {
      await Promise.all([
        this.postgres.close(),
        this.redis.close(),
      ]);
      
      this.isInitialized = false;
      logger.info('Database manager closed');
    } catch (error) {
      logger.error('Error closing database manager:', error);
      throw error;
    }
  }

  // === Резервное копирование и восстановление ===

  async backupData(): Promise<{
    users: any[];
    roles: any[];
    calculations: any[];
  }> {
    this.ensureInitialized();

    try {
      const [usersResult, rolesResult, calculationsResult] = await Promise.all([
        this.postgres.query('SELECT * FROM users'),
        this.postgres.query('SELECT * FROM roles'),
        this.postgres.query('SELECT * FROM delivery_calculations'),
      ]);

      return {
        users: usersResult.rows,
        roles: rolesResult.rows,
        calculations: calculationsResult.rows,
      };
    } catch (error) {
      logger.error('Error backing up data:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    this.ensureInitialized();
    
    try {
      // Временная реализация - в реальном Redis нужно использовать SCAN
      const deletedCount = 0;
      logger.info('Cleaned up expired sessions', { count: deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }
}

export default DatabaseManager;

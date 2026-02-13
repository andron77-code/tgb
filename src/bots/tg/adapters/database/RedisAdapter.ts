/**
 * Адаптер для работы с Redis
 */

import { RedisConfig } from '../../config/database';
import { SessionData } from '../../types';
import { logger } from '../../../../helpers';

export interface RedisConnection {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  del: (key: string) => Promise<void>;
  exists: (key: string) => Promise<boolean>;
  expire: (key: string, ttl: number) => Promise<void>;
  close: () => Promise<void>;
}

export class RedisAdapter implements RedisConnection {
  private client: any; // Redis client
  private isConnected: boolean = false;

  constructor(config: RedisConfig) {
    // Временная реализация до установки redis пакета
    this.client = {
      get: async (key: string) => null,
      set: async (key: string, value: string, options?: any) => 'OK',
      del: async (key: string) => 1,
      exists: async (key: string) => 0,
      expire: async (key: string, ttl: number) => 1,
      quit: async () => 'OK',
    };
    
    logger.info('Redis adapter initialized (mock mode)');
  }

  async connect(): Promise<void> {
    try {
      // Временная реализация
      this.isConnected = true;
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection error:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    
    try {
      const value = await this.client.get(key);
      logger.debug('Redis GET', { key, found: value !== null });
      return value;
    } catch (error) {
      logger.error('Redis GET error', { key, error });
      throw error;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      if (ttl) {
        await this.client.set(key, value, 'EX', ttl);
      } else {
        await this.client.set(key, value);
      }
      logger.debug('Redis SET', { key, ttl });
    } catch (error) {
      logger.error('Redis SET error', { key, error });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client.del(key);
      logger.debug('Redis DEL', { key });
    } catch (error) {
      logger.error('Redis DEL error', { key, error });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      const exists = await this.client.exists(key);
      logger.debug('Redis EXISTS', { key, exists: exists > 0 });
      return exists > 0;
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error });
      throw error;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client.expire(key, ttl);
      logger.debug('Redis EXPIRE', { key, ttl });
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, error });
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Redis close error:', error);
      throw error;
    }
  }

  // Методы для работы с сессиями
  async getSession(chatId: number): Promise<SessionData | null> {
    const key = `session:${chatId}`;
    const data = await this.get(key);
    
    if (!data) {
      return null;
    }

    try {
      const session = JSON.parse(data) as SessionData;
      
      // Проверка срока действия сессии
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        await this.del(key);
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Failed to parse session data', { key, error });
      await this.del(key);
      return null;
    }
  }

  async setSession(chatId: number, sessionData: Omit<SessionData, 'createdAt' | 'updatedAt'>, ttl: number = 3600): Promise<void> {
    const key = `session:${chatId}`;
    const session: SessionData = {
      ...sessionData,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000),
    };

    await this.set(key, JSON.stringify(session), ttl);
    logger.debug('Session saved', { chatId, ttl });
  }

  async updateSession(chatId: number, updates: Partial<SessionData>): Promise<void> {
    const existingSession = await this.getSession(chatId);
    
    if (!existingSession) {
      throw new Error('Session not found');
    }

    const updatedSession: SessionData = {
      ...existingSession,
      ...updates,
      updatedAt: new Date(),
    };

    const ttl = updatedSession.expiresAt 
      ? Math.floor((updatedSession.expiresAt.getTime() - Date.now()) / 1000)
      : 3600;

    await this.setSession(chatId, updatedSession, ttl);
  }

  async deleteSession(chatId: number): Promise<void> {
    const key = `session:${chatId}`;
    await this.del(key);
    logger.debug('Session deleted', { chatId });
  }

  // Методы для работы с кэшем
  async cacheDeliveryCalculation(cacheKey: string, data: any, ttl: number = 1800): Promise<void> {
    const key = `cache:delivery:${cacheKey}`;
    await this.set(key, JSON.stringify(data), ttl);
    logger.debug('Delivery calculation cached', { cacheKey, ttl });
  }

  async getCachedDeliveryCalculation(cacheKey: string): Promise<any | null> {
    const key = `cache:delivery:${cacheKey}`;
    const data = await this.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to parse cached delivery data', { key, error });
      await this.del(key);
      return null;
    }
  }

  async invalidateDeliveryCache(pattern?: string): Promise<void> {
    // Временная реализация - в реальном Redis нужно использовать SCAN или KEYS
    logger.debug('Delivery cache invalidated', { pattern });
  }

  // Методы для работы с очередями
  async addToQueue(queue: string, data: any): Promise<void> {
    const key = `queue:${queue}`;
    await this.set(key, JSON.stringify(data));
    logger.debug('Added to queue', { queue });
  }

  async getFromQueue(queue: string): Promise<any | null> {
    const key = `queue:${queue}`;
    const data = await this.get(key);

    if (data) {
      await this.del(key); // Удаляем из очереди после получения
    }

    return data ? JSON.parse(data) : null;
  }

  // Утилиты
  async increment(key: string, amount: number = 1): Promise<number> {
    // Временная реализация
    const current = await this.get(key);
    const newValue = current ? parseInt(current) + amount : amount;
    await this.set(key, newValue.toString());
    return newValue;
  }

  async addToSet(set: string, value: string): Promise<void> {
    // Временная реализация
    const key = `set:${set}`;
    const current = await this.get(key);
    const members = current ? JSON.parse(current) : [];
    
    if (!members.includes(value)) {
      members.push(value);
      await this.set(key, JSON.stringify(members));
    }
  }

  async getSetMembers(set: string): Promise<string[]> {
    const key = `set:${set}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : [];
  }

  async removeFromSet(set: string, value: string): Promise<void> {
    const key = `set:${set}`;
    const current = await this.get(key);
    
    if (current) {
      const members = JSON.parse(current);
      const index = members.indexOf(value);
      
      if (index > -1) {
        members.splice(index, 1);
        await this.set(key, JSON.stringify(members));
      }
    }
  }
}

export default RedisAdapter;

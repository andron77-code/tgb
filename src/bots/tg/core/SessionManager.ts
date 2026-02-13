/**
 * Менеджер сессий - управление сессиями пользователей
 */

import { SessionData, User, Chat } from '../types';
import DatabaseManager from './DatabaseManager';
import { logger } from '../../../helpers';

export interface SessionManagerOptions {
  defaultTtl?: number;
  maxSessionAge?: number;
  cleanupInterval?: number;
}

export class SessionManager {
  private db: DatabaseManager;
  private options: Required<SessionManagerOptions>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(db: DatabaseManager, options: SessionManagerOptions = {}) {
    this.db = db;
    this.options = {
      defaultTtl: options.defaultTtl || 3600, // 1 час
      maxSessionAge: options.maxSessionAge || 86400, // 24 часа
      cleanupInterval: options.cleanupInterval || 300000, // 5 минут
    };

    // Запускаем периодическую очистку истекших сессий
    this.startCleanupTimer();
  }

  // === Создание и получение сессий ===

  async createOrUpdateSession(
    user: User,
    chat: Chat,
    additionalData?: Partial<SessionData>
  ): Promise<SessionData> {
    try {
      const chatId = chat.id;
      const existingSession = await this.db.getSession(chatId);

      const sessionData: Omit<SessionData, 'createdAt' | 'updatedAt'> = {
        userId: user.id,
        chatId: chatId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        state: existingSession?.state || 'main',
        data: {
          ...existingSession?.data,
          ...additionalData?.data,
          lastActivity: new Date().toISOString(),
        },
        ...additionalData,
      };

      await this.db.setSession(chatId, sessionData, this.options.defaultTtl);

      // Получаем обновленную сессию
      const updatedSession = await this.db.getSession(chatId);
      
      if (!updatedSession) {
        throw new Error('Failed to create session');
      }

      logger.debug('Session created/updated', { 
        chatId, 
        userId: user.id, 
        state: updatedSession.state 
      });

      return updatedSession;
    } catch (error) {
      logger.error('Error creating/updating session:', error);
      throw error;
    }
  }

  async getSession(chatId: number): Promise<SessionData | null> {
    try {
      const session = await this.db.getSession(chatId);
      
      if (session) {
        // Обновляем время последней активности
        await this.updateSessionActivity(chatId);
      }

      return session;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  async updateSession(chatId: number, updates: Partial<SessionData>): Promise<void> {
    try {
      const sessionData = {
        ...updates,
        data: {
          ...updates.data,
          lastActivity: new Date().toISOString(),
        },
      };

      await this.db.updateSession(chatId, sessionData);
      
      logger.debug('Session updated', { chatId, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('Error updating session:', error);
      throw error;
    }
  }

  async updateSessionActivity(chatId: number): Promise<void> {
    try {
      await this.db.updateSession(chatId, {
        data: {
          lastActivity: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error updating session activity:', error);
    }
  }

  async deleteSession(chatId: number): Promise<void> {
    try {
      await this.db.deleteSession(chatId);
      logger.debug('Session deleted', { chatId });
    } catch (error) {
      logger.error('Error deleting session:', error);
      throw error;
    }
  }

  // === Управление состоянием сессии ===

  async setState(chatId: number, state: string, data?: Record<string, any>): Promise<void> {
    await this.updateSession(chatId, {
      state,
      data: data ? { ...data, stateChangedAt: new Date().toISOString() } : undefined,
    });
  }

  async getState(chatId: number): Promise<string | null> {
    const session = await this.getSession(chatId);
    return session?.state || null;
  }

  async resetState(chatId: number): Promise<void> {
    await this.setState(chatId, 'main');
  }

  // === Работа с данными сессии ===

  async setSessionData(chatId: number, key: string, value: any): Promise<void> {
    const session = await this.getSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedData = {
      ...session.data,
      [key]: value,
      lastActivity: new Date().toISOString(),
    };

    await this.updateSession(chatId, { data: updatedData });
  }

  async getSessionData(chatId: number, key?: string): Promise<any> {
    const session = await this.getSession(chatId);
    if (!session) {
      return null;
    }

    if (key) {
      return session.data?.[key];
    }

    return session.data;
  }

  async clearSessionData(chatId: number, keys?: string[]): Promise<void> {
    const session = await this.getSession(chatId);
    if (!session) {
      return;
    }

    let updatedData: Record<string, any>;

    if (keys && keys.length > 0) {
      // Удаляем только указанные ключи
      updatedData = { ...session.data };
      for (const key of keys) {
        delete updatedData[key];
      }
    } else {
      // Очищаем все данные, кроме служебных
      updatedData = {
        lastActivity: new Date().toISOString(),
      };
    }

    await this.updateSession(chatId, { data: updatedData });
  }

  // === Поиск и фильтрация сессий ===

  async getActiveSessionsCount(): Promise<number> {
    // Временная реализация - в реальном Redis нужно использовать SCAN
    return 0;
  }

  async getSessionsByState(_state: string): Promise<SessionData[]> {
    // Временная реализация
    return [];
  }

  async getSessionsOlderThan(_age: number): Promise<SessionData[]> {
    // Временная реализация
    return [];
  }

  // === Очистка и обслуживание ===

  async cleanupExpiredSessions(): Promise<number> {
    try {
      const deletedCount = await this.db.cleanupExpiredSessions();
      
      if (deletedCount > 0) {
        logger.info('Cleaned up expired sessions', { count: deletedCount });
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  private startCleanupTimer(): void {
    if (this.options.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredSessions().catch(error => {
          logger.error('Error in cleanup timer:', error);
        });
      }, this.options.cleanupInterval);
    }
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  // === Валидация сессии ===

  async validateSession(chatId: number): Promise<boolean> {
    try {
      const session = await this.getSession(chatId);
      
      if (!session) {
        return false;
      }

      // Проверяем возраст сессии
      const sessionAge = Date.now() - session.createdAt.getTime();
      if (sessionAge > this.options.maxSessionAge * 1000) {
        await this.deleteSession(chatId);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error validating session:', error);
      return false;
    }
  }

  // === Экспорт и импорт сессий ===

  async exportSession(chatId: number): Promise<SessionData | null> {
    return await this.getSession(chatId);
  }

  async importSession(sessionData: SessionData): Promise<void> {
    try {
      await this.db.setSession(sessionData.chatId, sessionData, this.options.defaultTtl);
      logger.info('Session imported', { chatId: sessionData.chatId });
    } catch (error) {
      logger.error('Error importing session:', error);
      throw error;
    }
  }

  // === Статистика ===

  async getSessionStatistics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    averageSessionAge: number;
    sessionsByState: Record<string, number>;
  }> {
    try {
      // Временная реализация
      return {
        totalSessions: 0,
        activeSessions: 0,
        averageSessionAge: 0,
        sessionsByState: {},
      };
    } catch (error) {
      logger.error('Error getting session statistics:', error);
      throw error;
    }
  }

  // === Закрытие ===

  async close(): Promise<void> {
    this.stopCleanupTimer();
    
    try {
      await this.cleanupExpiredSessions();
      logger.info('Session manager closed');
    } catch (error) {
      logger.error('Error closing session manager:', error);
      throw error;
    }
  }
}

export default SessionManager;
